# Eval: Claude ger rätterna sort och bas

Mäter prompten i `src/lib/server/claude/category-prompt.ts` mot 40 påhittade
rätter i `cases.ts`, med facit för sort och bas. Rätterna är påhittade, aldrig
hushållets egna.

## Köra

    ANTHROPIC_API_KEY=… npm run eval:sort

Evalen går mot det riktiga API:et och kostar under en cent med Haiku 5.5. Den
körs för hand före en PR som ändrar prompten, materialet eller modellen,
aldrig i CI. Modellen är `claude-haiku-5-5`, eller den som står i
`CATEGORY_MODEL`. `CATEGORY_EFFORT=medium` prövar en annan effort än appens.

Tak, delkörningar och kostnadslogg: se [`evals/README.md`](../README.md).

## Fallen

Alla rätter skickas i ett anrop, som när appen sorterar de gamla rätterna.
Bland dem finns soppor med kött, kyckling, fisk och korv (som alltid är
Soppor), rätter med och utan ingredienser, vegetariska rätter med ost och
pasta, och ett namn som inte säger vad rätten är.

## Bedömning

Varje rätt bedöms med regler, inte av en annan modell: rätt sort, och en av de
baser som facit godtar. Målet är minst 95 % rätt sort och minst 90 % rätt bas;
evalen faller annars. Resultatet sparas i `results/latest.json` och checkas
in, så att nästa körning visar före och efter.
