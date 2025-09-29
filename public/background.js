// background.js

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

let currentTabId = null
let currentStartTime = null

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await handleTabSwitch(activeInfo.tabId)
})

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        await handleTabSwitch(tabId)
    }
})

async function handleTabSwitch(tabId) {
    const now = new Date()
    try {
        const tab = await chrome.tabs.get(tabId)
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

        const domain = (() => {
            try {
                return new URL(tab.url).hostname
            } catch {
                return "unknown"
            }
        })()

        await closePreviousSession(now)

        const result = await chrome.storage.local.get(["dailywrapped"])
        const logs = result.dailywrapped || []
        const today = new Date().toDateString()

        let entry = logs.find(e => new Date(e.startTime).toDateString() === today && e.domain === domain)

        if (entry) {
            entry.sessionCount = (entry.sessionCount || 1) + 1
        } else {
            entry = {
                domain,
                url: tab.url,
                startTime: now.toISOString(),
                durationSeconds: 0,
                sessionCount: 1,
                clicks: 0
            }
            logs.push(entry)
        }

        await chrome.storage.local.set({ dailywrapped: logs })

        currentTabId = tabId
        currentStartTime = now
    } catch (error) {
        console.error("Error saving tab switch:", error)
    }
}

async function closePreviousSession(now) {
    try {
        const result = await chrome.storage.local.get(["dailywrapped"])
        const logs = result.dailywrapped || []
        const lastEntry = logs[logs.length - 1]

        if (lastEntry && currentStartTime) {
            const duration = Math.round((now - currentStartTime) / 1000)
            lastEntry.durationSeconds = (lastEntry.durationSeconds || 0) + duration
            await chrome.storage.local.set({ dailywrapped: logs })
        }
    } catch (error) {
        console.error("Error closing session:", error)
    }
}

chrome.runtime.onSuspend.addListener(async () => {
    if (currentTabId && currentStartTime) {
        await closePreviousSession(new Date())
    }
})

function resetDailyLogIfNeeded() {
    const today = new Date().toDateString()
    chrome.storage.local.get(["lastLogDate", "dailywrapped"], (result) => {
        if (result.lastLogDate !== today) {
            chrome.storage.local.set({ dailywrapped: [], lastLogDate: today }, () => {
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
                title: "Your Daily Wrapped is ready! 🎉",
                message: "Click to view your browser summary for today.",
                priority: 2
            })
        })
    }
})

chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === "dailyWrappedNotification") {
        chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") })
        chrome.notifications.clear(notificationId)
    }
})