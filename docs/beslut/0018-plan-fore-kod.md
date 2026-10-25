# 0018. Plan före kod, med spärr

- **Status:** Beslutat
- **Datum:** 2026-10-25

## Sammanhang

Regeln "issue först" stod i `CLAUDE.md` och i skillsen, med undantaget "utom väldigt små och
enkla saker". Den följdes inte: en tråd öppnade issue #72 och PR #74 samtidigt och mergade utan
att ägaren sett planen. Tre saker gjorde det möjligt. Undantaget lät Claude själv avgöra vad som
var litet. Inget steg sa att Claude skulle stanna och vänta. Och ingenting stoppade en PR utan
godkänd plan, så regeln hängde helt på att Claude kom ihåg den.

[Beslut 0008](0008-claude-code-uppsattning.md) säger redan att en regel som måste hålla blir en
hook eller en spärr, inte en mening till i `CLAUDE.md`. Det är också Anthropics råd: `CLAUDE.md`
är vägledning som modellen kan väga bort, hooks och kontroller körs alltid.

## Beslut

Varje bugg, ändring och funktion börjar med ett issue med plan, utan undantag som Claude
bedömer. Planen är godkänd när issuet har etiketten `plan-godkänd`. Claude sätter den bara när
ägaren skrivit ok, och skriver då en kommentar på issuet om var och när.

Regeln hålls på flera ställen, från mjukt till hårt:

| Lager                        | Vad                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `CLAUDE.md`                  | Regeln, först bland reglerna som aldrig bryts                                         |
| `refine-issue`               | Slutar med ett stopp: visa issuet och vänta på ägarens ok                             |
| `implement-issue`            | Börjar med att läsa issuets etiketter                                                 |
| Hook `plan-approved.mjs`     | Stoppar Claude när en PR skapas mot ett issue utan etiketten                          |
| CI-kontrollen `Plan godkänd` | Samma kontroll på varje PR, oberoende av Claude; obligatorisk för att merga till main |

Bara ägaren kan släppa på regeln för en enskild ändring. Då står `Utan plan: <ägarens ord, tid>`
i PR-texten, och både hook och CI godtar det. Dependabot-PR:er har inget issue och undantas.

## Följder

- Även en rad ändring tar ett issue och ett ok. Det kostar minuter men ger ägaren chansen att
  säga nej eller ändra innan något byggts.
- GitHub kan inte skilja på ägaren och Claude, eftersom Claude använder ägarens konto. Etiketten
  är därför ett tydligt och synligt steg, inte ett bevis. Kommentaren på issuet gör det
  spårbart.
- Hooken fångar bara GitHub-verktyget som skapar PR:er. En PR skapad på annat sätt, till
  exempel med `gh pr create`, stoppas av CI-kontrollen.
- Hooken frågar GitHub. Når den inte fram släpper den igenom med en varning, och CI-kontrollen
  avgör i stället.
- Spärren sitter vid PR och merge, inte vid commit: det går inte att veta vilket issue en commit
  hör till utan att gissa. Skillsen stoppar tidigare.
