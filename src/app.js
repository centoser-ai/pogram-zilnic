(() => {
'use strict';

const APP_VERSION = '1.2.0';
const LS_KEY = 'programzilnic.v1';
const LS_UI = 'programzilnic.ui';
const NOTE_MAX = 4000;
const HOSTED_URL = 'https://centoser-ai.github.io/pogram-zilnic/';

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const clone = (o) => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sum = (a) => a.reduce((x, y) => x + y, 0);
const avg = (a) => (a.length ? sum(a) / a.length : null);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || uid();
const NB = ' ';

/* ================= dates (local time, Monday-first weeks) ================= */
const DOW_SHORT = ['D', 'L', 'Ma', 'Mi', 'J', 'V', 'S'];
const DOW_LONG = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const MONTHS_SHORT = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'];
const MONTH_INITIAL = ['I', 'F', 'M', 'A', 'M', 'I', 'I', 'A', 'S', 'O', 'N', 'D'];
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
const isRealKey = (k) => isKey(k) && keyOf(parseKey(k)) === k;
const todayKey = () => keyOf(new Date());
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const dowOf = (k) => parseKey(k).getDay();
const weekStart = (k) => addDays(k, -((dowOf(k) + 6) % 7));
const weekKeys = (k) => { const s = weekStart(k); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); };
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
const monthKeys = (y, m) => { const n = new Date(y, m + 1, 0).getDate(); return Array.from({ length: n }, (_, i) => keyOf(new Date(y, m, i + 1, 12))); };
function isoWeek(k) {
  const d = parseKey(k);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}
const shortDate = (k) => { const d = parseKey(k); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
function rangeLabel(a, b) {
  const da = parseKey(a), db = parseKey(b);
  const y = db.getFullYear() !== new Date().getFullYear() ? ` ${db.getFullYear()}` : '';
  if (da.getMonth() === db.getMonth()) return `${da.getDate()} – ${db.getDate()} ${MONTHS[db.getMonth()]}${y}`;
  return `${da.getDate()} ${MONTHS_SHORT[da.getMonth()]} – ${db.getDate()} ${MONTHS_SHORT[db.getMonth()]}${y}`;
}
const isCurrentWeek = (k) => weekStart(k) === weekStart(todayKey());
const weekWord = (k) => (isCurrentWeek(k) ? 'săptămâna asta' : 'în săptămâna aceea');

/* ================= Romanian numbers & plurals ================= */
const NF = [0, 1, 2].map((d) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: d }));
const fmt = (v, d = 1) => (v == null || !isFinite(v) ? '—' : NF[d].format(v));
const inputVal = (v) => (v == null ? '' : String(v).replace('.', ','));
function plural(n, one, many) {
  const r = Math.abs(n) % 100;
  const de = Math.abs(n) >= 20 && (r === 0 || r >= 20);
  return n === 1 ? `1${NB}${one}` : `${fmt(n, 2)}${NB}${de ? `de${NB}` : ''}${many}`;
}
const noun = (n, one, many) => plural(n, one, many).split(NB).slice(1).join(NB);
const ori = (n) => (n === 0 ? 'deloc' : n === 1 ? 'o dată' : `de${NB}${plural(n, 'oară', 'ori')}`);
function parseNum(str, int = false) {
  if (str == null) return null;
  let s = String(str).trim().replace(/\s+/g, '');
  if (!s) return null;
  if (int && /^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
  s = s.replace(',', '.');
  const v = Number(s);
  if (!isFinite(v) || v < 0) return null;
  return int ? Math.round(v) : Math.round(v * 100) / 100;
}
function relDay(k) {
  const n = daysBetween(k, todayKey());
  if (n === 0) return 'azi';
  if (n === 1) return 'ieri';
  if (n > 1) return `acum ${plural(n, 'zi', 'zile')}`;
  return shortDate(k);
}
function fmtMin(m) {
  if (!m) return '';
  const h = Math.floor(m / 60), r = Math.round(m % 60);
  return h ? `${h}${NB}h${r ? ` ${r}${NB}min` : ''}` : `${r}${NB}min`;
}
function fmtPace(km, min) {
  if (!km || !min) return '';
  const sec = Math.round((min * 60) / km);
  return `${Math.floor(sec / 60)}:${pad(sec % 60)}${NB}/km`;
}
const compact = (v) => (v >= 1000 ? `${fmt(v / 1000, 2)}k` : fmt(v, v % 1 ? 2 : 0));
// km still missing to the weekly minimum, rounded up to 100 m so it never reads "0 km"
const kmLeft = (km, goal) => { const l = Math.round((goal - km) * 100) / 100; return l <= 0 ? 0 : Math.ceil(l * 10 - 1e-9) / 10; };
const kmReached = (km, goal) => goal > 0 && kmLeft(km, goal) === 0;

/* ================= defaults & state ================= */
const DEFAULT_MUSCLES = ['Piept', 'Spate', 'Umeri', 'Biceps', 'Triceps', 'Trapez', 'Abdomen', 'Picioare', 'Fesieri', 'Gambe', 'Antebrațe'];
const DEFAULT_SPORTS = [
  ['Box', '🥊', 0], ['Dans', '💃', 0], ['Bicicletă', '🚴', 1], ['Înot', '🏊', 0], ['Yoga', '🧘', 0],
  ['Fotbal', '⚽', 0], ['Tenis', '🎾', 0], ['Baschet', '🏀', 0], ['Volei', '🏐', 0], ['Drumeție', '🥾', 1],
  ['Pilates', '🤸', 0], ['Stretching', '🙆', 0], ['Arte marțiale', '🥋', 0], ['Escaladă', '🧗', 0],
  ['Role', '🛼', 1], ['Schi', '⛷️', 0],
];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const TYPE_LABEL = { check: 'Bifă simplă', num: 'Cu valoare', gym: 'Sală · grupe musculare', run: 'Alergare · km', sport: 'Alt sport · din listă' };
const MOODS = [[1, '😫', 'Groaznic'], [2, '🙁', 'Rău'], [3, '😐', 'Ok'], [4, '🙂', 'Bine'], [5, '😄', 'Super']];
const EMOJI_PICKS = ['✅', '📚', '🇪🇸', '🇯🇵', '🇬🇧', '♟️', '🧘', '💊', '🦷', '🧹', '🎸', '🎹', '✍️', '💻', '🙏', '🚿', '🌱', '🐕', '📵', '🧠', '🥗', '😴', '🚶', '💰'];
const GOAL_MAX = { kmWeek: 500, gymWeek: 21, kcal: 10000, protein: 500, water: 30, sleep: 24, steps: 100000 };
const DAY_RANGES = { kcal: [0, 20000], protein: [0, 1000], water: [0, 50], sleep: [0, 24], weight: [1, 500], steps: [1, 300000], mood: [1, 5] };
const KINDS = new Set(['gym', 'run', 'sport', 'num', 'chk']);
const FIRST_SCHED = '0000-01-01';

function defaultSettings() {
  return {
    goals: { kmWeek: 20, gymWeek: 3, kcal: 2500, protein: 150, water: 8, sleep: 8, steps: 10000 },
    tasks: [
      { id: 'gym', type: 'gym', name: 'Sală', emoji: '🏋️', days: [1, 3, 5] },
      { id: 'run', type: 'run', name: 'Alergare', emoji: '🏃', days: [2, 4, 6] },
      { id: 'sport', type: 'sport', name: 'Alt sport', emoji: '🥊', days: [] },
      { id: 'spaniola', type: 'check', name: 'Învățat spaniolă', emoji: '🇪🇸', days: ALL_DAYS.slice() },
      { id: 'japoneza', type: 'check', name: 'Învățat japoneză', emoji: '🇯🇵', days: ALL_DAYS.slice() },
      { id: 'sah', type: 'check', name: 'Jucat șah', emoji: '♟️', days: ALL_DAYS.slice() },
    ],
    muscles: DEFAULT_MUSCLES.map((n) => ({ id: slug(n), name: n })),
    sports: DEFAULT_SPORTS.map(([n, e, km]) => ({ id: slug(n), name: n, emoji: e, km: !!km })),
    modules: { nutrition: true, water: true, sleep: true, weight: true, steps: false, mood: true, sex: true, notes: true },
    start: todayKey(),
  };
}

const numIn = (v, lo, hi) => (typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? v : undefined);
const dayList = (a) => (Array.isArray(a) ? [...new Set(a.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : []);
function cleanEntry(e) {
  if (!e || typeof e !== 'object' || !KINDS.has(e.k)) return null;
  const o = { k: e.k };
  if (e.d === true) o.d = true;
  if (e.auto === true && o.d) o.auto = true;
  if (e.off === true && !o.d) o.off = true;
  if (Array.isArray(e.m)) { const m = e.m.filter((x) => typeof x === 'string'); if (m.length) o.m = m; }
  const km = numIn(e.km, 0.01, 1000); if (km !== undefined) o.km = km;
  const min = numIn(e.min, 1, 1440); if (min !== undefined) o.min = min;
  const v = numIn(e.v, 0, 1e7); if (v !== undefined) o.v = v;
  if (Array.isArray(e.s)) {
    const s = e.s.filter((x) => x && typeof x.id === 'string').map((x) => {
      const r = { id: x.id };
      const mm = numIn(x.min, 1, 1440); if (mm !== undefined) r.min = mm;
      const kk = numIn(x.km, 0.01, 1000); if (kk !== undefined) r.km = kk;
      return r;
    });
    if (s.length) o.s = s;
  }
  return o.d || o.m || o.km != null || o.min != null || o.v != null || o.s ? o : null;
}
function cleanImportedDay(d) {
  const o = {};
  if (!d || typeof d !== 'object') return o;
  for (const [f, [lo, hi]] of Object.entries(DAY_RANGES)) { const v = numIn(d[f], lo, hi); if (v !== undefined) o[f] = v; }
  if (o.mood != null && !Number.isInteger(o.mood)) delete o.mood;
  if (d.sex === true) o.sex = true;
  if (typeof d.note === 'string' && d.note.trim()) o.note = d.note.slice(0, NOTE_MAX);
  if (d.t && typeof d.t === 'object') {
    const t = {};
    for (const [id, e] of Object.entries(d.t)) { const c = cleanEntry(e); if (c) t[id] = c; }
    if (Object.keys(t).length) o.t = t;
  }
  return o;
}

function normalize(raw) {
  const def = defaultSettings();
  const src = raw && typeof raw === 'object' ? raw : {};
  const st = src.settings && typeof src.settings === 'object' ? src.settings : {};
  const goals = { ...def.goals };
  if (st.goals && typeof st.goals === 'object') {
    for (const g of Object.keys(goals)) { const v = numIn(st.goals[g], 0, GOAL_MAX[g]); if (v !== undefined) goals[g] = v; }
  }
  const tasks = Array.isArray(st.tasks)
    ? st.tasks.filter((t) => t && typeof t === 'object' && t.id && t.name && TYPE_LABEL[t.type]).map((t) => {
      const o = { id: String(t.id), type: t.type, name: String(t.name).slice(0, 60), emoji: String(t.emoji || '✅').slice(0, 16), days: dayList(t.days) };
      if (isRealKey(t.since)) o.since = t.since;
      if (Array.isArray(t.sched)) {
        const sched = t.sched.filter((s) => s && isKey(s.from)).map((s) => ({ from: s.from, days: dayList(s.days) })).sort((a, b) => (a.from < b.from ? -1 : 1));
        if (sched.length) o.sched = sched;
      }
      if (t.type === 'num') { o.unit = String(t.unit || '').slice(0, 20); o.target = numIn(t.target, 0.01, 1e7) ?? null; }
      return o;
    })
    : def.tasks;
  const listOf = (arr, fallback, mapper) => (Array.isArray(arr) ? arr.filter((x) => x && typeof x === 'object' && x.id && x.name).map(mapper) : fallback);
  const muscles = listOf(st.muscles, def.muscles, (m) => ({ id: String(m.id), name: String(m.name).slice(0, 40), ...(m.hidden === true ? { hidden: true } : {}) }));
  const sports = listOf(st.sports, def.sports, (s) => ({ id: String(s.id), name: String(s.name).slice(0, 40), emoji: String(s.emoji || '🏅').slice(0, 16), km: !!s.km, ...(s.hidden === true ? { hidden: true } : {}) }));
  const modules = { ...def.modules };
  if (st.modules && typeof st.modules === 'object') for (const m of Object.keys(modules)) if (typeof st.modules[m] === 'boolean') modules[m] = st.modules[m];
  const days = {};
  if (src.days && typeof src.days === 'object') {
    for (const [k, d] of Object.entries(src.days)) {
      if (!isRealKey(k)) continue;
      const c = cleanImportedDay(d);
      if (Object.keys(c).length) days[k] = c;
    }
  }
  const orphanName = (id) => cap(String(id).replace(/-/g, ' ').slice(0, 40));
  for (const d of Object.values(days)) {
    for (const e of Object.values(d.t || {})) {
      for (const s of e.s || []) if (!sports.some((x) => x.id === s.id)) sports.push({ id: s.id, name: orphanName(s.id), emoji: '🏅', km: true, hidden: true });
      for (const m of e.m || []) if (!muscles.some((x) => x.id === m)) muscles.push({ id: m, name: orphanName(m), hidden: true });
    }
  }
  // start only gets inferred for data that never had one; afterwards it stays put
  const firstDay = Object.keys(days).sort()[0];
  let start = isRealKey(st.start) ? st.start : (firstDay || def.start);
  if (start > todayKey()) start = todayKey();
  return { v: 1, settings: { goals, tasks, muscles, sports, modules, start }, days };
}

let state = normalize(null);
const ui = {
  tab: 'azi', date: todayKey(), followToday: true, week: todayKey(),
  statsMode: 'week', statsAnchor: todayKey(), expanded: new Set(), showUns: null, remoteDirty: false,
};
const S = () => state.settings;
const visMuscles = () => S().muscles.filter((m) => !m.hidden);
const visSports = () => S().sports.filter((s) => !s.hidden);
const taskById = (id) => S().tasks.find((t) => t.id === id);
const dayOf = (k) => state.days[k] || {};
const entryOf = (k, id) => dayOf(k).t?.[id];
const isDone = (k, id) => !!entryOf(k, id)?.d;
function daysAt(t, k) {
  if (!t.sched?.length) return t.days;
  let d = [];
  for (const s of t.sched) if (s.from <= k) d = s.days;
  return d;
}
const isScheduled = (t, k) => k >= state.settings.start && daysAt(t, k).includes(dowOf(k)) && (!t.since || t.since <= k);
const KIND = { gym: 'gym', run: 'run', sport: 'sport', num: 'num', check: 'chk' };
const isStandalone = () => window.navigator.standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches;

/* ================= persistence ================= */
const timers = new Map();
function debounce(id, ms, fn) {
  const prev = timers.get(id);
  if (prev) clearTimeout(prev.t);
  const t = setTimeout(() => { timers.delete(id); fn(); }, ms);
  timers.set(id, { t, fn });
}
// runs every pending save now, including saves those callbacks schedule themselves
function flushAll() {
  for (let guard = 0; timers.size && guard < 200; guard++) {
    const [id, { t, fn }] = timers.entries().next().value;
    clearTimeout(t);
    timers.delete(id);
    fn();
  }
}

const NO_RETRY = new Set(['invalid_argument', 'resource_exhausted', 'quota_exceeded', 'revoked', 'not_granted', 'capability_disabled', 'capability_removed', 'transform_error']);
const dayDocId = (k) => `d-${k}`;

const Store = {
  mode: 'local',
  framed: false,
  readonly: false,
  db: null,
  uid: null,
  dl: null,
  unsub: null,
  chains: new Map(),
  inflight: new Set(),
  dirty: new Set(),
  async init() {
    const c = window.claude;
    if (!c || typeof c.use !== 'function') return;
    this.framed = true;
    try {
      const [db, user, dl] = await Promise.all([c.use('db'), c.use('user'), c.use('downloads')]);
      this.dl = dl;
      if (db && user) {
        const id = await user.id();
        if (id) { this.db = db; this.uid = id; this.mode = 'cloud'; }
      }
    } catch (e) { console.warn('capabilities', e); }
  },
  readLocal() {
    try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  },
  // cloud edits not yet confirmed by the store, kept on the device until they are
  outboxKey() { return `programzilnic.outbox.${this.uid}`; },
  readOutbox() { try { return JSON.parse(localStorage.getItem(this.outboxKey()) || '{}') || {}; } catch (e) { return {}; } },
  writeOutbox(o) {
    try { if (Object.keys(o).length) localStorage.setItem(this.outboxKey(), JSON.stringify(o)); else localStorage.removeItem(this.outboxKey()); }
    catch (e) { /* storage full or blocked: the in-memory retry still runs */ }
  },
  bodyFor(docId) {
    if (docId === 'settings') return { settings: clone(state.settings), app: 'program-zilnic', v: 1 };
    const day = state.days[docId.slice(2)];
    return day ? { day: clone(day) } : null;
  },
  stage(docId) { const o = this.readOutbox(); o[docId] = this.bodyFor(docId); this.writeOutbox(o); },
  unstage(docId, body) {
    const o = this.readOutbox();
    if (docId in o && JSON.stringify(o[docId]) === JSON.stringify(body)) { delete o[docId]; this.writeOutbox(o); }
  },
  writeLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
    catch (e) { toast('Nu am putut salva pe telefon. Fă un backup din Setări.'); }
  },
  col() { return this.db.collection(`data/users/${this.uid}`); },
  async getAll() {
    try { return await this.col().get(); }
    catch (e) {
      if (NO_RETRY.has(e?.code)) throw e;
      await wait(700 + Math.random() * 900);
      return this.col().get();
    }
  },
  async load() {
    if (this.mode !== 'cloud') return this.readLocal();
    const snap = await this.getAll();
    if (snap.empty) {
      const local = this.readLocal();
      return local ? { ...local, migrated: true } : null;
    }
    const out = { settings: null, days: {} };
    for (const d of snap.docs) {
      const body = clone(d.data() || {});
      if (d.id === 'settings') out.settings = body.settings;
      else if (d.id.startsWith('d-') && body.day && typeof body.day === 'object') out.days[d.id.slice(2)] = body.day;
    }
    // edits that never reached the store last time win over what it has
    const pending = this.readOutbox();
    for (const [id, body] of Object.entries(pending)) {
      if (id === 'settings') { if (body?.settings) out.settings = body.settings; }
      else if (id.startsWith('d-') && isRealKey(id.slice(2))) { if (body?.day) out.days[id.slice(2)] = body.day; else delete out.days[id.slice(2)]; }
    }
    out.replay = Object.keys(pending);
    return out;
  },
  // live updates from another device or tab
  subscribe() {
    if (this.mode !== 'cloud' || this.unsub) return;
    try {
      this.unsub = this.col().onSnapshot((snap) => {
        let changed = false;
        const pending = this.readOutbox();
        for (const ch of snap.docChanges()) {
          const id = ch.doc.id;
          if (ch.doc.metadata?.hasPendingWrites || timers.has(id) || this.inflight.has(id) || this.dirty.has(id) || id in pending) continue;
          if (id === 'settings') {
            if (ch.type === 'removed') continue;
            const body = clone(ch.doc.data() || {});
            if (!body.settings) continue;
            const next = normalize({ settings: body.settings, days: state.days }).settings;
            const cur = normalize({ settings: state.settings, days: state.days }).settings;
            if (JSON.stringify(next) !== JSON.stringify(cur)) { state.settings = next; changed = true; }
          } else if (id.startsWith('d-') && isRealKey(id.slice(2))) {
            const k = id.slice(2);
            const day = ch.type === 'removed' ? {} : cleanImportedDay(clone(ch.doc.data() || {}).day);
            if (JSON.stringify(day) !== JSON.stringify(cleanImportedDay(state.days[k]))) {
              if (Object.keys(day).length) state.days[k] = day; else delete state.days[k];
              changed = true;
            }
          }
        }
        if (changed) remoteChanged();
      }, (e) => {
        console.warn('sync stopped', e);
        this.unsub = null;
        if (e?.code === 'revoked' || e?.code === 'not_granted') { this.setReadonly(); return; }
        if (!NO_RETRY.has(e?.code)) setTimeout(() => this.subscribe(), 1500 + Math.random() * 1500);
      });
    } catch (e) { console.warn('subscribe', e); }
  },
  writeDoc(docId) {
    if (this.readonly) return Promise.resolve();
    const prev = this.chains.get(docId) || Promise.resolve();
    const run = async (retry) => {
      const ref = this.col().doc(docId);
      const body = this.bodyFor(docId);
      try {
        if (body) await ref.set(body); else await ref.delete();
        this.unstage(docId, body);
      } catch (e) {
        if (!retry && !NO_RETRY.has(e?.code)) { await wait(600 + Math.random() * 900); return run(true); }
        throw e;
      }
    };
    const next = prev.then(async () => {
      this.inflight.add(docId);
      try { await run(false); this.dirty.delete(docId); }
      finally { this.inflight.delete(docId); }
    }).catch((e) => {
      console.warn('save failed', docId, e);
      if (e?.code === 'revoked' || e?.code === 'not_granted') { this.setReadonly(); return; }
      this.dirty.add(docId);
      if (e?.code === 'quota_exceeded') toast('Spațiul de date e plin. Exportă un backup din Setări.');
      else if (e?.code === 'invalid_argument') toast('Ziua asta are prea mult text ca să fie salvată. Scurtează notița.');
      else toast('Nu am putut salva. Reîncerc când revine conexiunea.');
    });
    this.chains.set(docId, next);
    return next;
  },
  retryDirty() { if (this.mode === 'cloud') for (const id of [...this.dirty]) this.writeDoc(id); },
  setReadonly() {
    if (this.readonly) return;
    this.readonly = true;
    toast('Nu mai poți salva modificări aici.');
    render();
  },
  saveDay(k) {
    if (this.mode !== 'cloud') return debounce('local', 250, () => this.writeLocal());
    const id = dayDocId(k);
    this.stage(id);
    debounce(id, 600, () => this.writeDoc(id));
  },
  saveSettings() {
    if (this.mode !== 'cloud') return debounce('local', 250, () => this.writeLocal());
    this.stage('settings');
    debounce('settings', 500, () => this.writeDoc('settings'));
  },
  // writes everything; prevDays are day keys that existed before an import or reset
  async saveAll(prevDays = []) {
    flushAll();
    if (this.mode !== 'cloud') return this.writeLocal();
    let existing = [];
    try { existing = (await this.getAll()).docs.map((d) => d.id); }
    catch (e) { console.warn('list before save', e); if (!prevDays.length) toast('Nu am putut verifica datele vechi din cont.'); }
    const ids = new Set(['settings', ...Object.keys(state.days).map(dayDocId), ...prevDays.map(dayDocId), ...existing.filter((id) => id.startsWith('d-'))]);
    for (const id of ids) this.stage(id);
    await Promise.all([...ids].map((id) => this.writeDoc(id)));
  },
};

function mutDay(k, fn) {
  if (Store.readonly) return;
  const d = state.days[k] ? state.days[k] : {};
  fn(d);
  cleanDay(d);
  if (Object.keys(d).length) state.days[k] = d; else delete state.days[k];
  Store.saveDay(k);
}
function cleanDay(d) {
  for (const f of Object.keys(d)) {
    if (d[f] == null || d[f] === '' || d[f] === false) delete d[f];
  }
  if (d.t) {
    for (const [id, e] of Object.entries(d.t)) {
      if (!e || typeof e !== 'object') { delete d.t[id]; continue; }
      if (!e.d) { delete e.d; delete e.auto; }
      if (e.d || e.v == null) delete e.off;
      const hasData = e.d || e.v != null || e.km != null || e.min != null || e.m?.length || e.s?.length;
      if (!hasData) delete d.t[id];
    }
    if (!Object.keys(d.t).length) delete d.t;
  }
}
function saveSettings() { if (!Store.readonly) Store.saveSettings(); }
const hasDetails = (e) => !!(e && (e.m?.length || e.km != null || e.min != null || e.s?.length || e.v != null));

/* ================= derived data ================= */
function dayProgress(k) {
  const sch = S().tasks.filter((t) => isScheduled(t, k));
  const done = sch.filter((t) => isDone(k, t.id)).length;
  const extra = S().tasks.filter((t) => !isScheduled(t, k) && isDone(k, t.id)).length;
  return { total: sch.length, done, extra };
}
const dayComplete = (k) => { const p = dayProgress(k); return p.total > 0 && p.done === p.total; };

function streakFor(test, skip, fromKey) {
  // consecutive days ending today (or yesterday while today is still open)
  let k = fromKey;
  let n = 0;
  if (k === todayKey() && !skip(k) && !test(k)) k = addDays(k, -1);
  for (let i = 0; i < 1500; i++) {
    if (skip(k)) { k = addDays(k, -1); continue; }
    if (!test(k)) break;
    n++;
    k = addDays(k, -1);
  }
  return n;
}
function dayStreak() {
  const first = S().start;
  return streakFor(dayComplete, (k) => k >= first && dayProgress(k).total === 0, todayKey());
}
function taskStreak(t) {
  if (!t.days.length) return 0;
  const first = S().start;
  return streakFor((k) => isDone(k, t.id) && daysAt(t, k).length > 0, (k) => k >= first && daysAt(t, k).length > 0 && !isScheduled(t, k) && !isDone(k, t.id), todayKey());
}

function entriesOfKind(k, kind) {
  const t = dayOf(k).t;
  return t ? Object.values(t).filter((e) => e && e.k === kind) : [];
}
const round2 = (v) => Math.round(v * 100) / 100;
function runKmOn(k) { return round2(sum(entriesOfKind(k, 'run').map((e) => e.km || 0))); }
function weekRunKm(k) { return round2(sum(weekKeys(k).map(runKmOn))); }

function periodStats(keys) {
  const t = todayKey();
  const o = {
    muscles: new Map(), gymSessions: 0, runKm: 0, runs: 0, runKmTimed: 0, runMin: 0,
    sports: new Map(), kcal: [], protein: [], water: [], sleep: [], weight: [], steps: [], moods: [], sex: 0,
    complete: 0, pastDays: 0,
  };
  for (const k of keys) {
    const d = dayOf(k);
    for (const e of entriesOfKind(k, 'gym')) {
      if (e.d || e.m?.length) o.gymSessions++;
      for (const m of e.m || []) o.muscles.set(m, (o.muscles.get(m) || 0) + 1);
    }
    for (const e of entriesOfKind(k, 'run')) {
      if (e.km) { o.runKm += e.km; o.runs++; if (e.min) { o.runKmTimed += e.km; o.runMin += e.min; } }
      else if (e.d) o.runs++;
    }
    for (const e of entriesOfKind(k, 'sport')) {
      for (const s of e.s || []) {
        const cur = o.sports.get(s.id) || { count: 0, min: 0, km: 0 };
        cur.count++; cur.min += s.min || 0; cur.km += s.km || 0;
        o.sports.set(s.id, cur);
      }
    }
    for (const f of ['kcal', 'protein', 'water', 'sleep', 'weight', 'steps']) if (d[f] != null) o[f].push(d[f]);
    if (d.mood) o.moods.push(d.mood);
    if (d.sex) o.sex++;
    if (k <= t && k >= S().start) {
      const p = dayProgress(k);
      if (p.total) { o.pastDays++; if (p.done === p.total) o.complete++; }
    }
  }
  o.runKm = round2(o.runKm);
  return o;
}

function lastTrainedMap(refKey) {
  const map = new Map();
  const keys = Object.keys(state.days).filter((k) => k <= refKey).sort().reverse();
  for (const k of keys) {
    for (const e of entriesOfKind(k, 'gym')) for (const m of e.m || []) if (!map.has(m)) map.set(m, k);
  }
  return map;
}

/* ================= icons ================= */
const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
  chevL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};
function ring(done, total, size = 46, label = null) {
  const r = 18, c = 2 * Math.PI * r;
  const pct = total ? clamp(done / total, 0, 1) : 0;
  const full = total > 0 && done >= total;
  return `<span class="ring ${full ? 'full' : ''}" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 44 44" aria-hidden="true"><circle class="trk" cx="22" cy="22" r="${r}" fill="none" stroke-width="5"/>
    <circle class="val" cx="22" cy="22" r="${r}" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(2)}" ${pct === 0 ? 'opacity="0"' : ''}/></svg>
    <b>${label ?? (total ? done : '–')}</b></span>`;
}

/* ================= views: TODAY ================= */
function vToday() {
  const k = ui.date;
  const isToday = k === todayKey();
  const tasks = S().tasks;
  const sch = tasks.filter((t) => isScheduled(t, k));
  const uns = tasks.filter((t) => !isScheduled(t, k));
  const unsOpen = ui.showUns ?? uns.some((t) => isDone(k, t.id) || ui.expanded.has(t.id));
  const m = S().modules;
  const dayWord = isToday ? 'azi' : 'în ziua asta';
  return `
  ${todayHeader(k)}
  <div class="page">
    ${installHint()}
    <section class="sec" aria-label="Taskuri">
      <h2 class="sec-label">Taskuri <span id="secCount">${sch.length ? `${dayProgress(k).done} din ${sch.length}` : ''}</span></h2>
      ${sch.length ? `<div class="list">${sch.map((t) => taskRow(t, k)).join('')}</div>`
        : `<p class="empty">Nimic programat ${dayWord}. Poți bifa oricare task de mai jos.</p>`}
      ${uns.length ? `
        <button class="more" type="button" data-action="toggleUns" aria-expanded="${unsOpen}">${unsOpen ? 'Ascunde' : 'Arată'} ${uns.length === 1 ? 'taskul neprogramat' : `cele ${plural(uns.length, 'task', 'taskuri')} neprogramate`} ${dayWord}</button>
        <div class="list list-dim" ${unsOpen ? '' : 'hidden'}>${uns.map((t) => taskRow(t, k)).join('')}</div>` : ''}
      <button class="add-row" type="button" data-action="newTask">＋ Task nou</button>
    </section>
    ${m.nutrition ? nutritionSec(k) : ''}
    ${bodySec(k)}
    ${journalSec(k)}
  </div>`;
}

function todayHeader(k) {
  const d = parseKey(k);
  const isToday = k === todayKey();
  const yr = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  const rel = daysBetween(k, todayKey());
  const big = isToday ? 'Azi' : rel === 1 ? 'Ieri' : rel === -1 ? 'Mâine' : cap(DOW_LONG[d.getDay()]);
  const small = `${isToday || Math.abs(rel) === 1 ? `${cap(DOW_LONG[d.getDay()])}, ` : ''}${d.getDate()} ${MONTHS[d.getMonth()]}${yr}`;
  return `<header class="topbar"><div class="topbar-in">
    <div class="daynav">
      <button class="icon-btn" type="button" data-action="day" data-delta="-1" aria-label="Ziua anterioară">${ICON.chevL}</button>
      <div class="date-pick">
        <span class="dp-wd">${big}</span>
        <span class="dp-date">${small} ▾</span>
        <input type="date" id="datePick" data-change="pickDate" value="${k}" aria-label="Alege altă zi">
      </div>
      <button class="icon-btn" type="button" data-action="day" data-delta="1" aria-label="Ziua următoare">${ICON.chevR}</button>
    </div>
    <div id="dayProg">${dayProgHtml(k)}</div>
    ${!isToday ? '<button class="pill-link" type="button" data-action="goToday">Înapoi la azi</button>' : ''}
  </div></header>`;
}

function dayProgHtml(k) {
  const p = dayProgress(k);
  const left = p.total - p.done;
  const extra = p.extra ? ` · +${p.extra} în plus` : '';
  let main, sub;
  if (!p.total) { main = 'Zi liberă'; sub = p.extra ? `${plural(p.extra, 'task bifat', 'taskuri bifate')} în plus` : 'Niciun task programat'; }
  else if (!left) { main = 'Zi completă 🎉'; sub = `${p.total === 1 ? 'Singurul task e bifat' : `Toate cele ${plural(p.total, 'task', 'taskuri')} sunt bifate`}${extra}`; }
  else { main = `Mai ai ${plural(left, 'task', 'taskuri')}`; sub = `${p.done} din ${p.total} bifate${extra}`; }
  const st = k === todayKey() ? dayStreak() : 0;
  return `<div class="prog">
    ${ring(p.done, p.total)}
    <div class="prog-text"><b>${main}</b><span>${sub}</span></div>
    ${st > 0 ? `<span class="streak" title="Zile complete la rând">🔥 ${plural(st, 'zi', 'zile')}</span>` : ''}
  </div>`;
}

function installHint() {
  if (Store.framed) return '';
  let stored = false;
  try { stored = !!localStorage.getItem(LS_KEY); } catch (e) { /* storage blocked */ }
  const hasData = Object.keys(state.days).length > 0 || stored;
  if (isStandalone()) {
    if (Object.keys(state.days).length || uiPref('hideImport')) return '';
    return `<div class="install" role="note"><div><b>Ai folosit aplicația în Safari înainte?</b>Datele de acolo nu vin singure aici. Dacă ai exportat un backup, importă-l acum.
      <div class="install-act"><button class="btn" type="button" data-action="import">⬆︎ Importă backup</button></div></div>
      <button class="icon-btn" type="button" data-action="hideImport" aria-label="Ascunde">${ICON.x}</button></div>`;
  }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!ios || uiPref('hideInstall')) return '';
  return `<div class="install" role="note"><div><b>Pune aplicația pe ecranul principal</b>În Safari apasă <b class="il">Partajează</b> (pătratul cu săgeata), apoi <b class="il">Adaugă pe ecranul principal</b>.
    ${hasData ? `<p class="install-warn"><b class="il">Atenție:</b> aplicația de pe ecranul principal pornește goală. Exportă întâi un backup aici și importă-l acolo.</p>
    <div class="install-act"><button class="btn" type="button" data-action="export">⬇︎ Exportă backup</button></div>` : ''}</div>
    <button class="icon-btn" type="button" data-action="hideInstall" aria-label="Ascunde">${ICON.x}</button></div>`;
}

function taskRow(t, k) {
  const open = t.type !== 'check' && ui.expanded.has(t.id);
  return `<div class="task ${open ? 'open' : ''}" data-task="${esc(t.id)}">
    <div class="task-head" id="th-${esc(t.id)}">${taskHead(t, k)}</div>
    ${t.type !== 'check' ? `<div class="task-panel" id="tp-${esc(t.id)}" ${open ? '' : 'hidden'}>${open ? taskPanel(t, k) : ''}</div>` : ''}
  </div>`;
}

function taskHead(t, k) {
  const e = entryOf(k, t.id);
  const done = !!e?.d;
  const sumTxt = taskSummary(t, e, k);
  const isCheck = t.type === 'check';
  return `<button class="check ${done ? 'on' : ''}" type="button" role="checkbox" aria-checked="${done}" data-action="toggleTask" data-id="${esc(t.id)}" aria-label="${esc(t.name)}"><i>${ICON.check}</i></button>
    <button class="task-main" type="button" data-action="${isCheck ? 'toggleTask' : 'expand'}" data-id="${esc(t.id)}" ${isCheck ? 'tabindex="-1" aria-hidden="true"' : `aria-expanded="${ui.expanded.has(t.id)}" aria-controls="tp-${esc(t.id)}"`}>
      <span class="t-emoji" aria-hidden="true">${esc(t.emoji)}</span>
      <span class="t-text"><span class="t-name">${esc(t.name)}</span>${sumTxt ? `<span class="t-sum">${sumTxt}</span>` : ''}</span>
      ${isCheck ? '' : `<span class="chev" aria-hidden="true">${ICON.chevR}</span>`}
    </button>`;
}

function taskSummary(t, e, k) {
  const parts = [];
  if (t.type === 'gym') {
    const names = (e?.m || []).map((id) => S().muscles.find((m) => m.id === id)?.name).filter(Boolean);
    if (names.length) parts.push(`<b>${esc(names.join(' · '))}</b>`);
    else parts.push(e?.d ? 'Bifat · alege grupele lucrate' : 'Atinge ca să alegi grupele');
  } else if (t.type === 'run') {
    if (e?.km) parts.push(`<b>${fmt(e.km, 2)}${NB}km</b>${e.min ? ` · ${fmtMin(e.min)} · ${fmtPace(e.km, e.min)}` : ''}`);
    else parts.push(e?.d ? 'Bifat · adaugă km' : 'Atinge ca să notezi km');
    parts.push(S().goals.kmWeek > 0 ? `săpt.: ${fmt(weekRunKm(k), 2)}/${fmt(S().goals.kmWeek, 2)}${NB}km` : `săpt.: ${fmt(weekRunKm(k), 2)}${NB}km`);
  } else if (t.type === 'sport') {
    const items = (e?.s || []).map((s) => {
      const sp = S().sports.find((x) => x.id === s.id);
      if (!sp) return '';
      const det = [s.min ? fmtMin(s.min) : '', s.km ? `${fmt(s.km, 2)}${NB}km` : ''].filter(Boolean).join(', ');
      return `${esc(sp.emoji)} ${esc(sp.name)}${det ? ` ${det}` : ''}`;
    }).filter(Boolean);
    if (items.length) parts.push(`<b>${items.join(' · ')}</b>`);
    else parts.push(e?.d ? 'Bifat · alege sportul' : 'Box, dans, bicicletă…');
  } else if (t.type === 'num') {
    const unit = t.unit ? `${NB}${esc(t.unit)}` : '';
    if (e?.v != null) parts.push(`<b>${fmt(e.v, 2)}${t.target ? ` / ${fmt(t.target, 2)}` : ''}${unit}</b>`);
    else parts.push(t.target ? `Țintă: ${fmt(t.target, 2)}${unit}` : 'Atinge ca să notezi');
  }
  if (k === todayKey()) {
    const st = taskStreak(t);
    if (st >= 2) parts.push(`🔥${NB}${st}`);
  }
  return parts.join(' · ');
}

function taskPanel(t, k) {
  const e = entryOf(k, t.id) || {};
  const id = esc(t.id);
  if (t.type === 'gym') {
    const sel = new Set(e.m || []);
    const ps = periodStats(weekKeys(k));
    const shown = S().muscles.filter((m) => !m.hidden || sel.has(m.id));
    const missing = visMuscles().filter((m) => !ps.muscles.get(m.id));
    const wk = weekWord(k);
    return `<div class="chips" role="group" aria-label="Grupe musculare lucrate">
      ${shown.map((m) => {
        const c = ps.muscles.get(m.id) || 0;
        return `<button class="chip ${sel.has(m.id) ? 'on' : ''}" type="button" data-action="muscle" data-id="${id}" data-m="${esc(m.id)}" aria-pressed="${sel.has(m.id)}">${esc(m.name)}${c ? `<span class="chip-n" aria-label="${ori(c)} ${wk}">×${c}</span>` : ''}</button>`;
      }).join('')}
      </div>
      <p class="hint">${!visMuscles().length ? 'Adaugă grupe musculare din Setări.' : missing.length ? `Neatinse ${wk}: <b>${missing.map((m) => esc(m.name)).join(', ')}</b>` : `<b class="ok">Ai lucrat toate grupele ${wk}.</b>`}</p>`;
  }
  if (t.type === 'run') {
    return `<div class="fields">
        <label class="field"><span>Distanță</span><span class="input-unit"><input class="input" id="runkm-${id}" data-input="runKm" data-id="${id}" inputmode="decimal" autocomplete="off" placeholder="0,0" value="${inputVal(e.km)}">km</span></label>
        <label class="field"><span>Durată (opțional)</span><span class="input-unit"><input class="input" id="runmin-${id}" data-input="runMin" data-id="${id}" inputmode="numeric" autocomplete="off" placeholder="0" value="${inputVal(e.min)}">min</span></label>
      </div>
      <p class="hint" id="runinfo-${id}">${runInfo(t, k)}</p>`;
  }
  if (t.type === 'sport') {
    const sel = e.s || [];
    const selIds = new Set(sel.map((s) => s.id));
    const shown = S().sports.filter((sp) => !sp.hidden || selIds.has(sp.id));
    return `<div class="chips" role="group" aria-label="Alege sportul">
      ${shown.map((sp) => `<button class="chip ${selIds.has(sp.id) ? 'on' : ''}" type="button" data-action="sport" data-id="${id}" data-s="${esc(sp.id)}" aria-pressed="${selIds.has(sp.id)}">${esc(sp.emoji)} ${esc(sp.name)}</button>`).join('')}
      </div>
      ${sel.length ? `<div class="sport-rows">${sel.map((s) => {
        const sp = S().sports.find((x) => x.id === s.id);
        if (!sp) return '';
        const sid = esc(s.id);
        return `<div class="sport-row"><span class="sr-name">${esc(sp.emoji)} ${esc(sp.name)}</span>
          <span class="input-unit"><input class="input" id="spmin-${id}-${sid}" data-input="sportMin" data-id="${id}" data-s="${sid}" inputmode="numeric" autocomplete="off" placeholder="0" value="${inputVal(s.min)}" aria-label="Minute ${esc(sp.name)}">min</span>
          ${sp.km ? `<span class="input-unit"><input class="input" id="spkm-${id}-${sid}" data-input="sportKm" data-id="${id}" data-s="${sid}" inputmode="decimal" autocomplete="off" placeholder="0" value="${inputVal(s.km)}" aria-label="Kilometri ${esc(sp.name)}">km</span>` : '<span></span>'}
        </div>`;
      }).join('')}</div>` : '<p class="hint">Poți alege mai multe. Lista o modifici din Setări.</p>'}`;
  }
  if (t.type === 'num') {
    const unit = esc(t.unit || '');
    return `<div class="fields"><label class="field"><span>${t.target ? `Țintă: ${fmt(t.target, 2)}${unit ? ` ${unit}` : ''}` : 'Valoare'}</span>
      <span class="input-unit"><input class="input" id="num-${id}" data-input="numVal" data-id="${id}" inputmode="decimal" autocomplete="off" placeholder="0" value="${inputVal(e.v)}">${unit}</span></label></div>`;
  }
  return '';
}

function runInfo(t, k) {
  const e = entryOf(k, t.id) || {};
  const wk = weekRunKm(k), goal = S().goals.kmWeek;
  const pace = fmtPace(e.km, e.min);
  const left = kmLeft(wk, goal);
  const past = weekStart(k) < weekStart(todayKey());
  if (goal <= 0) return `${pace ? `Ritm: <b>${pace}</b> · ` : ''}${cap(weekWord(k))}: <b>${fmt(wk, 2)}${NB}km</b>`;
  return `${pace ? `Ritm: <b>${pace}</b> · ` : ''}${cap(weekWord(k))}: <b>${fmt(wk, 2)} din ${fmt(goal, 2)}${NB}km</b>${left > 0 ? ` · ${past ? 'au lipsit' : 'mai ai'} ${fmt(left, 1)}${NB}km` : ' · <b class="ok">minim atins ✓</b>'}`;
}

const METRIC = { kcal: ['Calorii', 'kcal'], protein: ['Proteine', 'g'] };
function metricBlock(k, field) {
  const [label, unit] = METRIC[field];
  const goal = S().goals[field];
  const v = dayOf(k)[field];
  const pct = goal ? clamp(((v || 0) / goal) * 100, 0, 100) : 0;
  const full = goal && v >= goal;
  let sub;
  if (v == null) sub = goal ? `Țintă: ${fmt(goal, 0)} ${unit}` : 'Nimic notat încă';
  else if (!goal) sub = '';
  else if (full) sub = `<span class="ok">Țintă atinsă</span>${v > goal ? ` · cu ${fmt(v - goal, 0)} ${unit} peste` : ''}`;
  else sub = `Mai ai ${fmt(goal - v, 0)} ${unit} până la țintă`;
  return `<div class="metric" id="mb-${field}">
    <div class="metric-top"><span class="metric-label">${label}</span>
      <button class="metric-val" type="button" data-action="editNum" data-field="${field}" aria-label="Modifică ${label.toLowerCase()}"><b>${v == null ? '0' : fmt(v, 0)}</b><span>/ ${fmt(goal, 0)} ${unit} ✎</span></button></div>
    <div class="bar ${full ? 'full' : ''}"><i style="width:${pct}%"></i></div>
    <div class="metric-sub">${sub}</div>
    <form class="add" data-form="addNum" data-field="${field}">
      <input class="input" id="add-${field}" name="v" inputmode="numeric" autocomplete="off" placeholder="+ ${unit}" aria-label="Adaugă ${label.toLowerCase()}">
      <button class="btn primary" type="submit">Adaugă</button>
    </form>
  </div>`;
}
const refreshMetric = (k, field) => { if (ui.tab === 'azi' && ui.date === k) replaceEl(`mb-${field}`, metricBlock(k, field)); };

function nutritionSec(k) {
  return `<section class="sec" aria-label="Nutriție">
    <h2 class="sec-label">Nutriție</h2>
    <div class="card">${metricBlock(k, 'kcal')}${metricBlock(k, 'protein')}</div>
  </section>`;
}

function waterHtml(k) {
  const n = dayOf(k).water || 0, goal = S().goals.water;
  const count = Math.min(Math.max(goal, n), 30);
  return `<div class="row stack" id="wb">
    <div class="row-label"><b>💧 Apă</b><span>${n} / ${plural(goal, 'pahar', 'pahare')} · ${fmt(n * 0.25, 2)}${NB}L</span></div>
    <div class="drops">${Array.from({ length: count }, (_, i) => `<button class="drop ${i < n ? 'on' : ''}" type="button" data-action="waterSet" data-n="${i + 1}" aria-label="${plural(i + 1, 'pahar', 'pahare')}"></button>`).join('')}
      <button class="drop-plus" type="button" data-action="waterAdd" aria-label="Încă un pahar">+</button></div>
  </div>`;
}

function weightSub(k) {
  const w = dayOf(k).weight;
  const prevKey = Object.keys(state.days).filter((x) => x < k && dayOf(x).weight != null).sort().pop();
  if (w == null) return prevKey ? `Ultima: ${fmt(dayOf(prevKey).weight, 1)}${NB}kg (${k === todayKey() ? relDay(prevKey) : shortDate(prevKey)})` : 'Opțional, dimineața';
  if (!prevKey) return 'Prima cântărire notată';
  const diff = Math.round((w - dayOf(prevKey).weight) * 10) / 10;
  return `${diff === 0 ? 'La fel ca pe' : `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff), 1)}${NB}kg față de`} ${shortDate(prevKey)}`;
}
function stepsSub(k) {
  const v = dayOf(k).steps, g = S().goals.steps;
  if (!(g > 0)) return v != null ? plural(v, 'pas', 'pași') : 'Fără țintă';
  return v != null ? `${Math.round((v / g) * 100)}% din ${fmt(g, 0)}` : `Țintă: ${fmt(g, 0)}`;
}

function bodySec(k) {
  const m = S().modules, d = dayOf(k), g = S().goals;
  const rows = [];
  if (m.water) rows.push(waterHtml(k));
  if (m.sleep) rows.push(`<div class="row"><div class="row-label"><b>😴 Somn</b><span>Țintă: ${plural(g.sleep, 'oră', 'ore')}</span></div>
    <div class="stepper input-unit"><button class="st" type="button" data-action="step" data-field="sleep" data-delta="-0.5" aria-label="Mai puțin somn">−</button>
    <input class="input" id="in-sleep" data-input="num" data-field="sleep" inputmode="decimal" autocomplete="off" placeholder="0" value="${inputVal(d.sleep)}" aria-label="Ore de somn">
    <button class="st" type="button" data-action="step" data-field="sleep" data-delta="0.5" aria-label="Mai mult somn">+</button></div></div>`);
  if (m.weight) rows.push(`<div class="row"><div class="row-label"><b>⚖️ Greutate</b><span id="wsub">${weightSub(k)}</span></div>
    <span class="input-unit"><input class="input" id="in-weight" data-input="num" data-field="weight" inputmode="decimal" autocomplete="off" placeholder="0,0" value="${inputVal(d.weight)}" aria-label="Greutate în kilograme">kg</span></div>`);
  if (m.steps) rows.push(`<div class="row"><div class="row-label"><b>👟 Pași</b><span id="ssub">${stepsSub(k)}</span></div>
    <span class="input-unit"><input class="input" id="in-steps" data-input="num" data-field="steps" data-int="1" inputmode="numeric" autocomplete="off" placeholder="0" value="${d.steps ?? ''}" aria-label="Număr de pași"></span></div>`);
  if (!rows.length) return '';
  return `<section class="sec" aria-label="Corp și recuperare"><h2 class="sec-label">Corp & recuperare</h2><div class="list">${rows.join('')}</div></section>`;
}

function journalSec(k) {
  const m = S().modules, d = dayOf(k);
  const isToday = k === todayKey();
  const rows = [];
  if (m.mood) rows.push(`<div class="row stack"><div class="row-label"><b>Cum a fost ziua?</b></div>
    <div class="moods" role="group" aria-label="Starea zilei">${MOODS.map(([v, e, l]) => `<button class="mood ${d.mood === v ? 'on' : ''}" type="button" data-action="mood" data-v="${v}" aria-pressed="${d.mood === v}">${e}<small>${l}</small></button>`).join('')}</div></div>`);
  if (m.sex) rows.push(`<div class="row"><div class="row-label"><b>❤️ Sex</b><span id="sexsub">${sexSub(k)}</span></div>
    <button class="switch heart ${d.sex ? 'on' : ''}" type="button" role="switch" aria-checked="${!!d.sex}" data-action="toggleSex" aria-label="Sex ${isToday ? 'azi' : 'în ziua asta'}"></button></div>`);
  if (m.notes) rows.push(`<div class="row stack"><label class="field"><span>Notițe</span>
    <textarea class="input" id="in-note" data-input="note" rows="3" maxlength="${NOTE_MAX}" placeholder="Cum a mers antrenamentul, ce ai mâncat, ce vrei să ții minte…">${esc(d.note || '')}</textarea></label></div>`);
  if (!rows.length) return '';
  return `<section class="sec" aria-label="Jurnal"><h2 class="sec-label">Jurnal</h2><div class="list">${rows.join('')}</div></section>`;
}
function sexSub(k) {
  const n = weekKeys(k).filter((x) => dayOf(x).sex).length;
  return `${cap(weekWord(k))}: ${ori(n)}`;
}

/* partial refresh of today without touching focused inputs */
function refreshToday(opts = {}) {
  if (ui.tab !== 'azi') return;
  const k = ui.date;
  const prog = $('#dayProg');
  const before = prog?.dataset.complete === '1';
  if (prog) {
    prog.innerHTML = dayProgHtml(k);
    const now = dayComplete(k);
    prog.dataset.complete = now ? '1' : '0';
    if (now && !before && opts.celebrate) {
      $('.ring', prog)?.classList.add('pop');
      if (k === todayKey()) toast('Zi completă! 🎉 Toate taskurile sunt bifate.');
    }
  }
  const sc = $('#secCount');
  if (sc) { const p = dayProgress(k); sc.textContent = p.total ? `${p.done} din ${p.total}` : ''; }
  for (const t of S().tasks) {
    const h = document.getElementById(`th-${t.id}`);
    if (h) h.innerHTML = taskHead(t, k);
    const row = h?.parentElement;
    if (row) row.classList.toggle('open', t.type !== 'check' && ui.expanded.has(t.id));
    if (t.type === 'run') { const ri = document.getElementById(`runinfo-${t.id}`); if (ri) ri.innerHTML = runInfo(t, k); }
  }
}
function rerenderPanel(id) {
  const t = taskById(id), p = document.getElementById(`tp-${id}`);
  if (t && p && !p.hidden) p.innerHTML = taskPanel(t, ui.date);
}
function replaceEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.outerHTML = html;
}

/* ================= views: WEEK ================= */
function vWeek() {
  const keys = weekKeys(ui.week);
  const t = todayKey();
  const isCur = keys.includes(t);
  const isPast = keys[6] < t;
  const ps = periodStats(keys);
  const g = S().goals, m = S().modules;
  const ref = isCur ? t : keys[6];
  return `<header class="topbar"><div class="topbar-in">
    <div class="daynav">
      <button class="icon-btn" type="button" data-action="week" data-delta="-7" aria-label="Săptămâna anterioară">${ICON.chevL}</button>
      <div class="date-pick"><span class="dp-wd">${isCur ? 'Săptămâna asta' : `Săptămâna ${isoWeek(keys[0])}`}</span><span class="dp-date">${rangeLabel(keys[0], keys[6])}</span></div>
      <button class="icon-btn" type="button" data-action="week" data-delta="7" aria-label="Săptămâna următoare">${ICON.chevR}</button>
    </div>
    ${!isCur ? '<button class="pill-link" type="button" data-action="weekNow">Înapoi la săptămâna curentă</button>' : ''}
  </div></header>
  <div class="page">
    <div class="strip" role="list" aria-label="Zilele săptămânii">${keys.map((k) => {
      const p = dayProgress(k);
      return `<button class="sday ${k === t ? 'today' : ''}" type="button" role="listitem" data-action="openDay" data-k="${k}" aria-label="${cap(DOW_LONG[dowOf(k)])} ${shortDate(k)}: ${p.done} din ${p.total}">
        <span>${DOW_SHORT[dowOf(k)]}</span>${ring(p.done, p.total, 34, k > t && !p.done ? '' : null)}<span>${parseKey(k).getDate()}</span></button>`;
    }).join('')}</div>
    ${weekGym(ps, ref, isCur, isPast, g)}
    ${weekRun(ps, keys, g, isPast)}
    ${weekSports(ps, isCur)}
    ${weekMatrix(keys)}
    ${weekSummary(ps, keys, m, g, isCur)}
  </div>`;
}

function weekGym(ps, ref, isCur, isPast, g) {
  if (!S().tasks.some((x) => x.type === 'gym') && !ps.gymSessions) return '';
  const last = lastTrainedMap(ref);
  const ms = visMuscles();
  const grid = S().muscles.filter((x) => !x.hidden || ps.muscles.get(x.id));
  const hit = ms.filter((x) => ps.muscles.get(x.id)).length;
  const missing = ms.filter((x) => !ps.muscles.get(x.id));
  const wk = isCur ? 'săptămâna asta' : 'în săptămâna aceea';
  return `<section class="sec" aria-label="Grupe musculare"><h2 class="sec-label">Sală · grupe musculare</h2>
    <div class="card">
      <div class="card-top"><div class="big">${hit}<small>/${ms.length}</small></div>
        <div class="card-top-text"><b>grupe lucrate</b><span>${plural(ps.gymSessions, 'antrenament', 'antrenamente')}${g.gymWeek ? ` din ${fmt(g.gymWeek, 0)} propuse${ps.gymSessions >= g.gymWeek ? ' · <b class="ok">✓</b>' : ''}` : ''}</span></div></div>
      <div class="mgrid">${grid.map((x) => {
        const c = ps.muscles.get(x.id) || 0;
        const l = last.get(x.id);
        return `<div class="mtile ${c ? 'hit' : ''} ${x.hidden ? 'gone' : ''}"><span class="mt-name">${esc(x.name)}</span><span class="mt-count">${c ? `×${c}` : '0'}</span><span class="mt-last">${l ? `ultima: ${relDay(l)}` : 'niciodată'}</span></div>`;
      }).join('')}</div>
      ${ms.length ? `<p class="hint">${missing.length ? `${isPast ? 'Nelucrate' : 'Mai ai de lucrat'}: <b>${missing.map((x) => esc(x.name)).join(', ')}</b>` : `<b class="ok">Toate grupele lucrate ${wk} 💪</b>`}</p>` : ''}
    </div></section>`;
}

function weekRun(ps, keys, g, isPast) {
  if (!S().tasks.some((x) => x.type === 'run') && !ps.runKm) return '';
  const km = ps.runKm, goal = g.kmWeek;
  const pct = goal ? clamp((km / goal) * 100, 0, 100) : 0;
  const full = kmReached(km, goal);
  const left = kmLeft(km, goal);
  const pace = ps.runKmTimed ? fmtPace(ps.runKmTimed, ps.runMin) : '';
  const pts = keys.map((k) => ({ label: DOW_SHORT[dowOf(k)], tip: `${cap(DOW_LONG[dowOf(k)])}, ${shortDate(k)}`, value: runKmOn(k) || null }));
  return `<section class="sec" aria-label="Alergare"><h2 class="sec-label">Alergare</h2>
    <div class="card">
      <div class="card-top"><div class="big">${fmt(km, 2)}<small> km</small></div>
        <div class="card-top-text"><b class="${full ? 'ok' : ''}">${goal <= 0 ? 'Fără minim setat' : full ? 'Minim atins ✓' : `${isPast ? 'Au lipsit' : 'Mai ai'} ${fmt(left, 1)}${NB}km`}</b>
        <span>${goal > 0 ? `din minim ${fmt(goal, 2)}${NB}km · ` : ''}${plural(ps.runs, 'alergare', 'alergări')}${pace ? ` · ritm mediu ${pace}` : ''}</span></div></div>
      ${goal > 0 ? `<div class="bar thick ${full ? 'full' : ''}" role="img" aria-label="${Math.round(pct)}% din minim"><i style="width:${pct}%"></i></div>` : ''}
      ${km ? barChart({ id: 'wkrun', points: pts, unit: 'km', dec: 2, h: 120 }) : ''}
    </div></section>`;
}

function weekSports(ps, isCur) {
  if (!S().tasks.some((x) => x.type === 'sport') && !ps.sports.size) return '';
  const rows = [...ps.sports.entries()].map(([id, v]) => {
    const sp = S().sports.find((x) => x.id === id) || { name: id, emoji: '🏅' };
    const det = [`×${v.count}`, v.min ? fmtMin(v.min) : '', v.km ? `${fmt(v.km, 2)}${NB}km` : ''].filter(Boolean).join(' · ');
    return `<div class="srow"><span class="t-emoji" aria-hidden="true">${esc(sp.emoji)}</span><span>${esc(sp.name)}</span><span>${det}</span></div>`;
  });
  return `<section class="sec" aria-label="Alte sporturi"><h2 class="sec-label">Alte sporturi</h2>
    <div class="card">${rows.length ? rows.join('') : `<p class="hint">Niciun alt sport ${isCur ? 'săptămâna asta' : 'în săptămâna aceea'}.</p>`}</div></section>`;
}

function weekMatrix(keys) {
  const t = todayKey();
  const tasks = S().tasks;
  if (!tasks.length) return '';
  const rows = tasks.map((task) => {
    let sched = 0, done = 0;
    const cells = keys.map((k) => {
      const s = isScheduled(task, k), d = isDone(k, task.id);
      if (s && k <= t) { sched++; if (d) done++; }
      const cls = d ? 'done' : s ? (k < t ? 'miss' : 'todo') : 'off';
      const lbl = d ? 'bifat' : s ? (k < t ? 'ratat' : 'de făcut') : 'neprogramat';
      return `<td><span class="dot ${cls}"></span><span class="sr">${DOW_LONG[dowOf(k)]}: ${lbl}</span></td>`;
    }).join('');
    const extra = keys.filter((k) => !isScheduled(task, k) && isDone(k, task.id)).length;
    return `<tr><td class="tn"><span>${esc(task.emoji)} ${esc(task.name)}</span></td>${cells}<td class="ratio">${sched ? `${done}/${sched}` : extra ? `+${extra}` : '—'}</td></tr>`;
  }).join('');
  return `<section class="sec" aria-label="Taskuri pe zile"><h2 class="sec-label">Taskuri pe zile</h2>
    <div class="card"><div class="matrix-wrap"><table class="matrix"><thead><tr><th><span class="sr">Task</span></th>${keys.map((k) => `<th>${DOW_SHORT[dowOf(k)]}</th>`).join('')}<th><span class="sr">Bifate</span></th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="legend"><span><i class="dot done"></i>bifat</span><span><i class="dot miss"></i>ratat</span><span><i class="dot todo"></i>de făcut</span><span><i class="dot off"></i>neprogramat</span></div></div></section>`;
}

function tile(label, value, sub = '') {
  return `<div class="tile"><span class="tl">${label}</span><span class="tv">${value}</span>${sub ? `<span class="ts">${sub}</span>` : ''}</div>`;
}

function weekSummary(ps, keys, m, g, isCur) {
  const tiles = [];
  const notStarted = keys[0] > todayKey();
  tiles.push(tile('Zile complete', ps.pastDays ? `${ps.complete}<small>/${ps.pastDays}</small>` : '—',
    ps.pastDays ? `din zilele cu taskuri${keys[6] > todayKey() ? ', până azi' : ''}` : notStarted ? 'săptămâna n-a început' : 'nicio zi cu taskuri'));
  if (m.nutrition) {
    const k = avg(ps.kcal), p = avg(ps.protein);
    tiles.push(tile('Calorii / zi', k == null ? '—' : `${fmt(k, 0)}`, k == null ? 'nimic notat' : `medie din ${plural(ps.kcal.length, 'zi', 'zile')} · țintă ${fmt(g.kcal, 0)}`));
    tiles.push(tile('Proteine / zi', p == null ? '—' : `${fmt(p, 0)}<small> g</small>`, p == null ? 'nimic notat' : `medie · țintă ${fmt(g.protein, 0)}${NB}g`));
  }
  if (m.sleep) { const s = avg(ps.sleep); tiles.push(tile('Somn / noapte', s == null ? '—' : `${fmt(s, 1)}<small> h</small>`, s == null ? 'nimic notat' : `medie din ${plural(ps.sleep.length, 'noapte', 'nopți')}`)); }
  if (m.water) {
    const w = avg(ps.water);
    tiles.push(tile('Apă / zi', w == null ? '—' : `${fmt(w * 0.25, 1)}<small> L</small>`, w == null ? 'nimic notat' : `${plural(Math.round(w * 10) / 10, 'pahar', 'pahare')} în medie`));
  }
  if (m.weight && ps.weight.length) {
    const ws = keys.filter((k) => dayOf(k).weight != null).map((k) => dayOf(k).weight);
    const diff = Math.round((ws[ws.length - 1] - ws[0]) * 10) / 10;
    tiles.push(tile('Greutate', `${fmt(ws[ws.length - 1], 1)}<small> kg</small>`, ws.length > 1 ? (diff === 0 ? 'neschimbată' : `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff), 1)}${NB}kg în săptămână`) : 'o cântărire'));
  }
  if (m.steps) { const s = sum(ps.steps); tiles.push(tile('Pași', ps.steps.length ? compact(s) : '—', ps.steps.length ? `${fmt(s / ps.steps.length, 0)} pe zi` : 'nimic notat')); }
  if (m.mood) { const md = avg(ps.moods); tiles.push(tile('Stare medie', md == null ? '—' : MOODS[clamp(Math.round(md), 1, 5) - 1][1], md == null ? 'nimic notat' : `${fmt(md, 1)} din 5`)); }
  if (m.sex) tiles.push(tile('❤️ Sex', `${ps.sex}`, ps.sex ? noun(ps.sex, 'dată', 'ori') : (isCur ? 'săptămâna asta' : 'în săptămâna aceea')));
  if (tiles.length % 2) tiles.push('<div class="tile" aria-hidden="true" style="visibility:hidden"></div>');
  return `<section class="sec" aria-label="Rezumat"><h2 class="sec-label">Rezumat <button class="more" type="button" data-action="weekCharts">Vezi grafice ›</button></h2>
    <div class="tiles">${tiles.join('')}</div></section>`;
}

/* ================= charts (inline SVG) ================= */
const chartReg = new Map();
const unitTxt = (u, v, dec) => (typeof u === 'function' ? u(v) : `${fmt(v, dec)}${NB}${u}`);
function niceCeil(v) {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v - 1e-9) return m * p;
  return 10 * p;
}
function barChart({ id, points, target = null, unit = '', dec = 0, h = 160, showLabel = () => true, targetLabel = 'țintă' }) {
  const W = 340, H = h, ml = 32, mr = 6, mt = 16, mb = 20;
  const pw = W - ml - mr, ph = H - mt - mb;
  const vals = points.map((p) => p.value).filter((v) => v != null && v > 0);
  chartReg.set(id, { points, unit, dec });
  const maxV = Math.max(target || 0, ...vals, 0);
  const yMax = niceCeil(maxV * 1.06);
  const y = (v) => mt + ph - (v / yMax) * ph;
  const n = points.length, slot = pw / n;
  const bw = clamp(slot * 0.62, 3, 24);
  const r = Math.min(4, bw / 2);
  let s = '';
  for (const tv of [0, yMax / 2, yMax]) {
    s += `<line class="gl" x1="${ml}" x2="${W - mr}" y1="${y(tv).toFixed(1)}" y2="${y(tv).toFixed(1)}"/>`;
    s += `<text class="ax" x="${ml - 6}" y="${(y(tv) + 3.5).toFixed(1)}" text-anchor="end">${compact(tv)}</text>`;
  }
  points.forEach((p, i) => {
    const cx = ml + slot * i + slot / 2;
    if (p.value > 0) {
      const top = y(p.value), x0 = cx - bw / 2, bh = mt + ph - top, rr = Math.min(r, bh);
      s += `<path class="bar-m" data-i="${i}" fill="currentColor" d="M${x0.toFixed(1)},${(mt + ph).toFixed(1)}V${(top + rr).toFixed(1)}Q${x0.toFixed(1)},${top.toFixed(1)} ${(x0 + rr).toFixed(1)},${top.toFixed(1)}H${(x0 + bw - rr).toFixed(1)}Q${(x0 + bw).toFixed(1)},${top.toFixed(1)} ${(x0 + bw).toFixed(1)},${(top + rr).toFixed(1)}V${(mt + ph).toFixed(1)}Z"/>`;
    }
    if (showLabel(p, i)) s += `<text class="ax" x="${cx.toFixed(1)}" y="${H - 5}" text-anchor="middle">${esc(p.label)}</text>`;
  });
  if (target > 0) {
    const ty = y(target).toFixed(1);
    s += `<line class="tgt" x1="${ml}" x2="${W - mr}" y1="${ty}" y2="${ty}"/>`;
    s += `<text class="tgt-l" x="${W - mr}" y="${(Number(ty) - 4).toFixed(1)}" text-anchor="end">${targetLabel} ${compact(target)}</text>`;
  }
  points.forEach((p, i) => { s += `<rect class="hit" data-chart="${id}" data-i="${i}" x="${(ml + slot * i).toFixed(1)}" y="${mt}" width="${slot.toFixed(1)}" height="${ph}"/>`; });
  if (!vals.length) s += `<text class="empty-l" x="${ml + pw / 2}" y="${mt + ph / 2}" text-anchor="middle">Nimic notat în perioada asta</text>`;
  return `<div class="chart" data-chart-wrap="${id}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafic: ${vals.length} valori">${s}</svg></div>`;
}
function lineChart({ id, points, unit = '', dec = 1, h = 150 }) {
  const W = 340, H = h, ml = 38, mr = 10, mt = 14, mb = 20;
  const pw = W - ml - mr, ph = H - mt - mb;
  chartReg.set(id, { points, unit, dec });
  const vals = points.map((p) => p.value).filter((v) => v != null);
  const n = points.length;
  const x = (i) => ml + (n > 1 ? (pw * i) / (n - 1) : pw / 2);
  let s = '';
  if (!vals.length) {
    s = `<line class="gl" x1="${ml}" x2="${W - mr}" y1="${mt + ph}" y2="${mt + ph}"/><text class="empty-l" x="${ml + pw / 2}" y="${mt + ph / 2}" text-anchor="middle">Nimic notat în perioada asta</text>`;
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafic gol">${s}</svg></div>`;
  }
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const padV = Math.max(0.5, (hi - lo) * 0.2);
  lo = Math.floor(lo - padV); hi = Math.ceil(hi + padV);
  if ((hi - lo) % 2) hi += 1;
  const y = (v) => mt + ph - ((v - lo) / (hi - lo)) * ph;
  for (const tv of [lo, (lo + hi) / 2, hi]) {
    s += `<line class="gl" x1="${ml}" x2="${W - mr}" y1="${y(tv).toFixed(1)}" y2="${y(tv).toFixed(1)}"/>`;
    s += `<text class="ax" x="${ml - 6}" y="${(y(tv) + 3.5).toFixed(1)}" text-anchor="end">${fmt(tv, 2)}</text>`;
  }
  const pts = points.map((p, i) => (p.value != null ? [x(i), y(p.value), i] : null)).filter(Boolean);
  if (pts.length > 1) {
    const d = pts.map((p, j) => `${j ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
    s += `<path class="area" d="${d}L${pts[pts.length - 1][0].toFixed(1)},${mt + ph}L${pts[0][0].toFixed(1)},${mt + ph}Z"/>`;
    s += `<path class="ln" d="${d}"/>`;
  }
  pts.forEach((p) => { s += `<circle class="mk" data-i="${p[2]}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4"/>`; });
  points.forEach((p, i) => { if (p.showLabel !== false) s += `<text class="ax" x="${x(i).toFixed(1)}" y="${H - 5}" text-anchor="middle">${esc(p.label)}</text>`; });
  const slot = n > 1 ? pw / (n - 1) : pw;
  points.forEach((p, i) => { s += `<rect class="hit" data-chart="${id}" data-i="${i}" x="${(x(i) - slot / 2).toFixed(1)}" y="${mt}" width="${slot.toFixed(1)}" height="${ph}"/>`; });
  return `<div class="chart" data-chart-wrap="${id}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafic: ${vals.length} valori">${s}</svg></div>`;
}
function valuesTable(points, unit, dec) {
  const rows = points.filter((p) => p.value != null).map((p) => `<tr><td>${esc(p.tip || p.label)}</td><td>${unitTxt(unit, p.value, dec)}</td></tr>`).join('');
  return rows ? `<details class="vals"><summary>Vezi valorile</summary><table>${rows}</table></details>` : '';
}
function showTip(rect) {
  const id = rect.dataset.chart, i = Number(rect.dataset.i);
  const reg = chartReg.get(id);
  const wrap = rect.closest('.chart');
  if (!reg || !wrap) return;
  const p = reg.points[i];
  $$('.chart.has-active').forEach((c) => { if (c !== wrap) clearTip(c); });
  let tip = $('.tip', wrap);
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; wrap.appendChild(tip); }
  tip.innerHTML = `${esc(p.tip || p.label)}<br><b>${p.value != null ? unitTxt(reg.unit, p.value, reg.dec) : 'nimic notat'}</b>`;
  const wr = wrap.getBoundingClientRect(), rr = rect.getBoundingClientRect();
  const mark = $(`[data-i="${i}"].bar-m, [data-i="${i}"].mk`, wrap);
  const top = mark ? mark.getBoundingClientRect().top - wr.top : rr.top - wr.top + rr.height / 2;
  const half = tip.offsetWidth / 2;
  const left = clamp(rr.left - wr.left + rr.width / 2, half, Math.max(half, wr.width - half));
  tip.style.left = `${left}px`;
  tip.style.top = `${Math.max(top - 8, 18)}px`;
  wrap.classList.add('has-active');
  $$('.act', wrap).forEach((e) => e.classList.remove('act'));
  if (mark) mark.classList.add('act');
}
function clearTip(wrap) {
  wrap.classList.remove('has-active');
  $('.tip', wrap)?.remove();
  $$('.act', wrap).forEach((e) => e.classList.remove('act'));
}

/* ================= views: STATS ================= */
function periodOf(mode, anchor) {
  const d = parseKey(anchor);
  if (mode === 'week') { const keys = weekKeys(anchor); return { keys, label: rangeLabel(keys[0], keys[6]), title: keys.includes(todayKey()) ? 'Săptămâna asta' : `Săptămâna ${isoWeek(keys[0])}` }; }
  if (mode === 'month') {
    const keys = monthKeys(d.getFullYear(), d.getMonth());
    const cur = keys.includes(todayKey());
    return { keys, label: `${cap(MONTHS[d.getMonth()])} ${d.getFullYear()}`, title: cur ? 'Luna asta' : cap(MONTHS[d.getMonth()]) };
  }
  const keys = [];
  for (let m = 0; m < 12; m++) keys.push(...monthKeys(d.getFullYear(), m));
  return { keys, label: `${d.getFullYear()}`, title: d.getFullYear() === new Date().getFullYear() ? 'Anul ăsta' : `${d.getFullYear()}` };
}
function seriesFor(mode, keys, getter, agg = 'avg') {
  if (mode === 'year') {
    const y = parseKey(keys[0]).getFullYear();
    return Array.from({ length: 12 }, (_, m) => {
      const vals = monthKeys(y, m).map(getter).filter((v) => v != null);
      const v = vals.length ? (agg === 'sum' ? sum(vals) : avg(vals)) : null;
      return { label: MONTH_INITIAL[m], tip: `${cap(MONTHS[m])}${agg === 'avg' ? ' · medie/zi' : ' · total'}`, value: v };
    });
  }
  return keys.map((k) => {
    const d = parseKey(k);
    return { label: mode === 'week' ? DOW_SHORT[d.getDay()] : String(d.getDate()), tip: `${cap(DOW_LONG[d.getDay()])}, ${shortDate(k)}`, value: getter(k) ?? null };
  });
}
const monthLabelRule = (mode) => (p, i) => mode !== 'month' || i === 0 || (i + 1) % 5 === 0;

function chartCard(title, sub, body, meta = '') {
  return `<section class="card"><div class="card-h"><h3>${title}</h3>${sub ? `<span>${sub}</span>` : ''}</div>${meta ? `<div class="chart-meta">${meta}</div>` : ''}${body}</section>`;
}
const metaItem = (label, val) => `<div><span>${label}</span><b>${val}</b></div>`;
const signed = (d, unit) => (d === 0 ? 'neschimbat' : `${d > 0 ? '+' : '−'}${fmt(Math.abs(d), 1)} <small>${unit}</small>`);

function vStats() {
  const mode = ui.statsMode;
  const per = periodOf(mode, ui.statsAnchor);
  const keys = per.keys;
  const ps = periodStats(keys);
  const g = S().goals, m = S().modules;
  const lr = monthLabelRule(mode);
  const t = todayKey();
  const cards = [];
  const daysWord = mode === 'year' ? 'medie lunară' : 'pe zi';
  const sportSessions = sum([...ps.sports.values()].map((v) => v.count));

  const tiles = [
    tile('Zile complete', `${ps.complete}`, ps.pastDays ? `din ${plural(ps.pastDays, 'zi cu taskuri', 'zile cu taskuri')}` : 'nicio zi cu taskuri'),
    tile('Sală', `${ps.gymSessions}`, noun(ps.gymSessions, 'antrenament', 'antrenamente')),
    tile('Alergare', `${fmt(ps.runKm, 2)}<small> km</small>`, plural(ps.runs, 'alergare', 'alergări')),
    m.sex ? tile('❤️ Sex', `${ps.sex}`, ps.sex ? noun(ps.sex, 'dată', 'ori') : 'deloc') : tile('Alte sporturi', `${sportSessions}`, noun(sportSessions, 'sesiune', 'sesiuni')),
  ];

  if (m.nutrition) {
    const kp = seriesFor(mode, keys, (k) => dayOf(k).kcal);
    const pp = seriesFor(mode, keys, (k) => dayOf(k).protein);
    const ka = avg(ps.kcal), pa = avg(ps.protein);
    cards.push(chartCard('Calorii', `kcal ${daysWord}`,
      barChart({ id: 'kcal', points: kp, target: g.kcal, unit: 'kcal', dec: 0, showLabel: lr }) + valuesTable(kp, 'kcal', 0),
      metaItem('Medie / zi', ka == null ? '—' : `${fmt(ka, 0)} <small>kcal</small>`) + metaItem('Zile notate', `${ps.kcal.length}`) + metaItem('Peste țintă', `${ps.kcal.filter((v) => v > g.kcal).length}`)));
    cards.push(chartCard('Proteine', `grame ${daysWord}`,
      barChart({ id: 'prot', points: pp, target: g.protein, unit: 'g', dec: 0, showLabel: lr }) + valuesTable(pp, 'g', 0),
      metaItem('Medie / zi', pa == null ? '—' : `${fmt(pa, 0)} <small>g</small>`) + metaItem('Țintă atinsă', `${ps.protein.filter((v) => v >= g.protein).length}${ps.protein.length ? ` <small>din ${ps.protein.length}</small>` : ''}`)));
  }

  // running
  const rp = seriesFor(mode, keys, (k) => runKmOn(k) || null, 'sum');
  const lastKey = keys[keys.length - 1] < t ? keys[keys.length - 1] : t;
  const wkStart = weekStart(lastKey);
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(wkStart, -7 * (11 - i)));
  // weeks since you started; the running week only counts once its minimum is met
  const curWs = weekStart(t);
  const tracked = weeks.filter((ws) => addDays(ws, 6) >= S().start && (ws !== curWs || kmReached(weekRunKm(ws), g.kmWeek)));
  const finished = tracked.filter((ws) => ws !== curWs);
  const avgWeeks = finished.length ? finished : weeks.filter((ws) => ws === curWs && addDays(ws, 6) >= S().start);
  const wp = weeks.map((ws) => ({ label: `${parseKey(ws).getDate()}/${parseKey(ws).getMonth() + 1}`, tip: rangeLabel(ws, addDays(ws, 6)), value: weekRunKm(ws) || null }));
  const wHit = tracked.filter((ws) => kmReached(weekRunKm(ws), g.kmWeek)).length;
  cards.push(chartCard('Alergare', mode === 'year' ? 'km pe lună' : 'km pe zi',
    barChart({ id: 'run', points: rp, unit: 'km', dec: 2, showLabel: lr }) + valuesTable(rp, 'km', 2),
    metaItem('Total', `${fmt(ps.runKm, 2)} <small>km</small>`) + metaItem('Alergări', `${ps.runs}`) + (ps.runKmTimed ? metaItem('Ritm mediu', fmtPace(ps.runKmTimed, ps.runMin)) : '')));
  cards.push(chartCard('Km pe săptămână', 'ultimele 12 săptămâni',
    barChart({ id: 'runwk', points: wp, target: g.kmWeek, unit: 'km', dec: 2, targetLabel: 'minim', showLabel: (p, i) => i % 3 === 2 }) + valuesTable(wp, 'km', 2),
    (tracked.length && g.kmWeek > 0 ? metaItem('Minim atins', `${wHit} <small>din ${tracked.length}</small>`) : '')
    + (avgWeeks.length ? metaItem('Medie', `${fmt(sum(avgWeeks.map(weekRunKm)) / avgWeeks.length, 2)} <small>km</small>`) : '')));

  if (m.weight) {
    const wpts = seriesFor(mode, keys, (k) => dayOf(k).weight).map((p, i) => ({ ...p, showLabel: lr(p, i) }));
    const wk = keys.filter((k) => dayOf(k).weight != null);
    const last = wk.length ? dayOf(wk[wk.length - 1]).weight : null;
    const diff = wk.length > 1 ? Math.round((last - dayOf(wk[0]).weight) * 10) / 10 : null;
    cards.push(chartCard('Greutate', mode === 'year' ? 'kg · medie lunară' : 'kg', lineChart({ id: 'weight', points: wpts, unit: 'kg', dec: 1 }) + valuesTable(wpts, 'kg', 1),
      metaItem('Ultima cântărire', last != null ? `${fmt(last, 1)} <small>kg</small>` : '—') + (diff != null ? metaItem('Schimbare', signed(diff, 'kg')) : '')));
  }
  if (m.sleep) {
    const sp = seriesFor(mode, keys, (k) => dayOf(k).sleep);
    const sa = avg(ps.sleep);
    cards.push(chartCard('Somn', `ore ${mode === 'year' ? 'medie lunară' : 'pe noapte'}`, barChart({ id: 'sleep', points: sp, target: g.sleep, unit: 'h', dec: 1, showLabel: lr }) + valuesTable(sp, 'h', 1),
      metaItem('Medie', sa == null ? '—' : `${fmt(sa, 1)} <small>h</small>`) + metaItem('Nopți sub țintă', `${ps.sleep.filter((v) => v < g.sleep).length}`)));
  }
  if (m.water) {
    const wa = seriesFor(mode, keys, (k) => dayOf(k).water);
    const waterUnit = (v) => plural(Math.round(v * 10) / 10, 'pahar', 'pahare');
    cards.push(chartCard('Apă', `pahare ${daysWord}`, barChart({ id: 'water', points: wa, target: g.water, unit: waterUnit, dec: 1, showLabel: lr }) + valuesTable(wa, waterUnit, 1),
      metaItem('Medie', ps.water.length ? `${fmt(avg(ps.water) * 0.25, 1)} <small>L/zi</small>` : '—')));
  }
  if (m.steps) {
    const st = seriesFor(mode, keys, (k) => dayOf(k).steps);
    const stepsUnit = (v) => plural(Math.round(v), 'pas', 'pași');
    cards.push(chartCard('Pași', mode === 'year' ? 'medie lunară' : 'pe zi', barChart({ id: 'steps', points: st, target: g.steps, unit: stepsUnit, dec: 0, showLabel: lr }) + valuesTable(st, stepsUnit, 0),
      metaItem('Total', ps.steps.length ? compact(sum(ps.steps)) : '—') + metaItem('Medie / zi', ps.steps.length ? fmt(avg(ps.steps), 0) : '—')));
  }

  // muscles
  const shownMuscles = S().muscles.filter((x) => !x.hidden || ps.muscles.get(x.id));
  if (shownMuscles.length) {
    const mx = Math.max(1, ...shownMuscles.map((x) => ps.muscles.get(x.id) || 0));
    cards.push(chartCard('Grupe musculare', 'de câte ori', hbars(shownMuscles.map((x) => {
      const c = ps.muscles.get(x.id) || 0;
      return { label: esc(x.name), pct: (c / mx) * 100, display: c ? `×${c}` : '0' };
    }))));
  }
  if (ps.sports.size) {
    const list = [...ps.sports.entries()].sort((a, b) => b[1].count - a[1].count);
    const mx = list[0][1].count;
    cards.push(chartCard('Alte sporturi', 'sesiuni', hbars(list.map(([id, v]) => {
      const sp = S().sports.find((x) => x.id === id) || { name: id, emoji: '🏅' };
      return { label: `${esc(sp.emoji)} ${esc(sp.name)}`, pct: (v.count / mx) * 100, display: `×${v.count}${v.min ? ` · ${fmtMin(v.min)}` : ''}` };
    }))));
  }
  // task completion
  const trows = S().tasks.map((task) => {
    let sch = 0, done = 0, extra = 0;
    for (const k of keys) {
      if (k > t) break;
      const s = isScheduled(task, k), d = isDone(k, task.id);
      if (s) { sch++; if (d) done++; } else if (d) extra++;
    }
    return { task, sch, done, extra };
  }).filter((r) => r.sch || r.extra);
  if (trows.length) {
    cards.push(chartCard('Taskuri', 'cât la sută din zilele programate', hbars(trows.map((r) => ({
      label: `${esc(r.task.emoji)} ${esc(r.task.name)}`,
      pct: r.sch ? (r.done / r.sch) * 100 : 0,
      display: r.sch ? `${Math.round((r.done / r.sch) * 100)}%` : `+${r.extra} în plus`,
    })))));
  }
  if (m.mood && ps.moods.length) {
    const counts = MOODS.map(([v]) => ps.moods.filter((x) => x === v).length);
    const mx = Math.max(1, ...counts);
    cards.push(chartCard('Starea zilelor', `medie ${fmt(avg(ps.moods), 1)} din 5`, hbars(MOODS.map(([v, e, l], i) => ({ label: `${e} ${l}`, pct: (counts[i] / mx) * 100, display: `${counts[i]}` })).reverse())));
  }

  return `<header class="topbar"><div class="topbar-in">
    <div class="seg" role="group" aria-label="Perioada">
      ${[['week', 'Săptămână'], ['month', 'Lună'], ['year', 'An']].map(([v, l]) => `<button type="button" data-action="statsMode" data-v="${v}" aria-pressed="${mode === v}">${l}</button>`).join('')}
    </div>
    <div class="daynav">
      <button class="icon-btn" type="button" data-action="statsNav" data-delta="-1" aria-label="Perioada anterioară">${ICON.chevL}</button>
      <div class="date-pick"><span class="dp-wd">${per.title}</span><span class="dp-date">${per.label}</span></div>
      <button class="icon-btn" type="button" data-action="statsNav" data-delta="1" aria-label="Perioada următoare">${ICON.chevR}</button>
    </div>
  </div></header>
  <div class="page">
    <div class="tiles">${tiles.join('')}</div>
    ${cards.join('')}
  </div>`;
}
function hbars(rows) {
  return `<div class="hbars">${rows.map((r) => `<div class="hb"><span class="hb-l">${r.label}</span><span class="hb-track"><i style="width:${clamp(r.pct, 0, 100)}%"></i></span><span class="hb-v">${r.display}</span></div>`).join('')}</div>`;
}

/* ================= views: SETTINGS ================= */
function daysSummary(days) {
  if (!days.length) return 'Opțional · neprogramat';
  if (days.length === 7) return 'Zilnic';
  const s = [...days].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b));
  if (s.join() === '1,2,3,4,5') return 'Luni – vineri';
  if (s.join() === '6,0') return 'Weekend';
  return s.map((d) => DOW_SHORT[d]).join(', ');
}
function goalRow(key, label, unit, sub = '', int = true) {
  const v = S().goals[key];
  return `<label class="set-row"><span class="lbl"><b>${label}</b>${sub ? `<span>${sub}</span>` : ''}</span>
    <span class="input-unit"><input class="input" id="goal-${key}" data-change="goal" data-g="${key}" ${int ? 'data-int="1" inputmode="numeric"' : 'inputmode="decimal"'} autocomplete="off" value="${inputVal(v)}">${unit}</span></label>`;
}
const canExport = () => !!Store.dl || !Store.framed;
function vSettings() {
  const st = S();
  const tasks = st.tasks;
  const standalone = isStandalone();
  const mods = [['nutrition', 'Calorii și proteine'], ['water', 'Apă'], ['sleep', 'Somn'], ['weight', 'Greutate'], ['steps', 'Pași'], ['mood', 'Starea zilei'], ['sex', 'Sex'], ['notes', 'Notițe']];
  const nDays = Object.keys(state.days).length;
  const storageNote = Store.mode === 'cloud'
    ? 'Datele se salvează în contul tău Claude, privat. Doar tu le vezi și se sincronizează între dispozitive.'
    : standalone
      ? 'Datele se salvează doar pe acest telefon, în aplicație. Fă din când în când un backup, ca să nu le pierzi dacă schimbi telefonul.'
      : 'Datele stau acum în browser. Dacă nu deschizi pagina câteva zile, Safari le poate șterge. Pune aplicația pe ecranul principal și fă backup.';
  return `<header class="topbar"><div class="topbar-in"><h1 class="title">Setări</h1></div></header>
  <div class="page">
    <section class="sec" aria-label="Obiective"><h2 class="sec-label">Obiective</h2>
      <div class="list">
        ${goalRow('kmWeek', 'Minim alergare', 'km', 'pe săptămână', false)}
        ${goalRow('gymWeek', 'Antrenamente sală', '', 'pe săptămână')}
        ${goalRow('kcal', 'Calorii', 'kcal', 'pe zi')}
        ${goalRow('protein', 'Proteine', 'g', 'pe zi')}
        ${goalRow('water', 'Apă', 'pahare', 'pe zi · un pahar = 250 ml')}
        ${goalRow('sleep', 'Somn', 'ore', 'pe noapte', false)}
        ${goalRow('steps', 'Pași', '', 'pe zi')}
      </div>
      <p class="hint" style="margin:0 4px">Rămân salvate până le schimbi tu.</p>
    </section>

    <section class="sec" aria-label="Taskuri"><h2 class="sec-label">Taskuri</h2>
      <div class="list">${tasks.map((t, i) => {
        const tg = t.type === 'num' && t.target ? ` (${[fmt(t.target, 2), esc(t.unit || '')].filter(Boolean).join(' ')})` : '';
        return `<div class="trow">
        <button class="trow-main" type="button" data-action="editTask" data-id="${esc(t.id)}"><span class="t-emoji" aria-hidden="true">${esc(t.emoji)}</span>
          <span class="t-text"><span class="t-name">${esc(t.name)}</span><span class="t-sum">${daysSummary(t.days)} · ${TYPE_LABEL[t.type]}${tg}</span></span></button>
        <span class="trow-act"><button class="icon-btn" type="button" data-action="moveTask" data-id="${esc(t.id)}" data-dir="-1" aria-label="Mută mai sus" ${i === 0 ? 'disabled' : ''}>${ICON.up}</button>
        <button class="icon-btn" type="button" data-action="moveTask" data-id="${esc(t.id)}" data-dir="1" aria-label="Mută mai jos" ${i === tasks.length - 1 ? 'disabled' : ''}>${ICON.down}</button></span>
      </div>`;
      }).join('')}
      <button class="add-row" type="button" data-action="newTask" style="border:0;border-radius:0">＋ Adaugă task</button></div>
      <p class="hint" style="margin:0 4px">Atinge un task ca să-i schimbi numele, emoji-ul sau zilele. Zilele noi contează de azi înainte.</p>
    </section>

    <section class="sec" aria-label="Grupe musculare"><h2 class="sec-label">Grupe musculare</h2>
      <div class="list">
        <div class="chips chip-del">${visMuscles().map((x) => `<button class="chip" type="button" data-action="delMuscle" data-id="${esc(x.id)}" aria-label="Șterge ${esc(x.name)}">${esc(x.name)} <span class="x" aria-hidden="true">×</span></button>`).join('') || '<span class="hint">Nicio grupă.</span>'}</div>
        <form class="inline-add" data-form="addMuscle"><input class="input" name="name" id="new-muscle" maxlength="40" autocomplete="off" placeholder="Grupă nouă, ex: Lombari" aria-label="Grupă musculară nouă"><button class="btn primary" type="submit">Adaugă</button></form>
      </div>
    </section>

    <section class="sec" aria-label="Sporturi"><h2 class="sec-label">Alte sporturi</h2>
      <div class="list">
        ${visSports().map((x) => `<div class="set-row"><span class="lbl"><b>${esc(x.emoji)} ${esc(x.name)}</b></span>
          <span class="sp-act"><label class="check-inline"><input type="checkbox" data-change="sportKm" data-id="${esc(x.id)}" ${x.km ? 'checked' : ''}> km</label>
          <button class="icon-btn" type="button" data-action="delSport" data-id="${esc(x.id)}" aria-label="Șterge ${esc(x.name)}">${ICON.x}</button></span></div>`).join('')}
        <form class="inline-add three" data-form="addSport"><input class="input" name="emoji" maxlength="8" autocomplete="off" placeholder="🏅" aria-label="Emoji" style="text-align:center"><input class="input" name="name" maxlength="40" autocomplete="off" placeholder="Sport nou, ex: Padel" aria-label="Sport nou"><button class="btn primary" type="submit">Adaugă</button></form>
      </div>
      <p class="hint" style="margin:0 4px">Bifează „km” la sporturile unde vrei să notezi și distanța.</p>
    </section>

    <section class="sec" aria-label="Ce urmăresc"><h2 class="sec-label">Ce urmăresc zilnic</h2>
      <div class="list">${mods.map(([k, l]) => `<div class="set-row"><span class="lbl"><b>${l}</b></span><button class="switch ${st.modules[k] ? 'on' : ''}" type="button" role="switch" aria-checked="${st.modules[k]}" data-action="module" data-m="${k}" aria-label="${l}"></button></div>`).join('')}</div>
    </section>

    <section class="sec" aria-label="Date și backup"><h2 class="sec-label">Date & backup</h2>
      <div class="list">
        <p class="note">${storageNote}<br><b>${plural(nDays, 'zi notată', 'zile notate')}</b> · ai început pe ${shortDate(st.start)} ${parseKey(st.start).getFullYear()}</p>
        <div class="inline-add" style="grid-template-columns:${canExport() ? '1fr 1fr' : '1fr'}">${canExport() ? '<button class="btn" type="button" data-action="export">⬇︎ Exportă backup</button>' : ''}<button class="btn" type="button" data-action="import">⬆︎ Importă backup</button></div>
        <div style="padding:0 16px 12px"><button class="btn danger block" type="button" data-action="reset">Șterge toate datele</button></div>
      </div>
    </section>

    <section class="sec" aria-label="Instalare"><h2 class="sec-label">Pe iPhone</h2>
      <div class="list"><div class="note">${standalone ? '<span class="badge">Instalată pe ecranul principal ✓</span>' : Store.framed
        ? `Acum folosești aplicația în Claude. Ca s-o ai ca aplicație separată pe ecranul principal, deschide în Safari <a href="${HOSTED_URL}" target="_blank" rel="noopener">${HOSTED_URL.replace('https://', '')}</a> și urmează pașii de mai jos.`
        : 'Ca s-o ai ca aplicație pe ecranul principal:'}
        ${standalone ? '' : '<ol><li>Deschide pagina în <b>Safari</b>.</li><li>Apasă butonul <b>Partajează</b> (pătratul cu săgeata în sus).</li><li>Alege <b>Adaugă pe ecranul principal</b>, apoi <b>Adaugă</b>.</li></ol>'}</div></div>
    </section>
    <p class="foot">Program Zilnic · v${APP_VERSION}</p>
  </div>`;
}

/* ================= sheets, toast, confirm ================= */
let sheetCtx = null;
function openSheet(title, body, ctx = {}) {
  dismissToast();
  sheetCtx = ctx;
  const root = $('#sheet-root');
  root.innerHTML = `<div class="sheet-wrap"><div class="scrim" data-action="closeSheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="sheet-grab" aria-hidden="true"></div>
    <div class="sheet-head"><h2 id="sheet-title">${esc(title)}</h2><button class="icon-btn" type="button" data-action="closeSheet" aria-label="Închide">${ICON.x}</button></div>
    <div class="sheet-body">${body}</div></div></div>`;
  document.body.classList.add('locked');
  fitSheet();
  const first = $('[autofocus]', root);
  if (first) setTimeout(() => first.focus(), 60);
}
function closeSheet() {
  $('#sheet-root').innerHTML = '';
  document.body.classList.remove('locked');
  sheetCtx = null;
  if (ui.remoteDirty) render();
}
// keep the sheet above the on-screen keyboard
function fitSheet() {
  const w = $('.sheet-wrap');
  const vv = window.visualViewport;
  if (!w || !vv) return;
  w.style.bottom = `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`;
}
window.visualViewport?.addEventListener('resize', fitSheet);
window.visualViewport?.addEventListener('scroll', fitSheet);

function confirmSheet(title, msg, okLabel, onOk, danger = true) {
  openSheet(title, `<p>${msg}</p><div class="btn-row"><button class="btn ${danger ? 'danger-fill' : 'primary'} block" type="button" data-action="sheetAct" data-act="ok">${esc(okLabel)}</button>
    <button class="btn block" type="button" data-action="closeSheet">Renunță</button></div>`, { ok: () => { closeSheet(); onOk(); } });
}
let toastTimer = null;
function toast(msg, actionLabel, onAction) {
  const root = $('#toast-root');
  clearTimeout(toastTimer);
  root.innerHTML = `<div class="toast" role="status"><span>${esc(msg)}</span>${actionLabel ? `<button type="button" data-action="toastAct">${esc(actionLabel)}</button>` : ''}</div>`;
  root._act = onAction || null;
  toastTimer = setTimeout(dismissToast, actionLabel ? 5000 : 2600);
}
function dismissToast() {
  const root = $('#toast-root');
  clearTimeout(toastTimer);
  if (root) { root.innerHTML = ''; root._act = null; }
}

/* task editor */
function openTaskEditor(id) {
  const t = id ? taskById(id) : null;
  const d = t ? clone(t) : { type: 'check', name: '', emoji: '✅', days: ALL_DAYS.slice(), unit: '', target: null };
  const has = (type) => S().tasks.some((x) => x.type === type);
  const types = t ? null : ['check', 'num', ...['gym', 'run', 'sport'].filter((x) => !has(x))];
  const dayBtns = WEEK_ORDER.map((dw) => `<button class="chip ${d.days.includes(dw) ? 'on' : ''}" type="button" data-action="dayChip" data-d="${dw}" aria-pressed="${d.days.includes(dw)}">${DOW_SHORT[dw]}</button>`).join('');
  const body = `<form class="form" data-form="task" novalidate>
    <label class="field"><span>Nume</span><input class="input" name="name" maxlength="40" autocomplete="off" required value="${esc(d.name)}" placeholder="ex: Citit 20 de pagini" ${t ? '' : 'autofocus'}></label>
    <div class="field"><span>Emoji</span><div class="emoji-row"><input class="input" name="emoji" maxlength="8" autocomplete="off" value="${esc(d.emoji)}" aria-label="Emoji">
      <div class="emoji-picks">${EMOJI_PICKS.map((e) => `<button type="button" data-action="pickEmoji" data-e="${e}" aria-label="${e}">${e}</button>`).join('')}</div></div></div>
    ${types ? `<div class="field"><span>Tip</span><div class="radios">${types.map((ty, i) => `<label><input type="radio" name="type" value="${ty}" data-change="taskType" ${i === 0 ? 'checked' : ''}> ${TYPE_LABEL[ty]}</label>`).join('')}</div></div>` : `<p class="hint">Tip: ${TYPE_LABEL[d.type]}</p>`}
    <div class="fields" id="numFields" ${d.type === 'num' ? '' : 'hidden'}>
      <label class="field"><span>Unitate</span><input class="input" name="unit" maxlength="20" autocomplete="off" value="${esc(d.unit || '')}" placeholder="pagini, min…"></label>
      <label class="field"><span>Țintă pe zi</span><input class="input" name="target" inputmode="decimal" autocomplete="off" value="${inputVal(d.target)}" placeholder="opțional"></label>
    </div>
    <div class="field"><span>În ce zile</span><div class="chips daychips">${dayBtns}</div>
      <div class="presets"><button type="button" data-action="dayPreset" data-p="all">Zilnic</button><button type="button" data-action="dayPreset" data-p="work">Luni – vineri</button><button type="button" data-action="dayPreset" data-p="weekend">Weekend</button><button type="button" data-action="dayPreset" data-p="none">Nicio zi (opțional)</button></div></div>
    <div class="btn-row"><button class="btn primary block" type="submit">${t ? 'Salvează' : 'Adaugă taskul'}</button>
    ${t ? '<button class="btn danger block" type="button" data-action="sheetAct" data-act="del">Șterge taskul</button>' : ''}</div>
  </form>`;
  openSheet(t ? 'Editează taskul' : 'Task nou', body, {
    submit(form) {
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      if (!name) { form.elements.name.focus(); toast('Scrie un nume pentru task.'); return; }
      const days = $$('.daychips .chip.on', form).map((b) => Number(b.dataset.d));
      const emoji = String(fd.get('emoji') || '').trim() || '✅';
      const type = t ? t.type : String(fd.get('type') || 'check');
      const today = todayKey();
      const t2 = t ? taskById(t.id) : null;
      if (t && !t2) { closeSheet(); toast('Taskul nu mai există.'); return; }
      if (t2) {
        const t = t2;
        const sameDays = [...t.days].sort().join() === [...days].sort().join();
        if (!sameDays) {
          // keep past weeks as they were scored; the new days count from today
          const h = t.sched ? t.sched.map((s) => ({ from: s.from, days: s.days.slice() })) : [{ from: FIRST_SCHED, days: t.days.slice() }];
          if (h[h.length - 1].from === today) h.pop();
          h.push({ from: today, days: days.slice() });
          t.sched = h;
        }
        if (type === 'num') {
          const tg = parseNum(fd.get('target'));
          const target = tg > 0 ? tg : null;
          if (target !== t.target) {
            for (const [k, day] of Object.entries(state.days)) {
              const e = day.t?.[t.id];
              if (k >= today && e?.v != null && !e.off) { e.d = target ? e.v >= target : e.v > 0; cleanDay(day); Store.saveDay(k); }
            }
          }
          t.target = target;
          t.unit = String(fd.get('unit') || '').trim();
        }
        Object.assign(t, { name, emoji, days });
      } else {
        const builtIn = ['gym', 'run', 'sport'].includes(type);
        const next = { id: builtIn && !taskById(type) ? type : `t${uid()}`, type, name, emoji, days, since: today };
        if (type === 'num') { next.unit = String(fd.get('unit') || '').trim(); const tg = parseNum(fd.get('target')); next.target = tg > 0 ? tg : null; }
        S().tasks.push(next);
      }
      saveSettings();
      closeSheet();
      render();
      toast(t ? 'Task salvat' : 'Task adăugat');
    },
    del() {
      confirmSheet('Ștergi taskul?', `„${esc(t.name)}” dispare din listă și din statistici. Zilele notate deja rămân în backup.`, 'Șterge', () => {
        state.settings.tasks = S().tasks.filter((x) => x.id !== id);
        ui.expanded.delete(t.id);
        saveSettings();
        render();
        toast('Task șters');
      });
    },
  });
}

function editNumSheet(field) {
  const [label, unit] = METRIC[field];
  const k = ui.date;
  const v = dayOf(k)[field];
  openSheet(`${label} · ${shortDate(k)}`, `<form class="form" data-form="setNum" data-field="${field}">
    <label class="field"><span>Total pe zi (${unit})</span>
      <span class="add"><input class="input" name="v" inputmode="numeric" autocomplete="off" value="${v ?? ''}" autofocus aria-label="Total ${label.toLowerCase()} în ${unit}"><button class="btn primary" type="submit">Salvează</button></span></label>
    ${v != null ? '<button class="btn danger block" type="button" data-action="sheetAct" data-act="clear">Șterge valoarea</button>' : ''}
  </form>`, {
    clear() { mutDay(k, (d) => { delete d[field]; }); closeSheet(); refreshMetric(k, field); },
  });
}

/* ================= routing & render ================= */
const VIEWS = { azi: vToday, saptamana: vWeek, statistici: vStats, setari: vSettings };
let booted = false;
function render() {
  if (!booted) return;
  chartReg.clear();
  ui.remoteDirty = false;
  const v = $('#view');
  v.innerHTML = (Store.readonly ? '<div class="ro-banner" role="alert">Doar citire: nu mai ai acces să salvezi modificări aici.</div>' : '') + VIEWS[ui.tab]();
  if (ui.tab === 'azi') { const p = $('#dayProg'); if (p) p.dataset.complete = dayComplete(ui.date) ? '1' : '0'; }
  $$('.tabbar [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === ui.tab)));
}
function setTab(tab, push = true) {
  if (!booted) return;
  if (!VIEWS[tab]) tab = 'azi';
  flushAll();
  const changed = ui.tab !== tab;
  ui.tab = tab;
  if (push && location.hash !== `#${tab}`) { try { history.replaceState(null, '', `#${tab}`); } catch (e) { location.hash = tab; } }
  render();
  if (changed) window.scrollTo(0, 0);
}
function setDate(k) {
  if (!isRealKey(k)) return;
  flushAll();
  ui.date = k;
  ui.followToday = k === todayKey();
  ui.expanded.clear();
  ui.showUns = null;
  render();
}
function remoteChanged() {
  const a = document.activeElement;
  if (sheetCtx || (a && a.matches?.('input, textarea'))) { ui.remoteDirty = true; return; }
  render();
}

function uiPref(k, v) {
  try {
    const o = JSON.parse(localStorage.getItem(LS_UI) || '{}');
    if (v === undefined) return o[k];
    o[k] = v; localStorage.setItem(LS_UI, JSON.stringify(o));
  } catch (e) { return undefined; }
  return v;
}

/* ================= actions ================= */
function setEntry(id, fn) {
  const t = taskById(id);
  if (!t) return;
  mutDay(ui.date, (d) => {
    d.t = d.t || {};
    const e = d.t[id] || { k: KIND[t.type] };
    fn(e, t);
    d.t[id] = e;
  });
}
// details (km, muscles, sports) tick the task; removing them all unticks it again if they were what ticked it
function autoTick(e, on) {
  if (on) { if (!e.d) { e.d = true; e.auto = true; } }
  else if (e.auto && !hasDetails(e)) { delete e.d; delete e.auto; }
}

const NAV_ACTIONS = new Set(['day', 'goToday', 'toggleUns', 'hideInstall', 'hideImport', 'expand', 'week', 'weekNow', 'openDay', 'weekCharts', 'statsMode', 'statsNav', 'closeSheet', 'toastAct', 'export', 'retryLoad']);
const ACTIONS = {
  day: (el) => setDate(addDays(ui.date, Number(el.dataset.delta))),
  goToday: () => setDate(todayKey()),
  toggleUns: (el) => { ui.showUns = el.getAttribute('aria-expanded') !== 'true'; render(); },
  hideInstall: () => { uiPref('hideInstall', true); render(); },
  hideImport: () => { uiPref('hideImport', true); render(); },
  newTask: () => openTaskEditor(null),
  editTask: (el) => openTaskEditor(el.dataset.id),
  moveTask: (el) => {
    const arr = S().tasks, i = arr.findIndex((t) => t.id === el.dataset.id), j = i + Number(el.dataset.dir);
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    saveSettings(); render();
    const btn = $(`[data-action="moveTask"][data-id="${CSS.escape(el.dataset.id)}"][data-dir="${el.dataset.dir}"]`);
    if (btn && !btn.disabled) btn.focus();
  },
  toggleTask: (el) => {
    const id = el.dataset.id, t = taskById(id), k = ui.date;
    if (!t) return;
    const e = entryOf(k, id);
    if (e?.d) {
      if (t.type === 'num') {
        setEntry(id, (x) => { x.d = false; if (x.v != null) x.off = true; });
      } else {
        const prev = clone(e);
        mutDay(k, (d) => { if (d.t) delete d.t[id]; });
        if (hasDetails(prev)) {
          toast(`${t.name}: debifat`, 'Anulează', () => {
            if (entryOf(k, id)) return;
            mutDay(k, (d) => { d.t = d.t || {}; d.t[id] = prev; });
            if (ui.tab === 'azi' && ui.date === k) { refreshToday(); rerenderPanel(id); }
          });
        }
      }
      rerenderPanel(id);
    } else {
      setEntry(id, (x) => { x.d = true; delete x.auto; delete x.off; });
      if (t.type !== 'check' && t.type !== 'num' && !ui.expanded.has(id)) {
        ui.expanded.add(id);
        const p = document.getElementById(`tp-${id}`);
        if (p) { p.hidden = false; p.innerHTML = taskPanel(t, k); }
      }
    }
    refreshToday({ celebrate: true });
  },
  expand: (el) => {
    const id = el.dataset.id, t = taskById(id), p = document.getElementById(`tp-${id}`);
    if (!t || !p) return;
    if (ui.expanded.has(id)) { ui.expanded.delete(id); p.hidden = true; p.innerHTML = ''; }
    else { ui.expanded.add(id); p.innerHTML = taskPanel(t, ui.date); p.hidden = false; }
    refreshToday();
    const firstInput = ui.expanded.has(id) && t.type === 'num' ? $('input', p) : null;
    if (firstInput) firstInput.focus();
  },
  muscle: (el) => {
    const id = el.dataset.id, m = el.dataset.m;
    setEntry(id, (e) => {
      const set = new Set(e.m || []);
      if (set.has(m)) set.delete(m); else set.add(m);
      e.m = S().muscles.map((x) => x.id).filter((x) => set.has(x)).concat([...set].filter((x) => !S().muscles.some((y) => y.id === x)));
      if (!e.m.length) delete e.m;
      autoTick(e, !!e.m);
    });
    rerenderPanel(id); refreshToday({ celebrate: true });
  },
  sport: (el) => {
    const id = el.dataset.id, sid = el.dataset.s;
    setEntry(id, (e) => {
      const list = e.s || [];
      const i = list.findIndex((s) => s.id === sid);
      if (i >= 0) list.splice(i, 1); else list.push({ id: sid });
      if (list.length) e.s = list; else delete e.s;
      autoTick(e, !!e.s);
    });
    rerenderPanel(id); refreshToday({ celebrate: true });
  },
  editNum: (el) => editNumSheet(el.dataset.field),
  waterSet: (el) => {
    const n = Number(el.dataset.n), cur = dayOf(ui.date).water || 0;
    mutDay(ui.date, (d) => { d.water = n === cur ? n - 1 : n; if (!d.water) delete d.water; });
    replaceEl('wb', waterHtml(ui.date));
  },
  waterAdd: () => { mutDay(ui.date, (d) => { d.water = Math.min((d.water || 0) + 1, DAY_RANGES.water[1]); }); replaceEl('wb', waterHtml(ui.date)); },
  step: (el) => {
    const f = el.dataset.field, delta = Number(el.dataset.delta);
    const cur = dayOf(ui.date)[f];
    const base = cur == null ? S().goals[f] + (delta > 0 ? 0 : delta) : cur + delta;
    const v = clamp(Math.round(base * 2) / 2, 0, 24);
    mutDay(ui.date, (d) => { d[f] = v; });
    const inp = $(`#in-${f}`); if (inp) inp.value = inputVal(v);
  },
  mood: (el) => {
    const v = Number(el.dataset.v);
    mutDay(ui.date, (d) => { d.mood = d.mood === v ? null : v; });
    const cur = dayOf(ui.date).mood;
    $$('.mood').forEach((b) => { const on = Number(b.dataset.v) === cur; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  },
  toggleSex: (el) => {
    mutDay(ui.date, (d) => { d.sex = !d.sex; });
    const on = !!dayOf(ui.date).sex;
    el.classList.toggle('on', on); el.setAttribute('aria-checked', String(on));
    const s = $('#sexsub'); if (s) s.textContent = sexSub(ui.date);
  },
  week: (el) => { ui.week = addDays(ui.week, Number(el.dataset.delta)); render(); },
  weekNow: () => { ui.week = todayKey(); render(); },
  openDay: (el) => { ui.date = el.dataset.k; ui.followToday = ui.date === todayKey(); ui.expanded.clear(); ui.showUns = null; setTab('azi'); },
  weekCharts: () => { ui.statsMode = 'week'; ui.statsAnchor = ui.week; setTab('statistici'); },
  statsMode: (el) => { ui.statsMode = el.dataset.v; render(); },
  statsNav: (el) => {
    const d = parseKey(ui.statsAnchor), n = Number(el.dataset.delta);
    if (ui.statsMode === 'week') ui.statsAnchor = addDays(ui.statsAnchor, 7 * n);
    else if (ui.statsMode === 'month') ui.statsAnchor = keyOf(new Date(d.getFullYear(), d.getMonth() + n, 1, 12));
    else ui.statsAnchor = keyOf(new Date(d.getFullYear() + n, 0, 1, 12));
    render();
  },
  module: (el) => {
    const k = el.dataset.m;
    S().modules[k] = !S().modules[k];
    el.classList.toggle('on', S().modules[k]); el.setAttribute('aria-checked', String(S().modules[k]));
    saveSettings();
  },
  delMuscle: (el) => {
    const mus = S().muscles.find((x) => x.id === el.dataset.id);
    if (!mus) return;
    mus.hidden = true;
    saveSettings(); render();
    const mid = mus.id;
    toast(`Am șters „${mus.name}”`, 'Anulează', () => { const x = S().muscles.find((y) => y.id === mid); if (x) { delete x.hidden; saveSettings(); if (ui.tab === 'setari') render(); } });
  },
  delSport: (el) => {
    const sp = S().sports.find((x) => x.id === el.dataset.id);
    if (!sp) return;
    sp.hidden = true;
    saveSettings(); render();
    const sid = sp.id;
    toast(`Am șters „${sp.name}”`, 'Anulează', () => { const x = S().sports.find((y) => y.id === sid); if (x) { delete x.hidden; saveSettings(); if (ui.tab === 'setari') render(); } });
  },
  export: () => doExport(),
  import: () => $('#importFile').click(),
  reset: () => confirmSheet('Ștergi toate datele?', 'Toate zilele notate, taskurile și setările revin la început. Nu se poate anula. Exportă întâi un backup dacă vrei să le păstrezi.', 'Șterge tot', () => {
    const prev = Object.keys(state.days);
    state = normalize(null);
    ui.expanded.clear();
    render();
    toast('Datele au fost șterse');
    Store.saveAll(prev);
  }),
  closeSheet: () => closeSheet(),
  sheetAct: (el) => { const f = sheetCtx?.[el.dataset.act]; if (f) f(); },
  toastAct: () => { const f = $('#toast-root')._act; dismissToast(); if (f) f(); },
  pickEmoji: (el) => { const f = el.closest('form'); if (f) f.elements.emoji.value = el.dataset.e; },
  dayChip: (el) => { const on = !el.classList.contains('on'); el.classList.toggle('on', on); el.setAttribute('aria-pressed', String(on)); },
  dayPreset: (el) => {
    const sets = { all: ALL_DAYS, work: [1, 2, 3, 4, 5], weekend: [6, 0], none: [] };
    const set = sets[el.dataset.p] || [];
    $$('.daychips .chip', el.closest('form')).forEach((b) => { const on = set.includes(Number(b.dataset.d)); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  },
  retryLoad: () => { $('#view').innerHTML = '<div class="loading" id="loading">Se încarcă programul…</div>'; start(); },
};

function capInput(el, v, max) {
  if (v == null || v <= max) return v;
  el.value = inputVal(max);
  toast(`Maxim ${fmt(max, 0)}.`);
  return max;
}
const INPUTS = {
  runKm: (el) => {
    const v = capInput(el, parseNum(el.value), 1000);
    setEntry(el.dataset.id, (e) => { if (v > 0) e.km = v; else delete e.km; autoTick(e, e.km != null); });
    refreshToday({ celebrate: true });
  },
  runMin: (el) => {
    const v = capInput(el, parseNum(el.value, true), 1440);
    setEntry(el.dataset.id, (e) => { if (v > 0) e.min = v; else delete e.min; autoTick(e, hasDetails(e)); });
    refreshToday();
  },
  sportMin: (el) => {
    const v = capInput(el, parseNum(el.value, true), 1440);
    setEntry(el.dataset.id, (e) => { const s = (e.s || []).find((x) => x.id === el.dataset.s); if (s) { if (v > 0) s.min = v; else delete s.min; } });
    refreshToday();
  },
  sportKm: (el) => {
    const v = capInput(el, parseNum(el.value), 1000);
    setEntry(el.dataset.id, (e) => { const s = (e.s || []).find((x) => x.id === el.dataset.s); if (s) { if (v > 0) s.km = v; else delete s.km; } });
    refreshToday();
  },
  numVal: (el) => {
    const t = taskById(el.dataset.id);
    const v = parseNum(el.value);
    setEntry(el.dataset.id, (e) => {
      delete e.off;
      if (v == null) { delete e.v; e.d = false; return; }
      e.v = v;
      e.d = t.target ? v >= t.target : v > 0;
    });
    refreshToday({ celebrate: true });
  },
  num: (el) => {
    const f = el.dataset.field;
    const v = parseNum(el.value, !!el.dataset.int);
    const [lo, hi] = DAY_RANGES[f];
    mutDay(ui.date, (d) => {
      if (v == null || (f !== 'sleep' && v === 0)) delete d[f];
      else d[f] = clamp(v, lo, hi);
    });
    const stored = dayOf(ui.date)[f];
    if (stored != null && v != null && stored !== v) el.value = inputVal(stored);
    if (f === 'weight') { const s = $('#wsub'); if (s) s.textContent = weightSub(ui.date); }
    if (f === 'steps') { const s = $('#ssub'); if (s) s.textContent = stepsSub(ui.date); }
  },
  note: (el) => {
    const val = el.value.slice(0, NOTE_MAX);
    mutDay(ui.date, (d) => { d.note = val.trim() ? val : null; });
  },
};

const CHANGES = {
  pickDate: (el) => { if (isRealKey(el.value)) setDate(el.value); },
  goal: (el) => {
    const g = el.dataset.g;
    const v = parseNum(el.value, !!el.dataset.int);
    if (v == null || v > GOAL_MAX[g]) {
      el.value = inputVal(S().goals[g]);
      toast(`Introdu un număr între 0 și ${fmt(GOAL_MAX[g], 0)}.`);
      return;
    }
    S().goals[g] = v;
    el.value = inputVal(v);
    saveSettings();
    toast('Obiectiv salvat');
  },
  sportKm: (el) => { const sp = S().sports.find((x) => x.id === el.dataset.id); if (sp) { sp.km = el.checked; saveSettings(); } },
  taskType: (el) => { const nf = $('#numFields'); if (nf) nf.hidden = el.value !== 'num'; },
  importFile: (el) => {
    const f = el.files?.[0];
    el.value = '';
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let obj;
      try { obj = JSON.parse(String(r.result)); } catch (e) { toast('Fișierul nu e un backup valid.'); return; }
      if (!obj || typeof obj !== 'object' || !obj.settings || typeof obj.days !== 'object') { toast('Fișierul nu e un backup Program Zilnic.'); return; }
      const next = normalize(obj);
      const n = Object.keys(next.days).length;
      confirmSheet('Imporți backup-ul?', `Backup-ul are ${plural(n, 'zi notată', 'zile notate')}. Datele actuale vor fi înlocuite.`, 'Importă', () => {
        const prev = Object.keys(state.days);
        state = next;
        ui.expanded.clear();
        render();
        toast('Backup importat');
        Store.saveAll(prev);
      }, false);
    };
    r.onerror = () => toast('Nu am putut citi fișierul.');
    r.readAsText(f);
  },
};

const FORMS = {
  addNum: (form) => {
    const f = form.dataset.field;
    const inp = form.elements.v;
    const v = parseNum(inp.value, true);
    if (!(v > 0)) { inp.focus(); return; }
    const k = ui.date;
    const prev = dayOf(k)[f];
    const next = Math.min((prev || 0) + v, DAY_RANGES[f][1]);
    mutDay(k, (d) => { d[f] = next; });
    refreshMetric(k, f);
    toast(`Adăugat: +${fmt(v, 0)} ${METRIC[f][1]}`, 'Anulează', () => {
      if (dayOf(k)[f] !== next) return;
      mutDay(k, (d) => { d[f] = prev ?? null; });
      refreshMetric(k, f);
    });
  },
  setNum: (form) => {
    const f = form.dataset.field;
    const raw = String(form.elements.v.value || '').trim();
    const v = parseNum(raw, true);
    if (raw && v == null) { form.elements.v.focus(); toast('Introdu un număr.'); return; }
    const k = ui.date;
    mutDay(k, (d) => { d[f] = v == null ? null : Math.min(v, DAY_RANGES[f][1]); });
    closeSheet();
    refreshMetric(k, f);
  },
  task: (form) => sheetCtx?.submit?.(form),
  addMuscle: (form) => {
    const name = String(form.elements.name.value || '').trim();
    if (!name) return;
    const same = S().muscles.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (same && !same.hidden) { toast('Grupa există deja.'); return; }
    if (same) delete same.hidden;
    else {
      let id = slug(name);
      if (S().muscles.some((x) => x.id === id)) id = `${id}-${uid()}`;
      S().muscles.push({ id, name });
    }
    saveSettings(); render();
    $('#new-muscle')?.focus();
  },
  addSport: (form) => {
    const name = String(form.elements.name.value || '').trim();
    if (!name) return;
    const same = S().sports.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (same && !same.hidden) { toast('Sportul există deja.'); return; }
    const emoji = String(form.elements.emoji.value || '').trim();
    if (same) { delete same.hidden; if (emoji) same.emoji = emoji; }
    else {
      let id = slug(name);
      if (S().sports.some((x) => x.id === id)) id = `${id}-${uid()}`;
      S().sports.push({ id, name, emoji: emoji || '🏅', km: false });
    }
    saveSettings(); render();
  },
};

async function doExport() {
  flushAll();
  const data = JSON.stringify({ app: 'program-zilnic', v: 1, exportedAt: new Date().toISOString(), settings: state.settings, days: state.days }, null, 1);
  const name = `program-zilnic-${todayKey()}.json`;
  if (Store.dl) {
    try { await Store.dl.save({ filename: name, data }); toast('Backup salvat'); }
    catch (e) { if (e?.code !== 'declined') toast('Nu am putut salva fișierul.'); }
    return;
  }
  if (Store.framed) { toast('Exportul nu merge aici. Deschide aplicația în Safari.'); return; }
  try {
    const file = new File([data], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Backup Program Zilnic' });
      return;
    }
  } catch (e) { if (e?.name === 'AbortError') return; }
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('Backup descărcat');
}

/* ================= events ================= */
let roWarned = 0;
function blockedByReadonly(name) {
  if (!Store.readonly || NAV_ACTIONS.has(name)) return false;
  if (Date.now() - roWarned > 3000) { roWarned = Date.now(); toast('Doar citire: modificările nu se mai pot salva.'); }
  return true;
}
document.addEventListener('click', (ev) => {
  const tabBtn = ev.target.closest('[data-tab]');
  if (tabBtn) { setTab(tabBtn.dataset.tab); return; }
  const el = ev.target.closest('[data-action]');
  if (el && !el.disabled && ACTIONS[el.dataset.action]) {
    ev.preventDefault();
    if (blockedByReadonly(el.dataset.action)) return;
    ACTIONS[el.dataset.action](el, ev);
    return;
  }
  if (!ev.target.closest('.chart')) $$('.chart.has-active').forEach(clearTip);
});
document.addEventListener('pointerdown', (ev) => {
  const hit = ev.target.closest?.('rect.hit');
  if (hit) showTip(hit);
});
document.addEventListener('pointerover', (ev) => {
  if (ev.pointerType !== 'mouse') return;
  const hit = ev.target.closest?.('rect.hit');
  if (hit) showTip(hit);
});
document.addEventListener('pointerout', (ev) => {
  if (ev.pointerType !== 'mouse') return;
  const wrap = ev.target.closest?.('.chart');
  if (wrap && !wrap.contains(ev.relatedTarget)) clearTip(wrap);
});
document.addEventListener('input', (ev) => {
  const el = ev.target.closest('[data-input]');
  if (!el || !INPUTS[el.dataset.input]) return;
  if (blockedByReadonly(el.dataset.input)) { render(); return; }
  INPUTS[el.dataset.input](el);
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-change]');
  if (!el || !CHANGES[el.dataset.change]) return;
  if (el.dataset.change !== 'pickDate' && el.dataset.change !== 'taskType' && blockedByReadonly(el.dataset.change)) { render(); return; }
  CHANGES[el.dataset.change](el);
});
document.addEventListener('submit', (ev) => {
  const form = ev.target.closest('[data-form]');
  if (!form) return;
  ev.preventDefault();
  if (blockedByReadonly(form.dataset.form)) return;
  if (FORMS[form.dataset.form]) FORMS[form.dataset.form](form);
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && sheetCtx) closeSheet();
});
document.addEventListener('focusout', () => setTimeout(() => {
  if (!ui.remoteDirty || sheetCtx) return;
  const a = document.activeElement;
  if (a && a.matches?.('input, textarea')) return;
  render();
}, 0));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { flushAll(); return; }
  Store.retryDirty();
  Store.subscribe();
  if (ui.followToday && ui.date !== todayKey()) {
    ui.date = todayKey();
    ui.expanded.clear();
    ui.showUns = null;
    if (ui.tab === 'azi') { if (sheetCtx) closeSheet(); render(); }
  }
});
window.addEventListener('pagehide', flushAll);
window.addEventListener('online', () => { Store.retryDirty(); Store.subscribe(); });
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (VIEWS[h] && h !== ui.tab) setTab(h, false); });

/* ================= boot ================= */
const loadError = (msg, retry) => `<div class="loading"><div class="load-err"><p>${msg}</p>${retry ? '<button class="btn primary" type="button" data-action="retryLoad">Reîncearcă</button>' : ''}</div></div>`;
async function start() {
  const slow = setTimeout(() => {
    if (!booted) $('#view').innerHTML = loadError('Încărcarea durează mai mult ca de obicei. Verifică conexiunea la internet.', true);
  }, 10000);
  let raw = null;
  try { raw = await Store.load(); }
  catch (e) {
    clearTimeout(slow);
    if (booted) return;
    console.warn('load failed', e);
    const terminal = ['revoked', 'not_granted', 'capability_disabled', 'capability_removed'].includes(e?.code);
    $('#view').innerHTML = loadError(terminal ? 'Nu ai acces la datele de aici. Deschide aplicația din contul tău Claude.' : 'Nu am putut încărca datele din contul tău.', !terminal);
    return;
  }
  clearTimeout(slow);
  if (booted) return;
  state = normalize(raw);
  booted = true;
  if (raw?.migrated) Store.saveAll();
  else if (Store.mode === 'cloud') {
    if (!raw?.settings) Store.saveSettings();
    for (const id of raw?.replay || []) Store.writeDoc(id);
  }
  if (Store.mode === 'local') { try { navigator.storage?.persist?.(); } catch (e) { /* not supported */ } }
  const h = location.hash.slice(1);
  ui.tab = VIEWS[h] ? h : 'azi';
  render();
  Store.subscribe();
}
async function boot() {
  window.__pz = { get state() { return state; }, ui, Store, version: APP_VERSION };
  await Store.init();
  await start();
}
boot();
})();
