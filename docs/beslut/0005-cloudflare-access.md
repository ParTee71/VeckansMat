# 0005. Åtkomst via Cloudflare Access

- **Status:** Beslutat, inloggningssättet ersatt av 0021
- **Datum:** 2026-10-23

## Sammanhang

Appen anropar Claude på hushållets bekostnad. Den som hittar adressen ska inte
kunna använda den. Egen inloggningskod är mycket att skriva och få rätt.

## Beslut

Cloudflare Access med engångskod via e-post framför hela appen och API:et
(gratis upp till 50 personer). Claude når driften med en service token i
Access och en Cloudflare API-token begränsad till D1 och Workers-loggar, båda
som hemligheter i Claude-miljön. Läsa fritt, skriva bara på begäran.

## Följder

- Ingen inloggningskod i appen; vem som är inloggad läses ur Access-huvudet.
- Förhandsadresserna för grenar måste också ligga bakom Access.
