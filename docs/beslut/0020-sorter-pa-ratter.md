# 0020. Fasta sorter och baser på rätterna

- **Status:** Beslutat
- **Datum:** 2026-10-25

## Sammanhang

Rätter ska visas i hopfällbara kort per sort, som avdelningarna i Handla (#73). De flesta rätter
är bara ett namn från en gammal lapp och har ingen sort, och ingen vill sätta sort på ett
nittiotal rätter för hand. Rätterna har redan fria taggar, men de är vad hushållet skrivit och
blir inte samma ord för samma sak, så de räcker inte för att dela in listan. Ägaren ville också
kunna se vad en rätt äts med: potatis, pasta, ris eller sallad.

## Beslut

Varje rätt har en sort ur en fast lista i koden (Soppor, Kött, Köttfärs, Kyckling, Fisk, Korv,
Vegetariskt, Övrigt) och en bas ur en annan (Potatis, Pasta, Ris, Sallad, Annat). En soppa är
alltid Soppor, vad som än är i den. Claude (Haiku) gissar sort och bas för rätter som saknar dem,
i bakgrunden när Rätter laddas, och hushållet kan ändra dem på rätten. Ett eget val skrivs aldrig
över av en gissning. Taggarna finns kvar som förut.

## Följder

- `recipe.category`, `recipe.base` och `recipe.category_guessed` i databasen, med listorna som
  `CHECK`, så en sort som inte finns kan inte sparas.
- Gissningen tar upp till 100 rätter per anrop; de gamla rätterna kostar ungefär en halv cent en
  gång. Den mäts med `npm run eval:sort`.
- En rätt som Claude inte gav någon sort hamnar under Övrigt och frågas inte om igen. Slår
  månadens tak i stannar rätterna osorterade tills nästa gång Rätter laddas efter en stund.
- En ny sort kräver en ändring i koden och en migrering, inte bara ett nytt ord. Egna sorter är
  utanför omfånget tills någon ber om det.
