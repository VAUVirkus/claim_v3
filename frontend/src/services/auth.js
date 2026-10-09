// Authentication & Role Management for VAU Claim System v3
// Spec 2.2 Roles: Dealer (pretensiooni esitaja), Handler (käsitleja), Approver (kinnitaja), Service Team (teenusmeeskond), Admin, Observer/Finance (vaatleja)

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
    description: 'Eesti edasimüüja (kood 1001), Tallinn',
    initialView: 'dealer',
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
    description: 'Rootsi edasimüüja (kood 2002), Stockholm',
    initialView: 'dealer',
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
    description: 'Soome edasimüüja (kood 3003), Helsinki',
    initialView: 'dealer',
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
    description: 'Menetleb juhtumeid, määrab teenuseid ja kulupakkumisi',
    initialView: 'handler',
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
    initialView: 'handler',
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
    initialView: 'handler',
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
    description: 'Kinnitab või lükkab tagasi kulupakkumisi',
    initialView: 'approver',
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
    initialView: 'approver',
  },

  // 4. Teenusmeeskond (Service Team)
  {
    id: 'u-service-1',
    name: 'Magnus Berglund',
    email: 'magnus.berglund@vau.se',
    role: 'SERVICE_TEAM',
    roleLabel: 'Teenusmeeskond (Mobiil)',
    teamId: 'team-scandi',
    teamName: 'Team Scandinavia',
    company: 'VAU Service Nordic',
    avatar: 'MB',
    badgeColor: 'badge-cyan',
    description: 'Skandinaavia välitööde paigaldus- ja remondibrigaad',
    initialView: 'mobile',
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
    initialView: 'mobile',
  },

  // 5. Käsitleja määraja (Admin / Tööde jaotaja)
  {
    id: 'u-distributor-1',
    name: 'Käthlin Tulmin',
    email: 'Kathlin.Tulmin@vau.ee',
    role: 'DISTRIBUTOR',
    roleLabel: 'Käsitleja määraja (Admin)',
    company: 'AS Viljandi Aken ja Uks',
    department: 'Reklamatsiooniosakond',
    avatar: 'KT',
    badgeColor: 'badge-purple',
    description: 'Määrab uutele juhtumitele käsitlejad, jälgib viimaseid muudatusi ja kriitilisust',
    initialView: 'distributor',
  },

  // 6. Süsteemiadministraator (Sysadmin)
  {
    id: 'u-admin-1',
    name: 'Priit Tamm',
    email: 'priit.tamm@vau.ee',
    role: 'ADMIN',
    roleLabel: 'Sysadmin (Süsteemiadministraator)',
    company: 'AS Viljandi Aken ja Uks',
    department: 'IT ja infosüsteemid',
    avatar: 'PT',
    badgeColor: 'badge-purple',
    description: 'Täielik haldusõigus: kliendid, müügiesindajad, kulukontod, veatüübid, auditilogid',
    initialView: 'sysadmin',
  },
];

const STORAGE_KEY = 'vau_claim_current_user_v3';

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    // Find the latest metadata from USERS if possible
    const match = USERS.find(u => u.id === user.id);
    return match || user;
  } catch (e) {
    return null;
  }
};

export const setCurrentUser = (user) => {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent('vau_auth_state_changed', { detail: { user } }));
};

export const logout = () => {
  setCurrentUser(null);
};

export const getRoleHomeView = (role) => {
  switch (role) {
    case 'DEALER':
      return 'dealer';
    case 'DISTRIBUTOR':
      return 'distributor';
    case 'HANDLER':
      return 'handler';
    case 'APPROVER':
      return 'approver';
    case 'SERVICE_TEAM':
      return 'mobile';
    case 'ADMIN':
      return 'sysadmin';
    default:
      return 'dealer';
  }
};
