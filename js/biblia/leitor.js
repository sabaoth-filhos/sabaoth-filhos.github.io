// Leitor da Bíblia (área do membro).
import { exigirMembro, registrarAntesDeSair } from "../core/sessao.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, toast, abrirDialogo, normalizar, linkWhatsApp, copiar } from "../core/ui.js";
import { icon, hidratarIcones } from "../core/icons.js";
import { LIVROS } from "./livros.js";
import { livroPorId, interpretar, formatar, faixas, chaveCap, chaveVers } from "./referencias.js";
import { VERSOES, progresso, capitulo, livroInteiro, destaquesDoCapitulo, salvarDestaque, ultimoPonto, guardarPonto } from "./dados.js";
import { criarStore, novoId } from "./notas-store.js";
import { montarEditor, indexar, indicador } from "./editor-nota.js";

const { user, db } = await exigirMembro();
const SITE = self.SITE_CONFIG;
const MAX = SITE.MAX_VERSICULOS_COPIA || 5;
const CORES = ["amarelo", "verde", "azul", "rosa"];

const store = criarStore(db, user.uid);
registrarAntesDeSair(() => store.enviarTudo());
store.recuperar();

// ---------- Estado ----------
const prefs = (() => { try { return JSON.parse(localStorage.getItem("idpb_leitor_prefs") || "{}"); } catch { return {}; } })();
const salvarPrefs = () => { try { localStorage.setItem("idpb_leitor_prefs", JSON.stringify(prefs)); } catch {} };
const url = new URLSearchParams(location.search);
const ponto = await ultimoPonto(db, user.uid);
let versao = url.get("v") || ponto?.versao || prefs.versao || VERSOES[0].id;
let versao2 = prefs.versao2 || VERSOES.find((x) => x.id !== versao)?.id;
let comparar = !!prefs.comparar;
let livro = url.get("l") || ponto?.livro || "gn";
let cap = +(url.get("c") || ponto?.cap || 1);
let alvoVers = +(url.get("vs") || 0);
let fonte = prefs.fonte || 1.15;
let selecionados = new Set();
let destaques = {}, notasCap = [], versiculosAtuais = [];

// ---------- Estrutura ----------
document.querySelector(".barra-membro").remove();
const app = document.getElementById("app");
app.classList.remove("container");
app.innerHTML = `
<div class="leitor-barra"><div class="container">
  <label class="sr-only" for="sel-versao">Versão</label>
  <select id="sel-versao">${VERSOES.map((v) => `<option value="${v.id}">${v.id}</option>`).join("")}</select>
  <button class="btn btn-ref pequeno" id="btn-ref" aria-haspopup="dialog"><span id="ref-atual">…</span>${icon("menu")}</button>
  <button class="btn-icone" id="btn-busca" aria-label="Buscar">${icon("busca")}</button>
  <button class="btn-icone" id="btn-comp" aria-label="Comparar duas versões" aria-pressed="${comparar}">${icon("colunas")}</button>
  <button class="btn-icone" id="btn-menos" aria-label="Diminuir letra">${icon("zoomMenos")}</button>
  <button class="btn-icone" id="btn-mais" aria-label="Aumentar letra">${icon("zoomMais")}</button>
  <span id="sel2-wrap" class="${comparar ? "" : "oculto"}"><label class="sr-only" for="sel-versao2">Comparar com</label>
  <select id="sel-versao2">${VERSOES.map((v) => `<option value="${v.id}">com ${v.id}</option>`).join("")}</select></span>
</div></div>
<div class="container"><article class="leitor" id="texto" aria-live="polite"></article>
  <nav class="nav-cap" aria-label="Capítulos"><button class="btn secundario pequeno" id="ant">${icon("voltar")}Anterior</button><button class="btn secundario pequeno" id="prox">Próximo${icon("seta")}</button></nav>
  <p class="aviso-direitos" id="direitos"></p>
</div>
<div id="acoes"></div>`;
const $ = (s) => document.querySelector(s);
const texto = $("#texto");
$("#sel-versao").value = versao;
$("#sel-versao2").value = versao2;
texto.style.setProperty("--leitor-fonte", fonte + "rem");

// ---------- Renderização ----------
async function render() {
  selecionados.clear(); barraAcoes();
  const L = livroPorId(livro) || livroPorId("gn");
  livro = L.id; cap = Math.min(Math.max(1, cap), L.versiculos.length);
  $("#ref-atual").textContent = `${L.nome} ${cap}`;
  document.title = `${L.nome} ${cap} (${versao}) — Bíblia`;
  history.replaceState(null, "", `?v=${versao}&l=${livro}&c=${cap}`);
  texto.classList.toggle("comparar", comparar);
  texto.innerHTML = `<p class="muted"><span class="carregando"></span></p>`;
  $("#direitos").textContent = [versao, comparar ? versao2 : null].filter(Boolean).map((id) => `${id}: ${VERSOES.find((v) => v.id === id)?.aviso || ""}`).join(" · ");

  let vs = null, vs2 = null, erro = null;
  try { vs = await capitulo(db, versao, livro, cap); } catch (e) { erro = e; }
  if (comparar) { try { vs2 = await capitulo(db, versao2, livro, cap); } catch {} }
  versiculosAtuais = vs || [];
  if (!vs) {
    texto.innerHTML = `<div class="em-breve"><div class="icone-card verde" style="margin:0 auto 12px">${icon("relogio")}</div>
      <h2>${esc(L.nome)} ${cap}</h2><p class="muted">${erro ? "Sem internet e este capítulo ainda não foi baixado no aparelho." : `<b>Em breve</b> na versão ${esc(versao)}. Este livro ainda não foi importado.`}</p>
      <button class="btn secundario pequeno" id="abrir-livros">${icon("livro")}Escolher outro livro</button></div>`;
    $("#abrir-livros").onclick = escolherLivro;
    return;
  }
  [destaques, notasCap] = await Promise.all([
    destaquesDoCapitulo(db, user.uid, livro, cap).catch(() => ({})),
    notasDoCapitulo()
  ]);
  const notaPorV = {};
  notasCap.forEach((n) => (n.versiculos || []).forEach((k) => { const [l, c, v] = k.split("."); if (l === livro && +c === cap) (notaPorV[v] ||= []).push(n); }));
  const verso = (i, t, comNotas = true) => {
    const v = i + 1, d = destaques[v] || {};
    return `<span class="v" data-v="${v}" ${d.cor ? `data-cor="${d.cor}"` : ""}><sup>${v}</sup>${esc(t)}${comNotas && d.favorito ? `<span class="ic-fav" aria-label="Favorito">${icon("estrela")}</span>` : ""}${comNotas && notaPorV[v] ? `<button class="ic-nota" data-nota-v="${v}" aria-label="Ver anotação do versículo ${v}">${icon("nota")}</button>` : ""}</span> `;
  };
  if (comparar) {
    const n = Math.max(vs.length, vs2?.length || 0);
    texto.innerHTML = `<h2>${esc(L.nome)} ${cap}</h2><div class="linha-comp cab-comp"><div>${esc(versao)}</div><div>${esc(versao2)}</div></div>` +
      Array.from({ length: n }, (_, i) => `<div class="linha-comp"><div>${vs[i] != null ? verso(i, vs[i]) : ""}</div><div>${vs2 ? (vs2[i] != null ? verso(i, vs2[i], false).replace('class="v"', 'class="v v2"') : "") : `<span class="muted pequeno">${i === 0 ? "Em breve nesta versão" : ""}</span>`}</div></div>`).join("");
  } else {
    texto.innerHTML = `<h2>${esc(L.nome)} ${cap}</h2><p>${vs.map((t, i) => verso(i, t)).join("")}</p>`;
  }
  if (alvoVers) {
    const el = texto.querySelector(`.v[data-v="${alvoVers}"]`);
    if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("piscar"); }
    alvoVers = 0;
  } else scrollTo({ top: 0 });
  guardarPonto(db, user.uid, { versao, livro, cap });
}

async function notasDoCapitulo() {
  const k = chaveCap(livro, cap);
  let l = [];
  try {
    const s = await getDocs(query(collection(db, "users", user.uid, "notes"), where("capitulos", "array-contains", k)));
    l = s.docs.map((d) => d.data());
  } catch {}
  const rasc = (await store.rascunhos()).filter((n) => (n.capitulos || []).includes(k));
  const mapa = new Map(l.map((n) => [n.id, n]));
  rasc.forEach((n) => mapa.set(n.id, n));
  return [...mapa.values()].filter((n) => !n.excluidoEm);
}

// ---------- Seleção de versículos ----------
texto.addEventListener("click", (e) => {
  const bn = e.target.closest("[data-nota-v]");
  if (bn) { e.stopPropagation(); abrirNotasDoVersiculo(+bn.dataset.notaV); return; }
  const v = e.target.closest(".v");
  if (!v || window.getSelection().toString()) return;
  const n = +v.dataset.v;
  selecionados.has(n) ? selecionados.delete(n) : selecionados.add(n);
  texto.querySelectorAll(".v").forEach((el) => el.classList.toggle("sel", selecionados.has(+el.dataset.v)));
  barraAcoes();
});

function refSelecionada() {
  const nums = [...selecionados].sort((a, b) => a - b);
  return { nums, texto: `${livroPorId(livro).abrev} ${cap}:${faixas(nums)}` };
}

function barraAcoes() {
  const alvo = $("#acoes");
  if (!selecionados.size) { alvo.innerHTML = ""; return; }
  const { nums, texto: ref } = refSelecionada();
  const corAtual = nums.every((n) => destaques[n]?.cor === destaques[nums[0]]?.cor) ? destaques[nums[0]]?.cor : null;
  const fav = nums.every((n) => destaques[n]?.favorito);
  alvo.innerHTML = `<div class="barra-acoes" role="toolbar" aria-label="Ações para ${esc(ref)}">
    <div class="linha entre"><b>${esc(ref)}</b><button class="btn-icone" id="ac-fechar" aria-label="Limpar seleção" style="width:36px;height:36px">${icon("fechar")}</button></div>
    <div class="cores">${CORES.map((c) => `<button class="cor" data-cor="${c}" aria-pressed="${corAtual === c}" aria-label="Destacar em ${c}" style="background:var(--hl-${c})"></button>`).join("")}
      <button class="btn-icone" id="ac-sem-cor" aria-label="Remover destaque" style="width:38px;height:38px">${icon("lixeira")}</button>
      <button class="btn-icone" id="ac-fav" aria-pressed="${fav}" aria-label="${fav ? "Desfavoritar" : "Favoritar"}" style="width:38px;height:38px;${fav ? "background:var(--ouro);color:var(--preto)" : ""}">${icon("estrela")}</button></div>
    <div class="botoes"><button class="btn pequeno" id="ac-nota">${icon("lapis")}Anotar</button>
      <button class="btn secundario pequeno" id="ac-copiar">${icon("copiar")}Copiar</button>
      <button class="btn secundario pequeno" id="ac-compart">${icon("compartilhar")}Compartilhar</button></div></div>`;
  $("#ac-fechar").onclick = () => { selecionados.clear(); texto.querySelectorAll(".sel").forEach((el) => el.classList.remove("sel")); barraAcoes(); };
  alvo.querySelectorAll(".cor").forEach((b) => b.onclick = () => aplicarDestaque({ cor: b.dataset.cor }));
  $("#ac-sem-cor").onclick = () => aplicarDestaque({ cor: null });
  $("#ac-fav").onclick = () => aplicarDestaque({ favorito: !fav });
  $("#ac-nota").onclick = () => novaNotaVersiculo(nums);
  $("#ac-copiar").onclick = () => { const t = textoParaCopiar(nums); if (t) copiar(t, "Versículos copiados com a referência."); };
  $("#ac-compart").onclick = async () => {
    const t = textoParaCopiar(nums); if (!t) return;
    if (navigator.share) { try { await navigator.share({ text: t }); return; } catch {} }
    open(linkWhatsApp(t), "_blank", "noopener");
  };
}

async function aplicarDestaque(mud) {
  for (const n of selecionados) {
    const atual = destaques[n] || {};
    const novo = { cor: "cor" in mud ? mud.cor : atual.cor, favorito: "favorito" in mud ? mud.favorito : atual.favorito };
    destaques[n] = novo;
    salvarDestaque(db, user.uid, livro, cap, n, novo).catch(() => toast("Sem internet: o destaque será enviado depois.", "erro"));
  }
  const manter = new Set(selecionados);
  await render();
  manter.forEach((n) => selecionados.add(n));
  texto.querySelectorAll(".v").forEach((el) => el.classList.toggle("sel", selecionados.has(+el.dataset.v)));
  barraAcoes();
}

// ---------- Cópia limitada (proteção dos textos licenciados) ----------
function textoParaCopiar(nums) {
  if (nums.length > MAX) { toast(`Você pode copiar ou compartilhar até ${MAX} versículos por vez.`, "erro"); return null; }
  const corpo = nums.map((n) => `${n} ${versiculosAtuais[n - 1] || ""}`).join(" ");
  return `${corpo}\n— ${livroPorId(livro).abrev} ${cap}:${faixas(nums)} (${versao})`;
}
function versiculosNaSelecao() {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return [];
  const r = sel.getRangeAt(0);
  return [...texto.querySelectorAll(".v:not(.v2)")].filter((el) => r.intersectsNode(el)).map((el) => +el.dataset.v);
}
texto.addEventListener("copy", (e) => {
  const nums = versiculosNaSelecao();
  e.preventDefault();
  if (!nums.length) return;
  const t = textoParaCopiar([...new Set(nums)]);
  if (t) { e.clipboardData.setData("text/plain", t); toast("Copiado com a referência."); }
});
texto.addEventListener("dragstart", (e) => e.preventDefault());
texto.addEventListener("contextmenu", (e) => { if (versiculosNaSelecao().length > MAX) e.preventDefault(); });

// ---------- Anotações em versículos ----------
function rangesDe(nums) {
  const s = [...nums].sort((a, b) => a - b), r = [];
  for (const n of s) { const u = r[r.length - 1]; if (u && n === u.v2 + 1) u.v2 = n; else r.push({ livro, cap, v1: n, v2: n, versao }); }
  return r;
}
function abrirEditorDialogo(nota, titulo) {
  const d = abrirDialogo({ titulo, corpo: `<div id="dlg-ed"></div>`, aoFechar: () => { store.enviarTudo(); render(); } });
  const ed = montarEditor(d.querySelector("#dlg-ed"), { store, nota, db, versao });
  setTimeout(() => ed.foco(), 50);
}
function novaNotaVersiculo(nums) {
  const nota = indexar({ id: novoId(), tipo: "versiculo", texto: "", referencias: rangesDe(nums), versao, data: new Date().toISOString().slice(0, 10) });
  abrirEditorDialogo(nota, `Anotação · ${refSelecionada().texto}`);
}
function abrirNotasDoVersiculo(v) {
  const k = chaveVers(livro, cap, v);
  const l = notasCap.filter((n) => (n.versiculos || []).includes(k));
  if (l.length === 1) return abrirEditorDialogo({ ...l[0], _baseMs: l[0].atualizadoEm }, `Anotação · ${l[0].refsTexto || ""}`);
  const d = abrirDialogo({ titulo: `Anotações em ${livroPorId(livro).abrev} ${cap}:${v}`, corpo: l.map((n, i) => `<button class="resultado-busca" data-i="${i}"><b>${esc(n.refsTexto || "")}</b><br><span class="muted">${esc((n.texto || "").slice(0, 120))}</span></button>`).join("") });
  d.querySelectorAll("[data-i]").forEach((b) => b.onclick = () => { d.close(); const n = l[+b.dataset.i]; abrirEditorDialogo({ ...n, _baseMs: n.atualizadoEm }, `Anotação · ${n.refsTexto}`); });
}

// ---------- Navegação: livro > capítulo ----------
async function escolherLivro() {
  const p = await progresso(db, versao);
  const grupo = (t) => LIVROS.filter((l) => l.t === t).map((l) => {
    const ok = !!p.livros?.[l.id];
    return `<button data-l="${l.id}" ${ok ? "" : "disabled"} aria-current="${l.id === livro}">${esc(l.nome)}${ok ? "" : "<small>Em breve</small>"}</button>`;
  }).join("");
  const d = abrirDialogo({ titulo: `Livros (${versao})`, corpo: `<h3>Antigo Testamento</h3><div class="grade-livros">${grupo("AT")}</div><h3 style="margin-top:18px">Novo Testamento</h3><div class="grade-livros">${grupo("NT")}</div>` });
  d.querySelectorAll("[data-l]").forEach((b) => b.onclick = () => { d.close(); escolherCapitulo(b.dataset.l); });
}
function escolherCapitulo(l) {
  const L = livroPorId(l);
  const d = abrirDialogo({ titulo: L.nome, corpo: `<div class="grade-livros grade-caps">${L.versiculos.map((_, i) => `<button data-c="${i + 1}" aria-current="${l === livro && i + 1 === cap}">${i + 1}</button>`).join("")}</div>` });
  d.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => { d.close(); livro = l; cap = +b.dataset.c; render(); });
}
$("#btn-ref").onclick = escolherLivro;
$("#ant").onclick = () => { const i = LIVROS.findIndex((l) => l.id === livro); if (cap > 1) cap--; else if (i > 0) { livro = LIVROS[i - 1].id; cap = LIVROS[i - 1].versiculos.length; } render(); };
$("#prox").onclick = () => { const i = LIVROS.findIndex((l) => l.id === livro); if (cap < LIVROS[i].versiculos.length) cap++; else if (i < 65) { livro = LIVROS[i + 1].id; cap = 1; } render(); };
$("#sel-versao").onchange = (e) => { versao = e.target.value; prefs.versao = versao; salvarPrefs(); render(); };
$("#sel-versao2").onchange = (e) => { versao2 = e.target.value; prefs.versao2 = versao2; salvarPrefs(); render(); };
$("#btn-comp").onclick = (e) => { comparar = !comparar; prefs.comparar = comparar; salvarPrefs(); e.currentTarget.setAttribute("aria-pressed", comparar); $("#sel2-wrap").classList.toggle("oculto", !comparar); render(); };
const mudarFonte = (d) => { fonte = Math.min(2, Math.max(0.9, +(fonte + d).toFixed(2))); prefs.fonte = fonte; salvarPrefs(); texto.style.setProperty("--leitor-fonte", fonte + "rem"); };
$("#btn-mais").onclick = () => mudarFonte(0.1);
$("#btn-menos").onclick = () => mudarFonte(-0.1);

// ---------- Busca: referência ou palavra ----------
$("#btn-busca").onclick = () => {
  const d = abrirDialogo({
    titulo: "Buscar na Bíblia",
    corpo: `<form id="fb" class="form"><div class="campo"><label for="q">Referência (ex.: Jo 3:16) ou palavra</label><input id="q" type="search" autocomplete="off" enterkeyhint="search"></div>
      <div class="opcoes-chip"><label class="chip"><input type="radio" name="esc" value="livro" checked>Neste livro (${esc(livroPorId(livro).nome)})</label><label class="chip"><input type="radio" name="esc" value="tudo">Toda a Bíblia (${esc(versao)})</label></div>
      <button class="btn bloco">${icon("busca")}Buscar</button></form><div id="res" style="margin-top:12px"></div>`
  });
  const q = d.querySelector("#q"); setTimeout(() => q.focus(), 50);
  d.querySelector("#fb").onsubmit = async (e) => {
    e.preventDefault();
    const termo = q.value.trim(); if (!termo) return;
    const r = interpretar(termo);
    if (r) { d.close(); livro = r.livro; cap = r.cap; alvoVers = r.v1 || 0; render(); return; }
    const res = d.querySelector("#res");
    const t = normalizar(termo);
    if (t.length < 3) { res.innerHTML = `<p class="muted">Digite pelo menos 3 letras.</p>`; return; }
    const escopo = d.querySelector("input[name=esc]:checked").value;
    const p = await progresso(db, versao);
    const livros = escopo === "livro" ? [livro] : LIVROS.map((l) => l.id).filter((id) => p.livros?.[id]);
    const achados = [];
    for (let i = 0; i < livros.length && achados.length < 300; i++) {
      res.innerHTML = `<p class="muted"><span class="carregando"></span> Procurando… ${i + 1}/${livros.length}</p>`;
      let b = null; try { b = await livroInteiro(db, versao, livros[i]); } catch {}
      if (!b) continue;
      for (const [c, vs] of Object.entries(b.capitulos || {}).sort((a, b) => a[0] - b[0])) vs.forEach((txt, j) => { if (achados.length < 300 && normalizar(txt).includes(t)) achados.push({ l: livros[i], c: +c, v: j + 1, txt }); });
    }
    const marcar = (s) => { const n = normalizar(s), k = n.indexOf(t); return k < 0 ? esc(s) : esc(s.slice(0, k)) + "<mark>" + esc(s.slice(k, k + termo.length)) + "</mark>" + esc(s.slice(k + termo.length)); };
    res.innerHTML = achados.length ? `<p class="pequeno muted">${achados.length}${achados.length >= 300 ? "+" : ""} resultado(s)</p>` + achados.map((a, i) => `<button class="resultado-busca" data-i="${i}"><b>${esc(livroPorId(a.l).abrev)} ${a.c}:${a.v}</b> ${marcar(a.txt)}</button>`).join("")
      : `<p class="muted">Nada encontrado${escopo === "livro" ? " neste livro" : ""}.</p>`;
    res.querySelectorAll("[data-i]").forEach((b) => b.onclick = () => { const a = achados[+b.dataset.i]; d.close(); livro = a.l; cap = a.c; alvoVers = a.v; render(); });
  };
};

// Primeiro livro disponível, se o último ponto não estiver importado.
const pr = await progresso(db, versao);
if (!url.get("l") && !ponto && Object.keys(pr.livros || {}).length && !pr.livros[livro]) livro = LIVROS.find((l) => pr.livros[l.id])?.id || "gn";
render();
hidratarIcones();
