# 0022. Röster på rätter

- **Status:** Beslutat
- **Datum:** 2026-10-27

## Sammanhang

Claude vet hur ofta en rätt ätits, men inte om den var god. En ny idé som ingen gillade kan komma
tillbaka en annan vecka, och en lyckad ny rätt syns inte som favorit förrän den ätits många
gånger (#99). Favoriter som får komma tillbaka oftare planeras samtidigt (#98).

## Beslut

En rätt har en röst: Ny favorit, Ok eller Aldrig mer (`recipe.vote`: `favorit`, `ok`, `aldrig`).
Rösten är hushållets gemensamma, inte per person, och den senaste gäller. Ingen röst räknas som
Ok, men sparas som null så att appen kan fråga "Hur var den?" tills någon röstat.

Man röstar med en enda knapp som byter läge för varje tryck, i Veckan vid en ny rätt vars dag har
passerat och på rättens sida. Favoriter är `vote = 'favorit'`, samma kolumn som #98 läser.

Aldrig mer är en hård regel: rätten tas bort ur samlingen som Claude får, står i en egen lista
`<never_suggest>` i prompten, och koden sållar bort den om Claude ändå föreslår den, som rätt
eller alternativ. Den finns kvar i Rätter, märkt, och går att skriva in för hand.

## Följder

- En migrering lägger till kolumnen; ingen ny tabell.
- Röster per person går inte att få fram ur den här modellen, utan kräver en egen tabell om någon
  ber om det.
- Veckan visar bara den här och nästa vecka, så en ny rätt från en tidigare vecka röstas på från
  rättens sida.
- Regeln i prompten mäts med fallet `aldrig-mer` i `npm run eval:meny`, på Claudes svar innan
  koden sållat.
