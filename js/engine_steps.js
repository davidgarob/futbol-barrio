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
      log.push(`🚨 (${side === "local" ? "LOCAL":"VIS"}) La policia entra en el campo y se lleva a tu defensa porque no se ha presentado en comisaria (−DEF)`);
    }
  },
  resacoso: {
    chance: 0.15,
    apply(s, side, log){
      s.modifiers[side].convNext -= 0.12; // para la próxima ocasión
      log.push(`🥴 (${side === "local" ? "LOCAL":"VIS"}) Tu delantero se ha presentado al partído con una resaca terrible, no es capaz de dar al balón`);
    }
  },
  felino: {
    chance: 0.12,
    apply(s, side, log){
      const other = side === "local" ? "visitante" : "local";
      s.modifiers[other].convNext -= 0.10;
      log.push(`🐈 (${side === "local" ? "LOCAL":"VIS"}) Tu portero está a tope de anfetas y le dan unos reflejos felinos`);
    }
  },
  zorro: {
    chance: 0.10,
    apply(s, side, log){
      s.modifiers[side].convNext += 0.10;
      log.push(`🦊 (${side === "local" ? "LOCAL":"VIS"}) Tu delantero le ha pedido un mechero a su rival y aprovecha para regatearle`);
    }
  },
  ex: {
    chance: 0.10,
    apply(s, side, log){
      s.modifiers[side].convNext -= 0.10;
      log.push(`🦊 (${side === "local" ? "LOCAL":"VIS"}) Tu delantero se esconde detrás del arbitro porque ha venido su ex a pedirle la manutención`);
    }
  },
  promesa: {
    chance: 0.10,
    apply(s, side, log){
      s.modifiers[side].convNext += 0.25;
      log.push(`🦊 (${side === "local" ? "LOCAL":"VIS"}) Tus jugadores te han oido decir que si ganan les invitas a una fiesta con drogas y prostitutas, nunca los habías visto tan motivados`);
    }
  },
  corazón: {
    chance: 0.10,
    apply(s, side, log){
      s.modifiers[side].def -= 0.12; // permanente
      log.push(`🦊 (${side === "local" ? "LOCAL":"VIS"}) se llevan a tu jugador en camilla por una taquicardia grave, aún así no suelta el cubata`);
    }
  },
  desintoxicacion: {
    chance: 0.10,
    apply(s, side, log){
      s.modifiers[side].def += 0.12; // permanente
      log.push(`🦊 (${side === "local" ? "LOCAL":"VIS"}) Tu defensa no ha podido salir de fiesta porque no tenía dinero, nunca lo habías visto tan concentrado, parece beckenbauer`);
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

  if (!state._decisionFired && state.i === Math.ceil(state.N/2)) {
  state._decisionFired = true;
  const side = "local"; // puedes alternar según marcador si quieres
  const maybeChoice = buildChoice(
    "mafia",
    side,
    "Llamada sospechosa en el descanso",
    "Te insinúan que te dejes empatar. ¿Qué haces?",
    [
      { id: "aceptar_mafia",   label: "Aceptar (un favor es un favor)" },
      { id: "rechazar_mafia", label: "Rechazar (somos íntegros)" }
    ]
  );
  // Devolvemos la jugada “en seco” para que la UI pause y pregunte
  return {
    line: `⏸️ Pausa por decisión del banquillo…`,
    score: {...state.score},
    finished: false,
    maybeChoice
  };
}
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
  function buildChoice(id, side, title, desc, options){
  return { id, side, title, desc, options };
}

// === Export: aplicar decisión elegida
export function applyChoice(state, choiceId, payload){
  // payload contiene { id, side } por si necesitas saber quién decide
  const side = payload?.side || "local";
  switch(choiceId){
    case "aceptar_mafia":
      // te dejas: favoreces al rival en la próxima ocasión y bajas DEF todo el partido
      state.modifiers[side].def -= 0.10; // -DEF permanente suave
      const other = (side === "local") ? "visitante" : "local";
      state.modifiers[other].convNext += 0.12; // +conv rival en la próxima
      state.log.push(`💼 (${side === "local" ? "LOCAL":"VIS"}) Aceptas el “favorcete” de la mafia… el rival huele sangre`);
      break;

    case "rechazar_mafia":
      // no te dejas: árbitro “duro” contigo una vez
      state.modifiers[side].convNext -= 0.06; // tu próxima ocasión, un poco peor
      state.log.push(`🧰 (${side === "local" ? "LOCAL":"VIS"}) Rechazas el trato. El árbitro te mira mal…`);
      break;

    case "juego_directo_on":
      state.modifiers[side].convNext += 0.08; // próxima ocasión un poco mejor
      state.modifiers[side].def -= 0.06;      // te desguarneces atrás
      state.log.push(`🎯 (${side === "local" ? "LOCAL":"VIS"}) Cambias a juego directo: más mordiente, menos abrigo atrás`);
      break;

    case "juego_directo_off":
      state.log.push(`🧠 (${side === "local" ? "LOCAL":"VIS"}) Mantienes el plan inicial`);
      break;
  }
  return state;
}
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
