# 0011. Versioner och release

- **Status:** Beslutat
- **Datum:** 2026-10-23

## Sammanhang

Hushållet ska kunna lita på att appen inte ändras mitt i en vecka utan att någon bestämt det,
och det ska gå att se och backa vad som kör skarpt. Ägarens Android-appar har redan ett
fungerande flöde (`release` i `ParTee71/claude-android`).

## Beslut

- **Semver i `package.json`**, från `0.1.0`. Versionen höjs i funktions-PR:en, och raden i
  `CHANGELOG.md` skrivs där. Releasen frågar inte om numret.
- **Skarp drift bara vid release** (ägaren 2026-10-23). Mergar till `main` går till
  förhandsadressen. En release startas med `workflow_dispatch`, skapar taggen `vX.Y.Z` och en
  GitHub Release, och kör `wrangler deploy` så att Cloudflare kan backa med `wrangler rollback`.
- **Versionen syns diskret** längst ner i appen och i `/api/health` (ägaren 2026-10-23).
- **SvelteKits `version.name` är versionen.** En öppen flik märker en ny version (SvelteKit
  kollar varje timme och när fliken får fokus) och laddar om helt vid nästa navigering.

## Följder

- Agenten `granskare` kontrollerar höjningen; skillen `release` har tabellen och stegen.
- Release-workflowen och förhandsadressen byggs när Cloudflare-kontot finns.
- Taggar skapas av workflowen, aldrig från en Claude-session.
