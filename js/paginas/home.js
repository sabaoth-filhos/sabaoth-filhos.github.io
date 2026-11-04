import { preencherDadosIgreja } from "./comum.js";
import { getEventosPublicos } from "../core/dados-publicos.js";
import { esc, fmtDataLonga, paraData, MESES } from "../core/ui.js";

preencherDadosIgreja();

(async () => {
  const ev = await getEventosPublicos(6);
  const alvo = document.getElementById("eventos"); alvo.removeAttribute("aria-busy");
  if (!ev.length) { alvo.innerHTML = `<div class="vazio" style="grid-column:1/-1">Nenhum evento agendado no momento. Fique de olho!</div>`; return; }
  alvo.innerHTML = ev.map((e) => {
    const d = paraData(e.data);
    return `<article class="card evento aparecer"><div class="data-bloco"><b>${d ? d.getDate() : "?"}</b><span>${d ? MESES[d.getMonth()] : ""}</span></div>
      <div><h3 style="margin:0">${esc(e.titulo)}</h3><span class="muted pequeno">${esc(fmtDataLonga(e.data))}${e.hora ? " · " + esc(e.hora) : ""}${e.local ? " · " + esc(e.local) : ""}</span></div></article>`;
  }).join("");
})();
