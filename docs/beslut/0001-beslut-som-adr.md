# 0001. Beslut skrivs som ADR

- **Status:** Beslutat
- **Datum:** 2026-10-23

## Sammanhang

Claude skriver all kod och börjar varje session utan minne av tidigare samtal.
Ett beslut som bara finns i en chatt finns inte för nästa session. Ett enda
planeringsdokument växer och blandar det bestämda med det öppna.

## Beslut

Varje arkitekturbeslut får en egen fil i `docs/beslut/` (architecture decision
record, enligt Michael Nygards format): sammanhang, beslut, följder. Ett beslut
skrivs inte om; det ersätts av ett nytt.

## Följder

- Claude läser bara de beslut som rör uppgiften, i stället för allt.
- `CLAUDE.md` kan hållas kort och peka hit.
- Ägaren tar besluten; Claude föreslår dem (`/adr`).
