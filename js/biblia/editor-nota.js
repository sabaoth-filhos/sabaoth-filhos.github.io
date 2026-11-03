// Editor de anotação com salvamento automático (sem botão "Salvar").
import { esc, hojeISO, abrirDialogo, fmtData, toast } from "../core/ui.js";
import { icon } from "../core/icons.js";
import { interpretar, formatar, chaveCap, chaveVers } from "./referencias.js";
import { TEXTO_ESTADO } from "./notas-store.js";
import { capitulo, VERSOES } from "./dados.js";
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/** Recalcula os campos de índice (para filtros e ícones no leitor). */
export function indexar(n) {
  const refs = n.referencias || [];
  n.refsTexto = refs.map((r) => formatar(r)).join("; ");
  n.capitulos = [...new Set(refs.map((r) => chaveCap(r.livro, r.cap)))];
  n.versiculos = [...new Set(refs.flatMap((r) => r.v1 ? Array.from({ length: (r.v2 || r.v1) - r.v1 + 1 }, (_, i) => chaveVers(r.livro, r.cap, r.v1 + i)) : []))].slice(0, 200);
  n.livros = [...new Set(refs.map((r) => r.livro))];
  return n;
}

export const TIPOS = {
  versiculo: { nome: "Anotação em versículo", ic: "marcador" },
  diaria: { nome: "Leitura diária", ic: "livro" },
  culto: { nome: "Anotação do culto", ic: "microfone" }
};

/** Indicador "Salvando… / Salvo / Salvo no aparelho…" ligado ao store. */
export function indicador(el) {
  return (estado) => { el.dataset.estado = estado; el.textContent = TEXTO_ESTADO[estado] || ""; };
}

/**
 * Monta o editor dentro de `alvo`.
 * @param {{store, nota, db, versao?, aoMudar?:Function, grande?:boolean}} o
 */
export function montarEditor(alvo, { store, nota, db, versao = VERSOES[0].id, aoMudar, grande = false }) {
  nota.referencias ||= [];
  nota.data ||= hojeISO();
  if (nota.tipo === "culto") nota.culto ||= {};
  const n = nota;

  alvo.innerHTML = `
  <div class="form editor-nota">
    ${n.tipo !== "versiculo" ? `<div class="campo"><label for="en-data">Data</label><input id="en-data" type="date" value="${esc(n.data)}"></div>` : ""}
    ${n.tipo === "culto" ? `
      <div class="campo"><label for="en-evento">Culto / evento</label><input id="en-evento" maxlength="120" value="${esc(n.culto.evento || "")}" placeholder="Ex.: Culto de domingo"></div>
      <div class="grid grid-2" style="gap:12px">
        <div class="campo"><label for="en-pregador">Pregador</label><input id="en-pregador" maxlength="100" value="${esc(n.culto.pregador || "")}"></div>
        <div class="campo"><label for="en-tema">Tema</label><input id="en-tema" maxlength="150" value="${esc(n.culto.tema || "")}"></div>
      </div>` : ""}
    ${n.tipo === "diaria" ? `<div class="campo"><label for="en-titulo">Título <span class="muted">(opcional)</span></label><input id="en-titulo" maxlength="120" value="${esc(n.titulo || "")}"></div>` : ""}
    <div class="campo">
      <span class="rotulo">${n.tipo === "diaria" ? "Referência lida" : n.tipo === "culto" ? "Referências citadas" : "Versículos"}</span>
      <div class="opcoes-chip" id="en-refs"></div>
      ${n.tipo !== "versiculo" ? `<div class="linha" style="gap:8px;flex-wrap:nowrap">
        <input id="en-ref" placeholder="Ex.: Jo 3:16" aria-label="Adicionar referência" style="flex:1;min-width:0" autocomplete="off" enterkeyhint="done">
        <button type="button" class="btn pequeno" id="en-add" aria-label="Adicionar referência">${icon("mais")}</button>
        ${n.tipo === "culto" ? `<button type="button" class="btn secundario pequeno" id="en-ins" title="Inserir o texto do versículo na nota">${icon("biblia")}Inserir</button>` : ""}
      </div>` : ""}
    </div>
    <div class="campo"><label for="en-texto">${n.tipo === "culto" ? "Anotações" : "Sua anotação"}</label>
      <textarea id="en-texto" style="min-height:${grande ? "45vh" : "160px"};font-size:${grande ? "1.1rem" : "inherit"}" placeholder="Escreva aqui… (salva sozinho)">${esc(n.texto || "")}</textarea></div>
    <div class="linha entre"><span class="status-salvar" id="en-status" data-estado="salvo" aria-live="polite">Salvo</span>
      <button type="button" class="btn fantasma pequeno" id="en-versoes">${icon("historico")}Versões anteriores</button></div>
  </div>`;

  const $ = (s) => alvo.querySelector(s);
  const texto = $("#en-texto");
  const ind = indicador($("#en-status"));
  let off = null;
  off = store.aoEstado((e) => { if (!alvo.isConnected) { off?.(); return; } ind(e); });

  const alterar = () => { indexar(n); store.alterar(n); aoMudar?.(n); };

  function chips() {
    $("#en-refs").innerHTML = n.referencias.map((r, i) =>
      `<span class="chip" style="cursor:default">${esc(formatar(r))}${n.tipo !== "versiculo" ? `<button type="button" data-rm="${i}" aria-label="Remover ${esc(formatar(r))}" style="background:none;border:0;padding:0;margin-left:2px;cursor:pointer;color:inherit;display:inline-grid">${icon("fechar")}</button>` : ""}</span>`).join("")
      || `<span class="muted pequeno">Nenhuma</span>`;
  }
  chips();
  $("#en-refs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    n.referencias.splice(+b.dataset.rm, 1); chips(); alterar();
  });

  function lerRef() {
    const campo = $("#en-ref"); const r = interpretar(campo.value);
    if (!r) { toast("Referência não reconhecida. Ex.: Jo 3:16", "erro"); campo.focus(); return null; }
    return r;
  }
  $("#en-add")?.addEventListener("click", () => {
    const r = lerRef(); if (!r) return;
    n.referencias.push({ ...r, versao }); $("#en-ref").value = ""; chips(); alterar();
  });
  $("#en-ref")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#en-add").click(); } });

  // Atalho do culto: insere a referência + texto do versículo no ponto do cursor.
  $("#en-ins")?.addEventListener("click", async () => {
    const r = lerRef(); if (!r) return;
    let trecho = formatar(r);
    try {
      const vs = await capitulo(db, versao, r.livro, r.cap);
      if (vs && r.v1) trecho = `"${vs.slice(r.v1 - 1, (r.v2 || r.v1)).join(" ")}" (${formatar(r)}, ${versao})`;
    } catch {}
    const ini = texto.selectionStart ?? texto.value.length;
    texto.value = texto.value.slice(0, ini) + (ini && !/\s$/.test(texto.value.slice(0, ini)) ? "\n" : "") + trecho + "\n" + texto.value.slice(texto.selectionEnd ?? ini);
    n.texto = texto.value;
    if (!n.referencias.some((x) => formatar(x) === formatar(r))) n.referencias.push({ ...r, versao });
    $("#en-ref").value = ""; chips(); alterar(); texto.focus();
  });

  // Cada tecla: cópia local imediata + envio com debounce (dentro do store).
  texto.addEventListener("input", () => { n.texto = texto.value; alterar(); });
  $("#en-data")?.addEventListener("input", (e) => { n.data = e.target.value; alterar(); });
  $("#en-titulo")?.addEventListener("input", (e) => { n.titulo = e.target.value; alterar(); });
  $("#en-evento")?.addEventListener("input", (e) => { n.culto.evento = e.target.value; alterar(); });
  $("#en-pregador")?.addEventListener("input", (e) => { n.culto.pregador = e.target.value; alterar(); });
  $("#en-tema")?.addEventListener("input", (e) => { n.culto.tema = e.target.value; n.titulo = e.target.value; alterar(); });

  $("#en-versoes").addEventListener("click", () => versoesAnteriores(db, store, n, () => { texto.value = n.texto; alterar(); }));

  // Se outro aparelho tinha uma versão mais nova, ela vira a principal e a nossa fica guardada.
  store.aoConflito(({ id, venceu, servidor }) => {
    if (id !== n.id || venceu !== "servidor" || !alvo.isConnected) return;
    Object.assign(n, servidor);
    texto.value = n.texto || "";
    toast("Esta anotação foi alterada em outro aparelho. Sua versão foi guardada em \"Versões anteriores\".");
  });
  return { foco: () => texto.focus(), nota: n };
}

async function versoesAnteriores(db, store, n, aoRestaurar) {
  const d = abrirDialogo({ titulo: "Versões anteriores", corpo: `<span class="carregando"></span>` });
  const corpo = d.querySelector(".dialog-corpo");
  try {
    const uid = store.uid || (await import("../core/firebase.js")).auth.currentUser.uid;
    const s = await getDocs(query(collection(db, "users", uid, "notes", n.id, "versoes"), orderBy("guardadaEm", "desc")));
    if (s.empty) { corpo.innerHTML = `<p class="muted">Não há versões anteriores. Elas aparecem quando a mesma anotação é editada em dois aparelhos ao mesmo tempo.</p>`; return; }
    corpo.innerHTML = s.docs.map((v, i) => `<article class="card" style="margin-bottom:10px"><small class="muted">Guardada em ${esc(new Date(v.data().guardadaEm).toLocaleString("pt-BR"))}</small>
      <p style="white-space:pre-wrap;margin:8px 0">${esc(v.data().texto || "")}</p><button class="btn secundario pequeno" data-i="${i}">Usar esta versão</button></article>`).join("");
    corpo.querySelectorAll("[data-i]").forEach((b) => b.onclick = () => {
      const atual = n.texto;
      n.texto = s.docs[+b.dataset.i].data().texto || "";
      if (atual && atual !== n.texto) n.texto += "\n\n— texto que estava antes —\n" + atual; // nunca descarta
      aoRestaurar(); d.close(); toast("Versão restaurada.");
    });
  } catch (e) { corpo.innerHTML = `<p class="muted">Não foi possível carregar (sem internet?).</p>`; }
}
