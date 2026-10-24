# 0003. Drift på Cloudflare

- **Status:** Beslutat
- **Datum:** 2026-10-23

## Sammanhang

Så gratis som möjligt, ingen paus vid inaktivitet, schemalagda jobb ska gå att
lägga till. Kod, issues och CI stannar på GitHub.

## Beslut

- Cloudflare Workers via `@sveltejs/adapter-cloudflare`, konfiguration i
  `wrangler.jsonc`.
- D1 (SQLite) som databas, R2 för bilder, Cron Triggers för schemalagt.
- Driftsättning från GitHub Actions med wrangler. `main` får en egen
  förhandsadress med egen testdatabas (beslut 0012).

## Följder

- Typerna för Cloudflare-bindningarna genereras med `npm run types` (körs av
  `npm ci`) och checkas inte in, eftersom wrangler lägger in byggets utdata i
  filen när ett bygge finns. `checkJs` är avslaget så att bygget inte
  typkontrolleras.
- Playwright provar mot ett riktigt bygge i lokal workerd (`npm run preview`).
- D1 finns sedan beslut 0012; R2 läggs till när bilder behövs.
