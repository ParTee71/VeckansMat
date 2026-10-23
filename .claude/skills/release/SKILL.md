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

Stegen för själva releasen skrivs här när `release.yml` byggs, tillsammans med Cloudflare-kontot
(#5). Tills dess finns inget att släppa skarpt.
