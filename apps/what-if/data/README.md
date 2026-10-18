# Data for the "What if…" ad reader

These files feed the rule-based reader (no AI). The reader pulls fields out of an ad, then looks up rules and real numbers here. The two motorcycle files were added later the same day (see the end of the table).

Everything was gathered on 17 October 2026. A second agent then fact-checked each file. It downloaded every source again, compared the values and fixed the file in place. Each file records that check in a fact-check block: `factCheck` at the top level of the Traficom file, `meta.factCheck` in the others.

All files are UTF-8 JSON with a 2-space indent. None holds personal data. Raw downloads and fact-check working files are in `C:\dev\tmp-whatif-data`, outside the repo.

| File | What it is for | How an estimate is marked |
|---|---|---|
| `traficom-inspections.json` (2.5 MB) | How often a used car of a given model and year fails its inspection, and why | All values are Traficom's unless a field note says otherwise. The two assumptions say "(estimate)". |
| `housing-rules.json` (51 KB) | Renovations, their cost and the documents to ask for when buying a flat | `status`: primary, secondary, estimate, derived or missing, with a `basis` |
| `car-rules.json` (82 KB) | Buyer rights, inspection, tyres, insurance, tax and wear costs for a used car | `real: false` with a `basis`. Our reading of a law is in an `interpretation` field. |
| `rent-rules.json` (84 KB) | Rental law, insurance, moving in and out, and rent levels | `real: false` with a `basis` |
| `sample-ads.json` (119 KB) | How the ad sites write their fields, plus 12 test ads | Site observations are real. Test ads are synthetic. Labels not seen on a site are listed in `assumptions`. |
| `moto-rules.json` (13 KB) | Used motorcycle: no periodic inspection, what modifications need an inspection, licence classes, who pays (traffic insurance, kasko, wear), winter storage, vehicle tax, ABS | Every fact has a `source` id from its `sources` block, checked on 17 October 2026 against Finlex, Traficom, LVK, EUR-Lex and If's published terms. Nothing unverified is in it: there is no published price for a modification or registration inspection, so none is given. |
| `sample-ads-moto.json` (6 KB) | Nettimoto's labels, plus 5 motorcycle test ads and 4 ads that must stay unsupported (mopeds, a snowmobile, an ATV) | Nettimoto's labels were read from a public ad page. Test ads are synthetic, except moto-4, which is Vaishnav's example. |
| `powertrain-models.json` (5 KB) | The 11 Traficom model keys that are electric only (Nissan Leaf, Tesla Model 3/S/X/Y, VW ID.3/ID.4, Škoda Enyaq, Hyundai IONIQ 5, Polestar 2, Mercedes-Benz EQA), each with the maker's page and the phrase read there on 18.10.2026; the mixed keys left out and why (Golf includes the e-Golf); why there is no hybrid list. An electric car's safer choice compares it only with these | Tesla's pages refuse automated requests, so their URLs come from a web search of tesla.com the same day |
| `car-running-costs.json` (64 KB) | Energy cost over two years (km a year, fuel and electricity prices, the WLTP real-world gap), electric-car service and battery-test prices, battery warranties by make, and how to check recalls | `status`: primary, secondary, derived or missing, with a `basis`. Every number has a `source` id from `meta.sources`. Added 18 October 2026. |
| `car-recalls-eu.json` (1.5 MB) | 3,048 EU Safety Gate recall alerts for passenger cars, October 2016 to October 2026 | All Safety Gate's, except our normalised make names and parsed years. Built by `tools/recalls-snapshot.mjs`. |
| `rent-areas.json` (122 KB) | Statistics Finland's average rent per m² a month for privately financed rental flats: 27 municipalities by rooms (1, 2, 3+, all; also new leases only) from table 15fa, latest quarter, and 473 postal code areas by rooms from table 13eb, its last quarter. Built by `tools/fetch-rent-areas.mjs` | All Statistics Finland's (CC BY 4.0); only the needed columns are kept. Added 18 October 2026. |
| `flat-checks.json` (9 KB) | The facts behind the questions a flat ad's own words raise: plot lease renewal, energy class, oil heating, moisture damage, condition surveys, company loans | Every fact has a `source` id; `type` primary or secondary (Yle on plot rents is secondary). Added 18 October 2026. |
| `house-rules.json` (80 KB) | Buying a detached house or cottage: the Land Code on defects and time limits, transfer tax and title fee, property tax, scattered-settlement wastewater, private roads, the energy certificate, condition inspection prices, risk structures by era, radon measurement, oil tanks, wells, roof and drain lifetimes, If's home insurance terms (OMA 200.27), and electricity (over 15,000 kWh) and heating-oil prices | `status`: primary, secondary, derived or missing, with a `basis` or `gap`. Every number has a `source` id from `meta.sources`; law and terms carry `quoteFi`. Added 18 October 2026. |
| `radon-municipalities.json` (94 KB) | STUK's indoor radon in small houses by municipality: average, median, share above 200/300/1000 Bq/m³, dwellings measured; the reference levels | All STUK's, except the name aliases. Measured houses are not a sample, so the averages run high (see below). |
| `flood-risk-areas.json` (18 KB) | SYKE's 18 significant flood risk areas (2024 decision, to 2030) with their municipalities and flood types | The areas are SYKE's; the municipalities are our overlay on Statistics Finland's boundaries (see below). |

The price of old flats by postal code (Statistics Finland table 13mu, 2025) is not copied here: `tools/build-data.mjs` reads it from `libs/listing/data/prices-postcode.json`.

`test/car-running-costs.test.mjs` checks both new files: every number has a known source id, and the values pass sanity checks.

`moto-rules.json` also records a correction: Valtioneuvoston asetus 1455/2019, which `traficom-inspections.json` cites for the inspection schedule, was repealed by the Vehicles Act 82/2021. The schedule itself is unchanged; the duties are now in the Act.

## traficom-inspections.json

**What it holds.** Traficom's results for every periodic inspection (määräaikaiskatsastus) of a passenger car in Finland in 2025.

- `byModel`: 2,270 rows, one per make, model series and first-registration year (38 makes, 364 model series). Each row has inspections, rejection %, rejected count, average and median km, and Traficom's top 3 rejection causes.
- Fallbacks when no model row fits: `byModelAllYears`, `byMake`, `byMakeAllYears`, `averageByAge` (by first-registration year, same base as `byModel`) and `averageByVehicleAge` (all cars, age 0 to 25+).
- National figures: `national`, `nationalByYear` (2018–2025) and two tables by powertrain.
- Faults: `commonFaults` (89 fault areas), totals by main area, the top 5 per first-registration year, and `faultAreas` (Finnish names with English labels).
- `inspectionSchedule`: when a car must be inspected.
- `inspectionPrices`: average station prices, 2023–2025.
- `inspectionQualityCheck`: Traficom's 2025 spot-check of inspection stations. It targeted risky stations, so it is not a random sample.

Key numbers: 30.4 % of all 2,184,538 inspections failed in 2025. At the first inspection (age 4), 19.6 % of electric cars failed, against 5.4 % of petrol cars. A walk-in inspection cost 50.06 € on average in spring 2025 (39.89 € booked ahead; re-inspection 28.39 €).

**Sources.** All primary: Traficom's xlsx "Henkilöautojen määräaikaiskatsastusten vuositilasto 2025" (6.5.2026); Traficom's PxWeb tables 030, 040 and 050; Traficom's news item of 6.5.2026 and its statistics page; the page "Katsastusajankohdat ajoneuvoluokittain" (10.2.2026); "Katsastusalan tilannekatsaus 2025" (Traficomin julkaisuja 13/2026); Finlex, VNa 1455/2019.

**Fixed by the fact-check.** No data value was wrong. All 3,315 xlsx rows and every fault count match the sources. The fixes were to notes and rules:
- An empty cause list only means Traficom published no cause. The old note said no fault was common in those rows. That was false for 6 rows.
- Traficom's rule for which causes it lists is now quoted exactly. Its published lists follow neither reading of the rule exactly.
- "Cars from 2022 on had no inspection" was softened. Taxis are inspected every year.
- The schedule gained Traficom's rule for cars inspected 8–9 years after first use, the taxi exception and the Finlex source. A plain 4-2-2-1 count gives wrong due dates in that case.
- The source prints "22 cars = 14.0 %", but 22/148 is 14.9 %. It is kept as printed and flagged `sourceInconsistent`.

**Still missing or estimated.**
- Only inspection year 2025. The 2023 and 2024 rows exist in PxWeb but are not in the file.
- No model rows for cars first registered before 2005 or from 2022 on, or for model years with fewer than 100 inspections. Use the fallbacks.
- 272 model rows have no causes, because Traficom published none.
- No table maps ad text to Traficom's model series (for example "320d" to "BMW 3-sarja"). The reader needs one.
- No repair cost per fault area.
- Rejection % is not adjusted for mileage. Traficom warns that models are not directly comparable, so show km next to it.
- Our own additions: `ageYears` (2025 minus first-registration year), the shares in `commonFaults` (our arithmetic on Traficom's counts) and every English label (our translation; hints such as "(rust)" are ours).
- Estimates: that the inspection prices include VAT, and that they are passenger-car prices.
- Traficom's reuse terms were not checked. The page says only "© Traficom".

## housing-rules.json

**What it holds.** What a buyer of a flat in a housing company (asunto-osakeyhtiö) should know about the building.

- `renovations`: 9 items with a typical life, a life range and a cost per m² of the flat: pipe renovation, water pipes only, drains, facade, balconies, roof, windows, elevator and electrical. Facade and balconies also have a life by building year.
- `proposedRules`: 6 rules keyed by building year or age. Example: if the building is from before 1994, materials must be surveyed for asbestos before they are removed.
- `buyerChecks`: 9 questions to ask, each with its reason and legal basis.
- `leaks`: national water-leak damage figures for 2000, 2012, 2018 and 2021, their causes, and insurers' age deductions.
- `sources`: 19 entries with publisher, year and URL.

Key numbers: a pipe renovation cost a median 890 € per m² of flat in 2026 (1,000 €/m² in the capital region). In 2025 the middle half of projects cost 650–1,154 €/m². In 2021 there were 34,800 leak damages, and insurers paid 171 M€.

**Sources.**
- Primary: Isännöintiliitto (Putkiremonttibarometri 2025 and 2026, Katto- ja julkisivubarometri 2019, asbestos guides 2020 and 2021); Rakennustieto RT 103765 (2025), as shown in a public webinar deck; Finlex (AOYL 1599/2009, VNa 130/2001, VNa 798/2015); Finanssiala and its predecessors (2004–2022); Tilastokeskus (Korjausrakentaminen 2021).
- Secondary: Taloustaito (2023, 2024), Sustera Oy (consultancy article, 2025), Arvonosturi Oy (company blog, 2021).

**Fixed by the fact-check.**
- One wrong number. "18 % at risk within 5 years" was really the "don't know" share. The barometer says 11 % at risk and 89 % able to carry on.
- AOYL 3:7 §: the new owner's liability for unpaid charges is capped at an amount equal to six months' charges. It is not limited to those particular months.
- The asbestos survey is needed for work that removes or demolishes materials. Drilling holes is exempt.
- Facade cost per flat m²: the cited source says to double the facade price, which gives values about 3.3 times ours. Both ranges are kept, flagged as a conflict, and marked estimate.
- The drains "upper bound of 650 €/m²" was a difference of two medians. It is now an estimate.
- Several claims were made more precise: building-year ranges, the share of reported projects, why renovations start, and the year and scope of the 2002 leak shares.

**Still missing or estimated.**
- Costs for facade, balconies, roof, windows, elevator and drains are estimates. They rest on one consultancy article and one company blog with unclear units. The electrical cost is missing.
- Life values for drains, roof, windows, elevator and electrical are estimates, because the RT cards are paywalled. The 50-year pipe life is from a secondary source.
- No leak statistics after 2021, and no current share of home-insurance claims that are leaks.
- The 2026 barometer gives medians only, so the quartiles are from 2025. It does not say whether VAT is included.
- No national averages for hoitovastike or rahoitusvastike.
- The 6 `proposedRules` thresholds are proposals until the team confirms them.

## car-rules.json

**What it holds.** What a used-car buyer in Finland should know.

- `rights`: 16 rules for a dealer sale (Kuluttajansuojalaki ch. 5) and a private sale (Kauppalaki). Example: after a dealer sale, a defect that shows within 1 year is presumed to have existed at handover.
- `inspection`: the schedule, the 30-day window, the use ban after a missed deadline and the odometer record.
- `winterTyres`: needed November–March when conditions require, with at least 3.0 mm of tread; studded-tyre rules.
- `insurancePrice`: traffic insurance is mandatory; claims history moves with you; example premiums; the fee for driving uninsured.
- `vehicleTax`: the full CO2 tables (NEDC and WLTP), the mass table, motive-power tax rates, 3 worked examples and Traficom's calculator.
- `wearItems`: cost and interval for 8 items: timing belt, clutch, brake pads, brake discs, winter tyres, tyre change, tyre hotel and periodic service.
- `youngDrivers`: 13 facts on young drivers' crash risk.
- `extras`: the 7-day notice of a change of owner, KKV's used-car complaint figures and 6 sourced "ask before signing" questions.
- `meta.sources`: 26 entries.

**Sources.**
- Primary: Finlex (KSL 38/1978, Kauppalaki 355/1987, Ajoneuvolaki 82/2021, Tieliikennelaki 729/2018, Liikennevakuutuslaki 460/2016, Ajoneuvoverolaki 1281/2003); Traficom; KKV (report 1/2024); Liikenneturva (1/2026); OTI (youth report 2021).
- Secondary: AutoJerry 2026 price guide, Taloustaito (2019, 2025), Yle (2024), MTV (2025), Moottori (2022), A-Katsastus.

**Fixed by the fact-check.** About 40 claims were checked, and the key facts held.
- The new motive-power tax rates and CO2 tables apply from 1.1.2026. The act came into force on 1.1.2025, but a transition rule kept the old amounts until the end of 2025.
- The auction exception covers only a public auction that buyers can attend in person. An online-only auction most likely does not count.
- Added the legal exception for third-party rights: there is no defect if the contract says the buyer takes the car subject to that right (KSL 5:14).
- Corrected the timing-belt price quote and who imposes the uninsured fee. Removed "washing adds ~10 €", which is not on the source page.
- The old fixed December–February winter-tyre rule is confirmed as repealed. AutoJerry still states it, so do not use AutoJerry as a legal source.
- Yearly tax amounts must be rounded down to the cent, as in the act.

**Still missing or estimated.**
- All 8 wear-item costs and intervals are estimates (AutoJerry 2026, Taloustaito). Clutch life and the brake-disc interval are null. The tyre-set price may or may not include fitting, and the tyre-hotel price unit is unclear.
- The example premiums come from a magazine comparison for one 57-year-old with full bonus (Taloustaito 2025), so they are marked estimate. "Typically 165–260 € a year" is our own summary of that table.
- No published average premium for young drivers was found, and no multiplier was made up.
- No average inspection price in this file. Traficom's averages are in `traficom-inspections.json` → `inspectionPrices`.
- `inspection.reminderAlgorithm` is our reading of the law. It does not cover Traficom's rule for cars inspected 8–9 years after first use. Take due dates from `traficom-inspections.json` → `inspectionSchedule.rule`.
- No crash risk per km for young drivers. "3.6 vs 1.2 deaths per 100,000" comes from news (MTV, citing Liikenneturva).
- The tyre replacement advice (5 mm, 6 winters, 10 years) is Autoliitto's advice, not law.
- 4 items in `rights` hold our reading of a law in an `interpretation` field. The team should confirm them.
- `insurancePrice` is background for the buyer's own cost estimate. Nothing the reader infers about a user may go to pricing, underwriting or claims (AGENTS.md).

## rent-rules.json

**What it holds.** What a tenant in Finland should know, and what flats rent for.

- `deposit`, `notice`, `pipeRenovation`, `liability` and `insurance`: rules, each tied to a section of the rental act (481/1995) or another source.
- `moveIn` (14 steps) and `moveOut` (5 steps).
- `rentLevels`: 48 rows of average rent per m² a month for Turku, Helsinki, Espoo-Kauniainen, Tampere, the capital region and the whole country. Split by room count, and for all and for new tenancies.
- `rentTotals`: 6 rows of median monthly rent, with quartiles, for Turku and Helsinki by room count.
- `sources`: 23 entries.

The rental act changed on 1.10.2026 (amendment 531/2026). The landlord's notice is now 4 months after 2 years (before: 6 months after 1 year). The deposit must be returned within 14 days. Smoking is banned indoors and on the balcony unless the landlord allows it. Leases signed before 1.10.2026 keep some old rules, so the file stores both versions and the cutoff (`meta.transitional`). For an ad today, the new rules apply.

Key numbers (2026 Q3): Turku 15.64 €/m² a month, Helsinki 21.37 €/m². The median one-room flat in Turku rents for 568 € a month. The deposit is at most 3 months' rent.

**Sources.**
- Primary: Finlex (481/1995 current and earlier text, 531/2026, Pelastuslaki 379/2011); government proposal HE 33/2026; KKV / Kuluttajaneuvonta (6 pages); Kuluttajariitalautakunta (rental page and 3 decisions); FINE's insurance guide (2020); Tilastokeskus StatFin tables 15fa and 15fc (15.10.2026) with their documentation.
- Secondary: Vuokralaiset ry (2021, 2024), Taloustaito (2019).

**Fixed by the fact-check.** All 216 rent values match the live Tilastokeskus API, and the law values match Finlex word for word. Five errors were fixed:
- A wrong section number: adjusting damages and limiting loss is 6 § 3 and 4 mom.
- A misread decision: the 5 % in case 3137/83/07 was a credit to the tenants, not a fee they owed.
- The ban on "notice may start only after a set time" terms applies only to leases signed on or after 1.10.2026.
- The Consumer Disputes Board also hears cases against company landlords. A claim that a termination is invalid goes to a court.
- The board's page moved. Its rental page still shows the old notice periods, so do not use it for those.

Notes were also added. The 9.5 % late-payment interest in an example is not today's rate. One 40 % rent cut was set by the landlord, not the board.

**Still missing or estimated.**
- The rent-reduction ranges are estimates from four benchmarks in three non-binding board decisions: flat unusable 90–100 %, bathroom out of use 40–70 %, noise and dust only 10–20 %.
- How long a flat is unusable during a pipe renovation has no primary source (value null).
- Who pays for the works, and who arranges temporary housing, are interpretations.
- Whether a lease may require home insurance, and what happens if the tenant has none, are interpretations.
- The move-in tip to photograph the meters is practical advice, not from a source.
- No rents for city sub-areas (Turku 1–3, Helsinki 1–4).
- The old rent-increase rule (27 §) for older leases was not extracted.
- The FINE guide is from 2020, and cover varies by insurer. No insurer's terms or prices are included.

## sample-ads.json

**What it holds.** How six Finnish ad sites write their ads, and 12 test ads for the reader.

- `sites`: Nettiauto, Autotalli, Etuovi, Oikotie (for sale), Oikotie (for rent) and Vuokraovi. Every field label is listed in Finnish, and in English where the site has English pages. Each label has the key the reader should map it to, an example value, URL patterns and notes.
- `formats`: thousands separators, decimal marks, per-month and per-person units, dates, room words, layout abbreviations, energy classes, renovation lines and the shape of a copied page.
- `tests`: 12 synthetic ads: 4 cars, 4 flats for sale and 4 rentals. Eight are in Finnish, two are copied from a site's English pages, one is English free text, and one has Finnish labels with an English description. Each test has the text, the expected values, distractors and assumptions.
- `meta.fieldKeys`: proposed output keys and value lists.

Key observations:
- On Etuovi and Oikotie, the headline price is the debt-free price (velaton hinta). Myyntihinta + velkaosuus = velaton hinta.
- Hoitovastike + pääomavastike = the total charge. Ad texts often say "rahoitusvastike" for pääomavastike.
- Distractors are numbers the reader must not take as values. Nettiauto prints a monthly financing offer under the price. Vuokraovi shows an If home-insurance price. A whole-page copy of a Nettiauto ad includes other cars' prices, years and km.
- Some Nettiauto dealer ads add an office fee (Toimistomaksu, 60–349 € seen). Private ads have none.
- Thousands separators differ by site and field: a space, a no-break space, or none.
- Only Nettiauto and Vuokraovi have English pages. Vuokraovi's English calls a kaksio (two rooms) "1 bedroom".

**Sources.** The sites' public pages, opened on 17.10.2026 without logging in. Finlex for the energy-certificate act (50/2013).

**Fixed by the fact-check.**
- "Ei lain edellyttämää energiatodistusta" means the ad gives no energy class. It was read as "no certificate required".
- Not every dealer ad has an office fee.
- The separator rules for Nettiauto ad pages and Oikotie plot areas were wrong.
- The example for Oikotie's "Pinta-alojen lisätiedot" was wrong. That field says how the area was measured.
- Nettiauto's English "Seller" label exists. Its value includes how long the seller has been a member ("Jäsenenä 8 kuukautta"), which a parser could mistake for the car's age.
- Two unconfirmed claims, and the examples taken from search snippets, are now marked unverified.
- New parser hazards: the variant and financing lines can swap places, and Oikotie's "Muut ehdot" can hold contract terms.

**Still missing or estimated.**
- All test-ad prices, km and fees are made up. They are not market data.
- A few English labels in the tests were not seen on a site. Each test lists them under `assumptions`.
- Some Etuovi labels come only from strings in the page code, not from a rendered ad.
- The sample is small: about 30 pages on one day, mostly Turku and the capital region. Only 2 Autotalli ads were opened, both from dealers. Sites can change their labels at any time.
- No right-of-occupancy (asumisoikeus) ad was opened.
- Copying from different browsers was not tested. No-break spaces may not survive a copy.
- The output keys are a proposal, not a team decision.

## car-running-costs.json

**What it holds.** The numbers for "what will this car cost to run for two years", plus electric-car specifics and recalls. Gathered on 18 October 2026. Vehicle tax and wear items (timing belt, clutch, brakes, tyres, periodic service) are in `car-rules.json` and are not repeated.

- `energy.kmPerYear`: a national average (derived) and, by powertrain, the median km at the 2025 inspection divided by the car's age.
- `energy.fuelPrices`: petrol 95E10 and diesel, monthly, July 2025 to June 2026, with a 12-month average.
- `energy.electricityPrices`: household electricity for two consumer types, monthly, split into energy, network (transfer) and taxes, with the total.
- `energy.consumption.realWorldGapWLTP`: how far real-world consumption is above the WLTP figure, by fuel.
- `energy.fastCharging`: empty (see below).
- `electricCars.servicePrices`: periodic service for 10 electric-only makes and models.
- `electricCars.batteryHealthTest`: what a battery (SoH) test costs.
- `electricCars.batteryWarranty`: 25 rows for 20 makes; `hybridBatteryWarranty`: 10 rows for Toyota, Lexus, Suzuki, Hyundai, Kia, Honda and Citroën.
- `recalls`: how to check recalls for Finland, link patterns, licences and the verdict on a snapshot.

Key numbers:
- About 14,500 km a year per passenger car in 2025 (39,019 million km ÷ 2,696,432 cars in traffic). By powertrain, from inspections: petrol about 14,000 km a year of age at 4 years, diesel 23,200, electric 18,500, petrol plug-in hybrid 17,800.
- Petrol 95E10 cost 209 c/l and diesel 215 c/l in June 2026. The 12-month averages are 183.7 and 186.0 c/l. Prices jumped in March–June 2026.
- Household electricity, total with transfer and taxes, June 2026: 17.91 c/kWh at 5,000–15,000 kWh a year, 23.71 c/kWh at 2,500–4,999 kWh.
- Real-world consumption is 23.7 % above WLTP for petrol cars and 18.1 % for diesel (cars first registered in 2021). For plug-in hybrids it is 238 % above (petrol PHEVs).
- A periodic service for an electric car costs on average 190–219 € by model (all makes: 225 €). A garage SoH test averages 99 € (35–136 €). An AVILOO Flash test cost 100 € at one garage in March 2026.
- Battery warranty: most makes give 8 years / 160,000 km and 70 % capacity. Exceptions: Tesla S/X 240,000 km and long-range 3/Y 192,000 km; Mercedes EQE/EQS 10 years / 250,000 km; BYD 8 years / 250,000 km; MG 7 years / 150,000 km; Kia model year 2025 and older 7 years / 150,000 km. Toyota's EV-akkuturva extends to 10 years / 1,000,000 km with yearly Toyota service.
- Toyota and Lexus hybrid battery cover can be renewed yearly up to 10 years / 350,000 km with a service at the brand's workshop. Lexus's yearly hybrid check is free; Toyota publishes no price for it.

**Sources.**
- Primary: Statistics Finland StatFin tables 12ge, 13rb, 12jx and 11ie (CC BY 4.0); Traficom's statistics database table 030_kats_tau_103; the European Commission's report COM(2024) 122; each maker's or importer's Finnish warranty page (Mercedes: battery certificate PDF 02/2026); Traficom's recall pages; Safety Gate and data.europa.eu.
- Secondary: AutoJerry's price guide (prices from offers made through its platform), Moottori (24.3.2026 and 29.8.2023), and Nissan UK for the Leaf's capacity-bar rule.

**Derived (our arithmetic).** The national km a year; km per year of age; the 12-month averages. Each has a `basis`.

**Still missing.**
- No official km a year per car by fuel. The inspection-based figures are lifetime averages for cars still in use. Diesel buyers drive more to begin with, so the gap is not caused by the fuel.
- No solid source for public fast-charging prices. Operators set their own prices, so none is given.
- No official Finnish fleet-average consumption by fuel, and no official real-world gap for electric cars. Use the ad's own "yhdistetty kulutus". The WLTP gap does not apply to cars type-approved under NEDC (roughly before 2019).
- The EV service prices are AutoJerry estimates with no service interval. The AVILOO Premium price (129 €) is from 2023; AVILOO's own shop did not load.
- No capacity threshold is stated by BMW, Kia, Citroën, MG or Nissan Finland. Nissan's "fewer than 9 of 12 bars" rule is only on its UK page.
- Plug-in hybrid battery terms for BMW, Ford, Volvo, Mercedes-Benz and Renault were not confirmed on a Finnish page, so they are left out. Hyundai's 70 % may also cover hybrids, but that was not confirmed.
- Volvo's terms cover a drop below 70 % only when a manufacturing defect causes it.

## car-recalls-eu.json

**What it holds.** 3,048 EU Safety Gate alerts in the "Motor vehicles" category whose product is a passenger car, passenger van or camper van, published from 1 October 2016 to 16 October 2026. Each alert has the case number, the week, the makes, the models, type-approval numbers, the production dates, a year range, the risk, the first sentence of the danger text, the measures, the notifying country and the alert number (the link pattern is in `meta.urlPattern`).

**Why Safety Gate and not Traficom.** Traficom's recall database (takaisinkutsut.traficom.fi) is the right list for Finland, but it has no open-data release and no stated licence. It is not on Traficom's open-data page, where the vehicle register is CC BY 4.0. The site reads an undocumented JSON endpoint, and each record names a contact person at the importer. Safety Gate's weekly XML reports are listed as CC0 on data.europa.eu. The app can link to Traficom with `https://takaisinkutsut.traficom.fi/recall?keyword={model}`.

**Limits.**
- EU-wide. Safety Gate does not say whether a car was sold in Finland. Germany notified 1,826 of them and France 610; Finland none.
- Years are production dates, not Finnish first-registration years. 'years' is our parsing (51 alerts have none).
- The same recall can appear under several case numbers when more than one country notified it.
- Make names are split and normalised by us ("VW" → "Volkswagen", "Citroen, Ds" → Citroën and DS). A few alerts put a model in the brand field ("A-Class", "Sprinter"); those stay as given. Model text is Safety Gate's, cut at 200 characters.
- Safety Gate's pictures are not copied, since they may carry third-party rights.

**Rebuild.** `node apps/what-if/tools/recalls-snapshot.mjs CACHE_DIR` downloads the weekly reports it does not have yet (about 100 MB for ten years) and rewrites the file.

## rent-areas.json

**What it holds.** Average rents per m² a month (keskineliövuokra) for privately financed (vapaarahoitteinen) rental flats, with the number of observations.

- `municipalities`: the 27 municipalities in table 15fa (Espoo and Kauniainen together), by rooms `1`, `2`, `3+` and `all`, for the latest quarter (2026Q3 when fetched). Each cell also has `eurPerM2New` and `obsNew`, new leases only, the closer comparison for an ad's asking rent.
- `postcodes`: the 473 postal code areas in table 13eb with at least one room group, by rooms `1`, `2`, `3+`, for 2025Q4. Statistics Finland moved 13eb to its archive database when it renewed the statistic in 2026, so 2025Q4 is the latest by postcode. Cells under 20 observations would be dropped; Statistics Finland publishes none.

**How the page uses it.** A rental's rent per m² against the same number of rooms in the ad's postcode; with no postcode or no row, against new leases of that size in the municipality. Statistics Finland counts separately paid water and heating as rent, so the page says when the ad's water fee comes on top.

**Sources.** Statistics Finland, Rents of dwellings: StatFin tables 15fa and 13eb through the PxWeb API (CC BY 4.0). Refresh with `node apps/what-if/tools/fetch-rent-areas.mjs` (a few small requests, free).

## flat-checks.json

**What it holds.** One block per question the ad's words raise, each with a `source` id:

- `plotLease`: the City of Helsinki's rule for renewed residential plot leases (yearly rent 4 % of the plot's calculated value, phased in over 10 years, 50 % in the first year of the city's example, never below the old rent; old rents have stayed very low), and Yle 5.8.2026 (secondary: municipalities have raised some plot rents up to tenfold; a Kuopio company's rose sixfold, from about €6,000 to €36,000 a year).
- `energy`: the Energy Performance Certificate Act 50/2013 (6 §: a valid certificate on show at a viewing, a copy to the buyer or tenant, the class in the ad; 8 §: valid ten years at most; 9 §: the class places the building's E-value on the scale for its type) and Decree 1048/2017 (in force 1.1.2018; the subscript 2018, or 2013 and 2007 for older certificates).
- `oilHeating`: the Ministry of the Environment, 20.4.2021: the aim is to give up oil heating by the early 2030s; existing oil heating is not banned.
- `moisture`, `companyLoans`, `conditionSurvey`: facts already checked in `housing-rules.json` and `rent-rules.json` (FINE, AOYL 6:3 § and 7:27 §, VNa 130/2001 8 §, Residential Leases Act 23 § and 63 §).

**Still missing.** No plot rent rule from a municipality other than Helsinki; no national figure for how much plot rents rise at renewal. Energy class limits (kWh/m² a year by building type) are not in the file.

## house-rules.json

**What it holds.** The facts for a house or cottage sold as real estate (kiinteistö), gathered and checked on 18 October 2026 from the sources' own texts: every `quoteFi` was matched word for word against the downloaded text.

- `landCode`: Maakaari 540/1995 chapter 2: the quality defect and the hidden defect (2:17 § 1 mom. 5 kohta), the seller's information (2:17, 2:20), the buyer's duty to inspect (2:22), notice within a reasonable time and at most 5 years from possession (2:25), remedies.
- `transferTax`: 3 % for a property, paid by the buyer, due at the latest when title is applied for; the first-home exemption ended 1.1.2024. `titleRegistration`: within 6 months, fee 172 € in 2026.
- `propertyTax`: the legal ranges and vero.fi's 2026 rates by municipality. The taxable value is not in an ad, so the app links to the rates.
- `wastewater`: the basic treatment requirement (YSL 154 b §), the 31.10.2019 deadline within 100 m of water or in a groundwater area, the renovation triggers elsewhere (156 b §, amended 900/2024), exemptions that lapse with a new owner (156 d §), the age exemption (238 §), the system documents (157 §). `municipalNetwork`: Vesihuoltolaki 10–11 §.
- `cottage`: change of use (Rakentamislaki 42 §), private roads (Yksityistielaki), the energy certificate and its holiday-home exemption.
- `conditionInspection`: what it is (KKV), and nine published prices from three firms; `rangeEur` 895–1,910 € is derived (lowest and highest).
- `riskStructures`: false plinth (1960s–80s), crawl space (1940s–50s), flat roof (1970s), slab with insulation on top (1940s–80s, about 40 years), basement walls insulated inside, from the Ministry of the Environment's Kosteus- ja hometalkoot checklists by decade.
- `radon`: 300 and 200 Bq/m³ (STM 1044/2018), how STUK says to measure (at least 2 months, September to May), STUK's price 86.60 €, drilled wells.
- `oilHeating`: tank inspections (Tukes; If's own 10-year rule), who pays for a leak, Motiva's 2024 switching examples (ground-source 23,000–26,000 €, air-to-water 17,000–18,000 €), the closed 2026 grant.
- `well`, `lifetimes` (drains 40–50 years; roofs: felt 25–35, sheet metal 40–60, tile about 45), `insurance` (fire, leak with the pipe-age deduction, storm, flood, frost, the empty-building rule, exclusions, and one seller's hidden-defect insurance), `electricity` (13rb band over 15,000 kWh, 14.892 c/kWh in June 2026; light fuel oil 167 c/l from 12ge).

**Secondary.** The condition inspection prices (Sustera, JEP Tarkastus, Satpa), that RT 103996 replaced KH 90-00394, the 3–5-year well interval (a laboratory), and the hidden-defect insurance (Sustera's product page).

**Still missing.** No lifetime for a house's sewer pipes; no wind speed for "myrskytuuli" in If's terms; no national rule on emptying a holding tank (municipal regulations); THL's well page did not load; STUK's 1,000 Bq/l for well water is quoted through Vantaa; the oil fund's own site did not resolve (its conditions are from the Ministry of the Environment's 2017 guide); that signs of moisture deepen the buyer's duty to inspect is case law, not opened.

## radon-municipalities.json

**What it holds.** STUK's table "Pientalojen radonpitoisuudet kunnittain" (radontilasto_pientalot_kunta_ja_koko_suomi_2023.xlsx, created April 2024, the latest STUK links): small-house dwellings measured 1980–2023, one value per dwelling (the highest), the annual average as STUK computes it (a September–May measurement × 0.9). 308 municipalities; 301 with an average and 276 with shares. Whole numbers as STUK rounds them.

**Read with care.** Measured houses are not a random sample: the national row is 228 Bq/m³ with 19 % above 300, against STUK's about 94 Bq/m³ for all homes. STUK says one home's radon can be known only by measuring. Municipalities with under 10 measured dwellings have no figures, and those with 10–29 have no shares. Pertunmaa (merged into Mäntyharju on 1.1.2025) is kept apart, as STUK lists it.

**Licence.** None stated on the page or in the file; STUK's open-data page uses CC BY 4.0 for its datasets, but this table isn't listed there. Attribute STUK.

## flood-risk-areas.json

**What it holds.** The 18 significant flood risk areas (merkittävät tulvariskialueet) the Ministry of Agriculture and Forestry named on 19.12.2024 under the Act on Flood Risk Management 620/2010 (14 river, 4 coastal; none for stormwater), from SYKE's open data (attributes only, CC BY 4.0, "Lähde: Syke, ELY-keskukset"). Four 2018 areas were dropped: the Loviisa coast, Riihimäki, Lapua and Kemijärvi.

**Our step.** SYKE's data has no municipality field. The municipalities are our overlay of SYKE's polygons on Statistics Finland's 2026 boundaries (1:1,000,000): a municipality is listed if it holds the largest part of the area or more than 1 km² lies over 1 km inside it; small slivers are listed in `meta.notes`. An area covers part of a municipality at most, so the app says "part of" and links to the flood map, never that an address is at risk.

## What the reader can rely on

- All Traficom inspection numbers: counts, rejection %, km and causes. A second check matched them to Traficom's own tables.
- The inspection schedule in `traficom-inspections.json` → `inspectionSchedule`: 4 years, then every 2 years, then yearly once the car is over 10, plus the 8–9-year case.
- Pipe renovation costs from Isännöintiliitto: 890 €/m² national median (2026), 1,000 €/m² in the capital region, 650–1,154 €/m² for the middle half (2025), and 143–248 €/m² for water pipes only.
- Facade and balcony life by building year (RT 103765, 2025).
- Law quoted from Finlex with section numbers: the buyer's documents and the debt-free price, the asbestos survey, dealer and private car sales, winter tyres, traffic insurance, vehicle tax, and the rental act with the 1.10.2026 changes.
- Vehicle tax: every table value equals the act. Round yearly amounts down to the cent.
- Leak damage in 2021: 34,800 damages and 171 M€ paid (Finanssiala, the latest public figure).
- Rent levels and rent totals for 2026 Q3 from Tilastokeskus. All 216 values match the live API.
- Consumer Disputes Board decisions as single cases (90 %, 15 %, 70 % and 40 % rent cuts) and its 20 €/hour rate for a landlord's own work.
- KKV's used-car complaint figures, and Liikenneturva's and OTI's figures on young drivers.
- What the ad sites show: labels, price sums and distractors, as seen on 17.10.2026.
- Fuel and household electricity prices, monthly to June 2026 (Statistics Finland), and passenger-car km and fleet counts for 2025.
- The WLTP real-world gap by fuel (European Commission, COM(2024) 122).
- Battery and hybrid-battery warranties as each maker states them on its Finnish page on 18.10.2026, each with a quote.
- The Safety Gate alerts, as published (except the parsed years and normalised makes).

## Labelled estimates

Show these with their basis, or leave them out.

- Inspection prices: that they include VAT and are passenger-car prices.
- Our own fields in the Traficom file: `ageYears` and the English labels.
- Renovation costs per flat m² for facade, balconies, roof, windows, elevator and drains. The facade range has two conflicting conversions.
- Life values for drains, roof, windows, elevator and electrical. The 50-year pipe life is secondary.
- The 6 housing `proposedRules` thresholds.
- All 8 car wear-item costs and intervals.
- Example insurance premiums, the "typical 165–260 €" range and the insurance pricing factors.
- Deaths per 100,000 for drivers aged 21–24 (from news).
- Tyre replacement advice (5 mm, 6 winters, 10 years).
- The car inspection reminder algorithm and the 4 `interpretation` items in `car-rules.json`.
- Rent-reduction ranges, how long a flat is unusable, who pays for the works, who arranges housing, and the home-insurance interpretations.
- Every value in the 12 test ads, and the search-snippet examples in `sample-ads.json`.
- `car-running-costs.json`: the national km a year and the km per year of age (derived), the 12-month price averages (derived), the electric-car service and battery-test prices (AutoJerry, Moottori), and the Nissan capacity-bar rule (UK page).

## Needs a team decision

AGENTS.md makes these team decisions. Record each one in DECISIONS.md.

- Where the files live. AGENTS.md puts data in the repo-level `data/` folder. These files are in `apps/what-if/data` because the task asked for that path.
- Thresholds: the housing `proposedRules`, when rent per m² counts as "expensive", and whether to show any young-driver premium. The page now ranks a price or rent 10 % above the area's average as a question about it, and calls under 20 sales a small sample (see the suggested decision for flats).
- Whether to show the rent-reduction ranges.
- The output keys and value lists in `sample-ads.json` → `meta.fieldKeys`.
- Four readings of car law: a dealer's general "as is" clause, the private buyer's burden of proof, online auctions, and the "normal wear" example for the 1-year presumption.
- Energy cost: which km a year (national or by powertrain), which price (latest month or 12-month average), and whether to apply the WLTP gap to an ad's consumption.
- Recalls: whether to ship the EU Safety Gate snapshot, link to Traficom's search, or both, and whether to ask Traficom for permission to reuse its recall database.
