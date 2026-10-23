# 0002. SvelteKit, TypeScript och Material 3 Expressive

- **Status:** Beslutat
- **Datum:** 2026-10-23

## Sammanhang

Appen är en PWA för mobilen med ett API bakom. Claude skriver koden, så fel ska
fångas av verktyg och inte av användarna.

## Beslut

- SvelteKit med TypeScript i strikt läge: app och API i samma kodbas.
- Komponenter från `@m3e/web` (Material 3 Expressive), webbkomponenter som
  registreras i webbläsaren efter hydrering (`src/lib/m3e.ts`), eftersom de
  kräver `customElements` som inte finns vid serverrendering.
- Skelettet skapades med `sv create` (Svelte CLI) med tilläggen för Prettier,
  ESLint, Vitest, Playwright och Cloudflare-adaptern.

## Följder

- Varje komponent importeras för sig i `src/lib/m3e.ts`, så att bara det som
  används hamnar i bunten.
- Text som renderas på servern syns innan komponenterna laddats; layouten får
  inte förutsätta att de redan finns.
