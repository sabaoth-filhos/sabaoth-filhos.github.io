import { exigirMembro } from "../core/sessao.js";
import { esc, fmtData, mensagemErro, estadoVazio } from "../core/ui.js";
import { icon } from "../core/icons.js";
import { meusAvisos, avisosLidos, marcarLido } from "./comum.js";

const { user, db } = await exigirMembro();
const app = document.getElementById("app");
let filtro = "todos";
async function render() {
  const [av, lidos] = await Promise.all([meusAvisos(db, user.uid), avisosLidos(db, user.uid)]);
  const naoLidos = av.filter((a) => !lidos.has(a.id));
  const l = filtro === "nao" ? naoLidos : av;
  app.innerHTML = `<div class="linha entre" style="margin-bottom:12px"><div class="tabs">
      <button class="chip" aria-pressed="${filtro === "todos"}" data-f="todos">Todos</button>
      <button class="chip" aria-pressed="${filtro === "nao"}" data-f="nao">Não lidos (${naoLidos.length})</button></div>
      ${naoLidos.length ? `<button class="btn fantasma pequeno" id="todos-lidos">${icon("check")}Marcar todos como lidos</button>` : ""}</div>
    <div class="pilha">${l.map((a) => `
      <article class="card aparecer" style="${lidos.has(a.id) ? "opacity:.75" : "border-left:4px solid var(--ouro)"}">
        <div class="linha entre"><span class="selo ${a.alvoTipo && a.alvoTipo !== "geral" ? "verde" : ""}">${esc(a.alvoTipo === "grupo" ? "Sua Mesa" : a.alvoTipo === "ministerio" ? "Seu ministério" : a.alvoTipo === "lista" ? "Para você" : "Geral")}</span><small class="muted">${esc(fmtData(a.criadoEm))}</small></div>
        <h3 style="margin:8px 0 4px">${esc(a.titulo)}</h3><p style="white-space:pre-line;margin:0 0 8px">${esc(a.texto)}</p>
        ${lidos.has(a.id) ? `<small class="muted">${icon("check").replace("<svg", '<svg style="width:14px;display:inline;vertical-align:-2px"')} Lido</small>` : `<button class="btn secundario pequeno" data-lido="${a.id}">Marcar como lido</button>`}
      </article>`).join("") || (filtro === "nao" ? estadoVazio({ ic: "check", titulo: "Tudo em dia!", texto: "Você já leu todos os avisos." })
        : estadoVazio({ ic: "sino", titulo: "Nenhum aviso por enquanto", texto: "Os recados da liderança, da sua Mesa e dos seus ministérios aparecem aqui." }))}</div>`;
  app.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { filtro = b.dataset.f; render(); });
  app.querySelectorAll("[data-lido]").forEach((b) => b.onclick = async () => { await marcarLido(db, user.uid, [b.dataset.lido]); render(); });
  const t = document.getElementById("todos-lidos"); if (t) t.onclick = async () => { await marcarLido(db, user.uid, naoLidos.map((a) => a.id)); render(); };
}
render().catch((e) => app.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(mensagemErro(e))}</p></div>`);
