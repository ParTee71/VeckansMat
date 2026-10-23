# 0006. Claude i appen

- **Status:** Beslutat
- **Datum:** 2026-10-23

## Sammanhang

Veckoförslag och tolkning av recept görs med Claude. Budgeten är $100 i
API-krediter, och användarna ska inte behöva något Claude-konto.

## Beslut

- Anrop från servern med Anthropics TypeScript-SDK.
- Claude Sonnet 5.5 för veckoförslag och byten, Claude Haiku 5.5 för att tolka
  recept ur text, länk eller foto. Modellen är en inställning.
- Svar som strukturerad data (structured outputs), prompt caching på det som är
  lika mellan anropen, ett månadstak (förslag $5) och kostnad loggad per anrop.
- Claude mockas i tester. Promptarna mäts med en liten eval.

## Följder

- Nyckeln ligger bara som Cloudflare secret.
- En promptändring bedöms mot evalen, inte efter känsla.
