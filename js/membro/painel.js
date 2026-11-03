import { exigirMembro, temPapel } from "../core/sessao.js";
import { collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, hojeISO, fmtData, MESES_LONGOS, avatar } from "../core/ui.js";
import { icon } from "../core/icons.js";
import { meusAvisos, avisosLidos } from "./comum.js";

const { user, membro, db } = await exigirMembro();
const primeiro = (membro.nome || "irmão(ã)").split(" ")[0];
document.querySelector(".barra-membro h1").textContent = `Olá, ${primeiro}!`;
document.title = `Olá, ${primeiro} — IDPB Jave Sabaoth`;

const CARDS = [
  { href: "perfil.html", ic: "pessoa", t: "Perfil e família", s: "Seus dados, foto e família" },
  { href: "celula.html", ic: "grupo", t: "Minha célula", s: "Encontro e participantes" },
  { href: "escalas.html", ic: "escala", t: "Minhas escalas", s: "Próximas datas", id: "c-escalas" },
  { href: "eventos.html", ic: "ingresso", t: "Meus eventos", s: "Inscrições" },
  { href: "avisos.html", ic: "sino", t: "Avisos", s: "Mural da igreja", id: "c-avisos" },
  { href: "biblia.html", ic: "biblia", t: "Bíblia", s: "Leitura e destaques" },
  { href: "anotacoes.html", ic: "nota", t: "Minhas anotações", s: "Versículos, diário e cultos" },
  { href: "culto.html", ic: "microfone", t: "Estou no culto", s: "Anote a pregação" },
  { href: "arvore.html", ic: "arvore", t: "Árvore da Fé", s: "Quem te ganhou e seus frutos" },
  { href: "carteirinha.html", ic: "cartao", t: "Carteirinha", s: "Digital, com QR code" },
  { href: "contribuicoes.html", ic: "moeda", t: "Minhas contribuições", s: "Dízimos e ofertas" },
  { href: "oracoes.html", ic: "oracao", t: "Meus pedidos de oração", s: "Acompanhe" }
];
if (temPapel(membro, "lider") || temPapel(membro, "tesoureiro")) CARDS.push({ href: "../admin/index.html", ic: "config", t: "Painel da liderança", s: "Gestão e cadastros" });

const app = document.getElementById("app");
app.innerHTML = `
  <div class="linha" style="margin:-4px 0 18px;gap:14px">${avatar(membro.nome, membro.foto)}<div><b>${esc(membro.nome)}</b><br><span class="muted pequeno">${esc(membro.cargo || "Membro")}${membro.numeroMembro ? " · Nº " + esc(membro.numeroMembro) : ""}</span></div></div>
  <nav aria-label="Seções da área do membro"><div class="cards-membro">${CARDS.map((c) => `
    <a class="card-membro aparecer" href="${c.href}" ${c.id ? `id="${c.id}"` : ""}><span class="ic">${icon(c.ic)}</span><strong>${c.t}</strong><small class="muted">${c.s}</small></a>`).join("")}
  </div></nav>
  <section class="card" style="margin-top:20px" aria-labelledby="t-aniv"><h2 id="t-aniv" style="font-size:1.2rem" class="linha">${icon("bolo")} Aniversariantes de ${MESES_LONGOS[new Date().getMonth()]}</h2><div id="aniv"><span class="carregando"></span></div></section>
  <p style="margin-top:24px"><button class="btn secundario bloco" id="sair2">${icon("sair")}Sair da conta</button></p>`;
document.getElementById("sair2").onclick = async () => (await import("../core/sessao.js")).sairComSeguranca();

// Contadores
(async () => {
  try {
    const [av, lidos] = await Promise.all([meusAvisos(db, user.uid), avisosLidos(db, user.uid)]);
    const n = av.filter((a) => !lidos.has(a.id)).length;
    if (n) document.getElementById("c-avisos").insertAdjacentHTML("beforeend", `<span class="contador" aria-label="${n} não lidos">${n}</span>`);
  } catch {}
  try {
    const s = await getDocs(query(collection(db, "schedules"), where("memberId", "==", user.uid), where("data", ">=", hojeISO()), orderBy("data"), limit(1)));
    if (!s.empty) { const e = s.docs[0].data(); document.querySelector("#c-escalas small").textContent = `Próxima: ${fmtData(e.data, { day: "2-digit", month: "short" })} · ${e.funcao || ""}`; }
  } catch {}
})();

// Aniversariantes do mês (só nome e dia)
(async () => {
  const el = document.getElementById("aniv");
  try {
    const mes = new Date().getMonth() + 1;
    const s = await getDocs(query(collection(db, "directory"), where("aniversarioMes", "==", mes)));
    const l = s.docs.map((d) => d.data()).sort((a, b) => a.aniversarioDia - b.aniversarioDia);
    const hoje = new Date().getDate();
    el.innerHTML = l.length ? `<ul class="lista-limpa" style="display:grid;gap:6px">${l.map((p) => `<li class="linha entre" ${p.aniversarioDia === hoje ? 'style="font-weight:800"' : ""}><span>${esc(p.nome)}${p.aniversarioDia === hoje ? " 🎉" : ""}</span><span class="selo">dia ${p.aniversarioDia}</span></li>`).join("")}</ul>`
      : `<p class="muted">Nenhum aniversariante cadastrado neste mês.</p>`;
  } catch { el.innerHTML = `<p class="muted">Não foi possível carregar agora.</p>`; }
})();
