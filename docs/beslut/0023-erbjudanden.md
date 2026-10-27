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
- **Coop:** butikens sida `coop.se/butiker-erbjudanden/<sort>/<butik>/` hämtar erbjudandena först
  i webbläsaren, med en nyckel som Coop skickar till alla besökare. Appen använder inte nyckeln
  själv. Sidan öppnas i Cloudflares Browser Rendering (bindningen `BROWSER`), och svaret som
  sidan själv får läses av ett skript som lagts in före sidans egna (#108). Svaret, upp till
  1,5 MB, görs mindre redan i webbläsaren, så att Workern bara läser det appen behöver. Butiker
  från `coop.se/sitemap_pages.xml`, som Cloudflare får spara ett dygn.

Reglerna:

- En butik per kedja, vald i Hushållet och sparad bara i databasen (`offer_chain`), aldrig i
  repot.
- Hämtning en gång i veckan: en Cron Trigger var tionde minut måndag 05:00–05:50 UTC, inom
  Willys besökstid i `robots.txt`. Varje körning hämtar en kedja, den som frågades för längst
  sedan bland dem som saknar veckans erbjudanden, så att en kedja som felar provas igen och
  varje körning håller sig kort.
- Hämtning direkt när hushållet väljer butik eller slår på en kedja, och butikssök när någon
  söker. Det är samma frågor som en person gör på kedjans sida, en åt gången.
- Willys ber om 10 s mellan anrop. Innan erbjudandena hämtas väntar appen tills det gått 10 s
  sedan förra frågan, butikssök inräknat. Själva butikssöket väntar inte, eftersom det är en
  person som söker; det frågar först när personen slutat skriva eller tryckt på sök.
- Appen säger vem den är i `User-Agent` och följer `robots.txt`. Inget publiceras eller delas,
  och allt ligger bakom inloggningen.
- En hämtning som lyckas ersätter kedjans erbjudanden. En som misslyckas lämnar de förra kvar
  och sparar varför, på svenska, som Hushållet visar. En kedja stoppar aldrig de andra.
- Medlemspriser sparas med en markering (`offer.member`) och räknas med som standard;
  inställningen `offer_member_prices` stänger av dem.

SvelteKits adapter ger bara en `fetch`-hanterare, så `src/worker.js` lindar in den och lägger
till `scheduled`. Adaptern får en egen liten konfiguration (`wrangler.sveltekit.jsonc`) som
säger var den ska skriva sin Worker, eftersom `main` i `wrangler.jsonc` nu är `src/worker.js`.

### Claude väljer rätter efter erbjudandena (#109)

- Efter varje hämtning sorterar Haiku (`OFFER_MODEL`) bort det som ingen middag lagas av och ger
  resten ett råvarunamn, till exempel "kycklingfilé", i `offer.ingredient`. Det görs i
  bakgrunden efter en hämtning i Hushållet, efter cronens hämtning och före ett veckoförslag,
  så det som inte hann sorteras tas då. Prompten mäts med `npm run eval:erbjudanden`.
- Hushållet handlar samma vecka som de planerar, så Claude får de erbjudanden som gäller i dag
  och minst två dagar till, från kedjor som är påslagna. Högst två per råvara och 80 totalt.
  Medlemspriser bara när hushållet räknar med dem.
- Claude bygger en eller två middagar på ett erbjudande när det passar, och anger dess nummer.
  Regler, krav och önskan går först. Ett nummer som inte finns i listan ignoreras.
- Erbjudandet sparas med rätten (`menu_item.offer`) som det var, eftersom kedjans erbjudanden
  ersätts varje vecka. Ett alternativ som byggs på ett erbjudande har med sitt, och en dag som
  skrivs för hand har inget.

## Följder

- Odokumenterade adresser kan ändras utan förvarning. Varje hämtare testas mot påhittade svar i
  samma form (`test/offer-sites.mjs`), och ett svar i annan form ger ett tydligt fel i stället
  för tomma erbjudanden. När en kedja ändrar sig behöver bara dess fil ändras.
- Workers gratisnivå ger 10 ms processortid per anrop. Att läsa en kedja tar några få ms här,
  men Lidls sju sidor ligger nära gränsen. Därför en kedja per körning. Räcker det inte får
  Lidls sidor delas på flera körningar.
- ICA:s butiksnamn tas ur sidans adress, utan å, ä och ö, tills första hämtningen ger det
  riktiga namnet.
- En kedjas erbjudanden sparas med en enda fråga (JSON in i `json_each`), eftersom D1 bara
  tillåter 50 frågor per anrop på gratisnivån och en butik kan ha flera hundra erbjudanden.
- Välja en Willys-butik tar upp till tio sekunder, eftersom appen väntar efter butikssöket.
- Preview-Workern har samma cron men egen databas, så den hämtar bara om någon valt butik där.
- Lokalt och i Playwright pekar `OFFER_SITE_URL` om alla kedjor till en påhittad sajt. Där är
  Coops butikssida ingen webbläsare, utan JSON med det sidan skulle ha fått.
- Browser Rendering ingår i gratisnivån med 10 minuter webbläsartid per dygn. En hämtning från
  Coop tar några sekunder och högst en halv minut, så det räcker gott för en butik i veckan.
  `wrangler dev` startar en lokal Chromium för bindningen, som kräver `CI=1` om den körs som
  root.
- Coops butiksnamn tas ur sidans adress, utan å, ä och ö, tills första hämtningen ger namnet ur
  sidans data.
- Sorteringen kostar under 2 cent i veckan med Haiku. Med erbjudanden blir ett veckoförslag
  någon halv cent dyrare, eftersom Claude läser upp till 80 rader till.
- Fältet `offer` finns i svarsformen bara när det finns erbjudanden. När det alltid fanns tänkte
  Claude mer sällan på veckor utan erbjudanden och svarade sämre (`evals/meny`).
- Erbjudandena sorteras efter varje hämtning och av cronen. Är några ändå osorterade när
  veckan föreslås sorteras en sats på 150 först, så förslaget kan ta ett Haiku-anrop längre.
- Claude ser högst 80 erbjudanden, en av varje råvara före en andra. Inom en råvara väljs
  medlemspris sist och sedan kedja i bokstavsordning, inte lägst pris, eftersom kedjornas
  priser är text i olika enheter.
- Appen behåller ett erbjudande på högst två middagar per svar och aldrig på en lunch, även
  om Claude svarar annorlunda. Ett byte av en enda dag kan ändå ge veckan en tredje.
