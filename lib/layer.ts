/** Shared layer-state helpers usable from server or client components. */

export type LayerNumber = 1 | 2 | 3;

/** Parse the `?l=N` search-param value into a valid layer number; defaults to 1. */
export function parseLayer(value: string | string[] | undefined): LayerNumber {
  const v = Array.isArray(value) ? value[0] : value;
  const n = parseInt(v ?? "1", 10);
  return n === 2 || n === 3 ? n : 1;
}
