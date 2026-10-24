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
  GitHub Release, och kör `wrangler deploy`, så att en release kan backas i Cloudflares panel under
  Deployments.
- **Eget Cloudflare-konto för VeckansMat** (ägaren 2026-10-24). Repot är publikt, och
  wrangler skriver adressen med kontots workers.dev-underdomän i Actions-loggarna, som alla
  kan läsa. I ett delat konto skulle de avslöja adressen till ägarens andra appar.
- **Versionen syns diskret** längst ner i appen och i `/api/health` (ägaren 2026-10-23).
- **SvelteKits `version.name` är versionen.** En öppen flik märker en ny version (SvelteKit
  kollar varje timme och när fliken får fokus). Då visas "Ny version finns" med knappen
  "Ladda om", som ligger kvar tills man trycker (ägaren 2026-10-23, efter mockup). Den som
  inte trycker får den nya versionen vid nästa navigering.

## Följder

- Agenten `granskare` kontrollerar höjningen; skillen `release` har tabellen och stegen.
- `release.yml` driftsätter skarpt; jobbet "Förhandsadress" i `ci.yml` driftsätter `main`
  till en egen Worker, `veckansmat-preview`, med egen databas, utan att röra skarp drift
  (beslut 0012).
- Taggar skapas av workflowen, aldrig från en Claude-session.
