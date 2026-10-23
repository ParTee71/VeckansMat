# 0004. Publikt repo

- **Status:** Beslutat
- **Datum:** 2026-10-23

## Sammanhang

GitHub Actions är gratis utan minutgräns i publika repon, och secret scanning
med push protection ingår. Men allt i ett publikt repo, inklusive historiken,
kan läsas av vem som helst.

## Beslut

Repot är publikt, med fyra regler:

1. Inga personuppgifter i repot eller historiken. Namn, allergier, krav och
   hushållets inställningar finns bara i databasen.
2. Testdata och exempel är alltid påhittade.
3. Hemligheter ligger bara som secrets i Cloudflare och GitHub, lokalt i
   `.dev.vars`, som aldrig checkas in.
4. Cloudflare Access framför hela appen och API:et (0005).

## Följder

- Claude får inte läsa `.dev.vars` eller `.env*` (`.claude/settings.json`).
- Något som checkats in av misstag måste tas bort ur historiken, inte bara ur
  koden – och hemligheten bytas.
