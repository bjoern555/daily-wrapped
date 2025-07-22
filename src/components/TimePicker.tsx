import { useEffect, useState } from "react"
import {
    Popover,
    PopoverTrigger,
    PopoverContent
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
} from "@/components/ui/card"
import { Label } from "@/components/ui/label.tsx"

export function TimePicker() {
    const [hour, setHour] = useState<string>("")
    const [minute, setMinute] = useState<string>("")
    const [enabled, setEnabled] = useState<boolean>(true)
    const [isLoaded, setIsLoaded] = useState<boolean>(false)

    const selected = hour && minute ? `${hour}:${minute}` : "Select Time"

    // Load initial values from Chrome storage
    useEffect(() => {
        chrome.storage.local.get(["dailyReminderEnabled", "dailyReminderTime"], (result) => {
            if (result.dailyReminderEnabled !== undefined) {
                setEnabled(result.dailyReminderEnabled)
            }
            if (result.dailyReminderTime) {
                const [h, m] = result.dailyReminderTime.split(":")
                setHour(h ? h.padStart(2, "0") : "")
                setMinute(m ? m.padStart(2, "0") : "")
            }
            setIsLoaded(true)
        })
    }, [])

    // Save to Chrome storage only after initial load
    useEffect(() => {
        if (!isLoaded) return

        const timeValue = hour && minute ? `${hour}:${minute}` : undefined

        chrome.storage.local.set({
            dailyReminderEnabled: enabled,
            dailyReminderTime: timeValue
        }, () => {
            console.log('TimePicker: Settings saved -', { enabled, time: timeValue })
        })
    }, [enabled, hour, minute, isLoaded])

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className={enabled ? "" : "opacity-50"}>
                        ⏰ Daily Summary
                    </CardTitle>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="enabled" className="text-sm text-muted-foreground">
                            Notification
                        </Label>
                        <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
                    </div>
                </div>

                <CardDescription className={enabled ? "" : "opacity-50"}>
                    Choose the time for your daily wrapped.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <div className={!enabled ? "opacity-50 pointer-events-none select-none" : ""}>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start w-full">
                                {selected}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-60 p-4">
                            <div className="flex gap-4">
                                <Select value={hour} onValueChange={setHour}>
                                    <SelectTrigger className="w-24">
                                        <SelectValue placeholder="Hour" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => {
                                            const value = i.toString().padStart(2, "0")
                                            return (
                                                <SelectItem key={value} value={value}>
                                                    {value}
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>

                                <Select value={minute} onValueChange={setMinute}>
                                    <SelectTrigger className="w-24">
                                        <SelectValue placeholder="Minute" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 60 }, (_, i) => {
                                            const value = i.toString().padStart(2, "0")
                                            return (
                                                <SelectItem key={value} value={value}>
                                                    {value}
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </CardContent>
        </Card>
    )
}