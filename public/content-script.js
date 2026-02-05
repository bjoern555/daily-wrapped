// content-script.js - Click tracking with batched updates

console.log('[DailyWrapped] Content script loaded on:', window.location.hostname)

let clickCount = 0
let flushTimer = null
const DEBOUNCE_MS = 5000

function getDomain() {
    try {
        return new URL(window.location.href).hostname
    } catch {
        return "unknown"
    }
}

function flushClicks() {
    if (clickCount === 0) return

    const count = clickCount
    const domain = getDomain()
    clickCount = 0

    if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
    }

    console.log('[DailyWrapped] Flushing clicks:', count, 'for domain:', domain)

    try {
        chrome.runtime.sendMessage({
            type: 'INCREMENT_CLICKS',
            count,
            domain
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[DailyWrapped] Message error:', chrome.runtime.lastError.message)
            } else {
                console.log('[DailyWrapped] Message sent successfully')
            }
        })
    } catch (error) {
        console.error('[DailyWrapped] sendMessage exception:', error)
    }
}

function scheduleFlush() {
    if (flushTimer) {
        clearTimeout(flushTimer)
    }
    flushTimer = setTimeout(flushClicks, DEBOUNCE_MS)
}

// Capture all left-clicks
document.addEventListener('click', (event) => {
    if (event.button === 0) {
        clickCount++
        scheduleFlush()
    }
}, { capture: true })

// Flush immediately when tab becomes hidden (user switches tabs)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        flushClicks()
    }
})

// Flush before page unload (navigation, close)
window.addEventListener('beforeunload', flushClicks)
