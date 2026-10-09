# Claim v3 spetsifikatsioon
> **Allikas (Source of Truth):** https://claude.ai/artifact/8NZ1hmkkPBjA243xZfUyMQ  
> **Staatus:** Baasdokument ja arhitektuuri alusdokumentatsioon kogu edasiseks arenduseks.

---

## Prioriteedikeel
- **PEAB**: Kohustuslik. Tarne lükatakse tagasi, kui puudub.
- **EI TOHI**: Absoluutne keeld. Iga esinemine on tarne blokeerija.
- **PEAKS**: Tungivalt soovitatav; kõrvalekalle tuleb kirjalikult põhjendada.
- **VÕIB**: Valikuline, kui aeg lubab.

---

## 1. Roll ja ülesanne
Sa oled vanem-tarkvaraarhitekt ja -arendaja. Sinu ülesanne on projekteerida ja ehitada veebirakendus, mis haldab akende ja uste tootepuuduste reklamatsioonide kogu elutsüklit alates edasimüüja esitatud avaldusest kuni kulude kinnitamise ja juhtumi sulgemiseni.

Tarne ei ole prototüüp. See on tootmissüsteem, mis:
- **Töötleb isikuandmeid** — edasimüüjate ja lõppklientide nimed, aadressid, telefoninumbrid, e-postid ning fotod nende kodudest ja objektidelt. GDPR kohaldub täies ulatuses.
- **On aluseks rahalistele otsustele** — kulupakkumiste kinnitamine ja kulude jaotus kulukontode vahel. Auditijälg peab olema tõenduskõlblik.
- **Töötab kuues keeles avalikul poolel:** eesti, inglise, soome, rootsi, norra, taani.
- **Asendab süsteemi**, mille tegelik maht on ~2500 uut reklamatsiooni ja ~17 000 üleslaaditud faili aastas (~25 GB/aastas), kokku juba üle 100 000 faili ja 150 GB ning kasvav.

Asendatav pärandsüsteem on PHP 5/7 ajastul kirjutatud, versioonihalduseta, testideta ja suures osas autoriseerimiseta. Uus süsteem ei ole selle refaktoreering — see on uus rakendus, mis võtab üle ärifunktsiooni ja andmed.

---

## 2. Ärivaldkond

### 2.1 Domeeni sõnastik
| Mõiste | Tähendus |
| :--- | :--- |
| **Reklamatsioon (claim)** | Ühe tootepuuduse juhtum: kes esitas, mis toode, mis viga, mis sai tehtud, mis see maksis |
| **Edasimüüja (klient)** | Juriidiline isik, kes müüb VAU tooteid ja esitab reklamatsiooni. Igal on kliendinumber |
| **Lõppklient** | Isik, kelle juures toode on paigaldatud. Ei suhtle süsteemiga otse — tema andmed sisestab edasimüüja |
| **Käsitleja** | VAU töötaja, kes menetleb juhtumit algusest lõpuni |
| **Kinnitaja** | VAU töötaja, kes kinnitab või lükkab tagasi kulude kandmise ettepaneku |
| **Teenusmeeskond** | Paigaldus-/parandusbrigaad, kes käib objektil vea kõrvaldamas |
| **Defektitüüp** | Klassifikaator: mis liiki viga see oli (hallatav nimekiri) |
| **Tootekategooria** | Kaheastmeline puu (peakategooria → alamkategooria), nimed kõigis kuues keeles |
| **Kulupakkumine (kulukandja ettepanek)** | Ettepanek, kes kulu kannab — nt tootmine, tarnija, vedaja, müük. Hallatav nimekiri |
| **Kulukonto** | Raamatupidamise konto/osakond, millele kulu lõpuks kirjutatakse |
| **Osa** | Kinnituse protsent 0–100. Üks juhtum võib jaguneda mitme kulukonto vahel; kinnitatud osade summa on 100 |
| **Tagasilükkamine** | Kinnitaja keeldub kulu kandmast; põhjus on kohustuslik |
| **Reklamatsiooninumber** | Inimloetav tunnus kujul P + 5 numbrit (tavaklient) või T + 5 numbrit (testkonto) |

### 2.2 Osapooled ja rollid
| Roll | Kirjeldus | Ligipääsu ulatus |
| :--- | :--- | :--- |
| **Edasimüüja** | Esitab reklamatsiooni avaliku vormi kaudu, jälgib oma juhtumite seisu | Ainult oma esitatud juhtumid |
| **Käsitleja** | Loob ja menetleb juhtumeid: märkmed, teenus, kulupakkumised, lõpetamine | Talle määratud juhtumid; loodud juhtum määratakse vaikimisi talle |
| **Kinnitaja** | Kinnitab või lükkab tagasi kulupakkumisi | Juhtumid, mille kulupakkumine puudutab tema kulukontosid |
| **Teenusmeeskond** | Näeb talle määratud töid, märgib teenuse tehtuks, lisab fotod ja märkmed | Talle määratud tööd |
| **Admin** | Haldab kasutajaid, rolle, kategooriaid, tõlkeid, klassifikaatoreid | Kõik |
| **Vaatleja (finants/ERP)** | Loeb juhtumeid ja kulusid aruandluseks, ei muuda midagi | Kitsendatud, ilma lõppkliendi kontaktandmete ja fotodeta |

- **PEAB**: rollid on andmebaasis eraldi tabelis. Kasutajal võib olla mitu rolli. Õigused on õiguspõhised (*permission-based*) — kood kontrollib nimetatud õigust (`claim.approve`), mitte rollinime ega kasutaja ID-d.

### 2.3 Reklamatsiooni elutsükkel
```
[Esitatud] (klient on vormi saatnud, käsitlejat pole)
  │
  ▼
[Käsitleja määratud] (üks või mitu käsitlejat juhtumi kohta)
  │
  ▼
[Töös] (käsitleja on menetlust alustanud)
  │
  ▼
[Teenus määratud] (meeskond ja külastuse kuupäev on paigas)
  │
  ▼
[Teenus tehtud] (töö objektil on lõpetatud)
  │
  ▼
[Kulupakkumine esitatud] (käsitleja on teinud ettepaneku, kes kulu kannab)
  │
  ▼
[Kinnitamisel] ──► [Kinnitatud] (kinnitatud osade summa = 100%)
  │
  ▼
[Lõpetatud]

Kõrvalharud:
- [Tagasi lükatud] käsitleja hindab, et reklamatsioon ei ole põhjendatud
- [Pakkumine tagasi lükatud] kinnitaja keeldub; põhjus kohustuslik; käsitleja teeb uue ettepaneku
- [Uuesti avatud] lõpetatud juhtum avatakse; põhjus kohustuslik
```

- **PEAB**: olekumasin on eksplitsiitne ja tsentraalne — üks moodul, mis defineerib lubatud üleminekud. Iga üleminek kontrollib õigusi, valideerib eeltingimused ja kirjutab auditikirje.
- **EI TOHI** muuta olekut äriloogika kõrvalmõjuna. Pärandsüsteemis muutub juhtum "Töös" olekusse siis, kui käsitleja lisab esimese märkme — see on peidetud kõrvalmõju, mida ükski liidese element ei selgita. Kui see reegel on äriliselt soovitud, PEAB see olema olekumasinas nimetatud reegel koos nähtava selgitusega.

### 2.4 Funktsionaalne ulatus
**PEAB (v3.0 tarne):**
- **F1**: Avalik mitmekeelne reklamatsioonivorm (6 keelt, failide üleslaadimine, mobiili-esmane ja katkestuskindel)
- **F2**: Edasimüüja tuvastamine ja andmete eeltäitmine kliendinumbri alusel
- **F3**: Reklamatsiooninumbri genereerimine (P/T + 5 numbrit, unikaalne, atomaarne, ilma ületäitumiseta)
- **F4**: Autentimine, seansihaldus, rollid ja õigused
- **F5**: Otsing ja filtreerimine (staatus, periood, edasimüüja, defektitüüp, kategooria, käsitleja, meeskond, kulukonto, märkme sisu, number, leheküljestatud)
- **F6**: Reklamatsiooni detailvaade (andmed, galerii, märkmed, kulupakkumised, ERP-andmed, ajajoon)
- **F7**: Käsitlejate määramine (mitu käsitlejat juhtumi kohta, logitakse)
- **F8**: Märkmed nelja tüübiga: (1) lisainfo, (2) käsitleja märkmed, (3) teenuse märkmed, (4) tagasilükkamise põhjus
- **F9**: Teenuse haldamine (meeskond, kuupäev, lõpetamine, kirjeldus)
- **F10**: Kulupakkumised ja kinnitamine (mitu pakkumist, % 0-100, tagasilükkamine põhjusega)
- **F11**: Kulukontode ja osakondade haldus
- **F12**: Kasutajate haldus
- **F13**: Tootekategooriate puuhaldus (kaheastmeline puu, 6 keeles)
- **F14**: Liidese tõlgete haldus (6 keelt, versioonitud)
- **F15**: Defektitüüpide haldus
- **F16**: Teenusmeeskondade haldus (pehme kustutamine, duplikaatkontroll)
- **F17**: Edasimüüjate haldus
- **F18**: Auditilogi ja ajajoon
- **F19**: PDF-aruanne
- **F20**: E-posti teavitused
- **F21**: Tähtaegade jälgimine (tegevuseta juhtumid > 7 päeva vaikeväärtusena)
- **F22**: Andmete eksport (CSV/Excel)
- **F23**: Statistika ja töölauad
- **F24**: Käsitleja loob juhtumi (sama andmekoosseis mis avalikul vormil, allika märge)
- **F25**: Võrguühenduseta töö ja sünkroonimine (IndexedDB, väljapõhine konfliktilahendus)

**PEAKS (v3.1):** kliendi rahuloluküsitlus pärast juhtumi lõpetamist; ERP kahesuunaline andmevahetus; fotode annoteerimine (defekti ringitamine, nooled).

### 2.5 Avaliku vormi sisu
- **Edasimüüja andmed** (eeltäidetud, muudetavad): esindus/ärinimi, kontaktisik, aadress, e-post (võib olla mitu), telefon, riik (EST, LAT, LTU, DNK, FIN, SWE, NOR).
- **Toote andmed**: peakategooria, alamkategooria, toote nimetus, toote detailnimetus, tellimuse number, tootmis-/seerianumber, kogus (täisarv ≥ 1), mõõdud, kas toode on paigaldatud.
- **Vea kirjeldus**: vabatekst (vähemalt 6000 tähemärki), üleslaaditud failid.
- **Lõppkliendi andmed** (valikulised): kontaktisik, aadress, telefon, e-post, kas kohapealne ülevaatus on vajalik.
- **Automaatselt**: esitamise kuupäev ja kellaaeg, esitamise keel, reklamatsiooninumber, esitaja IP.

### 2.6 Kasutajavood
- **Edasimüüja**: valib keele → tuvastab end → täidab vormi → lisab fotod → esitab → saab ekraanil ja e-postiga numbri ning jälgimislingi.
- **Käsitleja**: logib sisse → näeb töölauda → avab juhtumi → määrab end käsitlejaks → lisab märkme → vaatab fotosid/ERP-andmeid → täpsustab andmeid → määrab teenusmeeskonna ja kuupäeva → märgib teenuse tehtuks → esitab kulupakkumise → pärast kinnitamist lõpetab.
- **Käsitleja objektil, ilma võrguta**: avab telefonis rakenduse → loob uue juhtumi → valib edasimüüja → täidab andmed → pildistab defekti → salvestab ajutise tunnusega (UUID) lokaalselt. Täiendab ka varem avatud juhtumeid. Võrgu taastumisel toimub automaatne sünkroonimine ja serveripoolne lõpliku numbri omistamine.
- **Kinnitaja**: logib sisse → näeb pakkumisi oma kulukontode lõikes → kinnitab protsendiga või lükkab põhjusega tagasi.
- **Teenusmeeskond**: avab mobiilis määratud tööd → näeb aadressi, kontakti, defekti infot ja fotosid → teeb töö → lisab fotod ja märkme → märgib tehtuks.
- **Admin**: haldab kasutajaid, rolle, kulukontosid, kategooriaid, tõlkeid, defektitüüpe, meeskondi, logisid ja statistikat.

---

## 3. Pärandsüsteem: mis säilib, mis kaob

### 3.1 Äriloogika, mis PEAB säilima
- Reklamatsiooninumbri formaat: P/T + 5 numbrit (transaktsiooniturvaline, ilma ületäitumiseta)
- Neli märkmetüüpi: lisainfo, käsitleja, teenus, tagasilükkamise põhjus
- Kulude jaotus protsentides: summa = 100%
- Kinnitajate marsruutimine kulukontode kaupa
- Mitu käsitlejat juhtumi kohta (vähemalt 1 peab alati jääma)
- Teavituste peatamine pühadel ja puhkustel (isikupõhiselt)
- Kuus keelt avalikul poolel: EST, ENG, FIN, SWE, NOR, DNK
- Riigid edasimüüja ja meeskonna aadressil: EST, LAT, LTU, DNK, FIN, SWE, NOR
- Seos ERP-tellimusega reklamatsiooninumbri kaudu
- Pehme kustutamine: meeskonnad, märkmed, failid (ajalugu ei kao)

### 3.2 Mustrid, mis PEAVAD surema
- EI TOHI: Kõvakooditud alguskuupäev päringutes
- EI TOHI: Kõvakooditud kasutaja-ID-d õiguskontrollis ja filtrites
- EI TOHI: Komaga eraldatud ID-loendid VARCHAR-väljas (rikub 1NF)
- EI TOHI: Kaks paralleelset kasutajaliidest
- EI TOHI: Kaks paralleelset failihoidlat
- EI TOHI: Kategooria nime salvestamine alati ainult eesti keeles
- EI TOHI: Surnud väljad ja tabelid
- EI TOHI: Testkliendi erikäsitlus koodis (peab olema keskkonnapõhine)
- EI TOHI: Keelekood SQL-i veeru nimena
- EI TOHI: Varu- ja testfailid tootmises
- EI TOHI: Kasutaja simuleerimise leht tootmises ilma auditita

---

## 4. Uued nõuded

### 4.1 E-post keskkonnast, sünkroonitud Microsoft 365-ga
- Käsitleja saab saata e-kirju otse rakendusest
- Saadetud kiri jõuab saatja M365 Saadetud kausta (Microsoft Graph `sendMail` delegeeritud õigustega)
- Kirjavahetus kuvatakse ajajoonel lõimena koos manustega
- Autentimine: OAuth 2.0 / Entra ID. EI TOHI kasutada SMTP kasutajanime/parooli

### 4.2 Automaatne sidumine (sissetulev post)
- Taustaprotsess loeb jagatud postkasti Graph API kaudu ja seob kirjad juhtumitega:
  1. `In-Reply-To` / `References` päis
  2. Reklamatsiooninumber teemareal või kehas (`/\b[PT]\d{5}\b/`)
  3. Saatja aadress vastab avatud juhtumi kontaktile
- Kui reegel ei taba → kiri läheb "sidumata" järjekorda (ei tohi ära visata)
- Sidumise otsus logitakse auditilogisse

### 4.3 PWA, mobiil ja võrguühenduseta töö
- Rakendus on paigaldatav PWA (Web App Manifest, Service Worker vahemällustab kesta ja varad)
- **Võrguühenduseta PEAB töötama**: uue juhtumi loomine, märkmete/fotode lisamine (kaamera otsekasutus), olemasoleva juhtumi väljade muutmine, staatuse muutmine ja teenuse märkimine
- **EI TÖÖTA võrguühenduseta**: kulupakkumiste kinnitamine, otsing üle baasi, haldus, aruanded, e-kirja saatmine (liides näitab selgelt, et pole kättesaadav)
- **Reklamatsiooninumber**: offline-juhtum saab lokaalselt UUID; lõpliku numbri omistab server sünkroonimisel
- **Sünkroonimata töö eluiga ja eskalatsioon**:
  - kuni 4 h: tavaline olek
  - 4 h: kasutaja saab meeldetuletuse
  - 24 h: püsiv hoiatus rakenduse avamisel
  - 72 h: häire juhile/adminile (saadab metaandmed)
  - 7 päeva: uut offline tööd ei saa luua enne vana sünkroonimist
  - EI TOHI sünkroonimata tööd automaatselt kustutada
- **Andmed seadmes**: kohalik hoidla on krüpteeritud; sünkroonitud andmed eemaldatakse seadmest; seadmesse sünkroonitakse ainult kasutajale määratud juhtumid
- **Seadmetugi**: Android Chrome & iOS Safari (WebKit); toetatud viimased 2 aastat OS-i põhiversioonidest
- **Fotod**: pildid pakitakse seadmes enne järjekorda; jätkatav üleslaadimine

### 4.4 Õigused
- Õiguste maatriks (roll × toiming × ulatus) defineeritud tsentraalselt, andmebaasis hallatav ja õigusepõhine

### 4.5 Statistika
- Töölauad: avatud juhtumid staatuse/käsitleja/vanuse kaupa; läbimisaeg (mediaan ja 90. protsentiil); tähtaega ületanud; meeskondade koormus; reklamatsioonide arv ajas. Indekseeritud päringud

### 4.6 Kalender
- Teenuskülastused sünkroonitud Outlooki kalendriga
- Puhkuste ja pühade haldus liidesest; M365 puhul loetakse Outlooki `getSchedule` vaba/hõivatud olekust

### 4.7 Ajajoon
- Kronoloogiline sündmusvoog juhtumi juures: kes, millal, mis muutus (vana → uus väärtus)

### 4.8 Automaatne teavitamine
- Jälgitav olek (`pending` → `sent` / `failed` / `bounced`); isikupõhine puhkusekontroll

### 4.9 Kasutajaliidese nõuded
- Mobiili-esmane disain (alustatakse 360 px laiusest)
- Puutesihtmärgid vähemalt 44 × 44 px, toimingud pöidlaulatuses
- Puudub hiirest sõltuvus (ei hover-menüüsid ainsa infona)
- Katkestuskindlus (automaatne mustandi salvestus)
- WCAG 2.1 AA ligipääsetavus; ei horisontaalset kerimist; suumimist ei tohi keelata
- Jõudluseelarve: LCP < 2,5 s; INP < 200 ms; CLS < 0,1; Esmane pakett < 250 kB

---

## 5. Tehnoloogiavalik

### 5.1 Vaikevalik
- **Keel / Raamistik:** PHP 8.5 ja Laravel 12+
- **Andmebaas:** MariaDB 11.4 (LTS), InnoDB, `utf8mb4_unicode_ci`
- **Liides:** React 18 + TypeScript + Vite, kliendipoolne marsruutimine
- **API:** JSON REST, OpenAPI
- **Kliendihoidla:** IndexedDB, krüpteeritud
- **Stiilid:** Tailwind CSS
- **Identiteet:** Entra ID (OIDC) sisemistele kasutajatele
- **Failid:** SharePoint / OneDrive Microsoft Graphi kaudu (Sites.Selected)
- **E-post:** Microsoft Graph
- **Saladused:** `.env` fail väljaspool veebijuurt, õigustega 600
- **Vahemälu:** Redis (ainult puhver!)
- **Järjekorrad:** Database draiver (EI TOHI panna järjekordi kettata Redisesse!)
- **Testid:** Pest / PHPUnit + Playwright

---

## 6. Arhitektuuri raudreeglid
- **6.1 Kood väljaspool veebijuurt:** DocumentRoot sisaldab ainult `index.php`, sümbollinki `build/` ja `.htaccess`. Rakenduskood ja `.env` asuvad veebijuurest väljaspool
- **6.2 Üks kasutajaliides:** Üks SPA kõigile rollidele. Ei ehitata eraldi "vana ja uut" ega eraldi mobiili-haru
- **6.3 Üks andmebaasiühendus:** Konfigureeritud keskkonnamuutujatest
- **6.4 Keskkondade eraldus:** Dev, Staging, Tootmine. Eraldi baasid ja saladused
- **6.5 Versioonihaldus ja tarne:** Git, atomaarne tarne sümbollingi vahetusega (`current -> releases/<timestamp>`), CI/CD
- **6.6 Kihiline struktuur:** Controller → Policy → Service → Model/Repo
- **6.7 Vead ja logimine:** Struktureeritud JSON-logimine, display_errors tootmises väljas, silumisinfot ei lekita API vastustesse
- **6.8 Sünkroonimine:** Idempotentsuse võtmed, väljapõhine konfliktilahendus, serveri autoriteetsus, kahetasemelised ajatemplid (`occurred_at` ja `recorded_at`)

---

## 7. Turvanõuded
- **7.1 Saladused:** Mitte kunagi koodis ega repos. CI-s gitleaks skanner. Enne käivitamist kõigi 7 pärandsaladuse vahetus (eriti M365 tenant konto!)
- **7.2 Autentimine:** Sisemistel Entra ID (OIDC + PKCE + MFA). Välistel tugev parooliräsi (Argon2id/bcrypt) + 2FA + lukustuskaitse. Break-glass konto
- **7.3 Autoriseerimine:** Endpointid vaikimisi suletud. Identiteet loetakse ainult serveri seansist. IDOR-kaitse. Entra rühm ei asenda rakenduse maatriksit
- **7.4 Sisendid ja SQL:** Rangelt parameetritega päringud / ORM. Identifikaatorid valge nimekirja alusel
- **7.5 XSS:** Automaatne escaping, CSP, puhastamine
- **7.6 CSRF:** Kõigil olekut muutvatel päringutel kohustuslik
- **7.7 Päised:** HSTS, nosniff, frame-ancestors 'none', range CSP ilma unsafe-inline'ita
- **7.8 Kliendipoolne olek:** Autentimisolek elab serveris HttpOnly küpsises, mitte localStorage-is
- **7.9 GDPR:** Automaatsed säilitustähtajad, andmete kustutamine/eksport, krüpteeritud seadmehoidla
- **7.10 Võrgukaitse:** IP-piirang võib olla vaid lisakiht, mitte ainus barjäär

---

## 8. Andmemudel
- **8.1 Normaliseerimine:** Ei komaloendeid tekstiväljades! Käsitlejad, rollid, kulukontod jm eraldi seosetabelitesse
- **8.2 Võõrvõtmed:** Kõik seosed kaetud `FOREIGN KEY` piirangutega
- **8.3 Mootor ja märgistik:** Kõik tabelid InnoDB, `utf8mb4`, korrektsed andmetüübid (INT, DATE, DECIMAL)
- **8.4 Indeksid:** Iga otsitav, sorditav või ühendatav veerg indekseeritud
- **8.5 Transaktsioonid:** Mitmeosalised kirjutamised transaktsioonis. Atomaarne serveripoolne numbrigeneraator
- **8.6 Migratsioonid:** Ainult versioonihallatud migratsioonifailid
- **8.7 Üks tõeallikas:** Igal väljal üks autoritatiivne koht; auditilogi on ainult logi

---

## 9. Auditilogi ja ajajoon
- Iga muudatus logitakse automaatselt: `entity_type`, `entity_id`, `action`, `changed_fields` (vana → uus JSON), `actor_user_id`, `actor_ip`, `occurred_at`, `recorded_at`, `request_id`
- Logitabel on rakendusele *append-only* (UPDATE/DELETE keelatud)

---

## 10. Failihaldus
- Hoidla on SharePoint läbi Microsoft Graph API (`Sites.Selected`)
- Rakenduse failisüsteemis faile ei hoita püsivalt
- Kasutaja ei saa otse-URL-e ega jagamislinke; ligipääs läbi autoriseeritud rakenduse kontrolleri
- Faili tuvastamine stabiilse `driveItem ID` järgi
- Serveripoolne laiendite ja MIME valge nimekiri (aktiivne kood/HTML keelatud)
- Zone.eu failisüsteemi viirusetõrje kontroll enne SharePointi saatmist

---

## 11. Teavitused ja e-post
- Üks teavitussüsteem, database-järjekord, cron-töötleja
- Igal teavitusel olek (`pending` → `sent` / `failed` / `bounced`)
- Microsoft Graph transport (vau.ee domeen, DKIM/DMARC joondatud)
- Tagasipõrgete (bounce) automaatne töötlemine

---

## 12. Microsoft 365 integratsioon
- **Põhimõte 1:** Rakendus on ärivaldkonna tõeallikas, M365 hoiab artefakte
- **Põhimõte 2:** Autoriseerimine toimub alati rakenduses
- **Põhimõte 3:** Välissõltuvused degradeeruvad järjekorda, mitte tõrkeks; integratsioonid on konfiguratsioonist väljalülitatavad
- **Entra ID:** PKCE voog, MFA turvavaikeväärtustest
- **SharePoint:** Sites.Selected minimaalne ulatus
- **Outlook:** Kahesuunaline kalendrisünkroonimine

---

## 13. Keelatud mustrite register (Kokkuvõte)
1. **SQL**: EI TOHI muutuja interpoleerimist SQL-stringi (R23), identifikaatoreid sisendist (R24), addslashes (R25), ühenduste segamist (R35).
2. **Autentimine/õigused**: EI TOHI identiteeti/rolle päringu kehast või localStorage'ist (R18), õiguskontrolli kasutaja ID järgi (R20), kaitsmata endpointe (R17).
3. **Failid**: EI TOHI failiteed sisendist (R29), üleslaadimist valge nimekirjata (R31), aktiivse sisu renderdamist (R30), 0777 õigusi (R03).
4. **M365**: EI TOHI Entra rühma ainsa õigusena (R54), SharePointi jagamislinke kasutajale (R55), tenandiüleseid õigusi (R56), loogikat Power Automate'is (R57).

---

## Lisa A: Riskiregister (Valitud kriitilised kirjed ja lisaosad)

### A.9 M365 integratsiooni enda toodud riskid
- **[R57] Äriloogika lekib Power Automate'i:** Voog kirjutab juhtumiandmetesse või teeb olekuülemineku. Tekib teine kooditee ([R08]), mille toimetaja ei jõua auditilogisse ([R43]) ja mida ükski test ei kata. Litsents on olemas, seega kiusatus on reaalne — see risk ei ole teoreetiline. *(Nõue: 12.10, 13)*
- **[R58] Välissõltuvus katkestab äriprotsessi:** Graphi tõrge, throttling või aegunud token peatab reklamatsiooni esitamise, faili üleslaadimise või kirja saatmise. Klient näeb viga, mille põhjus ei ole VAU käes. Ilma järjekorra ja korduskatseta kaob töö jäädavalt. *(Nõue: 12.1)*
- **[R59] Tokenite ja tellimuste haldamata elutsükkel:** Webhook-tellimus aegub kolme päevaga, rakenduse saladus aasta-paariga. Kumbki ei anna viga — asjad lihtsalt lakkavad vaikselt töötamast. Sissetulevate kirjade sidumine seiskub täpselt samamoodi, nagu pärandsüsteemis seiskus töötlejata järjekord. See on [R44] muster uues kohas. *(Nõue: 12.3, 12.9)*

### A.10 Võrguühenduseta töö toodud riskid
Need kuus riski tulevad sellest, et töö tehakse seadmes, mis ei ole ühenduses, ja jõuab serverisse hiljem. Ühenduseta töö nihutab usalduse ja aja: toiming tehakse ühes kohas ühel ajal, aga otsustatakse teises kohas teisel ajal.
- **[R60] Sünkroonimata töö kaob koos seadmega:** Töötaja sisestab objektil juhtumi, telefon läheb katki, kaob või rakendus kustutatakse enne sünkroonimist. Töö ei ole kusagil mujal olemas. Ka rakenduse sulgemine või brauseri vahemälu tühjendamine võib selle viia, kui järjekord ei ole püsivas hoidlas. *(Nõue: 4.3, 6.8)*
- **[R61] Sünkroonimiskonflikt kirjutab töö vaikselt üle:** Kaks inimest muudavad sama juhtumit, üks ühenduseta. Sünkroonimisel võidab üks ja teise töö kaob ilma teateta. See on [R36] sama muster, ainult et aken ei ole sekundid vaid tunnid või päevad — seega juhtub see palju sagedamini. *(Nõue: 6.8, 8.5)*
- **[R62] Isikuandmed jäävad kaotatud seadmesse:** Telefonis on klientide nimed, aadressid, telefoninumbrid ja objektifotod. Seade kaob või varastatakse. Ilma krüpteerimise, sünkroonimisjärgse kustutamise ja tühjendusreegliteta on see andmeleke, mille ulatust ei ole võimalik hinnata. *(Nõue: 4.3, 7.9)*
- **[R63] Seadme kell määrab auditilogi järjekorra:** Ühenduseta toimingu aeg tuleb seadme kellast. Kui see on vale — ajavöönd, käsitsi muudetud, aku tühjenemise järel lähtestatud — satuvad sündmused ajaloos vale järjekorda. Auditilogi, mille järjekorda ei saa usaldada, ei ole tõend. *(Nõue: 6.8, 9)*
- **[R64] Vahemällustatud õigus lubab toimingu, mille server keelab:** Seade arvab, et kasutajal on õigus, sest nii oli ühenduse katkemise hetkel. Vahepeal on õigus ära võetud või juhtumi olek muutunud. Kui serveri keeldumine visatakse vaikselt ära, arvab kasutaja, et töö on tehtud — see on [R18] peegelpilt: mitte klient ei võta õigust, vaid klient ei saa teada, et ta seda ei saanud. *(Nõue: 6.8, 7.8)*
- **[R65] Sünkroonimise järjestus katkeb:** Toimingud rakenduvad vales järjekorras: staatusemuutus jõuab kohale enne märget, mis seda põhjendab; foto enne juhtumit, mille külge see kuulub. Auditilogi näitab sündmusi, mis järgnevad oma põhjusele. Ilma järjestuse tagamiseta on see sünkroonimise vaikimisi käitumine, mitte erand. *(Nõue: 6.8)*

---

## Lisa B: Lahtised ja lahendatud küsimused tellijale

### Lahtised küsimused tellijale (enne etappi 1 selgeks rääkida)
1. **Eraldi finantsvaade:** Pärandsüsteemis on autentimata täisvaade juhtumitele, mis on mõeldud Epicori ja finantsosakonna inimestele ja millele ükski menüü ei viita. Kas seda kasutatakse? Kui jah, milline kitsendatud vaade neile uues süsteemis luua?
2. **Rahuloluküsitlus:** Kas väline küsitlussüsteem jääb, või ehitada sisemine?
3. **Analüütikaeksport:** Pärandsüsteem kirjutab kogu andmebaasi CSV-dena välisele analüütikatööriistale. Kas see on veel kasutusel?
4. **Välistatud kulupakkumine:** Üks kulupakkumine on teavitustest püsivalt välja jäetud koodikommentaariga, mis ei selgita põhjust. Kas see reegel peab säilima ja miks?
5. **Kasutajapõhised erandid:** Vähemalt kuus kasutaja-ID-d on koodis erikäsitlusega. Millised nendest on ärireeglid ja millised arendaja mugavus?
6. **Testandmed:** Kas testreklamatsioonid peavad tootmises eksisteerima, või piisab eraldi keskkonnast?
7. **Vanad juhtumid:** Pärandsüsteemis on kõvakooditud alguskuupäev, millest varasemad juhtumid on liideses nähtamatud, kuigi andmebaasis olemas. Kas need tuleb migreerida ja nähtavaks teha?
8. **Müügiliik:** See väli on põhitabelis alati tühi ja õige väärtus on ainult auditilogis. Milline on tegelik ärireegel?
9. **Säilitustähtajad:** Kui kaua peavad reklamatsioonid, fotod, e-kirjad ja auditilogi säilima? Garantiiperiood määrab miinimumi, GDPR maksimumi.
10. **Lõppkliendi õiguslik alus:** Lõppklient ei esita ise — tema andmed sisestab edasimüüja. Kuidas on teavitamiskohustus täidetud?
11. **Jagatud postkast:** Milline postkast on sissetulevate reklamatsioonikirjade jaoks ja milline saadab süsteemiteavitusi?
12. **Teenusmeeskonnad:** Kas nad saavad süsteemi kasutajakontod (uus roll), või jääb suhtlus e-postiks?
13. **Paralleeljooks:** Kas vana ja uus süsteem töötavad korraga, ja kui kaua?
14. **Mahutamine:** Mitu samaaegset kasutajat, mis on tippkoormus, millised on vastuseaja ootused?

### Lahendatud küsimused (Otsused ja taustinfo)
- **Küsimus 15 (Litsentsid - 2026-09-25):** M365 E3/E5, Purview, Defender ja Entra ID P1/P2 litsentse ei ole. Kinnitatud on ainult Power Automate / Power Apps premium. MFA tuleb turvavaikeseadetest (12.2), Conditional Accessi ei ole, IP-piirang jääb haldusliidesele püsivaks lisakihiks (7.10), säilitus ja andmesubjekti päringud on rakenduse töö (7.9), viirusekontroll on zone.eu tasemel (10).
- **Küsimus 16 (SharePointi kvoot - 2026-09-25):** Tenandi kvoot on 2,49 TB, kasutuses 11,09 GB. Vajadus koos uploads/ arhiiviga on ~312 GB + ~25 GB aastas. Ruumi on mitmekordse varuga, go/no-go värav läbitud: failihoidla on SharePoint (10, 12.4).
- **Küsimus 17 (Teenusmeeskondade identiteet - 2026-09-25):** Välistel brigaadidel ei ole VAU M365 kontot. Nad autendivad rakendusepõhiselt (Argon2id/bcrypt, 2FA, brute-force kaitse - 7.2) ja puhkused asuvad rakenduse puhkusetabelis (4.6).
- **Küsimus 18 (Rakenduse registreering ja consent - 2026-09-25):** Entra rakenduse registreeringu teeb ja admin consendi annab VAU IT admin. Taotlus esitatakse etapi 1 ajal.
- **Küsimus 19 (Domeeni e-posti seadistus - 2026-09-25):** SPF lubab M365 ja zone.eu-d (-all), selector1 olemas, DMARC on p=reject. DNS-muudatusi vaja ei ole. Etapis 2 kontrollitakse selector2 ja DKIM sisselülitust (11.1).
- **Küsimus 20 (M365 konto ülevaatamine - 2026-09-25):** VAU IT admin vahetab parooli, kui talle teatatakse konto nimi. Arendaja tuvastab konto pärandkoodist ja edastab turvaliselt enne etappi 2.
- **Küsimused 21–25 (Majutus - 2026-09-25):** 
  - 21: Redis on ainult vahemäluks (kettale ei salvestata). Järjekorrad ja seansid lähevad andmebaasi.
  - 22: PHP versioon 8.5, raamistik Laravel 12+.
  - 23: Andmebaas MariaDB 11.4.13 (LTS, SSL, STRICT režiim).
  - 24: uploads/ arhiveeritakse ja migreeritakse SharePointi, seejärel kustutatakse Zone'ist täielikult.
  - 25: Kood väljaspool veebijuurt on Zone'is lubatud (open_basedir tühi).
- **Küsimused 26–30 (Mobiil ja võrguühenduseta töö - 2026-09-25):**
  - 26: Seadmematriks: isiklikud Android ja iOS telefonid (kuni 2 aastat vanad OS-versioonid).
  - 27: Sünkroonimata töö astmeline eskalatsioon (4 h, 24 h, 72 h, 7 p). Töö ei kustu automaatselt.
  - 28 & 30: MDM-i ei ole. Isiklike seadmete kirjalik kokkulepe ja andmekaitsealane mõjuhinnang on käivitamise eeltingimus.
  - 29: offline.use õigus käsitlejatel ja teenusmeeskondadel.
- **Küsimus 31 (Viirusekontroll - 2026-09-25):** zone.eu reaalajas viirusetõrje failisüsteemi tasemel tõkestab nakatunud faili kirjutamise; rakendus käsitleb kirjutamistõrget tagasilükkamisena. Fail kirjutatakse enne SharePointi tervikuna storage/ alla, loetakse tagasi ja testitakse EICAR-iga.

---

## Lõpetuseks
Uus süsteem ei tohi olla *"vana süsteem, aga parandatud"*. See peab olema süsteem, kus need vead ei ole konstruktsiooniliselt väljendatavad.

1. **Autoriseerimine ei lahku kunagi rakendusest:** Platvorm (Entra) ütleb, kes kasutaja on. Mida ta tohib, otsustab rakendus — alati, iga päringu kohta.
2. **Iga integratsioon peab suutma katki minna:** Kui Graph on maas, peab reklamatsiooni saama esitada. Kui integratsiooni ei saa välja lülitada ilma koodi muutmata, ei ole see integratsioon vaid sõltuvus.
3. **Ükski töö ei kao vaikselt:** Ei konflikti, serveri keeldumise ega tõrke tõttu. Kui midagi ei rakendunud, saab kasutaja sellest teada ja tema andmed säilivad.
4. **Server otsustab, seade pakub:** Seade kogub tööd ja esitab selle. Kas see kehtib (õigused, olek, valideerimine), otsustab server sünkroonimise hetkel, mitte seade tegemise hetkel.

---
**Dokumendi versioon:** 4.18 — 2026-09-25  
**Staatus:** Küsimused 15–31 on lahendatud; ükski lahtine küsimus ei blokeeri etappe 2 ega 3. Enne etappi 2 tuleb vahetada saladus nr 6 ja kontrollida M365 DKIM-i.

