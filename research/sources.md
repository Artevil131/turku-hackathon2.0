# Sources

Reading notes behind CONTEXT.md, ARCHITECTURE.md, PRIVACY.md and DATA.md.
Describes; decides nothing. Gathered 2026-10-17 by Claude Code, operated
by Aapo. Figures marked "secondary" need a primary source before the
pitch.

## If and the Finnish market

- Sampo Group business model: about 9 million customers group-wide,
  operations in Sweden, Norway, Finland, Denmark, UK, Baltics.
  https://www.sampo.com/group/business-model/
- Inderes on Sampo's Private Nordic area: about 3.7 million households in
  the four Nordic countries (2024). https://www.inderes.fi/en/articles/introducing-sampos-business-areas-private-nordic
- Sampo results 2025 (5 Feb 2026): insurance revenue 9.1 bn€, Nordics
  75 %. https://www.globenewswire.com/news-release/2026/02/05/3232648/0/en/Sampo-Group-s-results-for-2025.html
- Nordea–If partnership renewed in Finland (2020). https://www.nordea.com/fi/media/2020-03-12/nordea-jatkaa-vahinkovakuutusyhteistyota-ifin-kanssa-suomessa
- Finanssiala ry press release, 20 May 2022: leak damages turned up in
  2021: 34 800 damages, 171 M€ paid; fire 6 100 damages, 168 M€ (down
  from 191 M€); burglary 21 400 damages, 22 M€. Primary source for the
  pitch. https://www.sttinfo.fi/tiedote/69941993/vuotovahingot-kaantyivat-nousuun-putkiremontin-suunnittelu-kannattaa-aloittaa-jo-ennen-kuin-putket-vanhenevat-kasiin
- Older marketing figure, not to be used: ~40 000 cases and >160 M€ a
  year (undated, LähiTapiola–GROHE material).
  https://insurance-edge.net/2019/07/16/water-escape-claims-grohe-lahitapiola-present-sense-guard/
  https://www.grohe.com/en/corporate/news/category_news/pressreleases/pressrelease/laehitapiola-and-grohe-are-rethinking-water-damage-insurance-at-dia-amsterdam.html
- Flood coverage in Finnish home policies (OP explainer). https://www.op.fi/en/-/tulvat-ja-vakuutusten-korvattavuus

## Platform access and on-device models

- Android NotificationListenerService reference. https://developer.android.com/reference/android/service/notification/NotificationListenerService
- Google Play restricted-permission declaration process (QUERY_ALL_PACKAGES page as the analogous policy; the notification-access page still to be read). https://support.google.com/googleplay/android-developer/answer/10158779
- Apple NLContextualEmbedding: BERT-class, 512-d token vectors, 256 tokens, pool yourself. https://callstack.com/blog/on-device-ai-introducing-apple-embeddings-in-react-native
- Apple Foundation Models framework (iOS 26, on-device, free). https://createwithswift.com/exploring-the-foundation-models-framework/
- Android AICore / Gemini Nano: generation and classification, no documented embedding endpoint found. https://developer.android.com/ai/aicore

## Open data

- FMI open data: WFS stored queries, no key, CC BY 4.0; warnings as CAP Atom feed (endpoint to confirm). https://en.ilmatieteenlaitos.fi/open-data and https://en.ilmatieteenlaitos.fi/open-data-changelog
- DVV move notification: earliest one month before, latest a week after; Posti separate at muuttoilmoitus.fi. https://www.suomi.fi/services/asuinpaikan-muuttaminen-maistraatti/86f39ee0-4138-4c35-a2c8-085c1b5c33f1
- Enable Banking (Finnish PSD2 aggregator). https://enablebanking.com/ ; Finnish bank API landscape https://openbankingtracker.com/country/fi

## Law

- EU AI Act Annex III: risk assessment and pricing in life and health
  insurance is high-risk; P&C not listed. https://www.brownejacobson.com/insights/the-word-april-2024/eu-ai-act
- Actuarial Association of Europe on the draft high-risk classification
  guidelines (2026). https://actuary.eu/wp-content/uploads/2026/07/260714-Consultation-Summary-EC-Guidelines-on-Classifying-High-Risk-AI-Systems.pdf
- GDPR articles cited in PRIVACY.md from the regulation text; EDPB
  guidelines on consent (05/2020) and on automated decision-making
  (WP251) still to be re-read for exact wording.

## Listing risk map (libs/listing/src/risks.ts)

- Isännöintiliitto, Putkiremonttibarometri 2026 (May 2026): traditional
  pipe renovation, total cost per m² of living area, median 890 €
  nationally and 1 000 € in the capital region (2025: 850 and 1 128);
  works take about six months; most current projects are in 1970s and
  80s buildings; 21 % of property managers report renovations left
  undone for lack of finance. Primary.
  https://www.isannointiliitto.fi/wp-content/uploads/2026/05/Putkiremonttibaro-2026-tulokset.pdf
- Asbestos: survey required before any demolition or renovation in a
  building finished before 1994, also inside one flat; asbestos building
  materials used 1922–1992 (Isännöintiliitto owner's guide; Työterveyslaitos).
  https://www.isannointiliitto.fi/wp-content/uploads/2020/05/osakkaan-asbestiohje.pdf
- Urakkamaailma (Alma Marketplaces), quote requests Apr–Jun 2025, medians
  incl. VAT: asbestos removal 1 255 €, bathroom 5 057 €, roof 4 209 €,
  drainage 3 940 €, facade 2 885 €. Secondary (a tendering service's own
  requests). https://www.sttinfo.fi/tiedote/71303280/remonttiselvitys-nain-paljon-suosituimmat-remontit-maksoivat-kevaalla-2025?lang=fi
- False plinth (valesokkeli) most common small-house foundation of the
  1970s–80s: a thesis, secondary. https://www.theseus.fi/handle/10024/347668
- Radon: reference level 300 Bq/m³, new buildings 200; Finnish average
  about 94 Bq/m³; measure at least two months between September and May
  (STUK, via municipal pages). Per-municipality figures: STUK radon maps,
  not yet read. https://stuk.fi/radon
- Car upkeep about 1 070 €/year on servicing and repairs (Beely 2022, via
  Moottori), secondary; average car age 17.8 years at the end of 2025
  (Statistics Finland). https://moottori.fi/uutinen/suomalaiset-korjaavat-autojaan-keskimaarin-1-070-eurolla-kulut-kasvaneet-10-vuodessa/
  https://stat.fi/en/publication/cmfqlg5zx01jd07uordhc6leg
- Statistics Finland, table 13mu: price per m² and number of sales of old
  housing-company flats by postcode, yearly 2009–2025, CC BY 4.0; fetched
  for 2025 into `libs/listing/data/prices-postcode.json` (793 postcodes
  with a price; small areas are suppressed). Primary.
  https://pxdata.stat.fi/PxWeb/pxweb/fi/StatFin/StatFin__ashi/statfin_ashi_pxt_13mu.px/
- Traficom, passenger car periodic inspections by make, model series and
  commissioning year, 2023–2025 (PxWeb 040_kats_tau_104): number
  inspected, failure %, median km; 2025 fetched into
  `libs/listing/data/inspections.json` (505 makes and models). All 2025
  inspections of 4–20-year-old cars: 26.9 % failed. Primary.
  https://trafi2.stat.fi/PXWeb/pxweb/fi/TraFi/TraFi__Katsastuksen_vikatilastot/040_kats_tau_104.px/
- Dog's basic needs about 1 561 € a year (Kennelliitto and
  Taloustutkimus, 1 631 owners, February 2025, via STT). Secondary until
  the report itself is read. https://www.sttinfo.fi/files/1744/70976680/195916/fi
