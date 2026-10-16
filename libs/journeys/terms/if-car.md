# If, car insurance: what the first-car journey relies on

Paraphrased from If's public documents, read 2026-10-17.

## Liikennevakuutusehdot, Ehto LII 601.20, in force from 1.1.2023

Source: https://www.if.fi/globalassets/fi/pdf/ehdot/liikennevakuutusehdot.pdf

| Clause | What it says (paraphrase) | Used by journey item |
|--------|---------------------------|----------------------|
| 7 Vakuutussopimuksen voimassaoloaika | The first insurance period is at most 13 months, later ones a year. The contract lasts until the owner's or holder's duty to insure the vehicle ends or the policyholder cancels it. It is in force even if the premium is unpaid. | `traffic-insurance` |
| 9.2 | When the home address in the population register changes, the price changes to match the new address. | `traffic-insurance` |

## Kaskovakuutusehdot, Ehto AUT 640.35, in force from 23.5.2026

Source: https://www.if.fi/globalassets/fi/pdf/ehdot/kaskovakuutusehdot.pdf

| Clause | What it says (paraphrase) | Used by journey item |
|--------|---------------------------|----------------------|
| 4 Vakuutusturvien yleiset rajoitukset | If the keys were taken without a break-in or robbery, the damage is paid only when the keys were obtained by breaking in or robbery. Keys or key replacements left inside the vehicle or lost are also a limit in the towing and travel-cost covers (3.6.3). | `car-keys` |

## Inspection

The inspection rule is not in If's terms. It is Traficom's: see `libs/opendata/src/traficom.ts` and https://traficom.fi/fi/autoilijat/katsastus/katsastusajankohdat-ajoneuvoluokittain (checked 2026-10-17): first inspection within four years of commissioning, then within two years of the previous one, yearly after ten years.

Used by: `traffic-insurance`, `car-keys`, `inspection`.
