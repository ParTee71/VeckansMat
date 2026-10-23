# Att styra AI – loggbok

Ett av projektets två syften är att lära sig styra AI på bästa sätt. Här
skrivs vad som provats, varför, och hur det gick. Nyast överst. Hur
styrningen är uppbyggd just nu står i
[beslut 0008](beslut/0008-claude-code-uppsattning.md).

## 2026-10-23 – Issue först, och `/simplify` mot för mycket kod

**Vad:** Två regler från ägaren. Varje uppgift som inte är väldigt liten
planeras i ett issue innan den byggs. `/simplify` körs före push, före
`/code-review`.

**Varför så:**

- **Ett issue är en plan som går att granska innan koden finns.** Det är
  billigare att rätta en missuppfattning i fem rader text än i en PR på
  femhundra. Issuet blir också minnet: nästa session läser det i stället för
  att gissa vad som var meningen.
- **AI skriver gärna för mycket.** Claude lägger lätt till skydd, inställningar
  och abstraktioner som ingen bett om. `/simplify` låter fyra granskare leta
  efter kod som kan tas bort, slås ihop eller ersättas med något som redan
  finns. Ordningen spelar roll: förenkla först, granska sedan det som blev
  kvar.
- **Reglerna står där de används**: i `CLAUDE.md` (kort) och som steg i
  `/issue-to-pr`, så att de följs även när ingen påminner.

## 2026-10-23 – Uppsättningen från start

**Vad:** Kort `CLAUDE.md` (under 40 rader), beslut som ADR:er, två skills
(`/issue-to-pr`, `/adr`), tre hooks (verify före push, Prettier efter varje
skrivning, uppstart i molnet) och spärrar i `.claude/settings.json`.

**Varför så:**

- **`CLAUDE.md` läses i varje session**, hela tiden. Allt som står där
  konkurrerar om uppmärksamheten. Anthropics råd är att ha med det Claude inte
  kan räkna ut själv ur koden – kommandon, regler, språk – och skära bort
  resten. Husjakts `CLAUDE.md` växte till nästan 200 rader; här är målet att den
  aldrig gör det.
- **Instruktioner glöms, hooks gör det inte.** "Kör testerna före push" som
  text i `CLAUDE.md` följs för det mesta. Som hook följs den varje gång, och ett
  fel stoppar pushen med felet som svar till Claude.
- **Spärrar framför förbud i text.** Att Claude inte får läsa `.dev.vars` är en
  `deny`-regel, inte en mening. Ett publikt repo tål inte "för det mesta".
- **Skills för arbetsflöden.** En skill laddas bara när den behövs och kan
  därför vara utförlig utan att kosta något i andra sessioner.
- **ADR:er i stället för ett växande planeringsdokument.** Nästa session vet
  inget om dagens samtal. Ett beslut med sitt _varför_ på ett ställe gör att
  Claude inte river upp det i onödan – och vet när det faktiskt bör ändras.
- **Inga egna agenter än.** De gör nytta när en uppgift behöver ett eget
  sammanhang (t.ex. en granskare som inte sett koden skrivas), men varje agent
  är mer att underhålla. De läggs till när behovet visat sig.

**Att följa upp:** Följs reglerna i `CLAUDE.md` utan påminnelse? Stoppar
hooken något på riktigt? Saknas en skill som borde finnas?
