import { mockLedger, mockMoveJourney, mockSources } from "@ahead/contract/mock";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n.tsx";
import { Journey } from "./Journey.tsx";
import { Settings } from "./Settings.tsx";
import { SourceList } from "./Sources.tsx";

const noop = () => {};
const noShare = async () => {
  throw new Error("not in this test");
};
const render = (screen: ReactElement) => renderToStaticMarkup(createElement(I18nProvider, null, screen));

describe("redesigned task screens", () => {
  it("keeps every journey paragraph and service link in expandable cards", () => {
    const first = mockMoveJourney.items[0];
    if (!first) throw new Error("The mock journey needs a todo");
    const journey = { ...mockMoveJourney, items: [{ ...first, sourceIsService: true }] };
    const html = render(createElement(Journey, { journey, entry: undefined, onBack: noop, onToggleDone: noop, onShare: noShare }));
    expect(html).toContain('class="card kind-todo');
    expect(html).toContain("<details>");
    expect(html).toContain("Sama ilmoitus menee Postille.");
    expect(html).toContain("Open: DVV");
    expect(html).toContain('aria-label="Mark as done:');
    expect(html).not.toContain("shared with If");
  });

  it("offers to share exactly three fields, and shows what was shared afterwards", () => {
    const entry = mockLedger[0];
    if (!entry) throw new Error("The mock ledger needs an entry");
    const before = render(createElement(Journey, { journey: mockMoveJourney, entry, onBack: noop, onToggleDone: noop, onShare: noShare }));
    expect(before).toContain("Share this event with If");
    expect(before).toContain("Nothing is shared with If unless you choose to.");
    const after = render(
      createElement(Journey, {
        journey: mockMoveJourney,
        entry: { ...entry, shared: true },
        onBack: noop,
        onToggleDone: noop,
        onShare: noShare,
      }),
    );
    expect(after).toContain("Shared with If: move, 1 November, Turku");
    expect(after).not.toContain("Share this event with If");
  });

  it("keeps all six labelled source switches and locked Health", () => {
    const sources = mockSources.map((source) => ({ ...source, enabled: false }));
    const html = render(createElement(SourceList, { sources, onChange: noop }));
    for (const label of ["Calendar", "Mail", "Bank", "Places", "Photos", "Notifications", "Health"]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
    expect(html.match(/aria-checked="false"/g)).toHaveLength(7);
    expect(html).toContain('aria-disabled="true"');
  });

  it("renders language and all theme choices as labelled radios", () => {
    const html = render(createElement(Settings, { theme: "dark", onTheme: noop, onBack: noop }));
    expect(html).toContain("English");
    expect(html).toContain("Suomi");
    expect(html.match(/type="radio"/g)).toHaveLength(5);
    expect(html).toContain('name="theme" checked="" value="dark"');
    expect(html).toContain("System");
  });
});
