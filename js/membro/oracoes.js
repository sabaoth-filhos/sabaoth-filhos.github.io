import { exigirMembro } from "../core/sessao.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, fmtData, mensagemErro, estadoVazio } from "../core/ui.js";
import { icon } from "../core/icons.js";

const { user, db } = await exigirMembro();
const app = document.getElementById("app");
try {
  const s = await getDocs(query(collection(db, "prayerRequests"), where("uid", "==", user.uid), orderBy("criadoEm", "desc")));
  const l = s.docs.map((d) => d.data());
  app.innerHTML = `<a class="btn" href="../oracao.html">${icon("oracao")}Novo pedido de oração</a>
    <p class="pequeno muted" style="margin-top:8px">Pedidos anônimos não aparecem aqui, porque não guardamos quem enviou.</p>
    <div class="pilha" style="margin-top:12px">${l.map((p) => `<article class="card"><div class="linha entre"><small class="muted">${esc(fmtData(p.criadoEm))}</small>
      <span class="selo ${p.status === "orado" ? "verde" : ""}">${p.status === "orado" ? "Estamos orando" : p.status === "respondido" ? "Respondido 🙌" : "Recebido"}</span></div>
      <p style="white-space:pre-line;margin:8px 0 0">${esc(p.pedido)}</p></article>`).join("") || estadoVazio({ ic: "oracao", titulo: "Nenhum pedido identificado", texto: "Use o formulário acima para pedir oração. A equipe de intercessão vai orar por você." })}</div>`;
} catch (e) { app.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(mensagemErro(e))}</p></div>`; }
