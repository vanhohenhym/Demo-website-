import { ImageResponse } from "next/og";

export const alt = "Star Tech Demo - Computer & Electronics Store";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: "#081621",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "sans-serif",
          padding: "40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 72, fontWeight: 900, letterSpacing: 2 }}>
            STAR
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "#ef4a23",
              letterSpacing: 2,
            }}
          >
            TECH
          </span>
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Leading Computer, Laptop & Electronics Retail & Online Shop
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            gap: 16,
            fontSize: 20,
            color: "#cbd5e1",
          }}
        >
          <span>PC Builder</span>
          <span>•</span>
          <span>High Performance Components</span>
          <span>•</span>
          <span>Official Warranty</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
