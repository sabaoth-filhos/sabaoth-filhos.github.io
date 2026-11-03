import { exigirMembro } from "../core/sessao.js";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, hojeISO, fmtDataLonga, toast, abrirDialogo, linkWhatsApp, mensagemErro, paraData, MESES } from "../core/ui.js";
import { icon } from "../core/icons.js";

const { user, membro, db } = await exigirMembro();
const app = document.getElementById("app");
async function carregar() {
  const s = await getDocs(query(collection(db, "schedules"), where("memberId", "==", user.uid), where("data", ">=", hojeISO()), orderBy("data")));
  const l = s.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (!l.length) { app.innerHTML = `<div class="vazio">Você não tem escalas futuras. 🙌</div>`; return; }
  app.innerHTML = `<div class="pilha">${l.map((e) => { const d = paraData(e.data); return `
    <article class="card evento aparecer" style="align-items:flex-start">
      <div class="data-bloco"><b>${d.getDate()}</b><span>${MESES[d.getMonth()]}</span></div>
      <div style="flex:1">
        <h3 style="margin:0">${esc(e.ministerioNome || "Ministério")}</h3>
        <p class="muted" style="margin:0">${esc(fmtDataLonga(e.data))}${e.hora ? " · " + esc(e.hora) : ""}</p>
        <p style="margin:4px 0 8px"><b>Função:</b> ${esc(e.funcao || "—")}</p>
        ${e.status === "ausente"
          ? `<span class="selo perigo">${icon("alerta")}Você avisou que não poderá ir</span>`
          : `<button class="btn secundario pequeno" data-ausente="${e.id}">${icon("fechar")}Não poderei ir</button>`}
      </div></article>`; }).join("")}</div>`;
  app.querySelectorAll("[data-ausente]").forEach((b) => b.onclick = () => avisar(l.find((x) => x.id === b.dataset.ausente)));
}
function avisar(e) {
  const d = abrirDialogo({
    titulo: "Não poderei ir",
    corpo: `<p>Escala: <b>${esc(e.ministerioNome || "")}</b> — ${esc(fmtDataLonga(e.data))} (${esc(e.funcao || "")}).</p>
      <div class="campo"><label for="motivo">Motivo (opcional)</label><textarea id="motivo" maxlength="500"></textarea></div>
      <p class="pequeno">O líder do ministério verá o aviso no painel da liderança.</p>`,
    rodape: `<button class="btn fantasma" data-fechar>Cancelar</button><button class="btn" id="ok">Avisar o líder</button>`
  });
  d.querySelector("#ok").onclick = async () => {
    const motivo = d.querySelector("#motivo").value.trim();
    try {
      await updateDoc(doc(db, "schedules", e.id), { status: "ausente", motivo, avisadoEm: serverTimestamp() });
      let wa = e.liderWhatsapp;
      if (!wa && e.ministerioId) { try { wa = (await getDoc(doc(db, "ministries", e.ministerioId))).data()?.liderWhatsapp; } catch {} }
      d.close(); toast("Aviso enviado ao líder.");
      if (wa) {
        const t = `Olá! Aqui é ${membro.nome}. Não poderei ir na escala de ${e.ministerioNome} (${fmtDataLonga(e.data)}, ${e.funcao}).${motivo ? " Motivo: " + motivo : ""}`;
        abrirDialogo({ titulo: "Avisar também no WhatsApp?", corpo: `<p>Se quiser, mande uma mensagem direta para o líder.</p><a class="btn bloco" target="_blank" rel="noopener" href="${linkWhatsApp(t, wa)}">${icon("whatsapp")}Abrir WhatsApp</a>` });
      }
      carregar();
    } catch (err) { toast(mensagemErro(err), "erro"); }
  };
}
carregar().catch((e) => app.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(mensagemErro(e))}</p></div>`);
