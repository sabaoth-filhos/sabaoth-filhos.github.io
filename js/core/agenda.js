// Próximo culto (a partir dos horários em texto livre) e transmissão ao vivo.
// Tudo calculado no fuso de Manaus (America/Manaus), independente do aparelho.

const FUSO = "America/Manaus";
const DURACAO_MIN = 120; // um culto "está acontecendo" até 2 h depois do início
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const NOMES_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Agora em Manaus, como minutos desde domingo 00:00 + a data local (para "hoje"/"amanhã"). */
function agoraManaus(agora = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(agora).map((x) => [x.type, x.value]));
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return dia * 1440 + Number(p.hour) * 60 + Number(p.minute);
}

/** "Domingo", "Terça e Quinta", "Seg a Sex" → [0], [2,4], [1..5]. */
export function diasDoTexto(texto) {
  const t = semAcento(texto);
  const achados = [...t.matchAll(/\b(dom|seg|ter|qua|qui|sex|sab)[a-z-]*/g)].map((m) => DIAS.indexOf(m[1]));
  if (achados.length === 2 && /\b(a|ate)\b/.test(t)) {
    const [a, b] = achados; const r = [];
    for (let d = a; ; d = (d + 1) % 7) { r.push(d); if (d === b) break; }
    return r;
  }
  return [...new Set(achados)];
}

/** "19h30", "19:30", "19h", "7h da noite" → minutos do dia (ou null). */
export function minutosDoTexto(texto) {
  const m = semAcento(texto).match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/);
  if (!m) return null;
  let h = Number(m[1]); const min = Number(m[2] || 0);
  if (/noite|tarde/.test(semAcento(texto)) && h < 12) h += 12;
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/**
 * Próximo culto a partir de [{dia, hora, nome}].
 * @returns {{indice, nome, dia, hora, emMin, agora:boolean, rotulo}} ou null (horários não configurados)
 */
export function proximoCulto(horarios = [], agora = new Date()) {
  const ag = agoraManaus(agora);
  let melhor = null;
  horarios.forEach((h, indice) => {
    const min = minutosDoTexto(h.hora);
    if (min == null) return;
    for (const d of diasDoTexto(h.dia)) {
      const inicio = d * 1440 + min;
      let delta = inicio - ag;
      if (delta < -DURACAO_MIN) delta += 7 * 1440;          // já passou nesta semana
      else if (delta < -7 * 1440 + DURACAO_MIN) delta += 7 * 1440;
      if (!melhor || delta < melhor.emMin) melhor = { indice, nome: h.nome, dia: d, hora: h.hora, emMin: delta };
    }
  });
  if (!melhor) return null;
  melhor.agora = melhor.emMin <= 0;
  const diaAtual = Math.floor(ag / 1440);
  const diff = (melhor.dia - diaAtual + 7) % 7;
  const quando = diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : NOMES_DIA[melhor.dia][0].toUpperCase() + NOMES_DIA[melhor.dia].slice(1);
  melhor.rotulo = melhor.agora ? "Acontecendo agora" : `${quando}, ${melhor.hora}`;
  melhor.falta = melhor.agora ? "" : faltaTexto(melhor.emMin);
  return melhor;
}

function faltaTexto(min) {
  if (min < 60) return `começa em ${min} min`;
  if (min < 24 * 60) { const h = Math.round(min / 60); return `em ${h} ${h === 1 ? "hora" : "horas"}`; }
  const d = Math.round(min / 1440); return `em ${d} ${d === 1 ? "dia" : "dias"}`;
}

/** Transmissão ao vivo ativa? (settings/public.aoVivo = { url, titulo, ate: ms }) */
export function aoVivo(I, agora = Date.now()) {
  const v = I?.aoVivo;
  if (!v || !/^https:\/\//.test(String(v.url || "")) || !(Number(v.ate) > agora)) return null;
  return v;
}
