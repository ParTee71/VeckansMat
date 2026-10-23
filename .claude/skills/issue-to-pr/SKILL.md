---
name: issue-to-pr
description: Planerar en uppgift som GitHub-issue och genomför den till öppen PR i VeckansMat. Använd när någon ber dig bygga, fixa eller genomföra något som inte är väldigt litet.
---

# Från issue till PR

Finns inget issue och uppgiften inte är väldigt liten: skriv issuet först
(vad, varför, hur det provas, öppna frågor) och bygg sedan efter det. Har
issuet öppna frågor, få svar på dem innan du bygger.

1. **Läs issuet och dess kommentarer.** Läs också de ADR:er i `docs/beslut/`
   som rör området. Krockar issuet med ett beslut: stanna och fråga, eller
   föreslå en ny ADR med `/adr`.
2. **Avgränsa.** En sak per PR. Är issuet större, föreslå en uppdelning i
   issuet innan du bygger.
3. **Skriv provet först** när det går: ett Vitest-prov som visar felet eller
   den nya funktionen och som faller innan ändringen.
4. **Bygg.** Engelska i koden, svenska i gränssnittet. Påhittad testdata.
5. **Kör `npm run verify`**, och `npm run test:e2e` om något syns i appen.
6. **Förenkla** med `/simplify`: mindre kod gör samma jobb. **Granska** sedan
   med `/code-review` och rätta det som är verkligt. Kör `npm run verify`
   igen efter rättningarna.
7. **Commit och PR på svenska.** PR-texten säger vad som ändrats, varför,
   hur det provats (kommandon och utfall) och `Closes #<nummer>`.
8. **Lärde du något om hur Claude bör styras** (en regel som saknades, en
   instruktion som missförstods) – lägg till en rad i `docs/ai-styrning.md`.
