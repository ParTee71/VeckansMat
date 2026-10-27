# 0023. Erbjudanden från butiker

- **Status:** Beslutat
- **Datum:** 2026-10-27

## Sammanhang

Hushållet vill att Claude väljer veckans rätter efter vad som är på extrapris där de handlar
(#106). `PLANERING.md` sköt erbjudanden till senare eftersom kedjorna saknar öppna API:er. Ingen
av ICA, Willys, Lidl eller Coop har ett dokumenterat API, men alla visar sina erbjudanden utan
inloggning via det deras egna sidor använder. Ägaren har godkänt att de läses för privat bruk.

## Beslut

Appen läser kedjornas egna sidor, en hämtare per kedja i `src/lib/server/offers/`, som alla ger
samma form:

- **Willys:** JSON från `willys.se/search/campaigns/offline` för vald butik, butiker från
  Willys butikssök.
- **ICA:** butikens sida `ica.se/erbjudanden/<butik>/`, där listan med erbjudanden klipps ut ur
  sidans data. Butiker från `ica.se/butiker/sitemap.xml`, som Cloudflare får spara ett dygn.
- **Lidl:** samma i hela landet. Startsidans kampanjsidor under "Den här veckan", utom de utan
  mat, och varje varas data på sidan.
- **Coop** kräver en webbläsare och kommer i #108.

Reglerna:

- En butik per kedja, vald i Hushållet och sparad bara i databasen (`offer_chain`), aldrig i
  repot.
- Hämtning en gång i veckan: en Cron Trigger var tionde minut måndag 05:00–05:50 UTC, inom
  Willys besökstid i `robots.txt`. Varje körning hämtar en kedja, den som frågades för längst
  sedan bland dem som saknar veckans erbjudanden, så att en kedja som felar provas igen och
  varje körning håller sig kort.
- Hämtning direkt när hushållet väljer butik eller slår på en kedja, och butikssök när någon
  söker. Det är samma frågor som en person gör på kedjans sida, en åt gången.
- Willys ber om 10 s mellan anrop; appen väntar tills det gått 10 s sedan förra frågan.
- Appen säger vem den är i `User-Agent` och följer `robots.txt`. Inget publiceras eller delas,
  och allt ligger bakom inloggningen.
- En hämtning som lyckas ersätter kedjans erbjudanden. En som misslyckas lämnar de förra kvar
  och sparar varför, på svenska, som Hushållet visar. En kedja stoppar aldrig de andra.
- Medlemspriser sparas med en markering (`offer.member`) och räknas med som standard;
  inställningen `offer_member_prices` stänger av dem.

SvelteKits adapter ger bara en `fetch`-hanterare, så `src/worker.js` lindar in den och lägger
till `scheduled`. Adaptern får en egen liten konfiguration (`wrangler.sveltekit.jsonc`) som
säger var den ska skriva sin Worker, eftersom `main` i `wrangler.jsonc` nu är `src/worker.js`.

## Följder

- Odokumenterade adresser kan ändras utan förvarning. Varje hämtare testas mot påhittade svar i
  samma form (`test/offer-sites.mjs`), och ett svar i annan form ger ett tydligt fel i stället
  för tomma erbjudanden. När en kedja ändrar sig behöver bara dess fil ändras.
- Workers gratisnivå ger 10 ms processortid per anrop. Att läsa en kedja tar några få ms här,
  men Lidls sju sidor ligger nära gränsen. Därför en kedja per körning. Räcker det inte får
  Lidls sidor delas på flera körningar.
- ICA:s butiksnamn tas ur sidans adress tills första hämtningen ger det riktiga namnet.
- Preview-Workern har samma cron men egen databas, så den hämtar bara om någon valt butik där.
- Lokalt och i Playwright pekar `OFFER_SITE_URL` om alla kedjor till en påhittad sajt.
