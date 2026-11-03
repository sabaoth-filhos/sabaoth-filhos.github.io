// Mensagens por série ("campanhas"), com busca e vídeos do YouTube.
import { getMensagens, getSeries, youtubeId } from "../core/dados-publicos.js";
import { esc, fmtData, normalizar } from "../core/ui.js";
import { icon } from "../core/icons.js";
import { videoFachada } from "./comum.js";

const [msgs, series] = await Promise.all([getMensagens(300), getSeries()]);
const serieDe = (id) => series.find((s) => s.id === id);
let filtro = new URLSearchParams(location.search).get("serie") || "todas";
let termo = "";

function destaque() {
  const s = series.find((x) => x.destaque) || series[0];
  const el = document.getElementById("em-destaque");
  if (!s) { el.innerHTML = ""; return; }
  const qtd = msgs.filter((m) => m.serieId === s.id).length;
  el.innerHTML = `<a class="serie-capa aparecer" href="?serie=${encodeURIComponent(s.id)}" style="--cor-serie:${esc(s.cor || "#2b2925")};text-decoration:none;${s.capa ? `background-image:linear-gradient(0deg,rgba(0,0,0,.65),rgba(0,0,0,.1)),url('${esc(s.capa)}');background-size:cover;background-position:center` : ""}">
    <span class="selo">Série em destaque · ${qtd} ${qtd === 1 ? "mensagem" : "mensagens"}</span>
    <h3>${esc(s.titulo)}</h3><p>${esc(s.descricao || "")}</p></a>`;
}

function abas() {
  const el = document.getElementById("filtro-series");
  const itens = [{ id: "todas", titulo: "Todas" }, ...series];
  el.innerHTML = itens.map((s) => `<button class="chip" role="tab" aria-pressed="${s.id === filtro}" aria-selected="${s.id === filtro}" data-id="${esc(s.id)}">${esc(s.titulo)}</button>`).join("");
  el.onclick = (e) => { const b = e.target.closest("[data-id]"); if (!b) return; filtro = b.dataset.id; history.replaceState(null, "", filtro === "todas" ? "assistir.html" : "?serie=" + encodeURIComponent(filtro)); abas(); lista(); };
}

function lista() {
  const t = normalizar(termo);
  const r = msgs.filter((m) => (filtro === "todas" || m.serieId === filtro) &&
    (!t || normalizar([m.titulo, m.pregador, m.referencias, m.resumo, serieDe(m.serieId)?.titulo].join(" ")).includes(t)));
  const el = document.getElementById("lista-mensagens");
  if (!msgs.length) { el.innerHTML = `<div class="vazio" style="grid-column:1/-1">As mensagens aparecerão aqui assim que forem cadastradas no painel.</div>`; return; }
  if (!r.length) { el.innerHTML = `<div class="vazio" style="grid-column:1/-1">Nenhuma mensagem encontrada para "${esc(termo)}".</div>`; return; }
  el.innerHTML = r.map((m) => {
    const s = serieDe(m.serieId);
    return `<article class="card card-midia aparecer">${videoFachada(youtubeId(m.youtube || m.youtubeId), m.titulo).replace('class="video"', 'class="video" style="border-radius:0;box-shadow:none"')}
      <div class="corpo">${s ? `<span class="selo" style="border-left:4px solid ${esc(s.cor || "#999")}">${esc(s.titulo)}</span>` : ""}
      <h3 style="margin-top:8px">${esc(m.titulo)}</h3><p class="muted pequeno" style="margin:0">${esc(m.pregador || "")}${m.data ? " · " + esc(fmtData(m.data)) : ""}${m.referencias ? " · " + esc(m.referencias) : ""}</p></div></article>`;
  }).join("");
}

document.getElementById("busca").addEventListener("input", (e) => { termo = e.target.value; lista(); });
destaque(); abas(); lista();
