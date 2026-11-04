// Histórico privado: só o próprio membro, a tesouraria e o admin leem (garantido nas regras).
import { exigirMembro } from "../core/sessao.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, fmtData, fmtMoeda, paraData, mensagemErro, estadoVazio } from "../core/ui.js";
import { icon } from "../core/icons.js";

const { user, db } = await exigirMembro();
const app = document.getElementById("app");
try {
  const s = await getDocs(query(collection(db, "contributions"), where("memberId", "==", user.uid), orderBy("data", "desc")));
  const l = s.docs.map((d) => d.data());
  if (!l.length) app.innerHTML = estadoVazio({ ic: "moeda", titulo: "Nenhum lançamento ainda",
    texto: "Seus dízimos e ofertas aparecem aqui depois que a tesouraria lança. Só você e a tesouraria veem estas informações.",
    acao: `<a class="btn secundario pequeno" href="../contribuir.html">${icon("presente")}Contribuir via Pix</a>` });
  else {
    const porAno = {};
    l.forEach((c) => { const a = paraData(c.data)?.getFullYear() || "—"; (porAno[a] ||= []).push(c); });
    app.innerHTML = `<p class="muted pequeno linha">${icon("escudo")} Privado: só você e a tesouraria veem.</p>` + Object.entries(porAno).sort((a, b) => b[0] - a[0]).map(([ano, cs]) => `
      <section class="card" style="margin-bottom:16px"><div class="linha entre"><h2 style="font-size:1.3rem;margin:0">${ano}</h2><b>${fmtMoeda(cs.reduce((t, c) => t + Number(c.valor || 0), 0))}</b></div>
      <div class="tabela-wrap" tabindex="0" role="region" aria-label="Tabela de lançamentos" style="margin-top:12px"><table><thead><tr><th>Data</th><th>Tipo</th><th style="text-align:right">Valor</th></tr></thead><tbody>
      ${cs.map((c) => `<tr><td>${esc(fmtData(c.data))}</td><td>${esc(c.tipo || "")}${c.obs ? `<br><small class="muted">${esc(c.obs)}</small>` : ""}</td><td style="text-align:right">${fmtMoeda(c.valor)}</td></tr>`).join("")}
      </tbody></table></div></section>`).join("");
  }
} catch (e) { app.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(mensagemErro(e))}</p></div>`; }
