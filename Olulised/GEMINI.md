# Projekti juhised ja alusdokumendid (Claim v3)

## 📌 Alusspetsifikatsioon (Source of Truth)
- **Aktiivne Claude artefakt (uuenev algdokument):** https://claude.ai/artifact/8NZ1hmkkPBjA243xZfUyMQ
- **Kohalik peegel:** [`Olulised/spec_v3.md`](file:///c:/Users/Emil-Joosep/OneDrive%20-%20AS%20Viljandi%20Aken%20ja%20Uks/Dokumendid/claim_v3/Olulised/spec_v3.md)

---

## 🛡️ Kohustuslikud reeglid tehisintellekti-arendusagendile

Iga selles projektis töötav arendusagent **PEAB** järgima alltoodud raudreegleid, mis tulenevad otse spetsifikatsioonist:

### 1. Tõeallika ja nõuete järgimine
- Enne mistahes arhitektuuriliste muudatuste, andmebaasimudelite või liidesekomponentide loomist/muutmist tutvu dokumendiga [`Olulised/spec_v3.md`](file:///c:/Users/Emil-Joosep/OneDrive%20-%20AS%20Viljandi%20Aken%20ja%20Uks/Dokumendid/claim_v3/Olulised/spec_v3.md).
- Kui kasutaja teatab, et Claude'i artefakt on uuenenud, palu vajadusel kopeerida muudatused faili `spec_v3.md`.

### 2. Arhitektuursed raudreeglid
- **Kood väljaspool veebijuurt:** `DocumentRoot` sisaldab ainult sisenemispunkti ja kompileeritud staatilisi varasid. Kogu äriloogika, konfiguratsioon, `.env` ja ajutised failid on veebijuurest väljaspool.
- **Üks kasutajaliides:** Üks koodibaas kõigile rollidele. Mitte kunagi luua paralleelseid "vana/uus" või mobiili eriversiooni liideseid.
- **Andmebaas ja terviklus:** InnoDB, `utf8mb4_unicode_ci`, range tüübistus, `FOREIGN KEY` piirangud igal seosel, indeksid igal otsitaval/filtreeritaval veerul. Komaga eraldatud ID-loendid tekstiväljades on rangelt KEELATUD.
- **Transaktsioonid & numbrigeneraator:** Reklamatsiooninumbri (P/T + 5 numbrit) generaator peab olema serveripoolne, atomaarne ja lukustusega (vältimaks kollisioone ja ületäitumist). Võrguühenduseta juhtum saab esialgu kliendis UUID ning lõpliku numbri alles sünkroonimisel.

### 3. Turvalisus ja autoriseerimine
- **Saladused:** Mitte kunagi koodis, repos ega `.env.example`-is. Kõik pärandsaladused (sh M365 konto andmed) peavad olema eraldatud.
- **Autoriseerimine:** Kõik endpointid vaikimisi suletud. Identiteeti ega rolle **EI TOHI** usaldada päringu kehast ega `localStorage`-ist (seansi token peab asuma turvalises `HttpOnly` küpsises). IDOR-kaitse igal objektipäringul.
- **Sisendid:** Rangelt parameetritega päringud (ORM või PDO prepared statements). Identifikaatoreid (tabeli/veerunimed) kontrollitakse ainult valge nimekirja alusel.
- **Failihaldus:** Failid liiguvad Microsoft Graph API kaudu SharePointi (`Sites.Selected`). Kasutajale ei anta kunagi SharePointi otselinke ega genereerita avalikke jagamislinke. Zone.eu kohalik viirusetõrje kontrollib faile enne edastamist.

### 4. Keelatud mustrid (Tarne blokeerijad)
Vaata täielikku nimekirja [`Olulised/spec_v3.md`](file:///c:/Users/Emil-Joosep/OneDrive%20-%20AS%20Viljandi%20Aken%20ja%20Uks/Dokumendid/claim_v3/Olulised/spec_v3.md) 13. peatükist. Iga rikkumine tühistab tarne.
