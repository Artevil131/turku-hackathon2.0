import { afterEach, describe, expect, it, vi } from "vitest";
import { analyseListing } from "./listing.ts";
import { API_URL } from "./share.ts";

afterEach(() => vi.unstubAllGlobals());

describe("ad analysis request", () => {
  it("posts only the chosen text through the measured global fetch", async () => {
    const body = {
      text: "Synthetic ad",
      listing: { kind: "other", fields: {}, mentions: [] },
      dropped: [],
      ms: 2,
      risks: [],
      timeline: {},
    };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    expect(await analyseListing({ text: "Synthetic ad" }, signal)).toEqual(body);
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/api/listing`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Synthetic ad" }),
      signal,
    });
  });
  it("posts only the chosen screenshot and exposes server failures", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 502 }));
    vi.stubGlobal("fetch", fetch);
    await expect(analyseListing({ image: "data:image/jpeg;base64,synthetic" })).rejects.toThrow("502");
    expect(JSON.parse(fetch.mock.calls[0]?.[1].body)).toEqual({ image: "data:image/jpeg;base64,synthetic" });
  });
  it("lets a network failure reach the retry state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(analyseListing({ text: "Synthetic ad" })).rejects.toThrow("Failed to fetch");
  });
});
