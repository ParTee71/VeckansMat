# VeckansMat

PWA med veckomeny och inköpslista för ett hushåll. SvelteKit + TypeScript på
Cloudflare Workers. Vad appen ska göra: `docs/PLANERING.md`. Varför saker är
som de är: `docs/beslut/` (ett beslut per fil). Bygg inte förbi ett beslut –
föreslå en ny ADR i stället (`/adr`).

## Kommandon

    npm run dev        # utvecklingsserver
    npm run verify     # typkontroll + lint + enhetstester – kör före varje push (en hook spärrar)
    npm run test:e2e   # Playwright mot ett bygge i lokal workerd
    npm run format     # Prettier på allt
    npm run types      # efter ändring i wrangler.jsonc

## Regler som aldrig bryts

- **Plan före kod, alltid.** Varje bugg och ändring, även små, börjar med ett
  issue med plan (`/refine-issue`). Vänta på ägarens ok (etiketten `plan-godkänd`)
  före gren, kod och PR. Bara ägaren kan släppa på det. Se `docs/beslut/0018-plan-fore-kod.md`.
- **Repot är publikt.** Inga personuppgifter (namn, allergier, hushållets
  inställningar) eller hemligheter i kod, tester, commits eller issues.
  Testdata är påhittad. Hemligheter bara i Cloudflare/GitHub secrets och
  `.dev.vars`. Se `docs/beslut/0004-publikt-repo.md`.
- **Skarp data:** läs fritt, skriv bara när någon bett om just den ändringen.
  Migreringar körs lokalt innan de körs skarpt.
- **Claude-anrop mockas i tester.** Riktiga anrop bara som manuellt prov.
- **Påstå aldrig att något fungerar innan du kört det.**

## Språk

Engelska i koden: identifierare och kodkommentarer. Svenska i allt annat:
gränssnitt, `docs/`, commit-meddelanden, issues och PR:er.

## Arbetssätt

- En sak per PR. Tester skrivs i samma PR som koden. Ändras appen höjs versionen
  och `CHANGELOG.md` får en rad (`/release`). Skarp drift bara vid release.
- Komponenter från `@m3e/web`, registrerade i `src/lib/m3e.ts`.
- `/refine-issue` planerar, `/implement-issue` genomför, `/mockup` före ny GUI.
  Före push: `/simplify`, agenten `granskare`, `/code-review`. Allt: `.claude/README.md`.
- Lärdomar om hur Claude styrs i projektet skrivs i `docs/ai-styrning.md`.
