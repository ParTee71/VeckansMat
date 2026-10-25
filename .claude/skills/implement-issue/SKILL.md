---
name: implement-issue
description: Genomför ett planerat GitHub-issue i VeckansMat till en öppen PR – bara med godkänd plan (etiketten plan-godkänd), föregående PR mergad, mockup för ny GUI, tester samtidigt som koden, /simplify, agenten granskare och /code-review i rundor, PR och bevakning. Använd när någon säger genomför, implementera, kör #N, fixa buggen, bygg funktionen, eller efter /refine-issue.
---

# Genomföra ett issue

Driver ett issue från godkänd plan till PR. Inga undantag för små saker
([beslut 0018](../../../docs/beslut/0018-plan-fore-kod.md)).

## Före allt – Godkänd plan

Hämta issuets etiketter (`issue_read`, `get_labels`) innan något annat.

- **`plan-godkänd` finns** → fortsätt.
- **Saknas, eller inget issue** → stanna. Kör `/refine-issue`, som slutar med att vänta på
  ägarens ok. Ingen gren, ingen kod.
- **Ägaren har uttryckligen sagt att en plan inte behövs** → skriv `Utan plan: <ägarens ord,
tid>` i PR-texten. Bara ägaren kan ge det undantaget.

Hooken `plan-approved.mjs` och CI-kontrollen **Plan godkänd** stoppar en PR som saknar
godkänd plan. Gå aldrig runt dem.

## Steg 0 – Föregående PR

En PR i taget per gren. Fråga GitHub om den senaste PR:en från arbetsgrenen, lita aldrig på ett
antagande.

- **Mergad** → starta grenen om från `origin/main` och avsluta bevakningen av den gamla.
- **Öppen** → säg det direkt. Förbered arbetet **ocommittat** tills den är mergad, annars
  hamnar det i samma PR.
- **Ingen** → skapa grenen från `origin/main`. Committa aldrig direkt på `main`.

## Steg 1 – Förstå

Läs issuet **och kommentarerna**; acceptanskriterier, Design och Agent · modell · effort är
kontraktet, och senare kommentarer från ägaren går före issuetexten. Läs de ADR:er som rör
området.

## Steg 2 – Mockup

Ny eller tydligt ändrad GUI utan godkänd mockup under **Design** → `/mockup`, och vänta på ok
innan kod.

## Steg 3 – Planera och delegera

Kort plan: filer, ordning, tester. Starta varje del med den agent, modell och effort som issuet
anger. Avvik bara uppåt (fel två gånger i rad, större risk än väntat) och motivera det i PR:en.
Arbetar du i `.svelte`-filer: följ `svelte-core-bestpractices` och kör `svelte-autofixer`
(`svelte-code-writer`), gärna via agenten `svelte-file-editor`. Workers, D1, R2 och wrangler:
`workers-best-practices` och `wrangler`.

## Steg 4 – Bygg, med tester samtidigt

- **Bugg:** regressionstest som faller först, sedan minsta ändringen som gör det grönt.
- **Funktion:** följ befintliga mönster; m3e-komponenter registreras i `src/lib/m3e.ts`.
- **Version:** ändrar PR:en appen höjs versionen i samma ändring, med raden i `CHANGELOG.md`
  (`/release`).
- Engelska i koden, svenska i gränssnittet. Testdata påhittad. Claude mockas i tester.
- Ett test som ibland faller är en bugg: hitta grundorsaken. Ta aldrig bort, hoppa över
  (`skip`, `fixme`) eller försvaga ett test för att få grönt.

## Steg 5 – Kör kontrollerna

`npm run verify`, och `npm run test:e2e` om något syns i appen. Kör kommandona i issuets
testplan. Kan du inte köra något, säg det i PR:en.

## Steg 6 – Förenkla och granska i rundor

1. `/simplify` – mindre kod som gör samma jobb.
2. Agenten **`granskare`** på diffen. Varje ❌ åtgärdas; ⚠️ åtgärdas om det är litet, annars
   nämns det i PR:en.
3. `/code-review` när diffen rör mer än ett par filer, data, Claude-anrop eller hooks.
   Verifiera varje fynd och åtgärda de verkliga.

Ändras koden efter granskningen granskas bara rättningarna igen. Rundorna slutar när en runda
inte hittar något ❌. Kör kontrollerna en sista gång.

## Steg 7 – Commit, push och PR

- Svenska commit-meddelanden, små sammanhängande commits, `Closes #N` i den sista.
- Push en gång, när allt är grönt lokalt. Hooken kör `npm run verify` före push.
- PR mot `main`: vad och varför, hur det provats (kommandon och utfall), avvikelser från
  issuet, för GUI mockup-länk och skärmdumpar. `Closes #N`.
- Prenumerera på PR:en direkt. Rött CI → agenten **`ci-doktor`**, fixa grundorsaken och pusha.
  Kör aldrig bara om.
- Merga bara när all CI är grön, `Plan godkänd` inräknad.
- Lärde du något om hur Claude bör styras, skriv en rad i `docs/ai-styrning.md`.

## Anti-mönster

- Issue och PR samtidigt, eller kod innan ägaren godkänt planen.
- Att själv bedöma att en ändring är för liten för en plan.
- Nästa issue innan GitHub sagt att föregående PR är mergad.
- Kod för ny GUI utan godkänd mockup.
- Bugfix utan regressionstest.
- Ett rött test borttaget, hoppat eller omkört för att bli grönt.
- En agent med annan modell eller effort än issuet anger, utan motivering.
