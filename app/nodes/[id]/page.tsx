import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/chrome/Topbar";
import { SideNav } from "@/components/chrome/SideNav";
import { MobileNav } from "@/components/chrome/MobileNav";
import { Footer } from "@/components/chrome/Footer";
import { LayerSwitch } from "@/components/chrome/LayerSwitch";
import { NodeHero } from "@/components/chrome/NodeHero";
import { Tutor } from "@/components/tutor/Tutor";
import { findNode, allNodeIds } from "@/lib/tracks";
import { parseLayer } from "@/lib/layer";
import { loadNodeContent } from "@/content/nodes/loader";
import { ProgressTracker } from "@/components/progress/ProgressTracker";
import { RelatedNodes } from "@/components/chrome/RelatedNodes";
import { siteUrl } from "@/lib/site-url";

export function generateStaticParams() {
  return allNodeIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = rawId.toUpperCase();
  const found = findNode(id);
  if (!found) return {};
  const { node, track } = found;
  const title = `${node.id} · ${node.title}`;
  const description = node.pocket;
  const url = `${siteUrl()}/nodes/${node.id}`;
  return {
    title: `${title} · Causeway`,
    description,
    openGraph: {
      title: `${title} · Causeway`,
      description,
      url,
      type: "article",
      siteName: "Causeway",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Causeway`,
      description,
    },
    alternates: { canonical: url },
    other: {
      "article:section": `Track ${track.letter} · ${track.name}`,
    },
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ l?: string }>;
}

export default async function NodePage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const { l } = await searchParams;

  const id = rawId.toUpperCase();
  const found = findNode(id);
  if (!found) notFound();

  const { node, track } = found;
  const layer = parseLayer(l);

  // Article schema — helps search engines surface the layered content
  // as a substantial scholarly article rather than a thin landing page.
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: node.title,
    description: node.pocket,
    url: `${siteUrl()}/nodes/${node.id}`,
    mainEntityOfPage: `${siteUrl()}/nodes/${node.id}`,
    inLanguage: "en",
    isPartOf: {
      "@type": "Series",
      name: `Track ${track.letter} · ${track.name}`,
      url: `${siteUrl()}/tracks/${track.letter}`,
    },
    publisher: {
      "@type": "Organization",
      name: "Causeway",
      url: siteUrl(),
    },
    author: {
      "@type": "Person",
      name: "Marshall Cahill",
    },
    keywords: [track.name, "economics", "explorable explanation"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
      <Topbar
        leftAddon={<MobileNav currentNodeId={node.id} />}
        right={<LayerSwitch layer={layer} />}
      />

      <div className="flex-1 flex">
        <SideNav currentNodeId={node.id} />

        <main id="main" tabIndex={-1} className="flex-1 max-w-3xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-9 py-8 lg:py-10">
          <MdxOrFallback
            id={id}
            layer={layer}
            nodeTitle={node.title}
            trackLetter={track.letter}
            trackShort={track.name}
            time={node.time}
            pocket={node.pocket}
          />
          <RelatedNodes currentId={id} />
        </main>
      </div>

      <Tutor nodeId={node.id} />

      <Footer />

      <ProgressTracker nodeId={node.id} layer={layer} />
    </>
  );
}

interface MdxOrFallbackProps {
  id: string;
  layer: 1 | 2 | 3;
  nodeTitle: string;
  trackLetter: string;
  trackShort: string;
  time: string;
  pocket: string;
}

async function MdxOrFallback({
  id,
  layer,
  nodeTitle,
  trackLetter,
  trackShort,
  time,
  pocket,
}: MdxOrFallbackProps) {
  const mod = await loadNodeContent(id);
  const meta = mod?.meta;

  // Pick the body to render for this layer
  const body =
    layer === 1 ? mod?.L1Body : layer === 2 ? mod?.L2Body : mod?.L3Body;

  // Resolve prereq id → { id, title } for the hero "Best read after …" line.
  const prereqId = meta?.prereq?.toUpperCase();
  const prereqNode = prereqId ? findNode(prereqId)?.node : undefined;
  const prereq = prereqNode ? { id: prereqNode.id, title: prereqNode.title } : undefined;

  return (
    <>
      <NodeHero
        trackLetter={trackLetter}
        trackShort={trackShort}
        nodeId={id}
        time={time}
        title={nodeTitle}
        deck={meta?.deck}
        heroStats={meta?.heroStats}
        heroStatsLabel={meta?.heroStatsLabel}
        heroClaim={meta?.heroClaim}
        prereq={prereq}
      />

      {body ? (
        body
      ) : layer === 1 ? (
        <p
          className="text-xl text-ink leading-relaxed"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          {pocket}
        </p>
      ) : (
        <div className="border border-rule rounded-md p-6 space-y-2 bg-paper-2/40">
          <div
            className="text-[11px] uppercase text-ink-3"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
          >
            Layer {layer} · not yet ported
          </div>
          <p className="text-sm text-ink-2 leading-relaxed">
            Layer {layer} content for {id} hasn&apos;t been authored yet.
            The pocket version (above) is the only ready content for this
            node so far. Check back as the curriculum fills in.
          </p>
        </div>
      )}
    </>
  );
}
