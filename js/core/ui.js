// Utilitários de interface compartilhados.
import { icon } from "./icons.js";
import "../site-config.js";

/** Raiz do site, calculada a partir deste arquivo (funciona em qualquer domínio/pasta). */
export const ROOT = new URL("../../", import.meta.url).href;
export const rota = (p) => new URL(p, ROOT).href;

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Escapa texto para HTML (sempre use ao inserir dados do usuário). */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

export function toast(msg, tipo = "ok", ms = 3200) {
  let area = $(".toast-area");
  if (!area) { area = document.createElement("div"); area.className = "toast-area"; area.setAttribute("role", "status"); area.setAttribute("aria-live", "polite"); document.body.append(area); }
  const t = document.createElement("div");
  t.className = "toast" + (tipo === "erro" ? " erro" : "");
  t.innerHTML = icon(tipo === "erro" ? "alerta" : "check") + `<span>${esc(msg)}</span>`;
  area.append(t);
  setTimeout(() => t.remove(), ms);
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export { MESES, MESES_LONGOS };

/** Converte Timestamp do Firestore, número, Date ou "AAAA-MM-DD" em Date. */
export function paraData(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    const d = new Date(v); return isNaN(d) ? null : d;
  }
  if (v.seconds) return new Date(v.seconds * 1000);
  return null;
}
export function fmtData(v, opts = { day: "2-digit", month: "2-digit", year: "numeric" }) {
  const d = paraData(v); return d ? d.toLocaleDateString("pt-BR", opts) : "";
}
export const fmtDataLonga = (v) => fmtData(v, { weekday: "long", day: "numeric", month: "long" });
export const fmtHora = (v) => { const d = paraData(v); return d ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""; };
export const fmtMoeda = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function iniciais(nome = "") {
  const p = String(nome).replace(/\(.*?\)/g, " ").trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
export function avatar(nome, foto, classe = "") {
  return foto
    ? `<img class="avatar ${classe}" src="${esc(foto)}" alt="Foto de ${esc(nome)}">`
    : `<span class="avatar ${classe}" aria-hidden="true">${esc(iniciais(nome))}</span>`;
}

export async function copiar(texto, msg = "Copiado!") {
  try { await navigator.clipboard.writeText(texto); }
  catch {
    const ta = document.createElement("textarea"); ta.value = texto; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
  }
  toast(msg);
}

export function linkWhatsApp(texto, numero = "") {
  const n = String(numero || "").replace(/\D/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

/** Abre um diálogo simples. `corpo` é HTML. Retorna o elemento <dialog>. */
export function abrirDialogo({ titulo, corpo, rodape = "", classe = "folha", aoFechar } = {}) {
  const d = document.createElement("dialog");
  d.className = classe;
  d.setAttribute("aria-labelledby", "dlg-t-" + Date.now());
  d.innerHTML = `<div class="dialog-cabeca"><h2 id="${d.getAttribute("aria-labelledby")}">${esc(titulo)}</h2>
    <button class="btn-icone" data-fechar aria-label="Fechar">${icon("fechar")}</button></div>
    <div class="dialog-corpo">${corpo}</div>${rodape ? `<div class="dialog-rodape">${rodape}</div>` : ""}`;
  document.body.append(d);
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-fechar]")) d.close(); });
  d.addEventListener("close", () => { aoFechar?.(); d.remove(); });
  d.showModal();
  return d;
}

export function confirmar(msg, { ok = "Confirmar", perigo = false, titulo = "Confirmar" } = {}) {
  return new Promise((res) => {
    let r = false;
    const d = abrirDialogo({
      titulo, classe: "", corpo: `<p>${esc(msg)}</p>`,
      rodape: `<button class="btn fantasma" data-fechar>Cancelar</button><button class="btn ${perigo ? "perigo" : ""}" data-ok>${esc(ok)}</button>`,
      aoFechar: () => res(r)
    });
    d.querySelector("[data-ok]").onclick = () => { r = true; d.close(); };
  });
}

/** Debounce simples. Retorna função com .flush() e .cancel(). */
export function debounce(fn, ms) {
  let t = null, args = null;
  const d = (...a) => { args = a; clearTimeout(t); t = setTimeout(() => { t = null; fn(...args); }, ms); };
  d.flush = () => { if (t) { clearTimeout(t); t = null; return fn(...args); } };
  d.cancel = () => { clearTimeout(t); t = null; };
  return d;
}

export function normalizar(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function idAleatorio(n = 20) {
  const a = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(n));
  return [...b].map((x) => a[x % a.length]).join("");
}

export function baixarArquivo(nome, conteudo, tipo = "text/plain;charset=utf-8") {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = nome; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Carrega um script clássico (bibliotecas UMD via CDN) uma única vez. */
const _scripts = {};
export function carregarScript(src) {
  if (!_scripts[src]) _scripts[src] = new Promise((ok, erro) => {
    const s = document.createElement("script"); s.src = src; s.async = true; s.crossOrigin = "anonymous";
    s.onload = ok; s.onerror = () => erro(new Error("Falha ao carregar " + src)); document.head.append(s);
  });
  return _scripts[src];
}
// Bibliotecas hospedadas no próprio site (assets/vendor/), copiadas do npm oficial.
// Ficar no mesmo domínio dispensa SRI e permite uma CSP sem CDNs de terceiros.
export const CDN = {
  d3: rota("assets/vendor/d3-7.9.0.min.js"),
  qrcode: rota("assets/vendor/qrcode-generator-1.4.4.js"),
  jspdf: rota("assets/vendor/jspdf-4.2.1.umd.min.js"),
  html2canvas: rota("assets/vendor/html2canvas-1.4.1.min.js")
};

/** Gera SVG de QR code (biblioteca qrcode-generator). */
export async function qrSvg(texto, celula = 4) {
  await carregarScript(CDN.qrcode);
  const q = self.qrcode(0, "M"); q.addData(texto, "Byte"); q.make();
  return q.createSvgTag({ cellSize: celula, margin: 2, scalable: true });
}

export function mensagemErro(e) {
  const c = e?.code || "";
  const m = {
    "permission-denied": "Você não tem permissão para isso.",
    "unavailable": "Sem conexão com o servidor. Tente de novo em instantes.",
    "auth/network-request-failed": "Sem internet. Verifique sua conexão.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "Não encontramos conta com esse e-mail.",
    "auth/email-already-in-use": "Esse e-mail já tem cadastro. Use \"Entrar\" ou \"Esqueci minha senha\".",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada antes de concluir.",
    "auth/invalid-action-code": "Este link já foi usado ou expirou. Peça um novo.",
    "auth/expired-action-code": "Este link expirou. Peça um novo.",
    "auth/missing-password": "Digite a senha."
  };
  return m[c] || m[c.replace(/^firestore\//, "")] || e?.message || "Algo deu errado. Tente novamente.";
}

/** Estado vazio padrão: ícone, título, explicação e (opcional) o próximo passo. */
export function estadoVazio({ ic = "info", titulo, texto = "", acao = "" }) {
  return `<div class="vazio">${icon(ic)}<p class="vazio-titulo">${esc(titulo)}</p>${texto ? `<p>${esc(texto)}</p>` : ""}${acao}</div>`;
}

/**
 * Ação com "Desfazer": mostra um aviso com botão e só executa depois de `ms`.
 * Se a pessoa sair da página antes, executa na hora (as gravações do Firestore ficam na fila).
 * @returns {Promise<boolean>} true = executou; false = desfeito.
 */
export function comDesfazer(msg, executar, ms = 6000) {
  return new Promise((resolve) => {
    let area = $(".toast-area");
    if (!area) { area = document.createElement("div"); area.className = "toast-area"; area.setAttribute("role", "status"); area.setAttribute("aria-live", "polite"); document.body.append(area); }
    const t = document.createElement("div");
    t.className = "toast toast-desfazer";
    t.innerHTML = `${icon("lixeira")}<span>${esc(msg)}</span><button type="button" class="btn-desfazer">Desfazer</button><i class="toast-tempo" style="animation-duration:${ms}ms"></i>`;
    area.append(t);
    let feito = false;
    const fim = async (desfeito) => {
      if (feito) return; feito = true;
      clearTimeout(timer); removeEventListener("pagehide", sair); t.remove();
      if (desfeito) { toast("Ação desfeita."); resolve(false); return; }
      try { await executar(); resolve(true); } catch (e) { toast(mensagemErro(e), "erro"); resolve(false); }
    };
    const sair = () => fim(false);
    const timer = setTimeout(() => fim(false), ms);
    addEventListener("pagehide", sair);
    t.querySelector(".btn-desfazer").onclick = () => fim(true);
    t.querySelector(".btn-desfazer").focus({ preventScroll: true });
  });
}

/** Esqueleto de carregamento: tipo "cards" (padrão), "linhas", "tabela" ou "texto". */
export function esqueleto(tipo = "cards", n = 3) {
  const linhas = (k) => `<span class="esq-linha t"></span>${Array.from({ length: k }, (_, i) => `<span class="esq-linha ${["c", "m", "p"][i % 3]}"></span>`).join("")}`;
  const corpo = {
    cards: `<div class="esq-grid">${Array.from({ length: n }, () => `<div class="esq-bloco esq-card">${linhas(2)}</div>`).join("")}</div>`,
    linhas: `<div class="esq">${linhas(n)}</div>`,
    tabela: `<div class="esq"><span class="esq-linha" style="height:40px;width:min(360px,100%)"></span>${Array.from({ length: n }, () => `<span class="esq-linha" style="height:44px;width:100%"></span>`).join("")}</div>`,
    texto: `<div class="esq">${Array.from({ length: n }, (_, i) => `<span class="esq-linha ${i % 4 === 3 ? "m" : ""}" style="height:1.1em${i % 4 === 3 ? "" : ";width:100%"}"></span>`).join("")}</div>`
  }[tipo];
  return `<div role="status" aria-busy="true"><span class="sr-only">Carregando…</span>${corpo}</div>`;
}
