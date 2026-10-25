# 0015. Inköpslistan

- **Status:** Beslutat
- **Datum:** 2026-10-25

## Sammanhang

Steg 4 i planen (`docs/PLANERING.md`): veckans inköpslista ur veckans rätter. Nästan alla rätter
har bara ett namn, så en lista av receptens rader blir nästan tom. Recepten är skrivna för olika
antal portioner, samma vara kommer från flera rätter, och listan används i butiken. Det ska gå
att bocka av tillsammans, och det man skrivit själv eller redan har i korgen får inte försvinna
när veckan ändras. Butikens erbjudanden ingår inte i v1.

## Beslut

- **Listan sparas per vecka** i `shopping_item`, kopplad till veckans meny. Varje rad vet om den
  kommer från ett recept, från Claude eller är skriven för hand (`origin`), och om den ligger i
  korgen. Alla i hushållet ser samma lista.
- **Claude gör listan i ett anrop:** Claude Haiku 5.5 (`SHOPPING_MODEL`) får veckans rätter med
  portioner att laga och receptens rader med vilket antal portioner de gäller. Svaret är
  strukturerad data: rader med vara, mängd, avdelning och rätter.
- **Appen räknar portionerna**, inte Claude: antal gånger i veckan gånger de som äter (två när
  ingen är vald), plus husets extra portioner för en rätt märkt matlåda. Ett recept utan antal
  portioner räknas som fyra.
- **Claude slår ihop och räknar om**: samma vara från flera rätter blir en rad, och mängden räknas
  om till veckans portioner och avrundas till något som går att köpa.
- **En fast ordning på avdelningarna**: Frukt och grönt, Kött och fisk, Mejeri och ägg, Bröd,
  Skafferi, Fryst, Övrigt och sist "Finns kanske hemma" för salt, olja, mjöl och kryddor. Ordningen
  står i koden och följer en vanlig butik; Claude väljer bara avdelning.
- **En rätt med bara namn får gissade ingredienser**, i samma anrop. Gissningen skrivs in i
  rätten och märks (`recipe.ingredients_guessed`), så att hushållet kan rätta den efter hand. Den
  skrivs bara in i en rätt som fortfarande saknar ingredienser, och märkningen försvinner när
  rätten sparas. Tills dess räknas den som en rätt med bara namn, så ett recept från en länk, ett
  foto eller en text kan fylla i den. På listan står "gissat" efter rätten.
- **Det man skrivit själv och det som ligger i korgen ligger kvar** när listan görs om. En vara
  Claude föreslår som redan ligger i korgen läggs inte till igen.
- **"Veckan har ändrats"**: när listan görs sparas vad den gjordes av (`menu.shopping_basis`:
  rätterna, portionerna och raderna). Skiljer det sig från veckan som den är nu
  erbjuder appen att uppdatera listan.
- **Låg effort.** Evalen gav samma resultat med låg som med medel, och låg är snabbare. Ett
  anrop tar 2–9 sekunder och kostar under en tiondels cent per vecka.
- Prompten mäts med evalen i `evals/handla/`, som körs för hand mot det riktiga API:et.

## Följder

- Går anropet fel, eller är månadens tak nått, blir listan receptens rader rätt för rätt, och
  appen säger varför. Rätter med bara namn står då under listan.
- Gissade ingredienser syns i receptet med en rad om att Claude gissat dem.
- Att avdelningarnas ordning är fast betyder att den inte följer en viss butik. Behövs det blir
  det ett eget beslut.
- Varan i korgen känns igen på sitt namn; samma vara med ett annat namn kan komma tillbaka.
