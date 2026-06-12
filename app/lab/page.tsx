import Link from "next/link";
import { Topbar, Crumb } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { PresetsRow } from "@/components/lab/PresetsRow";
import { RegimeUrlIngest } from "@/components/lab/RegimeUrlIngest";
import { ScenariosTrigger } from "@/components/lab/ScenariosTrigger";
import { RegimeComposer } from "@/components/widgets/regime-composer";
import { LeverageStress } from "@/components/widgets/leverage-stress";
import { RateTransmission } from "@/components/widgets/rate-transmission";
import { RegimeAssets } from "@/components/widgets/regime-assets";
import { CryptoSizer } from "@/components/widgets/crypto-sizer";

export const metadata = {
  title: "Lab · drive every widget from one regime · Causeway",
  description:
    "Pick a regime once, then watch how the same scenario propagates through the leverage stress test, rate-transmission map, regime-assets table, and crypto sizer. The same widgets you meet inside Track H, here driven by one shared scenario — pinnable + shareable by URL.",
};

export default function LabPage() {
  return (
    <>
      <Topbar
        crumb={
          <Crumb
            segments={[
              <Link key="map" href="/" className="hover:text-ink-2 no-underline">
                Track map
              </Link>,
              <span key="now" className="text-ink-2">
                Lab
              </span>,
            ]}
          />
        }
        right={
          <Link
            href="/regime"
            className="text-[11px] text-ink-2 hover:text-ink no-underline"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.08em" }}
          >
            Live regime →
          </Link>
        }
      />

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 mx-auto max-w-[1320px] w-full px-4 sm:px-6 lg:px-9 py-12"
      >
        <header className="mb-10 max-w-3xl">
          <div
            className="text-[11px] uppercase text-ink-3 flex items-center gap-2 mb-3"
            style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
          >
            Lab
            <span className="text-gold-deep">●</span>
            <span>One regime, several widgets</span>
          </div>
          <h1
            className="text-4xl leading-[1.05] tracking-tight mb-4"
            style={{ fontFamily: "var(--cw-serif)" }}
          >
            Drive every widget from{" "}
            <em className="text-gold-deep" style={{ fontStyle: "italic" }}>
              one regime
            </em>
            .
          </h1>
          <p
            className="text-lg text-ink-2 leading-relaxed"
            style={{ fontFamily: "var(--cw-serif)" }}
          >
            Pick a scenario above, then move the four axes inside the composer.
            The leverage stress-tester and rate-transmission map below read
            from the same regime — the rate-stress baseline and the policy Δ
            both move with you. Your scenario persists across reloads, and
            you can pin named regimes or share them as URLs.
          </p>
          <div className="mt-6">
            <ScenariosTrigger />
          </div>
        </header>

        <RegimeUrlIngest />

        <PresetsRow />

        <section className="mt-10">
          <RegimeComposer />
        </section>

        <section className="mt-10 grid grid-cols-1 gap-10">
          <div>
            <h2
              className="text-2xl mb-3"
              style={{ fontFamily: "var(--cw-serif)" }}
            >
              Reader · leverage stress
            </h2>
            <p
              className="text-sm text-ink-3 leading-relaxed max-w-2xl mb-2"
              style={{ fontFamily: "var(--cw-serif)" }}
            >
              The regime&apos;s fed-funds level vs neutral becomes the
              baseline rate stress. The slider adds to that baseline.
            </p>
            <LeverageStress />
          </div>

          <div>
            <h2
              className="text-2xl mb-3"
              style={{ fontFamily: "var(--cw-serif)" }}
            >
              Reader · rate transmission
            </h2>
            <p
              className="text-sm text-ink-3 leading-relaxed max-w-2xl mb-2"
              style={{ fontFamily: "var(--cw-serif)" }}
            >
              The policy Δ is the regime&apos;s fed-funds level minus neutral.
              Drag the slider to push the regime through the eight downstream
              channels.
            </p>
            <RateTransmission />
          </div>
        </section>

        <section className="mt-16">
          <h2
            className="text-2xl mb-2 pb-3 border-b border-rule"
            style={{ fontFamily: "var(--cw-serif)" }}
          >
            Assets &amp; crypto
          </h2>
          <p
            className="text-sm text-ink-3 leading-relaxed max-w-2xl mt-4 mb-8"
            style={{ fontFamily: "var(--cw-serif)" }}
          >
            The two widgets below couple to the regime&apos;s inflation and
            unemployment axes. Regime-assets snaps to one of four canonical
            quadrants; crypto-sizer shifts its return assumptions to reflect
            the implied debasement and cost-of-capital picture.
          </p>

          <div className="grid grid-cols-1 gap-10">
            <div>
              <h3
                className="text-xl mb-3"
                style={{ fontFamily: "var(--cw-serif)" }}
              >
                Reader · regime × assets
              </h3>
              <p
                className="text-sm text-ink-3 leading-relaxed max-w-2xl mb-2"
                style={{ fontFamily: "var(--cw-serif)" }}
              >
                Inflation above 3.3% picks the inflationary quadrants;
                unemployment below 5% picks the boom quadrants. The
                ranking inside the panel comes from long-sample real returns.
              </p>
              <RegimeAssets />
            </div>

            <div>
              <h3
                className="text-xl mb-3"
                style={{ fontFamily: "var(--cw-serif)" }}
              >
                Reader · crypto sizer
              </h3>
              <p
                className="text-sm text-ink-3 leading-relaxed max-w-2xl mb-2"
                style={{ fontFamily: "var(--cw-serif)" }}
              >
                Each 1pp inflation above target lifts the reserve-asset
                return assumption by 2pct (debasement hedge). Each 1pp
                fed-funds above neutral cuts the tail-risk return by 3pct
                (cost-of-capital drag).
              </p>
              <CryptoSizer />
            </div>
          </div>
        </section>

        <p
          className="mt-12 text-sm text-ink-3 leading-relaxed max-w-2xl"
          style={{ fontFamily: "var(--cw-serif)" }}
        >
          More widgets will join the lab over time. These five are the ones
          whose mechanics depend most directly on the regime — others
          (saving, housing, currency) need a richer scenario than four axes.
        </p>
      </main>

      <Footer />
    </>
  );
}
