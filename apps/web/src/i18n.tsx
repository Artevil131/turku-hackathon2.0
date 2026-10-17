import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

const en = {
  appName: "Ahead",
  tagline: "Help before something goes wrong. Everything is read on this phone and stays on it.",
  "nav.home": "Home",
  "nav.ledger": "Ledger",
  "nav.sources": "Sources",
  "lang.toggle": "Suomeksi",
  "onboarding.title": "What may Ahead look at?",
  "onboarding.lead": "Everything is off. Turn on only what you want. You can change this any time.",
  "onboarding.continue": "Continue",
  "sources.title": "Sources",
  "source.calendar": "Calendar",
  "source.mail": "Mail",
  "source.bank": "Bank",
  "source.places": "Places",
  "source.photos": "Photos",
  "source.notifications": "Notifications",
  "source.calendar.what": "Titles and dates of events. Stays on this phone.",
  "source.mail.what": "Subjects and a short start of each message, never attachments. Stays on this phone.",
  "source.bank.what": "Merchant names and amount bands, never account numbers. Stays on this phone.",
  "source.places.what": "Place names you searched or saved, no tracks. Stays on this phone.",
  "source.photos.what": "Dates and places of photos only, never the pictures. Stays on this phone.",
  "source.notifications.what": "Short text of notifications (Android only). Stays on this phone.",
  "source.health": "Health",
  "source.health.what": "Never read. Health, religion, politics and similar data are not used, not even on this phone.",
  "consent.mail.title": "Connect mail (demo)",
  "consent.bank.title": "Bank consent (demo)",
  "consent.body": "This is a mock of the sign-in sheet. In the demo, the phone uses synthetic data and nothing is sent anywhere.",
  "consent.allow": "Allow",
  "consent.cancel": "Cancel",
  "home.empty": "Nothing coming up. Last checked today.",
  "home.neverChecked": "Nothing coming up. Not checked yet.",
  "home.check": "Check now",
  "home.checking": "Checking…",
  "home.noSources": "Turn on at least one source to let Ahead check.",
  "home.loadingModel": "Loading the on-device model, {pct}%. This happens once.",
  "home.failed": "The check failed: {reason}",
  "home.pending": "Needs your answer",
  "home.journeys": "Your journeys",
  "notice.removed": "Removed from the evidence",
  "notice.basis": "Based on {items} items from {sources} sources",
  "journey.back": "Back",
  "journey.source": "Source",
  "journey.open": "Open",
  "journey.due": "By {date}",
  "journey.share": "Nothing is shared with If unless you choose to.",
  "journey.none": "No journey for this event yet.",
  "kind.todo": "To do",
  "kind.warning": "Warning",
  "kind.insurance": "Insurance",
  "kind.compare": "Compare",
  "kind.info": "Info",
  "ledger.title": "Ledger",
  "ledger.lead": "Every event this phone ever inferred, and what was shared.",
  "ledger.empty": "No events yet.",
  "ledger.shared": "Shared: {answer}",
  "ledger.no": "no",
  "ledger.yes": "yes",
  "ledger.erase": "Erase everything",
  "ledger.eraseConfirm": "Erase all events, journeys and settings from this phone?",
  "status.pending": "Waiting for you",
  "status.confirmed": "Confirmed",
  "status.dismissed": "Not now",
  "status.never": "Never",
  "net.label": "Data leaving this phone",
  "net.requests": "{n} requests",
  "net.one": "1 request",
} as const;

export type Key = keyof typeof en;
export type Locale = "en" | "fi";

const fi: Record<Key, string> = {
  appName: "Ahead",
  tagline: "Apua ennen kuin mikään menee pieleen. Kaikki luetaan tällä puhelimella ja pysyy sillä.",
  "nav.home": "Koti",
  "nav.ledger": "Loki",
  "nav.sources": "Lähteet",
  "lang.toggle": "In English",
  "onboarding.title": "Mitä Ahead saa katsoa?",
  "onboarding.lead": "Kaikki on pois päältä. Kytke päälle vain se, minkä haluat. Voit muuttaa valintoja milloin vain.",
  "onboarding.continue": "Jatka",
  "sources.title": "Lähteet",
  "source.calendar": "Kalenteri",
  "source.mail": "Sähköposti",
  "source.bank": "Pankki",
  "source.places": "Paikat",
  "source.photos": "Kuvat",
  "source.notifications": "Ilmoitukset",
  "source.calendar.what": "Tapahtumien otsikot ja päivät. Pysyy tällä puhelimella.",
  "source.mail.what": "Viestien otsikot ja lyhyt alku, ei liitteitä. Pysyy tällä puhelimella.",
  "source.bank.what": "Kauppiaiden nimet ja summaluokat, ei tilinumeroita. Pysyy tällä puhelimella.",
  "source.places.what": "Hakemasi tai tallentamasi paikkojen nimet, ei reittejä. Pysyy tällä puhelimella.",
  "source.photos.what": "Vain kuvien päivät ja paikat, ei kuvia. Pysyy tällä puhelimella.",
  "source.notifications.what": "Ilmoitusten lyhyt teksti (vain Android). Pysyy tällä puhelimella.",
  "source.health": "Terveys",
  "source.health.what": "Ei koskaan luettu. Terveys-, uskonto-, politiikka- ja vastaavia tietoja ei käytetä edes tällä puhelimella.",
  "consent.mail.title": "Yhdistä sähköposti (demo)",
  "consent.bank.title": "Pankin suostumus (demo)",
  "consent.body": "Tämä on kirjautumisikkunan malli. Demossa puhelin käyttää synteettistä dataa eikä mitään lähetetä minnekään.",
  "consent.allow": "Salli",
  "consent.cancel": "Peruuta",
  "home.empty": "Ei tulossa mitään. Tarkistettu tänään.",
  "home.neverChecked": "Ei tulossa mitään. Ei vielä tarkistettu.",
  "home.check": "Tarkista nyt",
  "home.checking": "Tarkistetaan…",
  "home.noSources": "Kytke päälle ainakin yksi lähde, jotta Ahead voi tarkistaa.",
  "home.loadingModel": "Ladataan laitteella toimivaa mallia, {pct} %. Tämä tapahtuu kerran.",
  "home.failed": "Tarkistus epäonnistui: {reason}",
  "home.pending": "Odottaa vastaustasi",
  "home.journeys": "Polkusi",
  "notice.removed": "Poistettu perusteista",
  "notice.basis": "Perustuu {items} kohteeseen {sources} lähteestä",
  "journey.back": "Takaisin",
  "journey.source": "Lähde",
  "journey.open": "Avaa",
  "journey.due": "Viimeistään {date}",
  "journey.share": "Ifille ei jaeta mitään ellet itse valitse niin.",
  "journey.none": "Tälle tapahtumalle ei ole vielä polkua.",
  "kind.todo": "Tehtävä",
  "kind.warning": "Varoitus",
  "kind.insurance": "Vakuutus",
  "kind.compare": "Vertaa",
  "kind.info": "Tieto",
  "ledger.title": "Loki",
  "ledger.lead": "Kaikki tapahtumat, jotka puhelin on päätellyt, ja mitä on jaettu.",
  "ledger.empty": "Ei vielä tapahtumia.",
  "ledger.shared": "Jaettu: {answer}",
  "ledger.no": "ei",
  "ledger.yes": "kyllä",
  "ledger.erase": "Poista kaikki",
  "ledger.eraseConfirm": "Poistetaanko kaikki tapahtumat, polut ja asetukset tältä puhelimelta?",
  "status.pending": "Odottaa sinua",
  "status.confirmed": "Vahvistettu",
  "status.dismissed": "Ei nyt",
  "status.never": "Ei koskaan",
  "net.label": "Puhelimesta lähtenyt data",
  "net.requests": "{n} pyyntöä",
  "net.one": "1 pyyntö",
};

const dict: Record<Locale, Record<Key, string>> = { en, fi };

export type T = (key: Key, vars?: Record<string, string | number>) => string;

interface I18n {
  locale: Locale;
  setLocale(l: Locale): void;
  t: T;
}

const Ctx = createContext<I18n | null>(null);

function readLocale(): Locale {
  try {
    const v = localStorage.getItem("ahead.locale");
    if (v === "fi" || v === "en") return v;
  } catch {}
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale);
  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale(l) {
        setLocaleState(l);
        try {
          localStorage.setItem("ahead.locale", l);
        } catch {}
        document.documentElement.lang = l;
      },
      t(key, vars) {
        let s = dict[locale][key];
        for (const [k, v] of Object.entries(vars ?? {})) s = s.replaceAll(`{${k}}`, String(v));
        return s;
      },
    }),
    [locale],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("I18nProvider missing");
  return v;
}

export function formatDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).toLocaleDateString(locale === "fi" ? "fi-FI" : "en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
