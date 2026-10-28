---
name: min-vinkaelder
description: Vedligehold og registrer vine i GITELIMAR/VIN. Brug når brugeren sender billeder af vinflasker, beder om drikkevinduer, kvalitetsvurderinger eller ændringer i Min Vinkælder på GitHub Pages/Supabase.
---

# Min Vinkælder – arbejdsgang

## Kontekst
- Repository: `GITELIMAR/VIN`, hovedgren `main`.
- App: `https://gitelimar.github.io/VIN/`.
- `index.html`: brugerflade og lokal lagring; `sync.js`: Supabase-auth og synkronisering.
- Supabase er kilde til sandheden **for en indlogget konto**. Safari og iPhones hjemmeskærmsapp har forskellige lokale sessioner.
- Brug ikke gamle demonstrations-/fotoimporter til automatisk at lægge vine tilbage. Sletninger skal forblive slettede.
- Publicer aldrig passwords, auth-sessioner eller Supabase service-role/secret keys. Supabase publishable key kan være offentlig, men ingen grund til at gentage den.

## Når brugeren sender vinbilleder
1. Identificer producent, cuvée, årgang, størrelse og antal ud fra tydeligt synlige oplysninger. Skeln mellem aflæst og antaget. Bed kun om supplerende etiketfoto, hvis et afgørende felt ikke kan læses.
2. Kontroller ved behov aktuelle producentdata, årgang og seriøse anmeldelseskilder. Brug aldrig opdigtede anmeldelser eller scores.
3. Angiv et konservativt drikkevindue med begrundelse og usikkerhed. Skeln mellem verificerede anmelderpoint med navngiven kilde/årgang og `ChatGPT-estimat` (ikke en faktisk anmeldelse). Manglende score er bedre end en opfundet.
4. Vis et kort forslag med producent, navn, årgang/NV, type, land/region, antal, vindue og score/kilde. Registrér kun de flasker, brugeren har bedt om at tilføje.
5. Kontroller eksisterende vin før tilføjelse: match på producent + cuvée + årgang + flaskeformat. Ingen dubletter eller stiltiende ændring af antal.
6. Foretræk sikker registrering via en indlogget app/Supabase-operation, hvis en passende, autoriseret write-forbindelse findes. GitHub-kodeændringer er **ikke** det samme som at skrive til brugerens database. Hvis der ikke er database-write-adgang, sig det åbent og giv en sikker app-import/indtastningsvej. Opret **aldrig** en start-up-seed, en blind upsert eller en permanent auto-import for at simulere registrering.
7. Hvis importfunktionalitet er nødvendig, design en eksplicit, brugerstyret import, med deduplikering, mulighed for forhåndsvisning, og respekt for slettede vine. Gem ikke private vinoplysninger i et offentligt repository uden brugerens accept.

## Når der ændres i koden
1. Hent seneste indhold og blob-SHA via GitHub før ændringer, undersøg afhængigheder og synkroniseringsflow.
2. Ændr mindst muligt, test syntaks og de relevante tilstande. Lav om muligt en lille selvstændig regressionstest: første login, tom cloud, sletning, redigering, to enheder, reload, utilgængelig cloud.
3. Ved sletning: afvent bekræftet Supabase-delete (og bekræftet rækkeantal), før UI viser succes. Aldrig genopret slettede poster fra lokale cacher.
4. Beskyt eksisterende data: ingen automatisk upload af forældede lokale poster. Ved tvivl: stop skrivninger, bevar backup og vis tydelig fejl. Lav ikke migrationer, bulk-delete eller nulstilling uden udtrykkelig godkendelse.
5. Opdater `sync.js` versionsetiket og cache-busting reference i `index.html`, når det er relevant.
6. Commit ændringer i `GITELIMAR/VIN` med en præcis besked. Fortæl brugeren hvad der konkret er ændret, og at live-funktionaliteten ikke er testet på deres enhed, hvis den ikke er verificeret.

## Format på svaret
Skriv kort på dansk: hvad flasken er, hvad der er sikkert/estimeret, hvad der er registreret hvor, samt eventuelle nødvendige næste skridt. Lov ikke, at Supabase er opdateret, alene fordi et GitHub-commit blev oprettet.
