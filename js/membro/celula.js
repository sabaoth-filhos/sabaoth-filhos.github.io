import { exigirMembro } from "../core/sessao.js";
import { esc, avatar, linkWhatsApp, estadoVazio } from "../core/ui.js";
import { icon } from "../core/icons.js";
import { meusGrupos, perfisPublicos } from "./comum.js";

const { user, db } = await exigirMembro();
const app = document.getElementById("app");
const grupos = await meusGrupos(db, user.uid).catch(() => []);
if (!grupos.length) {
  app.innerHTML = estadoVazio({ ic: "grupo", titulo: "Você ainda não está em uma célula",
    texto: "As células são encontros nas casas, durante a semana, para orar, estudar a Bíblia e fazer amigos.",
    acao: `<a class="btn" href="../participar.html#grupo">${icon("grupo")}Quero participar de uma célula</a>` });
} else {
  const perfis = await perfisPublicos(db, grupos.flatMap((g) => g.membros || []));
  app.innerHTML = grupos.map((g) => `
  <section class="card pilha aparecer" style="margin-bottom:16px">
    <h2 style="font-size:1.4rem">${esc(g.nome)}</h2>
    <ul class="lista-icones">
      <li>${icon("pessoa")}<span><b>Líder:</b> ${esc(g.liderNome || perfis[g.liderId]?.nome || "—")}</span></li>
      <li>${icon("calendario")}<span><b>${esc(g.dia || "—")}</b>${g.horario ? " às " + esc(g.horario) : ""}</span></li>
      <li>${icon("pin")}<span>${esc(g.local || "Local a definir")}</span></li>
    </ul>
    ${g.liderWhatsapp ? `<a class="btn secundario pequeno" href="${linkWhatsApp("Olá! Sou da célula " + g.nome + ".", g.liderWhatsapp)}" target="_blank" rel="noopener">${icon("whatsapp")}Falar com o líder</a>` : ""}
    <h3 style="margin-top:12px">Participantes (${(g.membros || []).length})</h3>
    <ul class="lista-limpa" style="display:grid;gap:10px">${(g.membros || []).map((id) => {
      const p = perfis[id] || { nome: "Membro" };
      return `<li class="linha">${avatar(p.nome, p.foto)}<span>${esc(p.nome)}${id === user.uid ? ' <span class="selo">você</span>' : ""}${id === g.liderId ? ' <span class="selo verde">líder</span>' : ""}</span></li>`;
    }).join("")}</ul>
  </section>`).join("");
}
