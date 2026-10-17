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
