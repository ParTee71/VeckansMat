# 0008. Hur Claude Code styrs i repot

- **Status:** Beslutat. Raderna om skills och agenter är ersatta av 0010. Hur regeln om plan
  före kod hålls står i 0018.
- **Datum:** 2026-10-23

## Sammanhang

Claude skriver all kod. Allt som står i `CLAUDE.md` läses i varje session och
tar plats i varje samtal, så en lång fil späder ut det viktiga. Anthropics råd
är att hålla den kort och flytta resten till det som laddas vid behov.

## Beslut

Varje sorts styrning används till det den är bäst på:

| Verktyg                    | Används till                                                 | Varför där                                           |
| -------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| `CLAUDE.md`                | Vad projektet är, kommandon, regler som aldrig bryts, pekare | Läses alltid, så bara det som gäller i varje session |
| `docs/beslut/`             | Varför saker är som de är                                    | Läses när uppgiften rör beslutet                     |
| Skills (`.claude/skills/`) | Återkommande arbetsflöden: `/issue-to-pr`, `/adr`            | Laddas bara när de behövs                            |
| Hooks (`.claude/hooks/`)   | Det som alltid ska hända                                     | Körs av verktyget, inte av Claudes minne             |
| `.claude/settings.json`    | Vad Claude får köra och läsa                                 | En spärr är säkrare än en instruktion                |

Hooks i dag: `npm run verify` före `git push` (stoppar pushen om den faller),
Prettier på varje fil Claude skriver, och en uppstart som installerar beroenden
i molnsessioner.

Inga egna agenter än. De läggs till när en uppgift visar sig behöva ett eget
sammanhang eller egna verktyg. Inbyggda kommandon (`/code-review`,
`/security-review`) används i stället för egna kopior.

## Följder

- En regel som måste hålla blir en hook eller en spärr, inte en mening till i
  `CLAUDE.md`.
- `CLAUDE.md` hålls under ungefär 60 rader. Växer den, flytta ut.
- Lärdomar om vad som fungerar skrivs i `docs/ai-styrning.md`.
