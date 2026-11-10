# Claude Code i VeckansMat

Varför uppsättningen ser ut så här: [beslut 0008](../docs/beslut/0008-claude-code-uppsattning.md)
och [0010](../docs/beslut/0010-skills-och-agenter.md). Ett prov
(`test/claude-config.spec.ts`) håller tabellerna nedan sanna mot katalogerna.

## Skills

| Skill                       | När                                                  | Källa                      |
| --------------------------- | ---------------------------------------------------- | -------------------------- |
| `refine-issue`              | Idé eller bugg till ett planerat issue               | Egen, efter claude-android |
| `implement-issue`           | Planerat issue till PR                               | Egen, efter claude-android |
| `release`                   | Versionshöjning i PR:en och release till skarp drift | Egen, efter claude-android |
| `adr`                       | Nytt beslut i `docs/beslut/`                         | Egen                       |
| `mockup`                    | Före ny eller ändrad GUI                             | Egen, efter claude-android |
| `ux-granskning`             | Granska en vy, mockup eller UX-text                  | Egen, efter claude-android |
| `svelte-core-bestpractices` | Svelte 5: runes, reaktivitet, händelser              | Svelte, oförändrad         |
| `svelte-code-writer`        | Svelte-dokumentation och `svelte-autofixer` via CLI  | Svelte, oförändrad         |
| `wrangler`                  | wrangler: lokalt, D1, R2, deploy                     | Cloudflare, oförändrad     |
| `workers-best-practices`    | Skriva och granska Workers-kod                       | Cloudflare, oförändrad     |

## Agenter

| Agent                | När                                              | Modell     | Källa                      |
| -------------------- | ------------------------------------------------ | ---------- | -------------------------- |
| `granskare`          | Före varje PR: diffen mot reglerna, ändrar inget | sessionens | Egen, efter claude-android |
| `ci-doktor`          | Rött CI: läser loggarna, föreslår en fix         | Sonnet     | Egen, efter claude-android |
| `svelte-file-editor` | Skriva och kontrollera `.svelte`-filer           | sessionens | Svelte, oförändrad         |

Oförändrade kopior har `SOURCE.md` och `LICENSE.txt` i sin katalog och formateras inte av
Prettier (`.prettierignore`), så att de kan bytas mot en ny version rakt av.

## Hooks

| Hook                     | Händelse              | Gör                                                    |
| ------------------------ | --------------------- | ------------------------------------------------------ |
| `verify-before-push.mjs` | Före `git push`       | Kör `npm run verify`, stoppar pushen om den faller     |
| `format-file.mjs`        | Efter varje skrivning | Prettier på filen                                      |
| `plan-approved.mjs`      | Före en ny PR         | Stoppar PR:en utan godkänd plan eller `Liten ändring:` |
| `session-start.mjs`      | Ny molnsession        | `npm ci` och Playwrights Chromium                      |

## I projekttrådar

Projekttrådar startar i `/home/user`, ovanför repot, och läser då inte `.claude/settings.json`.

- **Skills och agenter** hittar Claude Code själv i `.claude/`. Skillsen heter `<namn>`, eller
  `VeckansMat:<namn>` när ett annat repo i tråden har en skill med samma namn. Agenter får
  aldrig prefix; en agent som finns i flera repon ska heta `<repo>-<namn>` (regeln i
  claude-android). `granskare` och `ci-doktor` är unika i dag.
- **Hookarna** bär miljöns setup-skript (`scripts/repo-plugins.mjs` i `ParTee71/claude-android`)
  i pluginen `veckansmat`. De körs bara när händelsen rör repot: `verify-before-push` för en
  push i VeckansMat, `plan-approved` för en PR mot VeckansMat (claude-android #38), och
  sessionsstarten en gång.
- **Behörigheterna** (`deny` och `ask`) läggs i användarinställningarna av samma skript, med
  sökvägarna förankrade i repot (claude-android #40). `allow` följer inte med.
