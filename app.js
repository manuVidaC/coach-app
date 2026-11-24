/* Coach Tikismikis — app web instalable. Datos en Supabase; análisis y sincronización en la función "coach". */
(() => {
const SUPA_URL = "https://iglbakcgsahqmoepkoyc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbGJha2Nnc2FocW1vZXBrb3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5Mjc0NzAsImV4cCI6MjExMDUwMzQ3MH0.XENiPTNHvEWkva0agvbGRHrbmGGKt40dEQ8ZTgNMWz4";
const VAPID = "BJJQBXNoM0RiUnLaiZx4BxfKxSCGfNpkIIH_PTa-48WnvwrwTADD_mzZ1dJOuUkXvBCDKbndtNUaIZKFNEfvPDA";
const FN = SUPA_URL + "/functions/v1/coach";
const VERSION = "1.7.5";

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
  salidas: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="16.5" r="3.6"/><circle cx="19" cy="16.5" r="3.6"/><path d="M5 16.5L8.6 9h7.6L19 16.5"/><path d="M8.6 9l3.6 7.5 4-7.5"/><path d="M7 6h3.4M16.2 9l-1-3.2h2.6"/><circle cx="12.2" cy="16.5" r=".9" fill="currentColor"/></svg>',
  trophy: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10.5M17 6h2.5v1.5a3 3 0 0 1-3 3"/><path d="M12 14v3.5M8.5 20.5h7M9.5 20.5l.8-3h3.4l.8 3"/></svg>',
  grupeta: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.4.2 4 1.7 4.5 4.4"/></svg>',
  plan: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 14l2 2 4-4"/></svg>',
  share: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.3 15.4A8 8 0 1 1 18 6.7"/><path d="M19.6 3.4v4.9h-4.9"/></svg>',
  chev: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  dumbbell: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/></svg>',
  mic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
};

/* ---------- Puerta: instalación y acceso ---------- */

/* ---------- Fondo de entrada con la foto del club ----------
   La primera vez: foto con escudo y lema; el lema se desvanece, el escudo sube y se hace pequeño,
   la cámara se acerca a la grupeta y aparece el contenido. Las siguientes veces, directamente el final. */
const HERO = { ar: 1100 / 2311, logo: { x: 372 / 1193, y: 175 / 2506, w: 450 / 1193 }, riders: 0.718, zoom: 1.35 };
function heroHTML() {
  return `<div class="hero-bg" id="hero" aria-hidden="true"><img class="hb-img" id="hb-clean" src="img/bg.jpg" alt=""><img class="hb-img" id="hb-full" src="img/splash.jpg" alt=""><div class="hb-shade" id="hb-shade"></div><img class="hb-logo" id="hb-logo" src="img/shield.png" alt=""></div>`;
}
function heroGeom() {
  const vw = innerWidth, vh = innerHeight, Hd = Math.max(vh, vw / HERO.ar), Wd = Hd * HERO.ar, left = (vw - Wd) / 2, top = (vh - Hd) / 2;
  const s = HERO.zoom, ty = Math.min(0, vh * 0.34 - top - s * HERO.riders * Hd);
  const lw = Math.min(96, vw * 0.24), st = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--st")) || 0;
  return { Wd, Hd, left, top, end: `translateY(${ty}px) scale(${s})`,
    logoStart: { l: left + HERO.logo.x * Wd, t: top + HERO.logo.y * Hd, w: HERO.logo.w * Wd },
    logoEnd: { l: (vw - lw) / 2, t: Math.max(st, 20) + 18, w: lw } };
}
function heroPlace(g, final) {
  for (const id of ["hb-clean", "hb-full"]) Object.assign($("#" + id).style, { width: g.Wd + "px", height: g.Hd + "px", left: g.left + "px", top: g.top + "px", transform: final ? g.end : "none" });
  const L = final ? g.logoEnd : g.logoStart;
  Object.assign($("#hb-logo").style, { left: L.l + "px", top: L.t + "px", width: L.w + "px" });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function heroRun(content) {
  const g = heroGeom(), full = $("#hb-full"), logo = $("#hb-logo"), shade = $("#hb-shade");
  const first = !store.get("coach-splash", 0) && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const end = () => { heroPlace(heroGeom(), true); full.style.opacity = 0; logo.style.opacity = 1; shade.style.opacity = 1; content.style.opacity = 1; content.style.transform = "none"; };
  if (!first) { end(); return; }
  store.set("coach-splash", 1);
  heroPlace(g, false);
  full.style.opacity = 1; logo.style.opacity = 0; shade.style.opacity = 0; content.style.opacity = 0; content.style.transform = "translateY(24px)";
  let skipped = false; const hero = $("#hero");
  const skip = () => { skipped = true; hero.getAnimations({ subtree: true }).forEach(a => a.finish()); content.getAnimations().forEach(a => a.finish()); end(); };
  root.addEventListener("pointerdown", skip, { once: true });
  const E = "cubic-bezier(.65,0,.35,1)";
  await Promise.all([full, $("#hb-clean")].map(el => el.animate([{ opacity: 0, transform: "scale(1.08)" }, { opacity: 1, transform: "none" }], { duration: 1400, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" }).finished)).catch(() => {});
  if (skipped) return;
  await sleep(1300); if (skipped) return;
  // El escudo real tapa al de la foto; la foto pasa a la versión sin escudo ni lema.
  logo.style.opacity = 1;
  full.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: "forwards" });
  await sleep(250); if (skipped) return;
  const a = [];
  for (const el of [full, $("#hb-clean")]) a.push(el.animate([{ transform: "none" }, { transform: g.end }], { duration: 1700, easing: E, fill: "forwards" }));
  a.push(logo.animate([{ left: g.logoStart.l + "px", top: g.logoStart.t + "px", width: g.logoStart.w + "px" }, { left: g.logoEnd.l + "px", top: g.logoEnd.t + "px", width: g.logoEnd.w + "px" }], { duration: 1300, easing: E, fill: "forwards" }));
  a.push(shade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1200, delay: 300, fill: "forwards" }));
  a.push(content.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 700, delay: 1100, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }));
  await Promise.all(a.map(x => x.finished)).catch(() => {});
  if (!skipped) { root.removeEventListener("pointerdown", skip); end(); hero.getAnimations({ subtree: true }).forEach(x => x.cancel()); content.getAnimations().forEach(x => x.cancel()); }
}
addEventListener("orientationchange", () => setTimeout(() => { if ($("#hero")) heroPlace(heroGeom(), true); }, 300));

function showInstall() {
  root.innerHTML = heroHTML() + `<div class="gate hero" id="gc">
    <div><span class="beta">Beta</span><h1 style="margin-top:10px">Instala tu coach</h1><p style="margin-top:8px">Añádelo a la pantalla de inicio: se abrirá como una app, a pantalla completa y con avisos cuando termines una salida.</p></div>
    <div class="card"><ol class="steps">
      <li><span class="n">1</span><p>Pulsa <strong>Compartir</strong> ${ICON.share} en la barra de Safari.</p></li>
      <li><span class="n">2</span><p>Elige <strong>Añadir a pantalla de inicio</strong> ${ICON.plus}.</p></li>
      <li><span class="n">3</span><p>Pulsa <strong>Añadir</strong> y abre <strong>Coach</strong> desde tu pantalla de inicio.</p></li>
    </ol></div>
    <button class="link" id="skip">Seguir en el navegador</button>
  </div>`;
  $("#skip").onclick = () => { store.set("coach-skip-install", 1); showLogin(); };
  heroRun($("#gc"));
}

function showLogin(step = "email", email = store.get("coach-email", "")) {
  if (step === "email") {
    root.innerHTML = heroHTML() + `<div class="gate hero" id="gc">
      <h1 class="sr">Coach Tikismikis</h1>
      <div class="row" style="gap:10px;align-items:center"><span class="beta">Beta</span><p>Tu coach: cada salida, su lectura y tu semana.</p></div>
      <form class="card" id="f" novalidate>
        <label for="email">Tu email</label>
        <input id="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="tu@email.com" value="${esc(email)}" required>
        <p class="err" id="err" role="alert"></p>
        <button class="btn primary block" id="go" type="submit">Enviarme un código</button>
        <p style="font-size:13px">Te llega un código por email. Sin contraseñas.</p>
      </form>
    </div>`;
    const f = $("#f"), inp = $("#email"), err = $("#err"), go = $("#go");
    heroRun($("#gc"));
    inp.oninput = () => (err.textContent = "");
    f.onsubmit = async e => {
      e.preventDefault();
      const v = inp.value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { err.textContent = "Escribe un email válido."; inp.focus(); return; }
      go.disabled = true; go.textContent = "Enviando…";
      const { error } = await sb.auth.signInWithOtp({ email: v, options: { shouldCreateUser: true } });
      if (error) { go.disabled = false; go.textContent = "Enviarme un código"; err.textContent = /rate|seconds/i.test(error.message) ? "Espera un minuto antes de pedir otro código." : /database|saving new user|not_invited/i.test(error.message) ? "Este email no tiene invitación. El coach es solo para el grupo de pruebas: pídele acceso a Manu." : "No se pudo enviar el código. Revisa el email e inténtalo de nuevo."; return; }
      store.set("coach-email", v); store.set("coach-otp-at", Date.now());
      showLogin("code", v);
    };
    return;
  }
  root.innerHTML = `<div class="gate">
    <div class="brand"><img class="logo" src="icons/icon-192.png" alt=""><span class="beta">Beta</span></div>
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

/* ---------- Bienvenida, ficha y conexión con intervals.icu ---------- */
const WSTEPS = [
  { t: "Tú", sub: "Lo básico para que el coach te conozca.", f: [
    { k: "nombre", l: "¿Cómo te llamas?", type: "text", ph: "Nombre", req: 1 },
    { k: "edad", l: "Edad", type: "num", ph: "años", half: 1 },
    { k: "peso", l: "Peso", type: "num", ph: "kg", half: 1 },
    { k: "anos_bici", l: "¿Cuánto llevas en bici?", type: "chips", o: ["Menos de 1 año", "1-3 años", "3-10 años", "Más de 10"] },
    { k: "lesiones", l: "Lesiones o molestias que deba tener en cuenta", type: "area", ph: "Ej.: rodilla derecha si fuerzo mucho. Déjalo vacío si nada." },
  ] },
  { t: "Tu bici y tus datos", sub: "Si no sabes algún dato, déjalo: el coach lo saca de tus salidas.", f: [
    { k: "bici", l: "¿Qué bici usas más?", type: "chips", o: ["Carretera", "MTB", "Gravel", "Varias"] },
    { k: "potenciometro", l: "¿Tienes potenciómetro?", type: "chips", o: ["Sí", "No"] },
    { k: "ftp", l: "FTP", type: "num", ph: "W", half: 1 },
    { k: "fcmax", l: "FC máxima", type: "num", ph: "ppm", half: 1 },
    { k: "fuerza", l: "¿Haces fuerza?", type: "chips", o: ["No", "A veces", "1 vez/semana", "2 o más/semana"] },
  ] },
  { t: "Tu objetivo y tu vida", sub: "Con esto decide qué toca en cada hueco.", f: [
    { k: "objetivo", l: "¿Qué quieres conseguir?", type: "area", ph: "Ej.: aguantar con la grupeta del sábado sin quedarme en las subidas.", req: 1 },
    { k: "prueba", l: "¿Alguna prueba en el horizonte?", type: "text", ph: "Opcional" },
    { k: "fecha_prueba", l: "Fecha de la prueba", type: "date" },
    { k: "dias", l: "Días que sueles salir", type: "multi", o: ["L", "M", "X", "J", "V", "S", "D"] },
    { k: "horas", l: "Horas a la semana, más o menos", type: "num", ph: "h" },
    { k: "disponibilidad", l: "Tu disponibilidad", type: "chips", o: ["Fija", "Variable", "Imprevisible"] },
    { k: "grupo", l: "¿Cómo sueles salir?", type: "chips", o: ["Solo", "En grupo", "Mitad y mitad"] },
  ] },
];
let W = null;
function wField(x) {
  const v = W[x.k];
  if (x.type === "chips" || x.type === "multi") {
    const sel = x.type === "multi" ? (v || []) : [v];
    return `<div class="field w"><span class="lab">${x.l}</span><div class="chips" data-k="${x.k}" data-multi="${x.type === "multi" ? 1 : ""}">${x.o.map(o => `<button type="button" class="chip ${sel.includes(o) ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`;
  }
  if (x.type === "area") return `<label class="field w"><span class="lab">${x.l}</span><textarea data-k="${x.k}" rows="3" placeholder="${esc(x.ph || "")}">${esc(v || "")}</textarea></label>`;
  const t = x.type === "num" ? `type="text" inputmode="decimal"` : x.type === "date" ? `type="date"` : `type="text" autocapitalize="words"`;
  return `<label class="field w ${x.half ? "half" : ""}"><span class="lab">${x.l}</span><input ${t} data-k="${x.k}" value="${esc(v ?? "")}" placeholder="${esc(x.ph || "")}"></label>`;
}
function showWelcome(i = 0, editing = false) {
  if (!W) W = Object.assign({ nombre: S.profile?.name || "" }, S.profile?.context?.answers ? fromAnswers(S.profile.context.answers) : {}, store.get("coach-ficha", {}));
  const st = WSTEPS[i], last = i === WSTEPS.length - 1;
  const intro = i === 0 && !editing ? `<div><span class="beta" style="margin-bottom:10px;display:inline-block">Versión beta</span><h1>Bienvenido al coach</h1><p style="margin-top:8px">Tres pantallas sobre ti y luego conectamos tus salidas. Te lleva dos minutos.</p></div>` : `<div><p class="eyebrow" style="color:rgba(255,255,255,.6)">Paso ${i + 1} de ${WSTEPS.length + (editing ? 0 : 1)}</p><h1>${st.t}</h1><p style="margin-top:6px">${st.sub}</p></div>`;
  root.innerHTML = `<div class="gate wel">
    <div class="dots">${[...WSTEPS, ...(editing ? [] : [0])].map((_, j) => `<i class="${j <= i ? "on" : ""}"></i>`).join("")}</div>
    ${intro}
    ${i === 0 && !editing ? `<p class="eyebrow" style="color:rgba(255,255,255,.6)">Paso 1 de ${WSTEPS.length + 1} · ${st.t}</p>` : ""}
    <form class="card" id="wf" novalidate><div class="wgrid">${st.f.map(wField).join("")}</div><p class="err" id="werr" role="alert"></p></form>
    <div class="row" style="gap:10px">${i > 0 ? `<button class="btn ghost" id="wback" type="button">Atrás</button>` : editing ? `<button class="btn ghost" id="wcancel" type="button">Cancelar</button>` : ""}<button class="btn primary" id="wnext" type="button" style="flex:1">${last ? (editing ? "Guardar ficha" : "Guardar y seguir") : "Siguiente"}</button></div>
  </div>`;
  const f = $("#wf");
  const save = () => store.set("coach-ficha", W);
  f.addEventListener("input", e => { const k = e.target.dataset.k; if (k) { W[k] = e.target.value; save(); } });
  f.addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    const box = c.parentElement, k = box.dataset.k;
    if (box.dataset.multi) { const a = new Set(W[k] || []); a.has(c.dataset.v) ? a.delete(c.dataset.v) : a.add(c.dataset.v); W[k] = WSTEPS.flatMap(s => s.f).find(x => x.k === k).o.filter(o => a.has(o)); c.classList.toggle("on"); }
    else { W[k] = W[k] === c.dataset.v ? "" : c.dataset.v; box.querySelectorAll(".chip").forEach(b => b.classList.toggle("on", b.dataset.v === W[k])); }
    save();
  });
  const back = $("#wback"); if (back) back.onclick = () => showWelcome(i - 1, editing);
  const cancel = $("#wcancel"); if (cancel) cancel.onclick = () => { W = null; entered = false; enter(); };
  $("#wnext").onclick = async () => {
    const miss = st.f.find(x => x.req && !String(W[x.k] || "").trim());
    if (miss) { $("#werr").textContent = "Falta: " + miss.l.replace(/^¿|\?$/g, "").toLowerCase() + "."; return; }
    if (!last) { showWelcome(i + 1, editing); $(".gate").scrollTop = 0; return; }
    const b = $("#wnext"); b.disabled = true; b.textContent = "Guardando…";
    const res = await callFn("profile", toAnswers(W));
    if (!res.ok) { b.disabled = false; b.textContent = "Reintentar"; $("#werr").textContent = res.error === "red" ? "Sin conexión. No pierdes nada: vuelve a intentarlo." : "No se pudo guardar ahora. Inténtalo otra vez."; return; }
    store.del("coach-ficha"); W = null;
    try { await loadAll(); } catch {}
    if (editing || S.profile?.intervals_connected) { entered = false; enter(); toast("Ficha guardada"); } else showConnect();
  };
}
function toAnswers(w) {
  const n = x => { const v = parseFloat(String(x || "").replace(",", ".")); return isFinite(v) && v > 0 ? v : null; };
  return { nombre: w.nombre, edad: n(w.edad), peso: n(w.peso), anos_bici: w.anos_bici, bici: w.bici, potenciometro: w.potenciometro === "Sí", ftp: n(w.ftp), fcmax: n(w.fcmax),
    objetivo: w.objetivo, prueba: w.prueba, fecha_prueba: w.fecha_prueba, dias: (w.dias || []).join(", "), horas: n(w.horas), disponibilidad: w.disponibilidad, grupo: w.grupo, lesiones: w.lesiones, fuerza: w.fuerza };
}
function fromAnswers(a) {
  return { ...a, potenciometro: a.potenciometro ? "Sí" : "No", dias: a.dias ? String(a.dias).split(/,\s*/).filter(Boolean) : [], edad: a.edad ?? "", peso: a.peso ?? "", ftp: a.ftp ?? "", fcmax: a.fcmax ?? "", horas: a.horas ?? "" };
}

let pollT = null;
function showConnect() {
  root.innerHTML = `<div class="gate wel">
    <div class="dots">${[...WSTEPS, 0].map(() => `<i class="on"></i>`).join("")}</div>
    <div><p class="eyebrow" style="color:rgba(255,255,255,.6)">Último paso</p><h1>Conecta tus salidas</h1>
    <p style="margin-top:8px">El coach lee tus salidas de <strong style="color:#fff">intervals.icu</strong>, una web gratuita que recoge lo que graba tu Garmin, Karoo, Wahoo o Strava.</p></div>
    <section class="card"><ol class="steps">
      <li><span class="n">1</span><span>¿No tienes cuenta? Créala gratis en intervals.icu y conecta allí tu dispositivo o Strava. <a href="https://intervals.icu" target="_blank" rel="noopener" style="color:var(--mint)">Abrir intervals.icu</a></span></li>
      <li><span class="n">2</span><span>Pulsa <strong style="color:#fff">Conectar</strong> y acepta el permiso. Solo lee tus actividades y tu forma, y guarda en tu calendario la fuerza que registres aquí.</span></li>
      <li><span class="n">3</span><span>Vuelve a esta app: el coach importa tus últimas 8 semanas para conocerte.</span></li>
    </ol></section>
    <p class="err" id="cerr" role="alert"></p>
    <button class="btn primary block" id="cgo">Conectar intervals.icu</button>
    <button class="link" id="clater" style="align-self:center">Ahora no</button>
  </div>`;
  $("#cgo").onclick = () => startConnect($("#cgo"));
  $("#clater").onclick = () => { store.set("coach-connect-later", Date.now()); entered = false; enter(); };
  watchConnected();
}
async function startConnect(btn) {
  btn.disabled = true; const t = btn.textContent; btn.textContent = "Abriendo…";
  const res = await callFn("oauth_start");
  if (!res.ok) { btn.disabled = false; btn.textContent = t; const e = $("#cerr"); if (e) e.textContent = "No se pudo abrir la conexión. Inténtalo otra vez."; else toast("No se pudo abrir la conexión."); return; }
  store.set("coach-oauth-at", Date.now());
  watchConnected();
  location.href = res.url;
}
// En el iPhone, intervals.icu se abre en una hoja de Safari aparte; la app sigue aquí y comprueba cuándo queda conectada.
function watchConnected() {
  clearInterval(pollT);
  const t0 = Date.now();
  pollT = setInterval(async () => {
    if (Date.now() - t0 > 15 * 60e3) { clearInterval(pollT); return; }
    if (document.visibilityState !== "visible" || !session) return;
    const { data } = await sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (data?.intervals_connected) { clearInterval(pollT); S.profile = data; saveCache(); showConnected(data); }
  }, 3000);
}
function showConnected(p) {
  root.innerHTML = `<div class="gate wel" style="justify-content:center;text-align:center;align-items:center">
    <div class="okmark">${ICON.check || "✓"}</div>
    <div><h1>¡Conectado!</h1><p style="margin-top:8px">Estoy importando tus últimas 8 semanas. En unos minutos verás tu semana y tus salidas.</p></div>
    <button class="btn primary block" id="cin">Entrar</button></div>`;
  $("#cin").onclick = () => { entered = false; enter(); };
}
// Vuelta desde intervals.icu (?code=…&state=…). Puede abrirse en Safari, sin sesión: el servidor reconoce al ciclista por el state.
async function handleOAuthReturn() {
  const q = new URLSearchParams(location.search);
  if (!q.get("state") || !(q.get("code") || q.get("error"))) return false;
  const code = q.get("code"), state = q.get("state");
  history.replaceState(null, "", location.pathname);
  root.innerHTML = `<div class="gate wel" style="justify-content:center;text-align:center;align-items:center"><img class="logo" src="icons/icon-192.png" alt=""><h1>Conectando…</h1></div>`;
  let res = { ok: false, error: "cancelado" };
  if (code) {
    try { const r = await fetch(`${FN}?a=oauth_callback`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPA_KEY }, body: JSON.stringify({ code, state }) }); res = await r.json(); }
    catch { res = { ok: false, error: "red" }; }
  }
  const { data } = await sb.auth.getSession();
  const inApp = !!data.session;
  const msg = res.ok
    ? `<h1>¡Conectado!</h1><p style="margin-top:8px">${res.athlete ? `Hola, ${esc(res.athlete.split(" ")[0])}. ` : ""}${inApp ? "Ya puedes seguir." : "Ya puedes cerrar esta ventana y volver a la app del coach."}</p>`
    : `<h1>No se ha conectado</h1><p style="margin-top:8px">${{ cancelado: "Has cancelado el permiso.", caducado: "El enlace ha caducado.", red: "Sin conexión." }[res.error] || "Algo ha fallado."} Vuelve a la app y pulsa Conectar otra vez.</p>`;
  root.innerHTML = `<div class="gate wel" style="justify-content:center;text-align:center;align-items:center"><div class="okmark ${res.ok ? "" : "bad"}">${res.ok ? "✓" : "!"}</div><div>${msg}</div>${inApp ? `<button class="btn primary block" id="cin">${res.ok ? "Entrar" : "Volver"}</button>` : ""}</div>`;
  if (inApp) $("#cin").onclick = () => { session = data.session; entered = true; enter(); };
  return true;
}
function importCard() {
  const p = S.profile; if (!p) return "";
  if (!p.intervals_connected) return `<section class="card"><h3>Conecta tus salidas</h3><p class="muted">Sin intervals.icu el coach no ve lo que haces en la bici.</p><button class="btn primary" data-connect>Conectar intervals.icu</button></section>`;
  if (p.import_status === "importando") return `<section class="card"><h3>Importando tu historial…</h3><p class="muted">Estoy leyendo tus últimas 8 semanas para ajustar tu objetivo. Tarda unos minutos.</p></section>`;
  if (p.import_status === "error") return `<section class="card"><h3>No pude importar tu historial</h3><p class="muted">Lo reintentaré. Tus salidas nuevas sí llegarán.</p></section>`;
  return "";
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
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: "id=eq." + uid }, later)
    .subscribe();
}
async function callFn(action, body) {
  const { data } = await sb.auth.getSession();
  const tok = data.session?.access_token;
  const base = ["community", "share", "admin", "seen"].includes(action) ? SUPA_URL + "/functions/v1/social" : FN;
  const r = await fetch(`${base}?a=${action}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok, apikey: SUPA_KEY }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({ ok: false, error: "red" }));
  return j;
}

/* ---------- Lógica de semana ---------- */
function target() { return Object.assign({ load: 500, rides: 3, min_rides: 2, long_min_h: 2.5, long_min_kj: 1300, quality_if: 0.85, strength: 1 }, S.profile?.context?.week_target || {}); }
const LEG_ZONES = ["cuadriceps", "isquios", "gluteos", "gemelos", "aductores", "tibiales"];
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
  return `<header><p class="eyebrow">${w.mon.getDate()} ${MON[w.mon.getMonth()]} – ${e.getDate()} ${MON[e.getMonth()]}</p><h1>Coach</h1></header>
  ${importCard()}${pushCard}
  <section class="card"><h3>Tu semana</h3>
    <div class="row between" style="align-items:baseline"><p><span class="num" style="font-size:44px">${w.pct} %</span> <span class="muted">del objetivo</span></p><p class="muted small">${nf(w.load)} / ${nf(t.load)} de carga</p></div>
    <div class="meter" role="img" aria-label="Carga ${w.pct} % del objetivo"><div style="width:${Math.min(100, w.pct)}%"></div></div>
    <p class="muted small">${fmtH(w.h)} · ${w.inW.length} salida${w.inW.length == 1 ? "" : "s"}${w.strW.length ? ` · ${w.strW.length} de fuerza` : ""} · quedan ${w.left} día${w.left == 1 ? "" : "s"}</p>
    <div class="checks">
      <div class="check ${w.inW.length >= t.rides ? "done" : ""}"><span class="d">${w.inW.length >= t.rides ? "✓" : ""}</span>${w.inW.length} de ${t.rides} salidas</div>
      <div class="check ${w.long ? "done" : ""}"><span class="d">${w.long ? "✓" : ""}</span>Tirada larga</div>
      <div class="check ${w.quality ? "done" : ""}"><span class="d">${w.quality ? "✓" : ""}</span>Calidad</div>
      <div class="check ${w.strW.length >= t.strength ? "done" : ""}"><span class="d">${w.strW.length >= t.strength ? "✓" : ""}</span>Fuerza${w.strW.length ? ` (${w.strW.length})` : ""}</div>
    </div>
  </section>
  ${askCard()}
  <section class="card"><h3>Qué toca</h3>
    ${coach ? `<div class="advice"><p class="eyebrow">Del coach</p><p>${md(coach)}</p></div>` : ""}
    ${adv.map(a => `<div class="advice ${a.warn ? "warn" : ""}"><p>${md(a.t)}</p></div>`).join("") || `<p class="muted">Vas bien. Sigue con el plan.</p>`}
  </section>
  <div id="next">${planCard(true) || `<section class="card"><h3>Próxima sesión</h3><p class="muted">¿Tienes salida a la vista? Pega arriba la convocatoria y el coach te dice cómo afrontarla.</p></section>`}</div>
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
  if (!p || !p.tipo || pd(p.date) < today()) return compact ? "" : `<div class="empty">No hay sesión propuesta. Pega la convocatoria en <button class="link inline" data-tab="semana">Pregúntale al coach</button> y te la prepara.</div>`;
  const lab = k => { const s = k.replace(/_w$/, " (W)").replace(/_/g, " ").replace(/^if max$/, "IF máximo"); return s.charAt(0).toUpperCase() + s.slice(1); };
  const items = Object.entries(p.objetivos || {}).map(([k, v]) => `<li><strong>${esc(lab(k))}:</strong> ${esc(v)}</li>`).join("");
  const d = pd(p.date), when = iso(d) === iso(today()) ? "Hoy" : (d - today()) / 864e5 === 1 ? "Mañana" : `${DAYS[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  const pasos = (p.pasos || []).map((x, i) => `<li><span class="n">${i + 1}</span><span>${md(x)}</span></li>`).join("");
  if (compact) return `<section class="card"><div class="row between"><h3>Próxima sesión</h3><span class="muted small">${when}</span></div>
    <p><strong>${esc(p.tipo)}</strong>${p.duracion ? ` · ${esc(p.duracion)}` : ""}</p>${p.resumen ? `<p class="muted">${md(p.resumen)}</p>` : ""}
    <button class="link" style="color:var(--pine);text-align:left" data-tab="plan">Ver el plan paso a paso ›</button></section>`;
  return `<section class="card"><div class="row between"><h3>Próxima sesión</h3><span class="muted small">${when}</span></div>
    <p><strong>${esc(p.tipo)}</strong>${p.duracion ? ` · ${esc(p.duracion)}` : ""}</p>
    ${p.resumen ? `<p>${md(p.resumen)}</p>` : ""}${p.texto ? `<p class="muted">${esc(p.texto)}</p>` : ""}
    ${pasos ? `<ol class="steps-l">${pasos}</ol>` : ""}${items ? `<ul class="ins">${items}</ul>` : ""}
    ${p.alargar ? `<div class="advice"><p class="eyebrow">¿Alargar?</p><p>${md(p.alargar)}</p></div>` : ""}
    ${p.si_no_estas_fresco ? `<div class="advice warn"><p class="eyebrow">Si no llegas fresco</p><p>${md(p.si_no_estas_fresco)}</p></div>` : ""}
    ${p.semana ? `<div class="advice"><p class="eyebrow">Tu semana</p><p>${md(p.semana)}</p></div>` : ""}
    ${p.pregunta ? `<p class="small muted"><strong>Lo que le dijiste:</strong> ${esc(p.pregunta)}</p>` : ""}</section>`;
}
function askCard() {
  return `<section class="card" id="ask"><h3>Pregúntale al coach</h3>
    <p class="muted small">Pega la convocatoria de la grupeta o cuéntale qué tienes previsto, y te dice cómo afrontarla.</p>
    <textarea id="ask-text" class="convo" rows="9" placeholder="*SALIDA MTB SÁBADO*&#10;🚴🏼‍♂️🚴🏼‍♂️🚴🏼‍♂️🚴🏼‍♂️🚴🏼‍♂️&#10;✅ *Hora*: 9.30 horas&#10;✅ *Lugar*: Cines El Tablero&#10;✅ *Ruta*: Assuán-Trassierra-Artafi&#10;✅ *Duración y desnivel*: 2h 800+&#10;✅ *Ritmo*: Z2&#10;_Asistentes_&#10;✔️ …"></textarea>
    <button class="btn primary" id="ask-send">Preguntar</button>
    <p class="ferr" id="ask-err" role="alert"></p><div id="ask-live" aria-live="polite"></div></section>`;
}
function wireAsk() {
  const ta = $("#ask-text"), btn = $("#ask-send"), err = $("#ask-err"), live = $("#ask-live");
  if (!ta) return;
  ta.value = store.get("coach-ask-draft", "");
  ta.oninput = () => { err.textContent = ""; store.set("coach-ask-draft", ta.value); };
  btn.onclick = async () => {
    const text = ta.value.trim();
    if (text.length < 5) { err.textContent = "Cuéntale al coach qué tienes previsto."; ta.focus(); return; }
    ta.blur(); btn.disabled = true; wireAsk.busy = true;
    live.innerHTML = `<div class="thinking"><i></i><i></i><i></i><span>El coach está preparando tu salida…</span></div>`;
    const res = await callFn("ask", { text });
    btn.disabled = false; wireAsk.busy = false; live.innerHTML = "";
    if (!res.ok) { err.textContent = limitMsg(res, "preguntas") || { no_autorizado: "Tu cuenta aún no está activada.", red: "Sin conexión. Tu texto sigue guardado." }[res.error] || `No se pudo preparar ahora (${res.error || "error"}). Inténtalo otra vez.`; return; }
    store.del("coach-ask-draft"); S.plan = res.plan; saveCache();
    if (tab === "semana") { render(); $("#next")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
    else if (tab !== "plan") go("plan"); else { render(); $("#scroll").scrollTo({ top: 0, behavior: "smooth" }); }
    toast("Plan listo");
  };
}
const PILL = { pendiente: ["pend", "Pendiente"], analizada: ["ok", "Analizada"], historial: ["hist", "Historial"] };
function ridesView() {
  const pend = S.rides.filter(r => r.status === "pendiente").length;
  const items = [...S.rides.map(r => ({ k: "r", d: r.date, x: r })), ...(S.strength || []).map(x => ({ k: "f", d: x.date, x }))].sort((a, b) => b.d.localeCompare(a.d) || (a.k === "f" ? 1 : -1));
  const row = it => {
    const d = pd(it.d), dt = `<div class="date"><b>${d.getDate()}</b><span>${MON[d.getMonth()]} · ${DAYS[d.getDay()]}</span></div>`;
    if (it.k === "f") { const x = it.x, z = topZones(x.zones); return `<button class="ride" data-strength="${esc(x.id)}">${dt}<div style="min-width:0"><p class="t">Fuerza · ${esc(x.kind)}</p><p class="m">${x.minutes} min · esfuerzo ${x.rpe}${z ? " · " + esc(z) : ""}</p></div><span class="pill str">Fuerza</span></button>`; }
    const r = it.x, m = r.metrics || {}, st = PILL[r.status] || PILL.pendiente;
    return `<button class="ride" data-ride="${esc(r.id)}">${dt}<div style="min-width:0"><p class="t">${esc(r.title || "Salida")}</p><p class="m">${m.km ?? "–"} km · ${m.elev_m ?? "–"} m · ${esc(m.moving || "")}</p></div><span class="pill ${st[0]}">${st[1]}</span></button>`;
  };
  return `<header class="row between" style="align-items:flex-end"><div><p class="eyebrow">${pend ? pend + " pendiente" + (pend > 1 ? "s" : "") + " de feedback" : "Todo analizado"}</p><h1>Salidas</h1></div><button class="btn primary addf" data-new-strength aria-label="Añadir sesión de fuerza"><span class="plus">+</span>${ICON.dumbbell} Fuerza</button></header>
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
  const hist = r.status === "historial";
  const qs = ["¿Solo o en grupo? Si fue en grupo, ¿quién marcó el ritmo?", "Piernas y cabeza de 1 a 5, y esfuerzo de 1 a 10.", "¿Algo fuera de lo normal? Catarro, dolor, mal sueño, estrés, poca comida, calor."];
  if (r.plan?.tipo && r.plan.date === r.date) qs.push(`¿Pudiste hacer lo planeado (${r.plan.tipo})?`);
  const canSpeak = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
  return `<section class="card" id="fb"><h3>${hist ? "¿Quieres que la analice?" : pend ? "Cuéntame qué tal" : "Añadir algo más"}</h3>${hist ? `<p class="muted small">Es de antes de que te unieras. Si te acuerdas de cómo fue, cuéntamelo y la analizo.</p>` : ""}
  ${pend && !hist ? `<div class="q">${qs.map(q => `<span>· ${esc(q)}</span>`).join("")}</div>` : ""}
  <textarea id="fb-text" placeholder="Ej.: con David a nuestro ritmo, piernas 4, cabeza 4, esfuerzo 6. Comí cada media hora." enterkeyhint="send"></textarea>
  <div class="row">${canSpeak ? `<button class="btn" id="mic" type="button">${ICON.mic} Dictar</button>` : ""}<button class="btn primary" id="send" type="button" style="flex:1">${pend ? "Enviar y analizar" : "Reanalizar"}</button></div>
  ${canSpeak ? "" : `<p class="small muted">Para dictar, usa el micrófono del teclado.</p>`}
  <p class="ferr" id="ferr" role="alert"></p><div id="live" aria-live="polite"></div></section>`;
}
// Mapa de la ruta (Leaflet + teselas de OpenStreetMap; en oscuro se invierten con un filtro). La ruta solo la ve su dueño.
let leafletP = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return leafletP ||= new Promise((ok, ko) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css);
    const js = document.createElement("script"); js.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"; js.onload = () => ok(window.L); js.onerror = e => { leafletP = null; ko(e); }; document.head.appendChild(js);
  });
}
async function drawRoute(r) {
  const el = $("#rmap"), pts = r.metrics?.route; if (!el || !(pts?.length > 1)) return;
  try {
    const L = await loadLeaflet(); if (!el.isConnected) return;
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const map = L.map(el, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, tap: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, className: dark ? "osm-dark" : "", attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    map.attributionControl.setPrefix(false);
    const line = L.polyline(pts, { color: dark ? "#ff7a3d" : "#e85d1f", weight: 4, opacity: .95, lineJoin: "round" }).addTo(map);
    L.circleMarker(pts[0], { radius: 5, color: "#fff", weight: 2, fillColor: "#2fb36b", fillOpacity: 1 }).addTo(map);
    L.circleMarker(pts[pts.length - 1], { radius: 5, color: "#fff", weight: 2, fillColor: "#d64545", fillOpacity: 1 }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [18, 18] });
  } catch { el.closest(".map")?.remove(); }
}
function detailView(r) {
  const m = r.metrics || {}, d = pd(r.date), pend = r.status !== "analizada", p = r.plan && r.plan.date === r.date ? r.plan : null;
  const ifOver = p?.objetivos?.if_max && m.if > p.objetivos.if_max;
  const others = (r.insights || []).filter(x => !(r.climbs || []).some(c => x.includes(c.climb))).filter(x => !(m.pacing_meaningful === false && x.startsWith("**Resistencia")));
  const q = m.quarters_np || [], qmx = Math.max(...q, 200);
  return `<header style="display:flex;flex-direction:column;gap:6px"><p class="eyebrow">${DAYS[d.getDay()]} ${d.getDate()} de ${MON[d.getMonth()]} · ${m.discipline === "mtb" ? "MTB" : "Carretera"}</p>
    <h1>${esc(r.title || "Salida")}</h1><div class="row"><span class="pill ${(PILL[r.status] || PILL.pendiente)[0]}">${{ pendiente: "Pendiente de feedback", analizada: "Analizada", historial: "Historial" }[r.status] || "Pendiente de feedback"}</span>${p ? `<span class="muted small">Plan: ${esc(p.tipo)}</span>` : ""}</div></header>
  ${m.route?.length > 1 ? `<section class="card map"><div id="rmap" role="img" aria-label="Mapa de la ruta"></div></section>` : ""}
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
    <div class="rowi"><span>intervals.icu</span>${S.profile?.intervals_connected ? `<span class="muted small">Conectado${S.profile.import_status === "importando" ? " · importando" : ""}</span>` : `<button class="btn" id="icu-connect" style="min-height:36px;padding:6px 12px">Conectar</button>`}</div>
    <div class="rowi"><span>Tu ficha</span><button class="btn" id="edit-profile" style="min-height:36px;padding:6px 12px">Editar</button></div>
    <div class="rowi"><span>Qué ve la grupeta</span><button class="btn" data-open="compartir" style="min-height:36px;padding:6px 12px">Elegir</button></div>
    ${S.profile?.athlete_key === "manu" ? `<div class="rowi"><span>Uso del piloto</span><button class="btn" data-open="uso" style="min-height:36px;padding:6px 12px">Ver</button></div>` : ""}
    <div class="rowi"><span>Versión</span><span class="muted small">${VERSION} <span class="beta sm">Beta</span></span></div>
  </section>
  <button class="btn block" id="logout" style="color:var(--hot)">Cerrar sesión</button>`;
}


/* ---------- Grupeta: comunidad del piloto ---------- */
function avatarHTML(name, url, size = 40) {
  const ini = esc(String(name || "?").trim()[0]?.toUpperCase() || "?");
  return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px">${url ? `<img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<span>${ini}</span></span>`;
}
function markSeen() { if (Date.now() - store.get("coach-seen", 0) > 30 * 60e3) { store.set("coach-seen", Date.now()); callFn("seen"); } }
let commBusy = false;
async function loadCommunity(force = false) {
  if (commBusy || (!force && S.community && Date.now() - (S.communityAt || 0) < 120e3)) return;
  commBusy = true;
  const res = await callFn("community");
  commBusy = false;
  if (res.ok) { S.community = res; S.communityAt = Date.now(); if (tab === "grupeta" && $("#content")) { $("#content").innerHTML = groupView(); wireGroup(); } if (/^#(m-|subidas)/.test(location.hash)) renderSheet(); }
}
const SHARE_OPTS = [
  ["semana", "Tu semana", "Salidas, horas y % de tu objetivo de carga."],
  ["salidas", "Tus últimas salidas", "Fecha, distancia, desnivel y tiempo."],
  ["subidas", "Tus tiempos en las subidas del club", "Para la tabla de cada subida."],
];
function shareCard(full) {
  const cur = S.community?.share || { semana: true, salidas: true, subidas: true };
  return `<section class="card share" id="share-card">
    <p class="muted small">Todos los del piloto aparecéis en la grupeta con nombre, foto y bici. Tú eliges qué más se ve de ti. Nunca se comparten tu objetivo, tu salud, lo que le cuentas al coach ni sus análisis.</p>
    ${SHARE_OPTS.map(([k, t, d]) => `<div class="rowi"><div><div>${t}</div><div class="muted small">${d}</div></div><button class="switch ${cur[k] ? "on" : ""}" data-share="${k}" aria-label="${t}"></button></div>`).join("")}
    <button class="btn primary block" id="share-save">Guardar</button>
  </section>`;
}
function wireShare() {
  const card = $("#share-card"); if (!card) return;
  card.onclick = async e => {
    const sw = e.target.closest("[data-share]");
    if (sw) { sw.classList.toggle("on"); return; }
    if (e.target.closest("#share-save")) {
      const b = $("#share-save"), body = {}; card.querySelectorAll("[data-share]").forEach(x => (body[x.dataset.share] = x.classList.contains("on")));
      b.disabled = true; b.textContent = "Guardando…";
      const res = await callFn("share", body);
      if (!res.ok) { b.disabled = false; b.textContent = "Reintentar"; return; }
      toast("Guardado");
      await loadCommunity(true);
      if (location.hash === "#compartir") history.back(); else if (tab === "grupeta") { $("#content").innerHTML = groupView(); wireGroup(); }
    }
  };
}
function wireGroup() { wireShare(); }
const dshort = d => { const x = pd(d); return `${DAYS[x.getDay()]} ${x.getDate()} ${MON[x.getMonth()]}`; };
function lastRide(m) {
  const r = m.salidas?.[0];
  return r ? `${esc(dshort(r.date))} · ${esc(r.title || "Salida")}` : m.salidas ? "Sin salidas recientes" : "Prefiere no mostrar sus salidas";
}
function memberRow(m) {
  return `<button class="mrow" data-member="${esc(m.id)}">${avatarHTML(m.name, m.avatar, 44)}<div class="mtxt"><p class="t">${esc(m.me ? "Tú" : m.name)}</p><p class="m">${lastRide(m)}</p></div><span class="chev">›</span></button>`;
}
function memberDetail(m) {
  const w = m.semana, c = S.community;
  const climbs = (c?.subidas || []).map(x => { const i = x.riders.findIndex(r => r.id === m.id); return i < 0 ? null : { ...x.riders[i], name: x.name, disc: x.disc, pos: i + 1, of: x.riders.length }; }).filter(Boolean);
  return `<header class="mhero">${avatarHTML(m.name, m.avatar, 84)}<h1>${esc(m.name)}</h1>${m.bici ? `<p class="muted">${esc(m.bici)}</p>` : ""}</header>
  ${w ? `<section class="card"><h3>Esta semana</h3><div class="mweek"><div><b>${w.salidas}</b><span>salidas</span></div><div><b>${String(w.horas).replace(".", ",")}</b><span>horas</span></div>${w.pct != null ? `<div style="flex:1"><b>${w.pct} %</b><span>de su objetivo de carga</span><i class="pbar"><i style="width:${Math.min(100, w.pct)}%"></i></i></div>` : ""}</div></section>` : ""}
  ${m.salidas?.length ? `<section class="card"><h3>Últimas salidas</h3><div class="mrides">${m.salidas.map(r => `<div><span class="muted small">${esc(dshort(r.date))}</span><span class="tt">${esc(r.title || "Salida")}</span><span class="muted small">${r.km ?? "–"} km · ${r.elev ?? "–"} m</span></div>`).join("")}</div></section>` : ""}
  ${climbs.length ? `<section class="card"><h3>Subidas del club</h3><div class="mrides">${climbs.map(x => `<div><span class="muted small">${x.pos}.º de ${x.of}</span><span class="tt">${esc(x.name)}${x.disc ? ` · ${x.disc === "mtb" ? "MTB" : "carretera"}` : ""}</span><span><b>${esc(x.best)}</b></span></div>`).join("")}</div><button class="link" data-open="subidas" style="margin-top:10px;color:var(--pine)">Ver las tablas completas ›</button></section>` : ""}
  ${!w && !m.salidas && !climbs.length ? `<div class="empty">${esc(m.name.split(" ")[0])} prefiere no mostrar más datos.</div>` : ""}`;
}
function climbCard(c) {
  return `<section class="card climb"><h3>${esc(c.name)} <span class="pill">${c.disc === "mtb" ? "MTB" : "Carretera"}</span></h3>${c.tramo ? `<p class="muted small">Se compara ${esc(c.tramo)}: es el tramo que se mide igual en todas las pasadas.</p>` : ""}
    <ol class="rank">${c.riders.map((r, i) => `<li class="${r.me ? "me" : ""}"><span class="pos">${i + 1}</span>${i === 0 ? `<span class="first" title="Mejor tiempo">${ICON.trophy}</span>` : ""}${avatarHTML(r.name, r.avatar, 30)}<span class="nm"><span class="who">${esc(r.me ? "Tú" : r.name.split(" ")[0])}</span><span class="muted small">última ${esc(r.last)} · ${esc(dshort(r.last_date))}${r.passes ? ` · ${r.passes} ${r.passes === 1 ? "vez" : "veces"}` : ""}</span></span><b class="tm">${esc(r.best)}</b></li>`).join("")}</ol></section>`;
}
function groupView() {
  const c = S.community;
  if (!c) return `<header><p class="eyebrow">Tikismikis</p><h1>Grupeta</h1></header><div class="empty">Cargando la grupeta…</div>`;
  const me = c.members.find(m => m.me), others = c.members.filter(m => !m.me)
    .sort((a, b) => String(b.salidas?.[0]?.date || "").localeCompare(String(a.salidas?.[0]?.date || "")));
  return `<header><p class="eyebrow">Tikismikis · piloto</p><h1>Grupeta</h1></header>
  ${me ? `<section class="card list">${memberRow(me)}</section>` : ""}
  ${!c.decided ? `<p class="muted small" style="margin:-4px 4px 0">Se ve tu semana, tus salidas y tus subidas. <button class="link inline" data-open="compartir">Elegir qué mostrar</button></p>` : ""}
  <h2 class="sect">${others.length} compañero${others.length === 1 ? "" : "s"}</h2>
  ${others.length ? `<section class="card list">${others.map(memberRow).join("")}</section>` : `<div class="empty">Cuando entren más compañeros, aparecerán aquí.</div>`}
  ${c.subidas.length ? `<section class="card list"><button class="mrow" data-open="subidas"><span class="ico cup">${ICON.trophy}</span><div class="mtxt"><p class="t">Subidas del club</p><p class="m">Tiempos de la grupeta en ${c.subidas.length} subida${c.subidas.length === 1 ? "" : "s"}</p></div><span class="chev">›</span></button></section>` : ""}`;
}

/* ---------- Uso del piloto (solo Manu) ---------- */
function ago(iso) {
  if (!iso) return "nunca";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60e3);
  if (m < 2) return "ahora"; if (m < 60) return `hace ${m} min`; const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`; const d = Math.round(h / 24); return `hace ${d} día${d > 1 ? "s" : ""}`;
}
function adminView(a) {
  const b = a.budget, pct = Math.min(100, Math.round((b.spent / b.max) * 100));
  const n = (v, l) => `<div><b>${v}</b><span>${l}</span></div>`;
  return `<header><h1>Uso del piloto</h1><p class="muted">${a.users.length} ciclistas dentro${a.pending_invites ? ` · ${a.pending_invites} invitación pendiente${a.pending_invites > 1 ? "s" : ""}` : ""}</p></header>
  <section class="card"><h3>Presupuesto de Claude este mes</h3><p><b style="font-size:28px;font-family:var(--display)">${b.spent.toFixed(2).replace(".", ",")} $</b> <span class="muted">de ${b.max} $</span></p><i class="pbar" style="margin:10px 0"><i style="width:${pct}%"></i></i><p class="muted small">${b.today} de ${b.day_max} llamadas en las últimas 24 h · estimado con precio conservador</p></section>
  ${a.users.map(u => `<section class="card member">
    <div class="mhead">${avatarHTML(u.name, u.avatar, 44)}<div style="min-width:0"><p class="t">${esc(u.name || "Sin nombre")}</p><p class="m">Última vez ${ago(u.last_seen)}</p></div></div>
    <p class="eyebrow" style="margin-top:14px">Últimos 7 días</p><div class="mgrid">${n(u.opens7, "aperturas")}${n(u.analyses7, "análisis")}${n(u.asks7, "preguntas")}${n(u.refresh7, "búsquedas")}</div>
    <p class="eyebrow" style="margin-top:12px">Últimos 30 días</p><div class="mgrid">${n(u.rides30, "salidas")}${n(u.pending, "sin feedback")}${n(u.strength30, "fuerza")}${n(u.cost_month.toFixed(2).replace(".", ",") + " $", "gasto del mes")}</div>
    <p class="muted small" style="margin-top:8px">${[u.connected ? "intervals ✓" : "sin intervals", u.push ? "avisos ✓" : "sin avisos", u.hidden?.length ? "oculta: " + u.hidden.join(", ") : "muestra todo", u.import === "importando" ? "importando historial" : ""].filter(Boolean).join(" · ")}</p>
  </section>`).join("")}`;
}

/* ---------- Shell, navegación y gestos ---------- */
function shell() {
  root.innerHTML = `<div class="app">
    <div class="topbar" id="topbar"><span class="row" style="gap:2px;align-items:center"><button class="iconbtn rf" id="rf" aria-label="Buscar salidas nuevas">${ICON.refresh}</button><span class="beta sm">Beta</span></span><span class="t" id="tt"></span><button class="iconbtn" id="me" aria-label="Ajustes">${avatarHTML(S.profile?.name || session.user.email, S.profile?.avatar_url, 32)}</button></div>
    <main class="scroll" id="scroll"><div class="content" id="content"></div></main>
    <nav class="tabbar" id="tabbar">
      <button class="tab" data-tab="semana">${ICON.semana}<span>Coach</span></button>
      <button class="tab" data-tab="salidas">${ICON.salidas}<span>Salidas</span><span class="dot" id="badge" hidden></span></button>
      <button class="tab" data-tab="grupeta">${ICON.grupeta}<span>Grupeta</span></button>
      <button class="tab" data-tab="plan">${ICON.plan}<span>Plan</span></button>
    </nav>
    <div class="sheet" id="sheet"><div class="topbar scrolled"><button class="back" id="back">${ICON.chev}<span id="back-l">Salidas</span></button><span class="t" id="st"></span><span id="sact" style="width:44px;display:grid;place-items:center"></span></div><main class="scroll" id="sscroll"><div class="content" id="scontent"></div></main></div>
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
  $("#rf").onclick = refresh;
  rfTick();
  edgeSwipe($("#sheet"));
}
function onContentClick(e) {
  const r = e.target.closest("[data-ride]"); if (r) { openSheet("r-" + r.dataset.ride); return; }
  const f = e.target.closest("[data-strength]"); if (f) { openSheet("f-" + f.dataset.strength); return; }
  if (e.target.closest("[data-new-strength]")) { openSheet("fuerza"); return; }
  const t = e.target.closest("[data-tab]"); if (t) { go(t.dataset.tab); return; }
  const o = e.target.closest("[data-open]"); if (o) { openSheet(o.dataset.open); return; }
  const mb = e.target.closest("[data-member]"); if (mb) { openSheet("m-" + mb.dataset.member); return; }
  if (e.target.closest("#push-on")) enablePush();
  const cn = e.target.closest("[data-connect]"); if (cn) startConnect(cn);
}
function go(t) { tab = t; store.set("coach-tab", t); render(); $("#scroll").scrollTop = 0; }
function openSheet(id) { if (location.hash !== "#" + id) history.pushState({ s: id }, "", "#" + id); renderSheet(); }
window.addEventListener("popstate", renderSheet);
function renderSheet() {
  const sh = $("#sheet"); if (!sh) return;
  const h = location.hash.slice(1);
  if (!h) { sh.classList.remove("on"); return; }
  const sc = $("#scontent");
  $("#sact").innerHTML = "";
  if (h === "ajustes") {
    $("#st").textContent = "Ajustes"; $("#back-l").textContent = "Volver"; sc.innerHTML = settingsView();
    $("#logout").onclick = async () => { await sb.auth.signOut(); };
    const ic = $("#icu-connect"); if (ic) ic.onclick = () => startConnect(ic);
    $("#edit-profile").onclick = () => { history.replaceState(null, "", location.pathname); if (channel) sb.removeChannel(channel); showWelcome(0, true); };
    const tg = $("#push-toggle"); if (tg) tg.onclick = async () => { if (tg.classList.contains("on")) { await disablePush(); tg.classList.remove("on"); } else if (await enablePush()) tg.classList.add("on"); };
  } else if (h === "compartir") {
    $("#st").textContent = "Qué ve la grupeta"; $("#back-l").textContent = "Volver";
    if (!S.community) { sc.innerHTML = `<div class="empty">Cargando…</div>`; loadCommunity(true).then(() => location.hash === "#compartir" && renderSheet()); }
    else { sc.innerHTML = `<header><h1>Qué ve la grupeta</h1></header>` + shareCard(true); wireShare(); }
  } else if (h.startsWith("m-") || h === "subidas") {
    const m = h === "subidas" ? null : S.community?.members.find(x => x.id === h.slice(2));
    $("#back-l").textContent = "Grupeta";
    if (h === "subidas") { $("#st").textContent = "Subidas del club"; sc.innerHTML = `<header><h1>Subidas del club</h1><p class="muted">Mejor tiempo de cada uno, con el historial de todas sus salidas. Carretera y MTB van por separado.</p></header>` + (S.community?.subidas || []).map(climbCard).join(""); }
    else if (!S.community) { sc.innerHTML = `<div class="empty">Cargando…</div>`; loadCommunity(true); }
    else if (!m) sc.innerHTML = `<div class="empty">No encuentro a este compañero.</div>`;
    else { $("#st").textContent = m.me ? "Tú" : m.name.split(" ")[0]; sc.innerHTML = memberDetail(m); }
  } else if (h === "uso") {
    $("#st").textContent = "Uso del piloto"; $("#back-l").textContent = "Volver";
    sc.innerHTML = S.admin ? adminView(S.admin) : `<div class="empty">Cargando…</div>`;
    if (!S.admin || Date.now() - S.adminAt > 60e3) callFn("admin").then(res => { if (res.ok) { S.admin = res; S.adminAt = Date.now(); if (location.hash === "#uso") sc.innerHTML = adminView(res); } });
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
      $("#st").textContent = r.title || "Salida"; $("#back-l").textContent = "Salidas"; sc.dataset.id = r.id; sc.innerHTML = detailView(r); drawRoute(r); wireFeedback(r);
      $("#sact").innerHTML = `<button class="iconbtn" id="share" aria-label="Compartir">${ICON.share}</button>`; prepareShare(r); $("#share").onclick = () => shareRide(r);
      if (goFb === r.id) { goFb = null; setTimeout(() => { const f = $("#fb"); const sc2 = $("#sscroll"); if (f) sc2.scrollTo({ top: f.getBoundingClientRect().top - sc2.getBoundingClientRect().top + sc2.scrollTop - 70, behavior: "smooth" }); }, 420); }
    }
  }
  if (!sh.classList.contains("on")) { $("#sscroll").scrollTop = 0; requestAnimationFrame(() => sh.classList.add("on")); }
}
function render() {
  if (!$("#content")) return;
  const views = { semana: weekView, salidas: ridesView, grupeta: groupView, plan: planView };
  const ae = document.activeElement;
  if ((ae && ae.id === "ask-text") || wireAsk.busy) { if (location.hash) renderSheet(); return; }
  $("#content").innerHTML = (views[tab] || weekView)();
  wireAsk();
  $("#tt").textContent = { semana: "Coach", salidas: "Salidas", grupeta: "Grupeta", plan: "Plan" }[tab];
  if (tab === "grupeta") { wireGroup(); loadCommunity(); }
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  const pend = S.rides.filter(r => r.status === "pendiente").length, bd = $("#badge");
  bd.hidden = !pend; bd.textContent = pend;
  if ("setAppBadge" in navigator) { try { pend ? navigator.setAppBadge(pend) : navigator.clearAppBadge(); } catch {} }
  if (location.hash) renderSheet();
}
let toastT;
function toast(msg) { const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }

// Buscar salidas nuevas: botón con pausa entre búsquedas. Las salidas llegan solas cada 10 minutos.
let rfBusy = false, rfTimer = null;
const rfGap = () => (store.get("coach-rf-gap", 300)) * 1000;
const rfWait = () => Math.max(0, store.get("coach-rf-at", 0) + rfGap() - Date.now());
function rfTick() {
  const b = $("#rf"); if (!b) return;
  const w = rfWait();
  b.classList.toggle("busy", rfBusy); b.classList.toggle("cool", !rfBusy && w > 0);
  clearTimeout(rfTimer); if (w > 0) rfTimer = setTimeout(rfTick, Math.min(w, 30000) + 50);
}
const mins = s => { const m = Math.ceil(s / 60); return m <= 1 ? "un minuto" : m + " minutos"; };
async function refresh() {
  if (rfBusy) return;
  const w = rfWait();
  if (w > 0) { toast(`Las salidas nuevas llegan solas. Podrás buscar a mano en ${mins(w / 1000)}.`); return; }
  rfBusy = true; rfTick();
  const before = new Set(S.rides.map(r => r.id));
  const res = await callFn("refresh");
  if (res.ok) store.set("coach-rf-at", Date.now());
  else if (res.retry_in) store.set("coach-rf-at", Date.now() - rfGap() + res.retry_in * 1000);
  try { await loadAll(); render(); } catch {}
  rfBusy = false; rfTick();
  const nuevas = S.rides.filter(r => !before.has(r.id)).length;
  if (res.error === "no_autorizado") toast("Tu cuenta aún no está activada.");
  else if (nuevas) toast(nuevas === 1 ? "Una salida nueva" : `${nuevas} salidas nuevas`);
  else if (res.error === "espera") toast(`Acabas de buscar. Prueba en ${mins(res.retry_in)}.`);
  else if (res.error === "limite_dia") toast("Has llegado a las búsquedas de hoy. Tus salidas seguirán llegando solas.");
  else if (!res.ok) toast("No he podido buscar ahora. Prueba en un rato.");
  else if (res.reciente) toast("Ya lo estoy buscando: en unos minutos aparecerá.");
  else toast("Todo al día");
}
// Mensaje para los límites de uso del coach.
function limitMsg(res, what) {
  if (res.error === "limite_dia") return `Has llegado al máximo de ${what} de hoy (${res.max}). Mañana puedes seguir.`;
  if (res.error === "limite_global" || /usage limits|spend_limit/i.test(res.detail || "")) return "El coach está descansando: se ha llegado al uso previsto del grupo por ahora. Avisa a Manu.";
  return null;
}
function edgeSwipe(sh) {
  let x0 = null, dx = 0;
  sh.addEventListener("touchstart", e => { const x = e.touches[0].clientX; if (x < 28) { x0 = x; dx = 0; sh.classList.add("drag"); } }, { passive: true });
  sh.addEventListener("touchmove", e => { if (x0 === null) return; dx = Math.max(0, e.touches[0].clientX - x0); sh.style.transform = `translateX(${dx}px)`; }, { passive: true });
  sh.addEventListener("touchend", () => { if (x0 === null) return; x0 = null; sh.classList.remove("drag"); sh.style.transform = ""; if (dx > 90) history.back(); });
}

/* ---------- Fuerza: maniquí y formulario ---------- */
const ZONES = { hombros: "Hombros", pecho: "Pecho", biceps: "Bíceps", triceps: "Tríceps", antebrazos: "Antebrazos", abdomen: "Abdomen", oblicuos: "Oblicuos", trapecio: "Trapecio", espalda: "Espalda", lumbares: "Lumbares", gluteos: "Glúteos", cuadriceps: "Cuádriceps", isquios: "Isquios", aductores: "Aductores", gemelos: "Gemelos", tibiales: "Tibiales" };
const LEVELS = ["Sin trabajar", "Ligero", "Medio", "A tope"];
const PRESETS = {
  "Piernas": { cuadriceps: 3, gluteos: 3, isquios: 2, gemelos: 2, aductores: 1 },
  "Core": { abdomen: 3, oblicuos: 2, lumbares: 2 },
  "Tren superior": { pecho: 2, espalda: 2, hombros: 2, biceps: 2, triceps: 2, trapecio: 1 },
  "Completo": { cuadriceps: 2, gluteos: 2, isquios: 2, gemelos: 1, abdomen: 2, oblicuos: 1, lumbares: 1, pecho: 2, espalda: 2, hombros: 2, biceps: 1, triceps: 1 },
};
const KINDS = ["Sístole", "Gimnasio", "Core", "Movilidad", "Otro"];
function topZones(z) { return Object.entries(z || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => ZONES[k].toLowerCase()).join(", "); }
// Maniquí anatómico (diseño de Manu con Gemini). Cada zona: lista de trazados.
const SIL = 'M 110 16 C 122 16, 128 24, 127 38 C 127 49, 122 59, 118 63 C 117 69, 119 75, 126 79 C 136 83, 150 85, 157 93 C 163 101, 165 114, 165 130 C 165 144, 167 156, 169 167 C 173 182, 177 202, 179 224 C 183 233, 185 244, 183 253 C 181 259, 176 261, 173 257 C 171 253, 171 246, 170 241 C 168 243, 165 245, 163 242 C 162 238, 165 232, 168 226 C 164 206, 158 186, 154 168 C 151 154, 148 142, 145 134 C 145 148, 142 166, 140 183 C 141 196, 146 208, 148 224 C 150 246, 149 278, 144 312 C 147 334, 148 358, 142 384 C 139 396, 138 406, 139 415 C 144 424, 150 432, 150 439 C 149 444, 140 445, 132 443 C 127 441, 126 435, 127 427 C 128 421, 128 417, 127 413 C 124 394, 121 368, 122 342 C 123 328, 125 318, 124 310 C 121 286, 117 262, 114 238 C 113 234, 111 233, 110 233 C 109 233, 107 234, 106 238 C 103 262, 99 286, 96 310 C 95 318, 97 328, 98 342 C 99 368, 96 394, 93 413 C 92 417, 92 421, 93 427 C 94 435, 93 441, 88 443 C 80 445, 71 444, 70 439 C 70 432, 76 424, 81 415 C 82 406, 81 396, 78 384 C 72 358, 73 334, 76 312 C 71 278, 70 246, 72 224 C 74 208, 79 196, 80 183 C 78 166, 75 148, 75 134 C 72 142, 69 154, 66 168 C 62 186, 56 206, 52 226 C 55 232, 58 238, 57 242 C 55 245, 52 243, 50 241 C 49 246, 49 253, 47 257 C 44 261, 39 259, 37 253 C 35 244, 37 233, 41 224 C 43 202, 47 182, 51 167 C 53 156, 55 144, 55 130 C 55 114, 57 101, 63 93 C 70 85, 84 83, 94 79 C 101 75, 103 69, 102 63 C 98 59, 93 49, 93 38 C 92 24, 98 16, 110 16 Z';
const DET = { front: ['M 92 86 Q 101 89 108 88 M 128 86 Q 119 89 112 88', 'M 81 314 Q 86 318 91 314 M 129 314 Q 134 318 139 314'], back: ['M 81 317 Q 86 315 91 317 M 129 317 Q 134 315 139 317', 'M 86 388 L 86 414 M 134 388 L 134 414'] };
const FRONT = {
  hombros: ['M 82 86 C 72 86, 62 93, 59 106 C 58 114, 59 121, 62 124 C 67 116, 72 106, 77 98 C 80 93, 83 89, 82 86 Z', 'M 138 86 C 148 86, 158 93, 161 106 C 162 114, 161 121, 158 124 C 153 116, 148 106, 143 98 C 140 93, 137 89, 138 86 Z'],
  pecho: ['M 108 96 C 101 94, 91 94, 82 96 C 77 103, 76 113, 78 123 C 81 130, 91 133, 102 131 C 106 130, 108 126, 108 120 Z', 'M 112 96 C 119 94, 129 94, 138 96 C 143 103, 144 113, 142 123 C 139 130, 129 133, 118 131 C 114 130, 112 126, 112 120 Z'],
  biceps: ['M 63 126 C 58 132, 56 144, 57 156 C 58 162, 60 165, 63 163 C 67 157, 70 145, 69 134 C 68 128, 66 124, 63 126 Z', 'M 157 126 C 162 132, 164 144, 163 156 C 162 162, 160 165, 157 163 C 153 157, 150 145, 151 134 C 152 128, 154 124, 157 126 Z'],
  antebrazos: ['M 58 172 C 53 177, 49 190, 47 205 C 46 213, 46 218, 48 220 C 51 217, 55 208, 58 196 C 61 185, 62 175, 58 172 Z', 'M 162 172 C 167 177, 171 190, 173 205 C 174 213, 174 218, 172 220 C 169 217, 165 208, 162 196 C 159 185, 158 175, 162 172 Z'],
  abdomen: ['M 108 137 C 102 137, 96 139, 95 144 C 95 150, 96 155, 100 156 C 104 157, 108 156, 108 152 Z', 'M 112 137 C 118 137, 124 139, 125 144 C 125 150, 124 155, 120 156 C 116 157, 112 156, 112 152 Z', 'M 108 160 C 103 160, 97 161, 96 165 C 96 171, 97 177, 101 179 C 105 180, 108 178, 108 174 Z', 'M 112 160 C 117 160, 123 161, 124 165 C 124 171, 123 177, 119 179 C 115 180, 112 178, 112 174 Z', 'M 108 183 C 103 183, 98 184, 97 188 C 97 198, 101 210, 106 218 C 108 219, 108 214, 108 206 Z', 'M 112 183 C 117 183, 122 184, 123 188 C 123 198, 119 210, 114 218 C 112 219, 112 214, 112 206 Z'],
  oblicuos: ['M 81 139 C 85 139, 90 144, 91 153 C 92 165, 93 179, 95 191 C 96 198, 95 203, 92 204 C 86 199, 82 189, 82 178 C 81 165, 79 150, 81 139 Z', 'M 139 139 C 135 139, 130 144, 129 153 C 128 165, 127 179, 125 191 C 124 198, 125 203, 128 204 C 134 199, 138 189, 138 178 C 139 165, 141 150, 139 139 Z'],
  cuadriceps: ['M 78 228 C 74 242, 74 268, 78 294 C 80 302, 82 306, 84 302 C 86 286, 86 260, 84 238 C 83 231, 80 226, 78 228 Z', 'M 88 232 C 86 250, 86 276, 87 298 C 88 306, 92 308, 95 300 C 97 288, 97 268, 95 248 C 94 238, 91 230, 88 232 Z', 'M 142 228 C 146 242, 146 268, 142 294 C 140 302, 138 306, 136 302 C 134 286, 134 260, 136 238 C 137 231, 140 226, 142 228 Z', 'M 132 232 C 134 250, 134 276, 133 298 C 132 306, 128 308, 125 300 C 123 288, 123 268, 125 248 C 126 238, 129 230, 132 232 Z'],
  aductores: ['M 104 236 C 99 236, 97 242, 97 254 C 98 268, 99 280, 100 284 C 102 276, 104 260, 105 245 C 106 239, 106 236, 104 236 Z', 'M 116 236 C 121 236, 123 242, 123 254 C 122 268, 121 280, 120 284 C 118 276, 116 260, 115 245 C 114 239, 114 236, 116 236 Z'],
  tibiales: ['M 79 332 C 76 346, 76 368, 81 394 C 83 401, 85 403, 86 396 C 87 378, 88 354, 86 336 C 85 330, 81 328, 79 332 Z', 'M 141 332 C 144 346, 144 368, 139 394 C 137 401, 135 403, 134 396 C 133 378, 132 354, 134 336 C 135 330, 139 328, 141 332 Z'],
};
const BACK = {
  trapecio: ['M 110 74 C 104 75, 98 83, 86 89 C 89 96, 95 106, 99 120 C 102 132, 105 144, 110 152 C 115 144, 118 132, 121 120 C 125 106, 131 96, 134 89 C 122 83, 116 75, 110 74 Z'],
  hombros: ['M 82 88 C 72 88, 62 95, 59 108 C 58 115, 60 121, 63 123 C 68 117, 75 109, 81 100 C 84 95, 85 90, 82 88 Z', 'M 138 88 C 148 88, 158 95, 161 108 C 162 115, 160 121, 157 123 C 152 117, 145 109, 139 100 C 136 95, 135 90, 138 88 Z'],
  espalda: ['M 85 102 C 79 112, 77 126, 79 144 C 81 158, 85 170, 91 178 C 94 176, 97 166, 99 154 C 100 140, 97 124, 92 110 C 90 105, 87 101, 85 102 Z', 'M 135 102 C 141 112, 143 126, 141 144 C 139 158, 135 170, 129 178 C 126 176, 123 166, 121 154 C 120 140, 123 124, 128 110 C 130 105, 133 101, 135 102 Z'],
  lumbares: ['M 108 158 C 103 158, 99 164, 97 175 C 95 184, 95 192, 99 195 C 103 196, 108 195, 108 190 Z', 'M 112 158 C 117 158, 121 164, 123 175 C 125 184, 125 192, 121 195 C 117 196, 112 195, 112 190 Z'],
  triceps: ['M 63 125 C 58 132, 55 144, 56 158 C 57 164, 60 167, 64 164 C 68 157, 71 145, 70 133 C 69 127, 66 123, 63 125 Z', 'M 157 125 C 162 132, 165 144, 164 158 C 163 164, 160 167, 156 164 C 152 157, 149 145, 150 133 C 151 127, 154 123, 157 125 Z'],
  antebrazos: ['M 58 172 C 53 177, 49 190, 47 205 C 46 213, 46 218, 48 220 C 51 217, 55 208, 58 196 C 61 185, 62 175, 58 172 Z', 'M 162 172 C 167 177, 171 190, 173 205 C 174 213, 174 218, 172 220 C 169 217, 165 208, 162 196 C 159 185, 158 175, 162 172 Z'],
  gluteos: ['M 108 202 C 98 199, 85 202, 79 211 C 74 219, 75 231, 83 238 C 91 244, 102 243, 107 236 C 108 232, 108 214, 108 202 Z', 'M 112 202 C 122 199, 135 202, 141 211 C 146 219, 145 231, 137 238 C 129 244, 118 243, 113 236 C 112 232, 112 214, 112 202 Z'],
  isquios: ['M 81 246 C 77 258, 77 280, 82 302 C 84 310, 89 312, 93 306 C 97 294, 100 274, 100 254 C 99 246, 89 243, 81 246 Z', 'M 139 246 C 143 258, 143 280, 138 302 C 136 310, 131 312, 127 306 C 123 294, 120 274, 120 254 C 121 246, 131 243, 139 246 Z'],
  gemelos: ['M 80 330 C 75 340, 75 358, 80 376 C 82 382, 85 384, 86 378 C 87 364, 87 346, 85 334 C 84 330, 82 328, 80 330 Z', 'M 92 330 C 89 332, 88 346, 88 364 C 89 378, 90 384, 92 379 C 96 364, 97 346, 95 334 C 94 330, 93 329, 92 330 Z', 'M 140 330 C 145 340, 145 358, 140 376 C 138 382, 135 384, 134 378 C 133 364, 133 346, 135 334 C 136 330, 138 328, 140 330 Z', 'M 128 330 C 131 332, 132 346, 132 364 C 131 378, 130 384, 128 379 C 124 364, 123 346, 125 334 C 126 330, 127 329, 128 330 Z'],
};
function bodySvg(view, zones, label) {
  const map = view === "front" ? FRONT : BACK;
  return `<figure class="body"><svg viewBox="0 0 220 460" role="group" aria-label="${label}"><path class="base" d="${SIL}"/>${DET[view].map(d => `<path class="bdet" d="${d}"/>`).join("")}${Object.entries(map).map(([k, ps]) =>
    `<g class="zone l${zones[k] || 0}" data-z="${k}" role="button" tabindex="0" aria-label="${ZONES[k]}: ${LEVELS[zones[k] || 0]}">${ps.map(d => `<path d="${d}"/>`).join("")}${ps.map(d => `<path class="hit" d="${d}"/>`).join("")}</g>`).join("")}</svg><figcaption>${label}</figcaption></figure>`;
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
      err.textContent = limitMsg(res, "análisis") || { falta_clave: "El análisis aún no está configurado. Avisa a Manu.", no_autorizado: "Tu cuenta aún no está activada.", red: "Sin conexión. Tu texto sigue guardado; inténtalo en un momento." }[res.error] || `No se pudo analizar ahora (${res.error || "error"}). Tu texto sigue guardado; inténtalo otra vez.`;
      return;
    }
    store.del("coach-draft-" + r.id);
    const i = S.rides.findIndex(x => x.id === r.id);
    if (i >= 0) S.rides[i] = Object.assign({}, S.rides[i], { status: "analizada", analysis: res.analysis, feedback: { text } });
    try { await loadAll(); } catch {}
    render(); renderSheet(); $("#sscroll").scrollTo({ top: 0, behavior: "smooth" });
  };
}

/* ---------- Compartir una salida (imagen) ---------- */
let shareBlob = null;
function prepareShare(r) { shareBlob = { id: r.id, p: rideImage(r).catch(() => null) }; }
async function shareRide(r) {
  if (!shareBlob || shareBlob.id !== r.id) prepareShare(r);
  const blob = await shareBlob.p;
  const d = pd(r.date), title = `${r.title || "Salida"} · ${d.getDate()} ${MON[d.getMonth()]}`;
  const file = blob && new File([blob], `salida-${r.date}.png`, { type: "image/png" });
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return; }
    if (navigator.share) { await navigator.share({ title, text: shareText(r) }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  if (blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `salida-${r.date}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  else toast("No se pudo preparar la imagen.");
}
function shareText(r) {
  const m = r.metrics || {}, d = pd(r.date);
  return `${r.title || "Salida"} (${d.getDate()} ${MON[d.getMonth()]}): ${m.km ?? "–"} km, ${m.elev_m ?? "–"} m, ${m.moving || ""}${m.np_w ? `, ${m.np_w} W NP` : ""}.${r.analysis?.lectura ? "\n\nCoach: " + r.analysis.lectura.replace(/\*\*/g, "") : ""}`;
}
function wrapLines(ctx, text, maxW, maxLines) {
  const words = String(text).replace(/\*\*/g, "").split(/\s+/), out = []; let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; if (out.length === maxLines) break; } else line = t; }
  if (out.length < maxLines && line) out.push(line);
  if (out.length === maxLines && words.join(" ").length > out.join(" ").length + 1) { let l = out[maxLines - 1]; while (ctx.measureText(l + "…").width > maxW) l = l.replace(/\s*\S+$/, ""); out[maxLines - 1] = l + "…"; }
  return out;
}
async function rideImage(r) {
  const W = 1080, H = 1350, P = 84, m = r.metrics || {}, d = pd(r.date);
  try { await Promise.all([document.fonts.load("600 80px 'Barlow Condensed'"), document.fonts.load("400 34px Inter"), document.fonts.load("600 34px Inter")]); } catch {}
  const DISP = "'Barlow Condensed','Arial Narrow',sans-serif", BODY = "Inter,-apple-system,system-ui,sans-serif";
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1d4640"); g.addColorStop(1, "#14332e"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  // Perfil de montaña de fondo
  x.strokeStyle = "rgba(159,224,184,.18)"; x.lineWidth = 6; x.beginPath(); x.moveTo(0, 300); [[160, 220], [300, 270], [470, 120], [620, 230], [760, 170], [900, 250], [1080, 190]].forEach(([a, b]) => x.lineTo(a, b)); x.stroke();
  const logo = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = "icons/icon-192.png"; });
  if (logo) { x.save(); x.beginPath(); x.roundRect(P, P, 92, 92, 22); x.clip(); x.drawImage(logo, P, P, 92, 92); x.restore(); }
  x.fillStyle = "#fff"; x.font = `600 40px ${DISP}`; x.fillText("COACH TIKISMIKIS", P + 116, P + 44);
  x.fillStyle = "rgba(255,255,255,.65)"; x.font = `400 28px ${BODY}`; x.fillText(`${DAYS[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${m.discipline === "mtb" ? "MTB" : "Carretera"}`, P + 116, P + 84);
  x.fillStyle = "#fff"; x.font = `600 96px ${DISP}`;
  let y = 330; for (const l of wrapLines(x, r.title || "Salida", W - 2 * P, 2)) { x.fillText(l, P, y); y += 92; }
  const stats = [[m.km != null ? m.km + " km" : null, "distancia"], [m.elev_m != null ? m.elev_m + " m" : null, "desnivel"], [m.moving || null, "en movimiento"], [m.np_w ? m.np_w + " W" : null, "potencia normalizada"], [m.if != null ? dec(m.if) : null, "intensidad (IF)"], [m.load != null ? String(m.load) : null, "carga"]].filter(s => s[0]);
  y += 20; const cw = (W - 2 * P - 24) / 2;
  stats.slice(0, 6).forEach((s, i) => { const cx = P + (i % 2) * (cw + 24), cy = y + Math.floor(i / 2) * 128;
    x.fillStyle = "rgba(255,255,255,.07)"; x.beginPath(); x.roundRect(cx, cy, cw, 112, 20); x.fill();
    x.fillStyle = "#fff"; x.font = `600 58px ${DISP}`; x.fillText(s[0], cx + 28, cy + 64); x.fillStyle = "rgba(255,255,255,.6)"; x.font = `400 26px ${BODY}`; x.fillText(s[1], cx + 28, cy + 96); });
  y += Math.ceil(Math.min(stats.length, 6) / 2) * 128 + 34;
  const ref = (r.climbs || []).find(c => c.median_time);
  if (ref) { x.fillStyle = "#9fe0b8"; x.font = `600 30px ${BODY}`; x.fillText(`${ref.label}: ${ref.time}${ref.rank ? ` · ${ref.rank}.º mejor tiempo de ${ref.of}` : ""}`, P, y); y += 56; }
  const txt = r.analysis?.lectura;
  if (txt && y < H - 260) {
    x.fillStyle = "#9fe0b8"; x.font = `600 24px ${BODY}`; x.fillText("LECTURA DEL COACH", P, y); y += 48;
    x.fillStyle = "rgba(255,255,255,.9)"; x.font = `400 32px ${BODY}`;
    for (const l of wrapLines(x, txt, W - 2 * P, Math.max(1, Math.floor((H - 130 - y) / 46)))) { x.fillText(l, P, y); y += 46; }
  }
  x.fillStyle = "rgba(255,255,255,.45)"; x.font = `400 24px ${BODY}`; x.fillText("Tikismikis MTB & Road · Córdoba · Coach en beta", P, H - P + 20);
  return await new Promise(res => c.toBlob(res, "image/png"));
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
  if (S.profile && !S.profile.onboarded) { showWelcome(0); return; }
  const later = Date.now() - store.get("coach-connect-later", 0) < 3 * 864e5;
  if (S.profile && !S.profile.intervals_connected && !later) { showConnect(); return; }
  render(); subscribe(); consumeNav(); markSeen();
}
let entered = false;
// Al abrir desde un aviso: ir a la salida y bajar hasta "Cuéntame qué tal".
let goFb = /^#r-/.test(location.hash) ? location.hash.slice(3) : null;
function openFromNotification(url) {
  const h = new URL(url, location.href).hash; if (!h) return;
  if (h.startsWith("#r-")) goFb = h.slice(3);
  if (location.hash === h) history.replaceState({ s: h.slice(1) }, "", h); else history.pushState({ s: h.slice(1) }, "", h);
  if ($("#sheet")) { if ($("#sheet").classList.contains("on") && $("#scontent").dataset.id === goFb) $("#scontent").dataset.id = ""; renderSheet(); }
}
async function consumeNav() {
  try { const c = await caches.open("coach-nav"), m = await c.match("nav"); if (!m) return; const u = await m.text(); await c.delete("nav"); openFromNotification(u); } catch {}
}
const holdEnter = /[?&]state=/.test(location.search);
sb.auth.onAuthStateChange((ev, s) => {
  session = s;
  if (s && !entered && !holdEnter) { entered = true; enter(); }
  if (!s && ev === "SIGNED_OUT") { entered = false; store.del("coach-cache"); S.rides = []; S.weeks = {}; S.plan = null; S.profile = null; if (channel) sb.removeChannel(channel); showLogin(); }
});
(async () => {
  if ("serviceWorker" in navigator) { const had = !!navigator.serviceWorker.controller; navigator.serviceWorker.register("sw.js").catch(() => {}); let reloaded = false; navigator.serviceWorker.addEventListener("controllerchange", () => { if (had && !reloaded) { reloaded = true; location.reload(); } }); }
  navigator.serviceWorker?.addEventListener("message", e => { if (e.data?.type === "open" && e.data.url) openFromNotification(e.data.url); });
  if (await handleOAuthReturn()) return;
  const { data } = await sb.auth.getSession();
  session = data.session;
  if (session) { if (!entered) { entered = true; enter(); } return; }
  if (isIOS && !standalone && !store.get("coach-skip-install", 0)) showInstall(); else showLogin();
})();
document.addEventListener("visibilitychange", async () => { if (document.visibilityState === "visible" && session) { consumeNav(); markSeen(); try { await loadAll(); render(); } catch {} } });
})();
