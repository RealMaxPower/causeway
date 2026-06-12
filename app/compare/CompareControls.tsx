"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  COUNTRIES,
  MAX_COUNTRIES,
  type Country,
} from "@/lib/data/worldbank-countries";
import {
  INDICATORS,
  MAX_INDICATORS,
  type Indicator,
} from "@/lib/data/worldbank-indicators";
import styles from "./compare.module.css";

interface CompareControlsProps {
  selectedCountries: Country[];
  selectedIndicators: Indicator[];
}

/**
 * The only client piece of /compare. Renders chip rows for country and
 * indicator selection; clicking a chip toggles inclusion and writes the
 * new comma-separated lists into the URL. The page server component
 * re-renders against the new params.
 */
export function CompareControls({
  selectedCountries,
  selectedIndicators,
}: CompareControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedC = useMemo(
    () => new Set(selectedCountries.map((c) => c.iso3)),
    [selectedCountries],
  );
  const selectedI = useMemo(
    () => new Set(selectedIndicators.map((i) => i.code)),
    [selectedIndicators],
  );

  const navigate = useCallback(
    (next: { c?: string[]; i?: string[] }) => {
      const params = new URLSearchParams(searchParams.toString());
      const cs = next.c ?? Array.from(selectedC);
      const is = next.i ?? Array.from(selectedI);
      params.set("c", cs.join(","));
      params.set("i", is.join(","));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams, selectedC, selectedI],
  );

  function toggleCountry(iso: string) {
    const next = new Set(selectedC);
    if (next.has(iso)) {
      if (next.size <= 1) return; // keep at least one
      next.delete(iso);
    } else {
      if (next.size >= MAX_COUNTRIES) return;
      next.add(iso);
    }
    navigate({ c: Array.from(next) });
  }

  function toggleIndicator(code: string) {
    const next = new Set(selectedI);
    if (next.has(code)) {
      if (next.size <= 1) return;
      next.delete(code);
    } else {
      if (next.size >= MAX_INDICATORS) return;
      next.add(code);
    }
    navigate({ i: Array.from(next) });
  }

  return (
    <div className={styles.controls}>
      <div className={styles.controlGroup}>
        <div className={styles.controlLabel}>
          Countries · pick up to {MAX_COUNTRIES}
        </div>
        <div className={styles.chips}>
          {COUNTRIES.map((c) => {
            const isOn = selectedC.has(c.iso3);
            return (
              <button
                key={c.iso3}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggleCountry(c.iso3)}
                className={`${styles.chip} ${isOn ? styles.chipActive : ""}`}
              >
                {c.name}
                {isOn && <span className={styles.chipX} aria-hidden>×</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.controlGroup}>
        <div className={styles.controlLabel}>
          Indicators · pick up to {MAX_INDICATORS}
        </div>
        <div className={styles.chips}>
          {INDICATORS.map((i) => {
            const isOn = selectedI.has(i.code);
            return (
              <button
                key={i.code}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggleIndicator(i.code)}
                className={`${styles.chip} ${isOn ? styles.chipActive : ""}`}
                title={i.label}
              >
                {i.short}
                {isOn && <span className={styles.chipX} aria-hidden>×</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
