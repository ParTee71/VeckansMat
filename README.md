# VeckansMat

Veckomeny och inköpslista för hushållet. En PWA byggd med SvelteKit på
Cloudflare Workers.

- Vad appen ska göra: [`docs/PLANERING.md`](docs/PLANERING.md)
- Varför den är byggd som den är: [`docs/beslut/`](docs/beslut/README.md)
- Hur Claude styrs i projektet: [`docs/ai-styrning.md`](docs/ai-styrning.md)

## Komma igång

Kräver Node 22.13 eller senare (CI kör Node 24, se `.nvmrc`).

    npm ci
    npm run dev        # http://localhost:5173
    npm run verify     # typkontroll, lint och enhetstester
    npm run test:e2e   # Playwright (första gången: npx playwright install chromium)
