# If, home insurance: what the move journey relies on

Paraphrased from If's public documents, read 2026-10-17. Check the source before relying on a figure; terms change at the turn of the insurance period.

## Kodin omaisuusvakuutusehdot, Ehto OMA 200.27, in force from 1.1.2026

Source: https://www.if.fi/globalassets/fi/pdf/ehdot/kotivakuutusehdot.pdf (the terms page lists it as "Kotivakuutusehdot")

| Clause | What it says (paraphrase) | Used by journey item |
|--------|---------------------------|----------------------|
| 1 Vakuutetut ja vakuutuksen voimassaolo | Insured are the policyholder and the people who live permanently in the household; the registered address in the population register is normally taken as the place of residence. Each item is insured at the insured place named in the policy and temporarily worldwide, for at most one year. Property that the insured knows will be away from the insured place for over a year stays insured only three months from the day it was moved. | `insurance-move` (why the address on the policy matters); not the source of the 3-month move cover, see below |
| 5.1 (3) Omaisuuden turvallinen käyttö ja säilytys | Keys must not be left or hidden near the home or storage, and must not carry name and address. The lock must be changed or re-keyed at once if a key has come into outsiders' hands. | `locks` |
| 5.5 (1) Vuotovahinkojen torjunta | In the cold season the building must be heated enough. | `empty-home` |
| 5.5 (2) | If the building is left without enough base heating in the cold season, the plumbing and fixtures must be drained, the water-meter space kept warm, and the heating checked at least once a week. | `empty-home` |
| 5.5 (3) | If the building stands uninhabited for over a week, the main shut-off valve inside must be closed and the pump switched off. | `empty-home`, `long-trip-home` |
| 5.5 (8) | A leak tray must go under the washing machine and cold appliances where there is no floor drain or the leak would not show at once. | `new-home-safety` |
| 6.1.1 Välitön esinevahinko | The cost of changing or re-keying a lock is paid as damage-prevention cost only if the key came into someone else's hands in a theft, robbery or break-in and the risk clearly rose as a result. | `locks` |

## The three-month move cover is on If's website, not in the terms

The terms above contain no "covered in both homes during a move" clause (checked by reading the full text). The rule comes from If's web pages:

- Page: https://www.if.fi/henkiloasiakkaat/vakuutukset/kotivakuutus/muuttaminen
  - The policy does not move to the new address by itself; the customer moves it in Omat sivut or by phone.
  - If the contents are insured at If, the policy covers both the old and the new home for three months, including surfaces and fixtures of both flats. Laaja kotivakuutus also covers things that break during the move.
- Page: https://www.if.fi/henkiloasiakkaat/vakuutukset/kotivakuutus/muuttaminen/muuttajan-muistilista
  - Electricity: end the old contract and make the new one about two weeks before the move.
  - Move notification to Posti and the register office: within a week after the move, at the earliest a month before.
  - Moving into a detached house: the insurance change is made by calling customer service.
  - After the move: working smoke alarms, leak trays under the dishwasher and cold appliances, check outer-door locks and order re-keying if needed.

Used by: `insurance-move`, `electricity`, `new-home-safety`, `locks`, `compare-if`.
