# Eval: Claude gör inköpslistan

Mäter prompten i `src/lib/server/claude/shopping-prompt.ts` mot fem påhittade
veckor i `cases.ts`. Veckorna är påhittade, aldrig hushållets egna.

## Köra

    ANTHROPIC_API_KEY=… npm run eval:handla

Evalen går mot det riktiga API:et och kostar under en cent med Haiku 5.5. Den
körs för hand före en PR som ändrar prompten, materialet eller modellen,
aldrig i CI. Modellen är `claude-haiku-5-5`, eller den som står i
`SHOPPING_MODEL`. `SHOPPING_EFFORT=medium` prövar en annan effort än appens.

## Fallen

Samma vara från tre rätter, en rätt som lagas till åtta portioner ur ett
recept för fyra, två rätter med bara namn, en vecka med mycket ur skafferiet
och en rad i ett recept som försöker lägga till något på listan.

## Bedömning

Varje fall bedöms med regler, inte av en annan modell:

- något på listan till varje rätt,
- avdelningarna i butikens ordning, och varan utan mängd i texten,
- samma vara en gång, med mängden ihopräknad,
- mängden omräknad till veckans portioner,
- varan i rätt avdelning, och salt, olja, mjöl och kryddor under "Finns
  kanske hemma",
- gissningar med det rätten brukar ha för rätter med bara namn, och inga för
  rätter med rader,
- inget av det som en rad försökte lägga till.

Ett fall får andelen regler som håller. Resultatet sparas i
`results/latest.json` och checkas in, med tid och kostnad per fall, så att
nästa körning visar före och efter.
