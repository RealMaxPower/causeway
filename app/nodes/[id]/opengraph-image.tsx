import { ImageResponse } from "next/og";
import { allNodeIds, findNode } from "@/lib/tracks";

export const alt = "Causeway — concept node";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pre-generate one OG image per concept node at build time.
export function generateStaticParams() {
  return allNodeIds().map((id) => ({ id }));
}

const PAPER = "#f5efe1";
const INK = "#393530";
const INK_2 = "#5a544d";
const INK_3 = "#7e7872";
const GOLD = "#9f6736";
const RULE = "#d6cdb6";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: Params) {
  const { id } = await params;
  const found = findNode(id.toUpperCase());

  // Fallback shape for an unknown id — keeps the OG endpoint from 500'ing
  // if someone shares a stale link.
  const title = found?.node.title ?? "Causeway";
  const trackLabel = found
    ? `Track ${found.track.letter} · ${found.track.name}`
    : "An explorable economy";
  const pocket = found?.node.pocket ?? "";
  const time = found?.node.time ?? "";
  const displayId = found?.node.id ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: PAPER,
          display: "flex",
          flexDirection: "column",
          padding: "72px 88px",
          justifyContent: "space-between",
          fontFamily: "serif",
        }}
      >
        {/* Header — brand + track eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width={56}
              height={56}
              fill={GOLD}
            >
              <rect x="1.5" y="8" width="21" height="2.25" rx="0.5" />
              <rect x="4" y="10.25" width="2.5" height="10" rx="0.4" />
              <rect x="10.75" y="10.25" width="2.5" height="10" rx="0.4" />
              <rect x="17.5" y="10.25" width="2.5" height="10" rx="0.4" />
            </svg>
            <div
              style={{
                fontSize: 28,
                color: INK,
                letterSpacing: "-0.01em",
                display: "flex",
              }}
            >
              Causeway
            </div>
          </div>
          <div
            style={{
              fontSize: 22,
              color: INK_3,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span>{trackLabel}</span>
            {time && (
              <>
                <span style={{ color: RULE }}>·</span>
                <span style={{ color: GOLD }}>{time}</span>
              </>
            )}
          </div>
        </div>

        {/* Title block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {displayId && (
            <div
              style={{
                fontSize: 26,
                color: GOLD,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              Node {displayId}
            </div>
          )}
          <div
            style={{
              fontSize: 72,
              color: INK,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 1000,
              display: "flex",
            }}
          >
            {title}
          </div>
          {pocket && (
            <div
              style={{
                fontSize: 26,
                color: INK_2,
                lineHeight: 1.45,
                maxWidth: 1000,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {pocket}
            </div>
          )}
        </div>

        {/* Footer — pedagogy + handle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `2px solid ${RULE}`,
            paddingTop: 22,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: INK_3,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            Pocket · Working model · Full picture
          </div>
          <div
            style={{
              fontSize: 20,
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
