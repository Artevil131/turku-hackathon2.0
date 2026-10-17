# Insights benchmark

Runs the on-device analyses (`@ahead/insights`, the `Analyst` interface in
`libs/contract/src/insights.ts`) with the real embedding model over one
synthetic phone (`data/synthetic`, DATA.md §2), as the app would on the
demo day: the detector first, then the move's timeline (the detector
replayed day by day over the 60-day window), its contributions per source,
the month's novelty (the last 30 days against the 30 before) and the
90-day horizon with the cross insights.

    node benchmarks/insights/run.ts                       # student, 2026-10-17, example FMI warnings
    node benchmarks/insights/run.ts --persona family --today 2026-10-17 --fmi live

Every snippet is embedded once: the detector's cache serves the replay and
the analyses. The timeline's first days reach back to snippets older than
today's window, so those are embedded by the replay, not twice.

## Result, 2026-10-17 (student, e5, example warnings)

The move fires on 3 October, 29 days before the lease starts, and mail
carries two thirds of its score; the month's novelty is the move, the car
and Lisbon by every measure (new senders, new merchants and places, the
eight most novel topics), while the k-means clusters with k = 5 split the
month by kind of item (notifications, groceries, campus) and no cluster's
mean margin over ordinary life is positive, so all five are labelled by
their words. The horizon finds the lease gap (31 October to 1 November),
the example frost warning on the move week and 140 days of empty home
during the exchange; there is no bank change point, so no spend-shift, and
no two events share a month.

```
student on 2026-10-17: 551 snippets on the phone, 3 events (30313 ms including model load)
  move 2026-11-01 Turku score 13.876
  long_trip 2027-01-10 Lisbon score 13.691
  first_car 2026-10-18 Oulu score 13.628

== Timeline: move (30319 ms)
window 2026-08-18..2026-10-17, threshold 2.5, first fired 2026-10-03, today 13.876
  2026-08-18    1.06  
  2026-08-19    1.03  
  2026-08-20    1.01  
  2026-08-21    0.99  
  2026-08-22    0.96  
  2026-08-23    0.94  
  2026-08-24    0.92  
  2026-08-25    0.90  
  2026-08-26    0.88  
  2026-08-27    0.86  
  2026-08-28    0.84  
  2026-08-29    0.82  
  2026-08-30    0.80  
  2026-08-31    0.78  
  2026-09-01    0.77  
  2026-09-02    0.75  
  2026-09-03    0.73  
  2026-09-04    0.71  
  2026-09-05    2.13  
  2026-09-06    2.08  
  2026-09-07    2.03  
  2026-09-08    1.99  
  2026-09-09    1.94  
  2026-09-10    1.90  
  2026-09-11    1.85  
  2026-09-12    1.81  
  2026-09-13    1.77  
  2026-09-14    1.73  
  2026-09-15    1.69  
  2026-09-16    1.65  
  2026-09-17    1.61  
  2026-09-18    1.57  
  2026-09-19    1.54  
  2026-09-20    1.50  
  2026-09-21    1.47  
  2026-09-22    1.44  
  2026-09-23    1.40  
  2026-09-24    1.37  
  2026-09-25    1.34  
  2026-09-26    1.31  
  2026-09-27    1.28  
  2026-09-28    2.04  
  2026-09-29    2.00  
  2026-09-30    1.95  
  2026-10-01    1.91  
  2026-10-02    1.86  
  2026-10-03    3.53  fired
  2026-10-04    3.45  fired
  2026-10-05    3.37  fired
  2026-10-06    3.29  fired
  2026-10-07    3.21  fired
  2026-10-08    3.14  fired
  2026-10-09    5.39  fired
  2026-10-10    5.29  fired
  2026-10-11    5.20  fired
  2026-10-12    6.69  fired
  2026-10-13    6.56  fired
  2026-10-14    7.39  fired
  2026-10-15    8.57  fired
  2026-10-16   14.18  fired
  2026-10-17   13.88  fired
signals:
   1.13  calendar  2026-08-15  Matin muuttoapu
   1.43  mail      2026-09-05  Isä kysyy: tuleeko Saran uusi auto tällä viikolla?
   0.79  mail      2026-09-28  Asuntohakemuksesi on vastaanotettu – TYS
   1.71  wifi      2026-10-03  Liityit verkkoon TYS-Guest
   1.29  mail      2026-10-09  Vuokrasopimus allekirjoitettavaksi – Yo-kylä 12 B 7, Turku. Hei 
   1.59  mail      2026-10-12  Tilausvahvistus: sähkösopimus, Yo-kylä 12 B 7, Turku, alkaen 1.1
   0.95  bank      2026-10-14  Muuttopalvelu Siirto Oy
   1.61  mail      2026-10-15  Vahvistus: muuttoauto varattu la 31.10.
   0.89  mail      2026-10-16  Irtisanomisilmoitus vastaanotettu – PSOAS, vuokrasuhde päättyy 3
   2.51  sms       2026-10-16  Siirto Oy: Muuttoauto tulossa la 31.10. klo 9. Kuljettaja soitta
   2.38  sms       2026-10-16  DVV/Posti: Muuttoilmoituksesi on käsitelty. Uusi osoite on voima
   1.03  calendar  2026-11-01  Muutto Turkuun 🚚

== Contributions: move-2026-09-05 (42480 ms)
  mail      total   7.60  n  6  strongest: Vahvistus: muuttoauto varattu la 31.10.
  sms       total   4.89  n  2  strongest: Siirto Oy: Muuttoauto tulossa la 31.10. klo 9. Kuljettaja so
  wifi      total   1.71  n  1  strongest: Liityit verkkoon TYS-Guest
  calendar  total   1.03  n  1  strongest: Muutto Turkuun 🚚
  bank      total   0.95  n  1  strongest: Muuttopalvelu Siirto Oy

== Novelty 2026-09-18..2026-10-17 (51445 ms)
new senders:   University of Oulu, TYS, Nettiauto, dealer, Turku Energia, Finnair, Siirto Oy, PSOAS, If
new merchants: Prisma Linnanmaa, Spotify, Lidl Linnanmaa, Waltti, Onnibus, Finnair, Muuttopalvelu Siirto Oy
new places:    Turku, Yo-kylä, Autotalo Laakkonen, Oulu
new topics (distance from the previous 30 days):
   0.18  mail      2026-10-15  Learning Agreement signed – Erasmus+ spring 2027
   0.18  mail      2026-09-20  Nomination confirmed: Erasmus+ exchange, Universidade de Lisboa,
   0.18  mail      2026-10-11  Autosi hintapyyntö: Toyota Yaris 1.33 2014 – Autotalo Laakkonen
   0.17  mail      2026-10-02  Nettiauto: uusia hakuvahtiosumia – Toyota Yaris 2014, 6 900 €
   0.17  sms       2026-10-13  Finnair: Your booking AY1741 HEL–LIS 10 Jan is confirmed. Check-
   0.16  mail      2026-10-06  Nettiauto: uusia hakuvahtiosumia – Skoda Fabia 2015, 7 400 €
   0.16  mail      2026-10-13  Your booking confirmation AY1741 Helsinki–Lisbon 10 Jan 2027
   0.16  mail      2026-10-12  Tilausvahvistus: sähkösopimus, Yo-kylä 12 B 7, Turku, alkaen 1.1
recurring:
  bank      S-Market Linnanmaa       every 26 d  x3  last 2026-10-11
  wifi      Liityit verkkoon Yliopisto-Guest every 20 d  x3  last 2026-10-12
  bank      Kahvila Sirius           every 19 d  x3  last 2026-10-12  changed
  bank      Prisma Kaijonharju       every 16 d  x4  last 2026-10-17
  bank      K-Market Linnanmaa       every 13 d  x5  last 2026-10-08
  places    K-Market Keskusta        every 13 d  x3  last 2026-10-02
  bank      K-Market Keskusta        every 12 d  x5  last 2026-10-14  changed
  places    K-Market Kaijonharju     every 11 d  x5  last 2026-10-14
  bank      Prisma Keskusta          every  8 d  x5  last 2026-10-12
  places    K-Market Linnanmaa       every  8 d  x3  last 2026-09-16  stopped
  bank      Waltti                   every  8 d  x3  last 2026-10-14
  bank      Espresso House           every  7 d  x6  last 2026-10-13
  bank      VR                       every  7 d  x5  last 2026-09-27  stopped
  mail      official                 every  7 d  x4  last 2026-09-30  stopped
  mail      shop                     every  6 d  x10  last 2026-10-16
  mail      Peppi                    every  5 d  x13  last 2026-10-12
  wifi      Liityit verkkoon eduroam every  5 d  x11  last 2026-10-16
  bank      Lidl Tuira               every  5 d  x8  last 2026-10-16
  places    Sali                     every  4 d  x15  last 2026-10-17
  places    Kirjasto                 every  4 d  x10  last 2026-10-17
  places    Yliopisto                every  4 d  x10  last 2026-10-03  stopped
  places    Koti                     every  3 d  x15  last 2026-10-13  changed
  wifi      Liityit verkkoon Koti-WiFi every  2 d  x21  last 2026-10-16
  mail      newsletter               every  2 d  x12  last 2026-10-06  stopped
change points:
  photos    2026-08-31  3.5 -> 1.2 per week
  wifi      2026-10-07  4.4 -> 8.9 per week
  sms       2026-10-10  2.3 -> 7 per week
clusters:
  hakuvahtiosumia, vastaanotettu, vuokrasuhde  novelty 0.116  29 snippets
     Nomination confirmed: Erasmus+ exchange, | Posti: Pakettisi on noudettavissa automa | OP: Vahvistuskoodisi kirjautumiseen. Älä | Your parcel has been delivered to your p | Asuntohakemuksesi on vastaanotettu – TYS | Tilauksesi on toimitettu | +18
  headphones, onnibus, shipped  novelty 0.071  11 snippets
     Sali | Spotify | Order shipped: headphones | Onnibus
  verkkoon, liityit, luento  novelty 0.041  47 snippets
     Liityit verkkoon eduroam | Liityit verkkoon Koti-WiFi | Laskusi on saapunut | Ylioppilaskunnan uutiskirje | Luento siirtyy: Lineaarialgebra | Tentti: Tietorakenteet ja algoritmit | +23
  wolt, yliopisto, kirjasto  novelty 0.028  30 snippets
     Kirjasto | VR | Koti | Yliopisto | Waltti | Gym | +5
  market, keskusta, linnanmaa  novelty 0.017  49 snippets
     Lidl Tuira | K-Market Keskusta | K-Market Kaijonharju | K-Market Linnanmaa | Prisma Linnanmaa | Espresso House | +14

== Horizon (51456 ms)
2026-10-17..2027-01-15: first_car 2026-10-18, move 2026-11-01, long_trip 2027-01-10
  [lapse] A gap in home cover is possible  (2026-10-31..2026-11-01; move-2026-09-05)
     The old lease ends 31 October 2026 and the new one starts 1 November 2026. If the home insurance is not moved by then, the new home is uncovered from day one.
  [weather-at-event] Example: night frost in Southwest Finland, 30 Oct to 2 Nov  (2026-10-30..2026-11-02; move-2026-09-05)
     Moving is on 1 November 2026, inside the warning period. An example for the demo, not a warning from the Finnish Meteorological Institute. A card like this appears when the new place has a warning during the move week: check the water points and heating of the home that is left empty.
  [empty-home] The home stands empty while you are away  (2027-01-10..2027-05-30; long_trip-2026-09-20)
     You are away from 10 January 2027 to 30 May 2027, 140 days. An empty home is where leaks and freezes go unnoticed: turn off the water, ask someone to look in, and check that the home insurance covers a long absence.

done in 51657 ms
```
