# 0012. Datamodell för recept och veckomenyer

- **Status:** Beslutat
- **Datum:** 2026-10-24

## Sammanhang

Appen behöver spara recept och veckor innan förslag och inköpslista kan
byggas. Hushållets gamla handskrivna lappar visade hur en vecka ser ut: sju
middagar, oftast två helgluncher längre ner, ofta ett veckonummer men inte
alltid, sällan veckodagar och ibland rader som inte är rätter ("Rester",
"Äta ute"). Ett recept måste kunna vara bara ett namn (`docs/PLANERING.md`).

## Beslut

- D1 med fem tabeller: `recipe`, `recipe_ingredient`, `recipe_tag`, `menu`
  och `menu_item`. Schemat står i `migrations/`.
- Ett recept kräver bara ett namn. `name_key` (namnet trimmat, med enkla
  mellanslag och gemener) är unikt, så samma rätt med annan skrift blir ett
  recept.
- En menyrad sparar texten som den skrevs och pekar på ett recept, eller på
  inget. Varje rad har en måltid (middag eller lunch) och kan ha en veckodag.
- En meny gäller en vecka, angiven med veckans måndag, eller ingen vecka när
  det inte går att veta. Högst en meny per vecka.
- Inget hushålls-id: appen är för ett hushåll, och ett id läggs till med en
  migrering den dag det behövs.
- Ren SQL med förberedda satser i `src/lib/server/db/`, ingen ORM.
- Migreringar med wranglers `d1 migrations`. Release kör dem före
  driftsättningen; förhandsadressen har en egen Worker (`veckansmat-preview`)
  med egen databas, så prov aldrig rör hushållets data.
- `wrangler.jsonc` anger databaserna med namn, utan id. Wrangler slår upp dem,
  och CI skapar dem om de saknas.

## Följder

- En migrering måste fungera med koden som redan kör, eftersom den körs före
  driftsättningen.
- Personer, krav och menyregler får egna tabeller när de behövs.
- Enhetstester kör mot en riktig lokal D1 i minnet (`test/d1.ts`), med samma
  migreringar som drift.
- Förhandsadressen behöver Cloudflare Access precis som drift.
