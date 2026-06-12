import { ImageResponse } from "next/og";

export const alt = "Causeway — an explorable economy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f5efe1";
const INK = "#393530";
const INK_3 = "#7e7872";
const GOLD = "#9f6736";
const RULE = "#d6cdb6";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: PAPER,
          display: "flex",
          flexDirection: "column",
          padding: "80px 96px",
          justifyContent: "space-between",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={84}
            height={84}
            fill={GOLD}
          >
            <rect x="1.5" y="8" width="21" height="2.25" rx="0.5" />
            <rect x="4" y="10.25" width="2.5" height="10" rx="0.4" />
            <rect x="10.75" y="10.25" width="2.5" height="10" rx="0.4" />
            <rect x="17.5" y="10.25" width="2.5" height="10" rx="0.4" />
          </svg>
          <div
            style={{
              fontSize: 36,
              color: INK,
              letterSpacing: "-0.01em",
              display: "flex",
              alignItems: "center",
            }}
          >
            Causeway
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          <div
            style={{
              fontSize: 88,
              color: INK,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              maxWidth: 980,
              display: "flex",
            }}
          >
            Understand the economy as a machine you can drive.
          </div>
          <div
            style={{
              fontSize: 28,
              color: INK_3,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            Pocket · Working model · Full picture
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `2px solid ${RULE}`,
            paddingTop: 24,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: INK_3,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            an explorable economy
          </div>
          <div
            style={{
              fontSize: 22,
              color: GOLD,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            causeway
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
