chrome.runtime.onInstalled.addListener(() => {
    console.log("Daily Wrapped background loaded.");
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        const entry = {
            url: tab.url,
            title: tab.title,
            time: new Date().toISOString()
        };

        chrome.storage.local.get(['dailywrapped'], (result) => {
            const logs = result.dailywrapped || [];
            logs.push(entry);

            chrome.storage.local.set({ dailywrapped: logs }, () => {
                console.log("Log gespeichert:", entry);
            });
        });
    } catch (error) {
        console.error("Fehler beim Speichern:", error);
    }
});
