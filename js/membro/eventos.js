import { exigirMembro } from "../core/sessao.js";
import { collection, query, where, getDocs, orderBy, doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, hojeISO, fmtDataLonga, toast, confirmar, mensagemErro, paraData, MESES, estadoVazio } from "../core/ui.js";
import { icon } from "../core/icons.js";

const { user, membro, db } = await exigirMembro();
const app = document.getElementById("app");
async function carregar() {
  const [ev, insc] = await Promise.all([
    getDocs(query(collection(db, "events"), where("data", ">=", hojeISO()), orderBy("data"))),
    getDocs(query(collection(db, "registrations"), where("memberId", "==", user.uid)))
  ]);
  const minhas = new Set(insc.docs.map((d) => d.data().eventId));
  const l = ev.docs.map((d) => ({ id: d.id, ...d.data() }));
  const card = (e) => { const d = paraData(e.data), inscrito = minhas.has(e.id); return `
    <article class="card evento aparecer" style="align-items:flex-start">
      <div class="data-bloco"><b>${d.getDate()}</b><span>${MESES[d.getMonth()]}</span></div>
      <div style="flex:1"><h3 style="margin:0">${esc(e.titulo)}</h3>
        <p class="muted" style="margin:0 0 6px">${esc(fmtDataLonga(e.data))}${e.hora ? " · " + esc(e.hora) : ""}${e.local ? " · " + esc(e.local) : ""}</p>
        ${e.descricao ? `<p style="margin:0 0 8px">${esc(e.descricao)}</p>` : ""}
        ${inscrito ? `<span class="selo verde">${icon("check")}Inscrito</span> <button class="btn fantasma pequeno" data-cancelar="${e.id}">Cancelar inscrição</button>`
          : e.inscricoes ? `<button class="btn pequeno" data-inscrever="${e.id}">${icon("ingresso")}Quero participar</button>` : `<span class="selo">Sem inscrição</span>`}
      </div></article>`; };
  const meus = l.filter((e) => minhas.has(e.id)), outros = l.filter((e) => !minhas.has(e.id));
  app.innerHTML = `<h2 style="font-size:1.2rem">Inscrito</h2><div class="pilha">${meus.map(card).join("") || estadoVazio({ ic: "ingresso", titulo: "Nenhuma inscrição", texto: outros.some((e) => e.inscricoes) ? "Veja abaixo os eventos com inscrição aberta." : "Quando houver eventos com inscrição, você se inscreve por aqui." })}</div>
    <h2 style="font-size:1.2rem;margin-top:24px">Próximos eventos</h2><div class="pilha">${outros.map(card).join("") || estadoVazio({ ic: "calendario", titulo: "Nenhum outro evento agendado", texto: "Fique de olho nos avisos: os próximos eventos aparecem aqui." })}</div>`;
  app.querySelectorAll("[data-inscrever]").forEach((b) => b.onclick = async () => {
    try { await setDoc(doc(db, "registrations", `${b.dataset.inscrever}_${user.uid}`), { eventId: b.dataset.inscrever, memberId: user.uid, nome: membro.nome, criadoEm: serverTimestamp() }); toast("Inscrição feita!"); carregar(); }
    catch (e) { toast(mensagemErro(e), "erro"); }
  });
  app.querySelectorAll("[data-cancelar]").forEach((b) => b.onclick = async () => {
    if (!(await confirmar("Cancelar sua inscrição neste evento?", { ok: "Cancelar inscrição", perigo: true }))) return;
    try { await deleteDoc(doc(db, "registrations", `${b.dataset.cancelar}_${user.uid}`)); toast("Inscrição cancelada."); carregar(); }
    catch (e) { toast(mensagemErro(e), "erro"); }
  });
}
carregar().catch((e) => app.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(mensagemErro(e))}</p></div>`);
