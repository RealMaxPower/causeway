/**
 * Global MDX component overrides. Required by @next/mdx in the App Router.
 *
 * Causeway intentionally keeps this minimal — node MDX files explicitly
 * import the layer scaffold (L1/L2/L3, Callout, Debate, etc.) so the prose
 * authoring stays explicit about what's being rendered. This file only
 * styles the bare HTML elements (p, h1, strong, em) that markdown produces.
 */

import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  };
}
