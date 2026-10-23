# 0009. Kvalitetskontroller och CI

- **Status:** Beslutat
- **Datum:** 2026-10-23

## Sammanhang

Ingen människa läser varje rad Claude skriver. Det som ska hålla måste
kontrolleras av verktyg, både lokalt och innan något når `main`.

## Beslut

- `npm run verify` = `svelte-check` (typkontroll, varningar räknas som fel),
  Prettier, ESLint (varningar räknas som fel) och Vitest. Samma kommando
  lokalt, i hooken före push och i CI.
- Playwright körs i ett eget jobb mot ett riktigt bygge, på en mobil
  (Pixel 7), eftersom appen används i Android-telefoner.
- CI i GitHub Actions på varje PR och på `main`, med minsta behörighet
  (`contents: read`) och en tidsgräns per jobb.
- `main` är skyddad: ändringar via PR, och båda jobben måste vara gröna.
- Dependabot öppnar en samlad PR i veckan för npm och en för Actions.
- Secret scanning och push protection är på.
- Node 24 (LTS) i CI enligt `.nvmrc`; `engines` tillåter 22.13 och senare.
- Paket som får köra installationsskript listas i `allowScripts` i
  `package.json` (i dag `esbuild` och `workerd`). npm 10 och 11 läser inte
  listan än; den är förberedd för npm 12, som stoppar skript som inte står
  där.

## Följder

- Ett fel som CI hittar ska hookens `npm run verify` redan ha hittat lokalt.
- Actions pekas ut med huvudversion (`@v5`); Dependabot håller dem
  uppdaterade.
