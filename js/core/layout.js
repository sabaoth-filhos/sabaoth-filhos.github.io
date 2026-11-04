// Cabeçalho, menu inferior (celular), rodapé, tema e service worker.
// Incluído em todas as páginas. Não carrega o Firebase (página pública rápida).
import "../site-config.js";
import { icon, hidratarIcones } from "./icons.js";
import { ROOT, rota, esc } from "./ui.js";
import { aoVivo } from "./agenda.js";
import { SECOES } from "../membro/secoes.js";

const SITE = self.SITE_CONFIG;
const I = SITE.IGREJA;
const pagina = document.body.dataset.pagina || "";
const logado = (() => { try { return localStorage.getItem("idpb_logado") === "1"; } catch { return false; } })();
const areaMembro = document.body.dataset.area === "membro" || document.body.dataset.area === "admin";

// Nome do membro guardado no aparelho (para as iniciais do avatar, sem carregar o Firebase).
const lerMembroLocal = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("idpb_membro_")) return JSON.parse(localStorage.getItem(k) || "null");
    }
  } catch {}
  return null;
};
let membroLocal = lerMembroLocal();
const iniciais = (n) => {
  const p = String(n || "").replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

function menuConta() {
  if ((!logado && !areaMembro) || pagina === "entrar") return "";
  const ini = iniciais(membroLocal?.nome);
  const primeiro = String(membroLocal?.nome || "").trim().split(/\s+/)[0] || "Minha conta";
  return `<div class="conta-menu">
    <button class="btn-icone avatar-btn" id="btn-conta" aria-haspopup="menu" aria-expanded="false" aria-controls="menu-conta" aria-label="Menu da conta" title="Minha conta">${ini ? `<span aria-hidden="true">${esc(ini)}</span>` : icon("pessoa")}</button>
    <div class="conta-pop" id="menu-conta" role="menu" hidden>
      <p class="conta-nome">${esc(primeiro)}</p>
      <a role="menuitem" href="${rota("membro/index.html")}">${icon("painel")}Minha área</a>
      <a role="menuitem" href="${rota("membro/perfil.html")}">${icon("pessoa")}Meu perfil</a>
      <a role="menuitem" href="${rota("membro/carteirinha.html")}">${icon("cartao")}Carteirinha</a>
      <hr>
      <button role="menuitem" type="button" id="btn-sair">${icon("sair")}Sair da conta</button>
    </div>
  </div>`;
}

const MENU = [
  { id: "inicio", nome: "Início", href: "index.html", ic: "casa" },
  { id: "assistir", nome: "Assistir", href: "assistir.html", ic: "assistir" },
  { id: "participar", nome: "Participar", href: "participar.html", ic: "grupo" },
  { id: "contribuir", nome: "Contribuir", href: "contribuir.html", ic: "presente" },
  logado
    ? { id: "membro", nome: "Minha área", href: "membro/index.html", ic: "pessoa", cta: true }
    : { id: "entrar", nome: "Entrar", href: "entrar.html", ic: "entrar", cta: true }
];

const linkMapsDe = (X) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(X.mapsQuery || X.endereco || "")}`;
const linkWaDe = (X) => /^\d{10,15}$/.test(String(X.whatsapp || "")) ? `https://wa.me/${X.whatsapp}?text=${encodeURIComponent("Olá! Vim pelo site da IDPB Jave Sabaoth.")}` : "";

function aplicarTema(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
const temaSalvo = (() => { try { return localStorage.getItem("idpb_tema"); } catch { return null; } })();
aplicarTema(temaSalvo);
const escuroAgora = () => (document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";

function header() {
  const h = document.createElement("header");
  h.className = "site-header";
  h.innerHTML = `
  <a class="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>
  <div class="container">
    <a class="marca" href="${rota("index.html")}" aria-label="${esc(I.nome)} — página inicial">
      <img src="${rota("assets/img/logo-idpb.jpg")}" alt="" width="44" height="44">
      <span>${esc(I.nomeCurto)}<small>IDPB · Manaus</small></span>
    </a>
    <nav class="nav-principal" aria-label="Menu principal"><ul>
      ${MENU.filter((m) => !m.cta).map((m) => `<li><a href="${rota(m.href)}" ${m.id === pagina ? 'aria-current="page"' : ""}>${icon(m.ic)}${m.nome}</a></li>`).join("")}
      ${areaMembro ? "" : `<li class="nav-visita"><a href="${rota("primeira-visita.html")}" ${pagina === "visita" ? 'aria-current="page"' : ""}>${icon("calendario")}Planejar minha visita</a></li>
      <li class="nav-visita"><a data-maps href="${esc(linkMapsDe(I))}" target="_blank" rel="noopener">${icon("mapa")}Como chegar</a></li>
      <li class="nav-visita" ${linkWaDe(I) ? "" : "hidden"}><a class="so-icone" data-wa href="${esc(linkWaDe(I) || "#")}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp" title="Falar no WhatsApp">${icon("whatsapp")}</a></li>`}
      ${MENU.filter((m) => m.cta).map((m) => `<li><a href="${rota(m.href)}" class="cta" ${m.id === pagina ? 'aria-current="page"' : ""}>${icon(m.ic)}${m.nome}</a></li>`).join("")}
    </ul></nav>
    <div class="header-acoes">
      <button class="btn-icone" id="btn-tema" aria-label="Alternar modo claro/escuro">${icon(escuroAgora() ? "sol" : "lua")}</button>
      ${menuConta()}
    </div>
  </div>`;
  return h;
}

// Faixa logo abaixo do cabeçalho (páginas públicas): visita, mapa e WhatsApp.
function barraVisita() {
  const b = document.createElement("div");
  b.className = "barra-visita";
  b.innerHTML = `<div class="container"><nav class="barra-visita-acoes" aria-label="Visite a igreja">
    <a class="btn pequeno" href="${rota("primeira-visita.html")}" ${pagina === "visita" ? 'aria-current="page"' : ""}>${icon("calendario")}<span>Planejar minha visita</span></a>
    <a class="btn secundario pequeno" data-maps href="${esc(linkMapsDe(I))}" target="_blank" rel="noopener">${icon("mapa")}<span>Como chegar</span></a>
    <a class="btn secundario pequeno" data-wa href="${esc(linkWaDe(I) || "#")}" target="_blank" rel="noopener" ${linkWaDe(I) ? "" : "hidden"}>${icon("whatsapp")}<span>Falar no WhatsApp</span></a>
  </nav></div>`;
  return b;
}
// Quando a página carrega os dados do painel (Conteúdo público), atualiza os links.
document.addEventListener("igreja-carregada", (e) => {
  const X = e.detail || {};
  document.querySelectorAll(".barra-visita [data-maps], .nav-visita [data-maps]").forEach((a) => (a.href = linkMapsDe(X)));
  document.querySelectorAll(".barra-visita [data-wa]").forEach((a) => { const l = linkWaDe(X); a.hidden = !l; if (l) a.href = l; });
  document.querySelectorAll(".nav-visita [data-wa]").forEach((a) => { const l = linkWaDe(X); a.closest("li").hidden = !l; if (l) a.href = l; });
});

function navInferior() {
  const n = document.createElement("nav");
  n.className = "nav-inferior";
  n.setAttribute("aria-label", "Menu principal (celular)");
  if (areaMembro) {
    const fixos = [
      { ids: ["membro"], nome: "Início", href: "membro/index.html", ic: "casa" },
      { ids: ["biblia"], nome: "Bíblia", href: "membro/biblia.html", ic: "biblia" },
      { ids: ["escalas", "eventos"], nome: "Agenda", href: "membro/escalas.html", ic: "calendario" },
      { ids: ["carteirinha"], nome: "Carteirinha", href: "membro/carteirinha.html", ic: "cartao" }
    ];
    const noMais = !fixos.some((f) => f.ids.includes(pagina));
    n.innerHTML = `<ul>${fixos.map((m) => `<li><a href="${rota(m.href)}" ${m.ids.includes(pagina) ? 'aria-current="page"' : ""}>${icon(m.ic)}<span>${m.nome}</span></a></li>`).join("")}
      <li><button type="button" id="btn-mais" aria-haspopup="dialog" ${noMais ? 'aria-current="page"' : ""}>${icon("menu")}<span>Mais</span></button></li></ul>`;
    return n;
  }
  n.innerHTML = `<ul>${MENU.map((m) => `<li><a href="${rota(m.href)}" ${m.id === pagina ? 'aria-current="page"' : ""}>${icon(m.ic)}<span>${m.nome}</span></a></li>`).join("")}</ul>`;
  return n;
}

function footer() {
  const f = document.createElement("footer");
  f.className = "site-footer";
  const wa = /^\d+$/.test(I.whatsapp) ? `https://wa.me/${I.whatsapp}` : "#";
  f.innerHTML = `<div class="container">
    <div class="rodape-grid">
      <div>
        <img src="${rota("assets/img/logo-idpb-transparente.png")}" alt="Logo da IDPB" width="64" height="76" style="width:64px;margin-bottom:12px" loading="lazy">
        <p class="lema">${esc(I.lema)}</p>
        <p class="pequeno" style="color:#b9b3a6">${esc(I.nome)} · ${esc(I.endereco)}</p>
        <div class="redes">
          <a href="${esc(I.instagram.startsWith("http") ? I.instagram : "#")}" aria-label="Instagram" rel="noopener">${icon("instagram")}</a>
          <a href="${esc(I.youtube.startsWith("http") ? I.youtube : "#")}" aria-label="YouTube" rel="noopener">${icon("youtube")}</a>
          <a href="${esc(wa)}" aria-label="WhatsApp" rel="noopener">${icon("whatsapp")}</a>
        </div>
      </div>
      <div><h4>Visite</h4><ul>
        <li><a href="${rota("primeira-visita.html")}">Primeira vez aqui?</a></li>
        <li><a href="${rota("primeira-visita.html#horarios")}">Horários dos cultos</a></li>
        <li><a href="${rota("sobre.html")}">Sobre nós</a></li>
      </ul></div>
      <div><h4>Participe</h4><ul>
        <li><a href="${rota("assistir.html")}">Mensagens</a></li>
        <li><a href="${rota("participar.html")}">Células, voluntariado e batismo</a></li>
        <li><a href="${rota("oracao.html")}">Precisa de oração?</a></li>
        <li><a href="${rota("contribuir.html")}">Contribuir</a></li>
      </ul></div>
      <div><h4>Membros</h4><ul>
        <li><a href="${rota(logado ? "membro/index.html" : "entrar.html")}">${logado ? "Minha área" : "Entrar"}</a></li>
        <li><a href="${rota("privacidade.html")}">Política de privacidade</a></li>
      </ul></div>
    </div>
    <div class="base"><span>© ${new Date().getFullYear()} ${esc(I.nome)} · Igreja de Deus Pentecostal do Brasil</span><span>Feito com carinho para a nossa família.</span></div>
  </div>`;
  return f;
}

function montar() {
  document.body.prepend(header());
  if (!areaMembro && pagina !== "entrar") document.querySelector(".site-header").after(barraVisita());
  if (!document.body.dataset.semRodape) document.body.append(footer());
  document.body.append(navInferior());
  hidratarIcones();
  const bt = document.getElementById("btn-tema");
  bt?.addEventListener("click", () => {
    const novo = escuroAgora() ? "light" : "dark";
    aplicarTema(novo);
    try { localStorage.setItem("idpb_tema", novo); } catch {}
    bt.innerHTML = icon(novo === "dark" ? "sol" : "lua");
    document.dispatchEvent(new CustomEvent("tema-alterado", { detail: novo }));
  });
  const bc = document.getElementById("btn-conta"), pop = document.getElementById("menu-conta");
  if (bc && pop) {
    const abrir = (sim) => {
      pop.hidden = !sim; bc.setAttribute("aria-expanded", String(sim));
      if (sim) pop.querySelector("a,button")?.focus();
    };
    bc.addEventListener("click", (e) => { e.stopPropagation(); abrir(pop.hidden); });
    document.addEventListener("click", (e) => { if (!pop.hidden && !pop.contains(e.target)) abrir(false); });
    document.addEventListener("keydown", (e) => {
      if (pop.hidden) return;
      if (e.key === "Escape") { abrir(false); bc.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const itens = [...pop.querySelectorAll("a,button")];
        const i = itens.indexOf(document.activeElement);
        itens[(i + (e.key === "ArrowDown" ? 1 : -1) + itens.length) % itens.length].focus();
        e.preventDefault();
      }
    });
  }
  document.getElementById("btn-mais")?.addEventListener("click", abrirMais);
  document.getElementById("btn-sair")?.addEventListener("click", async () => {
    const { sairComSeguranca } = await import("./sessao.js");
    sairComSeguranca();
  });
}

/** Folha "Mais" (celular): todas as seções da área do membro. */
function abrirMais() {
  membroLocal = lerMembroLocal() || membroLocal;
  const papeis = membroLocal?.papeis || [];
  const pode = (s) => !s.papel || papeis.includes("admin") || s.papel.some((p) => papeis.includes(p));
  const fixas = ["biblia", "escalas", "carteirinha"];
  const itens = SECOES.filter((s) => pode(s) && !fixas.includes(s.id));
  const d = document.createElement("dialog");
  d.className = "folha folha-mais";
  d.setAttribute("aria-label", "Mais seções");
  d.innerHTML = `<div class="dialog-cabeca"><h2>Mais</h2><button class="btn-icone" data-fechar aria-label="Fechar">${icon("fechar")}</button></div>
    <div class="dialog-corpo"><nav aria-label="Seções da área do membro"><ul class="grade-mais">
      ${itens.map((s) => `<li><a href="${rota("membro/" + s.href)}" ${s.id === pagina ? 'aria-current="page"' : ""}><span class="ic">${icon(s.ic)}</span><span>${esc(s.t)}</span></a></li>`).join("")}
    </ul></nav>
    <div class="linha" style="margin-top:16px"><a class="btn secundario" href="${rota("index.html")}">${icon("casa")}Ir para o site</a>
      <button class="btn fantasma" type="button" id="mais-sair">${icon("sair")}Sair da conta</button></div></div>`;
  document.body.append(d);
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-fechar]")) d.close(); });
  d.addEventListener("close", () => d.remove());
  d.querySelector("#mais-sair").onclick = async () => { d.close(); (await import("./sessao.js")).sairComSeguranca(); };
  d.showModal();
}

montar();

// Selo "Ao vivo" no item Assistir (usa os dados públicos já carregados pela página, sem Firebase aqui).
function marcarAoVivo(I) {
  const vivo = !!aoVivo(I);
  document.querySelectorAll(`.nav-principal a[href$="assistir.html"], .nav-inferior a[href$="assistir.html"]`).forEach((a) => {
    a.classList.toggle("vivo", vivo);
    a.querySelector(".selo-vivo")?.remove();
    if (vivo) a.insertAdjacentHTML("beforeend", '<span class="selo-vivo">Ao vivo</span>');
  });
}
try { const c = JSON.parse(sessionStorage.getItem("pub_igreja") || "null"); if (c) marcarAoVivo(c.v); } catch {}
document.addEventListener("igreja-carregada", (e) => marcarAoVivo(e.detail));

// Primeiro acesso após o login: o perfil chega depois do cabeçalho; atualiza o avatar.
document.addEventListener("membro-carregado", (e) => {
  membroLocal = e.detail;
  const b = document.getElementById("btn-conta");
  const ini = iniciais(e.detail?.nome);
  if (b && ini) b.innerHTML = `<span aria-hidden="true">${esc(ini)}</span>`;
  const n = document.querySelector(".conta-pop .conta-nome");
  if (n) n.textContent = String(e.detail?.nome || "").trim().split(/\s+/)[0] || "Minha conta";
});

// PWA: registra o service worker (escopo = raiz do site).
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  // updateViaCache "none": o navegador sempre confere se há versão nova do sw.js e do site-config.js.
  addEventListener("load", () => navigator.serviceWorker.register(rota("sw.js"), { scope: ROOT, updateViaCache: "none" }).then((r) => r.update()).catch(() => {}));
  // Quando uma versão nova assume, recarrega a página uma vez para mostrar tudo atualizado.
  if (navigator.serviceWorker.controller) {
    let recarregou = false;
    const digitando = () => { const a = document.activeElement; return !!a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Nunca recarrega no meio da digitação (ex.: anotações): a versão nova vale na próxima página.
      if (!recarregou && !digitando() && !document.querySelector("dialog[open]")) { recarregou = true; location.reload(); }
    });
  }
}
