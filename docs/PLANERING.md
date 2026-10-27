# VeckansMat – planering

Vad appen ska göra och för vem, och vad som medvetet lämnats till senare.
Skrivet 2026-10-23, innan någon kod skrevs. De tekniska besluten har flyttats
till [`docs/beslut/`](beslut/README.md).

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
Appen är för ett hushåll. Datamodellen delas inte upp i flera hushåll från
start, men inget ska hindra att det läggs till.

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

## Beslut

De tekniska besluten står i [`docs/beslut/`](beslut/README.md), ett per fil
med sammanhang och följder: stack, drift, det publika repot, åtkomst, Claude i
appen, språk, hur Claude Code styrs och kvalitetskontrollerna.

Ordning: först besluten, sedan AI-verktygen och ramverkets skelett för det vi
vet, sedan funktionerna.

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

Ändrat 2026-10-27 (#106). Kedjorna har inga öppna API:er, men appen läser
deras egna erbjudandesidor en gång i veckan, med respekt för `robots.txt`, för
de kedjor och den butik hushållet valt i Hushållet. Claude väljer gärna rätter
med det som är på extrapris när veckan föreslås, men hushållets regler och krav
går först. Se [beslut 0023](beslut/0023-erbjudanden.md).

## Öppna frågor

- Vilka krav per person ska stödjas från start (allergier, ogillar, kost)?
- Vilka menyregler behövs från start, och hur formuleras de i appen?
- Ska inköpslistan sorteras efter butikens avdelningar?
- Ska veckoförslaget även täcka lunch, eller bara middag?
