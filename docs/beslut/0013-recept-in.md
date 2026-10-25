# 0013. Recept in från länkar

- **Status:** Beslutat
- **Datum:** 2026-10-25

## Sammanhang

Ett recept ska kunna läggas till från en länk, ett foto eller text (`docs/PLANERING.md`). De
flesta receptsajter har receptet som strukturerad data i sidan, schema.org/Recipe i JSON-LD.
Den kan läsas direkt, snabbt och utan kostnad, medan Claude kostar pengar och kan ta fel.
Appen hämtar sidan själv, på servern, så den får inte kunna användas för att nå annat än
vanliga webbsidor.

## Beslut

- En länk läses ur sidans JSON-LD, **utan Claude**. Claude används bara för foton, text och
  sidor utan JSON-LD (#26).
- Sidan hämtas av servern bara från `http` och `https` på ett namngivet värdnamn: inga
  IP-adresser, `localhost` eller namn utan punkt, inga inloggningsuppgifter i länken. En
  omdirigering kontrolleras på samma sätt, högst fem i rad. Högst 10 sekunder och 2 MB.
- Kontrollen gäller adressen, inte vart namnet pekar. Ett namn som pekar på en intern adress
  stoppas av Cloudflare, vars Workers inte når privata nät.
- Sidan läses i den teckenuppsättning servern eller sidan anger, annars UTF-8.
- Ingrediensraderna sparas som de står i sidan. Mängd, enhet och namn tolkas inte än.
- Sajtens kategorier blir **inte** taggar, så att taggarna förblir hushållets egna.
- Det inlästa är ett förslag som visas i formuläret och rättas innan det sparas.
- Har en rätt med samma namn bara ett namn fylls den i, så att veckorna den ätits följer med.
  Det den redan har och sidan saknar, som taggar och matlådor, ligger kvar.
  Har den redan ingredienser eller steg får den nya ett annat namn; den gamla ersätts inte.
- Foton som läses in sparas inte (#26). Bilder i R2 kan komma senare.

## Följder

- Sajter som stänger ute okända besökare ger ett fel. Då går receptet att fylla i för hand
  med länken sparad, och senare att läsa från ett foto eller inklistrad text.
- Webbläsarproven läser länkar från en påhittad sajt på `localhost`. Det tillåts bara när
  `ALLOW_LOCAL_FETCH` är `true`, vilket bara proven sätter.
