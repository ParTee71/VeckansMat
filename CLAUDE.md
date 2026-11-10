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

- **Plan före kod bara för större ändringar:** nytt beteende, flera lager, datamodell
  eller ett vägval → issue med plan (`/refine-issue`) och ägarens ok (`plan-godkänd`
  eller "kör") före gren, kod och PR. Små fixar och dokument går direkt till PR med
  raden `Liten ändring: <varför>` och mergas när CI är grön. Osäker → större. Skill
  `android:arbetsregler` är enda källan; se `docs/beslut/0024-plan-bara-for-storre-andringar.md`.
- **Repot är publikt.** Inga personuppgifter (namn, allergier, hushållets
  inställningar) eller hemligheter i kod, tester, commits eller issues.
  Testdata är påhittad. Hemligheter bara i Cloudflare/GitHub secrets och
  `.dev.vars`. Se `docs/beslut/0004-publikt-repo.md`.
- **Skarp data:** läs fritt, skriv bara när någon bett om just den ändringen.
  Migreringar körs lokalt innan de körs skarpt.
- **Claude-anrop mockas i tester.** Riktiga anrop bara som manuellt prov.
- **Påstå aldrig att något fungerar innan du kört det.**
- **Ärliga svar:** säg emot när ägaren har fel, och varför. Inget beröm, inga
  artighetsfraser eller ursäkter, ingen utfyllnad. Säg vad som inte är kontrollerat,
  och mjuka inte upp ett nej.

## Språk

Engelska i koden: identifierare och kodkommentarer. Svenska i allt annat:
gränssnitt, `docs/`, commit-meddelanden, issues och PR:er.

## Modellval

- Opus 5.5 (`claude-opus-5-5`) är standard för sessionen och varje agent.
- Fable 5.2 (`claude-fable-5-2`) är ok när det behövs – svår arkitektur eller design,
  knepiga integrationer, långa agentuppgifter, buggar Opus inte klarat – men används
  försiktigt för kostnadens skull: medium eller high effort, aldrig max eller fast mode.
- Säg varför och vilken effort innan du byter till Fable 5.2. Planera med Fable,
  genomför med Opus när det går.
- Fable 5.1 används inte längre.

## Arbetssätt

- En sak per PR. Tester skrivs i samma PR som koden. Ändras appen höjs versionen
  och `CHANGELOG.md` får en rad (`/release`). Skarp drift bara vid release.
- Komponenter från `@m3e/web`, registrerade i `src/lib/m3e.ts`.
- `/refine-issue` planerar, `/implement-issue` genomför, `/mockup` före ny GUI.
  Före push: `/simplify`, agenten `granskare`, `/code-review`. Allt: `.claude/README.md`.
- Lärdomar om hur Claude styrs i projektet skrivs i `docs/ai-styrning.md`.
