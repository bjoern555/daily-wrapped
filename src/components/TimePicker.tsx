"use client"
import * as React from "react"
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from "@/components/ui/card"
import {Label} from "@/components/ui/label"
import {Switch} from "@/components/ui/switch"
import {Input} from "@/components/ui/input"
import {useTranslation} from "react-i18next";

export function TimePicker() {
    const [enabled, setEnabled] = React.useState(true)
    const [time, setTime] = React.useState("")
    const { t } = useTranslation()

    React.useEffect(() => {
        chrome.storage.local.get(["dailyReminderEnabled", "dailyReminderTime"], (result) => {
            if (typeof result.dailyReminderEnabled === "boolean") setEnabled(result.dailyReminderEnabled)
            if (typeof result.dailyReminderTime === "string") setTime(result.dailyReminderTime)
        })
    }, [])

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTime(e.target.value)
        chrome.storage.local.set({ dailyReminderTime: e.target.value })
    }

    const handleEnabledChange = (checked: boolean) => {
        setEnabled(checked)
        chrome.storage.local.set({ dailyReminderEnabled: checked })
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className={enabled ? "" : "opacity-50"}>
                        {t("dailySummary")}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="enabled" className="text-sm text-muted-foreground">
                            {t("notification")}
                        </Label>
                        <Switch
                            id="enabled"
                            checked={enabled}
                            onCheckedChange={handleEnabledChange}
                        />
                    </div>
                </div>
                <CardDescription className={enabled ? "" : "opacity-50"}>
                    {t("chooseTime")}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className={!enabled ? "opacity-50 pointer-events-none select-none" : ""}>
                    <Label htmlFor="time-picker" className="px-1">
                        {t("time")}
                    </Label>
                    <Input
                        type="time"
                        id="time-picker"
                        value={time}
                        onChange={handleTimeChange}
                        step={60}
                        className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none mt-2"
                    />
                </div>
            </CardContent>
        </Card>
    )
}