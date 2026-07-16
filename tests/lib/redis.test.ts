import { describe, it, expect } from "vitest";
import { resolveRedisCreds } from "@/lib/redis";

describe("resolveRedisCreds", () => {
  it("reads the explicit UPSTASH_* names", () => {
    expect(
      resolveRedisCreds({
        UPSTASH_REDIS_REST_URL: "https://up.example",
        UPSTASH_REDIS_REST_TOKEN: "up-token",
      }),
    ).toEqual({ url: "https://up.example", token: "up-token" });
  });

  it("falls back to the Marketplace integration's KV_* names", () => {
    expect(
      resolveRedisCreds({
        KV_REST_API_URL: "https://kv.example",
        KV_REST_API_TOKEN: "kv-token",
      }),
    ).toEqual({ url: "https://kv.example", token: "kv-token" });
  });

  it("prefers UPSTASH_* over KV_* when both are present", () => {
    expect(
      resolveRedisCreds({
        UPSTASH_REDIS_REST_URL: "https://up.example",
        UPSTASH_REDIS_REST_TOKEN: "up-token",
        KV_REST_API_URL: "https://kv.example",
        KV_REST_API_TOKEN: "kv-token",
      }),
    ).toEqual({ url: "https://up.example", token: "up-token" });
  });

  it("returns null when no credentials are present", () => {
    expect(resolveRedisCreds({})).toBeNull();
  });

  it("returns null when only one half of a pair is present", () => {
    expect(
      resolveRedisCreds({ KV_REST_API_URL: "https://kv.example" }),
    ).toBeNull();
    expect(
      resolveRedisCreds({ UPSTASH_REDIS_REST_TOKEN: "up-token" }),
    ).toBeNull();
  });
});
