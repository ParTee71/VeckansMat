---
name: mockup
description: Regeln "mockup före ny GUI" i VeckansMat – ny vy, ny komponent eller tydligt ändrat utseende visas som en mockup (Design-canvas) och godkänns av ägaren innan någon kod skrivs. Ladda alltid innan något som syns byggs eller ändras. Trigger-ord: ny vy, ny sida, ny komponent, mockup, skiss, design, prototyp, hur ska det se ut, layout, ändra utseendet, ny knapp, nytt kort.
---

# Mockup före ny GUI

Appen måste kännas lika snabb som lappen hushållet skriver menyn på (`docs/PLANERING.md`), och det avgörs
av hur den ser ut och känns, inte av koden. Därför visas nytt utseende först som en mockup, och
koden skrivs efter ägarens ok.

## När

| Ändring                                                     | Mockup?                          |
| ----------------------------------------------------------- | -------------------------------- |
| Ny vy eller sida                                            | Ja                               |
| Ny delad komponent                                          | Ja                               |
| Tydligt ändrat utseende eller beteende (syns i en tumnagel) | Ja                               |
| Avstånd, ordval, ikonbyte, färg inom temat                  | Nej – skärmdumpen i PR:en räcker |
| Ren logik utan synlig ändring                               | Nej                              |

## Mallen

Den första mockupen blir **mallen**: en Design-canvas med de m3e-komponenter appen använder
(`src/lib/m3e.ts`) i ljust och mörkt tema, och vyernas tillstånd (laddar, tom, fel, innehåll).
Mallens länk skrivs in i den här filen i samma PR. Det byggda är facit; mallen uppdateras när
en ny komponent registreras.

## Så bygger du en mockup

1. En Design-canvas (Artifact-typen "Design") per issue, eller nya ytor i issuets canvas.
2. Telefonyta 390 × 844; ljust tema först, mörkt när färgerna spelar roll.
3. Bygg av element ur mallen och m3e (Material 3 Expressive). Stora tryckytor och tydlig text.
4. Riktiga svenska texter och **påhittad** data: veckodagar, rätter, ingredienser och mängder i
   svenskt format ("2 dl", "400 g"). Aldrig hushållets riktiga data.
5. Finns elementet redan i appen → samma komponent och samma beteende; det är ingen designfråga.
   Bara för något helt nytt med en verklig öppen fråga: två ytor sida vid sida.
6. Det som saknas i m3e och appen märks **"NY KOMPONENT"**.
7. Visa de tillstånd som betyder något: tom vecka, laddar förslag, fylld vecka, fel, lång text.

## Visa och vänta

- Granska först med `/ux-granskning` och rätta 🔴. Nämn kvarvarande 🟡.
- Ge länken och en eller två meningar om vad som visas och vilka val som är öppna.
- **Skriv ingen kod innan ägaren godkänt.** Ändringar görs i samma canvas.
- Länken läggs i issuet under **Design**.

## I PR:en

Skärmdumpar av det byggda (Playwright, Pixel 7) bredvid mockup-länken. Avvikelser förklaras.
Mockupens HTML och CSS kopieras aldrig in i appen.
