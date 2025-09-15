// js/engine_steps.js — Motor paso a paso (secuencial) con log incremental

// ===== Utilidades =====
function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
function avg(a){ return (!a || !a.length) ? 0 : a.reduce((x,y)=>x+y,0)/a.length; }

function stat(j, key, def=10){
  if (typeof j[key] === "number") return j[key];
  if (typeof j.tier === "number") return clamp(6 + (j.tier-1)*2, 4, 18);
  return def;
}

function ratingEquipoFromRoster(jugadores){
  jugadores = jugadores || [];
  const gk  = jugadores.filter(j => j.rol === "GK");
  const dfs = jugadores.filter(j => j.rol === "DEF");
  const mfs = jugadores.filter(j => j.rol === "MID");
  const atks= jugadores.filter(j => j.rol === "ATK");

  const GK = clamp(gk.length ? stat(gk[0], "gk", 10) : 8, 4, 20);
  const D  = clamp((avg(dfs.map(j=>stat(j,"def",10)))*0.7 + avg(mfs.map(j=>stat(j,"def",10)))*0.3) || 9, 4, 20);
  const A  = clamp((avg(atks.map(j=>stat(j,"atk",10)))*0.7 + avg(mfs.map(j=>stat(j,"atk",10)))*0.3) || 9, 4, 20);
  return { A, D, GK };
}

// ===== Eventos automáticos básicos (mismo espíritu que engine.js) =====
export const STEP_EVENTS = {
  condicional: {
    chance: 0.10,
    apply(s, side, log){
      s.modifiers[side].def -= 0.12; // permanente
      log.push(`🚨 (${side === "local" ? "LOCAL":"VIS"}) La poli se lleva a un defensa (−DEF)`);
    }
  },
  resacoso: {
    chance: 0.15,
    apply(s, side, log){
      s.modifiers[side].convNext -= 0.12; // para la próxima ocasión
      log.push(`🥴 (${side === "local" ? "LOCAL":"VIS"}) Resacoso: próxima ocasión con menos puntería`);
    }
  },
  felino: {
    chance: 0.12,
    apply(s, side, log){
      const other = side === "local" ? "visitante" : "local";
      s.modifiers[other].convNext -= 0.10;
      log.push(`🐈 (${side === "local" ? "LOCAL":"VIS"}) Portero felino: la próxima del rival costará`);
    }
  },
  zorro: {
    chance: 0.10,
    apply(s, side, log){
      s.modifiers[side].convNext += 0.10;
      log.push(`🦊 (${side === "local" ? "LOCAL":"VIS"}) Pillería: próxima ocasión más clara`);
    }
  },
};

// ===== API =====
export function startMatch(teamLocal, teamVisitante, opts){
  const N = opts?.N ?? 12;
  const deck = opts?.eventsDeck ?? STEP_EVENTS;

  const rL = ratingEquipoFromRoster(teamLocal.jugadores);
  const rV = ratingEquipoFromRoster(teamVisitante.jugadores);

  const state = {
    N,
    i: 0, // jugada actual (0..N)
    teamL: teamLocal,
    teamV: teamVisitante,
    ratings: { L:rL, V:rV },
    score: { home:0, away:0 },
    modifiers: { local:{def:0, convNext:0}, visitante:{def:0, convNext:0} },
    log: [`📊 Ratings — LOCAL A:${rL.A.toFixed(1)} D:${rL.D.toFixed(1)} GK:${rL.GK.toFixed(1)} | VIS A:${rV.A.toFixed(1)} D:${rV.D.toFixed(1)} GK:${rV.GK.toFixed(1)}`],
    finished: false,
    deck
  };

  // Sembrar 0–2 eventos por equipo
  seedAutoEvents(state);
  return state;
}

export function nextPlay(state){
  if (state.finished) return { line: "Partido finalizado.", score: {...state.score}, finished: true };

  state.i++;
  const i = state.i;
  const { L:rL, V:rV } = state.ratings;

  // Ocasiones
  const defL = clamp(rL.D + (state.modifiers.local.def*20), 2, 24);
  const defV = clamp(rV.D + (state.modifiers.visitante.def*20), 2, 24);
  const pL = clamp(0.50 + 0.30 * (rL.A - defV) / 20, 0.15, 0.85);
  const pV = clamp(0.50 + 0.30 * (rV.A - defL) / 20, 0.15, 0.85);
  const atacanLocal = Math.random() < (pL / (pL + pV));
  const tag = atacanLocal ? "LOCAL" : "VIS";

  let line = `▶️ Jugada ${i}: ataca ${tag}`;
  // ¿Ocasión?
  const pO = atacanLocal ? pL : pV;
  if (Math.random() < pO){
    const pC = probConversion(atacanLocal, state);
    if (Math.random() < pC){
      if (atacanLocal) state.score.home++; else state.score.away++;
      line += ` — ⚽ ¡Gol ${tag}! (${state.score.home}-${state.score.away})`;
    } else {
      line += ` — ❌ Ocasión fallida (${tag})`;
    }
  } else {
    line += ` — ⛔ Sin peligro`;
  }

  state.log.push(line);

  if (state.i >= state.N){
    state.finished = true;
  }

  return {
    line,
    score: {...state.score},
    finished: state.finished,
    maybeChoice: null // reservado para futuros eventos con decisión
  };
}

export function applyChoice(state, choiceId){
  // Placeholder para Sprint E (decisiones)
  // Por ahora no usamos choices; esta función existe para mantener API
  return state;
}

// ===== Internas =====
function seedAutoEvents(state){
  const tipos = Object.keys(state.deck);
  ["local", "visitante"].forEach(side=>{
    let pool = [...tipos];
    const seeds = 1 + (Math.random() < 0.35 ? 1 : 0);
    for(let k=0;k<seeds;k++){
      if(!pool.length) break;
      const idx = Math.floor(Math.random()*pool.length);
      const key = pool.splice(idx,1)[0];
      const ev = state.deck[key];
      if (Math.random() < ev.chance){
        try { ev.apply(state, side, state.log); } catch(e){}
      }
    }
  });
}

function probConversion(forLocal, state){
  const { L:rL, V:rV } = state.ratings;
  const base = forLocal ? 0.28 : 0.26;
  const gk   = forLocal ? rV.GK   : rL.GK;
  const adjGK = -0.20 * (gk - 10) / 10;
  const sideKey = forLocal ? "local" : "visitante";
  const bonus = state.modifiers[sideKey].convNext || 0;
  state.modifiers[sideKey].convNext = 0; // consumir
  return clamp(base + adjGK + bonus, 0.06, 0.52);
}
