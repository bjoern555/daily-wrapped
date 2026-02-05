// background.js

let currentTabId = null
let currentStartTime = null
let currentDomain = null

// Storage mutex to prevent race conditions
let storageQueue = Promise.resolve()

async function withStorageLock(fn) {
    const prevQueue = storageQueue
    let resolve
    storageQueue = new Promise(r => resolve = r)

    await prevQueue
    try {
        return await fn()
    } finally {
        resolve()
    }
}

chrome.runtime.onInstalled.addListener(() => {
    console.log("Daily Wrapped background loaded.")
    setupDailyReminder()
    resetDailyLogIfNeeded()
})

chrome.runtime.onStartup.addListener(() => {
    console.log("Chrome startup - setting up daily reminder")
    setupDailyReminder()
    resetDailyLogIfNeeded()
})

async function handleTabSwitch(tabId) {
    const now = new Date()
    try {
        const tab = await chrome.tabs.get(tabId)
        const domain = (() => {
            try {
                return new URL(tab.url).hostname
            } catch {
                return "unknown"
            }
        })()

        const prevDomain = currentDomain
        const prevStartTime = currentStartTime

        currentTabId = tabId
        currentStartTime = now
        currentDomain = domain

        await withStorageLock(async () => {
            const result = await chrome.storage.local.get(["dailywrapped"])
            const logs = result.dailywrapped || []
            const today = new Date().toDateString()

            // Close previous session
            if (prevStartTime && prevDomain) {
                const prevEntry = logs.find(e =>
                    new Date(e.startTime).toDateString() === today && e.domain === prevDomain
                )
                if (prevEntry) {
                    const duration = Math.round((now - prevStartTime) / 1000)
                    prevEntry.durationSeconds = (prevEntry.durationSeconds || 0) + duration
                }
            }

            // Open new session
            let entry = logs.find(e =>
                new Date(e.startTime).toDateString() === today && e.domain === domain
            )

            if (entry) {
                entry.sessionCount = (entry.sessionCount || 1) + 1
            } else {
                entry = {
                    domain,
                    startTime: now.toISOString(),
                    durationSeconds: 0,
                    sessionCount: 1,
                    clicks: 0,
                    iconUrl: tab.favIconUrl || ""
                }
                logs.push(entry)
            }

            await chrome.storage.local.set({ dailywrapped: logs })
        })
    } catch (error) {
        console.error("Error saving tab switch:", error)
    }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await handleTabSwitch(activeInfo.tabId)
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        await handleTabSwitch(tabId)
    }
})

chrome.runtime.onSuspend.addListener(async () => {
    if (currentTabId && currentStartTime && currentDomain) {
        const now = new Date()
        await withStorageLock(async () => {
            const result = await chrome.storage.local.get(["dailywrapped"])
            const logs = result.dailywrapped || []
            const today = new Date().toDateString()
            const entry = logs.find(e =>
                new Date(e.startTime).toDateString() === today && e.domain === currentDomain
            )
            if (entry) {
                const duration = Math.round((now - currentStartTime) / 1000)
                entry.durationSeconds = (entry.durationSeconds || 0) + duration
                await chrome.storage.local.set({ dailywrapped: logs })
            }
        })
    }
})

function resetDailyLogIfNeeded() {
    const today = new Date().toDateString()
    chrome.storage.local.get(["lastLogDate", "dailywrapped"], (result) => {
        if (result.lastLogDate !== today) {
            chrome.storage.local.set({dailywrapped: [], lastLogDate: today}, () => {
                console.log("New day detected. Log reset.")
            })
        }
    })
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.dailyReminderEnabled || changes.dailyReminderTime)) {
        setupDailyReminder()
    }
})

setInterval(() => {
    chrome.alarms.get("dailyWrapped", (alarm) => {
        if (!alarm) {
            setupDailyReminder()
        }
    })
}, 30 * 60 * 1000)

function setupDailyReminder() {
    chrome.storage.local.get(["dailyReminderEnabled", "dailyReminderTime"], (result) => {
        chrome.alarms.clear("dailyWrapped")

        if (!result.dailyReminderEnabled || !result.dailyReminderTime) return

        const [hourStr, minuteStr] = result.dailyReminderTime.split(":")
        const hour = parseInt(hourStr, 10)
        const minute = parseInt(minuteStr, 10)

        if (isNaN(hour) || isNaN(minute)) return

        const now = new Date()
        const when = new Date()
        when.setHours(hour, minute, 0, 0)
        if (when <= now) when.setDate(when.getDate() + 1)

        const delayInMinutes = Math.ceil((when - now) / 60000)
        const actualDelay = Math.max(delayInMinutes, 1)

        chrome.alarms.create("dailyWrapped", {
            delayInMinutes: actualDelay,
            periodInMinutes: 24 * 60
        })
    })
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailyWrapped") {
        chrome.storage.local.get(["dailyReminderEnabled"], (result) => {
            if (!result.dailyReminderEnabled) return

            chrome.notifications.create("dailyWrappedNotification", {
                type: "basic",
                iconUrl: "icons/icon128.png",
                title: "Daily Wrapped",
                message: "Check out your daily browsing summary!",
                priority: 2
            })
        })
    }
})

chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === "dailyWrappedNotification") {
        chrome.tabs.create({url: chrome.runtime.getURL("popup.html")})
        chrome.notifications.clear(notificationId)
    }
})

// Handle click increment messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'INCREMENT_CLICKS') {
        handleClickIncrement(message.domain, message.count).then(() => {
            sendResponse({ success: true })
        }).catch((error) => {
            console.error("Error handling click increment:", error)
            sendResponse({ success: false })
        })
        return true // Required for async sendResponse
    }
})

async function handleClickIncrement(domain, count) {
    if (!domain || !count || count <= 0) return

    await withStorageLock(async () => {
        const result = await chrome.storage.local.get(["dailywrapped"])
        const logs = result.dailywrapped || []
        const today = new Date().toDateString()

        const entry = logs.find(e =>
            new Date(e.startTime).toDateString() === today && e.domain === domain
        )

        if (entry) {
            entry.clicks = (entry.clicks || 0) + count
            await chrome.storage.local.set({ dailywrapped: logs })
            console.log(`[DailyWrapped] Updated clicks for ${domain}: ${entry.clicks}`)
        }
    })
}
