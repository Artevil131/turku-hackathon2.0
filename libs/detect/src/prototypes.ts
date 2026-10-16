// Prototype sentences per life event, Finnish and English, written the way
// the signal appears on a phone: a mail subject, a calendar title, a
// merchant. `ordinary` are sentences for life when nothing is happening;
// a snippet counts for an event only when it is closer to that event than
// to ordinary life (D-008, as revised after the first embedding smoke test).

import type { EventType } from "@ahead/contract";

export const prototypes: Record<EventType, readonly string[]> = {
  move: [
    "Vuokrasopimus uuteen asuntoon",
    "Allekirjoitin vuokrasopimuksen, vuokrasuhde alkaa",
    "Asuntohakemus hyväksytty",
    "Muuttopäivä, muutto uuteen kotiin",
    "Muuttoauto varattu",
    "Maksu muuttofirmalle",
    "Sähkösopimus uuteen osoitteeseen",
    "Vanhan asunnon irtisanomisilmoitus",
    "Muuttoilmoitus DVV",
    "Signed a lease for a new apartment",
    "Moving day, moving to a new home in another city",
    "Booked movers for the move",
    "Electricity contract for the new address",
  ],
  first_car: [
    "Käytetyn auton hakuvahti, uusia autoja myynnissä",
    "Auton hintapyyntö autoliikkeestä",
    "Koeajo autoliikkeessä",
    "Ensimmäisen auton vakuutus",
    "Auton omistajanvaihdos rekisteröity",
    "Katsastusaika varattu",
    "Used car listing, Toyota for sale",
    "Test drive at the car dealer",
    "Buying my first car",
    "Car insurance quote for a new car",
  ],
  long_trip: [
    "Lentovaraus vahvistettu, lento ulkomaille",
    "Vaihto-opiskelu ulkomailla ensi keväänä",
    "Erasmus-nimitys vahvistettu",
    "Majoitusvaraus ulkomailla useaksi kuukaudeksi",
    "Flight booking confirmation to another country",
    "Exchange semester abroad, nomination confirmed",
    "Learning agreement for exchange studies",
    "Long trip abroad for several months",
    "Payment to an airline",
  ],
  child: [
    "Neuvolan ensikäynti, raskaus",
    "Äitiyspakkaus tilattu",
    "Ultraäänitutkimus neuvolassa",
    "Vauvan tarvikkeet, turvakaukalo",
    "Expecting a baby, maternity clinic appointment",
    "Ordered a baby box and a car seat",
  ],
  pet: [
    "Koiranpentu luovutus kasvattajalta",
    "Haetaan kissanpentu",
    "Eläinlääkärin ensikäynti pennulle",
    "Lemmikkitarvikkeita, pentupaketti",
    "Picking up a puppy from the breeder",
    "Adopting a kitten from the shelter",
  ],
  renovation: [
    "Tarjous kylpyhuoneremontista",
    "Muutostyöilmoitus taloyhtiölle, märkätilaremontti",
    "Rautakauppa, remonttitarvikkeet",
    "Remonttipalaveri urakoitsijan kanssa",
    "Keittiöremontti alkaa",
    "Quote for a bathroom renovation",
    "Meeting with the contractor about the renovation",
    "Hardware store purchase for the renovation",
  ],
};

export const ordinary: readonly string[] = [
  "Kurssin tenttitulokset",
  "Luento siirtyy",
  "Viikkotiedote, uutiskirje",
  "Tilauksesi on toimitettu",
  "Laskusi on saapunut",
  "Ruokakauppa",
  "Kahvila",
  "Bussilippu",
  "Sali, treenit",
  "Kahvit kaverin kanssa",
  "Synttärit",
  "Tiimipalaveri",
  "Päiväkodin kuukausikirje",
  "Taloyhtiön tiedote",
  "Huoltoasema",
  "Photo at home",
  "Your weekly digest",
  "Streaming subscription",
  "Receipt from a food delivery",
  "Grocery store",
];
