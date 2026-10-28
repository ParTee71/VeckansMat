# 0021. Inloggning med Google genom Cloudflare Access

- **Status:** Beslutat
- **Datum:** 2026-10-26

## Sammanhang

Med engångskod via e-post (0005) möttes man först av Cloudflares inloggningssida och fick sedan
vänta på ett mejl. Ägaren vill logga in med Google och helst inte se Cloudflares sida. Alla i
hushållet har Google-konto.

Två vägar vägdes. Google-inloggning i appen utan Access döljer Cloudflare helt, men lägger
inloggning, sessioner och vitlista som egen kod i det publika repot, där ett fel öppnar appen och
Claude-anropen för vem som helst. Access med Google ger samma säkerhet som i dag utan någon kod.

## Beslut

Cloudflare Access står kvar framför hela appen och API:et, men med Google som enda
inloggningssätt och "Apply instant authentication", så att Access hoppar över sin egen sida och
skickar direkt till Googles kontoval. Engångskoden stängs av. En inloggning håller en månad.
Gäller både drift och förhandsadressen.

## Följder

- Ingen inloggningskod i appen, precis som med 0005. Claudes service token påverkas inte.
- Cloudflares adress syns en kort stund i adressfältet under omdirigeringen.
- Google-klienten (OAuth) ligger i ägarens Google Cloud-projekt; dess hemlighet bara i
  Cloudflare. Slutar Google fungera kan engångskoden slås på igen i Zero Trust.
- Räcker inte detta prövas Google-inloggning i appen i ett eget issue och ett nytt beslut.
- Appen visar vem som är inloggad (#127): e-posten ur huvudet `Cf-Access-Authenticated-User-Email`,
  namn och profilbild ur Access identitetsendpoint `get-identity`, som webbläsaren frågar på appens
  egen adress och skickar vidare (#129; Workern fick inget svar när den frågade själv). Googles
  `picture` kommer bara med när den är tillagd under OIDC Claims på Google-inloggningen i Zero
  Trust (gjort 2026-10-28). Bilden sparas i D1 och hämtas på nytt högst en gång i veckan, bara
  från Google och bara för kontots egen e-post.
