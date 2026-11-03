import { preencherDadosIgreja, videoFachada } from "./comum.js";
import { getMensagens, getEventosPublicos, getSeries, youtubeId } from "../core/dados-publicos.js";
import { esc, fmtData, fmtDataLonga, paraData, MESES } from "../core/ui.js";
import { icon } from "../core/icons.js";

preencherDadosIgreja();

(async () => {
  const [msgs, series] = await Promise.all([getMensagens(1), getSeries()]);
  const alvo = document.getElementById("ultima-mensagem");
  const m = msgs[0];
  if (!m) {
    alvo.innerHTML = `${videoFachada("", "")}<div><h2 id="t-msg">Em breve, a mensagem mais recente aqui</h2><p class="muted">Enquanto isso, acompanhe nosso canal no YouTube.</p><a class="btn secundario" href="assistir.html">${icon("assistir")}Ver mensagens</a></div>`;
    return;
  }
  const s = series.find((x) => x.id === m.serieId);
  alvo.innerHTML = `${videoFachada(youtubeId(m.youtube || m.youtubeId), m.titulo)}
    <div>${s ? `<span class="selo" style="background:${esc(s.cor || "#2b2925")};color:#fff;border:0">Série: ${esc(s.titulo)}</span>` : ""}
      <h2 id="t-msg" style="margin-top:10px">${esc(m.titulo)}</h2>
      <p class="muted">${esc(m.pregador || "")}${m.data ? " · " + esc(fmtData(m.data)) : ""}</p>
      ${m.resumo ? `<p>${esc(m.resumo)}</p>` : ""}
      <a class="btn secundario" href="assistir.html">${icon("assistir")}Mais mensagens</a></div>`;
})();

(async () => {
  const ev = await getEventosPublicos(6);
  const alvo = document.getElementById("eventos");
  if (!ev.length) { alvo.innerHTML = `<div class="vazio" style="grid-column:1/-1">Nenhum evento agendado no momento. Fique de olho!</div>`; return; }
  alvo.innerHTML = ev.map((e) => {
    const d = paraData(e.data);
    return `<article class="card evento aparecer"><div class="data-bloco"><b>${d ? d.getDate() : "?"}</b><span>${d ? MESES[d.getMonth()] : ""}</span></div>
      <div><h3 style="margin:0">${esc(e.titulo)}</h3><span class="muted pequeno">${esc(fmtDataLonga(e.data))}${e.hora ? " · " + esc(e.hora) : ""}${e.local ? " · " + esc(e.local) : ""}</span></div></article>`;
  }).join("");
})();
