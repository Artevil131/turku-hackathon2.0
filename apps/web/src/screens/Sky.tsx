import type { EventType, IsoDate, Source } from "@ahead/contract";
import { useEffect, useRef } from "react";
import { addDays, daysBetween, type SkyDot } from "../analysis.ts";

/** A detected event drawn as a figure: its signals joined in date order, named in the serif, dated in the sans. */
export interface Constellation {
  id: string;
  type: EventType;
  label: string;
  /** The event's date as the user reads it (already formatted), when known. */
  date?: string;
  signalIds: readonly string[];
  /** The soonest event: its anchor star carries the amber ring. */
  ringed?: boolean;
}

interface Props {
  dots: readonly SkyDot[];
  constellations: readonly Constellation[];
  /** The window the plate spans; the calendar's look-ahead extends `to` past today. */
  from: IsoDate;
  to: IsoDate;
  today: IsoDate;
  /** The y bands, top to bottom, with their small-caps labels. */
  bands: readonly { source: Source; label: string }[];
  /** Short month names for the x ticks, in the user's language. */
  monthLabel(iso: IsoDate): string;
  /** Increments to replay the signature motion (Check now); 0 draws the sky in place. */
  revealKey: number;
  /** What a screen reader gets instead of the plate. */
  description: string;
  className?: string;
}

/** Five magnitudes, from the faintest signal to the brightest; unknown margins are the faintest. */
export const MAGNITUDE_RADII = [1.4, 2, 2.8, 3.8, 5] as const;

export function magnitude(margin: number | undefined): number {
  if (margin === undefined || margin < 0.25) return 0;
  if (margin < 0.5) return 1;
  if (margin < 0.75) return 2;
  if (margin < 1.25) return 3;
  return 4;
}

/** Deterministic spread inside a band, so two signals on one day never sit on each other. */
function jitter(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000 - 0.5;
}

const easeOut = (t: number) => 1 - 2 ** (-10 * Math.min(1, Math.max(0, t)));

const DOT_PHASE = 420;
const FIGURE_PHASE = 600;
const FIGURE_STAGGER = 260;

function token(el: HTMLElement, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * The sky plate: the window's snippets as magnitude-ramped dots by date (x) and source (y band), the fired events'
 * signals brightened and joined into constellations. A canvas, drawn again on resize, theme change and reveal.
 */
export function Sky({ dots, constellations, from, to, today, bands, monthLabel, revealKey, description, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastReveal = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = revealKey > 0 && revealKey !== lastReveal.current && !reduced;
    lastReveal.current = revealKey;
    const started = performance.now();
    const totalDays = Math.max(1, daysBetween(from, to));
    const lastFigureStart = DOT_PHASE + Math.max(0, constellations.length - 1) * FIGURE_STAGGER;
    const totalMs = lastFigureStart + FIGURE_PHASE;
    let frame = 0;

    const draw = (now: number) => {
      const t = animate ? now - started : Number.POSITIVE_INFINITY;
      const dpr = window.devicePixelRatio || 1;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === 0 || h === 0) return;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ground = token(host, "--plate");
      const hairline = token(host, "--hairline");
      const chalk = token(host, "--ink");
      const slate = token(host, "--ink-2");
      const fog = token(host, "--fog");
      const amber = token(host, "--amber");
      const serif = token(host, "--font-serif") || "serif";
      const sans = token(host, "--font-sans") || "sans-serif";
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ground;
      ctx.fillRect(0, 0, w, h);

      const compact = w < 330;
      const left = compact ? 54 : 72;
      const right = 12;
      const top = 10;
      const bottom = 24;
      const plotW = w - left - right;
      const plotH = h - top - bottom;
      const bandH = plotH / Math.max(1, bands.length);
      const x = (iso: IsoDate) => left + (Math.min(totalDays, Math.max(0, daysBetween(from, iso))) / totalDays) * plotW;
      const bandIndex = new Map(bands.map((b, i) => [b.source, i]));
      const y = (source: Source, id: string) => {
        const i = bandIndex.get(source) ?? bands.length - 1;
        return top + bandH * (i + 0.5) + jitter(id) * bandH * 0.64;
      };

      // Coordinate hairlines: the band rules, the month rules, and today's rule.
      ctx.lineWidth = 1;
      ctx.strokeStyle = hairline;
      ctx.beginPath();
      for (let i = 0; i <= bands.length; i++) {
        const yy = Math.round(top + bandH * i) + 0.5;
        ctx.moveTo(left, yy);
        ctx.lineTo(w - right, yy);
      }
      ctx.stroke();
      ctx.font = `12px ${sans}`;
      ctx.textBaseline = "top";
      ctx.fillStyle = slate;
      for (let d = addDays(from.slice(0, 7).concat("-01"), 0); d <= to; ) {
        const next = addDays(d.slice(0, 7).concat("-01"), 32).slice(0, 7).concat("-01");
        if (d >= from) {
          const xx = Math.round(x(d)) + 0.5;
          ctx.strokeStyle = hairline;
          ctx.beginPath();
          ctx.moveTo(xx, top);
          ctx.lineTo(xx, top + plotH);
          ctx.stroke();
          ctx.textAlign = "left";
          ctx.fillText(monthLabel(d).toUpperCase(), xx + 4, top + plotH + 7);
        }
        d = next;
      }
      {
        const xx = Math.round(x(today)) + 0.5;
        ctx.strokeStyle = slate;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(xx, top);
        ctx.lineTo(xx, top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Band labels in small caps down the left.
      ctx.font = `${compact ? 10 : 11}px ${sans}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = slate;
      for (const [i, b] of bands.entries()) {
        const label = b.label.toUpperCase();
        ctx.fillText(label, 8, top + bandH * (i + 0.5), left - 14);
      }

      // Every snippet as a dot, faint, in reading order.
      const inFigure = new Set(constellations.flatMap((c) => c.signalIds));
      for (const d of dots) {
        if (inFigure.has(d.id)) continue;
        const px = x(d.date);
        const reveal = animate ? easeOut((t - ((px - left) / plotW) * DOT_PHASE * 0.7) / (DOT_PHASE * 0.3)) : 1;
        if (reveal <= 0) continue;
        const r = MAGNITUDE_RADII[magnitude(d.margin)] ?? 2;
        ctx.globalAlpha = 0.85 * reveal;
        ctx.fillStyle = fog;
        ctx.beginPath();
        ctx.arc(px, y(d.source, d.id), r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // The constellations: lines drawn, then their stars brightened, in reading order.
      const byId = new Map(dots.map((d) => [d.id, d]));
      const placed: { x: number; y: number; w: number; h: number }[] = [];
      constellations.forEach((c, i) => {
        const stars = c.signalIds
          .map((id) => byId.get(id))
          .filter((d): d is SkyDot => d !== undefined)
          .sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source));
        if (stars.length === 0) return;
        const progress = animate ? easeOut((t - DOT_PHASE - i * FIGURE_STAGGER) / FIGURE_PHASE) : 1;
        if (progress <= 0) return;
        const pts = stars.map((s) => ({ x: x(s.date), y: y(s.source, s.id), s }));
        // Faint figure line, drawn along its length.
        if (pts.length > 1) {
          const segs = pts.length - 1;
          const drawn = progress * segs;
          ctx.strokeStyle = chalk;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 1;
          ctx.beginPath();
          const first = pts[0] as { x: number; y: number };
          ctx.moveTo(first.x, first.y);
          for (let k = 1; k <= segs; k++) {
            const a = pts[k - 1] as { x: number; y: number };
            const b = pts[k] as { x: number; y: number };
            const f = Math.min(1, Math.max(0, drawn - (k - 1)));
            if (f <= 0) break;
            ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // Stars: chalk, one step brighter than the faint field; the anchor ringed in amber.
        const anchor = pts.reduce((best, p) => ((p.s.margin ?? 0) > (best.s.margin ?? 0) ? p : best), pts[0] as (typeof pts)[number]);
        for (const p of pts) {
          const r = (MAGNITUDE_RADII[magnitude(p.s.margin)] ?? 2) + 0.6;
          ctx.globalAlpha = 0.35 + 0.65 * progress;
          ctx.fillStyle = c.ringed && p === anchor ? amber : chalk;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (c.ringed) {
          const r = (MAGNITUDE_RADII[magnitude(anchor.s.margin)] ?? 2) + 6;
          ctx.strokeStyle = amber;
          ctx.lineWidth = 1.25;
          ctx.globalAlpha = progress;
          ctx.beginPath();
          ctx.arc(anchor.x, anchor.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // The name in the serif, the date in the sans, beside the anchor star; labels never cover each other.
        const nameSize = compact ? 16 : 18;
        ctx.font = `italic ${nameSize}px ${serif}`;
        const nameW = ctx.measureText(c.label).width;
        ctx.font = `13px ${sans}`;
        const dateW = c.date ? ctx.measureText(c.date).width : 0;
        const blockW = Math.max(nameW, dateW);
        const blockH = nameSize + 4 + (c.date ? 16 : 0);
        const candidates = [
          { x: anchor.x + 14, y: anchor.y - blockH / 2 },
          { x: anchor.x - 14 - blockW, y: anchor.y - blockH / 2 },
          { x: anchor.x - blockW / 2, y: anchor.y - 16 - blockH },
          { x: anchor.x - blockW / 2, y: anchor.y + 16 },
        ];
        const clamp = (b: { x: number; y: number }) => ({
          x: Math.max(left + 4, Math.min(w - right - blockW - 4, b.x)),
          y: Math.max(top + 2, Math.min(top + plotH - blockH - 2, b.y)),
          w: blockW,
          h: blockH,
        });
        const overlaps = (b: { x: number; y: number; w: number; h: number }) =>
          placed.some((q) => b.x < q.x + q.w + 6 && q.x < b.x + b.w + 6 && b.y < q.y + q.h + 4 && q.y < b.y + b.h + 4);
        let box = clamp(candidates[0] as { x: number; y: number });
        for (const cand of candidates) {
          const b = clamp(cand);
          if (!overlaps(b)) {
            box = b;
            break;
          }
        }
        // Still colliding: walk down the plate until it is clear.
        for (let tries = 0; overlaps(box) && tries < 12; tries++)
          box = { ...box, y: Math.min(top + plotH - blockH - 2, box.y + blockH + 6) };
        placed.push(box);
        ctx.globalAlpha = progress;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = c.ringed ? amber : chalk;
        ctx.font = `italic ${nameSize}px ${serif}`;
        ctx.fillText(c.label, box.x, box.y);
        if (c.date) {
          ctx.fillStyle = slate;
          ctx.font = `13px ${sans}`;
          ctx.fillText(c.date, box.x, box.y + nameSize + 4);
        }
        ctx.globalAlpha = 1;
      });

      if (animate && t < totalMs) frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => draw(Number.POSITIVE_INFINITY));
    });
    ro.observe(host);
    const theme = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => draw(Number.POSITIVE_INFINITY));
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // Font files arrive after the first paint on a cold cache: the labels are drawn again in the right face.
    void document.fonts?.ready.then(() => {
      frame = requestAnimationFrame(() => draw(Number.POSITIVE_INFINITY));
    });
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      theme.disconnect();
    };
  }, [dots, constellations, from, to, today, bands, monthLabel, revealKey]);

  return (
    <div className={`plate sky-plate ${className ?? ""}`} data-dots={dots.length} data-figures={constellations.length}>
      <canvas ref={canvasRef} role="img" aria-label={description} />
    </div>
  );
}
