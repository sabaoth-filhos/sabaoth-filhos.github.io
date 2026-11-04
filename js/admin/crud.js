// Motor de CRUD genérico do painel: lista em tabela + formulário a partir de um esquema de campos.
import {
  collection, getDocs, query, doc, setDoc, addDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, abrirDialogo, confirmar, toast, mensagemErro, normalizar, fmtData, comDesfazer } from "../core/ui.js";
import { icon } from "../core/icons.js";

/** Formata valor para a tabela. */
export function celula(c, v, ctx) {
  if (c.formatar) return c.formatar(v, ctx);
  if (v == null || v === "") return '<span class="muted">—</span>';
  if (c.tipo === "checkbox") return v ? "Sim" : "Não";
  if (c.tipo === "date") return esc(fmtData(v));
  if (c.tipo === "select") return esc(c.opcoes?.find((o) => o[0] === v)?.[1] ?? v);
  if (c.tipo === "membro") return esc(ctx.pessoas?.get(v)?.nome || v);
  if (c.tipo === "membros") return esc((v || []).map((id) => ctx.pessoas?.get(id)?.nome || id).join(", "));
  if (c.tipo === "cor") return `<span style="display:inline-block;width:18px;height:18px;border-radius:5px;background:${esc(v)};vertical-align:-4px"></span> ${esc(v)}`;
  if (Array.isArray(v)) return esc(v.join(", "));
  if (typeof v === "object" && v.toDate) return esc(fmtData(v));
  return esc(String(v).slice(0, 120));
}

function campoForm(c, v, ctx) {
  const id = "cf-" + c.id;
  const req = c.obrigatorio ? "required" : "";
  const ajuda = c.ajuda ? `<small class="ajuda">${esc(c.ajuda)}</small>` : "";
  const rot = `<label for="${id}">${esc(c.rotulo)}${c.obrigatorio ? " *" : ""}</label>`;
  switch (c.tipo) {
    case "textarea": return `<div class="campo">${rot}<textarea id="${id}" ${req} maxlength="${c.max || 3000}">${esc(v ?? "")}</textarea>${ajuda}</div>`;
    case "checkbox": return `<label class="check"><input type="checkbox" id="${id}" ${v ? "checked" : ""}><span>${esc(c.rotulo)}</span></label>`;
    case "select": {
      const ops = typeof c.opcoes === "function" ? c.opcoes(ctx) : c.opcoes;
      return `<div class="campo">${rot}<select id="${id}" ${req}><option value="">—</option>${ops.map(([k, t]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>${ajuda}</div>`;
    }
    case "membro": return `<div class="campo">${rot}<select id="${id}" ${req}><option value="">—</option>${[...ctx.pessoas.values()].sort((a, b) => a.nome.localeCompare(b.nome)).map((p) => `<option value="${esc(p.id)}" ${p.id === v ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select>${ajuda}</div>`;
    case "membros": case "multi": {
      const ops = c.tipo === "membros" ? [...ctx.pessoas.values()].sort((a, b) => a.nome.localeCompare(b.nome)).map((p) => [p.id, p.nome]) : (typeof c.opcoes === "function" ? c.opcoes(ctx) : c.opcoes);
      const sel = new Set(v || []);
      return `<fieldset class="campo"><legend class="rotulo">${esc(c.rotulo)}</legend>
        ${ops.length > 8 ? `<input type="search" placeholder="Filtrar…" data-filtro="${id}" style="min-height:40px">` : ""}
        <div id="${id}" class="pilha" style="max-height:240px;overflow:auto;gap:4px;border:1px solid var(--borda);border-radius:10px;padding:8px">
        ${ops.map(([k, t]) => `<label class="linha" style="gap:8px;min-height:36px" data-txt="${esc(normalizar(t))}"><input type="checkbox" value="${esc(k)}" ${sel.has(k) ? "checked" : ""} style="width:20px;height:20px">${esc(t)}</label>`).join("")}</div>${ajuda}</fieldset>`;
    }
    case "lista": return `<div class="campo">${rot}<textarea id="${id}" placeholder="Um item por linha">${esc((v || []).map((x) => (typeof x === "object" ? Object.values(x).join(" | ") : x)).join("\n"))}</textarea>${ajuda}</div>`;
    default: return `<div class="campo">${rot}<input id="${id}" type="${c.tipo || "text"}" ${req} value="${esc(v ?? "")}" ${c.max ? `maxlength="${c.max}"` : ""} ${c.passo ? `step="${c.passo}"` : ""}>${ajuda}</div>`;
  }
}

function lerCampo(c, raiz) {
  const el = raiz.querySelector("#cf-" + c.id);
  if (!el) return undefined;
  switch (c.tipo) {
    case "checkbox": return el.checked;
    case "number": return el.value === "" ? null : Number(el.value);
    case "membros": case "multi": return [...el.querySelectorAll("input:checked")].map((i) => i.value);
    case "lista": return c.lerLista ? c.lerLista(el.value) : el.value.split("\n").map((s) => s.trim()).filter(Boolean);
    default: return el.value.trim();
  }
}

/**
 * Monta uma seção CRUD.
 * cfg: { colecao, titulo, campos[], colunas[] (ids), consulta(db)->Query, ordenar(a,b), novoId?(dados),
 *        antesDeSalvar?(dados, original, ctx), depoisDeSalvar?, acoesLinha?(item)->html, aoAcao?(acao,item), podeCriar=true, busca=true }
 */
export function montarCrud(alvo, cfg, ctx) {
  const { db } = ctx;
  let itens = [], termo = cfg.busca !== false ? (ctx.buscaInicial || "") : "";
  async function carregar() {
    alvo.innerHTML = `<p class="muted"><span class="carregando"></span> Carregando…</p>`;
    try {
      const s = await getDocs(cfg.consulta ? cfg.consulta(db, ctx) : query(collection(db, cfg.colecao)));
      itens = s.docs.map((d) => ({ id: d.id, ...d.data() })).map((i) => (cfg.preparar ? cfg.preparar(i) : i));
      if (cfg.ordenar) itens.sort(cfg.ordenar);
      render();
    } catch (e) { alvo.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(mensagemErro(e))}</p></div>`; }
  }
  function render() {
    const t = normalizar(termo);
    // Busca também pelos nomes das pessoas referenciadas (memberId, membros[], liderIds…).
    const textoBusca = (i) => {
      const nomes = [];
      const ver = (v) => { if (typeof v === "string" && ctx.pessoas?.has(v)) nomes.push(ctx.pessoas.get(v).nome); else if (Array.isArray(v)) v.forEach(ver); };
      Object.values(i).forEach(ver);
      return normalizar(JSON.stringify(i) + " " + nomes.join(" "));
    };
    const vis = t ? itens.filter((i) => textoBusca(i).includes(t)) : itens;
    const cols = cfg.colunas.map((id) => cfg.campos.find((c) => c.id === id) || { id, rotulo: id });
    alvo.innerHTML = `
      ${cfg.descricao ? `<p class="muted">${cfg.descricao}</p>` : ""}
      <div class="linha entre" style="margin-bottom:10px">
        ${cfg.busca !== false ? `<input type="search" placeholder="Buscar…" value="${esc(termo)}" class="crud-busca" style="flex:1;min-width:160px;max-width:360px">` : "<span></span>"}
        <span class="linha">${cfg.extrasTopo || ""}${cfg.podeCriar !== false ? `<button class="btn pequeno crud-novo">${icon("mais")}Novo</button>` : ""}</span>
      </div>
      <div class="tabela-wrap" tabindex="0" role="region" aria-label="Tabela (role para o lado para ver mais)"><table><thead><tr>${cols.map((c) => `<th>${esc(c.rotulo)}</th>`).join("")}<th style="width:1%">Ações</th></tr></thead>
      <tbody>${vis.map((i) => `<tr data-id="${esc(i.id)}" ${i.ficticio ? 'title="Dado fictício de exemplo"' : ""}>${cols.map((c) => `<td>${celula(c, i[c.id], { ...ctx, item: i })}</td>`).join("")}
        <td style="white-space:nowrap">${cfg.acoesLinha ? cfg.acoesLinha(i, ctx) : ""}${cfg.podeEditar !== false ? `<button class="btn-icone" data-editar="${esc(i.id)}" aria-label="Editar">${icon("lapis")}</button>` : ""}${cfg.podeExcluir !== false ? `<button class="btn-icone" data-excluir="${esc(i.id)}" aria-label="Excluir">${icon("lixeira")}</button>` : ""}</td></tr>`).join("")
        || `<tr><td colspan="${cols.length + 1}" class="muted" style="text-align:center;padding:24px">Nada por aqui ainda.</td></tr>`}</tbody></table></div>
      <p class="pequeno muted" style="margin-top:6px">${vis.length} registro(s)</p>`;
    alvo.querySelector(".crud-busca")?.addEventListener("input", (e) => { termo = e.target.value; const pos = e.target.selectionStart; render(); const b = alvo.querySelector(".crud-busca"); b.focus(); b.setSelectionRange(pos, pos); });
    alvo.querySelector(".crud-novo")?.addEventListener("click", () => editar(null));
    alvo.querySelectorAll("[data-editar]").forEach((b) => b.onclick = () => editar(itens.find((i) => i.id === b.dataset.editar)));
    alvo.querySelectorAll("[data-excluir]").forEach((b) => b.onclick = () => excluir(itens.find((i) => i.id === b.dataset.excluir)));
    alvo.querySelectorAll("[data-acao]").forEach((b) => b.onclick = async () => { await cfg.aoAcao?.(b.dataset.acao, itens.find((i) => i.id === b.dataset.item), ctx); carregar(); });
    cfg.aoRender?.(alvo, itens, ctx);
  }
  function editar(item) {
    const campos = cfg.campos.filter((c) => !c.somenteTabela);
    const d = abrirDialogo({
      titulo: (item ? "Editar · " : "Novo · ") + cfg.titulo,
      corpo: `<form class="form" id="crud-f" novalidate>${campos.map((c) => campoForm(c, item ? item[c.id] : c.padrao, ctx)).join("")}<div class="msg" role="alert"></div></form>`,
      rodape: `<button class="btn fantasma" data-fechar>Cancelar</button><button class="btn" id="crud-salvar">${icon("check")}Salvar</button>`
    });
    d.querySelectorAll("[data-filtro]").forEach((inp) => inp.addEventListener("input", () => {
      const q = normalizar(inp.value);
      d.querySelectorAll(`#${inp.dataset.filtro} label`).forEach((l) => (l.style.display = l.dataset.txt.includes(q) ? "" : "none"));
    }));
    d.querySelector("#crud-salvar").onclick = async () => {
      const f = d.querySelector("#crud-f"), msg = f.querySelector(".msg");
      const dados = {};
      for (const c of campos) { const v = lerCampo(c, f); if (v !== undefined) dados[c.id] = v; }
      const falta = campos.find((c) => c.obrigatorio && (dados[c.id] === "" || dados[c.id] == null || (Array.isArray(dados[c.id]) && !dados[c.id].length)));
      if (falta) { msg.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>Preencha: ${esc(falta.rotulo)}</p></div>`; return; }
      try {
        const final = cfg.antesDeSalvar ? await cfg.antesDeSalvar(dados, item, ctx) : dados;
        if (final === false) return;
        final.atualizadoEm = serverTimestamp();
        if (item) { const base = { ...item, id: undefined }; (cfg.camposVirtuais || []).forEach((k) => delete base[k]); await setDoc(doc(db, cfg.colecao, item.id), { ...base, ...final }, { merge: true }); }
        else if (cfg.novoId) await setDoc(doc(db, cfg.colecao, cfg.novoId(final, ctx)), { ...final, criadoEm: serverTimestamp() });
        else await addDoc(collection(db, cfg.colecao), { ...final, criadoEm: serverTimestamp() });
        await cfg.depoisDeSalvar?.(final, item, ctx);
        d.close(); toast("Salvo!"); carregar();
      } catch (e) { msg.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(e.message?.startsWith("!") ? e.message.slice(1) : mensagemErro(e))}</p></div>`; }
    };
  }
  async function excluir(item) {
    const nome = item.titulo || item.nome || item.pedido?.slice(0, 40) || item.id;
    if (!(await confirmar(`Excluir “${nome}” (${cfg.titulo.toLowerCase()})? Você terá alguns segundos para desfazer.`, { ok: "Excluir", perigo: true, titulo: "Excluir " + cfg.titulo.toLowerCase() }))) return;
    // Some da lista na hora; só apaga de verdade se ninguém tocar em "Desfazer".
    const antes = itens; itens = itens.filter((i) => i.id !== item.id); render();
    const ok = await comDesfazer(`“${nome}” excluído.`, async () => { await deleteDoc(doc(db, cfg.colecao, item.id)); await cfg.depoisDeExcluir?.(item, ctx); });
    if (!ok) { itens = antes; render(); }
  }
  carregar();
  return { recarregar: carregar };
}
