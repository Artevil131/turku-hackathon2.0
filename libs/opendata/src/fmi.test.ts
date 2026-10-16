import { expect, test } from "vitest";
import { parseCapFeed, regionOfMunicipality, warningsFor } from "./fmi.ts";

function alert(opts: {
  id: string;
  msgType: string;
  refs?: string;
  region?: string;
  onset?: string;
  expires?: string;
  area?: string;
}): string {
  const geo = opts.region ? `<geocode><valueName>ISO 3166-2</valueName><value>${opts.region}</value></geocode>` : "";
  return `<entry><content type="text/xml"><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
    <identifier>${opts.id}</identifier><sent>2026-10-20T08:00:00+03:00</sent><msgType>${opts.msgType}</msgType>
    ${opts.refs ? `<references>${opts.refs}</references>` : ""}
    ${["fi-FI", "en-GB"]
      .map(
        (
          l,
        ) => `<info><language>${l}</language><event>${l === "fi-FI" ? "Pakkasvaroitus" : "Frost warning"}</event><severity>Moderate</severity>
      <eventCode><valueName>profile</valueName><value>coldWeather</value></eventCode>
      <onset>${opts.onset ?? "2026-10-30T00:00:00+02:00"}</onset><expires>${opts.expires ?? "2026-11-02T00:00:00+02:00"}</expires>
      <headline>${l} &amp; headline</headline><description>d</description>
      <parameter><valueName>color</valueName><value>yellow</value></parameter>
      <area><areaDesc>${opts.area ?? "Southwest Finland"}</areaDesc>${geo}</area></info>`,
      )
      .join("")}
  </alert></content></entry>`;
}

const feed = `<feed>${[
  alert({ id: "a1", msgType: "Alert", region: "FI-19" }),
  alert({ id: "a2", msgType: "Alert", region: "FI-19" }),
  alert({
    id: "a2u",
    msgType: "Update",
    refs: "sender,a2,2026-10-20T08:00:00+03:00",
    region: "FI-19",
    expires: "2026-11-03T00:00:00+02:00",
  }),
  alert({ id: "a3", msgType: "Alert", region: "FI-18" }),
  alert({ id: "a3c", msgType: "Cancel", refs: "sender,a3,2026-10-20T08:00:00+03:00", region: "FI-18" }),
  alert({ id: "sea", msgType: "Alert", area: "Bay of Bothnia" }),
].join("")}</feed>`;

test("parse drops cancelled and superseded warnings and keeps languages", () => {
  const w = parseCapFeed(feed);
  expect(w.map((x) => x.id).sort()).toEqual(["a1", "a2u", "sea"]);
  const a1 = w.find((x) => x.id === "a1");
  expect(a1?.regions).toEqual(["FI-19"]);
  expect(a1?.eventCode).toBe("coldWeather");
  expect(a1?.color).toBe("yellow");
  expect(a1?.text.fi?.event).toBe("Pakkasvaroitus");
  expect(a1?.text.en?.headline).toBe("en-GB & headline");
  expect(w.find((x) => x.id === "sea")?.regions).toEqual([]);
});

test("Turku maps to Southwest Finland, unknown places to nothing", () => {
  expect(regionOfMunicipality(" Turku ")).toBe("FI-19");
  expect(regionOfMunicipality("Nowhereville")).toBeUndefined();
  expect(warningsFor("Nowhereville", parseCapFeed(feed), "2026-10-25")).toEqual([]);
});

test("warningsFor keeps active and near-future warnings for the region only", () => {
  const w = parseCapFeed(feed);
  expect(warningsFor("Turku", w, "2026-10-25").map((x) => x.id)).toEqual(["a1", "a2u"]);
  expect(warningsFor("Turku", w, "2026-10-10")).toEqual([]);
  expect(warningsFor("Turku", w, "2026-11-10")).toEqual([]);
  expect(warningsFor("Helsinki", w, "2026-10-25")).toEqual([]);
});
