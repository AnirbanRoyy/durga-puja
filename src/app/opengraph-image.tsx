import { ImageResponse } from "next/og";

export const alt = "Sodepur Durga Puja 2026, Asansol";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
            <div style={{ fontSize: 104, fontWeight: 700 }}>Sodepur Durga Puja 2026</div>
            <div style={{ fontSize: 44, marginTop: 24, opacity: 0.9 }}>
                Asansol, West Bengal · Programmes · Music · Results
            </div>
            <div style={{ fontSize: 34, marginTop: 40, color: "#fcd34d" }}>
                Shashthi 16 Oct – Dashami 21 Oct
            </div>
        </div>,
        size,
    );
}
