---
name: Ahead
description: Clear choices inside a visible local boundary.
colors:
  shell: "#123e48"
  shell-text: "#f2fbfc"
  shell-muted: "#c0dce0"
  pool-ground: "#eaf3f4"
  surface: "#ffffff"
  ink: "#123940"
  secondary-ink: "#48676d"
  line: "#b6cdd1"
  action: "#075d70"
  selected: "#e3f282"
  selected-ink: "#173c37"
  selected-ground: "#f1f7cf"
  danger: "#a42e38"
  warning: "#80520c"
  warning-ground: "#fff1cf"
  dark-ground: "#142f36"
  dark-surface: "#1c3e46"
  dark-ink: "#eff9f9"
  dark-secondary-ink: "#b4cdd0"
  dark-line: "#526e75"
  dark-shell: "#102f36"
  dark-action: "#a1dce6"
  dark-action-ink: "#10333c"
  dark-selected-ground: "#344b35"
  dark-danger: "#ffacb0"
  dark-warning: "#f8cf7b"
  dark-warning-ground: "#493e28"
  backdrop: "rgb(4 27 33 / 55%)"
  backdrop-share: "rgb(4 27 33 / 30%)"
typography:
  heading:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(30px, 8.7vw, 40px)"
    fontWeight: 720
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  sheet-title:
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  wordmark:
    fontSize: "24px"
    fontWeight: 750
    letterSpacing: "-0.04em"
  title:
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  section:
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  row:
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.35
  body:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "18px"
    lineHeight: 1.5
  secondary:
    fontSize: "16px"
    lineHeight: 1.5
  compact:
    fontSize: "14px"
    lineHeight: 1.3
rounded:
  small: "4px"
  control: "8px"
  surface: "12px"
  dialog: "18px"
  pill: "20px"
spacing:
  compact: "8px"
  group: "12px"
  standard: "16px"
  card: "20px"
  mobile-gutter: "22px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  journey-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "20px"
---

# Design System: Ahead

## Overview

**Creative North Star: "The local boundary"**

A phone-first operating interface informed by Finnish swimming-hall wayfinding: clear public instructions, pool-tinted space, petrol framing and sharply legible selected states. The world supplies palette, type, density and one source-selection movement; navigation and controls remain familiar web controls.

**Key Characteristics:**
- Large task headings, direct actions and readable evidence.
- A committed colored shell, not isolated accent decoration.
- Flat work surfaces with visible state and a persistent boundary strip.

## Colors

### Primary
Petrol frames the app; action teal identifies buttons and links. Deep ink carries the reading hierarchy. The pool ground keeps the workspace distinct from the shell.

### Secondary
Acid yellow identifies selection and event dates. Its dark selected ink remains constant between themes. Warning and danger colors are semantic, never decoration.

### Neutral
White surfaces sit on the cool reading ground. Secondary ink and dividing lines retain the same hue family. Dark mode uses the documented dark token family rather than inverting the page.

**The Boundary Rule.** The shell and its readable outbound counter persist while the work area scrolls.

## Typography

One workhorse system sans across the operating UI. This is an Operate surface, not an expressive display page. The ramp, top down: the fluid task heading (30–40px); the sheet title (28); the wordmark (24); card titles, the empty state and the notice's question (23); section headings and legends (21); row titles and the outbound count (20); body and card text (18); secondary text, dates, labels and controls (16); and a compact step (14) only for the boundary strip below 350px. Nothing sits between the steps. Text wraps naturally in both Finnish and English. Numerals in dates and counters are tabular; paragraphs are limited to 68ch, and a card's first sentence is clamped to three lines.

## Layout

A mobile-first flex shell fills 100dvh, at most 780px wide. The header and footer do not scroll; the main work area does. Main content is at most 640px wide. Mobile uses 22px gutters, widened to 48px from 700px. A compact adjustment below 350px preserves narrow-device controls. Safe-area insets pad the shell. Standard bottom navigation has three equal destinations.

## Elevation & Depth

Flat by default: colored fields, 1px outlines and spacing carry depth. Only the native dialogs lift, with a soft offset shadow (`0 16px 60px rgb(0 20 28 / 25%)`) and a darkened backdrop (55%). The share sheet's backdrop is lighter (30%) so the shell and its counter stay readable while the three rows leave.

## Shapes

Four radii: 4px inside segmented controls and on date cells; 8px on every control, payload row, segmented group and service link; 12px on event, journey and share surfaces; 18px on dialogs. Source switches use a 20px pill track with a circular thumb. No ornamental edge stripes or physical-material imitations.

## Components

- **Buttons:** 48px minimum height; primary actions use action teal, secondary actions a bordered surface. Main Check now and Continue actions are full-width. Hover darkens meaningful controls; focus uses a visible 3px outline.
- **Source switches:** a 56×44px hit area contains a 32px track. Selection changes the row field and moves the thumb 24px in 160ms with exponential ease-out. Reduced motion removes the transition. The list's top rule belongs to the first row, so it spans the selected field.
- **Settings:** native radios in segmented groups; selected options use acid yellow. Language and theme choices are not header controls.
- **Events:** full-width buttons with date cells and a consistent drawn arrow. The detector supplies the wording. With something to answer, "Needs your answer" is the home screen's heading; the tagline is the quiet state's.
- **Notices:** the inference as the heading, one muted basis line, the question at title size, three answers above the evidence. Back at the top like a journey.
- **Journeys:** cards ordered warning, to do, info, compare, insurance, then by due date, so help comes first and insurance is one card among many. No kind label: the warning ground carries the kind, and the word is visually hidden for screen readers. Readable first sentences (three lines at most), expandable detail, due dates, service/source links and todo checkboxes with a visible "Done".
- **Chips:** muted ink, never teal; teal means tappable only.
- **Navigation:** petrol field, pale labels and a yellow active destination. A small outlined settings action remains in the header.
- **Boundary strip:** inline label (16px) and outbound-request count (20px), with no oversized metric styling. After a share the strip's outline and count turn acid yellow and stay that way: the one number that changed keeps its mark.
- **Share sheet:** the three payload rows, one "Share with If" and one "Keep it on this phone", stacked full width; "Done" alone after sending.

## Motion

Two moments, nothing else. The event list arriving after Check now (rows rise 10px over 320ms, 40ms apart) and the share: the three rows lift off the phone in order, arrive as what If received, and the counter flips once and lights. Screens do not animate in, and journey cards and evidence rows do not stagger. Buttons press (scale 0.98) and switches slide; reduced motion removes all of it except the end states.

## Do's and Don'ts

- **Do** retain standard web controls and keyboard affordances.
- **Do** keep the outbound counter visible, including during onboarding and settings.
- **Do** preserve strong contrast in both themes and long Finnish labels.
- **Don't** add If branding; insurer names belong only in the relevant content cards.
- **Don't** replace useful evidence or service links with decoration.
- **Don't** use a physical-sign costume or novelty navigation.
