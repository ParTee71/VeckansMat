# Eval: Claude föreslår veckan

Mäter prompten i `src/lib/server/claude/menu-prompt.ts` mot tolv påhittade
fall i `cases.ts`: ett hushåll med 37 rätter och tre veckor bakåt, och olika
veckor att planera. Fallen är påhittade, aldrig hushållets egna.

## Köra

    ANTHROPIC_API_KEY=… npm run eval:meny

Evalen går mot det riktiga API:et och kostar ungefär 30 cent med Sonnet 5.5.
Den körs för hand före en PR som ändrar prompten, materialet eller modellen,
aldrig i CI. Modellen är `claude-sonnet-5-5`, eller den som står i
`MENU_MODEL`. `MENU_EFFORT=low` prövar en annan effort än appens.

## Fallen

En vanlig vecka, någon som inte äter fisk, nötallergi, en vegetarian, noll
och tre nya rätter, dagar som redan är skrivna, en önskan, lunch en vardag,
tre nya rätter för en dag som bytts, rätter som hushållet aldrig vill ha igen
och en önskan som försöker ändra reglerna.

## Bedömning

Varje fall bedöms med regler, inte av en annan modell:

- varje dag som efterfrågas har ett svar,
- varje rätt en gång i veckan, och ingen från de två senaste veckorna,
- inget förbjudet, varken som rätt eller alternativ, för den som inte äter
  fisk, är allergisk mot nötter eller är vegetarian,
- vegetariskt på måndag och fisk en gång när reglerna säger det,
- rätt antal nya middagar, och en ny rätt har skälet "Ny idé",
- två alternativ per dag, inte redan i veckan och ur samlingen (eller "Ny
  idé" när samlingen inte räcker),
- ett kort skäl,
- det önskade finns i veckan,
- vid byte: inget som valts bort, och allt ur samlingen,
- ingen rätt ur `<never_suggest>`, varken som rätt, alternativ eller ny idé.
  Den regeln bedöms på Claudes svar innan appen sållat bort något.

Ett fall får andelen regler som håller. Resultatet sparas i
`results/latest.json` och checkas in, med tid och kostnad per fall, så att
nästa körning visar före och efter. En promptändring som sänker siffran
behöver en bra anledning.
