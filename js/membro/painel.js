// Painel "Hoje": o que importa agora (escala, leitura, avisos, evento, aniversários) + acesso rápido.
import { exigirMembro, temPapel } from "../core/sessao.js";
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, hojeISO, fmtData, fmtDataLonga, paraData, MESES, avatar, toast, mensagemErro, esqueleto } from "../core/ui.js";
import { icon } from "../core/icons.js";
import { meusAvisos, avisosLidos } from "./comum.js";
import { SECOES } from "./secoes.js";
import { ultimoPonto } from "../biblia/dados.js";
import { LIVROS } from "../biblia/livros.js";

const { user, membro, db } = await exigirMembro();
const primeiro = (membro.nome || "irmão(ã)").split(" ")[0];
const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Manaus" }).format(new Date()));
const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
document.querySelector(".barra-membro h1").textContent = `${saudacao}, ${primeiro}!`;
document.title = `${saudacao}, ${primeiro} — IDPB Jave Sabaoth`;

const secoes = SECOES.filter((s) => !s.papel || s.papel.some((p) => temPapel(membro, p)));
const carregando = esqueleto("linhas", 2);
const bloco = (id, ic, titulo, href) => `
  <section class="card hoje-card aparecer" id="${id}" aria-labelledby="${id}-t">
    <div class="hoje-cabeca"><span class="hoje-ic" aria-hidden="true">${icon(ic)}</span><h2 id="${id}-t">${titulo}</h2>
      ${href ? `<a class="hoje-ver" href="${href}">Ver tudo<span class="sr-only"> — ${titulo}</span></a>` : ""}</div>
    <div class="hoje-corpo">${carregando}</div></section>`;

const app = document.getElementById("app");
app.innerHTML = `
  <div class="linha" style="margin:-4px 0 18px;gap:14px">${avatar(membro.nome, membro.foto)}<div><b>${esc(membro.nome)}</b><br><span class="muted pequeno">${esc(membro.cargo || "Membro")}${membro.numeroMembro ? " · Nº " + esc(membro.numeroMembro) : ""}</span></div></div>
  <h2 class="sr-only">Hoje</h2>
  <div class="hoje-grid">
    ${bloco("h-escala", "escala", "Minha próxima escala", "escalas.html")}
    ${bloco("h-leitura", "biblia", "Continuar leitura", "")}
    ${bloco("h-avisos", "sino", "Avisos", "avisos.html")}
    ${bloco("h-evento", "ingresso", "Próximo evento", "eventos.html")}
    ${bloco("h-aniv", "bolo", "Aniversariantes da semana", "")}
  </div>
  <h2 class="titulo-secao">Acesso rápido</h2>
  <nav aria-label="Seções da área do membro"><div class="cards-membro">${secoes.map((c) => `
    <a class="card-membro aparecer" href="${c.href}"><span class="ic">${icon(c.ic)}</span><strong>${c.t}</strong><small class="muted">${c.s}</small></a>`).join("")}
  </div></nav>`;

const corpo = (id) => document.querySelector(`#${id} .hoje-corpo`);
const vazio = (txt, acao = "") => `<p class="hoje-vazio">${txt}</p>${acao}`;
const falhou = (id) => (corpo(id).innerHTML = vazio("Não foi possível carregar agora. Puxe para atualizar ou tente mais tarde."));

/* ---------- Próxima escala (com Confirmo / Não posso) ---------- */
async function escala() {
  const s = await getDocs(query(collection(db, "schedules"), where("memberId", "==", user.uid), where("data", ">=", hojeISO()), orderBy("data"), limit(1)));
  const el = corpo("h-escala");
  if (s.empty) { el.innerHTML = vazio("Você não tem escalas marcadas. Quando o líder do seu ministério te escalar, ela aparece aqui."); return; }
  const e = { id: s.docs[0].id, ...s.docs[0].data() };
  const d = paraData(e.data);
  const status = e.status === "confirmado" ? `<span class="selo verde">${icon("check")}Você confirmou</span>`
    : e.status === "ausente" ? `<span class="selo perigo">${icon("alerta")}Você avisou que não poderá ir</span>` : "";
  el.innerHTML = `<div class="evento" style="align-items:flex-start;gap:14px"><div class="data-bloco"><b>${d.getDate()}</b><span>${MESES[d.getMonth()]}</span></div>
    <div><b>${esc(e.ministerioNome || "Ministério")}</b><p class="muted pequeno" style="margin:0">${esc(fmtDataLonga(e.data))}${e.hora ? " · " + esc(e.hora) : ""}</p>
    <p class="pequeno" style="margin:2px 0 0">Função: <b>${esc(e.funcao || "—")}</b></p></div></div>
    <div class="linha" style="margin-top:12px">${status}
      ${e.status !== "confirmado" ? `<button class="btn pequeno" id="h-confirmo">${icon("check")}Confirmo</button>` : ""}
      ${e.status !== "ausente" ? `<a class="btn secundario pequeno" href="escalas.html?ausente=${encodeURIComponent(e.id)}">${icon("fechar")}Não posso</a>` : ""}</div>`;
  document.getElementById("h-confirmo")?.addEventListener("click", async (ev) => {
    ev.currentTarget.disabled = true;
    try { await updateDoc(doc(db, "schedules", e.id), { status: "confirmado", motivo: "", avisadoEm: serverTimestamp() }); toast("Presença confirmada. Obrigado!"); escala(); }
    catch (err) { toast(mensagemErro(err), "erro"); ev.currentTarget.disabled = false; }
  });
}

/* ---------- Continuar leitura ---------- */
async function leitura() {
  const p = await ultimoPonto(db, user.uid);
  const el = corpo("h-leitura");
  const L = p && LIVROS.find((l) => l.id === p.livro);
  if (!L) { el.innerHTML = vazio("Você ainda não começou a ler por aqui.", `<a class="btn pequeno" href="biblia.html">${icon("biblia")}Abrir a Bíblia</a>`); return; }
  el.innerHTML = `<p class="hoje-destaque">${esc(L.nome)} ${esc(p.cap)}</p><p class="muted pequeno" style="margin:0 0 12px">${esc(p.versao || "")}${p.em ? " · lido em " + esc(fmtData(p.em, { day: "2-digit", month: "short" })) : ""}</p>
    <a class="btn pequeno" href="biblia.html?v=${encodeURIComponent(p.versao || "")}&l=${encodeURIComponent(p.livro)}&c=${encodeURIComponent(p.cap)}">${icon("seta")}Continuar de onde parei</a>`;
}

/* ---------- Avisos não lidos ---------- */
async function avisos() {
  const [av, lidos] = await Promise.all([meusAvisos(db, user.uid), avisosLidos(db, user.uid)]);
  const nao = av.filter((a) => !lidos.has(a.id));
  const el = corpo("h-avisos");
  if (!nao.length) { el.innerHTML = vazio("Tudo em dia! Você leu todos os avisos."); return; }
  document.querySelector("#h-avisos h2").insertAdjacentHTML("beforeend", ` <span class="contador" aria-label="${nao.length} não lidos">${nao.length}</span>`);
  el.innerHTML = `<ul class="lista-limpa hoje-lista">${nao.slice(0, 3).map((a) => `<li><a href="avisos.html"><b>${esc(a.titulo || "Aviso")}</b><span class="muted pequeno">${esc(fmtData(a.criadoEm, { day: "2-digit", month: "short" }))}</span></a></li>`).join("")}</ul>
    ${nao.length > 3 ? `<p class="pequeno muted" style="margin:8px 0 0">e mais ${nao.length - 3}…</p>` : ""}`;
}

/* ---------- Próximo evento ---------- */
async function evento() {
  const [ev, insc] = await Promise.all([
    getDocs(query(collection(db, "events"), where("data", ">=", hojeISO()), orderBy("data"), limit(1))),
    getDocs(query(collection(db, "registrations"), where("memberId", "==", user.uid)))
  ]);
  const el = corpo("h-evento");
  if (ev.empty) { el.innerHTML = vazio("Nenhum evento agendado por enquanto."); return; }
  const e = { id: ev.docs[0].id, ...ev.docs[0].data() };
  const inscrito = insc.docs.some((d) => d.data().eventId === e.id);
  const d = paraData(e.data);
  el.innerHTML = `<div class="evento" style="align-items:flex-start;gap:14px"><div class="data-bloco"><b>${d.getDate()}</b><span>${MESES[d.getMonth()]}</span></div>
    <div><b>${esc(e.titulo)}</b><p class="muted pequeno" style="margin:0">${esc(fmtDataLonga(e.data))}${e.hora ? " · " + esc(e.hora) : ""}${e.local ? " · " + esc(e.local) : ""}</p></div></div>
    <div class="linha" style="margin-top:12px">${inscrito ? `<span class="selo verde">${icon("check")}Você está inscrito</span>`
      : e.inscricoes ? `<a class="btn pequeno" href="eventos.html">${icon("ingresso")}Quero participar</a>` : ""}</div>`;
}

/* ---------- Aniversariantes dos próximos 7 dias ---------- */
async function aniversarios() {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(hoje); d.setDate(d.getDate() + i); return d; });
  const meses = [...new Set(dias.map((d) => d.getMonth() + 1))];
  const lotes = await Promise.all(meses.map((m) => getDocs(query(collection(db, "directory"), where("aniversarioMes", "==", m)))));
  const pessoas = lotes.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));
  const lista = [];
  dias.forEach((d, i) => pessoas.filter((p) => p.aniversarioMes === d.getMonth() + 1 && p.aniversarioDia === d.getDate())
    .forEach((p) => lista.push({ ...p, i, d })));
  const el = corpo("h-aniv");
  if (!lista.length) { el.innerHTML = vazio("Nenhum aniversariante nos próximos 7 dias."); return; }
  const quando = (x) => x.i === 0 ? "Hoje 🎉" : x.i === 1 ? "Amanhã" : x.d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" });
  el.innerHTML = `<ul class="lista-limpa hoje-lista">${lista.map((p) => `<li class="linha entre" ${p.i === 0 ? 'style="font-weight:800"' : ""}>
    <span class="linha" style="gap:10px">${avatar(p.nome, p.foto, "pequeno")}${esc(p.nome)}</span><span class="selo">${esc(quando(p))}</span></li>`).join("")}</ul>`;
}

const tarefas = { "h-escala": escala, "h-leitura": leitura, "h-avisos": avisos, "h-evento": evento, "h-aniv": aniversarios };
Object.entries(tarefas).forEach(([id, fn]) => fn().catch((e) => { console.warn(id, e); falhou(id); }));
