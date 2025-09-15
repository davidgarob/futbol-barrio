// js/ui.js — Tabs, intro, setup, draft, liga y jornada (versión estable)

// --------- IMPORTS ---------
import {
  CRESTS,
  sampleForRole,
  jugadoresPool,
  RIVALS,
  updateTable,
  standingsSorted,
  simulateAIRound,
  setUserPower,
  createLeagueWithFixtures,
} from './data.js';

import { simularPartido, DEFAULT_EVENTS, teamPowerFromRoster } from './engine.js';


// --------- ESTADO GLOBAL ---------
export const career = {
  teamName: "",
  crestId: "",
  plantilla: [],
  coins: 12,
  league: null,          // { user, teams, power, fixtures, jornada, totalJornadas }
};

// --------- HELPERS COMUNES ---------
function showScreen(id){
  // Muestra un contenedor por id y oculta el resto de [id^=screen-] + tabs-root
  document.querySelectorAll("[id^='screen-']").forEach(d => d.style.display = "none");
  const tabsRoot = document.getElementById("tabs-root");
  if (tabsRoot) tabsRoot.style.display = "none";
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}

function formatCoins(n){ return `${n} 💰`; }
function getPlayerById(id){ return jugadoresPool.find(j => j.id === id); }
function nombreAleatorio() {
  const pref = ["Atlético", "Racing", "Deportivo", "UD", "CD", "Real", "Peña"];
  const suf = ["del Polígono", "de la Charca", "del Barato", "de la Feria", "del Puerto", "del Barrio"];
  return `${pref[Math.floor(Math.random()*pref.length)]} ${suf[Math.floor(Math.random()*suf.length)]}`;
}

function playerCardHTML(p, selected){
  const sel = selected ? 'border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,0.25);' : '';
  return `
    <div class="card" data-id="${p.id}" style="
      width:220px; border:2px solid ${selected?'#2563eb':'#ddd'}; border-radius:12px; 
      padding:10px; cursor:pointer; background:#fff; ${sel}
    ">
      <div style="font-size:12px; opacity:.7; margin-bottom:4px;">${p.rol}</div>
      <div style="font-weight:700; margin-bottom:6px;">${p.nombre}</div>
      <div style="font-size:13px; margin-bottom:8px;">${p.blurb || 'Jugador de barrio.'}</div>
      <div style="display:flex; gap:6px; align-items:center; justify-content:space-between;">
        <span style="font-size:12px; background:#eee; border-radius:999px; padding:2px 8px;">Tier ${p.tier ?? '-'}</span>
        <span style="font-weight:700;">${p.salario ?? 2}💰</span>
      </div>
    </div>
  `;
}

// --------- SETTINGS (solo para tips) ---------
const SETTINGS_KEY = "barrio_settings_prefs";
let settings = loadSettings();
function loadSettings(){
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { showTips:true }; }
  catch{ return { showTips:true }; }
}
function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

function tipHTML(text){
  if(!settings.showTips) return "";
  return `<div class="tip" style="margin:8px 0; padding:8px 10px; border-left:4px solid #60a5fa; background:#eef6ff; border-radius:6px;">
    ${text} ${tipToggleHTML()}
  </div>`;
}
function tipToggleHTML(){
  return `<label style="float:right; font-size:12px; opacity:.85;">
    <input type="checkbox" id="tip-toggle" ${settings.showTips?'':'checked'} style="vertical-align:middle; margin-right:4px;">
    No volver a mostrar
  </label>`;
}
function wireTipToggle(root){
  const t = root.querySelector("#tip-toggle");
  if(!t) return;
  t.addEventListener("change", ()=>{
    settings.showTips = !t.checked; // checked = no mostrar
    saveSettings();
    root.querySelectorAll(".tip").forEach(el => el.style.display="none");
  });
}

// --------- INTRO (3 slides con imagen) ---------
function renderIntro(){
  const slides = [
    {
      title:"El presi te pasa el testigo",
      body:"Chaval, me jubilo. Te dejo el club… poco presupuesto, campo con baches y deuda con El Tano. ¡Éxitos!",
      img:"assets/presi.png", alt:"Presidente del club, traje arrugado y puro"
    },
    {
      title:"Tu objetivo",
      body:"Liga a una vuelta. Ficha con cuatro perras, gana partidos y que no detengan a nadie. Fácil, ¿no?",
      img:"assets/presi.png", alt:"Presi señalando el calendario"
    },
    {
      title:"Cómo se juega",
      body:"Nombre + escudo → Draft por rondas (cuida el presupuesto) → Juega jornada a jornada.",
      img:"assets/presi.png", alt:"Presi explicando con una pizarra"
    }
  ];
  let i = 0;
  const root = document.getElementById("screen-intro");
  root.innerHTML = layout(slides[i]);
  wire();

  function layout(s){
    const imgBlock = s.img ? `
      <div class="intro-ill">
        <img src="${s.img}" alt="${s.alt || 'Ilustración'}" onerror="this.style.display='none'">
      </div>` : "";

    return `
      <div class="intro-wrap" style="max-width: 860px; margin: 0 auto; display:flex; gap:16px; align-items:center;">
        ${imgBlock}
        <div class="intro-copy">
          <h1 style="margin-bottom:6px;">${s.title}</h1>
          <p style="font-size:15px; opacity:.9; margin:0 0 12px;">${s.body}</p>
          <div class="intro-actions" style="display:flex; gap:8px; align-items:center;">
            <button id="btn-prev" ${i===0?'disabled':''}>⬅️ Anterior</button>
            <button id="btn-next">${i===slides.length-1?'Empezar ▶️':'Siguiente ➡️'}</button>
            <button id="btn-skip" class="ghost" style="margin-left:auto;">Saltar ⏭️</button>
          </div>
        </div>
      </div>
    `;
  }
  function wire(){
    const btnPrev = root.querySelector("#btn-prev");
    const btnNext = root.querySelector("#btn-next");
    const btnSkip = root.querySelector("#btn-skip");

    if(btnPrev) btnPrev.onclick = ()=>{
      if(i>0){ i--; root.innerHTML = layout(slides[i]); wire(); }
    };
    btnNext.onclick = ()=>{
      if(i<slides.length-1){
        i++; root.innerHTML = layout(slides[i]); wire();
      } else {
        showScreen("screen-setup"); renderSetup();
      }
    };
    btnSkip.onclick = ()=>{
      showScreen("screen-setup"); renderSetup();
    };
  }
}

// --------- PANTALLA: SETUP (nombre + escudo) ---------
function renderSetup(){
  const root = document.getElementById("screen-setup");
  root.innerHTML = `
    <h1>⚽ Football Manager de Barrio</h1>
    <p>Elige el nombre de tu equipo y un escudo:</p>
    <div style="margin:1em 0;">
      <label>Nombre del equipo:<br>
        <input id="input-teamname" type="text" placeholder="Ej: Racing del Polígono" style="padding:6px; width:260px;">
      </label>
    </div>
    <div id="crest-options" style="display:flex; gap:12px; flex-wrap:wrap; margin:1em 0;"></div>
    <button id="btn-continue" disabled>Continuar ➡️</button>
  `;
  root.innerHTML += tipHTML("🛈 Consejo: si dejas el nombre vacío te proponemos uno random; puedes cambiarlo reiniciando.");
  wireTipToggle(root);

  const crestBox = root.querySelector("#crest-options");
  CRESTS.forEach(c=>{
    const div = document.createElement("div");
    div.style.textAlign = "center";
    div.innerHTML = `
      <img src="${c.src}" alt="${c.name}" width="64" height="64"
           style="border:2px solid transparent; border-radius:8px; cursor:pointer; object-fit:cover;">
      <div style="font-size:12px;">${c.name}</div>
    `;
    const img = div.querySelector("img");
    img.addEventListener("error", () => {
      img.removeAttribute('src');
      img.style.width = '64px';
      img.style.height = '64px';
      img.style.background = '#ddd';
      img.title = c.name + ' (sin imagen)';
    });
    img.onclick = () => {
      crestBox.querySelectorAll("img").forEach(i => i.style.borderColor = "transparent");
      img.style.borderColor = "blue";
      career.crestId = c.id;
      checkContinue();
    };
    crestBox.appendChild(div);
  });

  const inputName = root.querySelector("#input-teamname");
  inputName.addEventListener("input", checkContinue);

  function checkContinue(){
    const btn = root.querySelector("#btn-continue");
    career.teamName = inputName.value.trim();
    btn.disabled = !(career.teamName && career.crestId);
  }

  root.querySelector("#btn-continue").onclick = ()=>{
    if(!career.teamName) career.teamName = nombreAleatorio();
    showScreen("screen-draft");
    renderDraft(); // Porteros
  };
}

// --------- DRAFT: RONDA 1 (PORTERO 1 de 4) ---------
function renderDraft(){
  const root = document.getElementById("screen-draft");
  if(!root) throw new Error("Falta <div id='screen-draft'> en index.html");

  const opcionesGK = sampleForRole("GK", 4);
  let selectedId = null;

  root.innerHTML = `
    <h2 style="margin:0 0 8px;">Draft — Ronda 1/4: Portero</h2>
    <div style="margin: 0 0 10px; font-size:14px;">
      <strong>Equipo:</strong> ${career.teamName || 'Tu equipo'} 
      — <strong>Presupuesto:</strong> <span id="coins">${formatCoins(career.coins)}</span>
    </div>
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin:10px 0;" id="cards"></div>

    <div style="display:flex; gap:8px; align-items:center; margin-top:12px;">
      <button id="btn-confirm" disabled>Confirmar portero ✅</button>
      <button id="btn-cancel">⬅️ Volver</button>
      <span id="warn" style="color:#b91c1c; font-size:13px; display:none;">No te llega el presupuesto para este jugador.</span>
    </div>

    <hr style="margin:16px 0;">
    <div id="next" style="display:none;">
      <h3>Ronda 2: Defensas (elige 2)</h3>
      <button id="btn-next">Ir a la siguiente ronda ➡️</button>
    </div>
  `;

  const $cards = root.querySelector("#cards");
  const $coins = root.querySelector("#coins");
  const $btnConfirm = root.querySelector("#btn-confirm");
  const $btnCancel = root.querySelector("#btn-cancel");
  const $warn = root.querySelector("#warn");
  const $next = root.querySelector("#next");

  $next.insertAdjacentHTML("beforebegin", tipHTML("🛈 Consejo: el salario descuenta del presupuesto. Piensa en las rondas futuras."));
  wireTipToggle(root);

  $cards.innerHTML = opcionesGK.map(p => playerCardHTML(p, false)).join("");

  $cards.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      $cards.querySelectorAll(".card").forEach(c => {
        c.style.borderColor = "#ddd";
        c.style.boxShadow = "none";
      });
      card.style.borderColor = "#2563eb";
      card.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.25)";
      selectedId = card.getAttribute("data-id");
      const p = getPlayerById(selectedId);
      const coste = p?.salario ?? 2;
      if(coste > career.coins){
        $btnConfirm.disabled = true;
        $warn.style.display = "inline";
      } else {
        $btnConfirm.disabled = false;
        $warn.style.display = "none";
      }
    });
  });

  $btnConfirm.addEventListener("click", () => {
    if(!selectedId) return;
    const p = getPlayerById(selectedId);
    const coste = p?.salario ?? 2;
    if(coste > career.coins){
      $warn.style.display = "inline";
      return;
    }
    career.plantilla.push(selectedId);
    career.coins -= coste;
    $coins.textContent = formatCoins(career.coins);

    $btnConfirm.disabled = true;
    $cards.querySelectorAll(".card").forEach(c => c.style.pointerEvents = "none");
    $next.style.display = "block";

    root.querySelector("#btn-next").onclick = () => {
      showScreen("screen-draft");
      renderDraftDefensas();
    };
  });

  $btnCancel.addEventListener("click", () => {
    showScreen("screen-setup");
    renderSetup();
  });
}

// ============================================================
// DRAFT GENÉRICO (multi-selección) para DEF, MID, ATK
// ============================================================
function renderDraftRoundMulti({ 
  title, role, need, optionsCount, nextTitle, onNext 
}){
  const root = document.getElementById("screen-draft");
  if(!root) throw new Error("Falta #screen-draft");

  const opciones = sampleForRole(role, optionsCount);
  const selected = new Set();

  root.innerHTML = `
    <h2 style="margin:0 0 8px;">${title}</h2>
    <div style="margin: 0 0 10px; font-size:14px;">
      <strong>Equipo:</strong> ${career.teamName || 'Tu equipo'}
      — <strong>Presupuesto:</strong> <span id="coins">${formatCoins(career.coins)}</span>
      — <strong>Seleccionados:</strong> <span id="picked">0</span> / ${need}
    </div>
    <div id="cards" style="display:flex; gap:12px; flex-wrap:wrap; margin:10px 0;"></div>

    <div style="display:flex; gap:8px; align-items:center; margin-top:12px;">
      <button id="btn-confirm" disabled>Confirmar ${need} ${role}</button>
      <button id="btn-cancel">⬅️ Volver</button>
      <span id="warn" style="color:#b91c1c; font-size:13px; display:none;">No te llega el presupuesto o te faltan jugadores.</span>
    </div>

    <hr style="margin:16px 0;">
    <div id="next" style="display:none;">
      <h3>${nextTitle}</h3>
      <button id="btn-next">Siguiente ronda ➡️</button>
    </div>
  `;

  const $cards = root.querySelector("#cards");
  const $coins = root.querySelector("#coins");
  const $picked = root.querySelector("#picked");
  const $btnConfirm = root.querySelector("#btn-confirm");
  const $btnCancel = root.querySelector("#btn-cancel");
  const $warn = root.querySelector("#warn");
  const $next = root.querySelector("#next");

  $cards.insertAdjacentHTML("beforebegin", tipHTML("🛈 Consejo: puedes quitar una carta clicando de nuevo si te pasas del cupo."));
  wireTipToggle(root);

  $cards.innerHTML = opciones.map(p => playerCardHTML(p, false)).join("");

  $cards.querySelectorAll(".card").forEach(card=>{
    card.addEventListener("click", ()=>{
      const id = card.getAttribute("data-id");
      if(selected.has(id)){
        selected.delete(id);
        card.style.borderColor = "#ddd";
        card.style.boxShadow = "none";
      } else {
        if(selected.size >= need) return;
        selected.add(id);
        card.style.borderColor = "#2563eb";
        card.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.25)";
      }
      $picked.textContent = String(selected.size);
      validate();
    });
  });

  function selectedCost(){
    let sum = 0;
    selected.forEach(id => {
      const p = getPlayerById(id);
      sum += (p?.salario ?? 2);
    });
    return sum;
  }

  function validate(){
    const okCount = selected.size === need;
    const okBudget = selectedCost() <= career.coins;
    $btnConfirm.disabled = !(okCount && okBudget);
    $warn.style.display = (okCount && okBudget) ? "none" : "inline";
  }

  $btnConfirm.addEventListener("click", ()=>{
    if(selected.size !== need) return;
    const coste = selectedCost();
    if(coste > career.coins) { validate(); return; }

    selected.forEach(id => career.plantilla.push(id));
    career.coins -= coste;
    $coins.textContent = formatCoins(career.coins);

    $cards.querySelectorAll(".card").forEach(c => c.style.pointerEvents = "none");
    $btnConfirm.disabled = true;
    $next.style.display = "block";

    root.querySelector("#btn-next").onclick = onNext;
  });

  $btnCancel.addEventListener("click", ()=>{
    showScreen("screen-setup");
    renderSetup();
  });
}

function renderDraftDefensas(){
  renderDraftRoundMulti({
    title: "Draft — Ronda 2/4: Defensas (elige 2)",
    role: "DEF",
    need: 2,
    optionsCount: 6,
    nextTitle: "Ronda 3/4: Medios (elige 2)",
    onNext: () => {
      showScreen("screen-draft");
      renderDraftMedios();
    }
  });
}

function renderDraftMedios(){
  renderDraftRoundMulti({
    title: "Draft — Ronda 3/4: Medios (elige 2)",
    role: "MID",
    need: 2,
    optionsCount: 6,
    nextTitle: "Ronda 4/4: Delantero (elige 1)",
    onNext: () => {
      showScreen("screen-draft");
      renderDraftDelantero();
    }
  });
}

function renderDraftDelantero(){
  renderDraftRoundMulti({
    title: "Draft — Ronda 4/4: Delantero (elige 1)",
    role: "ATK",
    need: 1,
    optionsCount: 4,
    nextTitle: "¡Draft completado! Ir a pestañas",
    onNext: () => {
      // Crear liga con fixtures y saltar a tabs
      if (!career.league) {
        career.league = createLeagueWithFixtures(career.teamName, RIVALS);
      }
      mountTabs();
    }
  });
}

// --------- TABS ---------
const TAB_KEY = "barrio_active_tab";
function setActiveTab(tab){
  localStorage.setItem(TAB_KEY, tab);
  document.querySelectorAll("#tabs-nav .tab").forEach(b=>{
    b.classList.toggle("active", b.getAttribute("data-tab") === tab);
  });
  document.querySelectorAll(".tab-panel").forEach(p=>p.style.display="none");
  const el = document.getElementById(`tab-${tab}`);
  if(el) el.style.display = "block";
}
function getActiveTab(){ return localStorage.getItem(TAB_KEY) || "equipo"; }

function mountTabsNav(){
  const nav = document.getElementById("tabs-nav");
  if(!nav) return;
  nav.querySelectorAll(".tab").forEach(b=>{
    b.onclick = ()=>{
      const tab = b.getAttribute("data-tab");
      setActiveTab(tab);
      if(tab === "equipo")   renderTabEquipo();
      if(tab === "liga")     renderTabLiga();
      if(tab === "jornada")  renderTabJornada();
    };
  });
}

function mountTabs(){
  const root = document.getElementById("tabs-root");
  if (!root) { console.error("Falta #tabs-root en index.html"); return; }
  root.style.display = "block";
  showScreen("tabs-root");
  mountTabsNav();
  setActiveTab(getActiveTab());
  // primer render
  const active = getActiveTab();
  if(active === "liga") renderTabLiga();
  else if(active === "jornada") renderTabJornada();
  else renderTabEquipo();
}

// ---- Render de cada pestaña ----
function renderTabEquipo(){
  const root = document.getElementById("tab-equipo");
  if(!root) return;

  // Agrupa por rol
  const byRole = { GK:[], DEF:[], MID:[], ATK:[] };
  career.plantilla.map(id => jugadoresPool.find(j=>j.id===id)).filter(Boolean)
    .forEach(p => byRole[p.rol]?.push(p));

  function listRole(role, arr){
    if(!arr || !arr.length) return `<p><strong>${role}:</strong> —</p>`;
    return `
      <p><strong>${role} (${arr.length}):</strong></p>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        ${arr.map(p => `
          <div style="border:1px solid #ddd; border-radius:10px; padding:8px 10px;">
            <div style="font-size:12px; opacity:.7;">${p.rol}</div>
            <div style="font-weight:700;">${p.nombre}</div>
            <div style="font-size:12px;">${p.blurb || ""}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  root.innerHTML = `
    <h2>${career.teamName}</h2>
    <p><strong>Presupuesto:</strong> ${career.coins} 💰</p>
    ${listRole("GK", byRole.GK)}
    ${listRole("DEF", byRole.DEF)}
    ${listRole("MID", byRole.MID)}
    ${listRole("ATK", byRole.ATK)}

    <div style="margin-top:12px;">
      <button id="btn-rehacer">Rehacer draft 🔄</button>
    </div>
  `;

  const btnRehacer = root.querySelector("#btn-rehacer");
  if(btnRehacer){
    btnRehacer.onclick = ()=>{
      if(!confirm("¿Seguro que quieres rehacer el draft?")) return;
      career.plantilla = [];
      career.coins = 12;
      career.league = null;
      document.getElementById("tabs-root").style.display = "none";
      showScreen("screen-draft");
      renderDraft();
    };
  }
}

function renderTabLiga(){
  const root = document.getElementById("tab-liga");
  if(!root) return;
  if(!career.league){
    root.innerHTML = `<p>Configura tu equipo para ver la liga.</p>`;
    return;
  }

  function tableHTML(){
    const rows = standingsSorted(career.league).map(t => `
      <tr>
        <td>${t.name}</td><td>${t.pj}</td><td>${t.pg}</td><td>${t.pe}</td><td>${t.pp}</td>
        <td>${t.gf}</td><td>${t.gc}</td><td>${t.gf - t.gc}</td><td><strong>${t.pts}</strong></td>
      </tr>`).join("");
    return `
      <table style="border-collapse:collapse; width:100%; max-width:760px;">
        <thead>
          <tr><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // Calendario completo
  const fixtures = career.league.fixtures || [];
  const byRound = {};
  fixtures.forEach(f => {
    byRound[f.round] = byRound[f.round] || [];
    byRound[f.round].push(f);
  });
  const calRounds = Object.keys(byRound).sort((a,b)=>a-b).map(n=>{
    const rows = byRound[n].map(f=>`<div>${f.home} vs ${f.away}</div>`).join("");
    return `<details ${Number(n)===career.league.jornada ? 'open':''}>
      <summary>Jornada ${n}</summary>
      <div style="padding:6px 12px;">${rows}</div>
    </details>`;
  }).join("");

  root.innerHTML = `
    <h2>Clasificación</h2>
    ${tableHTML()}
    <hr style="margin:14px 0;">
    <h3>Calendario</h3>
    ${calRounds}
  `;
}

function renderTabJornada(){
  const root = document.getElementById("tab-jornada");
  if(!root) return;
  if(!career.league){
    root.innerHTML = `<p>Configura tu equipo para jugar la liga.</p>`;
    return;
  }

  const matches = (career.league.fixtures || []).filter(f => f.round === career.league.jornada);
  const mi = matches.find(m => m.home === career.teamName || m.away === career.teamName);
  const lista = matches.map(m => {
    const isMine = (mi && m.home===mi.home && m.away===mi.away);
    return `<div ${isMine? 'style="font-weight:700;"':''}>${m.home} vs ${m.away}${isMine?'  ← Tú':''}</div>`;
  }).join("");
  const nextRival = mi ? (mi.home === career.teamName ? mi.away : mi.home) : "—";

  root.innerHTML = `
    <h2>Jornada ${Math.min(career.league.jornada, career.league.totalJornadas)} / ${career.league.totalJornadas}</h2>
    <div style="margin-bottom:8px;">
      <strong>Tu partido:</strong> ${mi ? `${mi.home} vs ${mi.away}` : '—'}
    </div>
    <div style="margin-bottom:10px;">
      <strong>Partidos de la jornada</strong><br>${lista || '—'}
    </div>
    <div style="margin-bottom:10px;">
      <strong>Siguiente rival:</strong> ${nextRival}
    </div>
    <button id="btn-jugar-jornada">Jugar jornada ▶️</button>
  `;

  const btn = root.querySelector("#btn-jugar-jornada");
  if(career.league.jornada > career.league.totalJornadas){
    btn.textContent = "Liga finalizada ✔️";
    btn.disabled = true;
    return;
  }

  btn.onclick = ()=>{
  if(!mi){ alert("¡Liga terminada!"); return; }

  // Recalcula power del usuario según plantilla
  const myRoster = career.plantilla.map(id => jugadoresPool.find(j=>j.id===id)).filter(Boolean);
  const myPower = teamPowerFromRoster(myRoster);
  setUserPower(career.league, myPower);

  const soyLocal = (mi.home === career.teamName);
  const equipoT = { nombre: mi.home, moral: 7, local: true,  jugadores: soyLocal ? myRoster : sampleRivalSquad() };
  const equipoR = { nombre: mi.away, moral: 5, local: false, jugadores: soyLocal ? sampleRivalSquad() : myRoster };

  // Abre visor secuencial; al terminar, actualizamos tabla y resto de la jornada
  showMatchViewer({
    homeTeam: equipoT,
    awayTeam: equipoR,
    opts: { N: 12 }, // puedes subir/bajar jugadas
    onFinish: ({ score /*, log*/ })=>{
      updateTable(career.league, mi.home, mi.away, score);
      simulateAIRound(career.league, (career.league.fixtures||[]).filter(f => f.round === career.league.jornada));
      career.league.jornada++;
      renderTabLiga();
      renderTabJornada();
    }
  });
};

  function sampleRivalSquad(){
    const gk  = sampleForRole("GK", 1);
    const dfs = sampleForRole("DEF", 2);
    const mfs = sampleForRole("MID", 2);
    const atk = sampleForRole("ATK", 1);
    return [...gk, ...dfs, ...mfs, ...atk];
  }
}

// --------- MODAL LOG DE PARTIDO ---------
function showMatchLogModal(home, away, res){
  let m = document.getElementById("match-modal");
  if(!m){
    m = document.createElement("div");
    m.id = "match-modal";
    m.style = "position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:9999;";
    document.body.appendChild(m);
  }
  const score = `${res.score.home} - ${res.score.away}`;
  m.innerHTML = `
    <div style="background:#fff; width:min(720px,90vw); max-height:80vh; border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,.2); display:flex; flex-direction:column;">
      <div style="padding:12px 16px; border-bottom:1px solid #eee; display:flex; gap:12px; align-items:center;">
        <strong>${home}</strong> vs <strong>${away}</strong>
        <span style="margin-left:auto; font-weight:700;">${score}</span>
      </div>
      <div style="padding:12px 16px; overflow:auto; line-height:1.5; font-size:14px;">
        ${res.log.map(line => `<div>${line}</div>`).join("")}
      </div>
      <div style="padding:12px 16px; border-top:1px solid #eee; display:flex; justify-content:flex-end;">
        <button id="match-close">Cerrar</button>
      </div>
    </div>
  `;
  m.onclick = (e)=>{ if(e.target === m){ m.remove(); } };
  m.querySelector("#match-close").onclick = ()=> m.remove();
}

// --------- ARRANQUE ---------
// SIEMPRE empezamos por la intro (como pediste)
showScreen("screen-intro");
renderIntro();





