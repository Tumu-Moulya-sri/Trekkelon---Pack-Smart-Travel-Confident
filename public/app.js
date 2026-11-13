const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (url, opts) => {
  const r = await fetch(url, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
};
const post = (url, body) => api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const clientId = localStorage.getItem('tk_client') || (() => {
  const v = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('tk_client', v); return v;
})();
const kgText = (kg) => (kg >= 1 ? kg.toFixed(1) + ' kg' : Math.round(kg * 1000) + ' g');
const ZONE = { with: 'Stays with you', stow: 'Stowed away' };
const TAG_LABEL = { liquid: 'Liquid', sharp: 'Sharp', powerbank: 'Power bank', flammable: 'Flammable', valuable: 'Valuable', fragile: 'Fragile', battery: 'Battery', spray: 'Spray', baby: 'Baby food', alcohol: 'Alcohol' };

let CFG;
const G = {};
let toastTimer, checkTimer;

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
const setAccent = (color) => document.documentElement.style.setProperty('--accent', color || '#0E8FA0');

/* ---------- routing ---------- */
async function route() {
  const [v, p, m] = location.hash.slice(1).split('/');
  window.scrollTo(0, 0);
  document.body.classList.toggle('is-home', v !== 'p' && v !== 'g');
  try {
    if (v === 'p' && CFG.personas[p]) return modeView(p);
    if (v === 'g' && CFG.personas[p] && CFG.modes[m]) return await guardView(p, m);
  } catch (e) { toast(e.message); }
  home();
}

function home() {
  setAccent();
  const ICON = { solo: '🎒', female_solo: '🛡️', family: '👨‍👩‍👧', business: '💼', last_minute: '⚡' };
  $('#app').innerHTML = `
    <section class="home">
      <div class="home-logo"><img src="logo.png" alt=""></div>
      <h1 class="home-title">Trekkelon</h1>
      <p class="home-tag">Pack smart. Travel confident.</p>
      <h2 class="home-ask">Who are you today?</h2>
      <div class="home-grid">${Object.entries(CFG.personas).map(([id, p]) =>
        `<a class="home-card" href="#p/${id}" style="--c:${p.color}"><span class="home-ico">${ICON[id] || '🧳'}</span><b>${esc(p.name)}</b><small>${esc(p.tag)}</small></a>`).join('')}</div>
    </section>`;
}

function modeView(p) {
  const P = CFG.personas[p]; setAccent(P.color);
  $('#app').innerHTML = `
    <a class="crumb" href="#">Back to traveler types</a>
    <h1 class="page-title">${esc(P.name)}: how are you travelling?</h1>
    <p class="sub">Each mode has its own bag sizes, weight limits and rules.</p>
    <div class="modes">${P.modes.map((m) => {
      const M = CFG.modes[m];
      return `<a class="mcard" href="#g/${p}/${m}" style="--c:${P.color}"><span class="ico">${M.icon}</span><b>${M.name}</b><span>${M.bags.map((b) => b.limit + ' kg').join(' + ')} allowance</span></a>`;
    }).join('')}</div>`;
}

/* ---------- Bag Guard ---------- */
async function guardView(p, m) {
  const d = await api(`/api/items?persona=${p}&mode=${m}`);
  const P = CFG.personas[p]; setAccent(P.color);
  Object.assign(G, { persona: p, mode: m, def: d.mode, items: Object.fromEntries(d.items.map((i) => [i.id, i])),
    custom: [], bags: Object.fromEntries(d.mode.bags.map((b) => [b.id, []])), active: d.mode.bags[0].id, live: null, report: null, stale: false, scanning: false });

  if (G.pending && G.pending.persona === p && G.pending.mode === m) {
    const t = G.pending; G.pending = null;
    G.custom = t.custom || [];
    G.custom.forEach((c) => { G.items[c.id] = c; });
    for (const id of Object.keys(G.bags)) G.bags[id] = (t.bags[id] || []).filter((x) => G.items[x]);
  }

  $('#app').innerHTML = `
    <a class="crumb" href="#p/${p}">Back to transport</a>
    <div class="guard-head"><div><span class="chipline">${esc(P.name)} · ${d.mode.icon} ${esc(d.mode.name)}</span>
      <h1 class="page-title">Pack your bags</h1></div>
      <p class="hint" style="max-width:46ch;margin:0">Tap an item to put it in the highlighted bag, or drag it. Tap an item in a bag to take it out.</p></div>
    <div class="guard">
      <aside class="panel" id="pool"></aside>
      <section class="bags" id="bags"></section>
      <aside class="panel report-col" id="report"></aside>
    </div>`;
  bindGuard(); paint(); check();
}

const packedIds = () => new Set(Object.values(G.bags).flat());
const allItems = () => Object.values(G.items);
function flagOf(id) {
  const f = (G.live?.flags || []).filter((x) => x.item === id);
  return f.some((x) => x.level === 'no') ? 'f-no' : f.length ? 'f-warn' : '';
}
const chip = (id) => {
  const i = G.items[id];
  return `<button type="button" class="chip ${i.essential ? 'ess' : ''} ${flagOf(id)}" draggable="true" data-id="${id}" title="${i.essential ? 'Essential. ' : ''}${esc(i.name)}"><span>${esc(i.name)}</span><em>${kgText(i.kg)}</em></button>`;
};

function paint() {
  paintPool(); paintBags(); paintReport();
}

function paintPool() {
  const packed = packedIds(), left = allItems().filter((i) => !packed.has(i.id));
  const total = allItems().length, pct = Math.round((packed.size / total) * 100);
  const cats = {};
  left.forEach((i) => (cats[i.cat] ||= []).push(i.id));
  $('#pool').innerHTML = `
    <h2>Your checklist</h2>
    <p class="hint">${packed.size} of ${total} packed. Dotted items are essentials.</p>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div data-zone="pool">${Object.entries(cats).map(([c, ids]) => `<div class="cat">${esc(c)}</div><div class="chips">${ids.map(chip).join('')}</div>`).join('') || '<p class="hint">Everything is packed. Run the scan.</p>'}</div>
    <form class="add" id="addForm"><input name="name" placeholder="Add your own item" maxlength="60" required><input name="kg" type="number" min="0" max="30" step="0.1" value="0.5" aria-label="Weight in kg">
      <select name="tag" aria-label="Item type"><option value="">Ordinary item</option>${CFG.tags.filter((t) => t !== 'banned').map((t) => `<option value="${t}">${TAG_LABEL[t]}</option>`).join('')}</select>
      <button class="btn" type="submit">Add item</button></form>`;
}

function paintBags() {
  $('#bags').innerHTML = G.def.bags.map((b) => {
    const ids = G.bags[b.id], kg = ids.reduce((s, id) => s + G.items[id].kg, 0), pct = Math.min(100, (kg / b.limit) * 100);
    const cls = kg > b.limit ? 'over' : pct > 85 ? 'near' : '';
    return `<div class="bag ${G.active === b.id ? 'active' : ''} ${G.scanning ? 'scanning' : ''}" data-bag="${b.id}" data-zone="${b.id}">
      <header data-select="${b.id}"><h3>${esc(b.name)}</h3><small>${ZONE[b.zone]}</small></header>
      <div class="meter"><i class="${cls}" style="width:${pct}%"></i></div>
      <div class="kg ${cls === 'over' ? 'over' : ''}"><span>${kgText(kg)} of ${b.limit} kg</span><span>${cls === 'over' ? (kg - b.limit).toFixed(1) + ' kg over' : (b.limit - kg).toFixed(1) + ' kg free'}</span></div>
      <div class="drop">${ids.map(chip).join('')}</div></div>`;
  }).join('');
}

function paintReport() {
  const r = G.report, box = $('#report');
  if (!r) {
    box.innerHTML = `<h2>Security scan</h2><p class="idle hint">Pack your bags, then run the scan to see what would be stopped, what is overweight and what you forgot.</p>${scanButton()}${saveForm()}`;
    return;
  }
  const rc = r.score >= 90 ? 'var(--ok)' : r.score >= 60 ? 'var(--warn)' : 'var(--no)';
  box.innerHTML = `<h2>Security scan</h2>
    ${G.stale ? '<div class="stale">Your bags changed. Scan again for a fresh result.</div>' : ''}
    <div class="ring" id="ring" style="--rc:${rc}"><div id="ringNum">0</div></div>
    <div class="verdict">${esc(r.verdict)}</div>
    ${r.flags.length ? `<ul class="flags">${r.flags.map((f) => `<li class="${f.level}"><b>${esc(f.name)} in ${esc(f.bagName)}</b>${esc(f.msg)}</li>`).join('')}</ul>` : '<div class="allgood">No rule problems found. Nothing in your bags would be stopped.</div>'}
    ${r.missing.length ? `<div class="missing"><h3>Essentials not packed yet</h3>${r.missing.map((m) => esc(m.name)).join(', ')}</div>` : ''}
    ${r.unverified && r.unverified.length ? `<div class="missing"><h3>Not verified</h3>${r.unverified.map((u) => esc(u.name)).join(', ')}. Trekkelon could not check these. Confirm with your airline or operator.</div>` : ''}
    ${scanButton()}${saveForm()}`;
  if (!G.stale) countUp(r.score);
  else { $('#ringNum').textContent = r.score; $('#ring').style.setProperty('--p', r.score); }
}
const scanButton = () => `<button class="btn big" id="scanBtn" type="button" style="margin-top:16px">${G.report ? 'Scan again' : 'Scan my bags'}</button>`;
const saveForm = () => `<form class="save" id="saveForm"><input name="name" placeholder="Name this trip" maxlength="60" required><button class="btn" type="submit">Save trip</button></form>`;

function countUp(to) {
  const ring = $('#ring'), num = $('#ringNum'); let n = 0;
  const step = () => { n = Math.min(to, n + Math.max(1, Math.round(to / 30))); num.textContent = n; ring.style.setProperty('--p', n); if (n < to) requestAnimationFrame(step); };
  step();
}

/* ---------- state changes ---------- */
function moveItem(id, dest) {
  for (const b of Object.keys(G.bags)) G.bags[b] = G.bags[b].filter((x) => x !== id);
  if (dest !== 'pool') G.bags[dest].push(id);
  if (G.report) G.stale = true;
  paint(); clearTimeout(checkTimer); checkTimer = setTimeout(check, 150);
}

async function check() {
  try {
    G.live = await post('/api/scan', { persona: G.persona, mode: G.mode, bags: G.bags, custom: G.custom });
    paintPool(); paintBags();
  } catch (e) { toast('Could not reach the Trekkelon server.'); }
}

async function runScan() {
  if (G.scanning) return;
  if (!packedIds().size) return toast('Pack at least one item first.');
  try {
    const r = await post('/api/scan', { persona: G.persona, mode: G.mode, bags: G.bags, custom: G.custom });
    G.scanning = true; $('#scanBtn').disabled = true; paintBags();
    setTimeout(() => { G.scanning = false; G.report = r; G.live = r; G.stale = false; paint(); }, 1900);
  } catch (e) { toast('Scan failed. Is the server running?'); }
}

function bindGuard() {
  const app = $('#app'); let dragId = null;
  app.onclick = (e) => {
    const c = e.target.closest('.chip');
    if (c) return moveItem(c.dataset.id, c.closest('.bag') ? 'pool' : G.active);
    const h = e.target.closest('[data-select]');
    if (h) { G.active = h.dataset.select; paintBags(); }
    if (e.target.id === 'scanBtn') runScan();
  };
  app.ondragstart = (e) => { const c = e.target.closest('.chip'); if (!c) return; dragId = c.dataset.id; e.dataTransfer.setData('text/plain', dragId); c.classList.add('dragging'); };
  app.ondragend = () => { dragId = null; document.querySelectorAll('.over-drop,.dragging').forEach((x) => x.classList.remove('over-drop', 'dragging')); };
  app.ondragover = (e) => { const z = e.target.closest('[data-zone]'); if (z && dragId) { e.preventDefault(); z.classList.add('over-drop'); } };
  app.ondragleave = (e) => { const z = e.target.closest('[data-zone]'); if (z) z.classList.remove('over-drop'); };
  app.ondrop = (e) => {
    const z = e.target.closest('[data-zone]'); if (!z || !dragId) return;
    e.preventDefault(); const id = dragId; dragId = null;
    if (z.dataset.zone !== 'pool') G.active = z.dataset.zone;
    moveItem(id, z.dataset.zone);
  };
  app.onsubmit = async (e) => {
    e.preventDefault(); const f = e.target, d = new FormData(f);
    if (f.id === 'addForm') {
      const name = String(d.get('name')).trim(); if (!name) return;
      const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Checking...';
      let ai = { tags: [], reason: '', verified: false };
      try { ai = await post('/api/classify', { name }); } catch (err) {}
      const picked = d.get('tag');
      const c = { id: 'c' + Date.now().toString(36), name, cat: 'Your items', kg: Math.max(0, Number(d.get('kg')) || 0),
        tags: [...new Set([...(picked ? [picked] : []), ...(ai.tags || [])])], essential: false, verified: !!ai.verified || !!picked };
      G.custom.push(c); G.items[c.id] = c; moveItem(c.id, G.active);
      if (ai.reason) toast(name + ': ' + ai.reason);
    }
    if (f.id === 'saveForm') {
      try {
        await post('/api/trips', { clientId, name: d.get('name'), persona: G.persona, mode: G.mode, bags: G.bags, custom: G.custom });
        toast('Trip saved. Find it under My trips.'); f.reset();
      } catch (err) { toast(err.message); }
    }
  };
}

/* ---------- saved trips ---------- */
async function openTrips() {
  const dlg = $('#tripsDlg'), list = $('#tripsList');
  list.innerHTML = '<p class="hint">Loading...</p>'; dlg.showModal();
  try {
    const trips = await api('/api/trips?clientId=' + encodeURIComponent(clientId));
    list.innerHTML = trips.length ? trips.map((t) => `<div class="trip"><button data-open="${t.id}"><b>${esc(t.name)}</b><small>${esc(CFG.personas[t.persona].name)} · ${esc(CFG.modes[t.mode].name)} · Gate-ready score ${t.score}</small></button><button class="del" data-del="${t.id}">Delete</button></div>`).join('')
      : '<p class="hint">No saved trips yet. Pack a bag and press Save trip.</p>';
    list.onclick = async (e) => {
      const o = e.target.closest('[data-open]'), x = e.target.closest('[data-del]');
      if (o) { G.pending = trips.find((t) => t.id === o.dataset.open); dlg.close(); const h = `#g/${G.pending.persona}/${G.pending.mode}`; if (location.hash === h) route(); else location.hash = h; }
      if (x) { await api(`/api/trips/${x.dataset.del}?clientId=${encodeURIComponent(clientId)}`, { method: 'DELETE' }); openTrips(); }
    };
  } catch (e) { list.innerHTML = '<p class="hint">Could not load trips.</p>'; }
}

$('#tripsBtn').onclick = openTrips;
$('#closeTrips').onclick = () => $('#tripsDlg').close();
window.addEventListener('hashchange', route);
api('/api/config').then((c) => { CFG = c; route(); }).catch(() => { $('#app').innerHTML = '<p class="sub">Could not reach the Trekkelon server. Start it with <b>npm start</b> and open http://localhost:3000.</p>'; });
