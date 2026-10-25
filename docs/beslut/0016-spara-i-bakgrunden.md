# 0016. Spara i bakgrunden, ladda inte om sidan

- **Status:** Beslutat
- **Datum:** 2026-10-25

## Sammanhang

Appen används med en hand i affären och vid köksbänken. När en ändring sparades laddade
SvelteKit om sidans data, så listan hoppade, en bockad vara flyttade sig medan man sökte nästa,
och det kändes långsammare än en lapp. Ägaren vill inte att sidan laddas om i onödan,
någonstans i appen.

## Beslut

En ändring som görs där man står – bocka av, skriva en rad, välja vilka som äter, en
inställning, en ny rätt – syns direkt och sparas i bakgrunden. Sidan laddas inte om och hoppar
inte. Servern svarar med den del som ändrats, och sidan visar den. Hela sidan laddas om bara när
hela innehållet byts med avsikt, som när inköpslistan görs om, eller när man går till en annan
sida eller vecka.

## Följder

- En form action på plats svarar med den ändrade delen (till exempel veckans rader eller
  listans varor), och sidan använder `use:enhance` med `invalidateAll: false` eller ett eget
  anrop utan `invalidateAll()`.
- Ett e2e-prov räknar sidans dataladdningar och kräver noll när något sparas på plats.
- Medan något sparas varnar appen före att man lämnar sidan (#41), så inget går förlorat.
- Sidan håller ett eget svar tills ny data kommer, vilket är lite mer kod per vy än att ladda
  om allt.
