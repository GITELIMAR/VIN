# Min Vinkælder
Dansk webapp med lokal lagring, smagsnoter, drikkevinduer, **foto-OCR** og valgfri **Supabase-synkronisering**.

## Start
Netlify publicerer automatisk fra `main`. Åbn hjemmesiden, og klik **Scan etiket** for at vælge eller tage et foto. OCR foregår lokalt i browseren via Tesseract.js; det er **ikke** en verificeret vin-database eller AI-sommelier. Kontroller navn, producent og årgang før lagring. OCR kræver net til indlæsning af bibliotek/model.

## Cloud-opsætning
1. Opret et gratis projekt på https://supabase.com/
2. Åbn SQL Editor og kør `supabase/schema.sql` (én gang).
3. I Authentication → URL Configuration: sæt **Site URL** til Netlify-adressen og tilføj den under **Redirect URLs**.
4. I Authentication → Providers: aktiver Email (magic link).
5. Find **Project URL** og **publishable (eller anon) key** i projektets API-indstillinger.
6. På appens Netlify-adresse klik **Opsæt cloud**, og indtast URL og offentlig nøgle. Brug aldrig service-role eller secret key.
7. Tryk **Send login-link**, og log ind via mail. Ved første login kan du vælge at overføre dine lokale flasker.

**Vigtigt:** Gem en JSON-backup før cloud-aktivering. Cloud-synkronisering håndterer simple ændringer, men samtidige redigeringer på to enheder kan overskrive hinanden. Undlad at redigere offline på flere enheder samtidig. Enhedens login og Supabase-konfiguration gemmes lokalt.
Forvent begrænsninger på gratis planer, inklusive e-mail kvoter og eventuel pausering af inaktive projekter.

## Privatliv
Kun den indloggede bruger kan få adgang til sine vine med row-level security. Del aldrig Supabase service-role/secret key. Billeder uploades **ikke** til serveren i denne version; de analyseres i browseren og gemmes ikke.


## Offentlig, skrivebeskyttet samling
1. Kør [supabase/public-sharing.sql](supabase/public-sharing.sql) i Supabase SQL Editor. Dette skal gøres en gang efter den private database er oprettet.
2. Log ind i appen på `index.html` og kontrollér at status er **Cloud synkroniseret**.
3. Klik **Gør min samling offentlig** for at publicere en kopi af vinene uden private noter eller smagedato.
4. Del linket, som knappen kopierer. Det åbner `public.html`, hvor alle kun kan læse.
5. Brug **Stop offentlig visning** for at fjerne de offentliggjorte data igen.

**Sikkerhed:** Det er databasepolitikker, ikke skjulte knapper, der beskytter mod andres ændringer. `public_wines` giver alle læseadgang til delte metadata, men kun den loggede ejer må skrive eller slette. Det offentlige link indeholder kun Supabases *offentlige* publishable/anon key – aldrig en hemmelig nøgle. Linket er langt. Alle med linket kan se den offentliggjorte liste, og indholdet er ikke privat. Offentliggørelse kræver en aktiv Supabase-login-session, og ændringer synkroniseres ved online ændringer på enheder, der har registreret at samlingen er offentlig.
