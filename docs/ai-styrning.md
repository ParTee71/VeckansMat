# Att styra AI – loggbok

Ett av projektets två syften är att lära sig styra AI på bästa sätt. Här
skrivs vad som provats, varför, och hur det gick. Nyast överst. Hur
styrningen är uppbyggd just nu står i
[beslut 0008](beslut/0008-claude-code-uppsattning.md).

## 2026-10-25 – Webbläsarprovet hittade det som ramverkets minne missade

**Vad:** _Nytt recept_ (#25) bär med sig vilken rätt som fylls i som `?till=` i adressen. Claude
skickade det i ett dolt fält i formuläret, som i SvelteKit 2.

**Lärdom:** Enhetsproven var gröna, men webbläsarprovet föll: efter ett misslyckat försök hade
sidan glömt rätten. SvelteKit 3 gör som webbläsaren och landar på formulärets adress efter
inskickning, och `?/read` har ingen annan fråga. Ett dolt fält räckte alltså inte; frågan måste
stå i formulärets adress. Ett prov som går hela vägen i en riktig webbläsare, gärna med ett
misslyckat steg före det lyckade, fångar sådant som en modell med ett äldre ramverk i minnet
skriver fel med full säkerhet.

## 2026-10-24 – Fyra granskare med var sin vinkel hittar olika saker

**Vad:** Rätterna (#21) gick genom `/simplify` (fyra agenter: återbruk, förenkling, effektivitet,
nivå), agenten `granskare` och `/code-review`, i den ordningen.

**Lärdom:** Vinklarna överlappade lite men fångade olika saker. Förenklingen hittade text som
skrivits två gånger, effektiviteten en sparning som läste hela rätten bara för att se att den
fanns, och granskningen en switch som tappade sitt läge när sparningen misslyckades och ett
e2e-prov som berodde på i vilken ordning proven kördes. Den sista sortens fel syns aldrig
när man skriver koden själv, för proven var gröna. Ett annat mönster: webbkomponenter (m3e)
följer inte alla ramverkets antaganden – `false` blir attributet `"false"` och en knapp i
skuggträdet räknas inte som formulärets knapp. Sådant skrivs som en kommentar vid koden, så
att nästa session inte "rättar" tillbaka det.

## 2026-10-23 – Mockup först, och vad skärmdumpen fångade

**Vad:** Uppmaningen "Ny version finns" ritades först som mockup i en Design-canvas, som också
blev mallen för kommande mockuper. Ägaren valde beteendet (ligger kvar tills man trycker)
innan någon kod skrevs, och färgerna sparades till när det finns fler vyer.

**Lärdom:** Proven var gröna, men skärmdumpen i mörkt tema visade en vit sida: `m3e-theme`
färgar bara `<body>` när den ligger direkt under den, och SvelteKit lindar appen i en `div`.
Ett prov som letar efter text ser inte färger – därför tas skärmdumpar i båda temana innan
en ändring i gränssnittet pushas.

## 2026-10-23 – Versioner, och ett exempel på varför ramverkets skill behövs

**Vad:** Semver, `CHANGELOG.md` och skillen `release` efter claude-android. Se
[beslut 0011](beslut/0011-versioner-och-release.md).

**Lärdom:** Claude skrev `import { version } from '$app/environment'` – rätt i SvelteKit 2,
fel i SvelteKit 3, där modulen heter `$app/env`. Typkontrollen fångade det direkt. Det är
precis den sortens minnesfel som Svelte-teamets skills och `svelte-autofixer` finns för, och
skälet till att `npm run verify` körs före varje push i stället för att lita på att koden
"ser rätt ut".

## 2026-10-23 – Officiella skills, och ett arbetsflöde som redan fungerat

**Vad:** Svelte- och Cloudflare-teamens egna skills kopierade in oförändrade. Arbetsflödet
(`refine-issue`, `implement-issue`, `mockup`, `granskare`, `ci-doktor`) anpassat från ägarens
Android-plugin `claude-android`. Se [beslut 0010](beslut/0010-skills-och-agenter.md).

**Varför så:**

- **Den som byggt ramverket vet bäst.** Svelte-teamets `svelte-autofixer` hittar Svelte
  4-syntax och `$effect` som borde vara `$derived` – just de misstag en modell gör när den
  minns ett äldre Svelte. En egen skill skulle skriva av samma råd, sämre och utan underhåll.
- **Kopior, inte pluginer.** En plugin uppdateras av sig själv, vilket låter bra men betyder
  att styrningen ändras utan att någon sett det. En kopia med `SOURCE.md` uppdateras som en
  vanlig PR.
- **Läs främmande skills innan de tas in.** Playwrights healer-agent såg bra ut, men dess
  instruktion säger att ett test den inte får grönt ska märkas `test.fixme()`. Det skulle tyst
  stänga av tester. En skill är kod som styr Claude och granskas som kod.
- **Agent eller skill?** En skill lägger kunskap i samma samtal. En agent får ett eget
  samtal: `granskare` har inte sett koden skrivas och granskar därför friare, och `ci-doktor`
  läser långa loggar utan att fylla huvudsessionen.
- **Projekttrådar laddade inte `.claude/` alls.** Trådarna startar ovanför repot, så hooken
  före push kördes aldrig där. Upptäckt genom att läsa hur claude-android löst samma sak;
  löst med ett setup-skript i miljön.

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
