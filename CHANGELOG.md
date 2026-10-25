# Versionshistorik

Det hushållet märker, en rad per ändring. Versionen höjs i PR:en som gör ändringen
(se `.claude/skills/release/SKILL.md`).

## 0.3.0

- Rätterna och de gamla veckorna syns i appen, med en meny längst ner för Veckan, Rätter och Veckor. (#21)
- En ny rätt läggs till med namnet och ett tryck, och fylls på med ingredienser, steg och taggar när man vill. En rätt kan markeras som att den passar till matlådor. (#21)
- Appen har bytt färg till terrakotta på vit bakgrund. (#21)
- Var och en kan byta appens färg på sin egen telefon: terrakotta, skiffer, salvia, eukalyptus, oliv eller en egen färg. (#22)
- Ett recept kan läggas till från en länk: appen läser in det från receptsidan, och man kollar och sparar. Har rätten bara ett namn fylls den i, och veckorna den ätits ligger kvar. (#25)
- Ett recept kan också läsas in från foton, till exempel två sidor ur en kokbok, från inklistrad text och från receptsidor som appen inte kunde läsa förut. Claude läser det, och man kollar och sparar. (#26)
- Hushållet: personerna med det de inte äter, regler för varje vecka, hur många nya rätter en vecka får ha och hur många extra portioner som lagas till matlådor. Det används när veckomenyn kommer. (#30)
- Startsidan Veckan visar veckans middagar och helgluncher och fylls i som en lapp: tryck på en dag, skriv eller välj en rätt, och Enter går vidare till nästa dag. Rester, Äta ute och Hämtmat finns som snabbval, och lunch går att lägga till en vardag. Här väljs också vilka som äter. Från onsdag visas nästa vecka. (#31)
- Claude föreslår veckan utifrån hushållets gamla veckor och rätter, vilka som äter och veckans önskemål. Varje dag kan bytas med ett tryck, och ett byte kan ångras. Det som skrivits för hand ligger kvar när hela veckan föreslås på nytt. (#32)
- Ny flik Handla med veckans inköpslista: ingredienserna ur veckans rätter, rätt för rätt, och egna varor. Det man bockar av hamnar i korgen, kan ångras och syns på allas telefoner. (#36)
- Claude gör inköpslistan: räknar om till veckans portioner, slår ihop samma vara från flera rätter och sorterar efter butikens avdelningar, med det som brukar finnas hemma sist. Rätter med bara namn får gissade ingredienser, som skrivs in i rätten och kan rättas. Ändras veckan erbjuder appen att uppdatera listan. (#37)
- Öppnas appen igen en ny dag visar den rätt vecka direkt, och det som pågår för en vecka syns inte på den andra. (#51)
- Rutan om att en ny version finns kommer tillbaka när en ångra-ruta har tagit dess plats en stund. (#52)
- Tillbaka till Nytt recept efter att ett recept sparats läser inte in länken en gång till. (#52)
- Recept läses bara in från länkar som börjar med https://, så att sidan inte kan ändras på vägen. (#53)

## 0.2.0

- Appen har fått en databas för recept och veckomenyer. Den syns inte i appen än. (#18)

## 0.1.0

- Första versionen: startsidan med appens namn och versionen längst ner. (#3, #5)
- Kommer en ny version medan appen är öppen visas "Ny version finns" med knappen "Ladda om". (#5)
