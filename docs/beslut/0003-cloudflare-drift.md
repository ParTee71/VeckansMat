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
- Driftsättning från GitHub Actions med wrangler. Varje gren får en egen
  förhandsadress med egen testdatabas.

## Följder

- Typerna för Cloudflare-bindningarna genereras med `npm run types` (körs av
  `npm ci`) och checkas inte in, eftersom wrangler lägger in byggets utdata i
  filen när ett bygge finns. `checkJs` är avslaget så att bygget inte
  typkontrolleras.
- Playwright provar mot ett riktigt bygge i lokal workerd (`npm run preview`).
- D1, R2 och driftsättningen läggs till när ägarens Cloudflare-konto är
  uppsatt; skelettet har inga bindningar än.
