import {useEffect, useState} from "react"
import {TimePicker} from "@/components/TimePicker"
import {Switch} from "@/components/ui/switch"
import {Label} from "@/components/ui/label"
import {TodaysActivity} from "@/components/TodaysActivity.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useTranslation} from "react-i18next";
import {LanguageSwitcher} from "@/components/LanguageSwitcher.tsx";

export type LogEntry = {
    domain: string
    startTime: string
    durationSeconds?: number
    sessionCount?: number
    clicks?: number
    iconUrl?: string
}

export default function App() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [isDark, setIsDark] = useState(true)
    const {t} = useTranslation()

    useEffect(() => {
        document.documentElement.classList.add("dark")
    }, [])

    const toggleTheme = (checked: boolean) => {
        setIsDark(checked)
        if (checked) {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")
        }
    }

    const loadLogs = () => {
        chrome.storage.local.get(["dailywrapped"], (result) => {
            const allLogs: LogEntry[] = result.dailywrapped || []
            const today = new Date().toDateString()

            const filtered = allLogs.filter(entry =>
                new Date(entry.startTime).toDateString() === today
            )

            setLogs(filtered)
        })
    }

    useEffect(() => {
        loadLogs()
        const handleStorageChange = (changes: Record<string, {
            newValue?: unknown;
            oldValue?: unknown
        }>, namespace: string) => {
            if (namespace === 'local' && changes.dailywrapped) {
                loadLogs()
            }
        }

        chrome.storage.onChanged.addListener(handleStorageChange)
        return () => chrome.storage.onChanged.removeListener(handleStorageChange)
    }, [])

    const formatDuration = (seconds?: number) => {
        if (!seconds || isNaN(seconds) || seconds < 0) return `0 ${t('sec')}`
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return m > 0 ? `${m} ${t('min')} ${s} ${t('sec')}` : `${s} ${t('sec')}`
    }

    return (
        <div
            className="w-full min-h-screen bg-background text-foreground flex items-start justify-center p-4 overflow-hidden">
            <div className="w-[360px] p-4 bg-background text-foreground">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-lg font-bold">{t('title')}</h1>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="dark-mode" className="text-xs">{t('darkmode')}</Label>
                        <Switch id="dark-mode" checked={isDark} onCheckedChange={toggleTheme}/>
                    </div>
                    <LanguageSwitcher/>
                </div>


                <TimePicker/>

                <Button
                    className="mt-4 px-3 py-1 bg-red-600 text-white rounded"
                    onClick={() => {
                        const today = new Date().toDateString()
                        chrome.storage.local.get(["dailywrapped"], (result) => {
                            const allLogs: LogEntry[] = result.dailywrapped || []
                            const filtered = allLogs.filter(entry =>
                                new Date(entry.startTime).toDateString() !== today
                            )
                            chrome.storage.local.set({dailywrapped: filtered}, () => {
                                setLogs([])
                            })
                        })
                    }}
                >
                    {t("deleteStatistics")}
                </Button>

                <TodaysActivity logs={logs} formatDuration={formatDuration}/>
            </div>
        </div>
    )
}