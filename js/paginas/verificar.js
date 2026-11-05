// Script da página verificar.html (separado do HTML para permitir CSP sem 'unsafe-inline').
import { getDb } from "../core/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, fmtData } from "../core/ui.js";
import { icon } from "../core/icons.js";
const el = document.getElementById("res");
const token = new URLSearchParams(location.search).get("c") || "";
const falha = (t) => el.innerHTML = `<div class="alerta erro" style="text-align:left">${icon("alerta")}<div><h2 style="font-size:1.2rem">Carteirinha não verificada</h2><p>${t}</p></div></div>`;
if (!/^[A-Za-z0-9]{16,40}$/.test(token)) falha("Código inválido.");
else try {
  const s = await getDoc(doc(await getDb(), "cards", token));
  if (!s.exists()) falha("Esta carteirinha não existe ou foi cancelada.");
  else {
    const c = s.data(); const ativo = c.status === "ativo";
    el.innerHTML = `<div class="card" style="text-align:left"><div class="linha"><img src="assets/img/logo-idpb.png" alt="" width="46" height="56"><div><b>IDPB Javé Sabaoth</b><br><span class="muted pequeno">Verificação de membro</span></div></div><hr class="sep">
      <p class="selo ${ativo ? "verde" : "perigo"}">${icon(ativo ? "check" : "alerta")}${ativo ? "Membro ativo" : "Carteirinha inativa"}</p>
      <h1 style="font-size:1.6rem;margin-top:12px">${esc(c.nome)}</h1>
      <p class="muted">${esc(c.cargo || "Membro")} · Nº ${esc(c.numero || "—")}${c.membroDesde ? " · Membro desde " + esc(fmtData(c.membroDesde)) : ""}</p>
      <p class="pequeno">Consulta em ${esc(new Date().toLocaleString("pt-BR"))}</p></div>`;
  }
} catch (e) { falha("Não foi possível consultar agora. Verifique a internet."); }
