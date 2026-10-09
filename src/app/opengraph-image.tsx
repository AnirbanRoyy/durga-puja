import { ImageResponse } from "next/og";
import { getEventSettings } from "@/lib/queries";

// Picks up a new year without a redeploy.
export const revalidate = 3600;

export const alt = "Sodepur Durga Puja, Asansol";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function shortDate(iso: string) {
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
    }).format(new Date(iso));
}

export default async function OpengraphImage() {
    const event = await getEventSettings().catch(() => null);
    const year = event?.year ?? new Date().getFullYear();
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 55%, #f59e0b 100%)",
                color: "#fff7e6",
            }}
        >
            <div style={{ fontSize: 104, fontWeight: 700 }}>{`Sodepur Durga Puja ${year}`}</div>
            <div style={{ fontSize: 44, marginTop: 24, opacity: 0.9 }}>
                Asansol, West Bengal · Programmes · Music · Results
            </div>
            <div style={{ fontSize: 34, marginTop: 40, color: "#fcd34d" }}>
                {event
                    ? `Shashthi ${shortDate(event.shashthi)} – Dashami ${shortDate(event.dashami)}`
                    : ""}
            </div>
        </div>,
        size,
    );
}
