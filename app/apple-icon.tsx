import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const PAPER = "#f5efe1";
const GOLD = "#9f6736";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: PAPER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={132}
          height={132}
          fill={GOLD}
        >
          <rect x="1.5" y="8" width="21" height="2.25" rx="0.5" />
          <rect x="4" y="10.25" width="2.5" height="10" rx="0.4" />
          <rect x="10.75" y="10.25" width="2.5" height="10" rx="0.4" />
          <rect x="17.5" y="10.25" width="2.5" height="10" rx="0.4" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
