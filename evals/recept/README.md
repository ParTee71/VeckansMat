# Eval: läsa recept med Claude

Mäter prompten i `src/lib/server/claude/recipe-prompt.ts` mot elva påhittade
fall i `cases.ts`: inklistrad text, receptsidor utan JSON-LD och foton (en
kokbokssida, ett uppslag i två foton och en handskriven lapp). Fallen är
påhittade, aldrig hushållets egna recept.

## Köra

    ANTHROPIC_API_KEY=… npm run eval:recept

Evalen går mot det riktiga API:et och kostar under en cent med Haiku. Den körs
för hand före en PR som ändrar prompten eller modellen, aldrig i CI. Modellen
är `claude-haiku-5-5`, eller den som står i `RECIPE_MODEL`.

## Bedömning

Varje fall bedöms med regler, inte av en annan modell:

- namnet stämmer (eller är tomt när texten inte är ett recept),
- portioner och tid stämmer, och är tomma när källan inte anger dem,
- varje förväntad ingrediensrad finns, skriven som i källan,
- ingen rad är påhittad,
- stegen finns.

Ett fall får andelen regler som håller. Resultatet sparas i
`results/latest.json` och checkas in, så att nästa körning visar före och
efter för varje fall. En promptändring som sänker siffran behöver en bra
anledning.

## Fotona

Fotona i `photos/` är renderade ur `PHOTOS` i `cases.ts`. Ändras de:

    node --experimental-strip-types evals/recept/render-photos.ts
