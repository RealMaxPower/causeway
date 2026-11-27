import Link from "next/link";
import { Topbar, Crumb } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { fetchWbSeries, type WbSeries } from "@/lib/data/worldbank";
import { getFallback } from "@/lib/data/worldbank-fallback";
import {
  type Country,
} from "@/lib/data/worldbank-countries";
import {
  type Indicator,
} from "@/lib/data/worldbank-indicators";
import { CompareControls } from "./CompareControls";
import { parseCountries, parseIndicators } from "./parse";
import { IndicatorPanel } from "./IndicatorPanel";
import { sourceSummary } from "./presentation";

export const metadata = {
  title: "Compare countries · Causeway",
  description:
    "Put two to four countries next to each other on the macro indicators that matter. World Bank data with per-series sources and observation dates.",
};

export const revalidate = 21600; // 6h

interface PageProps {
  searchParams: Promise<{ c?: string | string[]; i?: string | string[] }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { c, i } = await searchParams;
  const countries = parseCountries(c);
  const indicators = parseIndicators(i);

  // Fan out (country × indicator) fetches in parallel. Each call is
  // separately cached by Next's fetch cache.
  const matrix = await Promise.all(
    indicators.map(async (ind) => ({
      indicator: ind,
      series: await Promise.all(
        countries.map((country) =>
          fetchWbSeries(
            ind.code,
            country.iso3,
            getFallback({ indicator: ind.code, country: country.iso3 }),
            30,
          ),
        ),
      ),
    })),
  );

  const series = matrix.flatMap((row) => row.series);

  return (
    <>
      <Topbar
        crumb={
          <Crumb
            segments={[
              <Link
                key="map"
                href="/"
                className="hover:text-ink-2 no-underline"
              >
                Track map
              </Link>,
              <span key="now" className="text-ink-2">
                Compare countries
              </span>,
            ]}
          />
        }
      />

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 mx-auto max-w-[1100px] w-full px-4 sm:px-6 lg:px-9 py-12"
      >
        <Hero countries={countries} indicators={indicators} series={series} />

        <CompareControls
          selectedCountries={countries}
          selectedIndicators={indicators}
        />

        <section className="mt-4">
          {matrix.map((row) => (
            <IndicatorPanel
              key={row.indicator.code}
              indicator={row.indicator}
              countries={countries}
              series={row.series}
            />
          ))}
        </section>

        <Methodology />
      </main>

      <Footer />
    </>
  );
}

interface HeroProps {
  countries: Country[];
  indicators: Indicator[];
  series: WbSeries[];
}

function Hero({ countries, indicators, series }: HeroProps) {
  const cNames = countries.map((c) => c.name).join(" · ");
  return (
    <section className="pb-8 border-b border-rule space-y-4">
      <div
        className="text-[11px] uppercase text-ink-3 flex items-center gap-2"
        style={{ fontFamily: "var(--cw-mono)", letterSpacing: "0.1em" }}
      >
        ◇ Compare
        <span className="text-gold-deep">●</span>
        <span>{sourceSummary(series)}</span>
      </div>
      <h1
        className="text-3xl lg:text-4xl leading-[1.05] tracking-tight"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        {cNames}
        <em className="text-gold-deep ml-2" style={{ fontStyle: "italic" }}>
          side-by-side
        </em>
      </h1>
      <p
        className="text-base text-ink-2 leading-relaxed max-w-2xl"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        {indicators.length} indicator{indicators.length === 1 ? "" : "s"} across {countries.length} countr{countries.length === 1 ? "y" : "ies"}.
        Pick from the chip rows below; the URL updates so you can share the comparison.
      </p>
    </section>
  );
}

function Methodology() {
  return (
    <section className="mt-12 pt-8 border-t border-rule space-y-3">
      <h3 className="text-lg" style={{ fontFamily: "var(--cw-serif)" }}>
        About this comparison
      </h3>
      <p
        className="text-sm text-ink-2 leading-relaxed max-w-3xl"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        Data comes from the public{" "}
        <a
          href="https://api.worldbank.org/v2"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-rule-2 hover:text-ink-2"
        >
          World Bank API
        </a>
        . Each country and indicator is fetched independently, with six-hour cache
        revalidation. Cached responses may be older when a refresh is delayed.
        The latest value year and source dataset update
        date are different measures of freshness; neither means data is real-time.
        When the API cannot supply usable values, a bundled illustrative snapshot
        is shown where available. Snapshot capture dates are unrecorded, so these
        samples should not be used as current estimates.
      </p>
      <p
        className="text-sm text-ink-2 leading-relaxed max-w-3xl"
        style={{ fontFamily: "var(--cw-serif)" }}
      >
        GDP and GDP-per-capita panels use a log axis so countries of very
        different size remain comparable on one chart. Zero and negative values
        cannot appear on a log axis but remain in the table. Dots show supplied
        values; lines connect consecutive years only. Missing years stay missing,
        including between the sampled snapshot years. Forecasts and other provider
        flags are marked in the chart and table. National definitions and revisions
        vary — treat single-year differences as approximate.
      </p>
    </section>
  );
}
