import type { LogEntry } from "@/App"
import {useTranslation} from "react-i18next";

type Props = {
    readonly logs: ReadonlyArray<LogEntry>
    readonly formatDuration: (seconds?: number) => string
}

export function TodaysActivity({ logs, formatDuration }: Props) {
    const { t } = useTranslation()

    return (
        <div className="mt-6 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{t("todaysActivity")}</h2>
            {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noActivity")}</p>
            ) : (
                <ul className="space-y-2">
                    {logs.map((log) => (
                        <li key={log.domain} className="border border-muted rounded p-2 text-sm flex items-center gap-2">
                            {log.iconUrl && (
                                <img src={log.iconUrl} alt={log.domain + " icon"} className="w-7 h-7 rounded" />
                            )}
                            <div>
                                <div className="font-medium truncate">{log.domain}</div>
                                {log.durationSeconds !== undefined && (
                                    <div className="text-muted-foreground text-xs">
                                        ⏱ {formatDuration(log.durationSeconds)}
                                    </div>
                                )}
                                {log.sessionCount !== undefined && (
                                    <div className="text-muted-foreground text-xs">
                                        🔁 {log.sessionCount} {t("visits")}
                                    </div>
                                )}
                                {log.clicks !== undefined && (
                                    <div className="text-muted-foreground text-xs">
                                        🖱️ {log.clicks} {t("clicks")}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}