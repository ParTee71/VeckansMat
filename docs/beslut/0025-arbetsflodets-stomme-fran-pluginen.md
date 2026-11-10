# 0025. Arbetsflödets stomme från pluginen

- **Status:** Beslutat. Ersätter punkten i [0010](0010-skills-och-agenter.md) om att arbetsflödet
  kopieras och anpassas, för `refine-issue` och `implement-issue`.
- **Datum:** 2026-11-10

## Sammanhang

Arbetsflödet från issue till PR fanns i tre versioner: pluginen claude-android för
Android-repona, `refine-issue` och `implement-issue` här, och `forfina` och `genomfor` i Husjakt.
Stommen var densamma i alla tre:

- fråga GitHub om förra PR:en
- läs issuet och kommentarerna
- skriv ett test som faller först vid en bugg
- granska i rundor
- pusha en gång
- bevaka PR:en

Versionerna hade ändå glidit isär. Lärdomen härifrån att läsa `mergeable_state` efter varje push
(2026-10-27) fanns inte i de andra. En lärdom som skrevs in i en version nådde inte de andra.

Ägaren bestämde den 2026-11-10 att samma regler ska gälla i alla projekt, utan undantag per repo
(claude-android #42 och #61). Pluginen installeras redan i alla molnmiljöer, och `android:arbetsregler`
därifrån styr den här repots planregel sedan [0024](0024-plan-bara-for-storre-andringar.md).

## Beslut

- Stommen står i skill `android:arbetsflode` i pluginen claude-android, och den skillen är enda
  källan för stommen.
- `refine-issue` och `implement-issue` här behåller bara det som är VeckansMats eget:
  - plan-kontrollen och dess spärrar ([0018](0018-plan-fore-kod.md), 0024)
  - Svelte, Workers och m3e
  - versionen och `CHANGELOG.md`
  - `npm run verify` och e2e
  - evalen
  - `/simplify`
  - konflikter i version och migreringar
- `.claude/settings.json` slår på `android@claude-android` lokalt också, så att stommen finns
  även utanför molnmiljöerna.

## Följder

- Stommen läses olåst från pluginens standardgren, till skillnad från de officiella kopiorna i
  0010 som är låsta. Det är avsikten: en lärdom om arbetsflödet ska nå alla repon direkt. En
  ändring i stommen syns i claude-androids PR, inte som en diff här.

- En lärdom om arbetsflödet som gäller alla repon skrivs i pluginen, inte här. `docs/ai-styrning.md`
  får fortfarande det som bara gäller VeckansMat.
- Skillsen här går inte att läsa ensamma. Utan pluginen saknas stommen. Det är samma beroende som
  planregeln redan har på `android:arbetsregler`.
- Pluginens hookar körs också här, eftersom de redan är installerade i molnmiljön. `setup-check`
  gäller alla repon. Android-hookarna gör ingenting i ett repo som saknar `gradlew` eller
  `.claude/regel4.json`.
- Plan-spärren från 0018 och 0024 ändras inte. Den är strängare än stommen och gäller före den.
