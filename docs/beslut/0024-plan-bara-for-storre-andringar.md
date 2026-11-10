# 0024. Plan bara för större ändringar

- **Status:** Beslutat. Ersätter kravet i 0018 på en plan för varje ändring. Spärren från 0018 finns kvar.
- **Datum:** 2026-11-10

## Sammanhang

[Beslut 0018](0018-plan-fore-kod.md) krävde ett issue med godkänd plan för varje ändring, även
en rad. Ägarens andra projekt hade andra regler: Android-repona krävde issue och "kör", och
Husjakt hade ingen planspärr alls. Den 2026-11-10 bestämde ägaren att samma regel ska gälla
överallt, och valde "plan bara för större saker". Regeln står i skill `android:arbetsregler` i
pluginen claude-android, och den skillen är enda källan.

0018 kom till för att ett undantag för små saker hade misslyckats. En tråd bedömde själv att
något var litet och mergade PR #74 utan att ägaren sett planen. Det här beslutet öppnar samma
dörr igen, men nu ska bedömningen synas i PR:en.

## Beslut

- **Större ändring:** nytt beteende, flera filer eller lager, datamodell eller ett verkligt
  vägval. Den kräver ett issue med plan och ägarens ok, som ges med etiketten `plan-godkänd`
  eller med "kör" i tråden. Efter det driver tråden ändringen till merge utan fler frågor.
- **Liten ändring:** en avgränsad fix eller ett dokument. Den går direkt till PR med raden
  `Liten ändring: <varför>` i PR-texten, och tråden mergar när CI är grön.
- **Osäker → större.**

Hooken `plan-approved.mjs` och CI-kontrollen **Plan godkänd** godtar nu tre saker: länkade
issues med `plan-godkänd`, raden `Utan plan: <ägarens ord>`, eller raden `Liten ändring:
<varför>`.

## Följder

- Raden `Liten ändring:` gör bedömningen synlig och granskningsbar. Ägaren ser den i varje PR
  och kan säga emot. Det skiljer den från undantaget som 0018 tog bort, där bedömningen inte
  syntes någonstans.
- Kontrollen kan inte avgöra om en ändring verkligen är liten, eftersom den bara läser PR-texten.
  Att bedömningen stämmer hänger på Claude, granskaren och ägarens blick på PR:en.
- Repots egna skyddsregler står kvar. Repot är publikt, skarp data skrivs bara på begäran, och
  migreringar körs lokalt först.
