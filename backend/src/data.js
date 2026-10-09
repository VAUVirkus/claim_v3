// Mock Database & Initial Data for VAU Claim System v3
// Reflecting requirements from Olulised/spec_v3.md

export const DEALERS = [
  {
    code: '1001',
    name: 'AS Ehitusgrupp',
    contactPerson: 'Mati Mets',
    email: 'mati.mets@ehitusgrupp.ee',
    phone: '+372 5551 2345',
    address: 'Kadaka tee 42, Tallinn',
    country: 'EST',
    isTest: false,
  },
  {
    code: '2002',
    name: 'Fenestra Bygg AB',
    contactPerson: 'Lars Lindqvist',
    email: 'lars@fenestrabygg.se',
    phone: '+46 8 123 4567',
    address: 'Kungsgatan 15, Stockholm',
    country: 'SWE',
    isTest: false,
  },
  {
    code: '3003',
    name: 'Suomi Ovi ja Ikkuna Oy',
    contactPerson: 'Eero Nieminen',
    email: 'eero.nieminen@suomiovi.fi',
    phone: '+358 9 555 7890',
    address: 'Mannerheimintie 88, Helsinki',
    country: 'FIN',
    isTest: false,
  },
  {
    code: 'TEST01',
    name: 'VAU Arendus & Testklient',
    contactPerson: 'Test Kasutaja',
    email: 'test@vau.ee',
    phone: '+372 5000 0000',
    address: 'Puidu 1, Viljandi',
    country: 'EST',
    isTest: true,
  },
];

// Multilingual 2-tier Category Tree (et, en, fi, sv, no, da)
export const CATEGORIES = [
  {
    id: 'windows',
    names: {
      et: 'Aknad',
      en: 'Windows',
      fi: 'Ikkunat',
      sv: 'Fönster',
      no: 'Vinduer',
      da: 'Vinduer',
    },
    subcategories: [
      {
        id: 'wood-windows',
        names: {
          et: 'Puitaknad',
          en: 'Wooden Windows',
          fi: 'Puuikkunat',
          sv: 'Träfönster',
          no: 'Tre vinduer',
          da: 'Trævinduer',
        },
      },
      {
        id: 'wood-alum-windows',
        names: {
          et: 'Puitalumiiniumaknad',
          en: 'Wood-Aluminium Windows',
          fi: 'Puu-alumiini-ikkunat',
          sv: 'Trä-aluminiumfönster',
          no: 'Tre-aluminiums vinduer',
          da: 'Træ-aluminiums vinduer',
        },
      },
      {
        id: 'pvc-windows',
        names: {
          et: 'PVC aknad',
          en: 'PVC Windows',
          fi: 'PVC-ikkunat',
          sv: 'PVC-fönster',
          no: 'PVC-vinduer',
          da: 'PVC-vinduer',
        },
      },
    ],
  },
  {
    id: 'doors',
    names: {
      et: 'Uksed',
      en: 'Doors',
      fi: 'Ovet',
      sv: 'Dörrar',
      no: 'Dører',
      da: 'Døre',
    },
    subcategories: [
      {
        id: 'exterior-doors',
        names: {
          et: 'Välisuksed',
          en: 'Exterior Doors',
          fi: 'Ulko-ovet',
          sv: 'Ytterdörrar',
          no: 'Ytterdører',
          da: 'Yderdøre',
        },
      },
      {
        id: 'interior-doors',
        names: {
          et: 'Siseuksed',
          en: 'Interior Doors',
          fi: 'Sisäovet',
          sv: 'Innerdörrar',
          no: 'Innerdører',
          da: 'Indvendige døre',
        },
      },
      {
        id: 'fire-doors',
        names: {
          et: 'Tulekindlad uksed (EI30 / EI60)',
          en: 'Fire Doors (EI30 / EI60)',
          fi: 'Palo-ovet (EI30 / EI60)',
          sv: 'Branddörrar (EI30 / EI60)',
          no: 'Branndører (EI30 / EI60)',
          da: 'Branddøre (EI30 / EI60)',
        },
      },
    ],
  },
  {
    id: 'balcony-doors',
    names: {
      et: 'Rõduuksed',
      en: 'Balcony Doors',
      fi: 'Parvekeovet',
      sv: 'Balkongdörrar',
      no: 'Balkongdører',
      da: 'Altandøre',
    },
    subcategories: [
      {
        id: 'single-balcony',
        names: {
          et: 'Ühekordne rõduuks',
          en: 'Single Balcony Door',
          fi: 'Yksittäinen parvekeovi',
          sv: 'Enkel balkongdörr',
          no: 'Enkel balkongdør',
          da: 'Enkelt altandør',
        },
      },
      {
        id: 'double-balcony',
        names: {
          et: 'Paarisrõduuks',
          en: 'Double Balcony Door',
          fi: 'Pari-parvekeovi',
          sv: 'Dubbel balkongdörr',
          no: 'Dobbel balkongdør',
          da: 'Dobbelt altandør',
        },
      },
    ],
  },
];

export const DEFECT_TYPES = [
  { id: 'glass-damage', name: 'Klaasikahjustus (mõra / kriimustus / udune pakett)' },
  { id: 'paint-surface', name: 'Pinnaviimistluse / värvi defekt' },
  { id: 'geometry', name: 'Geomeetria hälve / kõmmeldumine' },
  { id: 'hardware', name: 'Sulusesüsteemi rike / sulgumisraskus' },
  { id: 'gasket', name: 'Tihendi rike / tuule/veepidavus' },
  { id: 'transport', name: 'Transpordikahjustus tarnimisel' },
  { id: 'missing-parts', name: 'Puuduvad detailid või komplekteerimisviga' },
  { id: 'other', name: 'Muu tootmisdefekt' },
];

export const SERVICE_TEAMS = [
  { id: 'team-north', name: 'Ekipaaž 1 (Põhja-Eesti & Tallinn)', contact: 'Jaan Tamm (+372 511 2233)' },
  { id: 'team-south', name: 'Ekipaaž 2 (Lõuna-Eesti & Tartu/Viljandi)', contact: 'Kalle Kukk (+372 522 3344)' },
  { id: 'team-west', name: 'Ekipaaž 3 (Lääne-Eesti & Saared)', contact: 'Toomas Tuul (+372 533 4455)' },
  { id: 'team-scandi', name: 'Team Scandinavia (Rootsi/Soome/Norra)', contact: 'Magnus Berglund (+46 70 123 456)' },
];

export const COST_ACCOUNTS = [
  { id: 'dept-100', name: '100 - Puidutootmine (Viljandi tehas)' },
  { id: 'dept-200', name: '200 - Viimistlus & Värviliin' },
  { id: 'dept-300', name: '300 - Tarnija kulu (Klaasipakett / Pilkington)' },
  { id: 'dept-400', name: '400 - Logistika & Vedaja vastutus' },
  { id: 'dept-500', name: '500 - Montaažipartneri garantii' },
  { id: 'dept-600', name: '600 - Müügiosakonna heatahte kulu' },
];

export const HANDLERS = [
  { id: 'h-1', name: 'Monika Koort', email: 'Monika.Koort@vau.ee', role: 'Käsitleja' },
  { id: 'h-2', name: 'Marko Vildersen', email: 'Marko.Vildersen@vau.ee', role: 'Käsitleja' },
  { id: 'h-3', name: 'Jaanus Esna', email: 'Jaanus.Esna@vau.ee', role: 'Käsitleja' },
  { id: 'h-4', name: 'Käthlin Tulmin', email: 'Kathlin.Tulmin@vau.ee', role: 'Reklamatsiooniosakonna juht' },
];

export const USERS = [
  // 1. Edasimüüjad (Pretensiooni esitajad)
  {
    id: 'u-dealer-1',
    name: 'Mati Mets',
    email: 'mati.mets@ehitusgrupp.ee',
    role: 'DEALER',
    roleLabel: 'Pretensiooni esitaja (Edasimüüja)',
    company: 'AS Ehitusgrupp',
    dealerCode: '1001',
    country: 'EST',
    avatar: 'MM',
    badgeColor: 'badge-blue',
    description: 'Eesti edasimüüja, Kadaka tee 42, Tallinn',
  },
  {
    id: 'u-dealer-2',
    name: 'Lars Lindqvist',
    email: 'lars@fenestrabygg.se',
    role: 'DEALER',
    roleLabel: 'Pretensiooni esitaja (Edasimüüja)',
    company: 'Fenestra Bygg AB',
    dealerCode: '2002',
    country: 'SWE',
    avatar: 'LL',
    badgeColor: 'badge-blue',
    description: 'Rootsi edasimüüja, Kungsgatan 15, Stockholm',
  },
  {
    id: 'u-dealer-3',
    name: 'Eero Nieminen',
    email: 'eero.nieminen@suomiovi.fi',
    role: 'DEALER',
    roleLabel: 'Pretensiooni esitaja (Edasimüüja)',
    company: 'Suomi Ovi ja Ikkuna Oy',
    dealerCode: '3003',
    country: 'FIN',
    avatar: 'EN',
    badgeColor: 'badge-blue',
    description: 'Soome edasimüüja, Mannerheimintie 88, Helsinki',
  },

  // 2. Käsitlejad (Handlers)
  {
    id: 'u-handler-1',
    name: 'Monika Koort',
    email: 'Monika.Koort@vau.ee',
    role: 'HANDLER',
    roleLabel: 'Käsitleja',
    company: 'AS Viljandi Aken ja Uks',
    department: 'Kvaliteediosakond',
    avatar: 'MK',
    badgeColor: 'badge-indigo',
    description: 'Käsitleb uusi juhtumeid, määrab teenuseid ja kulupakkumisi',
  },
  {
    id: 'u-handler-2',
    name: 'Marko Vildersen',
    email: 'Marko.Vildersen@vau.ee',
    role: 'HANDLER',
    roleLabel: 'Käsitleja',
    company: 'AS Viljandi Aken ja Uks',
    department: 'Kvaliteediosakond',
    avatar: 'MV',
    badgeColor: 'badge-indigo',
    description: 'Spetsialiseerunud akende garantiijuhtumitele',
  },
  {
    id: 'u-handler-3',
    name: 'Jaanus Esna',
    email: 'Jaanus.Esna@vau.ee',
    role: 'HANDLER',
    roleLabel: 'Käsitleja',
    company: 'AS Viljandi Aken ja Uks',
    department: 'Kvaliteediosakond',
    avatar: 'JE',
    badgeColor: 'badge-indigo',
    description: 'Spetsialiseerunud uste garantiijuhtumitele',
  },

  // 3. Kinnitajad (Approvers)
  {
    id: 'u-approver-1',
    name: 'Käthlin Tulmin',
    email: 'Kathlin.Tulmin@vau.ee',
    role: 'APPROVER',
    roleLabel: 'Kinnitaja (Kvaliteedijuht)',
    company: 'AS Viljandi Aken ja Uks',
    department: 'Juhtkond / Kvaliteet',
    avatar: 'KT',
    badgeColor: 'badge-amber',
    description: 'Kinnitab ja vaatab läbi kulupakkumisi',
  },
  {
    id: 'u-approver-2',
    name: 'Aivar Kallas',
    email: 'aivar.kallas@vau.ee',
    role: 'APPROVER',
    roleLabel: 'Kinnitaja (Tootmisjuht)',
    company: 'AS Viljandi Aken ja Uks',
    department: 'Puidutootmine (Viljandi)',
    avatar: 'AK',
    badgeColor: 'badge-amber',
    description: 'Tootmise kulukontode (dept-100/200) vastutav kinnitaja',
  },

  // 4. Teenusmeeskond (Service Team)
  {
    id: 'u-service-1',
    name: 'Magnus Berglund',
    email: 'magnus.berglund@vau.se',
    role: 'SERVICE_TEAM',
    roleLabel: 'Teenusmeeskond (Mobiil)',
    teamId: 'team-scandi',
    teamName: 'Team Scandinavia (Rootsi/Soome/Norra)',
    company: 'VAU Service Nordic',
    avatar: 'MB',
    badgeColor: 'badge-cyan',
    description: 'Skandinaavia välitööde spetsialist',
  },
  {
    id: 'u-service-2',
    name: 'Jaan Tamm',
    email: 'jaan.tamm@vau.ee',
    role: 'SERVICE_TEAM',
    roleLabel: 'Teenusmeeskond (Mobiil)',
    teamId: 'team-north',
    teamName: 'Ekipaaž 1 (Põhja-Eesti & Tallinn)',
    company: 'AS Viljandi Aken ja Uks',
    avatar: 'JT',
    badgeColor: 'badge-cyan',
    description: 'Põhja-Eesti paigaldus- ja hooldusbrigaadi juht',
  },

  // 5. Administraator (Admin)
  {
    id: 'u-admin-1',
    name: 'Priit Tamm',
    email: 'priit.tamm@vau.ee',
    role: 'ADMIN',
    roleLabel: 'Süsteemiadministraator',
    company: 'AS Viljandi Aken ja Uks',
    department: 'IT ja infosüsteemid',
    avatar: 'PT',
    badgeColor: 'badge-purple',
    description: 'Haldab kasutajaid, kategooriaid, klassifikaatoreid ja süsteemi auditi logisid',
  },

  // 6. Vaatleja / Finants (Observer / Finance / ERP)
  {
    id: 'u-finance-1',
    name: 'Tiina Rebane',
    email: 'tiina.rebane@vau.ee',
    role: 'OBSERVER_FINANCE',
    roleLabel: 'Finants / ERP Vaatleja',
    company: 'AS Viljandi Aken ja Uks',
    department: 'Finants ja raamatupidamine',
    avatar: 'TR',
    badgeColor: 'badge-emerald',
    description: 'Aruandlus ja kuluanalüüs ilma lõppklientide isikuandmeteta',
  },
];

// Seeded claims representing various states in the lifecycle
export const INITIAL_CLAIMS = [
  {
    id: 'P02540',
    status: 'IN_PROGRESS',
    statusLabel: 'Töös',
    isTest: false,
    createdAt: '2026-09-28T09:15:00Z',
    submittedLanguage: 'et',
    dealer: {
      code: '1001',
      name: 'AS Ehitusgrupp',
      contactPerson: 'Mati Mets',
      email: 'mati.mets@ehitusgrupp.ee',
      phone: '+372 5551 2345',
      address: 'Kadaka tee 42, Tallinn',
      country: 'EST',
    },
    product: {
      category: 'windows',
      subcategory: 'wood-alum-windows',
      productName: 'Klassik Puitalumiinium aken 1400x1200',
      orderNumber: 'ORD-98231',
      serialNumber: 'SN-2026-0491',
      quantity: 2,
      dimensions: '1400 x 1200 mm',
      isInstalled: true,
    },
    defect: {
      type: 'glass-damage',
      typeName: 'Klaasikahjustus',
      description: 'Objektile paigaldatud kahel aknal on klaaspaketil sisemine udu/kondensaat hermeetiku lekke tõttu. Paigaldaja märkas nädal pärast paigaldust.',
    },
    endCustomer: {
      name: 'OÜ Koduarendus / Jüri Kuusk',
      phone: '+372 5699 8877',
      email: 'jyri.kuusk@koduarendus.ee',
      address: 'Männimäe tee 12, Viljandi',
      onSiteInspectionNeeded: true,
    },
    handlers: [
      { id: 'h-1', name: 'Mari Maasikas', email: 'mari.maasikas@vau.ee' }
    ],
    service: {
      teamId: 'team-south',
      teamName: 'Ekipaaž 2 (Lõuna-Eesti & Tartu/Viljandi)',
      scheduledDate: '2026-10-06',
      status: 'SCHEDULED',
      notes: 'Vahetada 2 klaaspaketti objektil.',
    },
    costProposals: [],
    files: [
      { id: 'f-1', name: 'klaasidefekt_lahivaade.jpg', size: '2.4 MB', tag: 'Defekti lähivõte', uploadedAt: '2026-09-28T09:15:00Z' },
      { id: 'f-2', name: 'tootesilt_aken.jpg', size: '1.8 MB', tag: 'Tootesilt / Label', uploadedAt: '2026-09-28T09:15:00Z' },
    ],
    notes: [
      {
        id: 'n-1',
        type: 'INFO',
        typeLabel: 'Lisainfo',
        author: 'Mati Mets (Edasimüüja)',
        createdAt: '2026-09-28T09:15:00Z',
        content: 'Tellija soovib kiiret lahendust, sest maja viimistlus on lõppjärgus.',
      },
      {
        id: 'n-2',
        type: 'HANDLER',
        typeLabel: 'Käsitleja märge',
        author: 'Mari Maasikas (Käsitleja)',
        createdAt: '2026-09-29T10:30:00Z',
        content: 'Kontrollitud ERP tellimuse ORD-98231 andmeid: klaasitarnija oli Pilkington. Garantiinõue edastatud tarnijale.',
      },
    ],
    timeline: [
      { id: 't-1', timestamp: '2026-09-28T09:15:00Z', actor: 'AS Ehitusgrupp', event: 'Reklamatsioon esitatud veebivormi kaudu (P02540)' },
      { id: 't-2', timestamp: '2026-09-29T08:30:00Z', actor: 'Süsteem', event: 'Käsitlejaks määratud Mari Maasikas' },
      { id: 't-3', timestamp: '2026-09-29T10:30:00Z', actor: 'Mari Maasikas', event: 'Staatus muudetud: Esitatud → Töös' },
      { id: 't-4', timestamp: '2026-09-30T14:00:00Z', actor: 'Mari Maasikas', event: 'Määratud teenusmeeskond: Ekipaaž 2 (06.10.2026)' },
    ],
  },
  {
    id: 'P02541',
    status: 'IN_APPROVAL',
    statusLabel: 'Kinnitamisel',
    isTest: false,
    createdAt: '2026-09-25T11:20:00Z',
    submittedLanguage: 'sv',
    dealer: {
      code: '2002',
      name: 'Fenestra Bygg AB',
      contactPerson: 'Lars Lindqvist',
      email: 'lars@fenestrabygg.se',
      phone: '+46 8 123 4567',
      address: 'Kungsgatan 15, Stockholm',
      country: 'SWE',
    },
    product: {
      category: 'doors',
      subcategory: 'exterior-doors',
      productName: 'Põhjamaa Välisuks Tamme spooniga',
      orderNumber: 'ORD-97512',
      serialNumber: 'SN-2026-8812',
      quantity: 1,
      dimensions: '1000 x 2100 mm',
      isInstalled: true,
    },
    defect: {
      type: 'paint-surface',
      typeName: 'Pinnaviimistluse defekt',
      description: 'Ukselehe alumises servas on spooni lakkimine ebaühtlane, niiskus on tekitanud tumenemise.',
    },
    endCustomer: {
      name: 'Erik Johansson',
      phone: '+46 70 999 1122',
      email: 'erik.j@telia.se',
      address: 'Strandvägen 44, Stockholm',
      onSiteInspectionNeeded: false,
    },
    handlers: [
      { id: 'h-2', name: 'Peeter Pärn', email: 'peeter.parn@vau.ee' }
    ],
    service: {
      teamId: 'team-scandi',
      teamName: 'Team Scandinavia',
      scheduledDate: '2026-09-29',
      status: 'COMPLETED',
      notes: 'Ukseleht vahetatud uue vastu kohapeal. Vana viidud utiliseerimisse.',
    },
    costProposals: [
      {
        id: 'cp-1',
        totalAmountEur: 680,
        splits: [
          { accountId: 'dept-200', accountName: '200 - Viimistlus & Värviliin', percentage: 70, amountEur: 476 },
          { accountId: 'dept-400', accountName: '400 - Logistika & Vedaja', percentage: 30, amountEur: 204 },
        ],
        proposedBy: 'Peeter Pärn',
        proposedAt: '2026-10-01T10:00:00Z',
        status: 'PENDING_APPROVAL',
      }
    ],
    files: [
      { id: 'f-3', name: 'uks_lakk_kahjustus.jpg', size: '3.1 MB', tag: 'Defekti lähivõte', uploadedAt: '2026-09-25T11:20:00Z' }
    ],
    notes: [
      {
        id: 'n-3',
        type: 'SERVICE',
        typeLabel: 'Teenuse märge',
        author: 'Magnus Berglund (Team Scandinavia)',
        createdAt: '2026-09-29T16:00:00Z',
        content: 'Töö teostatud vastavalt lepingule. Klient kinnitas üleandmisakti allkirjaga.',
      }
    ],
    timeline: [
      { id: 't-10', timestamp: '2026-09-25T11:20:00Z', actor: 'Fenestra Bygg AB', event: 'Reklamatsioon esitatud veebivormi kaudu (P02541)' },
      { id: 't-11', timestamp: '2026-09-26T09:00:00Z', actor: 'Peeter Pärn', event: 'Määratud teenusmeeskond Team Scandinavia' },
      { id: 't-12', timestamp: '2026-09-29T16:30:00Z', actor: 'Magnus Berglund', event: 'Teenus märgitud TEHTUKS (Service Completed)' },
      { id: 't-13', timestamp: '2026-10-01T10:00:00Z', actor: 'Peeter Pärn', event: 'Esitatud kulupakkumine 680 € (70% Viimistlus, 30% Logistika)' },
    ],
  },
  {
    id: 'T00001',
    status: 'SUBMITTED',
    statusLabel: 'Esitatud',
    isTest: true,
    createdAt: '2026-10-02T08:00:00Z',
    submittedLanguage: 'et',
    dealer: {
      code: 'TEST01',
      name: 'VAU Arendus & Testklient',
      contactPerson: 'Test Kasutaja',
      email: 'test@vau.ee',
      phone: '+372 5000 0000',
      address: 'Puidu 1, Viljandi',
      country: 'EST',
    },
    product: {
      category: 'windows',
      subcategory: 'wood-windows',
      productName: 'Puitaken 1200x1200mm',
      orderNumber: 'TEST-ORD-01',
      serialNumber: 'TEST-SN-001',
      quantity: 1,
      dimensions: '1200 x 1200 mm',
      isInstalled: false,
    },
    defect: {
      type: 'missing-parts',
      typeName: 'Puuduvad detailid',
      description: 'Puuduvad aknaraami käepidemed ja paigalduskinnitused pakendis.',
    },
    endCustomer: {
      name: 'Test Lõppklient',
      phone: '+372 5000 1111',
      email: 'loppklient@test.ee',
      address: 'Viljandi testobjekt',
      onSiteInspectionNeeded: false,
    },
    handlers: [],
    service: null,
    costProposals: [],
    files: [],
    notes: [],
    timeline: [
      { id: 't-20', timestamp: '2026-10-02T08:00:00Z', actor: 'VAU Testklient', event: 'Testreklamatsioon esitatud süsteemi (T00001)' }
    ],
  }
];
