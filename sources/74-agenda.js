/* ---------- Agenda du téléphone : export .ics des rendez-vous et rappels, avec alarme ----------
   Sans serveur, pas d'abonnement qui se met à jour seul : on exporte un fichier, à refaire quand le carnet change.
   Chaque évènement garde le même identifiant d'un export à l'autre (UID), et le téléphone retient ce qu'il a déjà
   exporté : « Seulement les nouveautés » évite les doublons. */

const ICS_GENRES = [
  { v: 'soins', l: 'Soins et rappels' }, { v: 'concours', l: 'Concours' },
  { v: 'seances', l: 'Séances prévues' }, { v: 'docs', l: 'Échéances des documents' }
];
const ICS_ALARMES = [{ v: 'veille', l: 'La veille à 18 h' }, { v: 'matin', l: 'Le jour même à 8 h' }, { v: 'aucune', l: 'Sans alarme' }];

/* Les évènements à venir (un an), d'après le carnet */
function evenementsAgenda(genres, hids) {
  const t = todayISO(), fin = addDays(t, 365), out = [], okH = id => !hids || hids.includes(id);
  const dansAn = d => validISO(d) && d >= t && d <= fin;
  if (genres.includes('soins')) {
    list('soins').filter(s => s.statut === 'prevu' && dansAn(s.date) && cheval(s.horseId) && okH(s.horseId)).forEach(s =>
      out.push({ uid: 'soin-' + s.id, d: s.date, titre: `${soinLabel(s)} · ${hNom(s.horseId)}`, lieu: '', desc: [s.praticien ? 'Avec ' + s.praticien : '', s.produit, s.notes].filter(Boolean).join('\n') }));
    rappels().filter(r => !r.planned && dansAn(r.due) && okH(r.h.id)).forEach(r =>
      out.push({ uid: `rappel-${r.h.id}-${r.type.id}`, d: r.due, titre: `À prévoir : ${r.type.short} · ${r.h.nom}`, lieu: '', desc: `Dernier ${r.type.label.toLowerCase()} le ${dFull(r.last.date)}. Prends rendez-vous, puis note-le dans EquiValdi.` }));
  }
  if (genres.includes('concours') && rub('concours')) list('concours').filter(c => c.statut !== 'forfait' && cheval(c.horseId) && okH(c.horseId)).forEach(c => {
    if (dansAn(c.date)) out.push({ uid: 'concours-' + c.id, d: c.date, fin: validISO(c.dateFin) && c.dateFin > c.date ? c.dateFin : null, titre: `Concours · ${c.lieu || 'lieu à préciser'} · ${hNom(c.horseId)}`, lieu: c.lieu || '',
      desc: [c.discipline, nivLabel(c.niveau), c.epreuve, c.cavalier ? 'Cavalier : ' + c.cavalier : ''].filter(Boolean).join(' · ') });
    if (c.statut === 'a_engager' && dansAn(c.cloture)) out.push({ uid: 'cloture-' + c.id, d: c.cloture, titre: `Clôture des engagements · ${c.lieu || 'concours'} · ${hNom(c.horseId)}`, lieu: '', desc: `Concours du ${dFull(c.date)}. Pense à engager ${hNom(c.horseId)}.` });
  });
  if (genres.includes('seances') && rub('seances')) list('seances').filter(s => s.statut === 'prevu' && dansAn(s.date) && cheval(s.horseId) && okH(s.horseId)).forEach(s =>
    out.push({ uid: 'seance-' + s.id, d: s.date, heure: /^\d{2}:\d{2}$/.test(s.heure || '') ? s.heure : null, duree: Number(s.duree) > 0 ? Number(s.duree) : 60,
      titre: `${s.type || 'Séance'}${s.coach ? ' avec ' + s.coach : ''} · ${hNom(s.horseId)}`, lieu: s.lieu || '', desc: [nomDe({ uid: s.cavalierUid, nom: s.cavalier }) ? 'Cavalier : ' + nomDe({ uid: s.cavalierUid, nom: s.cavalier }) : '', s.notes].filter(Boolean).join('\n') }));
  if (genres.includes('docs')) chevaux().filter(h => okH(h.id)).forEach(h => docsDe(h).filter(x => dansAn(x.echeance)).forEach(x =>
    out.push({ uid: `doc-${h.id}-${x.id}`, d: x.echeance, titre: `Échéance : ${docTitre(x)} · ${h.nom}`, lieu: '', desc: [x.type !== 'autre' ? x.nom : '', x.numero ? 'N° ' + x.numero : '', x.note].filter(Boolean).join('\n'), avance: DOC_AVANCE })));
  return out.sort((a, b) => a.d.localeCompare(b.d) || String(a.heure || '').localeCompare(String(b.heure || '')));
}

/* Le fichier iCalendar (RFC 5545) : lignes CRLF repliées à 75 octets, textes échappés */
function texteIcs(evs, alarme) {
  const esc5545 = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const plier = l => {
    const enc = new TextEncoder(), out = [];
    let cur = '', n = 0;
    for (const ch of l) {
      const b = enc.encode(ch).length;
      if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; }
      cur += ch; n += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  };
  const jour = d => d.replace(/-/g, '');
  const p2 = n => String(n).padStart(2, '0');
  const now = new Date(), stamp = `${now.getUTCFullYear()}${p2(now.getUTCMonth() + 1)}${p2(now.getUTCDate())}T${p2(now.getUTCHours())}${p2(now.getUTCMinutes())}${p2(now.getUTCSeconds())}Z`;
  const dom = (window.EQ_SID || SID || 'local');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EquiValdi//Carnet d\'ecurie//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc5545('EquiValdi · ' + ((ecurieOuverte() || {}).nom || 'écurie'))}`];
  evs.forEach(e => {
    L.push('BEGIN:VEVENT', `UID:${e.uid}.${dom}@equivaldi`, `DTSTAMP:${stamp}`, `SUMMARY:${esc5545(e.titre)}`);
    if (e.heure) {
      const [h, m] = e.heure.split(':').map(Number), fin = h * 60 + m + e.duree;
      const dFin = fin >= 1440 ? addDays(e.d, 1) : e.d, mf = fin % 1440;
      L.push(`DTSTART:${jour(e.d)}T${p2(h)}${p2(m)}00`, `DTEND:${jour(dFin)}T${p2(Math.floor(mf / 60))}${p2(mf % 60)}00`);
    } else L.push(`DTSTART;VALUE=DATE:${jour(e.d)}`, `DTEND;VALUE=DATE:${jour(addDays(e.fin || e.d, 1))}`, 'TRANSP:TRANSPARENT');
    if (e.lieu) L.push(`LOCATION:${esc5545(e.lieu)}`);
    if (e.desc) L.push(`DESCRIPTION:${esc5545(e.desc + '\n\nDepuis EquiValdi')}`);
    // l'alarme choisie ; une échéance de document prévient aussi un mois avant
    const al = trig => L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc5545(e.titre)}`, `TRIGGER:${trig}`, 'END:VALARM');
    if (alarme === 'veille') al(e.heure ? '-P1D' : '-PT6H');
    if (alarme === 'matin') al(e.heure ? '-PT2H' : 'PT8H');
    if (e.avance) al(`-P${e.avance}D`);
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.map(plier).join('\r\n') + '\r\n';
}

/* La feuille d'export */
/* Ce qui a déjà été exporté depuis ce téléphone (par écurie) : un évènement inchangé n'est pas renvoyé */
const icsCle = () => 'equivaldi:ics:' + (window.EQ_SID || SID || 'local');
const icsSig = e => [e.uid, e.d, e.heure || '', e.titre].join('|');
function aExporter(f, hs) {
  const evs = evenementsAgenda(chipVals(f, 'ig'), hs.length > 1 ? chipVals(f, 'ih') : null), deja = lsGet(icsCle());
  if (!deja || chipVal(f, 'inv') !== 'nouv') return evs;
  const vus = new Set(deja.sig || []);
  return evs.filter(e => !vus.has(icsSig(e)));
}
function noterExport(evs) {
  const d = lsGet(icsCle()) || { sig: [] }, t = todayISO();
  // on oublie ce qui est passé, pour garder la liste courte
  const garde = (d.sig || []).filter(s => (s.split('|')[1] || '') >= t);
  lsSet(icsCle(), { le: t, sig: [...new Set([...garde, ...evs.map(icsSig)])] });
}
ACT['agenda-ics'] = () => {
  const hs = chevaux(), deja = lsGet(icsCle());
  const genres = ICS_GENRES.filter(g => (g.v !== 'concours' || rub('concours')) && (g.v !== 'seances' || rub('seances')));
  const body = `
    <p class="note">Les rendez-vous et rappels des douze prochains mois arrivent dans l'agenda de ton téléphone : son alarme te prévient, même appli fermée.</p>
    ${grp('Quoi', chips('ig', genres.map(g => ({ v: g.v, l: g.l })), genres.map(g => g.v), { multi: true }))}
    ${hs.length > 1 ? grp('Quels chevaux', chips('ih', hs.map(h => ({ v: h.id, l: h.nom })), hs.map(h => h.id), { multi: true })) : ''}
    ${grp('Alarme', chips('ia', ICS_ALARMES, ['veille']))}
    ${deja ? grp('Déjà exportés', chips('inv', [{ v: 'nouv', l: 'Seulement les nouveautés' }, { v: 'tout', l: 'Tout' }], ['nouv']), `Dernier export le ${dFull(deja.le)} depuis ce téléphone : « Seulement les nouveautés » évite les doublons dans l'agenda.`) : ''}
    <p class="note" id="w_icsn"></p>
    <button type="button" class="link" id="b_icsp" hidden style="align-self:flex-start">${ic('partage', 'sm')}Partager le fichier (autre appli d'agenda)</button>
    <p class="note">Ce n'est pas un abonnement : quand de nouveaux rendez-vous sont notés, refais l'export. Un rendez-vous déplacé ou annulé dans le carnet est à corriger aussi dans l'agenda.</p>`;
  openSheet('Agenda du téléphone', body, {
    submit: 'Ajouter à mon agenda', local: true,
    onMount: f => {
      const maj = () => { const n = aExporter(f, hs).length; $('#w_icsn').innerHTML = n ? `<b>${n} ${pl(n, 'évènement')}</b> à ajouter.` : chipVal(f, 'inv') === 'nouv' ? 'Rien de nouveau depuis le dernier export.' : 'Rien à venir avec ces choix.'; };
      f.addEventListener('chipchange', maj); maj();
      // partage du fichier : utile quand l'agenda n'ouvre pas les fichiers téléchargés
      const b = $('#b_icsp');
      let ok = false;
      try { ok = !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'a.ics', { type: 'text/calendar' })] })); } catch (e) { ok = false; }
      b.hidden = !ok;
      b.addEventListener('click', async () => {
        const evs = aExporter(f, hs);
        if (!evs.length) { toast('Rien à partager avec ces choix.'); return; }
        try { await navigator.share({ files: [new File([texteIcs(evs, chipVal(f, 'ia') || 'aucune')], `equivaldi-agenda-${todayISO()}.ics`, { type: 'text/calendar' })], title: 'Agenda EquiValdi' }); noterExport(evs); closeSheet(); }
        catch (e) { /* partage annulé */ }
      });
    },
    onSubmit: f => {
      const evs = aExporter(f, hs);
      if (!evs.length) return chipVal(f, 'inv') === 'nouv' ? 'Rien de nouveau depuis le dernier export : choisis « Tout » pour tout renvoyer.' : 'Rien à ajouter avec ces choix : aucun rendez-vous ni rappel à venir.';
      envoyerIcs(texteIcs(evs, chipVal(f, 'ia') || 'aucune'), evs.length);
      noterExport(evs);
    }
  });
};
async function envoyerIcs(txt, n) {
  const nom = `equivaldi-agenda-${todayISO()}.ics`;
  const blob = new Blob([txt], { type: 'text/calendar;charset=utf-8' });
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.__dernierIcs = txt;   // pour les tests
  // iPhone : ouvrir le fichier propose « Ajouter tous les évènements » ; ailleurs, on le télécharge
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url;
  if (!ios) a.download = nom;
  else a.target = '_blank';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  toast(ios ? `${n} ${pl(n, 'évènement')} : touche « Ajouter tout » pour les mettre dans ton agenda.` : `${n} ${pl(n, 'évènement')} : ouvre le fichier téléchargé pour les ajouter à ton agenda.`);
}
