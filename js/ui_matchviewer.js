// js/ui_matchviewer.js — Visor secuencial con Play/Pause/Speed

import { startMatch, nextPlay } from './engine_steps.js';

export function showMatchViewer({ homeTeam, awayTeam, opts, onFinish }){
  let state = startMatch(homeTeam, awayTeam, opts);
  let playing = false;
  let speedMs = 700; // x1 ~ 0.7s por jugada
  let timer = null;

  const modal = ensureModal();
  renderModal(modal, state);

  const $play = modal.querySelector("#mv-play");
  const $next = modal.querySelector("#mv-next");
  const $speed= modal.querySelector("#mv-speed");
  const $close= modal.querySelector("#mv-close");
  const $log  = modal.querySelector("#mv-log");
  const $score= modal.querySelector("#mv-score");

  function step(){
    const res = nextPlay(state);
    appendLine($log, res.line);
    $score.textContent = `${res.score.home} - ${res.score.away}`;
    autoscroll($log);

    if(res.finished){
      stop();
      modal.dataset.finished = "1";
      if(typeof onFinish === "function"){
        onFinish({ score: res.score, log: [...state.log] });
      }
      $play.disabled = true;
      $next.disabled = true;
    }
  }

  function play(){
    if (playing) return;
    playing = true;
    $play.textContent = "⏸️ Pausa";
    timer = setInterval(step, speedMs);
  }
  function stop(){
    playing = false;
    $play.textContent = "▶️ Play";
    if(timer) clearInterval(timer);
    timer = null;
  }

  $play.onclick = ()=> playing ? stop() : play();
  $next.onclick = ()=> step();
  $speed.onchange = ()=>{
    const v = $speed.value; // 'x1','x1_5','x2'
    speedMs = (v === 'x2') ? 350 : (v === 'x1_5') ? 500 : 700;
    if(playing){ stop(); play(); }
  };
  $close.onclick = ()=>{
    stop();
    modal.remove();
  };

  // Auto-play on open
  play();
}

// ===== Helpers UI =====
function ensureModal(){
  let m = document.getElementById("matchviewer-modal");
  if(!m){
    m = document.createElement("div");
    m.id = "matchviewer-modal";
    m.style = "position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:99999;";
    document.body.appendChild(m);
  }
  return m;
}

function renderModal(m, state){
  const title = `${state.teamL.nombre} vs ${state.teamV.nombre}`;
  m.innerHTML = `
    <div style="background:#fff; width:min(860px,96vw); max-height:90vh; border-radius:14px; box-shadow:0 24px 70px rgba(0,0,0,.25); display:flex; flex-direction:column;">
      <div style="padding:12px 16px; border-bottom:1px solid #eee; display:flex; gap:12px; align-items:center;">
        <strong>${title}</strong>
        <span id="mv-score" style="margin-left:auto; font-weight:700;">0 - 0</span>
        <button id="mv-close" class="ghost">Cerrar ✖</button>
      </div>
      <div style="padding:10px 16px; display:flex; gap:12px; align-items:center; border-bottom:1px solid #f1f5f9;">
        <button id="mv-play">▶️ Play</button>
        <button id="mv-next">⏭️ Siguiente</button>
        <label style="margin-left:auto; display:flex; gap:6px; align-items:center;">
          Velocidad:
          <select id="mv-speed">
            <option value="x1">x1</option>
            <option value="x1_5">x1.5</option>
            <option value="x2">x2</option>
          </select>
        </label>
      </div>
      <div id="mv-log" style="padding:12px 16px; overflow:auto; line-height:1.55; font-size:14px; min-height:240px;"></div>
    </div>
  `;
  // primer bloque del log (ratings + eventos sembrados)
  const log = m.querySelector("#mv-log");
  state.log.forEach(line => appendLine(log, line));
}

function appendLine(container, text){
  const div = document.createElement("div");
  div.textContent = text;
  container.appendChild(div);
}
function autoscroll(container){
  container.scrollTop = container.scrollHeight;
}
