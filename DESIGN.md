---
name: Ahead
description: The chart of the sky of your own data: evidence as stars, events as constellations, the months ahead as a plate you can read.
colors:
  night-sky: "#0a1021"
  deep-indigo: "#16233d"
  chart-blue: "#24374f"
  star-amber: "#ff4d2e"
  glow-amber: "#ffb36b"
  stardust: "#f2f2e9"
  slate: "#a3acbc"
  fog-veil: "#5a6477"
  ink-on-amber: "#0a1021"
  danger: "#ff6b7a"
  paper-shell: "#e9e9de"
  paper-hairline: "#c6c8bb"
  paper-slate: "#4f586b"
  paper-fog: "#9aa0a8"
  paper-amber-ink: "#c43a1f"
  paper-danger: "#b1263a"
  backdrop: "rgb(10 16 33 / 70%)"
  backdrop-share: "rgb(10 16 33 / 45%)"
typography:
  heading:
    fontFamily: '"Instrument Serif", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif'
    fontSize: "clamp(34px, 9vw, 46px)"
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.08
    letterSpacing: "0"
  sheet-title:
    fontFamily: '"Instrument Serif", serif'
    fontSize: "30px"
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.15
  section:
    fontFamily: '"Instrument Serif", serif'
    fontSize: "28px"
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.15
  wordmark:
    fontFamily: '"Instrument Serif", serif'
    fontSize: "26px"
    fontWeight: 400
    fontStyle: italic
  card-title:
    fontFamily: '"Instrument Serif", serif'
    fontSize: "25px"
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.2
  constellation-name:
    fontFamily: '"Instrument Serif", serif'
    fontSize: "18px"
    fontWeight: 400
    fontStyle: italic
  row:
    fontFamily: '"Atkinson Hyperlegible", "Helvetica Neue", Arial, sans-serif'
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.35
  body:
    fontFamily: '"Atkinson Hyperlegible", "Helvetica Neue", Arial, sans-serif'
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
  secondary:
    fontFamily: '"Atkinson Hyperlegible", sans-serif'
    fontSize: "16px"
    lineHeight: 1.5
  date-cell:
    fontFamily: '"Atkinson Hyperlegible", sans-serif'
    fontSize: "15px"
    lineHeight: 1.5
    fontVariantNumeric: tabular-nums
  small-caps:
    fontFamily: '"Atkinson Hyperlegible", sans-serif'
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.08em"
    textTransform: uppercase
  plate-tick:
    fontFamily: '"Atkinson Hyperlegible", sans-serif'
    fontSize: "11px"
rounded:
  control: "4px"
  sheet: "8px"
  chip: "999px"
spacing:
  compact: "8px"
  group: "12px"
  standard: "16px"
  card: "20px"
  mobile-gutter: "22px"
  desktop-gutter: "48px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.star-amber}"
    textColor: "{colors.ink-on-amber}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.stardust}"
    borderColor: "{colors.stardust}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  journey-card:
    backgroundColor: "transparent"
    textColor: "{colors.stardust}"
    borderColor: "{colors.chart-blue}"
    rounded: "{rounded.control}"
    padding: "20px"
  timetable-row:
    backgroundColor: "transparent"
    textColor: "{colors.stardust}"
    borderColor: "{colors.chart-blue}"
    padding: "16px 0"
---

# Design System: Ahead

## Overview

**Creative North Star: "The star atlas"**

The phone looked at the sky of its own data and found a few bright things. The app is the chart of that sky: every snippet in the window is a star, placed by date and source; an event is a constellation, its signals brightened and joined by hairlines; the months ahead are a plate with the risks drawn on it. It refuses the card stack of equal grey rectangles and the dashboard of tiles. This is an Operate surface: the world lends type, palette, density and one signature move; navigation and controls stay the standard web ones.

**Key Characteristics:**
- One material everywhere: hairline coordinate rules and dots on a fixed magnitude ramp, no fills, no shadows, no gradients.
- Two voices: a light italic serif names things (events, constellations, headings); a hyperlegible sans with tabular figures measures them (dates, counts, body).
- One amber, for the thing under the eye: the primary action, the selected state, the ringed object, and the counter after a share (in its glow tint).
- The sky plate is the only chart on Home; lists stay lists.

## Colors

### Primary
Night Sky (`#0a1021`) is the ground of every screen and plate. Deep Indigo (`#16233d`) is the shell (header, boundary strip, nav) and the sheets' raised surface. Chart Blue (`#24374f`) draws every hairline: band rules, month rules, card outlines, row dividers.

### Secondary
Star Amber (`#ff4d2e`) is the one hot colour: the primary button's fill (with Night Sky ink on it, 5.8:1), the selected segment, the ringed star and its label, the active nav tab, links, the warning card's outline, the switch when on. Glow Amber (`#ffb36b`) appears once: the outbound counter and its strip after a share, and the arrived payload rows. Danger (`#ff6b7a`) is a cooler red for errors and Erase, never decoration.

### Neutral
Stardust (`#f2f2e9`) is the chalk ink and the constellation stars. Slate (`#a3acbc`) is secondary ink at 8:1 on night: basis lines, dates, band labels, ticks. Fog Veil (`#5a6477`) is reserved for the faint field of unscored stars on the plate; it is never used for text.

### Paper chart (light mode)
Cream Stardust becomes the ground and Night Sky the ink; the shell is `#e9e9de`, hairlines `#c6c8bb`, secondary ink `#4f586b`, the faint field `#9aa0a8`. Amber fills, rings and selection are unchanged; amber *text* on cream darkens to `#c43a1f` (5.2:1). Dark is the default scene; light is a Settings choice for daylight projectors. The canvas reads its colours from the same custom properties, so the plate changes with the page.

**The One Amber Rule.** Amber marks exactly one thing per screen as the thing under the eye. A second amber on the same screen is either the warning outline (by kind) or a mistake.

## Typography

Two faces, both self-hosted from `apps/web/public/fonts/` (OFL; see its README). **Instrument Serif italic** is the naming voice: the wordmark (26), the task heading (34–46 fluid), sheet titles (30), section headings (28), card titles and the notice's question (25–28), row titles on the plate links and the horizon (24), the empty state (24), and constellation names on the canvas (18). **Atkinson Hyperlegible** is the measuring voice, chosen for the back of a room: rows (19), body (18), secondary (16), date cells (15), small caps for band names, sources and legends (12, bold, 0.08em, uppercase), plate ticks (11). All numerals are tabular. Finnish and English wrap naturally; paragraphs hold 68ch.

**The Two Voices Rule.** Serif italic names; sans measures. A number is never set in the serif; a constellation name is never set in the sans.

## Layout

A mobile-first flex shell fills 100dvh, at most 780px wide; the header and boundary strip stay, `main` scrolls. Content is at most 640px wide with 22px gutters (48px from 700px, 16px under 350px). On Home the sky plate is full-bleed and 44dvh tall (300–460px; 380px fixed from 700px, with side hairlines). Dates lead every timetable row in a 7ch cell; the arrow sits in a 24px column at the end.

## The magnitude ramp

Every star has one of five sizes, from the detector's normalised margin: radii 1.4, 2, 2.8, 3.8 and 5 px for margins under 0.25 (or unknown), under 0.5, under 0.75, under 1.25, and above. Stars in a constellation are drawn 0.6px larger in Stardust; the field is Fog Veil at 85%. The anchor of the soonest event (its brightest star) is amber with a ring 6px outside its radius. The same ramp sizes the novelty dots on This month.

## Elevation & Depth

None. Hairlines and spacing carry structure; the sheets lift only by a darkened backdrop (70%; 45% on the share sheet so the counter stays readable). No shadows, no gradients, no glass.

## Shapes

4px on every control, card, payload row and plate frame; 8px on dialogs; a 999px pill only for the novelty chips and the switch track. No ornamental edges.

## Components

- **Buttons:** 48px minimum height. Primary: amber fill, night ink. Secondary: transparent with a 1px Stardust outline. Quiet (Back): no outline, slate ink. Danger: outline in the danger red. Check now and Continue are full width at 54px.
- **Sky plate (canvas):** faint coordinate hairlines (band rules, month rules, today dashed), the band names in small caps down the left, the window's snippets as magnitude-ramped dots by date and source band (deterministic jitter inside the band), each detected event's signals brightened and joined in date order, named in the serif with its date in the sans beside its anchor star, labels pushed apart so they never cover each other, the soonest event ringed in amber. The notice shows a 190px plate with the event's constellation alone.
- **Timetable rows:** date cell | title | amber arrow, a hairline under each; the detector supplies the title. Evidence rows add the source in small caps and a "Not this" outline button.
- **Contribution bars:** per source, a 10px hairline track with an amber fill proportional to the source's total, the total and signal count in tabular figures, the strongest snippet's text under it.
- **Evidence timeline (SVG):** the score per day as a 1.5px chalk line, the threshold as a dashed slate rule with its value, month rules, the signals as dots on the line, the fired day ringed in amber with "crossed {date}".
- **Horizon plate (SVG):** a hairline axis from today to +90 with month rules; events as amber ringed stars with their serif name and sans date; insights as bands under the axis over their periods (amber-outlined for weather and cover gaps, slate for the rest) with their kind as a label.
- **This month:** new senders, merchants and places as chalk-outline chips; recurring payments as a table with interval, count and last date, an anomaly in amber; change points as a before/after pair of bars (slate, then amber); clusters as named constellations with a novelty dot on the ramp, ringed when near an event type.
- **Journey cards:** hairline outline, no fill; a warning card's outline is amber with an amber dot before its title. Service links are full-width outlined; source links are amber text.
- **Source switches:** 56×44px hit area, outlined track, slate thumb; amber track outline and thumb when on, and an amber dot in the margin before the row's title.
- **Settings:** native radios in an outlined segmented group; the selected segment fills amber.
- **Boundary strip:** outlined in slate with the count at 20px; after a share the outline and count turn Glow Amber and stay so.
- **Share sheet:** the three payload rows outlined, "Share with If" the only amber button, "Keep it on this phone" outlined; "Done" alone after sending.
- **Navigation:** four destinations (Home, Sky, Ledger, Sources) in slate; the active one in amber, bold, with a 6px amber dot under it.

## Motion

Two authored moments. **The reveal** after Check now: the field's dots fade in left to right over 420ms, then each constellation draws its lines along their length and brightens its stars over 600ms with an exponential ease-out, 260ms apart in reading order, and the timetable rows rise after the last figure. **The share:** the three rows lift off the chart in order, arrive as what If received, and the counter flips once and lights. Switches slide in 160ms; buttons press to 0.98. Reduced motion shows every end state in place; the canvas draws the sky at once.

## Do's and Don'ts

- **Do** keep standard web controls and keyboard affordances; the world lends type, palette, density and the sky.
- **Do** keep the outbound counter visible on every screen, including onboarding and settings.
- **Do** keep every number on screen from code: the detector's wording, the contract's dates and margins, the labelled example data.
- **Don't** add fills, shadows or gradients; a surface is the chart.
- **Don't** add a second chart to Home; the sky plate owns the field and lists stay lists.
- **Don't** add If branding; insurers appear by name only on insurance and comparison cards.
