---
name: ux-granskning
description: Granskar en vy, mockup eller skärmdump i VeckansMat för användbarhet, visuell hierarki, enhetlighet och svenska UX-texter, och svarar i en kort tabell. Laddas vid granskning, inte när något ska skapas. Trigger-ord: granska vyn, vad tycker du om, designkritik, UX, användbarhet, knapptext, felmeddelandet, tomt tillstånd, ordval, skärmdump, mockupen är klar.
---

# UX-granskning

Granskar en vy som den upplevs i telefonen. Bygger på Anthropics `design-critique` och
`ux-copy` via `ParTee71/claude-android`, anpassad till webb, m3e och svenska. Nya vyer
skapas med `/mockup`, inte här.

## Underlag

Läs det som finns, gissa inte på ett utseende du inte sett: skärmdumpar eller mockupens ytor,
vyns kod för texter och tillstånd som inte syns, och vad användaren vill göra där.

## Kritik i fem steg

1. **Första intryck.** Drar rätt sak blicken till sig? Syns vyns syfte direkt?
2. **Användbarhet.** Når hushållet målet utan onödiga steg? Ett byte av en rätt ska vara ett
   tryck. Syns det vad som går att trycka på?
3. **Visuell hierarki.** Läsordning, betoning, luft. Står det viktigaste högst upp och störst?
4. **Enhetlighet.** Samma element ser lika ut och betyder samma sak överallt; samma
   m3e-komponent för samma sak.
5. **Tillgänglighet.** Kontrast i båda temana, tryckytor minst 48 px, text som går att förstora,
   etiketter på knappar med bara ikon.

## UX-texter på svenska

- **Knappar** börjar med ett verb och säger vad som händer: "Byt rätt", "Lägg till i listan",
  inte "OK".
- **Felmeddelanden** säger vad som hände och vad man kan göra, aldrig en rå undantagstext.
- **Tomma tillstånd** säger vad som finns här, varför det är tomt och hur man börjar.
- **Bekräftelser** beskriver handlingen ("Ta bort receptet?") och knapparna heter efter den
  ("Ta bort" / "Behåll").
- **Samma sak heter samma sak** överallt.
- Kort och vardagligt, utan tekniska ord. Mängder och datum i svenskt format.

## Utdata

Högst cirka 15 rader, en rad per fynd, varje fynd pekar på en bild eller en fil:rad.

| Fynd | Var                             | Allvar       | Förslag |
| ---- | ------------------------------- | ------------ | ------- |
| …    | `vecka.png` / `+page.svelte:42` | 🔴 / 🟡 / 🟢 | …       |

🔴 = användaren missar något eller gör fel, 🟡 = otydligt eller inkonsekvent, 🟢 = putsning.

**Det här fungerar:** en eller två punkter. **Viktigast:** de tre åtgärder som gör störst
skillnad. Pröva varje fynd mot bilden eller koden; smak är 🟢 eller inget alls.
