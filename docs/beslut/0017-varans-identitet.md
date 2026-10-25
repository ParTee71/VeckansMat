# 0017. En vara är de receptrader den täcker

- **Status:** Beslutat
- **Datum:** 2026-10-25

## Sammanhang

Enligt 0015 kändes en vara i korgen igen på sitt namn. Det höll inte. "Lök" och "Gul lök" blev
två varor. En lista gjord utan Claude kände inte igen Claudes varor, så allt i korgen kom
tillbaka när taket var nått. Rätterna per vara sparades som text, och sidan letade efter
"gissat" med delsträngar.

## Beslut

En vara på listan är de receptrader den täcker: rätten och radens plats i rätten
(`shopping_item_source`). Claude får rätterna och raderna numrerade (1.2 är rätt 1, rad 2),
även de rader den gissar, och anger för varje vara vilka rader den täcker. En lista utan Claude
gör en vara av varje rad.

- **Redan i korgen:** en ny vara läggs inte till när alla dess rader täcks av varor i korgen.
  Regeln är densamma vare sig listan görs med eller utan Claude, och den gäller i samma
  databasanrop som skriver listan.
- **En vara utan rader** (som Claude inte kunde knyta till någon rad) känns igen på sin text,
  som förut.
- **Rätterna under en vara** följer av raderna, och "gissat" av rättens märkning, så inget
  tolkas ur text.

## Följder

- En vara som täcker både en rad i korgen och en ny rad läggs till igen, med Claudes mängd för
  alla raderna. Hellre för mycket på listan än något som saknas.
- En rad pekas ut med sin plats. Ändras rättens rader ändras också veckans underlag, och appen
  erbjuder att göra om listan.
- Det man skrivit själv har inga rader och slås aldrig ihop med Claudes varor; skriver man
  "Mjölk" själv kan Claudes "Mjölk" stå bredvid.
- Prompten och schemat ändras, så evalen i `evals/handla/` mäter att varje rad hamnar på precis
  en vara.
