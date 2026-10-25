---
name: refine-issue
description: Gör en idé, en bugg eller ett önskemål till ett planerat GitHub-issue i VeckansMat – avsikt, kodgenomgång, omfång, Definition of Done, mockup för ny GUI och Agent · modell · effort – skapar issuet och stannar tills ägaren godkänt planen. Använd före varje ändring, även små, och när någon säger skapa issue, planera, förfina, skriv upp en bugg, idé, önskemål.
---

# Förfina och planera ett issue

Varje bugg, ändring och funktion planeras i ett issue innan den byggs, även små
([beslut 0018](../../../docs/beslut/0018-plan-fore-kod.md)). Bedöm aldrig själv att något är för
litet; bara ägaren kan säga att en plan inte behövs. Målet är ett issue som en annan session kan
genomföra med `/implement-issue` utan fler frågor. Samla frågor, förhör inte. **Skapa eller
uppdatera inte issuet förrän i steg 7.** Undersöka koden får du, ändra den får du inte.

Har du ett nummer: hämta issuet och dess kommentarer, förfina och uppdatera det i steg 7.

## Steg 1 – Fånga idén

Återge begäran i en eller två meningar och klassa den: **funktion**, **bugg** eller
**underhåll**. Sök efter dubbletter bland öppna issues först.

## Steg 2 – Klargör avsikten

Fråga bara det som inte går att härleda ur begäran eller koden. Konkreta val som en fråga med
alternativ. Bugg: steg, förväntat, faktiskt, telefon och webbläsare. Hoppa över steget om
begäran är entydig.

## Steg 3 – Undersök koden

- Vilka routes, komponenter, `src/lib`-moduler och API-vägar berörs? Anteckna filsökvägar.
- **Beslut:** vilka ADR:er i `docs/beslut/` rör området? Krockar idén med ett beslut → säg det
  och föreslå en ny ADR (`/adr`), bygg inte förbi.
- **Återbruk:** finns det redan en komponent, funktion eller m3e-komponent som gör jobbet?
- **Data:** ny tabell eller kolumn i D1 → migrering, och hur den provas lokalt.
- **Claude i appen:** nytt anrop eller ändrad prompt → modell, kostnad, mock i tester, eval.
- **Publikt repo:** behövs testdata? Den är påhittad.
- **Tester:** vilka finns, vilka nivåer berörs (Vitest, Playwright)?
- **Version:** ändras appen? Vilken höjning (`/release`)?

## Steg 4 – Mockup (bara ny GUI)

Syns ändringen enligt tabellen i `/mockup`: bygg mockupen nu, visa länken och vänta på ok.
Länken går in under **Design**.

## Steg 5 – Omfång och Definition of Done

- **Inom omfång**, **utanför omfång**, **acceptanskriterier** (observerbara, testbara).
- **Definition of Done:** tester på varje berörd nivå (bugg → regressionstest som faller
  först), inga personuppgifter i repot, svenska texter i gränssnittet, `npm run verify` och
  `npm run test:e2e` gröna, mockup godkänd för ny GUI. Gäller en punkt inte, skriv varför.
- Stort arbete → föreslå uppdelning i under-issues, var och en med egen DoD.

## Steg 6 – Utkast

```markdown
## Sammanfattning

<vad och varför>

## Design

<mockup-länk, eller "ingen GUI-ändring">

## Föreslaget upplägg

1. …

## Berörda filer

- `src/…`

## Testplan

- Vitest: …
- Playwright: …

## Acceptanskriterier

- [ ] …
- [ ] `npm run verify` och `npm run test:e2e` gröna

## Utanför omfång

- …

## Öppna frågor

- …

## Agent · modell · effort

- <agent> · <modell> · <effort> – <vilken del>
```

Bugg: byt **Föreslaget upplägg** mot **Steg för att återskapa**, **Förväntat**, **Faktiskt**.

**Agent · modell · effort är obligatoriskt.** Modell efter uppgiftens komplexitet, Opus som
standard:

| Uppgift                                                   | Modell |
| --------------------------------------------------------- | ------ |
| Uppslag, läsning, loggar                                  | Haiku  |
| Små avgränsade ändringar – en fil, en komponent, ett test | Sonnet |
| Flera lager, datamodell, migrering, prompter, granskning  | Opus   |
| Väldigt komplexa issues                                   | Fable  |

Titel: `<område>: <sammanfattning>`. Gå vidare till steg 7: planen visas och godkänns i
issuet (steg 8), inte som ett utkast i chatten.

## Steg 7 – Skapa eller uppdatera

Skapa med GitHub MCP (`issue_write`), eller uppdatera med hela den förfinade texten – lägg inte
bara till i slutet.

## Steg 8 – STOPP: vänta på ägarens ok

Visa issuets länk och de öppna frågorna, och **avsluta turen**. Ingen gren, ingen kod, ingen PR,
inget "jag börjar under tiden".

När ägaren skrivit ok: uppdatera issuet med svaren på de öppna frågorna, sätt etiketten
`plan-godkänd` och skriv en kommentar på issuet: var och när ägaren godkände, med ägarens ord.
Sätt aldrig etiketten utan ett ok från ägaren. Finns redan en PR, kör om kontrollen **Plan
godkänd** efteråt; den läser etiketten när den körs. Erbjud sedan `/implement-issue`, gärna i en ny
session så att genomförandet får ren kontext med issuet som underlag.
