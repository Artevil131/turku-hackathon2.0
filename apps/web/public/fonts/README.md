# Fonts

Self-hosted, served from this app like everything else (no hosted stylesheet, no CDN; the service worker caches them with the rest of the shell).

| Family | Files | Origin | Licence |
| --- | --- | --- | --- |
| Instrument Serif (regular, italic) | `instrument-serif-*.woff2` | Google Fonts, https://fonts.google.com/specimen/Instrument+Serif (Rodrigo Fuenzalida, Jordan Egstad; woff2 from fonts.gstatic.com, v5) | SIL Open Font License 1.1 |
| Atkinson Hyperlegible (regular, bold, italic) | `atkinson-hyperlegible-*.woff2` | Google Fonts, https://fonts.google.com/specimen/Atkinson+Hyperlegible (Braille Institute of America; woff2 from fonts.gstatic.com, v12) | SIL Open Font License 1.1 |

Each face ships as a `latin` and a `latin-ext` subset, declared with `unicode-range` in `src/styles.css`. Roles: Instrument Serif italic names events, constellations and headings; Atkinson Hyperlegible sets body, dates and counts (tabular figures), chosen for legibility from the back of a room.
