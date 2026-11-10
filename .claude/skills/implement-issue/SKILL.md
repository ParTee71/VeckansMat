---
name: implement-issue
description: Genomför ett GitHub-issue i VeckansMat till en mergad PR – stommen i skill android:arbetsflode plus VeckansMats delar – plan-kontrollen (plan-godkänd, Liten ändring), Svelte och Workers, versionen och CHANGELOG, npm run verify och e2e, evalen, /simplify, agenten granskare, plan-spärren vid merge och konflikter i version och migreringar. Använd när någon säger genomför, implementera, kör #N, fixa buggen, bygg funktionen, eller efter /refine-issue.
---

# Genomföra ett issue

**Stommen står i skill `android:arbetsflode` → Issue till PR** (förra PR:en, förstå, bygg,
kontroller, granskningsrundor, en push, PR-texten, bevakning, konflikter, merge) – [beslut
0025](../../../docs/beslut/0025-arbetsflodets-stomme-fran-pluginen.md). Följ den steg för steg;
den här skillen säger vad som gäller i VeckansMat, under stommens stegnamn. Basgrenen är `main`.

## Före allt – Godkänd plan

Hämta issuets etiketter (`issue_read`, `get_labels`) innan något annat. När en plan krävs står i
skill `android:arbetsregler` och [beslut 0024](../../../docs/beslut/0024-plan-bara-for-storre-andringar.md).

- **Liten ändring** → `Liten ändring: <varför>` i PR-texten. Osäker → större.
- **`plan-godkänd` finns, eller ägaren har skrivit "kör" på planen** → fortsätt. Har ägaren
  skrivit "kör", sätt etiketten och kommentera var och när.
- **Större ändring utan godkänd plan, eller inget issue** → stanna och kör `/refine-issue`.
- **Ägaren har uttryckligen sagt att en plan inte behövs** → `Utan plan: <ägarens ord, tid>` i
  PR-texten. Bara ägaren kan ge det undantaget.

Hooken `plan-approved.mjs` och CI-kontrollen **Plan godkänd** stoppar en PR som saknar något av
dem. Gå aldrig runt dem.

## Förstå – VeckansMat

Läs de ADR:er i `docs/beslut/` som rör området. Krockar arbetet med ett beslut: föreslå en ny
ADR (`/adr`), bygg inte förbi. Mockup: `/mockup`.

## Bygg – VeckansMat

- `.svelte`-filer: följ `svelte-core-bestpractices` och kör `svelte-autofixer`
  (`svelte-code-writer`), gärna via agenten `svelte-file-editor`. Workers, D1, R2 och wrangler:
  `workers-best-practices` och `wrangler`.
- m3e-komponenter registreras i `src/lib/m3e.ts`.
- **Version:** höjningen och raden i `CHANGELOG.md` står i `/release`.
- **Commit-meddelanden** på svenska, som en rubrik utan prefix (`Beslut 0025: …`, `e2e: …`) –
  repots stil går före stommens `feat(område):`.
- Engelska i koden, svenska i gränssnittet. Testdata påhittad. Claude mockas i tester. Ett test
  hoppas aldrig över med `skip` eller `fixme`.

## Kontrollerna – VeckansMat

`npm run verify`, och `npm run test:e2e` om något syns i appen. Issuets **Testplan** är dess
Verifiering när issuet saknar en egen rubrik för det. Hooken kör `npm run verify` före
push.

Ändras en prompt, ett schema eller en modell: prova med några fall (`-t`) medan du bygger och
gör **en** full körning av evalen före PR:en, fler bara om ägaren ber om det. Skriv evalens
kostnad i PR:en, från `evals/costs.jsonl`. Se `evals/README.md`.

## Granska – VeckansMat

Före granskarens runda: `/simplify` – mindre kod som gör samma jobb. Granskaren är agenten
**`granskare`**. `/code-review` körs också när diffen rör Claude-anrop. Kör kontrollerna en sista
gång efter sista rundan.

## PR och bevakning – VeckansMat

- PR-texten säger också avvikelser från issuet.
- Rött CI → agenten **`ci-doktor`**.
- Workflowen **Konflikter** sätter etiketten `konflikt` och tar bort den vid den push som löser
  konflikten; etiketten betyder samma sak som `mergeable_state` `dirty`.
- Merga bara när **Plan godkänd** också är grön.

## Konflikter – VeckansMat

- **Ingen rebase och ingen force-push** för att lösa en konflikt – merga in `origin/main`.
- **Version och `CHANGELOG.md`:** har `main` redan höjt sedan senaste release, flyttas PR:ens rad
  under `main`s rubrik. Ändra versionen med `npm version`, inte för hand i `package-lock.json`.
  Två rubriker med samma version får aldrig finnas.
- **Migreringar med samma nummer:** döp om PR:ens migrering till nästa lediga nummer.
- Lärdomar om hur Claude bör styras skrivs i `docs/ai-styrning.md`.

## Anti-mönster (utöver stommens)

- Issue och PR samtidigt för en större ändring.
- Merga när **Plan godkänd** är röd.
- Två rubriker med samma version i `CHANGELOG.md`.
