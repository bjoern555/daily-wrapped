chrome.runtime.onInstalled.addListener(() => {
    console.log("Daily Wrapped background loaded.")
    setupDailyReminder()
})

// Set up daily reminder on startup
chrome.runtime.onStartup.addListener(() => {
    console.log("Chrome startup - setting up daily reminder")
    setupDailyReminder()
})

// Listen for tab updates to log URL and title
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId)
        const entry = {
            url: tab.url,
            title: tab.title,
            time: new Date().toISOString()
        }

        chrome.storage.local.get(["dailywrapped"], (result) => {
            const logs = result.dailywrapped || []
            logs.push(entry)

            chrome.storage.local.set({ dailywrapped: logs }, () => {
                console.log("New tab: ", entry)
            })
        })
    } catch (error) {
        console.error("Error while saving tab: ", error)
    }
})

// Watch for reminder setting changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.dailyReminderEnabled || changes.dailyReminderTime)) {
        setupDailyReminder()
    }
})

// Check and recreate alarm periodically (every 30 minutes)
setInterval(() => {
    chrome.alarms.get("dailyWrapped", (alarm) => {
        if (!alarm) {
            setupDailyReminder()
        }
    })
}, 30 * 60 * 1000)

// Sets up the daily notification
function setupDailyReminder() {

    chrome.storage.local.get(["dailyReminderEnabled", "dailyReminderTime"], (result) => {

        chrome.alarms.clear("dailyWrapped")

        if (!result.dailyReminderEnabled || !result.dailyReminderTime) {
            return
        }

        const [hourStr, minuteStr] = result.dailyReminderTime.split(":")
        const hour = parseInt(hourStr, 10)
        const minute = parseInt(minuteStr, 10)

        if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            console.error("Invalid time format:", result.dailyReminderTime)
            return
        }

        const now = new Date()
        const when = new Date()
        when.setHours(hour, minute, 0, 0)

        if (when <= now) {
            when.setDate(when.getDate() + 1)
        }

        const delayInMinutes = Math.ceil((when - now) / 60000)

        const actualDelay = Math.max(delayInMinutes, 1)

        console.log(`Alarm scheduled in ${actualDelay} minutes (${when.toLocaleString()})`)

        chrome.alarms.create("dailyWrapped", {
            delayInMinutes: actualDelay,
            periodInMinutes: 24 * 60 // Repeat every 24 hours
        })
    })
}

// Trigger daily notification
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("Alarm triggered:", alarm.name)

    if (alarm.name === "dailyWrapped") {
        chrome.storage.local.get(["dailyReminderEnabled"], (result) => {
            if (!result.dailyReminderEnabled) {
                console.log("Notifications disabled, skipping")
                return
            }

            console.log("Creating notification...")

            chrome.notifications.create("dailyWrappedNotification", {
                type: "basic",
                iconUrl: "icons/icon128.png",
                title: "Your Daily Wrapped is ready! 🎉",
                message: "Click to view your browser summary for today.",
                priority: 2
            }, (notificationId) => {
                if (chrome.runtime.lastError) {
                    console.error("Notification creation failed:", chrome.runtime.lastError)
                } else {
                    console.log("Notification created successfully:", notificationId)
                }
            })
        })
    }
})

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === "dailyWrappedNotification") {
        chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") })
        chrome.notifications.clear(notificationId)
    }
})