---
name: refine-issue
description: Gör en idé, en bugg eller ett önskemål till ett planerat GitHub-issue i VeckansMat – stommen i skill android:arbetsflode plus VeckansMats delar – ADR:erna, D1-migreringar, Claude-anrop och eval, publikt repo, Vitest och Playwright, Definition of Done, modelltabellen och etiketten plan-godkänd. Använd före varje större ändring (nytt beteende, flera lager, datamodell, vägval), och när någon säger skapa issue, planera, förfina, skriv upp en bugg, idé, önskemål.
---

# Förfina och planera ett issue

**Stommen står i skill `android:arbetsflode` → Idé till issue** (fånga och klassa, klargör,
undersök, mockup, mallen, stoppet för ok) – [beslut
0025](../../../docs/beslut/0025-arbetsflodets-stomme-fran-pluginen.md). Den här skillen säger vad
VeckansMat lägger till. När en plan krävs: skill `android:arbetsregler` och [beslut
0024](../../../docs/beslut/0024-plan-bara-for-storre-andringar.md). Undersöka koden får du,
ändra den får du inte.

Bugg: fråga efter steg, förväntat, faktiskt, telefon och webbläsare.

## Undersök koden – VeckansMat

- Vilka routes, komponenter, `src/lib`-moduler och API-vägar berörs?
- **Beslut:** vilka ADR:er i `docs/beslut/` rör området? Krockar idén med ett beslut → säg det
  och föreslå en ny ADR (`/adr`), bygg inte förbi.
- **Återbruk:** finns det redan en komponent, funktion eller m3e-komponent som gör jobbet?
- **Data:** ny tabell eller kolumn i D1 → migrering, och hur den provas lokalt.
- **Claude i appen:** nytt anrop eller ändrad prompt → modell, kostnad, mock i tester, eval.
- **Publikt repo:** behövs testdata? Den är påhittad.
- **Tester:** vilka finns, vilka nivåer berörs (Vitest, Playwright)?
- **Version:** ändras appen? Vilken höjning (`/release`)?

Mockup: `/mockup`.

## Definition of Done – VeckansMat

Tester på varje berörd nivå (bugg → regressionstest som faller först), inga personuppgifter i
repot, svenska texter i gränssnittet, `npm run verify` och `npm run test:e2e` gröna, mockup
godkänd för ny GUI. Gäller en punkt inte, skriv varför. Testplanen delas i **Vitest** och
**Playwright**.

**Agent · modell · effort** efter uppgiftens komplexitet, Opus 5.5 som standard (CLAUDE.md →
Modellval, skill `android:ai-model-choice`):

| Uppgift                                                   | Modell                  |
| --------------------------------------------------------- | ----------------------- |
| Uppslag, läsning, loggar                                  | Haiku                   |
| Små avgränsade ändringar – en fil, en komponent, ett test | Sonnet                  |
| Flera lager, datamodell, migrering, prompter, granskning  | Opus                    |
| Väldigt komplexa issues – skälet och effort i issuet      | Fable 5.2 · medium/high |

Titel: `<område>: <sammanfattning>`. Planen visas och godkänns i issuet, inte som ett utkast i
chatten.

## Efter ägarens ok

Uppdatera issuet med svaren på de öppna frågorna, sätt etiketten `plan-godkänd` och skriv en
kommentar: var och när ägaren godkände, med ägarens ord. Finns redan en PR, kör om kontrollen
**Plan godkänd** efteråt; den läser etiketten när den körs. Erbjud sedan `/implement-issue`, gärna
i en ny session så att genomförandet får ren kontext med issuet som underlag.
