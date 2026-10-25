# 0014. Claude föreslår veckan

- **Status:** Beslutat
- **Datum:** 2026-10-25

## Sammanhang

Steg 3 i planen (`docs/PLANERING.md`): Claude föreslår veckans middagar och helgluncher, och en
dag ska kunna bytas med ett tryck. Att ändra veckan ska gå lika fort som på lappen, så ett byte
får inte ta tio sekunder. Det som avgör ett bra förslag är hushållets egna vanor, vilka som äter
den veckan och vad de inte äter, och husets regler (#30). Sonnet 5.5 kostar $2 per miljon tokens
in och $10 ut, och månadstaket är $5 (0006).

## Beslut

- **Ett anrop per vecka.** Claude Sonnet 5.5 (`MENU_MODEL`) får hela samlingen med taggar, hur
  många gånger och vilken vecka varje rätt senast åts, de åtta senaste veckorna dag för dag,
  husets regler, vilka som äter med sina krav, veckans önskan, det som redan står i veckan och
  vilka dagar som ska fyllas. Svaret är strukturerad data: rätt, ett kort skäl och två
  alternativ per dag.
- **Alternativen sparas** i `menu_item.alternatives`, så ett byte tar nästa alternativ direkt
  och utan anrop. Ett alternativ som skrivits en annan dag hoppas över. När de är slut frågar
  appen Claude om tre nya för den dagen, utan något som valts bort där
  (`menu_item.passed_on`).
- **Det som skrivits för hand ligger kvar.** En rad med skäl (`menu_item.reason`) är Claudes; en
  rad utan är skriven för hand. Nytt förslag på hela veckan ersätter bara Claudes rader, och
  bara Claudes rader har en knapp för att byta.
- **Ångra** ett byte: appen skickar tillbaka dagen som den var.
- **Krav är absoluta när det är något en person inte kan äta**, som allergier och "äter inte
  fisk". Andra krav och önskemål följs när det går. Veckans önskan går före vanorna.
- **Veckans önskan** sparas i `menu.wish`, inte i `menu.note` som har det som stod på en gammal
  lapp.
- **Antalet nya rätter** per vecka är husets inställning (0–3). En ny rätt blir ett recept med
  bara namn när den står i veckan, som när den skrivs för hand.
- **Medel effort.** Evalen gav 99,8 % med medel och 95 % med låg, och låg föreslog en gång fisk
  till den som inte äter fisk. Medel tar 15–20 sekunder och kostar ungefär 3 cent per vecka.
- **Prompt caching** på hushållets material (samlingen, veckorna och reglerna), som är lika
  mellan anropen tills något ändras. Systemprompten och materialet är över 512 tokens, det
  minsta Sonnet 5.5 cachar. En andra fråga inom fem minuter, som tre nya rätter för en dag,
  läser materialet för en tiondel av priset. Kostnaden räknar in skrivning och läsning av
  cachen.
- Prompten mäts med evalen i `evals/meny/`, som körs för hand mot det riktiga API:et.

## Följder

- Ett förslag tar 15–20 sekunder, så appen visar att Claude arbetar. Byten är direkta tills
  alternativen är slut; då tar de några sekunder.
- Går anropet fel, eller är månadens tak nått, står veckan kvar som den var och fylls i för
  hand.
- En ny rätt som byts bort ligger kvar i Rätter med bara namn.
- Namnen och kraven på de som äter skickas till Anthropics API, som all annan data i anropen.
  De finns aldrig i repot; evalen använder påhittade hushåll.
- Webbläsarproven använder samma påhittade Claude som för recepten. Provet som spenderar
  månadens tak körs sist, så att det inte stoppar de andra.
