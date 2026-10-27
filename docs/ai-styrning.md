# Att styra AI – loggbok

Ett av projektets två syften är att lära sig styra AI på bästa sätt. Här
skrivs vad som provats, varför, och hur det gick. Nyast överst. Hur
styrningen är uppbyggd just nu står i
[beslut 0008](beslut/0008-claude-code-uppsattning.md).

## Prov för #113 – stängs utan merge

Krockar med samma ställe på `main`.

## 2026-10-27 – Grönt CI är inte samma sak som att PR:en går att merga

**Vad hände:** Två trådar höjde båda versionen från 0.6.0 till 0.7.0 på varsin gren. När den
ena mergades fick den andra en konflikt i `CHANGELOG.md` och `package.json`, och ingen session
märkte det förrän ägaren såg det (#113).

**Varför det inte syntes:**

- **En PR med konflikt får inget nytt CI-utfall.** Sessionen väntade på en signal som aldrig
  kom, och det senaste gröna utfallet såg ut som klartecken.
- **Regeln räknades mot en gammal bild av `main`.** Versionsregeln var rätt, men tillämpades när
  grenen skapades och aldrig igen.

**Vad som ändrades:** `implement-issue` kräver att `mergeable_state` läses efter varje push och
före merge, och säger hur konflikter i versionen löses. Workflowen **Konflikter** sätter
etiketten `konflikt` och kommenterar när `main` rört sig, så att den session som bevakar PR:en
väcks av en händelse i stället för att behöva komma ihåg att fråga.

## 2026-10-25 – En regel som inte följdes blev en spärr

**Vad hände:** En tråd öppnade issue #72 och PR #74 samtidigt och mergade, utan att ägaren
sett planen. Regeln "issue först" fanns i `CLAUDE.md` och i skillsen, och ägaren hade påmint om
den flera gånger samma dag.

**Varför en mening inte räckte:**

- **Ett undantag som modellen själv bedömer är inget undantag, det är ett val.** "Utom väldigt
  små och enkla saker" gjorde att Claude kunde resonera sig förbi regeln för varje ändring som
  kändes liten.
- **Ett "planera först" utan "vänta" blir en formalitet.** Skillsen sa att issuet skulle skrivas,
  men inget steg sa att turen skulle sluta där. Att skriva issuet och sedan fortsätta direkt
  följer bokstaven men inte syftet.
- **`CLAUDE.md` är vägledning.** Modellen väger den mot allt annat i uppgiften, och en bråttom
  bugg väger tungt. Det som alltid måste hålla ska köras av verktyget (beslut 0008).

**Vad som ändrades** ([beslut 0018](beslut/0018-plan-fore-kod.md)): regeln utan undantag först i
`CLAUDE.md`, ett uttryckligt STOPP i `refine-issue`, en etikettkontroll först i
`implement-issue`, och två spärrar som inte hänger på Claudes minne: en hook när en PR skapas
och en CI-kontroll som måste vara grön för att merga. Godkännandet blev något synligt
(etiketten `plan-godkänd`) i stället för ett intryck av att ägaren nog tyckte det var okej.

**Lärdom:** Skriv regeln som modellen ska följa utan tolkningsutrymme, säg var den ska stanna,
och sätt en spärr där det kostar mest att glida. En regel som upprepas utan att följas är ett
tecken på att den behöver en hook, inte fler ord.

## 2026-10-25 – Inköpslistan: appen räknar portionerna, Claude slår ihop

**Vad:** Claude Haiku 5.5 gör veckans inköpslista och gissar ingredienser till rätter som bara
har ett namn (#37). Prompten står i `src/lib/server/claude/shopping-prompt.ts` och mäts med
evalen i `evals/handla/`.

**Hur prompten byggdes:**

- **Appen räknar, modellen omvandlar.** Hur många portioner varje rätt ska lagas till räknas i
  koden (vilka som äter, matlåda, två gånger i veckan) och skickas färdigt. Claude räknar bara
  om receptets rader till det antalet och slår ihop.
- **Gissningen och listan i samma svar.** Claude gissar först, i ett eget fält, och gör sedan
  listan av gissningen och receptens rader. Ett anrop i stället för två, och gissningen kan
  sparas i rätten.
- **Avdelningarna som en lista i schemat** (enum), i den ordning appen visar dem. Claude väljer
  bara avdelning, och ordningen kan aldrig bli fel.

**Evalen** (5 fall, regler): första körningen gav 97 % med både låg och medel effort. Det enda
som föll var ett fall där en rätts namn innehöll en instruktion; Claude struntade i den, och
skrev därför rättens namn utan den, så att regeln "något till varje rätt" inte hittade rätten.
Fallet ändrades till en instruktion i en receptrad, och nästa körning gav 100 % med låg effort,
för 0,3 cent för alla fem veckorna.

**Lärdom:** Ett billigt och snabbt jobb ska prövas med den minsta modellen och lägsta effort
först. Att räkna om mängder och sortera varor kräver inte Sonnet, och evalen visar det med
siffror i stället för en känsla.

## 2026-10-25 – Veckoförslaget: vanorna i materialet, reglerna i prompten

**Vad:** Claude Sonnet 5.5 föreslår veckan (#32). Prompten står i
`src/lib/server/claude/menu-prompt.ts` och mäts med evalen i `evals/meny/`.

**Hur prompten byggdes:**

- **Vanorna kommer ur materialet, inte ur prompten.** Prompten säger hur man väljer (husets
  regler, krav, variation, vardag och helg), och hushållets egna rätter, veckor och regler
  skickas som material. Samma prompt fungerar för vilket hushåll som helst.
- **Absolut eller önskemål sägs rakt ut.** Det en person inte kan äta får aldrig bli fel, inte
  heller i alternativen; resten följs när det går. Utan den skillnaden väger modellen en
  allergi mot "fisk en gång i veckan".
- **Appen räknar, modellen väljer.** Veckonummer och hur ofta en rätt ätits räknas ut i koden och
  skickas färdiga, i stället för att modellen ska räkna fram dem ur datum.
- **Materialet först och cachat**, veckan sist. Det som är lika mellan anropen ligger överst i
  meddelandet med en cache-markering, så en andra fråga strax efter blir billigare.
- **Två alternativ per dag i samma svar** gör ett byte direkt och gratis. Bara när de är slut
  görs ett nytt anrop.

**Evalen** (11 fall, regler i stället för en domarmodell): första körningen gav 99 %. Det enda
som föll var att alternativen till en vegetarian upprepade veckans egna rätter; samlingen hade
helt enkelt för få vegetariska rätter. Prompten fick säga att ett alternativ får vara en ny rätt
när samlingen inte räcker, och nästa körning gav 99,8 %: det enda som föll var ett alternativ till söndagens lunch som redan stod i veckan, något appen nu hoppar över vid ett byte. Med låg effort i stället för medel gick
det dubbelt så fort men gav 95 %, och en gång fisk till den som inte äter fisk. Medel fick det,
för 15–20 sekunder och ungefär 3 cent per vecka.

**Lärdom:** En eval som går fel kan peka på fallet lika väl som på prompten. Här var regeln
rimlig men omöjlig med den samlingen, och rätt ändring var att säga vad modellen ska göra när
reglerna inte går ihop.

## 2026-10-25 – Appens första prompt, och en eval som mäter den

**Vad:** Claude Haiku 5.5 läser recept ur foton och inklistrad text (#26). Prompten står i
`src/lib/server/claude/recipe-prompt.ts` och mäts med evalen i `evals/recept/`.

**Hur prompten byggdes:**

- **Formen styrs av ett schema, inte av prompten.** Svaret är strukturerad data (structured
  outputs) med formulärets fält. Modellen kan inte svara i fel form, och prompten kan handla
  om innehållet i stället för om JSON.
- **Varje fält säger vad som gäller när källan är tyst**: `null` för portioner och tid som inte
  står, tomt namn när det inte är ett recept. Det mesta som går fel när text plockas ut är
  gissningar där källan inte säger något.
- **"Skriv av, hitta inte på" först**, med exempel på vad som inte hör till receptet:
  berättelser, kommentarer, reklam.
- **Det inklistrade är material, inte instruktioner.** Texten ligger inom taggar
  (`<recipe_text>`, `<web_page>`) och prompten säger det rakt ut. Evalen har ett fall där texten
  försöker byta namn på rätten.
- **Låg effort.** Att skriva av är inte svårt att resonera om, och Haiku 5.5 tänker annars på
  medel.
- **Evalen bedömer med regler, inte med en annan modell**: namnet, varje förväntad rad, inga
  påhittade rader, stegen. Regler är billiga, ger samma svar varje gång och går att läsa.
  Resultatet sparas så att en promptändring jämförs med förra körningen.

**Första körningen** (Haiku 5.5, två körningar, under en cent var): 98 % och 99 % av 11 fall.
Nio fall blev fulla båda gångerna. `text-meddelande` fick en gång tiden 20 minuter ur "låt
puttra i 20 min". `text-blogg` missade tiden båda gångerna: bloggen säger att rätten "går på en
kvart" och modellen skriver 15 minuter där evalen väntar sig `null`. Det är snarare en tveksam
förväntan i fallet än ett fel i prompten, så prompten är orörd tills det är bestämt vad som ska
gälla. Resultatet ligger i `evals/recept/results/latest.json`.

**Lärdom:** Foton kom aldrig fram, fast enhetsproven var gröna. SvelteKits `use:enhance`
skickar formuläret som vanlig formulärdata om formuläret inte är `multipart/form-data`, och då
försvinner filer som lagts till med JavaScript utan något fel. Webbläsarprovet fångade det, igen.

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

## 2026-10-25 – En regel om hur appen ska kännas

**Vad:** Ägarens önskan att sidan aldrig laddas om när något sparas blev ett beslut
(`docs/beslut/0016-spara-i-bakgrunden.md`) och en egen kontrollpunkt för agenten `granskare`.

**Varför så:**

- **Ett beslut, inte en rad i `CLAUDE.md`.** Regeln gäller bara när en vy sparar något, så den
  behöver inte läsas i varje session. Som ADR har den sitt varför, och Claude läser den när
  diffen rör samma sak.
- **Granskaren kontrollerar den.** En regel som bara står i text glöms ibland; en namngiven
  kontrollpunkt i granskningen före varje PR fångar det som glömts.
- **Ett prov som håller den.** E2E-proven räknar sidans dataladdningar, så ett brott syns som
  ett rött test och inte först i telefonen.

## 2026-10-25 – Mät cachningen innan den behålls eller tas bort

**Vad:** Varje anrop till Claude loggar nu för sig hur mycket som skrevs till och lästes från
cachen (`cache_write_tokens`, `cache_read_tokens` i `claude_call`). Menyprompten markerar
rättsamlingen och gamla veckor som cachebara, men det är inte säkert att det lönar sig (#44).

**Varför så:** Att skriva cachen kostar en fjärdedel extra, och den lönar sig bara om nästa
anrop inom fem minuter börjar likadant. I stället för att gissa mäts det först. Beslutet tas när
appen använts några veckor, utifrån till exempel:

    SELECT purpose, count(*), sum(cache_write_tokens), sum(cache_read_tokens)
    FROM claude_call WHERE created_at >= '2026-11-01' GROUP BY purpose;

En läsning sparar 90 % av priset och en skrivning kostar 25 % extra. Läses mindre än ungefär
28 % av det som skrivs kostar cachen alltså mer än den sparar, och då tas `cache_control` bort.
