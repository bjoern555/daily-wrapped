import {useEffect, useState} from "react"
import {TimePicker} from "@/components/TimePicker"
import {Switch} from "@/components/ui/switch"
import {Label} from "@/components/ui/label"

export type LogEntry = {
    title: string
    url: string
    time: string
}

export default function App() {
    //const [logs, setLogs] = useState<LogEntry[]>([])
    const [isDark, setIsDark] = useState(true)

    useEffect(() => {
        // chrome.storage.local.get(["dailywrapped"], (result) => {
        //     setLogs(result.dailywrapped || [])
        // })

        const stored = localStorage.getItem("theme")
        if (stored === "light") setIsDark(false)
        else document.documentElement.classList.add("dark")
    }, [])

    const toggleTheme = (checked: boolean) => {
        setIsDark(checked)
        if (checked) {
            document.documentElement.classList.add("dark")
            localStorage.setItem("theme", "dark")
        } else {
            document.documentElement.classList.remove("dark")
            localStorage.setItem("theme", "light")
        }
    }

    return (
        <div className="w-full min-h-screen bg-background text-foreground flex items-start justify-center p-4">
            <div className="w-[360px] p-4 bg-background text-foreground">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-lg font-bold">🌅 Daily Wrapped</h1>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="dark-mode" className="text-xs">
                            Dark Mode
                        </Label>
                        <Switch id="dark-mode" checked={isDark} onCheckedChange={toggleTheme}/>
                    </div>
                </div>

                <TimePicker/>
            </div>
        </div>
    )
}
