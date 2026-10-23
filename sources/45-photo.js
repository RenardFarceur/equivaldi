
/* ---------- Photo des chevaux : choix, cadrage carré, vignette ---------- */
const PHOTO_PX = 320;      // côté de la vignette enregistrée
const WORK_MIN = 1600;     // les grandes photos sont réduites avant cadrage

function photoField(h, big = false) {
  const has = hasPhoto(h);
  return `<div class="field">
    <span class="flabel">Photo</span>
    <div class="pf${big ? ' lg' : ''}">
      <div class="pf-frame">
        <canvas id="pfCanvas" tabindex="0" aria-label="Cadrage de la photo : fais glisser pour déplacer, ou utilise les flèches du clavier"${has ? '' : ' hidden'}></canvas>
        <label for="f_photo" class="pf-empty" id="pfEmpty"${has ? ' hidden' : ''}>${ic('camera')}<span>Ajouter une photo</span></label>
      </div>
      <div class="pf-side">
        <label for="f_photo" class="btn small" id="pfPick">${ic('camera', 'sm')}<span>${has ? 'Changer' : 'Choisir une photo'}</span></label>
        <button type="button" class="btn small" id="pfDel"${has ? '' : ' hidden'}>${ic('trash', 'sm')}<span>Retirer</span></button>
      </div>
    </div>
    <div class="pf-zoom" id="pfZoomW"${has ? '' : ' hidden'}>
      <input type="range" class="range" id="pfZoom" min="1" max="4" step="0.01" value="1" aria-label="Zoom de la photo">
      <small class="hint">Fais glisser la photo pour la cadrer. Zoom : curseur ou deux doigts.</small>
    </div>
    <input type="file" id="f_photo" accept="image/*" class="vh" tabindex="-1" aria-hidden="true">
    <p class="err" id="pfErr" role="alert" hidden></p>
  </div>`;
}

const newCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const ctx2d = c => { const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; return x; };

/* Réduit une très grande image (par paliers, pour rester net) */
function shrink(img, w, h) {
  const m = Math.min(w, h);
  if (m <= WORK_MIN) return { img, w, h };
  const fw = Math.round(w * WORK_MIN / m), fh = Math.round(h * WORK_MIN / m);
  let src = img, cw = w, ch = h;
  while (cw / 2 > fw) {
    const t = newCanvas(cw / 2, ch / 2);
    ctx2d(t).drawImage(src, 0, 0, t.width, t.height);
    src = t; cw = t.width; ch = t.height;
  }
  const out = newCanvas(fw, fh);
  ctx2d(out).drawImage(src, 0, 0, fw, fh);
  if (img.close) { try { img.close(); } catch (e) { /* déjà libérée */ } }
  return { img: out, w: fw, h: fh };
}
async function decodeImage(file) {
  if (file.type && !/^image\//.test(file.type)) throw new Error('pas une image');
  let r = null;
  if (window.createImageBitmap) {
    try { const bm = await createImageBitmap(file, { imageOrientation: 'from-image' }); r = { img: bm, w: bm.width, h: bm.height }; } catch (e) { r = null; }
  }
  if (!r) {
    const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(file); });
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    r = { img: im, w: im.naturalWidth, h: im.naturalHeight };
  }
  if (!r.w || !r.h) throw new Error('image vide');
  return shrink(r.img, r.w, r.h);
}
/* Dessine le carré choisi de l'image dans ctx, réduit par paliers */
function drawCrop(ctx, st, size) {
  let src = st.img, s = Math.min(st.w, st.h) / st.zoom, sx = st.cx - s / 2, sy = st.cy - s / 2;
  while (s / 2 > size) {
    const t = newCanvas(s / 2, s / 2);
    ctx2d(t).drawImage(src, sx, sy, s, s, 0, 0, t.width, t.height);
    src = t; sx = 0; sy = 0; s = t.width;
  }
  ctx.drawImage(src, sx, sy, s, s, 0, 0, size, size);
}
function encodePhoto(st) {
  let size = PHOTO_PX, q = 0.82, out = '';
  for (let i = 0; i < 3; i++) {
    const c = newCanvas(size, size), x = ctx2d(c);
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, size, size);
    drawCrop(x, st, size);
    out = c.toDataURL('image/jpeg', q);
    if (out.length < 90000) break;
    size = Math.round(size * 0.8);
    q -= 0.12;
  }
  return out;
}

/* Branche le cadrage sur le formulaire ouvert ; renvoie l'accès au résultat */
function mountPhoto(h) {
  const cv = $('#pfCanvas'), input = $('#f_photo'), zoomEl = $('#pfZoom');
  const st = { img: null, w: 0, h: 0, zoom: 1, cx: 0, cy: 0, changed: false, loading: false };
  const side = () => Math.min(st.w, st.h) / st.zoom;
  const err = msg => { const e = $('#pfErr'); e.textContent = msg || ''; e.hidden = !msg; };
  function clamp() {
    const s2 = side() / 2;
    st.cx = Math.min(Math.max(st.cx, s2), st.w - s2);
    st.cy = Math.min(Math.max(st.cy, s2), st.h - s2);
  }
  function draw() {
    if (!st.img || !cv.isConnected) return;
    const wCss = cv.getBoundingClientRect().width;
    if (!wCss) return;
    const px = Math.round(wCss * Math.min(3, window.devicePixelRatio || 1));
    if (cv.width !== px) { cv.width = px; cv.height = px; }
    const x = ctx2d(cv), s = side();
    x.clearRect(0, 0, px, px);
    x.drawImage(st.img, st.cx - s / 2, st.cy - s / 2, s, s, 0, 0, px, px);
  }
  function show(has) {
    cv.hidden = !has;
    $('#pfEmpty').hidden = has;
    $('#pfDel').hidden = !has;
    $('#pfZoomW').hidden = !has;
    $('#pfPick span').textContent = has ? 'Changer' : 'Choisir une photo';
  }
  function setImage(r) {
    Object.assign(st, { img: r.img, w: r.w, h: r.h, zoom: 1, cx: r.w / 2, cy: r.h / 2 });
    zoomEl.value = '1';
    show(true);
    requestAnimationFrame(draw);
  }
  if (hasPhoto(h)) {
    const im = new Image();
    im.onload = () => { if (!st.changed) setImage({ img: im, w: im.naturalWidth, h: im.naturalHeight }); };
    im.src = h.photo;
  }
  input.addEventListener('change', async () => {
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    err('');
    st.loading = true;
    $('#pfPick span').textContent = 'Ouverture…';
    try {
      setImage(await decodeImage(f));
      st.changed = true;
    } catch (e) {
      show(!!st.img);
      err("Cette image n'a pas pu être ouverte. Choisis une photo JPEG ou PNG.");
    } finally { st.loading = false; }
  });
  $('#pfDel').addEventListener('click', () => {
    st.img = null;
    st.changed = true;
    show(false);
  });
  zoomEl.addEventListener('input', () => {
    st.zoom = Math.min(4, Math.max(1, Number(zoomEl.value) || 1));
    clamp(); draw(); st.changed = true;
  });
  /* Glisser pour déplacer, pincer pour zoomer */
  const pts = new Map();
  let g = null;
  const begin = () => {
    const a = [...pts.values()];
    g = { cx: st.cx, cy: st.cy, zoom: st.zoom, x: a[0].x, y: a[0].y, d: a.length > 1 ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) : 0 };
  };
  cv.addEventListener('pointerdown', e => {
    if (!st.img) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignoré */ }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    begin();
  });
  cv.addEventListener('pointermove', e => {
    if (!g || !pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const a = [...pts.values()];
    if (a.length > 1 && g.d > 0) {
      st.zoom = Math.min(4, Math.max(1, g.zoom * Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) / g.d));
      zoomEl.value = String(st.zoom);
    } else {
      const k = side() / (cv.getBoundingClientRect().width || 1);
      st.cx = g.cx - (a[0].x - g.x) * k;
      st.cy = g.cy - (a[0].y - g.y) * k;
    }
    clamp(); draw(); st.changed = true;
  });
  const end = e => { pts.delete(e.pointerId); if (pts.size) begin(); else g = null; };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('keydown', e => {
    const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!m || !st.img) return;
    e.preventDefault();
    const step = side() * 0.05;
    st.cx += m[0] * step; st.cy += m[1] * step;
    clamp(); draw(); st.changed = true;
  });
  return {
    busy: () => st.loading,
    result: () => {
      if (!st.changed) return { changed: false };
      if (!st.img) return { changed: true, photo: null };
      return { changed: true, photo: encodePhoto(st) };
    }
  };
}

/* Feuille « Photo de … », ouverte depuis la fiche */
function formPhoto(id) {
  const h = cheval(id);
  if (!h) return;
  const had = hasPhoto(h);
  let ph = null;
  openSheet(`Photo de ${h.nom}`, photoField(h, true), {
    onMount: () => {
      ph = mountPhoto(h);
      if (!had) { try { $('#f_photo').click(); } catch (e) { /* le bouton reste disponible */ } }
    },
    onSubmit: () => {
      if (ph.busy()) return 'La photo est encore en cours d\'ouverture, réessaie dans un instant.';
      const r = ph.result();
      if (!r.changed) return;
      put('chevaux', Object.assign({}, h, { photo: r.photo || null }));
      toast(r.photo ? 'Photo enregistrée' : 'Photo retirée');
    }
  });
}
ACT.photo = d => formPhoto(d.id);
