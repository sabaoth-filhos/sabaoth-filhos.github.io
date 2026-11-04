// Painel administrativo. Os papéis vêm do Firestore (members/{uid}.papeis) e são garantidos pelas regras.
import { exigirMembro, temPapel, ehAdmin } from "../core/sessao.js";
import {
  collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp, writeBatch, orderBy, limit, addDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, toast, confirmar, comDesfazer, normalizar, abrirDialogo, mensagemErro, fmtData, fmtMoeda, hojeISO, idAleatorio, baixarArquivo, copiar, avatar, linkWhatsApp, rota } from "../core/ui.js";
import { icon, hidratarIcones } from "../core/icons.js";
import { montarCrud } from "./crud.js";
import { LIVROS } from "../biblia/livros.js";
import { MODOS, criaCiclo } from "../arvore/dados.js";

const { user, membro, db } = await exigirMembro();
const admin = ehAdmin(membro), lider = temPapel(membro, "lider"), tesoureiro = temPapel(membro, "tesoureiro");
if (!admin && !lider && !tesoureiro) {
  document.getElementById("app").innerHTML = `<div class="alerta erro">${icon("alerta")}<p>Esta área é só para a liderança autorizada.</p></div>`;
  throw new Error("sem acesso");
}

// Contexto compartilhado: pessoas (directory) para os seletores.
const ctx = { db, user, membro, pessoas: new Map() };
let pessoasEm = 0;
async function carregarPessoas() {
  const s = await getDocs(collection(db, "directory"));
  ctx.pessoas = new Map(s.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
  pessoasEm = Date.now();
}
await carregarPessoas();
const nomeDe = (id) => ctx.pessoas.get(id)?.nome || id;

/* =================== Abas =================== */
const ABAS = [
  { id: "inicio", nome: "Pendências", ic: "sino", fn: abaInicio },
  admin && { id: "cadastros", nome: "Controle de cadastros", ic: "usuarios", fn: abaCadastros },
  admin && { id: "membros", nome: "Membros", ic: "usuarios", fn: abaMembros },
  admin && { id: "grupos", nome: "Grupos", ic: "grupo", fn: abaGrupos },
  !admin && lider && { id: "meugrupo", nome: "Meu grupo", ic: "grupo", fn: abaMeuGrupo },
  admin && { id: "ministerios", nome: "Ministérios", ic: "maoAmiga", fn: abaMinisterios },
  (admin || lider) && { id: "escalas", nome: "Escalas", ic: "escala", fn: abaEscalas },
  admin && { id: "eventos", nome: "Eventos", ic: "ingresso", fn: abaEventos },
  admin && { id: "mensagens", nome: "Séries e mensagens", ic: "assistir", fn: abaMensagens },
  (admin || lider) && { id: "avisos", nome: "Avisos", ic: "sino", fn: abaAvisos },
  admin && { id: "formularios", nome: "Formulários", ic: "convite", fn: abaFormularios },
  admin && { id: "oracao", nome: "Pedidos de oração", ic: "oracao", fn: abaOracao },
  (admin || tesoureiro) && { id: "contribuicoes", nome: "Contribuições", ic: "moeda", fn: abaContribuicoes },
  admin && { id: "biblia", nome: "Bíblia", ic: "biblia", fn: abaBiblia },
  admin && { id: "arvore", nome: "Árvore da Fé", ic: "arvore", fn: abaArvore },
  admin && { id: "conteudo", nome: "Conteúdo público", ic: "igreja", fn: abaConteudo },
  admin && { id: "ferramentas", nome: "Ferramentas", ic: "config", fn: abaFerramentas }
].filter(Boolean);

const app = document.getElementById("app");
app.innerHTML = `<p class="muted" style="margin-top:-8px">Você entrou como <b>${esc([admin && "admin", lider && !admin && "líder", tesoureiro && !admin && "tesoureiro"].filter(Boolean).join(", "))}</b>. Ninguém, nem o admin, acessa as anotações pessoais dos membros.</p>
  <div class="busca-global" role="search">
    <label class="sr-only" for="busca-pessoa">Buscar pessoa por nome</label>
    ${icon("busca")}<input type="search" id="busca-pessoa" placeholder="Buscar pessoa por nome ou e-mail…" autocomplete="off" aria-controls="busca-res" aria-expanded="false">
    <ul class="busca-res" id="busca-res" role="listbox" hidden></ul>
  </div>
  <nav class="tabs" role="tablist" aria-label="Seções do painel" style="margin:8px 0 16px;flex-wrap:wrap">${ABAS.map((a) => `<a class="chip" role="tab" href="#${a.id}" data-aba="${a.id}">${icon(a.ic)}${esc(a.nome)}<span class="contador-aba" data-c="${a.id}"></span></a>`).join("")}</nav>
  <section id="aba" aria-live="polite"></section>`;
const alvo = document.getElementById("aba");

async function abrirAba() {
  if (Date.now() - pessoasEm > 60000) await carregarPessoas().catch(() => {});
  // #aba ou #aba?q=texto (a busca global abre a aba já filtrada)
  const [id, qs] = location.hash.slice(1).split("?");
  ctx.buscaInicial = new URLSearchParams(qs || "").get("q") || "";
  const a = ABAS.find((x) => x.id === id) || ABAS[0];
  document.querySelectorAll("[data-aba]").forEach((el) => el.setAttribute("aria-pressed", el.dataset.aba === a.id));
  alvo.innerHTML = `<h2 style="font-size:1.4rem">${esc(a.nome)}</h2><div id="corpo-aba"></div>`;
  a.fn(document.getElementById("corpo-aba"));
}
addEventListener("hashchange", abrirAba);
abrirAba();
hidratarIcones();

/* =================== Busca única por pessoa =================== */
let todosMembros = null; // admin: inclui quem ainda não tem cartão no diretório
async function listaBusca() {
  const m = new Map([...ctx.pessoas].map(([id, p]) => [id, { id, nome: p.nome, foto: p.foto }]));
  if (admin) {
    if (!todosMembros) { try { todosMembros = (await getDocs(collection(db, "members"))).docs.map((d) => ({ id: d.id, ...d.data() })); } catch { todosMembros = []; } }
    todosMembros.forEach((x) => m.set(x.id, { ...m.get(x.id), id: x.id, nome: x.nome || m.get(x.id)?.nome, email: x.email, celular: x.celular, status: x.status, numeroMembro: x.numeroMembro, cargo: x.cargo, foto: x.foto || m.get(x.id)?.foto }));
  }
  return [...m.values()];
}
{
  const inp = document.getElementById("busca-pessoa"), res = document.getElementById("busca-res");
  let ativo = -1, atuais = [];
  const fechar = () => { res.hidden = true; inp.setAttribute("aria-expanded", "false"); ativo = -1; };
  const desenhar = async () => {
    const q = normalizar(inp.value.trim());
    if (q.length < 2) { fechar(); return; }
    atuais = (await listaBusca()).filter((p) => normalizar(`${p.nome || ""} ${p.email || ""}`).includes(q))
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || "")).slice(0, 8);
    res.innerHTML = atuais.length ? atuais.map((p, i) => `<li role="option" id="br-${i}" data-i="${i}" aria-selected="${i === ativo}">${avatar(p.nome, p.foto, "pequeno")}<span><b>${esc(p.nome || "(sem nome)")}</b>${p.email ? `<small class="muted">${esc(p.email)}</small>` : ""}</span>${p.status === "recusado" ? '<span class="selo perigo">Bloqueado</span>' : ""}</li>`).join("")
      : `<li class="muted" aria-disabled="true">Ninguém encontrado com “${esc(inp.value.trim())}”.</li>`;
    res.hidden = false; inp.setAttribute("aria-expanded", "true");
  };
  inp.addEventListener("input", () => { ativo = -1; desenhar(); });
  inp.addEventListener("keydown", (e) => {
    if (res.hidden || !atuais.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); ativo = (ativo + (e.key === "ArrowDown" ? 1 : -1) + atuais.length) % atuais.length; desenhar(); inp.setAttribute("aria-activedescendant", "br-" + ativo); }
    if (e.key === "Enter" && ativo >= 0) { e.preventDefault(); abrirPessoa(atuais[ativo]); }
    if (e.key === "Escape") fechar();
  });
  res.addEventListener("click", (e) => { const li = e.target.closest("[data-i]"); if (li) abrirPessoa(atuais[+li.dataset.i]); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".busca-global")) fechar(); });
  function abrirPessoa(p) {
    fechar(); inp.value = "";
    const q = encodeURIComponent(p.nome || p.email || "");
    const wa = /\d{8,}/.test(String(p.celular || "").replace(/\D/g, "")) ? linkWhatsApp(`Olá, ${(p.nome || "").split(" ")[0]}!`, String(p.celular).replace(/\D/g, "").replace(/^(?!55)/, "55")) : "";
    const d = abrirDialogo({
      titulo: p.nome || "Pessoa",
      corpo: `<div class="linha" style="gap:14px;margin-bottom:12px">${avatar(p.nome, p.foto)}<div>
          <b>${esc(p.nome || "")}</b>${p.status ? ` <span class="selo ${p.status === "recusado" ? "perigo" : ""}">${esc(ESTADO_ROTULO[p.status] || p.status)}</span>` : ""}
          <br><small class="muted">${esc([p.cargo, p.numeroMembro && "Nº " + p.numeroMembro, p.email, p.celular].filter(Boolean).join(" · "))}</small></div></div>
        <div class="pilha">
          ${admin ? `<a class="btn bloco" href="#membros?q=${q}" data-fechar>${icon("lapis")}Editar dados de membro</a>
          <a class="btn secundario bloco" href="#cadastros?q=${q}" data-fechar>${icon("usuarios")}Ver no controle de cadastros</a>` : ""}
          ${tesoureiro || admin ? `<a class="btn secundario bloco" href="#contribuicoes?q=${q}" data-fechar>${icon("moeda")}Contribuições</a>` : ""}
          ${wa ? `<a class="btn fantasma bloco" href="${wa}" target="_blank" rel="noopener">${icon("whatsapp")}Conversar no WhatsApp</a>` : ""}
        </div>`
    });
    return d;
  }
}

/* =================== Pendências (visão geral) =================== */
async function abaInicio(el) {
  const itens = [];
  const card = (id, ic, n, titulo, texto, aba, botao = "Resolver") => itens.push({ id, ic, n, titulo, texto, aba, botao });
  el.innerHTML = `<p class="muted"><span class="carregando"></span> Verificando o que precisa da sua atenção…</p>`;
  const contar = async (fn) => { try { return await fn(); } catch (e) { console.warn(e); return null; } };
  const hoje = hojeISO();
  const [semCartao, formsNovos, oracoesNovas, ausencias, ligacoes] = await Promise.all([
    admin ? contar(async () => (await getDocs(collection(db, "members"))).docs.filter((d) => d.data().status !== "recusado" && !d.data().numeroMembro).length) : null,
    admin ? contar(async () => (await getDocs(query(collection(db, "visitorForms"), where("status", "==", "novo")))).size) : null,
    admin ? contar(async () => (await getDocs(query(collection(db, "prayerRequests"), where("status", "==", "novo")))).size) : null,
    (admin || lider) ? contar(async () => {
      const s = await getDocs(admin ? query(collection(db, "schedules"), where("data", ">=", hoje), orderBy("data"), limit(300))
        : query(collection(db, "schedules"), where("liderIds", "array-contains", user.uid)));
      return s.docs.map((d) => d.data()).filter((e) => e.data >= hoje && e.status === "ausente");
    }) : null,
    admin ? contar(async () => (await getDocs(query(collection(db, "spiritualLinks"), where("status", "==", "pendente")))).size) : null
  ]);
  if (semCartao) card("p-cad", "cartao", semCartao, "Cadastros sem carteirinha", "Membros novos esperando número e carteirinha.", "cadastros");
  if (formsNovos) card("p-forms", "convite", formsNovos, "Formulários novos", "Visitantes, células, voluntariado e batismo aguardando contato.", "formularios", "Entrar em contato");
  if (oracoesNovas) card("p-ora", "oracao", oracoesNovas, "Pedidos de oração novos", "Pedidos que ainda não foram marcados como “Estamos orando”.", "oracao", "Ver pedidos");
  if (ausencias?.length) card("p-esc", "escala", ausencias.length, "Escalas com “Não posso”", ausencias.slice(0, 3).map((e) => `${nomeDe(e.memberId)} · ${e.ministerioNome || ""} · ${fmtData(e.data, { day: "2-digit", month: "short" })}`).join(" | ") + (ausencias.length > 3 ? " …" : ""), "escalas", "Ajustar escala");
  if (ligacoes) card("p-arv", "arvore", ligacoes, "Ligações da Árvore da Fé", "Histórias enviadas pelos membros aguardando confirmação.", "arvore", "Revisar");
  const atalhos = [
    tesoureiro && { aba: "contribuicoes", ic: "moeda", t: "Lançar contribuição" },
    (admin || lider) && { aba: "avisos", ic: "sino", t: "Enviar aviso" },
    (admin || lider) && { aba: "escalas", ic: "escala", t: "Montar escala" },
    admin && { aba: "eventos", ic: "ingresso", t: "Criar evento" },
    admin && { aba: "conteudo", ic: "play", t: "Transmissão ao vivo" }
  ].filter(Boolean);
  el.innerHTML = `${itens.length ? `<div class="pendencias">${itens.map((i) => `
      <article class="card pendencia" id="${i.id}"><div class="pend-num" aria-hidden="true">${i.n}</div>
        <div class="pend-txt"><h3>${icon(i.ic)}${esc(i.titulo)} <span class="sr-only">(${i.n})</span></h3><p class="muted pequeno">${esc(i.texto)}</p></div>
        <a class="btn pequeno" href="#${i.aba}">${esc(i.botao)}${icon("seta")}</a></article>`).join("")}</div>`
    : `<div class="vazio">${icon("check")}<p class="vazio-titulo">Tudo em dia!</p><p>Nenhuma pendência no momento. Bom trabalho!</p></div>`}
    ${atalhos.length ? `<h3 class="titulo-secao">Atalhos</h3><div class="linha">${atalhos.map((a) => `<a class="chip" href="#${a.aba}" style="text-decoration:none">${icon(a.ic)}${esc(a.t)}</a>`).join("")}</div>` : ""}`;
  const total = itens.reduce((t, i) => t + i.n, 0);
  const c = document.querySelector('[data-c="inicio"]');
  if (c) c.innerHTML = total ? ` <span class="selo perigo" style="padding:0 7px">${total}</span>` : "";
}

// Contador de pendências
(async () => {
  if (!admin) return;
  try {
    const p = await getDocs(collection(db, "members"));
    const novos = p.docs.filter((d) => ["aprovado", "pendente"].includes(d.data().status) && !d.data().numeroMembro).length;
    if (novos) document.querySelector('[data-c="cadastros"]').innerHTML = ` <span class="selo perigo" style="padding:0 7px">${novos}</span>`;
    const l = await getDocs(query(collection(db, "spiritualLinks"), where("status", "==", "pendente")));
    if (l.size) document.querySelector('[data-c="arvore"]').innerHTML = ` <span class="selo perigo" style="padding:0 7px">${l.size}</span>`;
  } catch {}
})();

/* =================== Controle de cadastros =================== */
// Aprovação automática: todo cadastro novo já entra aprovado. Aqui o admin vê quem entrou,
// gera nº/carteirinha, bloqueia ou exclui cadastros indesejados.
const ESTADO_ROTULO = { aprovado: "Ativo", pendente: "Pendente", recusado: "Bloqueado", inativo: "Inativo" };
const msCriado = (m) => (m.criadoEm && typeof m.criadoEm.toMillis === "function") ? m.criadoEm.toMillis() : 0;
async function abaCadastros(el) {
  el.innerHTML = `<span class="carregando"></span>`;
  const s = await getDocs(collection(db, "members"));
  const todos = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => msCriado(b) - msCriado(a));
  let filtro = "todos", busca = ctx.buscaInicial || "";
  const desenhar = () => {
    const q = busca.trim().toLowerCase();
    const l = todos.filter((m) => (filtro === "todos" || (filtro === "novos" ? !m.numeroMembro && m.status !== "recusado" : m.status === filtro))
      && (!q || (m.nome || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q)));
    const n = (f) => todos.filter((m) => f === "novos" ? !m.numeroMembro && m.status !== "recusado" : m.status === f).length;
    el.innerHTML = `<p class="muted">Todo cadastro novo entra <b>aprovado automaticamente</b>. Use esta lista para conferir quem entrou e <b>bloquear</b> ou <b>excluir</b> cadastros indesejados.</p>
      <div class="linha" style="flex-wrap:wrap;gap:8px;margin:8px 0 14px">
        ${[["todos", `Todos (${todos.length})`], ["novos", `Sem carteirinha (${n("novos")})`], ["aprovado", `Ativos (${n("aprovado")})`], ["recusado", `Bloqueados (${n("recusado")})`]]
          .map(([v, t]) => `<button class="chip" data-f="${v}" aria-pressed="${filtro === v}">${esc(t)}</button>`).join("")}
        <input type="search" id="busca-cad" placeholder="Buscar por nome ou e-mail" value="${esc(busca)}" style="flex:1;min-width:200px">
      </div>
      ${l.length ? `<div class="pilha">${l.map((m) => {
        const eu = m.id === user.uid, bloq = m.status === "recusado";
        return `<article class="card linha entre" style="flex-wrap:wrap;gap:10px"><div class="linha">${avatar(m.nome, m.foto)}<div>
          <b>${esc(m.nome || "(sem nome)")}</b> <span class="selo ${bloq ? "perigo" : ""}">${esc(ESTADO_ROTULO[m.status] || m.status)}</span>${(m.papeis || []).includes("admin") ? ` <span class="selo">admin</span>` : ""}
          <br><small class="muted">${esc(m.email || "")} · cadastro em ${esc(fmtData(m.criadoEm))}${m.numeroMembro ? ` · nº ${esc(m.numeroMembro)}` : ""}</small></div></div>
          <div class="linha" style="flex-wrap:wrap;gap:6px">
            ${!bloq && !m.numeroMembro ? `<button class="btn pequeno" data-cart="${m.id}">${icon("check")}Gerar nº e carteirinha</button>` : ""}
            ${m.status === "pendente" ? `<button class="btn pequeno" data-ativar="${m.id}">Aprovar</button>` : ""}
            ${eu ? `<small class="muted">(você)</small>` : bloq
              ? `<button class="btn secundario pequeno" data-ativar="${m.id}">Desbloquear</button>`
              : `<button class="btn fantasma pequeno" data-bloq="${m.id}">Bloquear</button>`}
            ${eu ? "" : `<button class="btn fantasma pequeno" data-excluir="${m.id}" style="color:var(--perigo, #b42318)">Excluir</button>`}
          </div></article>`; }).join("")}</div>`
        : `<div class="vazio">Nenhum cadastro nesta lista.</div>`}`;
    el.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { filtro = b.dataset.f; desenhar(); });
    const bi = el.querySelector("#busca-cad");
    bi.oninput = () => { busca = bi.value; const pos = bi.selectionStart; desenhar(); const nb = el.querySelector("#busca-cad"); nb.focus(); nb.setSelectionRange(pos, pos); };
    const achar = (id) => todos.find((m) => m.id === id);
    const marcarSaindo = (id) => el.querySelector(`[data-excluir="${id}"], [data-bloq="${id}"]`)?.closest("article")?.classList.add("saindo");
    const acao = (sel, fn) => el.querySelectorAll(sel).forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { await fn(achar(b.getAttribute(sel.slice(1, -1)))); } catch (e) { toast(mensagemErro(e), "erro"); }
      abaCadastros(el);
    });
    acao("[data-cart]", async (m) => { await aprovar(m.id); toast("Nº de membro e carteirinha gerados."); });
    acao("[data-ativar]", async (m) => {
      if (m.cartaoToken) await setDoc(doc(db, "cards", m.cartaoToken), { status: "ativo" }, { merge: true });
      await updateDoc(doc(db, "members", m.id), { status: "aprovado", atualizadoEm: serverTimestamp() });
      toast("Acesso liberado.");
    });
    acao("[data-bloq]", async (m) => {
      const nome = m.nome || m.email;
      if (!(await confirmar(`Bloquear ${nome}? A pessoa perde o acesso à área do membro e some da lista de membros. Ela não consegue se cadastrar de novo com esta conta.`, { ok: "Bloquear " + (m.nome || "").split(" ")[0], perigo: true, titulo: "Bloquear cadastro" }))) return;
      marcarSaindo(m.id);
      const ok = await comDesfazer(`${nome} será bloqueado(a).`, async () => {
        await updateDoc(doc(db, "members", m.id), { status: "recusado", atualizadoEm: serverTimestamp() });
        await deleteDoc(doc(db, "directory", m.id)).catch(() => {});
        if (m.cartaoToken) await setDoc(doc(db, "cards", m.cartaoToken), { status: "inativo" }, { merge: true }).catch(() => {});
      });
      if (ok) toast("Cadastro bloqueado.");
    });
    acao("[data-excluir]", async (m) => {
      const nome = m.nome || m.email;
      if (!(await confirmar(`Excluir de vez o cadastro de ${nome}? Os dados do cadastro são apagados. Atenção: se a pessoa entrar de novo, ela é aprovada automaticamente. Para impedir o acesso, use "Bloquear".`, { ok: "Excluir " + (m.nome || "").split(" ")[0], perigo: true, titulo: "Excluir cadastro" }))) return;
      marcarSaindo(m.id);
      const ok = await comDesfazer(`Cadastro de ${nome} será excluído.`, async () => {
        await deleteDoc(doc(db, "directory", m.id)).catch(() => {});
        if (m.cartaoToken) await deleteDoc(doc(db, "cards", m.cartaoToken)).catch(() => {});
        await deleteDoc(doc(db, "members", m.id));
      });
      if (ok) toast("Cadastro excluído.");
    });
  };
  desenhar();
}

/** Aprova: número de membro sequencial, carteirinha com token aleatório (QR de verificação). */
async function aprovar(id) {
  await runTransaction(db, async (t) => {
    const cRef = doc(db, "counters", "membros"), mRef = doc(db, "members", id);
    const [c, m] = await Promise.all([t.get(cRef), t.get(mRef)]);
    const dados = m.data();
    const numero = dados.numeroMembro || String((c.exists() ? c.data().proximo : 1)).padStart(4, "0");
    const token = dados.cartaoToken || idAleatorio(24);
    const membroDesde = dados.dataMembresia || hojeISO();
    t.set(cRef, { proximo: (c.exists() ? c.data().proximo : 1) + (dados.numeroMembro ? 0 : 1) }, { merge: true });
    t.update(mRef, { status: "aprovado", numeroMembro: numero, cartaoToken: token, dataMembresia: membroDesde, aprovadoPor: user.uid, aprovadoEm: serverTimestamp() });
    t.set(doc(db, "cards", token), { nome: dados.nome || "", cargo: dados.cargo || "Membro", numero, membroDesde, status: "ativo" });
  });
}

/* =================== Membros =================== */
function abaMembros(el) {
  const ESTADOS = [["aprovado", "Aprovado"], ["pendente", "Pendente"], ["recusado", "Bloqueado"], ["inativo", "Inativo"]];
  montarCrud(el, {
    colecao: "members", titulo: "Membro", podeCriar: false,
    descricao: "Cargo, batismo, membresia, número e papéis só a liderança altera. Os dados pessoais o próprio membro edita no perfil.",
    extrasTopo: `<button class="btn secundario pequeno" id="csv">${icon("baixar")}Exportar CSV</button>`,
    ordenar: (a, b) => (a.nome || "").localeCompare(b.nome || ""),
    campos: [
      { id: "nome", rotulo: "Nome", obrigatorio: true, max: 100 },
      { id: "email", rotulo: "E-mail", somenteTabela: true },
      { id: "celular", rotulo: "Celular", max: 30 },
      { id: "cargo", rotulo: "Cargo", max: 60, ajuda: "Ex.: Membro, Diácono, Presbítero, Pastor" },
      { id: "dataBatismo", rotulo: "Data de batismo", tipo: "date" },
      { id: "dataMembresia", rotulo: "Membro desde", tipo: "date" },
      { id: "numeroMembro", rotulo: "Nº de membro", max: 12 },
      { id: "status", rotulo: "Situação", tipo: "select", opcoes: ESTADOS, obrigatorio: true },
      { id: "papeis", rotulo: "Papéis de acesso", tipo: "multi", opcoes: [["lider", "Líder (grupo/ministério)"], ["tesoureiro", "Tesoureiro"], ["admin", "Admin (acesso total)"]] }
    ],
    colunas: ["nome", "email", "cargo", "numeroMembro", "status", "papeis"],
    antesDeSalvar: async (d, orig) => {
      if (orig.id === user.uid && orig.papeis?.includes("admin") && !d.papeis.includes("admin") && !(await confirmar("Você vai remover o SEU próprio acesso de admin. Continuar?", { perigo: true }))) return false;
      return d;
    },
    depoisDeSalvar: async (d, orig) => {
      // mantém a carteirinha (verificação por QR) coerente
      if (orig.cartaoToken) await setDoc(doc(db, "cards", orig.cartaoToken), { nome: d.nome, cargo: d.cargo || "Membro", numero: d.numeroMembro || "", membroDesde: d.dataMembresia || "", status: d.status === "aprovado" ? "ativo" : "inativo" }, { merge: true });
      if (ctx.pessoas.has(orig.id)) await setDoc(doc(db, "directory", orig.id), { nome: d.nome }, { merge: true });
    },
    depoisDeExcluir: async (m) => {
      await deleteDoc(doc(db, "directory", m.id)).catch(() => {});
      if (m.cartaoToken) await deleteDoc(doc(db, "cards", m.cartaoToken)).catch(() => {});
    },
    aoRender: (raiz, itens) => {
      raiz.querySelector("#csv").onclick = () => {
        const cab = ["Nome", "E-mail", "Celular", "Aniversário", "Cargo", "Nº", "Membro desde", "Batismo", "Situação", "Papéis", "Endereço", "Cônjuge", "Filhos"];
        const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const linhas = itens.map((m) => [m.nome, m.email, m.celular, fmtData(m.aniversario), m.cargo, m.numeroMembro, fmtData(m.dataMembresia), fmtData(m.dataBatismo), m.status, (m.papeis || []).join(" "), m.endereco, m.familia?.conjuge?.nome, (m.familia?.filhos || []).map((f) => f.nome).join(", ")].map(q).join(";"));
        baixarArquivo(`membros-${hojeISO()}.csv`, "﻿" + [cab.map(q).join(";"), ...linhas].join("\r\n"), "text/csv;charset=utf-8");
      };
    }
  }, ctx);
}

/* =================== Grupos / Meu grupo =================== */
const CAMPOS_GRUPO = [
  { id: "nome", rotulo: "Nome do grupo", obrigatorio: true, max: 80 },
  { id: "liderId", rotulo: "Líder", tipo: "membro", obrigatorio: true },
  { id: "liderWhatsapp", rotulo: "WhatsApp do líder", ajuda: "Só números com DDI e DDD, ex.: 5592999999999" },
  { id: "dia", rotulo: "Dia do encontro", tipo: "select", opcoes: ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"].map((d) => [d, d]) },
  { id: "horario", rotulo: "Horário", tipo: "time" },
  { id: "local", rotulo: "Local", max: 200 },
  { id: "membros", rotulo: "Participantes", tipo: "membros" }
];
function abaGrupos(el) {
  montarCrud(el, {
    colecao: "groups", titulo: "Grupo", campos: CAMPOS_GRUPO, colunas: ["nome", "liderId", "dia", "horario", "membros"],
    ordenar: (a, b) => a.nome.localeCompare(b.nome),
    antesDeSalvar: (d) => { d.liderNome = nomeDe(d.liderId); if (!d.membros.includes(d.liderId)) d.membros.push(d.liderId); return d; }
  }, ctx);
}
function abaMeuGrupo(el) {
  montarCrud(el, {
    colecao: "groups", titulo: "Grupo", podeCriar: false, podeExcluir: false,
    consulta: (db) => query(collection(db, "groups"), where("liderId", "==", user.uid)),
    campos: CAMPOS_GRUPO.filter((c) => ["dia", "horario", "local", "membros"].includes(c.id)).concat([{ id: "nome", rotulo: "Nome", somenteTabela: true }]),
    colunas: ["nome", "dia", "horario", "membros"],
    antesDeSalvar: (d) => ({ dia: d.dia, horario: d.horario, local: d.local, membros: d.membros })
  }, ctx);
}

/* =================== Ministérios =================== */
function abaMinisterios(el) {
  montarCrud(el, {
    colecao: "ministries", titulo: "Ministério", ordenar: (a, b) => a.nome.localeCompare(b.nome),
    campos: [
      { id: "nome", rotulo: "Nome", obrigatorio: true, max: 80 },
      { id: "liderIds", rotulo: "Líderes", tipo: "membros", obrigatorio: true, ajuda: "Marque também o papel \"Líder\" na aba Membros." },
      { id: "liderWhatsapp", rotulo: "WhatsApp do líder (para avisos de ausência)", ajuda: "Só números, ex.: 5592999999999" },
      { id: "membros", rotulo: "Voluntários", tipo: "membros" }
    ],
    colunas: ["nome", "liderIds", "membros"],
    antesDeSalvar: (d) => { d.liderNome = d.liderIds.map(nomeDe).join(", "); return d; }
  }, ctx);
}

/* =================== Escalas =================== */
async function abaEscalas(el) {
  const ms = await getDocs(admin ? collection(db, "ministries") : query(collection(db, "ministries"), where("liderIds", "array-contains", user.uid)));
  const ministerios = ms.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (!ministerios.length) { el.innerHTML = `<div class="vazio">Nenhum ministério ${admin ? "cadastrado. Crie na aba Ministérios." : "sob sua liderança."}</div>`; return; }
  montarCrud(el, {
    colecao: "schedules", titulo: "Escala",
    descricao: "Quando alguém toca em \"Não poderei ir\", a escala aparece aqui como <b>ausente</b>, com o motivo.",
    consulta: (db) => admin ? query(collection(db, "schedules"), orderBy("data", "desc"), limit(300)) : query(collection(db, "schedules"), where("liderIds", "array-contains", user.uid)),
    ordenar: (a, b) => (b.data || "").localeCompare(a.data || ""),
    campos: [
      { id: "ministerioId", rotulo: "Ministério", tipo: "select", obrigatorio: true, opcoes: ministerios.map((m) => [m.id, m.nome]) },
      { id: "memberId", rotulo: "Pessoa", tipo: "membro", obrigatorio: true },
      { id: "data", rotulo: "Data", tipo: "date", obrigatorio: true },
      { id: "hora", rotulo: "Horário", tipo: "time" },
      { id: "funcao", rotulo: "Função", obrigatorio: true, max: 60, ajuda: "Ex.: Vocal, Teclado, Porta principal, Projeção" },
      { id: "status", rotulo: "Situação", tipo: "select", padrao: "escalado", opcoes: [["escalado", "Escalado"], ["confirmado", "Confirmado"], ["ausente", "Ausente"]] },
      { id: "motivo", rotulo: "Motivo da ausência", somenteTabela: true }
    ],
    colunas: ["data", "ministerioId", "memberId", "funcao", "status", "motivo"],
    antesDeSalvar: (d) => {
      const m = ministerios.find((x) => x.id === d.ministerioId);
      return { ...d, ministerioNome: m.nome, liderIds: m.liderIds || [], liderWhatsapp: m.liderWhatsapp || "", memberNome: nomeDe(d.memberId) };
    }
  }, ctx);
}

/* =================== Eventos =================== */
function abaEventos(el) {
  montarCrud(el, {
    colecao: "events", titulo: "Evento", ordenar: (a, b) => (b.data || "").localeCompare(a.data || ""),
    campos: [
      { id: "titulo", rotulo: "Título", obrigatorio: true, max: 120 },
      { id: "data", rotulo: "Data", tipo: "date", obrigatorio: true },
      { id: "hora", rotulo: "Horário", tipo: "time" },
      { id: "local", rotulo: "Local", max: 150 },
      { id: "descricao", rotulo: "Descrição", tipo: "textarea", max: 1500 },
      { id: "publico", rotulo: "Mostrar no site público (home)", tipo: "checkbox", padrao: true },
      { id: "inscricoes", rotulo: "Aceita inscrições de membros", tipo: "checkbox" }
    ],
    colunas: ["data", "titulo", "local", "publico", "inscricoes"],
    acoesLinha: (e) => `<button class="btn-icone" data-acao="inscritos" data-item="${esc(e.id)}" aria-label="Ver inscritos">${icon("usuarios")}</button>`,
    aoAcao: async (acao, e) => {
      const s = await getDocs(query(collection(db, "registrations"), where("eventId", "==", e.id)));
      const l = s.docs.map((d) => d.data());
      abrirDialogo({ titulo: `Inscritos · ${e.titulo}`, corpo: l.length ? `<p><b>${l.length}</b> inscrito(s)</p><ol>${l.map((r) => `<li>${esc(r.nome)}</li>`).join("")}</ol>` : `<p class="muted">Nenhuma inscrição ainda.</p>` });
    }
  }, ctx);
}

/* =================== Séries e mensagens =================== */
async function abaMensagens(el) {
  el.innerHTML = `<h3>Séries (campanhas)</h3><div id="series"></div><h3 style="margin-top:28px">Mensagens</h3><div id="msgs"></div>`;
  const series = (await getDocs(collection(db, "series"))).docs.map((d) => ({ id: d.id, ...d.data() }));
  const limparCache = () => { try { Object.keys(sessionStorage).filter((k) => k.startsWith("pub_")).forEach((k) => sessionStorage.removeItem(k)); } catch {} };
  montarCrud(el.querySelector("#series"), {
    colecao: "series", titulo: "Série", ordenar: (a, b) => (b.ordem || 0) - (a.ordem || 0), depoisDeSalvar: limparCache,
    campos: [
      { id: "titulo", rotulo: "Título", obrigatorio: true, max: 80 },
      { id: "descricao", rotulo: "Descrição", tipo: "textarea", max: 400 },
      { id: "cor", rotulo: "Cor da campanha", tipo: "color", padrao: "#5E7A44" },
      { id: "capa", rotulo: "Imagem de capa (caminho no repositório)", ajuda: "Ex.: assets/img/series/raizes.webp (opcional)" },
      { id: "ordem", rotulo: "Ordem (maior aparece primeiro)", tipo: "number", padrao: 1 },
      { id: "destaque", rotulo: "Série em destaque na página Assistir", tipo: "checkbox" }
    ],
    colunas: ["titulo", "cor", "ordem", "destaque"]
  }, ctx);
  montarCrud(el.querySelector("#msgs"), {
    colecao: "sermons", titulo: "Mensagem", ordenar: (a, b) => (b.data || "").localeCompare(a.data || ""), depoisDeSalvar: limparCache,
    campos: [
      { id: "titulo", rotulo: "Título", obrigatorio: true, max: 150 },
      { id: "serieId", rotulo: "Série", tipo: "select", opcoes: series.map((s) => [s.id, s.titulo]) },
      { id: "pregador", rotulo: "Pregador", max: 100 },
      { id: "data", rotulo: "Data", tipo: "date", obrigatorio: true, ajuda: "Na data da mensagem, o modo \"Estou no culto\" vincula a anotação automaticamente." },
      { id: "youtube", rotulo: "Link do YouTube", ajuda: "Cole o link do vídeo (youtube.com/watch?v=… ou youtu.be/…)" },
      { id: "referencias", rotulo: "Referências bíblicas", max: 200, ajuda: "Ex.: Jo 3:16; Rm 8" },
      { id: "resumo", rotulo: "Resumo", tipo: "textarea", max: 800 }
    ],
    colunas: ["data", "titulo", "serieId", "pregador"]
  }, ctx);
}

/* =================== Avisos =================== */
async function abaAvisos(el) {
  const [gs, ms] = await Promise.all([
    getDocs(admin ? collection(db, "groups") : query(collection(db, "groups"), where("liderId", "==", user.uid))),
    getDocs(admin ? collection(db, "ministries") : query(collection(db, "ministries"), where("liderIds", "array-contains", user.uid)))
  ]);
  const alvos = [
    ...(admin ? [["geral|", "Todos os membros (geral)"]] : []),
    ...gs.docs.map((d) => [`grupo|${d.id}`, "Grupo: " + d.data().nome]),
    ...ms.docs.map((d) => [`ministerio|${d.id}`, "Ministério: " + d.data().nome])
  ];
  montarCrud(el, {
    colecao: "notices", titulo: "Aviso",
    consulta: (db) => admin ? query(collection(db, "notices"), orderBy("criadoEm", "desc"), limit(200)) : query(collection(db, "notices"), where("autorId", "==", user.uid)),
    campos: [
      { id: "titulo", rotulo: "Título", obrigatorio: true, max: 120 },
      { id: "texto", rotulo: "Texto", tipo: "textarea", obrigatorio: true, max: 3000 },
      { id: "alvo", rotulo: "Para quem", tipo: "select", obrigatorio: true, opcoes: alvos, formatar: (v, c) => c.item.alvoTipo === "lista" ? `Lista (${(c.item.alvoIds || []).length} pessoas)` : esc(alvos.find((a) => a[0] === v)?.[1] || v) },
      { id: "criadoEm", rotulo: "Publicado em", somenteTabela: true, tipo: "date" }
    ],
    colunas: ["titulo", "alvo", "criadoEm"],
    camposVirtuais: ["alvo"],
    preparar: (i) => ({ ...i, alvo: `${i.alvoTipo || "geral"}|${i.alvoId || ""}` }),
    antesDeSalvar: (d, orig) => {
      const [alvoTipo, alvoId] = (d.alvo || "geral|").split("|");
      return { titulo: d.titulo, texto: d.texto, alvoTipo, alvoId: alvoId || null, autorId: orig?.autorId || user.uid, criadoEm: orig?.criadoEm || serverTimestamp() };
    }
  }, ctx);
}

/* =================== Formulários e oração =================== */
function abaFormularios(el) {
  const TIPOS = [["visita", "Avise que você vem"], ["grupo", "Célula/grupo"], ["voluntariado", "Voluntariado"], ["batismo", "Batismo"]];
  montarCrud(el, {
    colecao: "visitorForms", titulo: "Formulário", podeCriar: false,
    consulta: (db) => query(collection(db, "visitorForms"), orderBy("criadoEm", "desc"), limit(300)),
    campos: [
      { id: "tipo", rotulo: "Tipo", tipo: "select", opcoes: TIPOS, somenteTabela: true },
      { id: "nome", rotulo: "Nome", somenteTabela: true },
      { id: "celular", rotulo: "Celular", somenteTabela: true, formatar: (v) => v ? `<a href="${linkWhatsApp("Olá, " + "tudo bem? Aqui é da IDPB Jave Sabaoth.", "55" + String(v).replace(/\D/g, "").replace(/^55/, ""))}" target="_blank" rel="noopener">${esc(v)}</a>` : "—" },
      { id: "extras", rotulo: "Detalhes", somenteTabela: true, formatar: (v, c) => esc([Object.entries(v || {}).map(([k, x]) => `${k}: ${[].concat(x).join(", ")}`).join(" · "), c.item.mensagem].filter(Boolean).join(" — ")) },
      { id: "criadoEm", rotulo: "Recebido", somenteTabela: true, tipo: "date" },
      { id: "status", rotulo: "Situação", tipo: "select", opcoes: [["novo", "Novo"], ["contato", "Em contato"], ["concluido", "Concluído"]] }
    ],
    colunas: ["criadoEm", "tipo", "nome", "celular", "extras", "status"],
    antesDeSalvar: (d) => ({ status: d.status })
  }, ctx);
}
function abaOracao(el) {
  montarCrud(el, {
    colecao: "prayerRequests", titulo: "Pedido", podeCriar: false,
    descricao: "Pedidos anônimos não guardam nenhum dado do autor.",
    consulta: (db) => query(collection(db, "prayerRequests"), orderBy("criadoEm", "desc"), limit(300)),
    campos: [
      { id: "criadoEm", rotulo: "Recebido", somenteTabela: true, tipo: "date" },
      { id: "nome", rotulo: "Nome", somenteTabela: true, formatar: (v, c) => c.item.anonimo ? '<span class="selo">Anônimo</span>' : esc(v || "—") },
      { id: "contato", rotulo: "Contato", somenteTabela: true },
      { id: "pedido", rotulo: "Pedido", somenteTabela: true, formatar: (v) => `<span style="white-space:pre-line">${esc(v)}</span>` },
      { id: "status", rotulo: "Situação", tipo: "select", opcoes: [["novo", "Novo"], ["orado", "Estamos orando"], ["respondido", "Respondido"]] }
    ],
    colunas: ["criadoEm", "nome", "contato", "pedido", "status"],
    antesDeSalvar: (d) => ({ status: d.status })
  }, ctx);
}

/* =================== Contribuições (tesouraria) =================== */
function abaContribuicoes(el) {
  montarCrud(el, {
    colecao: "contributions", titulo: "Lançamento",
    descricao: "Privado: cada membro vê só os próprios lançamentos em \"Minhas contribuições\".",
    consulta: (db) => query(collection(db, "contributions"), orderBy("data", "desc"), limit(500)),
    campos: [
      { id: "memberId", rotulo: "Membro", tipo: "membro", obrigatorio: true },
      { id: "data", rotulo: "Data", tipo: "date", obrigatorio: true, padrao: hojeISO() },
      { id: "tipo", rotulo: "Tipo", tipo: "select", obrigatorio: true, opcoes: [["Dízimo", "Dízimo"], ["Oferta", "Oferta"], ["Oferta missionária", "Oferta missionária"], ["Campanha", "Campanha"], ["Outro", "Outro"]] },
      { id: "valor", rotulo: "Valor (R$)", tipo: "number", obrigatorio: true, passo: "0.01", formatar: (v) => fmtMoeda(v) },
      { id: "obs", rotulo: "Observação", max: 200 }
    ],
    colunas: ["data", "memberId", "tipo", "valor", "obs"],
    antesDeSalvar: (d) => { if (!(d.valor > 0)) throw new Error("!Informe um valor maior que zero."); d.lancadoPor = user.uid; return d; }
  }, ctx);
}

/* =================== Bíblia: progresso da importação =================== */
async function abaBiblia(el) {
  const vs = self.SITE_CONFIG.BIBLIAS;
  el.innerHTML = `<p class="muted">Os textos são importados pelo script <code>scripts/importar-biblia</code> (veja o README). Aqui você acompanha o progresso.</p><div class="grid grid-3" id="bv"></div><div id="det" style="margin-top:16px"></div>`;
  const metas = await Promise.all(vs.map(async (v) => { try { const s = await getDoc(doc(db, "bible", v.id, "meta", "progresso")); return s.exists() ? s.data() : { livros: {} }; } catch { return { livros: {} }; } }));
  el.querySelector("#bv").innerHTML = vs.map((v, i) => {
    const n = Object.keys(metas[i].livros || {}).length;
    return `<button class="card link" data-v="${i}" style="text-align:left;cursor:pointer;font:inherit"><b style="font-family:var(--fonte-titulo);font-size:1.3rem">${esc(v.id)}</b><br><span class="muted">${esc(v.nome)}</span>
      <p style="margin:10px 0 6px;font-weight:700">${esc(v.id)}: ${n} de 66 livros</p><div style="height:10px;border-radius:5px;background:var(--bg-suave);overflow:hidden"><div style="height:100%;width:${(n / 66) * 100}%;background:var(--verde)"></div></div></button>`;
  }).join("");
  el.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => {
    const i = +b.dataset.v, m = metas[i].livros || {};
    el.querySelector("#det").innerHTML = `<h3>${esc(vs[i].id)} por livro</h3><div class="grade-livros">${LIVROS.map((l) => `<div style="border:1.5px solid var(--borda);border-radius:10px;padding:6px 8px;font-size:.85rem;${m[l.id] ? "background:var(--ok-bg)" : "opacity:.6"}"><b>${esc(l.abrev)}</b> ${m[l.id] ? `✔<br><small>${m[l.id].capitulos} cap · ${esc((m[l.id].importadoEm || "").slice(0, 10))}</small>` : "<br><small>Em breve</small>"}</div>`).join("")}</div>`;
  });
}

/* =================== Árvore da Fé =================== */
async function abaArvore(el) {
  el.innerHTML = `<span class="carregando"></span>`;
  const [ls, ms] = await Promise.all([getDocs(collection(db, "spiritualLinks")), getDocs(query(collection(db, "members"), where("status", "==", "aprovado")))]);
  const ligacoes = new Map(ls.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
  const membros = ms.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nm = (id) => membros.find((m) => m.id === id)?.nome || nomeDe(id);
  const pendentes = [...ligacoes.values()].filter((l) => l.status === "pendente");
  const semLigacao = membros.filter((m) => !ligacoes.has(m.id));
  const linha = (l) => `<tr><td>${esc(nm(l.id))}</td><td>${l.raiz ? '<span class="selo">raiz</span>' : esc(l.ganhoPorId ? nm(l.ganhoPorId) : (l.ganhoPorNomeExterno || "—") + (l.ganhoPorNomeExterno ? " (sem cadastro)" : ""))}</td>
    <td>${esc((l.modos || []).map((m) => MODOS[m]?.nome || m).join(", "))}</td><td>${esc(l.dataConversao || "")}</td>
    <td><span class="selo ${l.status === "confirmado" ? "verde" : "ouro"}">${esc(l.status)}</span></td>
    <td style="white-space:nowrap">${l.status === "pendente" ? `<button class="btn pequeno" data-aprovar="${esc(l.id)}">Aprovar</button>` : ""}<button class="btn-icone" data-mover="${esc(l.id)}" aria-label="Corrigir/mover">${icon("lapis")}</button><button class="btn-icone" data-hist="${esc(l.id)}" aria-label="Histórico">${icon("historico")}</button></td></tr>`;
  el.innerHTML = `
    <h3>Ligações aguardando confirmação (${pendentes.length})</h3>
    <div class="tabela-wrap"><table><thead><tr><th>Membro</th><th>Ganho por</th><th>Como</th><th>Ano</th><th>Situação</th><th></th></tr></thead><tbody>${pendentes.map(linha).join("") || `<tr><td colspan="6" class="muted">Nenhuma pendente.</td></tr>`}</tbody></table></div>
    <h3 style="margin-top:24px">Membros sem "ganho por" informado (${semLigacao.length})</h3>
    <p>${semLigacao.map((m) => `<span class="chip" style="cursor:default;margin:2px">${esc(m.nome)}</span>`).join("") || '<span class="muted">Todos preencheram. 🙌</span>'}</p>
    ${semLigacao.length ? `<div class="linha"><button class="btn pequeno" id="lembrar">${icon("sino")}Lembrar esses membros (aviso no app)</button><button class="btn secundario pequeno" id="lembrar-wa">${icon("whatsapp")}Copiar mensagem para WhatsApp</button></div>` : ""}
    <h3 style="margin-top:24px">Todas as ligações (${ligacoes.size})</h3>
    <div class="tabela-wrap"><table><thead><tr><th>Membro</th><th>Ganho por</th><th>Como</th><th>Ano</th><th>Situação</th><th></th></tr></thead><tbody>${[...ligacoes.values()].sort((a, b) => nm(a.id).localeCompare(nm(b.id))).map(linha).join("")}</tbody></table></div>
    <p style="margin-top:12px"><button class="btn secundario pequeno" id="nova-lig">${icon("mais")}Cadastrar ligação para um membro</button></p>`;

  const hist = (l, acao, extra = {}) => [...(l?.historico || []), { em: Date.now(), por: user.uid, acao, ...extra }].slice(-100);
  el.querySelectorAll("[data-aprovar]").forEach((b) => b.onclick = async () => {
    const l = ligacoes.get(b.dataset.aprovar);
    try { await updateDoc(doc(db, "spiritualLinks", l.id), { status: "confirmado", confirmadoPor: user.uid, confirmadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(), historico: hist(l, "aprovado pelo admin") }); toast("Ligação aprovada."); abaArvore(el); }
    catch (e) { toast(mensagemErro(e), "erro"); }
  });
  el.querySelectorAll("[data-hist]").forEach((b) => b.onclick = () => {
    const l = ligacoes.get(b.dataset.hist);
    abrirDialogo({ titulo: `Histórico · ${nm(l.id)}`, corpo: `<ol class="pilha">${(l.historico || []).slice().reverse().map((h) => `<li><b>${esc(h.acao)}</b> — ${esc(h.em ? new Date(h.em).toLocaleString("pt-BR") : "")} por ${esc(h.por === "seed" ? "dados de exemplo" : nm(h.por))}${h.de !== undefined ? `<br><small class="muted">de: ${esc(h.de || "—")} → para: ${esc(h.para || "—")}</small>` : ""}</li>`).join("") || "<li class='muted'>Sem histórico.</li>"}</ol>` });
  });
  const editar = (id) => {
    const l = ligacoes.get(id) || {};
    const ops = membros.filter((m) => m.id !== id).sort((a, b) => a.nome.localeCompare(b.nome));
    const d = abrirDialogo({
      titulo: id ? `Ligação · ${nm(id)}` : "Nova ligação",
      corpo: `<form class="form">
        ${id ? "" : `<div class="campo"><label for="lm">Membro</label><select id="lm">${membros.filter((m) => !ligacoes.has(m.id)).map((m) => `<option value="${esc(m.id)}">${esc(m.nome)}</option>`).join("")}</select></div>`}
        <div class="campo"><label for="lg">Ganho por (membro)</label><select id="lg"><option value="">— nenhum / pessoa de fora / raiz —</option>${ops.map((m) => `<option value="${esc(m.id)}" ${m.id === l.ganhoPorId ? "selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></div>
        <div class="campo"><label for="le">Ou pessoa sem cadastro</label><input id="le" value="${esc(l.ganhoPorNomeExterno || "")}" maxlength="100"></div>
        <fieldset><legend>Como foi</legend><div class="opcoes-chip">${Object.entries(MODOS).map(([k, m]) => `<label class="chip"><input type="checkbox" name="lmodo" value="${k}" ${(l.modos || []).includes(k) ? "checked" : ""}>${esc(m.nome)}</label>`).join("")}</div></fieldset>
        <div class="campo"><label for="la">Ano/data aproximada</label><input id="la" value="${esc(l.dataConversao || "")}" maxlength="20"></div>
        <div class="campo"><label for="ls">Situação</label><select id="ls"><option value="confirmado" ${l.status !== "pendente" ? "selected" : ""}>Confirmado</option><option value="pendente" ${l.status === "pendente" ? "selected" : ""}>Pendente</option></select></div>
        <div class="msg" role="alert"></div></form>`,
      rodape: `${id ? `<button class="btn fantasma" id="lx">${icon("lixeira")}Excluir ligação</button>` : ""}<button class="btn" id="lok">${icon("check")}Salvar</button>`
    });
    d.querySelector("#lok").onclick = async () => {
      const mid = id || d.querySelector("#lm").value;
      const ganhoPorId = d.querySelector("#lg").value, ext = d.querySelector("#le").value.trim();
      if (ganhoPorId && criaCiclo(ligacoes, mid, ganhoPorId)) { d.querySelector(".msg").innerHTML = `<div class="alerta erro">${icon("alerta")}<p>Isso criaria um ciclo: ${esc(nm(ganhoPorId))} é descendente na fé de ${esc(nm(mid))}.</p></div>`; return; }
      const de = l.ganhoPorId ? nm(l.ganhoPorId) : l.ganhoPorNomeExterno || (l.raiz ? "raiz" : "");
      const para = ganhoPorId ? nm(ganhoPorId) : ext || "raiz";
      const dados = {
        modos: [...d.querySelectorAll("input[name=lmodo]:checked")].map((c) => c.value), dataConversao: d.querySelector("#la").value.trim(),
        status: d.querySelector("#ls").value, criadoPor: l.criadoPor || user.uid, atualizadoEm: serverTimestamp(),
        historico: hist(l, id ? "corrigido/movido pelo admin" : "cadastrado pelo admin", { de, para }), contribuiram: l.contribuiram || []
      };
      if (ganhoPorId) Object.assign(dados, { ganhoPorId, ganhoPorNome: nm(ganhoPorId) });
      else if (ext) Object.assign(dados, { ganhoPorNomeExterno: ext, ganhoPorNome: ext });
      else Object.assign(dados, { raiz: true, status: "confirmado" });
      if (l.criadoEm) dados.criadoEm = l.criadoEm; else dados.criadoEm = serverTimestamp();
      try { await setDoc(doc(db, "spiritualLinks", mid), dados); d.close(); toast("Ligação salva."); abaArvore(el); }
      catch (e) { d.querySelector(".msg").innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(mensagemErro(e))}</p></div>`; }
    };
    d.querySelector("#lx")?.addEventListener("click", async () => {
      if (!(await confirmar("Excluir esta ligação? O membro volta a aparecer como raiz.", { ok: "Excluir", perigo: true }))) return;
      await deleteDoc(doc(db, "spiritualLinks", id)); d.close(); toast("Ligação excluída."); abaArvore(el);
    });
  };
  el.querySelectorAll("[data-mover]").forEach((b) => b.onclick = () => editar(b.dataset.mover));
  el.querySelector("#nova-lig").onclick = () => editar(null);
  const textoLembrete = "Olá! Você já contou na Árvore da Fé quem te ganhou para Jesus? Entre na área do membro > Perfil > \"Quem me ganhou para Jesus?\". " + self.SITE_CONFIG.baseUrl() + "membro/perfil.html";
  el.querySelector("#lembrar")?.addEventListener("click", async () => {
    await addDoc(collection(db, "notices"), { titulo: "Conte sua história na Árvore da Fé", texto: textoLembrete, alvoTipo: "lista", alvoIds: semLigacao.map((m) => m.id), autorId: user.uid, criadoEm: serverTimestamp() });
    toast(`Aviso enviado para ${semLigacao.length} membro(s).`);
  });
  el.querySelector("#lembrar-wa")?.addEventListener("click", () => copiar(textoLembrete, "Mensagem copiada. Cole no grupo do WhatsApp."));
}

/* =================== Conteúdo público (settings/public) =================== */
async function abaConteudo(el) {
  const s = await getDoc(doc(db, "settings", "public"));
  const v = { ...self.SITE_CONFIG.IGREJA, ...(s.exists() ? s.data() : {}) };
  const horariosTxt = (v.horarios || []).map((h) => `${h.dia} | ${h.hora} | ${h.nome}`).join("\n");
  const lidTxt = (v.lideranca || []).map((h) => `${h.nome} | ${h.cargo}`).join("\n");
  const vivoAtivo = v.aoVivo && Number(v.aoVivo.ate) > Date.now();
  el.innerHTML = `<div class="card pilha" id="painel-vivo" style="max-width:720px;margin-bottom:16px">
    <h3 style="margin:0">Transmissão ao vivo</h3>
    <p class="muted" style="margin:0">${vivoAtivo
      ? `<b>No ar</b> até ${new Date(v.aoVivo.ate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Manaus" })}. O site mostra o selo “Ao vivo” e o vídeo na página Assistir.`
      : "Quando começar a live no YouTube, cole o link aqui e toque em “Estou ao vivo”. O selo some sozinho depois de 3 horas."}</p>
    <div class="campo"><label for="v-url">Link da live no YouTube</label><input id="v-url" type="url" placeholder="https://youtube.com/live/…" value="${esc(v.aoVivo?.url || "")}"></div>
    <div class="campo"><label for="v-tit">Título (opcional)</label><input id="v-tit" maxlength="100" placeholder="Culto da Família" value="${esc(v.aoVivo?.titulo || "")}"></div>
    <div class="linha"><button class="btn" type="button" id="v-iniciar">${icon("play")}${vivoAtivo ? "Renovar por 3 horas" : "Estou ao vivo"}</button>
      ${vivoAtivo ? `<button class="btn secundario" type="button" id="v-encerrar">${icon("fechar")}Encerrar transmissão</button>` : ""}</div>
  </div>
  <form class="form card" id="fc" style="max-width:720px">
    <p class="muted">Estes dados aparecem na parte pública (home, primeira visita, contribuir, sobre). Campos vazios usam o padrão de <code>js/site-config.js</code>.</p>
    ${[["nome", "Nome da igreja"], ["endereco", "Endereço"], ["mapsQuery", "Texto para o Google Maps (\"Como chegar\")"], ["instagram", "Instagram (link completo)"], ["youtube", "YouTube (link completo)"], ["whatsapp", "WhatsApp (só números com DDI/DDD)"], ["pixChave", "Chave Pix"], ["pixTitular", "Titular do Pix"], ["pixCidade", "Cidade do Pix"]]
      .map(([k, t]) => `<div class="campo"><label for="s-${k}">${t}</label><input id="s-${k}" value="${esc(v[k] || "")}"></div>`).join("")}
    <div class="campo"><label for="s-horarios">Horários dos cultos</label><textarea id="s-horarios" placeholder="Domingo | 18h | Culto da família">${esc(horariosTxt)}</textarea><small class="ajuda">Um por linha: dia | hora | nome</small></div>
    <div class="campo"><label for="s-lid">Liderança (página Sobre)</label><textarea id="s-lid" placeholder="Pr. Fulano | Pastor presidente">${esc(lidTxt)}</textarea><small class="ajuda">Um por linha: nome | cargo</small></div>
    <button class="btn">${icon("check")}Salvar conteúdo público</button></form>`;
  const salvarVivo = async (ate) => {
    const url = el.querySelector("#v-url").value.trim();
    if (ate && !/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(url)) { toast("Cole um link do YouTube (https://youtube.com/…).", "erro"); return; }
    try {
      await setDoc(doc(db, "settings", "public"), { aoVivo: { url, titulo: el.querySelector("#v-tit").value.trim(), ate } }, { merge: true });
      try { sessionStorage.removeItem("pub_igreja"); } catch {}
      toast(ate ? "Pronto! O site já mostra “Ao vivo”." : "Transmissão encerrada.");
      abaConteudo(el);
    } catch (err) { toast(mensagemErro(err), "erro"); }
  };
  el.querySelector("#v-iniciar").onclick = () => salvarVivo(Date.now() + 3 * 60 * 60 * 1000);
  el.querySelector("#v-encerrar")?.addEventListener("click", () => salvarVivo(0));
  el.querySelector("#fc").onsubmit = async (e) => {
    e.preventDefault();
    const val = (k) => el.querySelector("#s-" + k).value.trim();
    const dados = Object.fromEntries(["nome", "endereco", "mapsQuery", "instagram", "youtube", "whatsapp", "pixChave", "pixTitular", "pixCidade"].map((k) => [k, val(k)]));
    dados.horarios = val("horarios").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]).map(([dia, hora = "", nome = ""]) => ({ dia, hora, nome }));
    dados.lideranca = val("lid").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]).map(([nome, cargo = ""]) => ({ nome, cargo }));
    dados.atualizadoEm = serverTimestamp();
    try { await setDoc(doc(db, "settings", "public"), dados, { merge: true }); try { sessionStorage.removeItem("pub_igreja"); } catch {} toast("Conteúdo público salvo."); }
    catch (err) { toast(mensagemErro(err), "erro"); }
  };
}

/* =================== Ferramentas =================== */
function abaFerramentas(el) {
  el.innerHTML = `<div class="card pilha" style="max-width:720px">
    <h3>Dados de exemplo (fictícios)</h3>
    <p class="muted">Carrega 15 membros fictícios, grupos, ministérios, escalas, eventos, séries, mensagens, avisos e uma Árvore da Fé com 4 gerações. Tudo marcado como fictício (IDs "exemplo-…"), sem nenhum texto bíblico. Você é incluído(a) na "Célula Esperança" de exemplo.</p>
    <div class="linha"><button class="btn" id="seed">${icon("mais")}Carregar dados de exemplo</button><button class="btn perigo" id="unseed">${icon("lixeira")}Remover dados de exemplo</button></div>
    <p id="seed-msg" class="pequeno" aria-live="polite"></p></div>`;
  const msg = el.querySelector("#seed-msg");
  el.querySelector("#seed").onclick = async () => {
    msg.textContent = "Carregando…";
    try { const { carregarExemplo } = await import("./seed.js"); const n = await carregarExemplo(db, user.uid, (a, t) => (msg.textContent = `Gravando ${a}/${t}…`)); msg.textContent = `Pronto: ${n} documentos de exemplo.`; await carregarPessoas(); }
    catch (e) { msg.textContent = mensagemErro(e); }
  };
  el.querySelector("#unseed").onclick = async () => {
    if (!(await confirmar("Remover todos os dados de exemplo (fictícios)?", { ok: "Remover", perigo: true }))) return;
    msg.textContent = "Removendo…";
    try { const { removerExemplo } = await import("./seed.js"); const n = await removerExemplo(db); msg.textContent = `Removidos ${n} documentos.`; await carregarPessoas(); }
    catch (e) { msg.textContent = mensagemErro(e); }
  };
}
