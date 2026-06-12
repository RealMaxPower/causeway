# Authoring a widget

A "widget" is an interactive client component embedded inside an MDX node — a slider-driven simulator, a comparison table, an animated SVG. Adding one is **three files in one directory**, then one import per MDX that embeds it.

## TL;DR

1. Create `components/widgets/<kebab-name>/` containing:
   - `model.ts` — pure compute (types, defaults, compute functions)
   - `<kebab-name>.module.css` — scoped styling
   - `index.tsx` — the React component (`"use client"`)
2. Import directly in the MDX where it embeds:
   ```tsx
   import { CryptoSizer } from "@/components/widgets/crypto-sizer";
   // …
   <CryptoSizer />
   ```

No barrel exports. No props from MDX. The widget owns its state.

---

## Directory pattern

```
components/widgets/crypto-sizer/
├── index.tsx                 // "use client"  · React component
├── model.ts                  // pure compute · no React, no DOM
└── crypto-sizer.module.css   // scoped styles · CSS modules
```

[components/widgets/crypto-sizer/](components/widgets/crypto-sizer/) is the canonical recent example. [components/widgets/leverage-stress/](components/widgets/leverage-stress/) is the H7 widget.

**Why three files?**
- `model.ts` is pure so unit tests run without a DOM, and the component file stays focused on JSX + state plumbing.
- CSS modules avoid Tailwind-in-widget — widget styling owns layout density that Tailwind utility composition tends to obscure.
- `index.tsx` is the only `"use client"` boundary; the model imports cleanly from anywhere.

---

## The React shape (canonical)

```tsx
"use client";

import { useId, useMemo, useState } from "react";
import styles from "./crypto-sizer.module.css";
import { DEFAULT_INPUTS, compute, type Inputs } from "./model";

export function CryptoSizer() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const result = useMemo(() => compute(inputs), [inputs]);

  const allocId = useId();          // one useId per labelled field
  // …

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className={styles.widget}>
      {/* … */}
      <label htmlFor={allocId}>Allocation</label>
      <input
        id={allocId}
        type="range"
        min={0} max={25} step={0.5}
        value={inputs.allocationPct}
        onChange={(e) => update("allocationPct", parseFloat(e.target.value))}
        className={styles.range}
      />
      {/* … */}
    </div>
  );
}
```

Rules of thumb:
- One `useState` for the input record (not one per field). Keeps `update()` cheap.
- One `useMemo` over the whole `compute()` call so the result is recomputed only when inputs change.
- One `useId()` **per labelled control** for accessibility (the `<label htmlFor>` ↔ `<input id>` link).
- Always range/number inputs with explicit `min`/`max`/`step`. Don't trust browser defaults.

---

## Embedding in MDX

```tsx
// content/nodes/H9.mdx
import { CryptoSizer } from "@/components/widgets/crypto-sizer";
// …

export const L2Body = (
  <L2 title="…">
    <L2Grid>
      {/* …prose steps… */}
    </L2Grid>
    <CryptoSizer />
  </L2>
);
```

The widget renders bare — no props, no children passed from MDX. It owns its state for the lifetime of the page.

---

## Lab-mode opt-in

The platform has a shared regime context driving several widgets at once on `/lab` (see [components/providers/RegimeProvider.tsx](components/providers/RegimeProvider.tsx)). A widget opts in by calling `useRegime()`; the hook returns `null` outside the provider, so MDX-embedded usages stay untouched.

There are three canonical patterns. Pick the one that fits.

### Pattern 1 · Writer (regime-composer)

Read from regime if present, mutate via `regime.patch()`; otherwise fall back to local state.

```ts
const regime = useRegime();
const [localInputs, setLocalInputs] = useState<Inputs>(DEFAULT_INPUTS);
const inputs = regime?.inputs ?? localInputs;

function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
  if (regime) regime.patch({ [key]: value });
  else setLocalInputs((p) => ({ ...p, [key]: value }));
}
```

Full example: [components/widgets/regime-composer/index.tsx](components/widgets/regime-composer/index.tsx).

### Pattern 2 · Reader, slider stacks on regime (leverage-stress)

Regime drives a baseline; the user's local control adds to it.

```ts
const regime = useRegime();
const regimeStressBp = regime
  ? Math.max(0, Math.round((regime.inputs.fedFunds - 3.5) * 100))
  : null;

const effectiveInputs = regimeStressBp !== null
  ? { ...inputs, rateStressBp: regimeStressBp + inputs.rateStressBp }
  : inputs;

const result = useMemo(() => compute(effectiveInputs), [effectiveInputs]);
```

Surface the adjustment in the UI so the user can see what the regime contributed. Full example: [components/widgets/leverage-stress/index.tsx](components/widgets/leverage-stress/index.tsx).

### Pattern 3 · Reader, slider overrides regime (rate-transmission)

Regime drives the value directly; if the user drags the slider, write it back to the regime.

```ts
const regime = useRegime();
const regimeDelta = regime ? Math.round((regime.inputs.fedFunds - 3.5) * 100) : null;

const [localDelta, setLocalDelta] = useState(-100);
const delta = regimeDelta ?? localDelta;

function onSliderChange(next: number) {
  if (regime) regime.patch({ fedFunds: 3.5 + next / 100 });
  else setLocalDelta(next);
}
```

Full example: [components/widgets/rate-transmission/index.tsx](components/widgets/rate-transmission/index.tsx).

---

## Mobile patterns

Two breakpoint blocks per widget CSS module:

```css
/* tablet · grid collapse */
@media (max-width: 880px) {
  .body { grid-template-columns: 1fr; }
  .assetPicker { grid-template-columns: repeat(2, 1fr); }
}

/* mobile · single column, tighter spacing */
@media (max-width: 479px) {
  .assetPicker { grid-template-columns: 1fr; }
  .inputs { padding: 16px; gap: 14px; }
  .compareTable { grid-template-columns: 1.2fr 0.9fr 0.9fr; }
}
```

Touch targets are handled globally in [app/globals.css](app/globals.css) — `input[type="range" | "number"]` and `button[type="button"]` all get `min-height: 44px` on `@media (pointer: coarse)`. Don't override.

Verify at iPhone 13 width (390px) in DevTools before merging. Mobile e2e tests in [tests/e2e/mobile.spec.ts](tests/e2e/mobile.spec.ts) assert no horizontal overflow on Track H pages.

---

## Pure compute in `model.ts`

Keep it actually pure:

```ts
export interface Inputs { /* … */ }
export const DEFAULT_INPUTS: Inputs = { /* … */ };

export interface Result { /* … */ }

export function compute(inputs: Inputs): Result {
  // …
  return { /* … */ };
}

export function formatMoney(n: number): string { /* … */ }
```

No React imports, no DOM, no side effects. The widget tests in [tests/widgets/](tests/widgets/) exercise the model directly.

---

## Common gotchas

- **`"use client"`** is required at the top of `index.tsx`. Forget it and the build still passes but state plumbing dies silently in production.
- **No props from MDX**: the widget can't be parameterised by the embedding node. If you need parameterised behaviour, lift the parameter into the model (preset buttons inside the widget) — not into props.
- **`useId()` per labelled field**, not one shared id. Accessibility scanners flag mismatched `htmlFor`/`id`.
- **CSS modules, not Tailwind**, inside the widget body. The dense layouts (compare tables, asset pickers, slider bounds) read more clearly with semantic class names.
- **Pure model**: no `import { useState }` in `model.ts`. Compute functions stay testable.
- **Don't write to localStorage** from the widget directly — if persistence is needed, route through the existing stores ([lib/regime-store.ts](lib/regime-store.ts), [lib/playbook.ts](lib/playbook.ts), [lib/progress.ts](lib/progress.ts)).
