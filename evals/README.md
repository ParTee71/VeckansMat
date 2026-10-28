# Evaler

Varje mapp mäter en av appens prompter mot påhittade fall, med det riktiga
API:et. Hur en eval körs och bedöms står i mappens README. Det här gäller alla.

## Köra billigt

Evalerna kostar riktiga pengar, mest `eval:meny` med Sonnet (ungefär 45 cent för
en full körning). Därför:

- **Prova med några fall** medan något byggs: `npm run eval:meny -- -t <fall>`.
  En sådan körning jämförs med den sparade och sparas i `results/partial.json`,
  som inte checkas in. `results/latest.json` ändras bara av en körning där alla
  fall blev klara.
- **En full körning** före PR:en, när ändringen är klar. Fler bara om ägaren
  ber om det.
- **Skriv evalkostnaden i PR:en**, från raderna i `costs.jsonl`.

## Tak

En körning stannar när den kostat `EVAL_MAX_USD` dollar, $1 om inget annat
sägs. Fall som inte hunnit börja faller då med ett meddelande om taket, och
körningen sparas som en delkörning. Fall som redan är igång körs klart, och
Vitest kör upp till fem fall åt gången. En menyeval kan alltså gå upp till
ungefär 15 cent över taket.

## Kostnadslogg

Varje körning lägger till en rad i `costs.jsonl`: när, vilken eval, modell, hur
många fall, om alla kördes och vad det kostade. Filen checkas in med PR:en, så
att det syns vad utvecklingen kostar över tid.

## Nyckel

Evalerna körs med en egen nyckel för utvecklingen, i en egen arbetsyta med egen
utgiftsgräns, skild från appens nyckel. Når evalerna gränsen fungerar appen
ändå.
