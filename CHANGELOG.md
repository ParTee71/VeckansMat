# Versionshistorik

Det hushållet märker, en rad per ändring. Versionen höjs i PR:en som gör ändringen
(se `.claude/skills/release/SKILL.md`).

## 0.7.0

- Man kan svepa åt vänster eller höger för att byta mellan Veckan, Handla, Rätter och Veckor, i menyns ordning. Sidan följer fingret och nästa vy glider in från sidan. I Handla tar ett svep åt vänster på en vara fortfarande bort den. (#105)
- I Hushållet finns Erbjudanden: slå på de kedjor ni handlar hos, ICA, Willys och Lidl, och välj butik genom att söka på ort. Appen hämtar butikens erbjudanden direkt och sedan varje måndag morgon, och visar när det senast hämtades och om något gick fel. Medlemspriser räknas med och kan stängas av. Coop kommer snart. (#107)

## 0.6.0

- När man öppnar en dag i Veckan visas de rätter hushållet brukar äta direkt, favoriterna först, utan att man behöver skriva något. Under Alla rätter kan man söka och välja bland alla rätter efter sort, och ett nytt namn blir en ny rätt. En dag som redan har en rätt öppnas med texten markerad, så att det man skriver ersätter den. (#103)

## 0.5.0

- En ny rätt får en knapp i Veckan dagen efter: Hur var den? Ett tryck ger tumme upp (Ny favorit), nästa tummen åt sidan (Ok) och nästa tumme ner (Aldrig mer). Samma knapp finns på rättens sida. En rätt med tumme ner föreslår Claude aldrig igen, men den står kvar i Rätter med en liten märkning. (#99)
- Claude föreslår inte samma rätt för ofta. I Hushållet väljer man hur många veckor det minst ska gå innan en rätt kommer igen, 4 från början, och ett kortare värde för favoriter, 2 från början. Claude väljer gärna en favorit som får komma, och favoriter syns med en tumme upp i Rätter och på rättens sida. (#98)
- Appen väntar upp till två minuter på en inköpslista som tar lång tid att göra, i stället för att ge upp efter en minut och börja om. (#96)

## 0.4.0

- Menyknapparna längst ner leder rätt även i Rätter, i stället för att ibland öppna rätten bakom menyn. (#72)
- Ingredienser som Claude gissat står utan de konstiga numren framför, som "3.1". (#71)
- Appen frågar innan en vecka som redan har rätter föreslås om, och om dagar man skrivit in själv ska ligga kvar eller bytas. (#77)
- Varje rätt får en sort, som Soppor, Kött, Fisk eller Vegetariskt, och vad den äts med, som potatis eller pasta. Claude gissar för rätterna som saknar dem, och man kan ändra på rätten. (#82)
- Rättens sida, Ny rätt och Redigera rätt har fått ett lugnare utseende: vita kort på varm bakgrund, ingredienser och steg i kort som kan fällas ihop, numrerade steg, och Spara som ligger kvar överst när man scrollar. (#83)
- Menyn längst ner är en liten ö som svävar över listan, med plats för vyns viktigaste knapp till höger. I Rätter öppnar plusknappen Ny rätt. (#86)
- Handla har fått små avdelningskort som kan fällas ihop, rätterna bakom en vara under en liten info-ikon och plusknappen för en ny vara. Varje vara kan svepas bort åt vänster, med Ångra. Korgen ligger hopfälld längst ned. (#87)
- Rätter visas i ett kort per sort, som Soppor, Kött och Fisk, med hur ofta och när de ätits. Korten kan fällas ihop, och en sökning visar bara sorterna med träffar. (#88)
- Veckan ser ut som en handskriven meny på papper, med lunchen under sin dag och vilka som äter som en rad på menyn. I mörkt läge är menyn ett enkelt kort. (#89)

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
- Det som ligger i korgen kommer inte tillbaka när listan görs om, även om varan heter något annat den gången eller listan görs utan Claude. (#42)
- En dag som skrivs för hand medan Claude föreslår veckan står kvar, och ändras veckan medan listan görs erbjuder appen att uppdatera den. (#49)
- En bock, en dag, vilka som äter, en egen vara, en ny rätt eller en regel sparas i bakgrunden utan att sidan laddas om, så inget på sidan hoppar. (#43)
- Öppnas appen igen en ny dag visar den rätt vecka direkt, och det som pågår för en vecka syns inte på den andra. (#51)
- Rutan om att en ny version finns kommer tillbaka när en ångra-ruta har tagit dess plats en stund. (#52)
- Tillbaka till Nytt recept efter att ett recept sparats läser inte in länken en gång till. (#52)
- Recept läses bara in från länkar som börjar med https://, så att sidan inte kan ändras på vägen. (#53)

## 0.2.0

- Appen har fått en databas för recept och veckomenyer. Den syns inte i appen än. (#18)

## 0.1.0

- Första versionen: startsidan med appens namn och versionen längst ner. (#3, #5)
- Kommer en ny version medan appen är öppen visas "Ny version finns" med knappen "Ladda om". (#5)
