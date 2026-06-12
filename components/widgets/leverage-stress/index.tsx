"use client";

import { useId, useMemo, useState } from "react";
import { useRegime } from "@/components/providers/RegimeProvider";
import styles from "./leverage-stress.module.css";
import {
  ASSET_TEMPLATES,
  DEFAULT_INPUTS,
  compute,
  findAssetTemplate,
  formatMoney,
  verdictTone,
  type AssetKind,
  type Inputs,
} from "./model";

/** Neutral fed-funds reference for deriving a regime-implied rate stress (bp). */
const NEUTRAL_FED_FUNDS = 3.5;

/**
 * Leverage stress-tester (H7 hero).
 *
 * Pick an asset class (primary home, rental, margin loan, consumer debt),
 * size the loan, then dial up a stress scenario. The verdict tells you
 * whether the structure survives — green (well-structured), gold (tight),
 * red (broken). Operationalises H7's two-condition test.
 *
 * Lab-mode reader: when wrapped in a RegimeProvider (e.g. on `/lab`), the
 * regime's fed-funds delta vs neutral becomes the baseline rate stress; the
 * slider then adds to that baseline. Outside the provider, behaviour is
 * unchanged.
 */
export function LeverageStress() {
  const regime = useRegime();
  const regimeStressBp = regime
    ? Math.max(0, Math.round((regime.inputs.fedFunds - NEUTRAL_FED_FUNDS) * 100))
    : null;

  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [followRegime, setFollowRegime] = useState(false);

  const assetId = useId();
  const loanId = useId();
  const aprId = useId();
  const termId = useId();
  const incomeId = useId();
  const rateStressId = useId();
  const assetStressId = useId();
  const incomeStressId = useId();
  const followId = useId();

  // When a regime is present, fold the regime-implied stress into the
  // baseline so compute() sees the total. When "follow" is on, the slider is
  // disabled and the regime baseline becomes the only rate stress. When off
  // (default), the slider adds an additional stress on top of the regime
  // baseline.
  const isFollowing = regimeStressBp !== null && followRegime;
  const effectiveInputs = useMemo<Inputs>(() => {
    if (regimeStressBp === null) return inputs;
    const sliderContribution = isFollowing ? 0 : inputs.rateStressBp;
    return { ...inputs, rateStressBp: regimeStressBp + sliderContribution };
  }, [inputs, regimeStressBp, isFollowing]);
  const result = useMemo(() => compute(effectiveInputs), [effectiveInputs]);
  const template = findAssetTemplate(inputs.kind);

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
  }

  function setKind(kind: AssetKind) {
    const t = findAssetTemplate(kind);
    if (!t) return;
    setInputs((p) => ({
      ...p,
      kind,
      apr: t.defaultRate,
      termMonths: t.defaultTerm,
      loanAmount: Math.round(p.assetValue * (t.defaultLtv / 100)),
    }));
  }

  const tone = verdictTone(result.verdict);
  const verdictClass =
    tone === "green"
      ? `${styles.verdict} ${styles.verdictGreen}`
      : tone === "gold"
        ? `${styles.verdict} ${styles.verdictGold}`
        : `${styles.verdict} ${styles.verdictRed}`;

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.headTitle}>
          Leverage stress-tester · does this position survive?
          <span
            style={{
              marginLeft: 10,
              padding: "2px 7px",
              borderRadius: 999,
              border: "1px solid var(--gold)",
              color: "var(--gold-deep)",
              background: "var(--gold-wash)",
              fontFamily: "var(--cw-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
            }}
          >
            Try the controls
          </span>
        </span>
      </div>

      <div className={styles.assetPicker}>
        {ASSET_TEMPLATES.map((t) => (
          <button
            key={t.kind}
            type="button"
            onClick={() => setKind(t.kind)}
            className={`${styles.assetCell} ${
              inputs.kind === t.kind ? styles.assetCellActive : ""
            }`}
            aria-pressed={inputs.kind === t.kind}
          >
            <span className={styles.assetLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      {template && <div className={styles.blurb}>{template.blurb}</div>}

      <div className={styles.body}>
        <div className={styles.inputs}>
          <div className={styles.sectionLabel}>Position</div>

          <div className={styles.field}>
            <label htmlFor={assetId} className={styles.fieldLabel}>
              Asset value
            </label>
            <div className={styles.fieldRow}>
              <input
                id={assetId}
                type="number"
                min={0}
                max={50_000_000}
                step={5000}
                value={inputs.assetValue}
                onChange={(e) =>
                  update("assetValue", Math.max(0, parseFloat(e.target.value) || 0))
                }
                className={styles.input}
              />
              <span className={styles.unit}>USD</span>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor={loanId} className={styles.fieldLabel}>
              Loan amount
            </label>
            <div className={styles.fieldRow}>
              <input
                id={loanId}
                type="number"
                min={0}
                max={50_000_000}
                step={5000}
                value={inputs.loanAmount}
                onChange={(e) =>
                  update("loanAmount", Math.max(0, parseFloat(e.target.value) || 0))
                }
                className={styles.input}
              />
              <span className={styles.unit}>USD</span>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={aprId} className={styles.fieldLabel}>
                APR
              </label>
              <span className={styles.sliderValue}>
                {inputs.apr.toFixed(1)}%
              </span>
            </div>
            <input
              id={aprId}
              type="range"
              min={0}
              max={20}
              step={0.1}
              value={inputs.apr}
              onChange={(e) => update("apr", parseFloat(e.target.value))}
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={termId} className={styles.fieldLabel}>
                Term
              </label>
              <span className={styles.sliderValue}>
                {inputs.termMonths} mo
              </span>
            </div>
            <input
              id={termId}
              type="range"
              min={12}
              max={480}
              step={12}
              value={inputs.termMonths}
              onChange={(e) => update("termMonths", parseInt(e.target.value))}
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={incomeId} className={styles.fieldLabel}>
              Monthly income · net (rent if rental, take-home if personal)
            </label>
            <div className={styles.fieldRow}>
              <input
                id={incomeId}
                type="number"
                min={0}
                max={500_000}
                step={500}
                value={inputs.monthlyIncome}
                onChange={(e) =>
                  update("monthlyIncome", Math.max(0, parseFloat(e.target.value) || 0))
                }
                className={styles.input}
              />
              <span className={styles.unit}>USD</span>
            </div>
          </div>

          <div className={styles.sectionLabel}>Stress scenario</div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={rateStressId} className={styles.fieldLabel}>
                {isFollowing
                  ? `Rate stress · regime +${regimeStressBp}bp (locked)`
                  : regimeStressBp !== null
                    ? `Rate stress · regime +${regimeStressBp}bp + slider`
                    : "Rate stress"}
              </label>
              <span className={styles.sliderValue}>
                +{effectiveInputs.rateStressBp} bp
              </span>
            </div>
            <input
              id={rateStressId}
              type="range"
              min={0}
              max={500}
              step={25}
              value={inputs.rateStressBp}
              onChange={(e) => update("rateStressBp", parseInt(e.target.value))}
              disabled={isFollowing}
              className={styles.range}
            />
            {regimeStressBp !== null && (
              <label
                htmlFor={followId}
                className={styles.followToggle}
              >
                <input
                  id={followId}
                  type="checkbox"
                  checked={followRegime}
                  onChange={(e) => setFollowRegime(e.target.checked)}
                />
                <span>Follow regime (lock slider)</span>
              </label>
            )}
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={assetStressId} className={styles.fieldLabel}>
                Asset-value decline
              </label>
              <span className={styles.sliderValue}>
                −{inputs.assetStressPct}%
              </span>
            </div>
            <input
              id={assetStressId}
              type="range"
              min={0}
              max={50}
              step={1}
              value={inputs.assetStressPct}
              onChange={(e) =>
                update("assetStressPct", parseInt(e.target.value))
              }
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.sliderHead}>
              <label htmlFor={incomeStressId} className={styles.fieldLabel}>
                Income decline
              </label>
              <span className={styles.sliderValue}>
                −{inputs.incomeStressPct}%
              </span>
            </div>
            <input
              id={incomeStressId}
              type="range"
              min={0}
              max={60}
              step={5}
              value={inputs.incomeStressPct}
              onChange={(e) =>
                update("incomeStressPct", parseInt(e.target.value))
              }
              className={styles.range}
            />
          </div>
        </div>

        <div className={styles.results}>
          <div className={verdictClass}>{result.verdict.replace("-", " ")}</div>
          <p className={styles.explanation}>{result.explanation}</p>

          <div className={styles.compareTable}>
            <div className={styles.compareHead}>Metric</div>
            <div className={styles.compareHead}>Base</div>
            <div className={styles.compareHead}>Under stress</div>

            <div className={`${styles.compareCell} ${styles.compareCellLabel}`}>Monthly payment</div>
            <div className={styles.compareCell}>{formatMoney(result.basePayment)}</div>
            <div className={styles.compareCell}>{formatMoney(result.stressedPayment)}</div>

            <div className={`${styles.compareCell} ${styles.compareCellLabel}`}>LTV</div>
            <div className={styles.compareCell}>{result.ltv.toFixed(1)}%</div>
            <div className={`${styles.compareCell} ${result.stressedLtv > 100 ? styles.compareCellRed : ""}`}>
              {Number.isFinite(result.stressedLtv) ? `${result.stressedLtv.toFixed(1)}%` : "—"}
            </div>

            <div className={`${styles.compareCell} ${styles.compareCellLabel}`}>Payment / income</div>
            <div className={styles.compareCell}>{result.baseDti.toFixed(1)}%</div>
            <div className={`${styles.compareCell} ${result.stressedDti > 40 ? styles.compareCellRed : ""}`}>
              {Number.isFinite(result.stressedDti) ? `${result.stressedDti.toFixed(1)}%` : "—"}
            </div>

            <div className={`${styles.compareCell} ${styles.compareCellLabel}`}>Equity under stress</div>
            <div className={styles.compareCell}>{formatMoney(inputs.assetValue - inputs.loanAmount)}</div>
            <div className={`${styles.compareCell} ${result.stressedUnderwater ? styles.compareCellRed : ""}`}>
              {formatMoney(result.stressedEquity)}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footLabel}>What to do ▸</span>
        <span>
          Well-structured leverage survives the stress with margin. If your
          position only works in the base case, you don&apos;t have leverage —
          you have a bet that the regime will hold.
        </span>
      </div>
    </div>
  );
}
