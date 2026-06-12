/**
 * Causeway · shared base64url helpers for share-URL state.
 *
 * Used by both lib/playbook.ts (playbook share links) and lib/regime-scenarios.ts
 * (lab regime share URLs). Standard base64 with `+/=` swapped for `-_` and the
 * trailing `=` padding stripped — URL-safe and stable across all runtimes.
 */

export function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const std =
    typeof btoa !== "undefined"
      ? btoa(bin)
      : Buffer.from(bin, "binary").toString("base64");
  return std.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(input: string): string {
  const std =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((input.length + 3) % 4);
  const bin =
    typeof atob !== "undefined"
      ? atob(std)
      : Buffer.from(std, "base64").toString("binary");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
