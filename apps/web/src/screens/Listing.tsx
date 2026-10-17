import type { ListingFields, Source, Timeline } from "@ahead/listing";
import { useEffect, useId, useRef, useState } from "react";
import { type Key, type T, useI18n } from "../i18n.tsx";
import { analyseListing, type ListingAnalysis, type ListingInput, screenshotData } from "../listing.ts";
import { costBars, formatEuro, quoteParts } from "./listingHelpers.ts";
import { useChartWidth } from "./useChartWidth.ts";

const ENUM_FIELDS = new Set<keyof ListingFields>(["priceKind", "seller", "fuel", "transmission", "buildingType", "heating", "species"]);

function SourceLink({ source }: { source: Source }) {
  const { t } = useI18n();
  return (
    <span className="listing-source">
      <a href={source.url} target="_blank" rel="noreferrer">
        {source.name}
      </a>
      {source.secondary && <span className="muted"> · {t("listing.secondary")}</span>}
    </span>
  );
}

function fieldValue(key: keyof ListingFields, value: string | number, t: T, locale: "fi" | "en") {
  if (ENUM_FIELDS.has(key)) return t(`listing.value.${value}` as Key);
  if (key === "priceEur" || key === "monthlyChargeEur") return formatEuro(Number(value), locale);
  if (typeof value === "number") return key === "year" ? String(value) : value.toLocaleString(locale === "fi" ? "fi-FI" : "en-GB");
  return value;
}

function CostTimeline({ timeline }: { timeline: Timeline }) {
  const { t, locale } = useI18n();
  const { ref, width: W } = useChartWidth();
  const id = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const left = 12;
  const { bars, max } = costBars(timeline, 118);
  const markerRows = Math.max(
    0,
    ...bars.map((bar) => timeline.entries.filter((entry) => entry.year === bar.year && entry.eur === undefined).length),
  );
  const bottom = 156 + markerRows * 12;
  const step = (W - left * 2) / Math.max(1, bars.length);
  const description = t("listing.chartDescription", { from: timeline.from, to: timeline.to });
  const entriesFor = (year: number) => timeline.entries.filter((entry) => entry.year === year);
  const active = bars.find((bar) => bar.year === hovered);

  return (
    <>
      <h2>{t("listing.timeline")}</h2>
      <figure className="plate timeline-plate listing-cost-plate">
        <svg ref={ref} viewBox={`0 0 ${W} ${bottom + 46}`} role="img" aria-labelledby={`${id}-title ${id}-desc`} className="timeline-chart">
          <title id={`${id}-title`}>{t("listing.timeline")}</title>
          <desc id={`${id}-desc`}>{description}</desc>
          <g className="hair">
            <line x1={left} x2={W - left} y1={bottom + 0.5} y2={bottom + 0.5} />
            <line x1={left} x2={W - left} y1={bottom - 118} y2={bottom - 118} />
          </g>
          <text className="listing-axis" x={left} y={24}>
            {formatEuro(max, locale)}
          </text>
          <text className="listing-axis" x={left} y={bottom + 40}>
            {formatEuro(0, locale)}
          </text>
          {bars.map((bar, i) => {
            const x = left + step * (i + 0.5);
            const entries = entriesFor(bar.year);
            const unpriced = entries.filter((entry) => entry.eur === undefined);
            const estimated = entries.some((entry) => entry.estimated);
            const label = `${bar.year}: ${formatEuro(bar.eur, locale)}${estimated ? ` · ${t("listing.estimated")}` : ""}${unpriced.length ? ` · ${unpriced.length} ${t("listing.unpricedMark")}` : ""}`;
            return (
              <g key={bar.year} onPointerEnter={() => setHovered(bar.year)} onPointerLeave={() => setHovered(null)}>
                <title>{label}</title>
                <rect x={x - step / 2} y={32} width={step} height={bottom - 8} fill="transparent" />
                <rect
                  className="listing-cost-bar"
                  x={x - Math.min(18, step - 8) / 2}
                  y={bottom - bar.height}
                  width={Math.min(18, step - 8)}
                  height={bar.height}
                  rx={2}
                  strokeDasharray={estimated ? "3 3" : undefined}
                />
                {unpriced.map((entry, k) => (
                  <circle
                    key={entry.id}
                    className="listing-unpriced"
                    cx={x}
                    cy={bottom - bar.height - 10 - k * 12}
                    r={4}
                    strokeDasharray={entry.estimated ? "2 2" : undefined}
                  />
                ))}
                <text className="listing-year" x={x} y={bottom + 20} textAnchor="middle">
                  {W < 420 ? String(bar.year).slice(-2) : bar.year}
                </text>
              </g>
            );
          })}
        </svg>
        <figcaption className="muted listing-chart-key">
          <span>
            {timeline.from}–{timeline.to}
          </span>
          <span>
            <span className="legend-line" />
            {t("listing.estimated")}
          </span>
          <span>○ {t("listing.unpricedMark")}</span>
        </figcaption>
        {active && (
          <div className="listing-chart-tooltip" role="status">
            {active.year} · {formatEuro(active.eur, locale)}
          </div>
        )}
      </figure>
      <p className="listing-total">{t("listing.total", { cost: formatEuro(timeline.total, locale) })}</p>
      {timeline.unpriced > 0 && (
        <p className="muted">{timeline.unpriced === 1 ? t("listing.floorOne") : t("listing.floor", { n: timeline.unpriced })}</p>
      )}
      <details>
        <summary>{t("listing.table")}</summary>
        <div className="listing-table-wrap">
          <table className="listing-cost-table">
            <caption className="visually-hidden">{t("listing.timeline")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("listing.year")}</th>
                <th scope="col">{t("listing.item")}</th>
                <th scope="col">{t("listing.cost")}</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((bar) => (
                <tr key={bar.year}>
                  <th scope="row">{bar.year}</th>
                  <td>
                    <ul className="list listing-timeline-items">
                      {entriesFor(bar.year).map((entry) => (
                        <li key={entry.id}>
                          {entry.title[locale]} · {entry.eur === undefined ? t("listing.unpricedMark") : formatEuro(entry.eur, locale)}
                          {entry.estimated && <span className="muted"> · {t("listing.estimated")}</span>}
                          {entry.source && <SourceLink source={entry.source} />}
                          {entry.quote && <blockquote>{entry.quote}</blockquote>}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>{formatEuro(bar.eur, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

function Result({ result }: { result: ListingAnalysis }) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState("");
  const transcript = useRef<HTMLParagraphElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const facts = Object.entries(result.listing.fields) as [keyof ListingFields, { value: string | number; quote: string }][];
  const quotes = [...facts.map(([, field]) => field.quote), ...result.listing.mentions.map((mention) => mention.quote)];
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const selectQuote = (quote: string) => {
    setSelected(quote);
    // Wait for the selected span, then bring the evidence into view without moving keyboard focus away from the fact.
    requestAnimationFrame(() => transcript.current?.querySelector(".quote-selected")?.scrollIntoView({ block: "center" }));
  };
  return (
    <section className="listing-result" aria-labelledby="listing-result-title">
      {result.listing.category && <p className="chip">{t(`listing.category.${result.listing.category}`)}</p>}
      <h2 id="listing-result-title" ref={heading} tabIndex={-1}>
        {result.listing.fields.title?.value ?? t("listing.facts")}
      </h2>
      <h3>{t("listing.facts")}</h3>
      <p className="muted">{t("listing.factsHint")}</p>
      <dl className="listing-facts">
        {facts.map(([key, field]) => (
          <div key={key}>
            <dt>{t(`listing.field.${key}`)}</dt>
            <dd>
              <button
                type="button"
                className={`row-button ${selected === field.quote ? "listing-fact-selected" : ""}`}
                aria-pressed={selected === field.quote}
                onClick={() => selectQuote(field.quote)}
              >
                {fieldValue(key, field.value, t, locale)}
              </button>
            </dd>
          </div>
        ))}
      </dl>
      <h2>{t("listing.risks")}</h2>
      {result.risks.length === 0 && <p className="muted">{t("listing.noRisks")}</p>}
      <ul className="cards listing-risks">
        {result.risks.map((risk) => (
          <li key={risk.id} className="card listing-risk">
            <h3>{risk.title[locale]}</h3>
            <p>{risk.why[locale]}</p>
            {risk.cost && (
              <div className="listing-risk-cost">
                <strong>
                  {t(risk.cost.per === "year" ? "listing.yearly" : "listing.once", { cost: formatEuro(risk.cost.eur, locale) })}
                </strong>
                <p className="muted">{risk.cost.basis[locale]}</p>
              </div>
            )}
            {risk.source && <SourceLink source={risk.source} />}
            {risk.quote && <blockquote>{risk.quote}</blockquote>}
          </li>
        ))}
      </ul>
      <CostTimeline timeline={result.timeline} />
      <h2>{t("listing.transcript")}</h2>
      <p className="listing-transcript" ref={transcript}>
        {quoteParts(result.text, quotes, selected).map((part) =>
          part.highlighted ? (
            <mark key={part.start} className={part.selected ? "quote-selected" : ""}>
              {part.text}
            </mark>
          ) : (
            <span key={part.start}>{part.text}</span>
          ),
        )}
      </p>
      {result.listing.kind === "other" && <p className="empty">{t("listing.other")}</p>}
    </section>
  );
}

export function Listing({ onBack }: { onBack(): void }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [readingImage, setReadingImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<ListingAnalysis | null>(null);
  const [consented, setConsented] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const lastInput = useRef<ListingInput | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileVersion = useRef(0);
  useEffect(
    () => () => {
      controller.current?.abort();
      fileVersion.current++;
    },
    [],
  );

  const send = async (input: ListingInput) => {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    lastInput.current = input;
    setSending(true);
    setFailed(false);
    setResult(null);
    try {
      const analysis = await analyseListing(input, abort.signal);
      if (!abort.signal.aborted) setResult(analysis);
    } catch {
      if (!abort.signal.aborted) setFailed(true);
    } finally {
      if (!abort.signal.aborted) setSending(false);
      if (controller.current === abort) controller.current = null;
    }
  };
  const submit = () => {
    if (!consented) dialog.current?.showModal();
    else void send(image ? { image } : { text });
  };
  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    const version = ++fileVersion.current;
    setReadingImage(true);
    setImageError(false);
    setImage(null);
    try {
      const data = await screenshotData(file);
      if (version === fileVersion.current) setImage(data);
    } catch {
      if (version === fileVersion.current) setImageError(true);
    } finally {
      if (version === fileVersion.current) setReadingImage(false);
    }
  };
  return (
    <section className="listing-screen">
      <button type="button" className="quiet back" onClick={onBack}>
        {t("journey.back")}
      </button>
      <h1>{t("listing.title")}</h1>
      <p className="screen-lead">{t("listing.lead")}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor="listing-text">{t("listing.text")}</label>
        <textarea
          id="listing-text"
          rows={6}
          value={text}
          disabled={sending || readingImage || !!image}
          onChange={(event) => setText(event.target.value)}
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            void chooseFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <div className="actions">
          <button type="button" disabled={sending || readingImage} onClick={() => fileInput.current?.click()}>
            {t("listing.screenshot")}
          </button>
          <button className="primary" type="submit" disabled={sending || readingImage || (!image && !text.trim())}>
            {t("listing.title")}
          </button>
        </div>
        {image && (
          <div className="listing-image">
            <img src={image} alt="" />
            <p className="muted">{t("listing.imageReady")}</p>
            <button type="button" disabled={sending} onClick={() => setImage(null)}>
              {t("listing.removeImage")}
            </button>
          </div>
        )}
        {readingImage && (
          <p className="muted" role="status">
            {t("listing.readingImage")}
          </p>
        )}
        {imageError && <p role="alert">{t("listing.imageError")}</p>}
      </form>
      {sending && (
        <p className="listing-progress muted" role="status">
          {t("listing.waiting")}
        </p>
      )}
      {failed && (
        <div>
          <p role="alert">{t("listing.failed")}</p>
          <div className="actions">
            <button
              type="button"
              onClick={() => {
                if (lastInput.current) void send(lastInput.current);
              }}
            >
              {t("listing.retry")}
            </button>
          </div>
        </div>
      )}
      {result && <Result result={result} />}
      <dialog ref={dialog} className="sheet" aria-labelledby="listing-consent-title" aria-describedby="listing-consent-body">
        {/* consent copy: needs team review (AGENTS.md) */}
        <h2 id="listing-consent-title">{t("listing.consentTitle")}</h2>
        <p id="listing-consent-body">{t("listing.consentBody")}</p>
        <div className="actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              setConsented(true);
              dialog.current?.close();
              void send(image ? { image } : { text });
            }}
          >
            {t("listing.send")}
          </button>
          <button type="button" onClick={() => dialog.current?.close()}>
            {t("consent.cancel")}
          </button>
        </div>
      </dialog>
    </section>
  );
}
