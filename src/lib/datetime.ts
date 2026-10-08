const IST_OFFSET = "+05:30";

/** `<input type="datetime-local">` value (entered as IST) → ISO timestamp. */
export function istLocalToIso(value: string | null | undefined): string | null {
    if (!value) return null;
    const withSeconds = value.length === 16 ? `${value}:00` : value;
    const date = new Date(`${withSeconds}${IST_OFFSET}`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO timestamp → `datetime-local` value shown in IST. */
export function isoToIstLocal(iso: string | null | undefined): string {
    if (!iso) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(iso));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function formatIst(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(iso));
}
