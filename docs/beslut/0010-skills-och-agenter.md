# 0010. Officiella skills först, egna där inget finns

- **Status:** Beslutat
- **Datum:** 2026-10-23

## Sammanhang

Svelte, Cloudflare och Playwright har egna skills och agenter för Claude, skrivna av teamen
bakom ramverken. De läser aktuell dokumentation och, för Svelte, kontrollerar koden. Claudes
minne av ramverken är äldre än så: Svelte 5 skrivs lätt som Svelte 4. Ägarens egna Android-appar
delar arbetsflödet i `ParTee71/claude-android`, som har fungerat i flera repon.

## Beslut

- **Officiella skills och agenter kopieras in oförändrade** med `SOURCE.md` (källa, commit,
  licens) och `LICENSE.txt`: `svelte-core-bestpractices`, `svelte-code-writer` och agenten
  `svelte-file-editor` från Svelte, `wrangler` och `workers-best-practices` från Cloudflare.
  Kopior i stället för pluginer: de fungerar i alla sessioner, versionen är låst och granskad,
  och en uppdatering syns som en diff.
- **Arbetsflödet tas från claude-android** och anpassas: `refine-issue` och `implement-issue`
  (ersätter `issue-to-pr`), `mockup` före ny GUI, `ux-granskning`, agenterna `granskare` och
  `ci-doktor`.
- **Egna skills bara där inget officiellt finns**, t.ex. `m3e` när första vyn byggs.
- Projekttrådar laddar `.claude/` via setup-skriptet och `repo-plugins.mjs` från claude-android.

## Följder

- `.claude/README.md` listar allt, och ett prov håller listan sann.
- Bortvalt: Playwrights `playwright-test-healer`, eftersom den märker ett test den inte får
  grönt med `test.fixme()` – det bryter mot regeln att ett rött test aldrig hoppas över.
  Cloudflares övriga skills gäller produkter appen inte använder.
- Kopiorna uppdateras för hand; `SOURCE.md` säger hur.
