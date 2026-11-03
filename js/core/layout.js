// Cabeçalho, menu inferior (celular), rodapé, tema e service worker.
// Incluído em todas as páginas. Não carrega o Firebase (página pública rápida).
import "../site-config.js";
import { icon, hidratarIcones } from "./icons.js";
import { ROOT, rota, esc } from "./ui.js";

const SITE = self.SITE_CONFIG;
const I = SITE.IGREJA;
const pagina = document.body.dataset.pagina || "";
const logado = (() => { try { return localStorage.getItem("idpb_logado") === "1"; } catch { return false; } })();
const areaMembro = document.body.dataset.area === "membro" || document.body.dataset.area === "admin";

const MENU = [
  { id: "inicio", nome: "Início", href: "index.html", ic: "casa" },
  { id: "assistir", nome: "Assistir", href: "assistir.html", ic: "assistir" },
  { id: "participar", nome: "Participar", href: "participar.html", ic: "grupo" },
  { id: "contribuir", nome: "Contribuir", href: "contribuir.html", ic: "presente" },
  logado
    ? { id: "membro", nome: "Minha área", href: "membro/index.html", ic: "pessoa", cta: true }
    : { id: "entrar", nome: "Entrar", href: "entrar.html", ic: "entrar", cta: true }
];

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
      ${MENU.map((m) => `<li><a href="${rota(m.href)}" class="${m.cta ? "cta" : ""}" ${m.id === pagina ? 'aria-current="page"' : ""}>${icon(m.ic)}${m.nome}</a></li>`).join("")}
    </ul></nav>
    <div class="header-acoes">
      <button class="btn-icone" id="btn-tema" aria-label="Alternar modo claro/escuro">${icon(escuroAgora() ? "sol" : "lua")}</button>
      ${areaMembro ? `<button class="btn-icone" id="btn-sair" aria-label="Sair da conta" title="Sair">${icon("sair")}</button>` : ""}
    </div>
  </div>`;
  return h;
}

function navInferior() {
  const n = document.createElement("nav");
  n.className = "nav-inferior";
  n.setAttribute("aria-label", "Menu principal (celular)");
  const itens = areaMembro
    ? [
        { id: "membro", nome: "Painel", href: "membro/index.html", ic: "painel" },
        { id: "biblia", nome: "Bíblia", href: "membro/biblia.html", ic: "biblia" },
        { id: "culto", nome: "No culto", href: "membro/culto.html", ic: "microfone" },
        { id: "anotacoes", nome: "Anotações", href: "membro/anotacoes.html", ic: "nota" },
        { id: "inicio", nome: "Site", href: "index.html", ic: "casa" }
      ]
    : MENU;
  n.innerHTML = `<ul>${itens.map((m) => `<li><a href="${rota(m.href)}" ${m.id === pagina ? 'aria-current="page"' : ""}>${icon(m.ic)}<span>${m.nome}</span></a></li>`).join("")}</ul>`;
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
        <li><a href="${rota("index.html#horarios")}">Horários dos cultos</a></li>
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
  document.getElementById("btn-sair")?.addEventListener("click", async () => {
    const { sairComSeguranca } = await import("./sessao.js");
    sairComSeguranca();
  });
}
montar();

// PWA: registra o service worker (escopo = raiz do site).
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  addEventListener("load", () => navigator.serviceWorker.register(rota("sw.js"), { scope: ROOT }).catch(() => {}));
}
