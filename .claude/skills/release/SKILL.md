---
name: release
description: Versioner och releaser i VeckansMat – regeln för versionshöjning i funktions-PR:en (semver i package.json och en rad i CHANGELOG.md) och stegen för en release till skarp drift via workflow_dispatch, utan fråga om versionsnumret. Kör en release bara när ägaren uttryckligen ber om det. Trigger-ord: release, släpp, ny version, publicera, driftsätt skarpt, versionshöjning, semver, CHANGELOG.
---

# Versioner och release

Anpassad från `release` i `ParTee71/claude-android`. Varför: [beslut 0011](../../../docs/beslut/0011-versioner-och-release.md).

## Versionshöjning i funktions-PR:en

Varje PR som ändrar appen höjer versionen i samma ändring, så att ingen release-PR behövs.

| Ändring                                                                  | Höjning                |
| ------------------------------------------------------------------------ | ---------------------- |
| Brytande, borttagen funktion, eller datamigrering som inte går att backa | major (minor före 1.0) |
| Ny funktion – ny vy, ny förmåga                                          | minor                  |
| Fix, beroenden, refaktorering som syns eller kan synas                   | patch                  |

- Ändra `version` i `package.json` och `package-lock.json` med
  `npm version <major|minor|patch> --no-git-tag-version`.
- Skriv raden i `CHANGELOG.md` under den nya versionen: det hushållet märker, på vardaglig
  svenska, med `(#NN)`.
- Skriv versionen i PR-beskrivningen.
- Ren dokument-, test-, CI- eller Claude-verktygsändring höjer inte.
- Är versionen redan höjd sedan senaste release, höj bara om denna PR är allvarligare, och skriv
  då om den befintliga rubriken i `CHANGELOG.md`.

Agenten `granskare` kontrollerar höjningen.

## Hur en release går till

- **Kör bara när ägaren ber om en release.** Mergar till `main` går till förhandsadressen;
  bara en release går ut skarpt.
- **Ingen fråga om versionsnumret.** Releasen använder versionen som PR:erna redan satt på
  `main`.
- **Starta först när CI på `main` är grönt** för HEAD.
- **Taggar pushas aldrig från en Claude-session** (miljön stoppar `refs/tags`). Release-workflowen
  skapar taggen själv.

## Förhandsadressen

Varje grön push till `main` driftsätts till en egen Worker, `veckansmat-preview`, med egen
databas `veckansmat-preview` (jobbet "Förhandsadress" i `ci.yml`, beslut 0012). Skarp drift och
hushållets data påverkas inte. Den Workern behöver Cloudflare Access precis som drift, med samma inloggning (Google, beslut
0021).

## Stegen

0. **Före första releasen:** kontot har en workers.dev-underdomän, och Cloudflare Access står
   framför appen och förhandsadresserna innan appen har data eller anropar Claude (beslut 0005), med Google som enda inloggningssätt
   (beslut 0021).
1. Läs `CHANGELOG.md` under versionen i `package.json` på `main`. Raderna är releasens text.
2. Ge ägaren länken [Actions → Release](https://github.com/ParTee71/VeckansMat/actions/workflows/release.yml)
   → **Run workflow**, först med "Provkör" ikryssad (standard), sedan utan.
3. Workflowen stoppar om taggen redan finns, om raderna saknas eller om CI inte är grön för
   committen. Annars skapar den databasen om den saknas, kör migreringarna, kör
   `wrangler deploy` med versionen som tagg, skapar taggen `vX.Y.Z`
   och en GitHub Release med raderna.
4. **Backa:** i Cloudflare under Workers → `veckansmat` → Deployments → Rollback (länken till
   kontot ges ägaren). Rätta sedan i en ny PR med höjd patchversion. En rollback backar inte
   databasen, därför ska varje migrering fungera även med föregående version av koden.
