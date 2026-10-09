# VAU Claim System v3.0 - PHP Backend

AS Viljandi Aken ja Uks reklamatsioonisüsteemi PHP REST API backend vastavalt alusspetsifikatsioonile [`Olulised/spec_v3.md`](../Olulised/spec_v3.md) ja [`GEMINI.md`](../GEMINI.md).

---

## 📌 Arhitektuur ja vastavus raudreeglitele

1. **Kood väljaspool veebijuurt (Spec 6.1):**
   * `public/` on ainus avalik kataloog (`DocumentRoot`).
   * Kogu äriloogika (`src/`), kontrollerid, olekumasin ja andmebaas (`storage/`) asuvad veebijuurest väljaspool.

2. **Atomaarne numbrigeneraator (Spec 2.1, 2.4, 3.1):**
   * `ClaimNumberGenerator.php` kasutab serveripoolset eksklusiivset lukustust (`flock(LOCK_EX)`).
   * Genereerib unikaalsed inimloetavad numbrid:
     * Tavakliendid: `P02542`...
     * Testkontod: `T00002`...

3. **Eksplitsiitne olekumasin (Spec 2.3):**
   * `StateMachine.php` valideerib lubatud olekuüleminekud.
   * Kontrollib kohustuslikke põhjendusi (`REJECTED`, `REOPENED`).

4. **Võrguühenduseta töö sünkroonimine (Spec 2.4 F25, 4.3):**
   * Otspunkt `POST /api/sync` võtab vastu PWA / IndexedDB järjekorra kirjed, omistab serveripoolsed ametlikud numbrid ja tagastab sünkroonitud tulemused.

5. **Andmebaas:**
   * Kohalikus arenduses ja prototüüpimisel töötab koheselt SQLite baasil (`storage/claims.sqlite`).
   * Tootmises (nt Zone.eu) toetab MariaDB / MySQL ühendust läbi PDO.

---

## 🚀 Käivitamine

### 1. PHP sisseehitatud veebiserveriga (lokaalne arendus):
```bash
cd backend_php
php -S localhost:3001 -t public
```

### 2. Frontendiga (React + Vite) ühendamine:
Kuna PHP server kuulab porti `3001`, suhtleb olemasolev React frontend (`npm run dev` pordil 5173) sellega automaatselt ilma ühegi konfiguratsioonimuudatuseta!

### 3. Zone.eu / Apache serveris:
Suuna domeeni või alamdomeeni `DocumentRoot` kausta `backend_php/public/`. Kaustas olev `.htaccess` suunab kõik päringud faili `index.php`.
