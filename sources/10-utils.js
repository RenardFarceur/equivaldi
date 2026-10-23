'use strict';
/* ---------- Outils ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const validISO = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const toUTC = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
const fromUTC = t => { const d = new Date(t); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const addDays = (iso, n) => fromUTC(toUTC(iso) + n * 864e5);
const diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 864e5);
const DTF = {};
function fmt(iso, o) {
  const k = JSON.stringify(o);
  if (!DTF[k]) DTF[k] = new Intl.DateTimeFormat('fr-FR', Object.assign({ timeZone: 'UTC' }, o));
  return DTF[k].format(new Date(toUTC(iso)));
}
const sameYear = iso => iso.slice(0, 4) === todayISO().slice(0, 4);
const dShort = iso => validISO(iso) ? fmt(iso, { day: 'numeric', month: 'short' }) + (sameYear(iso) ? '' : ' ' + iso.slice(0, 4)) : '';
const dLong = iso => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });
const dFull = iso => validISO(iso) ? fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const dDay = iso => fmt(iso, { day: 'numeric' });
const dMon = iso => fmt(iso, { month: 'short' }).replace('.', '');
const dWeek = iso => fmt(iso, { weekday: 'short' }).replace('.', '');
const dDayHead = iso => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });
function dRel(iso) {
  const n = diffDays(todayISO(), iso);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  if (n > 1 && n < 7) return `dans ${n} j`;
  if (n < -1 && n > -7) return `il y a ${-n} j`;
  return 'le ' + dShort(iso);
}
const NF = {};
function num(v, d = 1) {
  if (v == null || !Number.isFinite(v)) return '–';
  if (!NF[d]) NF[d] = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d });
  return NF[d].format(v);
}
function parseNum(s) {
  if (s == null) return null;
  const t = String(s).trim().replace(/[\s  ]/g, '').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clone = o => JSON.parse(JSON.stringify(o));
const byName = (a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr', { sensitivity: 'base' });
const pl = (n, s, p) => (Math.abs(n) >= 2 ? (p || s + 's') : s);
const nJ = n => `${n} ${pl(n, 'jour')}`;
const ordinal = n => n === 1 ? '1<sup>er</sup>' : `${n}<sup>e</sup>`;
const ordTxt = n => n === 1 ? '1er' : `${n}e`;
const initials = s => (s || '?').trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
const plWords = s => String(s).toLowerCase().split(' ').map(w => /[sxz]$/.test(w) ? w : w + 's').join(' ');
const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
function ageTxt(iso) {
  if (!validISO(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const [ty, tm, td] = todayISO().split('-').map(Number);
  const months = (ty - y) * 12 + (tm - m) - (td < d ? 1 : 0);
  if (months < 0) return '';
  if (months < 24) return `${months} mois`;
  return `${Math.floor(months / 12)} ans`;
}

/* ---------- Icônes (trait 2 px, grille 24) ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  shoe: '<path d="M4 20 3 12a9 9 0 0 1 18 0l-1 8h-3l.5-7.5a5.5 5.5 0 0 0-11 0L7 20Z"/><path d="M5.2 15.5h.01M18.8 15.5h.01M6.2 9h.01M17.8 9h.01"/>',
  fence: '<path d="M4 21V7l2-3 2 3v14M16 21V7l2-3 2 3v14M8 10h8M8 16h8"/>',
  bale: '<circle cx="12" cy="12" r="9"/><path d="M12 12a1.5 1.5 0 0 1 3 0 3 3 0 0 1-6 0 4.5 4.5 0 0 1 9 0 6 6 0 0 1-6 6"/>',
  rosette: '<circle cx="12" cy="9" r="6"/><circle cx="12" cy="9" r="2.4"/><path d="M8.6 13.9 7 21l5-2.6 5 2.6-1.6-7.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  alert: '<path d="M12 3.5 2.5 20h19L12 3.5Z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  syringe: '<path d="m18 3 3 3M19.5 4.5 16 8M14 6l4 4M15 7l-8.5 8.5L4 20l4.5-2.5L17 9M9 11l2 2M11.5 8.5l2 2"/>',
  move: '<path d="M4 12h15M14 6l6 6-6 6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  leaf: '<path d="M5 20c0-9 5-14 15-16-1 10-6 15-15 16Z"/><path d="M5 20l7-7"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 7.5c.8-.8 2.2-.8 3 0M13 6c.8-.8 2.2-.8 3 0"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 1 5-5l-2.5 2.5.5 2 2 .5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  barn: '<path d="M3 21V9l9-6 9 6v12Z"/><path d="M8 21v-8h8v8M8 13l8 8M16 13l-8 8"/>',
  stetho: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v3a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="12" r="2"/>',
  tooth: '<path d="M7 3c-2 0-3.5 1.6-3.5 4 0 3 1.5 4 2 7 .4 2.5.8 7 2.5 7s1.6-5 4-5 2.3 5 4 5 2.1-4.5 2.5-7c.5-3 2-4 2-7 0-2.4-1.5-4-3.5-4-2 0-3 1-5 1s-3-1-5-1Z"/>',
  hands: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L4 15.5a1.6 1.6 0 0 1 2.4-2.1L7 14v-3"/>',
  pill: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9.2 8.1 5.6 7.8"/>',
  camera: '<path d="M3.5 8.5h3.2L8.5 6h7l1.8 2.5h3.2V19h-17Z"/><circle cx="12" cy="13.2" r="3.4"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5M12 2.5V6M18.2 7.3l1.3-1.3"/>',
  tasks: '<path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="m3.5 6.5 1.3 1.3 2.5-2.5M3.5 12l1.3 1.3 2.5-2.5M3.5 17.5l1.3 1.3 2.5-2.5"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c.6-3.9 3.6-6.3 7.5-6.3s6.9 2.4 7.5 6.3"/>',
  users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M2.8 19.5c.5-3.4 3-5.5 6.2-5.5s5.7 2.1 6.2 5.5"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.3c2.1.7 3.5 2.5 3.8 5.2"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'
};
const durTxt = m => {
  m = Math.round(Number(m) || 0);
  if (!m) return '';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${pad(r)}` : `${h} h`;
};
const hTxt = ms => { const d = new Date(ms); return `${d.getHours()} h ${pad(d.getMinutes())}`; };
const heureTxt = s => { if (!/^\d{2}:\d{2}$/.test(s || '')) return ''; const [h, m] = s.split(':'); return m === '00' ? `${+h} h` : `${+h} h ${m}`; };
const ICON_VB = {};   // icônes pleines tirées du logo (autre repère que 24 × 24)
const ic = (n, c = '') => `<svg class="ic${ICON_VB[n] ? ' solid' : ''} ${c}" viewBox="${ICON_VB[n] || '0 0 24 24'}" aria-hidden="true" focusable="false">${ICONS[n] || ''}</svg>`;

/* ---------- Référentiels ---------- */
const SOINS = [
  { id: 'grippe', label: 'Vaccin grippe', short: 'Grippe', vac: true, icon: 'syringe' },
  { id: 'tetanos', label: 'Vaccin tétanos', short: 'Tétanos', vac: true, icon: 'syringe' },
  { id: 'rhino', label: 'Vaccin rhinopneumonie', short: 'Rhino', vac: true, icon: 'syringe' },
  { id: 'vermifuge', label: 'Vermifuge', short: 'Vermifuge', icon: 'pill' },
  { id: 'marechal', label: 'Maréchal / parage', short: 'Maréchal', icon: 'shoe' },
  { id: 'dentiste', label: 'Dentiste', short: 'Dentiste', icon: 'tooth' },
  { id: 'osteo', label: 'Ostéopathe', short: 'Ostéo', icon: 'hands' },
  { id: 'veto', label: 'Vétérinaire', short: 'Véto', icon: 'stetho' },
  { id: 'autre', label: 'Autre soin', short: 'Autre', icon: 'clock' }
];
const DEF_RAPPELS = { grippe: 365, tetanos: 730, rhino: 182, vermifuge: 120, marechal: 49, dentiste: 365, osteo: 180, veto: 0, autre: 0 };
const REPAS = [
  { id: 'matin', label: 'Matin' }, { id: 'midi', label: 'Midi' }, { id: 'soir', label: 'Soir' },
  { id: 'nuit', label: 'Nuit' }, { id: 'jour', label: 'À volonté' }
];
const UNITES = ['kg', 'g', 'L', 'mesure', 'poignée'];
const ALIMENTS = ['Foin', 'Enrubanné', 'Paille', 'Granulés', 'Floconnés', 'Orge', 'Avoine', 'Luzerne', 'Pulpe de betterave', 'Son', 'Huile', 'CMV (minéraux)', 'Sel', 'Complément', 'Carottes'];
const ALIM_RAPIDES = ['Foin', 'Granulés', 'Floconnés', 'Luzerne', 'CMV (minéraux)', 'Huile'];
const SEXES = ['Jument', 'Hongre', 'Étalon'];
const RACES = ['Selle Français', 'Anglo-Arabe', 'Pur-sang', 'Trotteur Français', 'KWPN', 'Hanovrien', 'Holsteiner', 'Lusitanien', 'Pure Race Espagnole', 'Connemara', 'Poney Français de Selle', 'Welsh', 'Haflinger', 'Fjord', 'Mérens', 'Camargue', 'Quarter Horse', 'Appaloosa', 'Paint Horse', 'Pur-sang arabe', 'Shagya', 'Frison', 'Comtois', 'Origine non constatée'];
const ROBES = ['Bai', 'Bai brun', 'Bai cerise', 'Alezan', 'Alezan brûlé', 'Gris', 'Gris pommelé', 'Noir', 'Pie', 'Isabelle', 'Palomino', 'Rouan', 'Aubère', 'Blanc'];
const DISCIPLINES = ['CSO', 'Dressage', 'CCE', 'Hunter', 'Endurance', 'TREC', 'Attelage', 'Équifun', 'Western', 'Autre'];
const NIVEAUX = [
  { id: 'club', label: 'Club' }, { id: 'poney', label: 'Poney' }, { id: 'amateur', label: 'Amateur' },
  { id: 'pro', label: 'Pro' }, { id: 'prepa', label: 'Préparatoire' }, { id: 'shf', label: 'SHF' },
  { id: 'fei', label: 'FEI' }, { id: 'autre', label: 'Autre' }
];
const ENGAGEMENT = [{ id: 'a_engager', label: 'À engager' }, { id: 'engage', label: 'Engagé' }, { id: 'forfait', label: 'Forfait' }];
const ENTRETIENS = ['Hersage', 'Fauche des refus', 'Ramassage crottins', 'Amendement / engrais', 'Sursemis', 'Clôtures', 'Abreuvoir', 'Fauche foin', 'Autre'];
const TYPES_SEANCE = ['Plat', 'Obstacle', 'Cross', 'Longe', 'Travail à pied', 'Extérieur', 'Marcheur', 'Autre'];
const INTENSITES = [{ id: 'legere', label: 'Légère' }, { id: 'moyenne', label: 'Moyenne' }, { id: 'soutenue', label: 'Soutenue' }];
const RESSENTIS = [{ id: 'super', label: 'Super' }, { id: 'bien', label: 'Bien' }, { id: 'moyen', label: 'Moyen' }, { id: 'difficile', label: 'Difficile' }];
const LIEUX = ['Carrière', 'Manège', 'Rond de longe', 'Extérieur', 'Pré'];
const DUREES = [20, 30, 45, 60];
const TACHES_SUGG = [
  { titre: 'Foin du matin', freq: 'jour' }, { titre: 'Foin du soir', freq: 'jour' },
  { titre: 'Eau / abreuvoirs', freq: 'jour' }, { titre: 'Tour des chevaux', freq: 'jour' },
  { titre: 'Ramasser les crottins', freq: 'jours', n: 3 }, { titre: 'Tour des clôtures', freq: 'jours', n: 7 }
];
const DEF_BALLES = [{ id: 'round', nom: 'Round', poids: 250 }, { id: 'botte', nom: 'Petite botte', poids: 18 }, { id: 'cube', nom: 'Gros cube', poids: 300 }];
const NB_COULEURS = 8;
