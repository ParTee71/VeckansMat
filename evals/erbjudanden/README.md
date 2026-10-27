# Eval: Claude sorterar veckans erbjudanden

Mäter prompten i `src/lib/server/claude/offer-prompt.ts` mot 44 påhittade
erbjudanden i `cases.ts`, skrivna som kedjorna skriver dem, med facit för vad
varje erbjudande ska bli. Erbjudandena är påhittade, aldrig en riktig butiks
vecka.

## Köra

    ANTHROPIC_API_KEY=… npm run eval:erbjudanden

Evalen går mot det riktiga API:et och kostar under en tiondels cent med Haiku
5.5. Den körs för hand före en PR som ändrar prompten, materialet eller
modellen, aldrig i CI. Modellen är `claude-haiku-5-5`, eller den som står i
`OFFER_MODEL`. `OFFER_EFFORT=medium` prövar en annan effort än appens.

## Fallen

Alla erbjudanden skickas i ett anrop, som när appen sorterar en butiks vecka.
Kött, fågel, fisk, korv, vegetariskt protein och färska grönsaker ska behållas.
Godis, dryck, kaffe, bröd, mejeri, glass, hushåll och sådant som inte är mat
ska bort. Några, som krossade tomater, grädde och pasta, får gå åt vilket håll
som helst. Ett namn försöker styra sorteringen.

## Bedömning

Varje erbjudande bedöms med regler, inte av en annan modell: det som ska bort
är borta, och det som ska behållas har en råvara med ett av facits ord, utan
märke, vikt eller siffror. Målet är minst 90 % rätt; evalen faller annars.
Resultatet sparas i `results/latest.json` och checkas in, så att nästa körning
visar före och efter.
