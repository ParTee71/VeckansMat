# VeckansMat – planering

Beslut tagna 2026-10-23, innan någon kod skrivits. Dokumentet säger vad som är
bestämt och varför, och vad som medvetet lämnats till senare. Ändras ett beslut
skrivs det om här, med datum.

## Två syften

1. **Appen** – veckomeny och inköpslista som hushållet faktiskt använder.
2. **Lära sig styra AI på bästa sätt** – både Claude som utvecklare och Claude
   inne i appen. Därför förklaras varje val av styrning (vad som står i
   `CLAUDE.md`, varför en skill eller hook finns, hur en prompt är byggd) och
   vad som fungerade och inte. Erfarenheterna samlas i `docs/ai-styrning.md`.
   Promptarna i appen mäts med en liten eval (en uppsättning exempelveckor som
   förslagen bedöms mot), så att en ändring visar om den blev bättre eller sämre
   i stället för att gissas.

## Vad appen ska göra

En PWA där hushållet får ett veckoförslag på middagar och en inköpslista ur det.

- Ett **färdigt veckoförslag direkt**, där varje rätt byts med ett tryck.
- Hänsyn till **vilka som äter** (oftast 1–2, upp till 4) och varje persons krav.
- **Menyregler** (t.ex. fisk en gång i veckan, vegetariskt på måndagar) och
  **nya idéer**, så att det inte blir samma rätter varje vecka.
- **Receptsamling**: gamla favoriter in, nya rätter hittas.
- **Inköpslista** som byggs ur veckans recept.

### Den som avgör om appen lyckas

En i hushållet tycker att det är svårt att ta fram en veckomeny, en annan tycker
att det är lätt och gör det i huvudet. Appen måste bli bättre än att göra det i
huvudet, annars används den inte. Det betyder:

- Förslaget kommer först, formulären sist. Ingen ska behöva fylla i något för
  att få en vecka.
- Ett byte är ett tryck. Att ändra en rätt får aldrig kräva mer än att tänka ut
  en själv.
- Appen ska fungera med de recept som finns, även ofullständiga.

I dag hittar hon på menyn ur erfarenhet och skriver den på en lapp. Det ger två
krav till:

- **Erfarenheten finns redan på papper.** De fotograferade handskrivna menyerna
  är just den erfarenheten, och de är det viktigaste underlaget för förslagen:
  vilka rätter som återkommer, hur ofta och hur en vecka brukar se ut.
- **Appen ska kännas som lappen.** Veckan går att redigera som en lista: skriva
  in en rätt med fritext (som blir ett recept med bara namn) ska gå lika fort
  som att skriva på papper.

## Stack

| Del | Val | Varför |
|---|---|---|
| Ramverk | SvelteKit med TypeScript | Typerna fångar misstag innan de når användarna, app och API i en kodbas |
| Komponenter | Material 3 Expressive (`@m3e/web`) | Utseendet som valts i Husjakt, webbkomponenter som fungerar i Svelte |
| Drift | Cloudflare Workers via SvelteKits Cloudflare-adapter | Gratisnivån pausar inte vid inaktivitet, cron ingår |
| Databas | Cloudflare D1 (SQLite) | Gratis, ligger bredvid Workern |
| Bilder | Cloudflare R2 | Receptbilder och foton av recept, gratisnivån räcker |
| Schemalagt | Cloudflare Cron Triggers | För framtida veckojobb (t.ex. erbjudanden) |
| Åtkomst | Cloudflare Access, engångskod via e-post | Gratis upp till 50 personer, ingen egen inloggningskod |
| Kod, issues, CI | GitHub, publikt repo, GitHub Actions | Fria Actions-minuter i ett publikt repo |
| Tester | Vitest (med Cloudflares Workers-pool), Playwright | Körs lokalt och i CI, utan kostnad |

Driftsättning sker från GitHub Actions med wrangler. Varje gren får en egen
förhandsadress med egen testdatabas, så en ändring kan provas i telefonen innan
den går ut skarpt.

### Claude når driften

Claude ska kunna läsa skarp data för att felsöka och följa upp, utan att Cloudflare
Access öppnas för andra:

- En **service token i Cloudflare Access** (gratis) släpper in Claude till API:et.
  Den ligger som hemlighet i Claude-miljön, aldrig i repot.
- För databasen direkt: en **Cloudflare API-token** begränsad till D1 och
  Workers-loggar, också som hemlighet i miljön.
- **Läsa fritt, skriva bara på begäran.** Claude ändrar aldrig skarp data utan att
  någon bett om just den ändringen, och kör aldrig en migrering skarpt innan den
  körts lokalt.

### Användare

Ett hushåll. Ingen uppdelning i flera hushåll i datamodellen från start, men
inget som hindrar att det läggs till.

## Repot är publikt – regler som följer av det

1. **Inga personuppgifter i repot eller historiken.** Namn, allergier, krav och
   hushållets inställningar finns bara i databasen.
2. **Testdata och exempel är alltid påhittade.**
3. **Hemligheter** (Claude-nyckeln, Cloudflare-token) ligger bara som secrets i
   Cloudflare och GitHub, lokalt i `.dev.vars` som aldrig checkas in.
4. **Cloudflare Access framför hela appen och API:et är ett krav.** Utan den kan
   vem som helst som hittar adressen kosta Claude-anrop.

## Claude i appen

Anropen görs från servern med Anthropics TypeScript-SDK. Användarna behöver inget
Claude-konto.

| Uppgift | Modell | Ungefärlig kostnad |
|---|---|---|
| Veckoförslag, byte av rätt | Claude Sonnet 5.5 | ca 0,5 kr per förslag |
| Tolka recept ur text, länk eller foto | Claude Haiku 5.5 | bråkdel av ett öre |

- **Modellen är en inställning**, inte hårdkodad, så att Opus kan provas om
  förslagen inte håller.
- **Svaren kommer som strukturerad data** (rätter, ingredienser, mängder) via
  structured outputs, inte fritext, så att inköpslistan byggs direkt.
- **Prompt caching** på det som är lika mellan anropen (regler, receptsamling).
- **Ett månadstak** i appen (förslag: $5) stoppar anrop när det nåtts, som skydd
  mot buggar som loopar. Kostnaden per anrop loggas.
- **I tester mockas Claude.** Riktiga anrop körs bara som ett litet, manuellt
  prov när promptarna ändrats.

Budget: $100 i API-krediter. Med en plan och ett tiotal byten i veckan räcker det
i flera år.

## Claude som utvecklare

Claude skriver all kod och alla tester. Uppsättningen byggs från början, men
hålls liten och växer när behovet visar sig:

- `CLAUDE.md` med stack, invarianter, språkregler och kommandon.
- Hooks som kör typkontroll och tester före push.
- Några få skills, t.ex. *från issue till PR* och *granska en ändring*.
- CI i GitHub Actions: typkontroll, enhetstester och Playwright på varje PR.

### Best practice i alla steg

Branschens och Anthropics rekommendationer följs. Där ingen etablerad praxis finns
bestäms den tillsammans med ägaren, inte på egen hand.

- **`CLAUDE.md` hålls kort**: vad projektet är, invarianter, kommandon och pekare
  vidare. Detaljer ligger i `docs/` och i skills som laddas när de behövs, så att
  varje session inte bär allt.
- **Beslut skrivs som ADR** (architecture decision records) i `docs/beslut/`, ett
  beslut per fil med datum, sammanhang och följder. Det här dokumentet delas upp
  i sådana när skelettet sätts upp.
- **`main` är skyddad**: ändringar går via PR och kräver grön CI.
- **Kvalitet i CI**: typkontroll (`svelte-check`), ESLint, Prettier, enhetstester
  och Playwright.
- **Beroenden** hålls uppdaterade med Dependabot; secret scanning och push
  protection på (gratis i publika repon).
- **Små PR:er**, en sak per PR.
- **Språk:** engelska i koden (identifierare och kodkommentarer). Allt annat på
  svenska: gränssnitt, `docs/`, commit-meddelanden, issues och PR:er.

Ordning: först besluten (det här dokumentet), sedan AI-verktygen och
ramverkets skelett för det vi vet, sedan funktionerna.

## Recept

Ett recept kräver **bara ett namn**. Allt annat är frivilligt och kan fyllas på
efter hand: ingredienser med mängder, steg, tid, portioner, bild, källa,
taggar. Ett recept med bara namn går att planera in; det bidrar till
inköpslistan först när det har ingredienser.

Vägar in:

- **Länk** – de flesta svenska receptsajter har strukturerad receptdata
  (schema.org/Recipe) i sidan, som läses direkt. Annars tolkar Claude sidan.
- **Kameran** – fotografera en kokbokssida eller ett handskrivet recept direkt
  från appen. Claude läser bilden.
- **Text** – klistra in, Claude tolkar.
- **Bara namnet** – skriv in det och spara.

Tolkningen är ett förslag som går att rätta innan det sparas. Misslyckas den
sparas det som gick att läsa, minst namnet.

**Gamla menyer** – hushållet har foton av handskrivna veckomenyer. De läses in
med kameran eller som bilder, och Claude plockar ut rätterna. Okända rätter blir
recept med bara namn, och menyerna sparas som historik: de visar vad hushållet
faktiskt äter och hur en vecka brukar se ut, vilket gör förslagen bättre från
dag ett.

**Nya recept** föreslås av Claude utifrån favoriter och regler, med webbsökning
när någon ber om det.

## Erbjudanden från butiker

**Inte i första versionen.** ICA, Coop och Willys har inga öppna API:er, och
skrapning av deras sidor är skör och juridiskt oklar. Senare kan vi läsa de
publika erbjudandesidorna en gång i veckan med respekt för `robots.txt`, eller
låta hushållet fotografera reklambladet.

## Öppna frågor


- Vilka krav per person ska stödjas från start (allergier, ogillar, kost)?
- Vilka menyregler behövs från start, och hur formuleras de i appen?
- Ska inköpslistan sorteras efter butikens avdelningar?
- Ska veckoförslaget även täcka lunch, eller bara middag?
