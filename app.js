/* Coach Tikismikis — app web instalable. Datos en Supabase; análisis y sincronización en la función "coach". */
(() => {
const SUPA_URL = "https://iglbakcgsahqmoepkoyc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbGJha2Nnc2FocW1vZXBrb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5Mjc0NzAsImV4cCI6MjExMDUwMzQ3MH0.XENiPTNHvEWkva0agvbGRHrbmGGKt40dEQ8ZTgNMWz4";
const VAPID = "BJJQBXNoM0RiUnLaiZx4BxfKxSCGfNpkIIH_PTa-48WnvwrwTADD_mzZ1dJOuUkXvBCDKbndtNUaIZKFNEfvPDA";
const FN = SUPA_URL + "/functions/v1/coach";
const VERSION = "1.1.0";

const sb = supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "coach-auth" } });
const $ = (s, e = document) => e.querySelector(s);
const root = $("#root");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
const DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const pd = d => { const [y, m, dd] = d.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, dd); };
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const monday = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const hrs = m => { const r = /(\d+)h(\d+)/.exec(m || ""); return r ? (+r[1]) + (+r[2]) / 60 : 0; };
const fmtH = h => Math.floor(h) + " h " + String(Math.round((h % 1) * 60)).padStart(2, "0");
const nf = n => Math.round(n).toLocaleString("es-ES");
const dec = (n, d = 2) => (+n).toFixed(d).replace(".", ",");
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const store = { get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;

const S = Object.assign({ rides: [], weeks: {}, plan: null, profile: null, strength: [] }, store.get("coach-cache", {}));
let session = null, tab = store.get("coach-tab", "semana"), channel = null;

const ICON = {
  semana: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><rect x="5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="7" width="3" height="11" rx="1"/><rect x="16" y="4" width="3" height="14" rx="1"/></svg>',
  salidas: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l-1.5-3H6M15 9l-2 7"/></svg>',
  plan: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 14l2 2 4-4"/></svg>',
  share: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>',
  chev: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  dumbbell: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/></svg>',
  mic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
};

/* ---------- Puerta: instalación y acceso ---------- */
function showInstall() {
  root.innerHTML = `<div class="gate">
    <img class="logo" src="icons/icon-192.png" alt="">
    <div><h1>Instala tu coach</h1><p style="margin-top:8px">Añádelo a la pantalla de inicio: se abrirá como una app, a pantalla completa y con avisos cuando termines una salida.</p></div>
    <div class="card"><ol class="steps">
      <li><span class="n">1</span><p>Pulsa <strong>Compartir</strong> ${ICON.share} en la barra de Safari.</p></li>
      <li><span class="n">2</span><p>Elige <strong>Añadir a pantalla de inicio</strong> ${ICON.plus}.</p></li>
      <li><span class="n">3</span><p>Pulsa <strong>Añadir</strong> y abre <strong>Coach</strong> desde tu pantalla de inicio.</p></li>
    </ol></div>
    <button class="link" id="skip">Seguir en el navegador</button>
  </div>`;
  $("#skip").onclick = () => { store.set("coach-skip-install", 1); showLogin(); };
}

function showLogin(step = "email", email = store.get("coach-email", "")) {
  if (step === "email") {
    root.innerHTML = `<div class="gate">
      <img class="logo" src="icons/icon-192.png" alt="">
      <div><h1>Coach Tikismikis</h1><p style="margin-top:8px">Tu coach de ciclismo: cada salida, su lectura y tu semana.</p></div>
      <form class="card" id="f" novalidate>
        <label for="email">Tu email</label>
        <input id="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="tu@email.com" value="${esc(email)}" required>
        <p class="err" id="err" role="alert"></p>
        <button class="btn primary block" id="go" type="submit">Enviarme un código</button>
        <p style="font-size:13px">Te llega un código por email. Sin contraseñas.</p>
      </form>
    </div>`;
    const f = $("#f"), inp = $("#email"), err = $("#err"), go = $("#go");
    if (!email) setTimeout(() => inp.focus(), 300);
    inp.oninput = () => (err.textContent = "");
    f.onsubmit = async e => {
      e.preventDefault();
      const v = inp.value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { err.textContent = "Escribe un email válido."; inp.focus(); return; }
      go.disabled = true; go.textContent = "Enviando…";
      const { error } = await sb.auth.signInWithOtp({ email: v, options: { shouldCreateUser: true } });
      if (error) { go.disabled = false; go.textContent = "Enviarme un código"; err.textContent = /rate|seconds/i.test(error.message) ? "Espera un minuto antes de pedir otro código." : "No se pudo enviar el código. Revisa el email e inténtalo de nuevo."; return; }
      store.set("coach-email", v); store.set("coach-otp-at", Date.now());
      showLogin("code", v);
    };
    return;
  }
  root.innerHTML = `<div class="gate">
    <img class="logo" src="icons/icon-192.png" alt="">
    <div><h1>Revisa tu correo</h1><p style="margin-top:8px">Te hemos enviado un código a <strong style="color:#fff">${esc(email)}</strong>.</p></div>
    <form class="card" id="f" novalidate>
      <label for="code">Código del email</label>
      <input id="code" class="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="8" placeholder="········">
      <p class="err" id="err" role="alert"></p>
      <button class="btn primary block" id="go" type="submit">Entrar</button>
    </form>
    <div class="row between"><button class="link" id="change">Cambiar email</button><button class="link" id="resend"></button></div>
  </div>`;
  const inp = $("#code"), err = $("#err"), go = $("#go"), resend = $("#resend");
  setTimeout(() => inp.focus(), 300);
  const tick = () => { const left = 60 - Math.floor((Date.now() - store.get("coach-otp-at", 0)) / 1000); resend.disabled = left > 0; resend.textContent = left > 0 ? `Reenviar en ${left} s` : "Reenviar código"; if (left > 0) setTimeout(tick, 1000); };
  tick();
  const verify = async () => {
    const t = inp.value.replace(/\D/g, "");
    if (t.length < 6) { err.textContent = "Escribe el código completo del email."; return; }
    go.disabled = true; go.textContent = "Comprobando…";
    const { error } = await sb.auth.verifyOtp({ email, token: t, type: "email" });
    if (error) { go.disabled = false; go.textContent = "Entrar"; err.textContent = "Ese código no vale: revísalo o pide uno nuevo (caduca en una hora y solo sirve el último)."; inp.select(); return; }
  };
  inp.oninput = () => { err.textContent = ""; inp.value = inp.value.replace(/\D/g, "").slice(0, 8); if (inp.value.length === 8) verify(); };
  $("#f").onsubmit = e => { e.preventDefault(); verify(); };
  $("#change").onclick = () => showLogin("email", email);
  resend.onclick = async () => { resend.disabled = true; await sb.auth.signInWithOtp({ email }); store.set("coach-otp-at", Date.now()); tick(); toast("Código reenviado"); };
}

function showNoAccess() {
  root.innerHTML = `<div class="gate"><img class="logo" src="icons/icon-192.png" alt="">
    <div><h1>Aún no tienes acceso</h1><p style="margin-top:8px">Tu cuenta está creada, pero el coach todavía no está activado para ti. Pídeselo a Manu y vuelve a entrar.</p></div>
    <button class="btn ghost block" id="out">Salir</button></div>`;
  $("#out").onclick = () => sb.auth.signOut();
}

/* ---------- Datos ---------- */
function saveCache() { store.set("coach-cache", { rides: S.rides, weeks: S.weeks, plan: S.plan, profile: S.profile, strength: S.strength }); }
async function loadAll() {
  const uid = session.user.id;
  const [p, r, w, pl, st] = await Promise.all([
    sb.from("profiles").select("*").eq("id", uid).maybeSingle(),
    sb.from("rides").select("id,date,title,status,metrics,climbs,insights,plan,intervals_url,feedback,analysis").order("date", { ascending: false }).limit(120),
    sb.from("weeks").select("*").order("week_start", { ascending: true }),
    sb.from("plans").select("data,updated_at").maybeSingle(),
    sb.from("strength_sessions").select("*").order("date", { ascending: false }).limit(120),
  ]);
  if (p.error || r.error) throw p.error || r.error;
  S.profile = p.data; S.rides = r.data || []; S.weeks = {}; (w.data || []).forEach(x => (S.weeks[x.week_start] = x)); S.plan = pl.data?.data || null; S.strength = st.data || [];
  saveCache();
}
function subscribe() {
  if (channel) sb.removeChannel(channel);
  const uid = session.user.id;
  let t = null;
  const later = () => { clearTimeout(t); t = setTimeout(async () => { try { await loadAll(); render(); } catch {} }, 400); };
  channel = sb.channel("coach-" + uid)
    .on("postgres_changes", { event: "*", schema: "public", table: "rides", filter: "user_id=eq." + uid }, later)
    .on("postgres_changes", { event: "*", schema: "public", table: "weeks", filter: "user_id=eq." + uid }, later)
    .on("postgres_changes", { event: "*", schema: "public", table: "plans", filter: "user_id=eq." + uid }, later)
    .on("postgres_changes", { event: "*", schema: "public", table: "strength_sessions", filter: "user_id=eq." + uid }, later)
    .subscribe();
}
async function callFn(action, body) {
  const { data } = await sb.auth.getSession();
  const tok = data.session?.access_token;
  const r = await fetch(`${FN}?a=${action}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok, apikey: SUPA_KEY }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({ ok: false, error: "red" }));
  return j;
}

/* ---------- Lógica de semana ---------- */
function target() { return Object.assign({ load: 500, rides: 3, min_rides: 2, long_min_h: 2.5, long_min_kj: 1300, quality_if: 0.85, strength: 1 }, S.profile?.context?.week_target || {}); }
const LEG_ZONES = ["cuadriceps", "isquios", "gluteos", "gemelos", "aductores"];
const legsLevel = x => Math.max(0, ...LEG_ZONES.map(k => (x.zones || {})[k] || 0));
const isLong = r => { const m = r.metrics || {}, t = target(); return hrs(m.moving) >= t.long_min_h || (m.kj || 0) >= t.long_min_kj; };
const isHard = r => { const m = r.metrics || {}; return (m.if || 0) >= 0.82 || (m.load || 0) >= 150; };
const isQuality = r => { const m = r.metrics || {}; return (m.if || 0) >= target().quality_if && hrs(m.moving) >= 0.75; };
function weekState() {
  const t = target(), mon = monday(today()), key = iso(mon), end = new Date(mon); end.setDate(end.getDate() + 7);
  const inW = S.rides.filter(r => { const d = pd(r.date); return d >= mon && d < end; });
  const load = inW.reduce((a, r) => a + (r.metrics?.load || 0), 0), h = inW.reduce((a, r) => a + hrs(r.metrics?.moving), 0);
  const left = 6 - ((today().getDay() + 6) % 7);
  const strW = (S.strength || []).filter(x => { const d = pd(x.date); return d >= mon && d < end; });
  return { key, mon, inW, strW, load, h, pct: Math.round(load / t.load * 100), long: inW.some(isLong), quality: inW.some(isQuality), left, t };
}
function nextAdvice(w) {
  const s = [...S.rides].sort((a, b) => b.date.localeCompare(a.date)), last = s[0], prev = s[1], out = [];
  const recentLegs = (S.strength || []).find(x => Math.round((today() - pd(x.date)) / 864e5) <= 1 && legsLevel(x) >= 2);
  if (recentLegs) out.push({ warn: 1, t: `Trabajaste piernas en fuerza ${pd(recentLegs.date).getTime() === today().getTime() ? "hoy" : "ayer"}. Nada de series ni calidad en bici hasta pasado mañana: rodaje suave o descanso.` });
  if (!w.strW.length && w.left <= 3 && target().strength > 0) out.push({ t: "Esta semana aún no has hecho fuerza. Una sesión corta de piernas y core suma, lejos de tu día de calidad." });
  if (!last) return out;
  const since = Math.round((today() - pd(last.date)) / 864e5), tsb = last.metrics?.fitness?.tsb;
  const twoHard = prev && isHard(last) && isHard(prev) && Math.round((pd(last.date) - pd(prev.date)) / 864e5) <= 1;
  if (since <= 1 && twoHard) out.push({ warn: 1, t: "Llevas dos días seguidos con carga. Descansa hoy o rueda muy suave menos de 1 h 30." });
  else if (since <= 1 && isHard(last)) out.push({ warn: 1, t: `La última salida fue exigente (IF ${dec(last.metrics.if)}). Deja un día suave o de descanso antes de la siguiente dura.` });
  if (!w.long) out.push({ t: "Falta la tirada larga: guarda el primer hueco de 3 h o más para ella, suave y comiendo desde el minuto 30." });
  if (!w.quality && (tsb === undefined || tsb > -15) && !(since <= 1 && isHard(last))) out.push({ t: "Falta la sesión de calidad. Hazla un día que llegues fresco, nunca justo después de un día duro." });
  if (w.inW.length < w.t.min_rides) out.push({ t: `Mínimo viable: ${w.t.min_rides} salidas esta semana, aunque sean cortas. Llevas ${w.inW.length}.` });
  if (w.pct >= 100) out.push({ t: "Objetivo de carga cumplido. Lo que añadas, que sea suave." });
  else if (w.left === 0 && w.pct < 70) out.push({ t: "La semana se queda corta. No la compenses de golpe: la constancia rinde más." });
  if (tsb !== undefined && tsb <= -20) out.push({ warn: 1, t: `Tu forma está en ${tsb}: vas muy cargado. Prioriza descanso.` });
  return out;
}

/* ---------- Vistas ---------- */
function weekView() {
  const w = weekState(), t = w.t, adv = nextAdvice(w), coach = S.weeks[w.key]?.advice;
  const past = Object.keys(S.weeks).filter(k => k < w.key).sort().slice(-7).map(k => ({ k, load: S.weeks[k].load || 0 }));
  past.push({ k: w.key, load: w.load, cur: 1 });
  const mx = Math.max(t.load * 1.15, ...past.map(p => p.load)), e = new Date(w.mon); e.setDate(e.getDate() + 6);
  const pushCard = standalone && "PushManager" in window && Notification.permission === "default"
    ? `<section class="card"><h3>Activa los avisos</h3><p class="muted">Te aviso cuando sincronices una salida, para que me cuentes cómo fue.</p><button class="btn primary" id="push-on">Activar avisos</button></section>` : "";
  return `<header><p class="eyebrow">${w.mon.getDate()} ${MON[w.mon.getMonth()]} – ${e.getDate()} ${MON[e.getMonth()]}</p><h1>Tu semana</h1></header>
  ${pushCard}
  <section class="card">
    <div class="row between" style="align-items:baseline"><p><span class="num" style="font-size:44px">${w.pct} %</span> <span class="muted">del objetivo</span></p><p class="muted small">${nf(w.load)} / ${nf(t.load)} de carga</p></div>
    <div class="meter" role="img" aria-label="Carga ${w.pct} % del objetivo"><div style="width:${Math.min(100, w.pct)}%"></div></div>
    <p class="muted small">${fmtH(w.h)} · ${w.inW.length} salida${w.inW.length == 1 ? "" : "s"}${w.strW.length ? ` · ${w.strW.length} de fuerza` : ""} · quedan ${w.left} día${w.left == 1 ? "" : "s"}</p>
    <button class="btn" data-new-strength style="align-self:flex-start">${ICON.dumbbell} Añadir fuerza</button>
    <div class="checks">
      <div class="check ${w.inW.length >= t.rides ? "done" : ""}"><span class="d">${w.inW.length >= t.rides ? "✓" : ""}</span>${w.inW.length} de ${t.rides} salidas</div>
      <div class="check ${w.long ? "done" : ""}"><span class="d">${w.long ? "✓" : ""}</span>Tirada larga</div>
      <div class="check ${w.quality ? "done" : ""}"><span class="d">${w.quality ? "✓" : ""}</span>Calidad</div>
      <div class="check ${w.strW.length >= t.strength ? "done" : ""}"><span class="d">${w.strW.length >= t.strength ? "✓" : ""}</span>Fuerza${w.strW.length ? ` (${w.strW.length})` : ""}</div>
    </div>
  </section>
  <section class="card"><h3>Qué toca</h3>
    ${coach ? `<div class="advice"><p class="eyebrow">Del coach</p><p>${md(coach)}</p></div>` : ""}
    ${adv.map(a => `<div class="advice ${a.warn ? "warn" : ""}"><p>${md(a.t)}</p></div>`).join("") || `<p class="muted">Vas bien. Sigue con el plan.</p>`}
  </section>
  ${planCard(true)}
  <section class="card"><h3>Carga por semana</h3>
    <div class="weeks" role="img" aria-label="Carga de las últimas semanas frente al objetivo de ${t.load}">
      <div class="target" style="bottom:${t.load / mx * 96 + 18}px"></div>
      ${past.map(p => { const d = pd(p.k); return `<div class="wk ${p.cur ? "cur" : ""}"><span>${nf(p.load)}</span><div class="b" style="height:${Math.max(2, p.load / mx * 96)}px"></div><span>${d.getDate()}/${d.getMonth() + 1}</span></div>`; }).join("")}
    </div>
    <p class="legend"><span><i style="border-top:2px dashed var(--muted);height:0;width:14px;border-radius:0"></i>Objetivo ${nf(t.load)}</span></p>
  </section>`;
}
function planCard(compact) {
  const p = S.plan;
  if (!p || !p.tipo || pd(p.date) < today()) return compact ? "" : `<div class="empty">No hay sesión propuesta. Cuéntale al coach tu próxima salida y te la prepara.</div>`;
  const lab = k => { const s = k.replace(/_w$/, " (W)").replace(/_/g, " ").replace(/^if max$/, "IF máximo"); return s.charAt(0).toUpperCase() + s.slice(1); };
  const items = Object.entries(p.objetivos || {}).map(([k, v]) => `<li><strong>${esc(lab(k))}:</strong> ${esc(v)}</li>`).join("");
  const d = pd(p.date);
  return `<section class="card"><div class="row between"><h3>Próxima sesión</h3><span class="muted small">${DAYS[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}</span></div>
    <p><strong>${esc(p.tipo)}</strong>${p.duracion ? ` · ${esc(p.duracion)}` : ""}</p>
    ${!compact && p.texto ? `<p class="muted">${esc(p.texto)}</p>` : ""}${items && !compact ? `<ul class="ins">${items}</ul>` : ""}
    ${compact ? `<button class="link" style="color:var(--pine);text-align:left" data-tab="plan">Ver el detalle ›</button>` : ""}</section>`;
}
function ridesView() {
  const pend = S.rides.filter(r => r.status !== "analizada").length;
  const items = [...S.rides.map(r => ({ k: "r", d: r.date, x: r })), ...(S.strength || []).map(x => ({ k: "f", d: x.date, x }))].sort((a, b) => b.d.localeCompare(a.d) || (a.k === "f" ? 1 : -1));
  const row = it => {
    const d = pd(it.d), dt = `<div class="date"><b>${d.getDate()}</b><span>${MON[d.getMonth()]} · ${DAYS[d.getDay()]}</span></div>`;
    if (it.k === "f") { const x = it.x, z = topZones(x.zones); return `<button class="ride" data-strength="${esc(x.id)}">${dt}<div style="min-width:0"><p class="t">Fuerza · ${esc(x.kind)}</p><p class="m">${x.minutes} min · esfuerzo ${x.rpe}${z ? " · " + esc(z) : ""}</p></div><span class="pill str">Fuerza</span></button>`; }
    const r = it.x, m = r.metrics || {}, p = r.status !== "analizada";
    return `<button class="ride" data-ride="${esc(r.id)}">${dt}<div style="min-width:0"><p class="t">${esc(r.title || "Salida")}</p><p class="m">${m.km ?? "–"} km · ${m.elev_m ?? "–"} m · ${esc(m.moving || "")}</p></div><span class="pill ${p ? "pend" : "ok"}">${p ? "Pendiente" : "Analizada"}</span></button>`;
  };
  return `<header class="row between" style="align-items:flex-end"><div><p class="eyebrow">${pend ? pend + " pendiente" + (pend > 1 ? "s" : "") + " de feedback" : "Todo analizado"}</p><h1>Salidas</h1></div><button class="btn" data-new-strength>${ICON.dumbbell} Fuerza</button></header>
  ${items.length ? `<div class="list">${items.map(row).join("")}</div>` : `<div class="empty">Aún no hay salidas. Sincroniza una desde el Karoo y tira hacia abajo para buscarla.</div>`}`;
}
function planView() {
  return `<header><p class="eyebrow">Lo que te propone el coach</p><h1>Plan</h1></header>${planCard(false)}
  <section class="card"><h3>Objetivo semanal</h3><ul class="ins">
    <li>${nf(target().load)} de carga a la semana.</li><li>${target().rides} salidas (mínimo ${target().min_rides}).</li>
    <li>Una tirada larga: ${dec(target().long_min_h, 1)} h o ${nf(target().long_min_kj)} kJ.</li><li>Una sesión de calidad: IF de ${dec(target().quality_if)} o más.</li></ul>
    <p class="muted small">Si quieres cambiarlo, díselo al coach en tu próximo feedback.</p></section>`;
}

function climbsHTML(r) {
  const ca = r.metrics?.climbs_auto || []; if (!ca.length) return "";
  const cap = +(r.plan?.objetivos?.techo_subidas_w) || 0, mx = Math.max(220, ...ca.map(c => c.w));
  return `<section class="card"><h3>Subidas</h3>
  ${cap ? `<div class="legend"><span><i style="background:var(--pine)"></i>Dentro del plan</span><span><i style="background:var(--hot)"></i>Por encima</span><span><i style="border-left:2px dashed var(--muted);width:0;border-radius:0"></i>Techo ${cap} W</span></div>` : ""}
  <div class="bars">${ca.map((c, i) => `<div class="bar"><span>Subida ${i + 1}<small>${Math.round(c.min)} min · ${c.gain_m} m</small></span><div class="track"><div class="fill ${cap && c.w > cap + 1 ? "hot" : ""}" style="width:${c.w / mx * 100}%"></div>${cap ? `<div class="cap" style="left:${cap / mx * 100}%"></div>` : ""}</div><span class="v">${c.w} W</span></div>`).join("")}</div>
  <p class="small muted">Porcentaje de tu FTP: ${ca.map(c => c.pct_ftp + " %").join(" · ")}.</p></section>`;
}
function refHTML(r) {
  return (r.climbs || []).filter(c => c.median_time).map(c => `<section class="card"><h3>${esc(c.label)}</h3>
  <div class="cmp"><div class="me"><span>Hoy</span><b>${c.time}</b><span>${c.w ?? "–"} W · ${c.hr ?? "–"} ppm</span></div><div><span>Mediana</span><b>${c.median_time}</b><span>${c.median_w ?? "–"} W</span></div><div><span>Mejor</span><b>${c.best_time}</b><span>${c.rank} de ${c.of}</span></div></div>
  ${c.eff_vs_median_pct != null ? `<p class="small">Vatios por pulsación <strong>${c.eff_vs_median_pct > 0 ? "+" : ""}${dec(c.eff_vs_median_pct, 1)} %</strong> frente a tu mediana${c.w_halves ? ` · por mitades ${c.w_halves[0]} → ${c.w_halves[1]} W` : ""}.</p>` : ""}</section>`).join("");
}
function analysisHTML(r) {
  const a = r.analysis; if (!a) return "";
  return `<section class="card"><div class="row between"><h3>Lectura del coach</h3><span class="muted small">${a.at ? new Date(a.at).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : ""}</span></div>
  ${a.lectura ? `<p>${md(a.lectura)}</p>` : ""}
  ${a.conclusiones?.length ? `<ul class="ins">${a.conclusiones.map(c => `<li>${md(c)}</li>`).join("")}</ul>` : ""}
  ${a.bien ? `<div class="advice"><p class="eyebrow">Lo que hiciste bien</p><p>${md(a.bien)}</p></div>` : ""}
  ${a.proximo ? `<div class="advice"><p class="eyebrow">Próximo hueco</p><p><strong>${esc(a.proximo.tipo || "")}</strong>${a.proximo.duracion ? ` · ${esc(a.proximo.duracion)}` : ""}${a.proximo.cuando ? ` · ${esc(a.proximo.cuando)}` : ""}</p>${a.proximo.objetivos ? `<p class="muted small">${esc(a.proximo.objetivos)}</p>` : ""}</div>` : ""}
  ${a.semana ? `<div class="advice"><p class="eyebrow">Resto de la semana</p><p>${md(a.semana)}</p></div>` : ""}
  ${r.feedback?.text ? `<p class="small muted"><strong>Lo que contaste:</strong> ${esc(r.feedback.text)}</p>` : ""}</section>`;
}
function feedbackHTML(r) {
  const pend = r.status !== "analizada";
  const qs = ["¿Solo o en grupo? Si fue en grupo, ¿quién marcó el ritmo?", "Piernas y cabeza de 1 a 5, y esfuerzo de 1 a 10.", "¿Algo fuera de lo normal? Catarro, dolor, mal sueño, estrés, poca comida, calor."];
  if (r.plan?.tipo && r.plan.date === r.date) qs.push(`¿Pudiste hacer lo planeado (${r.plan.tipo})?`);
  const canSpeak = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
  return `<section class="card" id="fb"><h3>${pend ? "Cuéntame qué tal" : "Añadir algo más"}</h3>
  ${pend ? `<div class="q">${qs.map(q => `<span>· ${esc(q)}</span>`).join("")}</div>` : ""}
  <textarea id="fb-text" placeholder="Ej.: con David a nuestro ritmo, piernas 4, cabeza 4, esfuerzo 6. Comí cada media hora." enterkeyhint="send"></textarea>
  <div class="row">${canSpeak ? `<button class="btn" id="mic" type="button">${ICON.mic} Dictar</button>` : ""}<button class="btn primary" id="send" type="button" style="flex:1">${pend ? "Enviar y analizar" : "Reanalizar"}</button></div>
  ${canSpeak ? "" : `<p class="small muted">Para dictar, usa el micrófono del teclado.</p>`}
  <p class="ferr" id="ferr" role="alert"></p><div id="live" aria-live="polite"></div></section>`;
}
function detailView(r) {
  const m = r.metrics || {}, d = pd(r.date), pend = r.status !== "analizada", p = r.plan && r.plan.date === r.date ? r.plan : null;
  const ifOver = p?.objetivos?.if_max && m.if > p.objetivos.if_max;
  const others = (r.insights || []).filter(x => !(r.climbs || []).some(c => x.includes(c.climb))).filter(x => !(m.pacing_meaningful === false && x.startsWith("**Resistencia")));
  const q = m.quarters_np || [], qmx = Math.max(...q, 200);
  return `<header style="display:flex;flex-direction:column;gap:6px"><p class="eyebrow">${DAYS[d.getDay()]} ${d.getDate()} de ${MON[d.getMonth()]} · ${m.discipline === "mtb" ? "MTB" : "Carretera"}</p>
    <h1>${esc(r.title || "Salida")}</h1><div class="row"><span class="pill ${pend ? "pend" : "ok"}">${pend ? "Pendiente de feedback" : "Analizada"}</span>${p ? `<span class="muted small">Plan: ${esc(p.tipo)}</span>` : ""}</div></header>
  <div class="stats">
    <div class="stat"><b>${m.km ?? "–"} km</b><span>distancia</span></div><div class="stat"><b>${m.elev_m ?? "–"} m</b><span>desnivel</span></div>
    <div class="stat"><b>${esc(m.moving || "–")}</b><span>en movimiento</span></div><div class="stat"><b style="${ifOver ? "color:var(--hot)" : ""}">${m.if != null ? dec(m.if) : "–"}</b><span>IF${p?.objetivos?.if_max ? ` · plan ≤ ${dec(p.objetivos.if_max)}` : ""}</span></div>
    <div class="stat"><b>${m.np_w ?? "–"} W</b><span>potencia normalizada</span></div><div class="stat"><b>${m.load ?? "–"}</b><span>carga</span></div>
    <div class="stat"><b>${m.avg_hr ?? "–"}</b><span>ppm de media · máx ${m.max_hr ?? "–"}</span></div><div class="stat"><b>${m.kj ? nf(m.kj) : "–"}</b><span>kJ de trabajo</span></div>
  </div>
  ${m.fitness ? `<p class="small muted">Tras la salida: fitness ${m.fitness.ctl}, fatiga ${m.fitness.atl}, forma ${m.fitness.tsb}.</p>` : ""}
  ${pend ? feedbackHTML(r) : analysisHTML(r)}
  ${climbsHTML(r)}${refHTML(r)}
  ${others.length ? `<section class="card"><h3>Lo que ve el robot</h3><ul class="ins">${others.map(x => `<li>${md(x)}</li>`).join("")}</ul></section>` : ""}
  ${q.length ? `<section class="card"><h3>Ritmo por cuartos</h3><div class="bars">${q.map((v, i) => `<div class="bar"><span>${i + 1}.º cuarto</span><div class="track"><div class="fill" style="width:${v / qmx * 100}%"></div></div><span class="v">${v} W</span></div>`).join("")}</div><p class="small muted">Potencia normalizada.${m.pacing_meaningful === false ? " El último cuarto incluye la vuelta o la bajada." : ""}</p></section>` : ""}
  ${!pend ? feedbackHTML(r) : ""}
  ${r.intervals_url ? `<p class="small"><a href="${esc(r.intervals_url)}" target="_blank" rel="noopener">Ver en intervals.icu ›</a></p>` : ""}`;
}
function settingsView() {
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  return `<header><h1>Ajustes</h1></header>
  <section class="card settings">
    <div class="rowi"><span>Cuenta</span><span class="muted small">${esc(session.user.email)}</span></div>
    <div class="rowi"><span>Avisos tras cada salida</span>${perm === "unsupported" || !standalone ? `<span class="muted small">${standalone ? "No disponibles" : "Instala la app para activarlos"}</span>` : `<button class="switch ${perm === "granted" && store.get("coach-push", 0) ? "on" : ""}" id="push-toggle" aria-label="Avisos"></button>`}</div>
    <div class="rowi"><span>Versión</span><span class="muted small">${VERSION}</span></div>
  </section>
  <button class="btn block" id="logout" style="color:var(--hot)">Cerrar sesión</button>`;
}

/* ---------- Shell, navegación y gestos ---------- */
function shell() {
  root.innerHTML = `<div class="app">
    <div class="topbar" id="topbar"><span style="width:44px"></span><span class="t" id="tt"></span><button class="iconbtn" id="me" aria-label="Ajustes"><span class="avatar">${esc((S.profile?.name || session.user.email || "?")[0].toUpperCase())}</span></button></div>
    <div class="ptr" id="ptr"><div class="spin">${ICON.refresh}</div></div>
    <main class="scroll" id="scroll"><div class="content" id="content"></div></main>
    <nav class="tabbar" id="tabbar">
      <button class="tab" data-tab="semana">${ICON.semana}<span>Semana</span></button>
      <button class="tab" data-tab="salidas">${ICON.salidas}<span>Salidas</span><span class="dot" id="badge" hidden></span></button>
      <button class="tab" data-tab="plan">${ICON.plan}<span>Plan</span></button>
    </nav>
    <div class="sheet" id="sheet"><div class="topbar scrolled"><button class="back" id="back">${ICON.chev}<span id="back-l">Salidas</span></button><span class="t" id="st"></span><span style="width:44px"></span></div><main class="scroll" id="sscroll"><div class="content" id="scontent"></div></main></div>
    <div class="toast" id="toast"></div>
  </div>`;
  $("#tabbar").onclick = e => { const b = e.target.closest("[data-tab]"); if (b) { if (tab === b.dataset.tab) $("#scroll").scrollTo({ top: 0, behavior: "smooth" }); go(b.dataset.tab); } };
  $("#me").onclick = () => openSheet("ajustes");
  $("#back").onclick = () => history.back();
  const sc = $("#scroll");
  sc.addEventListener("scroll", () => $("#topbar").classList.toggle("scrolled", sc.scrollTop > 30), { passive: true });
  $("#sscroll").addEventListener("scroll", () => {}, { passive: true });
  $("#content").onclick = onContentClick;
  $("#scontent").onclick = onContentClick;
  pullToRefresh(sc);
  edgeSwipe($("#sheet"));
}
function onContentClick(e) {
  const r = e.target.closest("[data-ride]"); if (r) { openSheet("r-" + r.dataset.ride); return; }
  const f = e.target.closest("[data-strength]"); if (f) { openSheet("f-" + f.dataset.strength); return; }
  if (e.target.closest("[data-new-strength]")) { openSheet("fuerza"); return; }
  const t = e.target.closest("[data-tab]"); if (t) { go(t.dataset.tab); return; }
  if (e.target.closest("#push-on")) enablePush();
}
function go(t) { tab = t; store.set("coach-tab", t); render(); $("#scroll").scrollTop = 0; }
function openSheet(id) { if (location.hash !== "#" + id) history.pushState({ s: id }, "", "#" + id); renderSheet(); }
window.addEventListener("popstate", renderSheet);
function renderSheet() {
  const sh = $("#sheet"); if (!sh) return;
  const h = location.hash.slice(1);
  if (!h) { sh.classList.remove("on"); return; }
  const sc = $("#scontent");
  if (h === "ajustes") {
    $("#st").textContent = "Ajustes"; $("#back-l").textContent = "Volver"; sc.innerHTML = settingsView();
    $("#logout").onclick = async () => { await sb.auth.signOut(); };
    const tg = $("#push-toggle"); if (tg) tg.onclick = async () => { if (tg.classList.contains("on")) { await disablePush(); tg.classList.remove("on"); } else if (await enablePush()) tg.classList.add("on"); };
  } else if (h === "fuerza" || h.startsWith("f-")) {
    if (sc.dataset.id === h && sh.classList.contains("on")) return; // no pisar el formulario abierto
    const x = h === "fuerza" ? null : (S.strength || []).find(y => y.id === h.slice(2));
    $("#st").textContent = x ? "Editar fuerza" : "Nueva sesión de fuerza"; $("#back-l").textContent = "Volver"; sc.dataset.id = h;
    sc.innerHTML = strengthForm(x); wireStrength(x);
  } else if (h.startsWith("r-")) {
    const r = S.rides.find(x => x.id === h.slice(2));
    if (!r) { sc.innerHTML = `<div class="empty">Esta salida aún no está aquí. Tira hacia abajo en Salidas para buscarla.</div>`; }
    else {
      const ae = document.activeElement; if (ae && ae.id === "fb-text" && sh.classList.contains("on") && sc.dataset.id === r.id && !wireFeedback.busy) return;
      $("#st").textContent = r.title || "Salida"; $("#back-l").textContent = "Salidas"; sc.dataset.id = r.id; sc.innerHTML = detailView(r); wireFeedback(r);
    }
  }
  if (!sh.classList.contains("on")) { $("#sscroll").scrollTop = 0; requestAnimationFrame(() => sh.classList.add("on")); }
}
function render() {
  if (!$("#content")) return;
  const views = { semana: weekView, salidas: ridesView, plan: planView };
  $("#content").innerHTML = (views[tab] || weekView)();
  $("#tt").textContent = { semana: "Tu semana", salidas: "Salidas", plan: "Plan" }[tab];
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  const pend = S.rides.filter(r => r.status !== "analizada").length, bd = $("#badge");
  bd.hidden = !pend; bd.textContent = pend;
  if ("setAppBadge" in navigator) { try { pend ? navigator.setAppBadge(pend) : navigator.clearAppBadge(); } catch {} }
  if (location.hash) renderSheet();
}
let toastT;
function toast(msg) { const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }

function pullToRefresh(sc) {
  const ptr = $("#ptr"), spin = ptr.firstElementChild; let y0 = null, dy = 0, busy = false;
  sc.addEventListener("touchstart", e => { if (sc.scrollTop <= 0 && !busy) { y0 = e.touches[0].clientY; dy = 0; } else y0 = null; }, { passive: true });
  sc.addEventListener("touchmove", e => {
    if (y0 === null) return; dy = e.touches[0].clientY - y0; if (dy <= 0) { spin.style.opacity = 0; return; }
    const p = Math.min(1, dy / 90), off = Math.min(80, dy * 0.5);
    spin.style.transition = "none"; spin.style.opacity = p; spin.style.transform = `translateY(${off - 40 + 12}px) rotate(${dy * 2}deg)`;
    sc.style.transform = `translateY(${Math.min(60, dy * 0.35)}px)`;
  }, { passive: true });
  sc.addEventListener("touchend", async () => {
    if (y0 === null) return; y0 = null; sc.style.transition = "transform .25s"; spin.style.transition = "transform .25s, opacity .25s";
    if (dy > 90 && !busy) {
      busy = true; ptr.classList.add("busy"); spin.style.transform = "translateY(26px)"; sc.style.transform = "translateY(44px)";
      await refresh(); busy = false; ptr.classList.remove("busy");
    }
    sc.style.transform = ""; spin.style.opacity = 0; spin.style.transform = "translateY(-40px)"; setTimeout(() => (sc.style.transition = ""), 260);
  });
}
async function refresh() {
  toast("Buscando salidas nuevas…");
  const before = new Set(S.rides.map(r => r.id));
  const res = await callFn("refresh");
  try { await loadAll(); render(); } catch {}
  const nuevas = S.rides.filter(r => !before.has(r.id)).length;
  if (!res.ok && res.error === "no_autorizado") toast("Tu cuenta aún no está activada.");
  else if (nuevas) toast(nuevas === 1 ? "Una salida nueva" : `${nuevas} salidas nuevas`);
  else if (!res.ok) toast("No he podido buscar ahora. Prueba en un rato.");
  else if (res.reciente) toast("Ya lo estoy buscando: vuelve a tirar en un minuto.");
  else toast("Todo al día");
}
function edgeSwipe(sh) {
  let x0 = null, dx = 0;
  sh.addEventListener("touchstart", e => { const x = e.touches[0].clientX; if (x < 28) { x0 = x; dx = 0; sh.classList.add("drag"); } }, { passive: true });
  sh.addEventListener("touchmove", e => { if (x0 === null) return; dx = Math.max(0, e.touches[0].clientX - x0); sh.style.transform = `translateX(${dx}px)`; }, { passive: true });
  sh.addEventListener("touchend", () => { if (x0 === null) return; x0 = null; sh.classList.remove("drag"); sh.style.transform = ""; if (dx > 90) history.back(); });
}

/* ---------- Fuerza: maniquí y formulario ---------- */
const ZONES = { hombros: "Hombros", pecho: "Pecho", biceps: "Bíceps", triceps: "Tríceps", antebrazos: "Antebrazos", abdomen: "Abdomen", oblicuos: "Oblicuos", trapecio: "Trapecio", espalda: "Espalda", lumbares: "Lumbares", gluteos: "Glúteos", cuadriceps: "Cuádriceps", isquios: "Isquios", aductores: "Aductores", gemelos: "Gemelos" };
const LEVELS = ["Sin trabajar", "Ligero", "Medio", "A tope"];
const PRESETS = {
  "Piernas": { cuadriceps: 3, gluteos: 3, isquios: 2, gemelos: 2, aductores: 1 },
  "Core": { abdomen: 3, oblicuos: 2, lumbares: 2 },
  "Tren superior": { pecho: 2, espalda: 2, hombros: 2, biceps: 2, triceps: 2, trapecio: 1 },
  "Completo": { cuadriceps: 2, gluteos: 2, isquios: 2, gemelos: 1, abdomen: 2, oblicuos: 1, lumbares: 1, pecho: 2, espalda: 2, hombros: 2, biceps: 1, triceps: 1 },
};
const KINDS = ["Sístole", "Gimnasio", "Core", "Movilidad", "Otro"];
function topZones(z) { return Object.entries(z || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => ZONES[k].toLowerCase()).join(", "); }
const E = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
const R = (x, y, w, h, r) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
const BASE = `<circle cx="100" cy="36" r="21"/>${R(91, 54, 18, 18, 6)}${R(64, 72, 72, 140, 26)}${R(70, 192, 60, 44, 16)}${R(34, 80, 24, 72, 12)}${R(142, 80, 24, 72, 12)}${R(29, 148, 20, 74, 10)}${R(151, 148, 20, 74, 10)}<circle cx="39" cy="230" r="9"/><circle cx="161" cy="230" r="9"/>${R(68, 226, 31, 104, 14)}${R(101, 226, 31, 104, 14)}${R(70, 324, 25, 82, 11)}${R(105, 324, 25, 82, 11)}${E(82, 412, 14, 7)}${E(118, 412, 14, 7)}`;
const FRONT = {
  hombros: E(52, 90, 16, 13) + E(148, 90, 16, 13), pecho: E(86, 102, 17, 16) + E(114, 102, 17, 16),
  biceps: E(46, 124, 10, 22) + E(154, 124, 10, 22), antebrazos: E(39, 184, 9, 26) + E(161, 184, 9, 26),
  abdomen: R(89, 122, 22, 66, 8), oblicuos: E(76, 158, 8, 24) + E(124, 158, 8, 24),
  aductores: E(95, 248, 5, 20) + E(105, 248, 5, 20), cuadriceps: E(82, 272, 13, 40) + E(118, 272, 13, 40),
  gemelos: E(82, 356, 9, 26) + E(118, 356, 9, 26),
};
const BACK = {
  trapecio: `<polygon points="82,70 118,70 126,90 100,112 74,90"/>`, hombros: E(52, 90, 16, 13) + E(148, 90, 16, 13),
  espalda: E(82, 132, 16, 30) + E(118, 132, 16, 30), triceps: E(46, 124, 10, 22) + E(154, 124, 10, 22),
  antebrazos: E(39, 184, 9, 26) + E(161, 184, 9, 26), lumbares: R(88, 162, 24, 32, 8),
  gluteos: E(85, 214, 16, 17) + E(115, 214, 16, 17), isquios: E(84, 274, 13, 38) + E(116, 274, 13, 38),
  gemelos: E(82, 352, 11, 28) + E(118, 352, 11, 28),
};
function bodySvg(view, zones, label) {
  const map = view === "front" ? FRONT : BACK;
  return `<figure class="body"><svg viewBox="0 0 200 424" role="group" aria-label="${label}"><g class="base">${BASE}</g>${Object.entries(map).map(([k, shp]) =>
    `<g class="zone l${zones[k] || 0}" data-z="${k}" role="button" tabindex="0" aria-label="${ZONES[k]}: ${LEVELS[zones[k] || 0]}">${shp}</g>`).join("")}</svg><figcaption>${label}</figcaption></figure>`;
}
let FS = null;
function strengthForm(x) {
  const t = iso(today()), y = (() => { const d = today(); d.setDate(d.getDate() - 1); return iso(d); })();
  FS = x ? { id: x.id, date: x.date, kind: x.kind, minutes: x.minutes, rpe: x.rpe, zones: { ...(x.zones || {}) }, note: x.note || "" }
         : { date: t, kind: "Sístole", minutes: 60, rpe: 6, zones: {}, note: "" };
  const chip = (grp, v, on, lab) => `<button type="button" class="chip ${on ? "on" : ""}" data-${grp}="${esc(v)}">${esc(lab ?? v)}</button>`;
  return `<header><p class="eyebrow">Fuerza</p><h1>${x ? "Editar sesión" : "¿Qué has trabajado?"}</h1></header>
  <section class="card"><h3>Toca las zonas</h3><p class="muted small">Cada toque sube un nivel: ligero, medio, a tope y vuelta a cero.</p>
    <div class="bodies" id="bodies">${bodies()}</div>
    <div class="legend lv"><span><i class="l1"></i>Ligero</span><span><i class="l2"></i>Medio</span><span><i class="l3"></i>A tope</span></div>
    <div class="chips">${Object.keys(PRESETS).map(k => chip("preset", k, false)).join("")}<button type="button" class="chip ghost" data-preset="">Borrar</button></div>
    <p class="small" id="zsum"></p>
  </section>
  <section class="card">
    <div class="field"><span class="lab">Día</span><div class="chips">${chip("date", t, FS.date === t, "Hoy")}${chip("date", y, FS.date === y, "Ayer")}<input type="date" id="f-date" value="${FS.date}" max="${t}" aria-label="Otro día"></div></div>
    <div class="field"><span class="lab">Tipo</span><div class="chips">${KINDS.map(k => chip("kind", k, FS.kind === k)).join("")}</div></div>
    <div class="field"><span class="lab">Duración</span><div class="chips">${[30, 45, 60, 75, 90].map(m => chip("min", m, FS.minutes === m, m + " min")).join("")}<input type="number" id="f-min" inputmode="numeric" min="5" max="300" value="${FS.minutes}" aria-label="Minutos"></div></div>
    <div class="field"><span class="lab">Esfuerzo <strong id="rpe-v">${FS.rpe}</strong>/10</span><input type="range" id="f-rpe" min="1" max="10" step="1" value="${FS.rpe}"><div class="row between small muted"><span>Suave</span><span>Al límite</span></div></div>
    <div class="field"><label class="lab" for="f-note">Nota (opcional)</label><textarea id="f-note" style="min-height:70px" placeholder="Ej.: sentadilla búlgara y peso muerto; molestia leve en el hombro.">${esc(FS.note)}</textarea></div>
    <p class="ferr" id="f-err" role="alert"></p>
    <button class="btn primary block" id="f-save">${x ? "Guardar cambios" : "Guardar sesión"}</button>
    ${x ? `<button class="btn block" id="f-del" style="color:var(--hot)">Eliminar sesión</button>` : ""}
  </section>`;
}
function bodies() { return bodySvg("front", FS.zones, "Frente") + bodySvg("back", FS.zones, "Espalda"); }
function wireStrength(x) {
  const sc = $("#scontent"), err = $("#f-err");
  const refresh = () => { $("#bodies").innerHTML = bodies(); const z = Object.entries(FS.zones).filter(([, v]) => v).sort((a, b) => b[1] - a[1]); $("#zsum").innerHTML = z.length ? z.map(([k, v]) => `<span class="tagz l${v}">${ZONES[k]}</span>`).join(" ") : `<span class="muted">Sin zonas marcadas.</span>`; };
  const setChip = (grp, v) => sc.querySelectorAll(`[data-${grp}]`).forEach(b => b.classList.toggle("on", b.dataset[grp] === String(v)));
  refresh();
  const tap = g => { const k = g.dataset.z; FS.zones[k] = ((FS.zones[k] || 0) + 1) % 4; if (!FS.zones[k]) delete FS.zones[k]; refresh(); };
  $("#bodies").onclick = e => { const g = e.target.closest("[data-z]"); if (g) tap(g); };
  $("#bodies").onkeydown = e => { const g = e.target.closest("[data-z]"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); tap(g); } };
  sc.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => { FS.zones = b.dataset.preset ? { ...FS.zones, ...PRESETS[b.dataset.preset] } : {}; refresh(); });
  sc.querySelectorAll("[data-date]").forEach(b => b.onclick = () => { FS.date = b.dataset.date; $("#f-date").value = FS.date; setChip("date", FS.date); });
  $("#f-date").onchange = e => { FS.date = e.target.value; setChip("date", FS.date); };
  sc.querySelectorAll("[data-kind]").forEach(b => b.onclick = () => { FS.kind = b.dataset.kind; setChip("kind", FS.kind); });
  sc.querySelectorAll("[data-min]").forEach(b => b.onclick = () => { FS.minutes = +b.dataset.min; $("#f-min").value = FS.minutes; setChip("min", FS.minutes); });
  $("#f-min").oninput = e => { FS.minutes = Math.round(+e.target.value || 0); setChip("min", FS.minutes); err.textContent = ""; };
  $("#f-rpe").oninput = e => { FS.rpe = +e.target.value; $("#rpe-v").textContent = FS.rpe; };
  $("#f-note").oninput = e => { FS.note = e.target.value; };
  $("#f-save").onclick = async () => {
    if (!(FS.minutes >= 5 && FS.minutes <= 300)) { err.textContent = "La duración tiene que estar entre 5 y 300 minutos."; $("#f-min").focus(); return; }
    if (!FS.date || FS.date > iso(today())) { err.textContent = "Elige un día de hoy hacia atrás."; return; }
    const btn = $("#f-save"); btn.disabled = true; btn.textContent = "Guardando…";
    const res = await callFn("strength", FS);
    btn.disabled = false; btn.textContent = x ? "Guardar cambios" : "Guardar sesión";
    if (!res.ok) { err.textContent = res.error === "red" ? "Sin conexión. Inténtalo en un momento." : "No se pudo guardar. Revisa los datos e inténtalo otra vez."; return; }
    try { await loadAll(); } catch {}
    toast(res.intervals ? "Guardada y enviada a intervals.icu" : "Sesión guardada");
    $("#scontent").dataset.id = ""; history.back(); render();
  };
  const del = $("#f-del");
  if (del) del.onclick = async () => {
    if (!del.dataset.confirm) { del.dataset.confirm = "1"; del.textContent = "Toca otra vez para eliminarla"; setTimeout(() => { if (del.isConnected) { delete del.dataset.confirm; del.textContent = "Eliminar sesión"; } }, 4000); return; }
    del.disabled = true;
    const res = await callFn("strength_delete", { id: x.id });
    if (!res.ok) { del.disabled = false; err.textContent = "No se pudo eliminar. Inténtalo otra vez."; return; }
    S.strength = (S.strength || []).filter(y => y.id !== x.id); saveCache();
    toast("Sesión eliminada"); $("#scontent").dataset.id = ""; history.back(); render();
  };
}

/* ---------- Feedback y análisis ---------- */
function wireFeedback(r) {
  const ta = $("#fb-text"), send = $("#send"), mic = $("#mic"), err = $("#ferr"), live = $("#live");
  if (!ta) return;
  ta.value = store.get("coach-draft-" + r.id, "");
  ta.oninput = () => { err.textContent = ""; store.set("coach-draft-" + r.id, ta.value); };
  let rec = null, recDone = null;
  const stopRec = () => new Promise(res => { if (!rec) return res(); recDone = res; try { rec.stop(); } catch { rec = null; res(); } setTimeout(() => { if (rec) { try { rec.abort(); } catch {} rec = null; } res(); }, 1500); });
  if (mic) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; let base = "";
    const idle = () => { mic.innerHTML = `${ICON.mic} Dictar`; mic.classList.remove("primary"); };
    mic.onclick = () => {
      if (rec) { stopRec(); return; }
      rec = new SR(); rec.lang = "es-ES"; rec.interimResults = true; rec.continuous = true; base = ta.value ? ta.value.trim() + " " : "";
      let started = false;
      rec.onstart = () => { started = true; mic.innerHTML = "■ Parar dictado"; mic.classList.add("primary"); };
      rec.onresult = e => { let s = ""; for (const x of e.results) s += x[0].transcript; ta.value = base + s; store.set("coach-draft-" + r.id, ta.value); };
      rec.onend = () => { rec = null; idle(); if (recDone) { const d = recDone; recDone = null; d(); } };
      rec.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") err.textContent = "Sin permiso de micrófono. Usa el micrófono del teclado o actívalo en Ajustes del iPhone."; else if (e.error !== "aborted" && e.error !== "no-speech") err.textContent = "No se pudo dictar. Usa el micrófono del teclado."; };
      mic.innerHTML = "Activando micrófono…";
      try { rec.start(); } catch { rec = null; idle(); return; }
      setTimeout(() => { if (rec && !started) { try { rec.abort(); } catch {} rec = null; idle(); err.textContent = "El micrófono no respondió. Vuelve a pulsar Dictar o usa el micrófono del teclado."; } }, 8000);
    };
  }
  send.onclick = async () => {
    await stopRec();
    const text = ta.value.trim();
    if (text.length < 5) { err.textContent = "Cuéntale algo al coach antes de enviar."; ta.focus(); return; }
    ta.blur(); send.disabled = true; wireFeedback.busy = true;
    live.innerHTML = `<div class="thinking"><i></i><i></i><i></i><span>El coach está leyendo tu salida…</span></div>`;
    const res = await callFn("analyze", { ride_id: r.id, text });
    wireFeedback.busy = false; send.disabled = false;
    if (!res.ok) {
      live.innerHTML = "";
      err.textContent = { falta_clave: "El análisis aún no está configurado. Avisa a Manu.", no_autorizado: "Tu cuenta aún no está activada.", red: "Sin conexión. Tu texto sigue guardado; inténtalo en un momento." }[res.error] || `No se pudo analizar ahora (${res.error || "error"}). Tu texto sigue guardado; inténtalo otra vez.`;
      return;
    }
    store.del("coach-draft-" + r.id);
    const i = S.rides.findIndex(x => x.id === r.id);
    if (i >= 0) S.rides[i] = Object.assign({}, S.rides[i], { status: "analizada", analysis: res.analysis, feedback: { text } });
    try { await loadAll(); } catch {}
    render(); renderSheet(); $("#sscroll").scrollTo({ top: 0, behavior: "smooth" });
  };
}

/* ---------- Avisos ---------- */
const b64u = s => { const p = "=".repeat((4 - (s.length % 4)) % 4); const b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function enablePush() {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { toast("Avisos no permitidos. Puedes activarlos en Ajustes del iPhone."); render(); return false; }
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(VAPID) }));
    const j = sub.toJSON();
    const { error } = await sb.from("push_subscriptions").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_id: session.user.id });
    if (error) throw error;
    store.set("coach-push", 1); toast("Avisos activados"); render(); return true;
  } catch (e) { toast("No se pudieron activar los avisos."); return false; }
}
async function disablePush() {
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) { await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); } } catch {}
  store.set("coach-push", 0); toast("Avisos desactivados");
}

/* ---------- Arranque ---------- */
async function enter() {
  if (S.profile && S.profile.id !== session.user.id) { S.rides = []; S.weeks = {}; S.plan = null; S.profile = null; }
  shell(); render();
  try { await loadAll(); } catch { toast("Sin conexión: te muestro lo último guardado."); }
  if (S.profile && !S.profile.enabled) { showNoAccess(); return; }
  render(); subscribe();
}
let entered = false;
sb.auth.onAuthStateChange((ev, s) => {
  session = s;
  if (s && !entered) { entered = true; enter(); }
  if (!s && ev === "SIGNED_OUT") { entered = false; store.del("coach-cache"); S.rides = []; S.weeks = {}; S.plan = null; S.profile = null; if (channel) sb.removeChannel(channel); showLogin(); }
});
(async () => {
  if ("serviceWorker" in navigator) { const had = !!navigator.serviceWorker.controller; navigator.serviceWorker.register("sw.js").catch(() => {}); let reloaded = false; navigator.serviceWorker.addEventListener("controllerchange", () => { if (had && !reloaded) { reloaded = true; location.reload(); } }); }
  navigator.serviceWorker?.addEventListener("message", e => { if (e.data?.type === "open" && e.data.url) { const h = new URL(e.data.url, location.href).hash; if (h) { history.pushState({}, "", h); renderSheet(); } } });
  const { data } = await sb.auth.getSession();
  session = data.session;
  if (session) { if (!entered) { entered = true; enter(); } return; }
  if (isIOS && !standalone && !store.get("coach-skip-install", 0)) showInstall(); else showLogin();
})();
document.addEventListener("visibilitychange", async () => { if (document.visibilityState === "visible" && session) { try { await loadAll(); render(); } catch {} } });
})();
