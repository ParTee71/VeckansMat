# 0019. Typsnitt som följer med appen

- **Status:** Beslutat
- **Datum:** 2026-10-26

## Sammanhang

Veckan ska se ut som en handskriven meny på papper (#89), som lappen hushållet planerar på.
Ägaren valde handstilen "Lappen" i mockupen: Caveat för rubriken och dagarna, Kalam för
rätterna. Resten av appen använder Roboto, som redan finns i Android. Ett typsnitt kan hämtas
från Google Fonts eller följa med appen. Appen ska fungera utan nät i köket och i affären, och
den ska inte skicka hushållets besök till en tredje part.

## Beslut

Caveat (vikt 700) och Kalam (vikt 400) följer med appen som `woff2` i `src/lib/assets/fonts/`,
under SIL Open Font License 1.1 (licensen ligger bredvid filerna). Filerna är beskurna till
latinska tecken med å, ä och ö och de vanligaste skiljetecknen. Appen hämtar inga typsnitt från
andra värdar. Typsnitten används bara på Veckan och laddas med `font-display: swap`. Allt annat i
appen är Roboto som förut.

## Följder

- Typsnitten väger ungefär 70 kB tillsammans och hämtas första gången Veckan öppnas. Sedan
  ligger de i webbläsarens cache, eftersom filnamnen har en hash.
- Ett e2e-prov kräver att Veckan inte gör några anrop till andra värdar.
- Ett tecken utanför urvalet visas i ett reservtypsnitt. Behövs fler tecken skärs filerna om
  från källan (`@fontsource/caveat` och `@fontsource/kalam`) med `pyftsubset`.
- Ett nytt typsnitt eller en ny vikt kräver ett nytt beslut, så att appen inte växer i smyg.
