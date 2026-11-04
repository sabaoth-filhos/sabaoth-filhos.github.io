/* Service worker — IDPB Jave Sabaoth (PWA)
   - Funciona em qualquer endereço: usa o escopo do registro (sem URL fixa).
   - Guarda o "esqueleto" do site (páginas, CSS, JS, ícones) para abrir sem internet.
   - NÃO guarda textos bíblicos: eles ficam só no cache do Firestore do usuário logado,
     que é apagado ao sair da conta. */
importScripts("js/site-config.js");
const VERSAO = (self.SITE_CONFIG && self.SITE_CONFIG.CACHE_VERSION) || "v1";
const CACHE = "idpb-site-" + VERSAO;
const CACHE_CDN = "idpb-cdn-" + VERSAO;
const BASE = self.registration.scope; // ex.: https://sabaoth-filhos.github.io/

const ESQUELETO = [
  "", "index.html", "primeira-visita.html", "assistir.html", "participar.html", "oracao.html", "contribuir.html", "sobre.html",
  "privacidade.html", "entrar.html", "offline.html", "manifest.webmanifest",
  "css/style.css",
  "js/site-config.js", "js/firebase-config.js",
  "js/core/layout.js", "js/core/agenda.js", "js/membro/secoes.js", "js/core/ui.js", "js/core/icons.js", "js/core/firebase.js", "js/core/sessao.js", "js/core/dados-publicos.js", "js/core/forms.js", "js/core/pix.js", "js/core/imagem.js",
  "js/paginas/comum.js", "js/paginas/home.js", "js/paginas/assistir.js", "js/paginas/entrar.js",
  "membro/index.html", "membro/biblia.html", "membro/anotacoes.html", "membro/culto.html", "membro/carteirinha.html", "membro/perfil.html",
  "membro/avisos.html", "membro/escalas.html", "membro/eventos.html", "membro/celula.html", "membro/arvore.html", "membro/contribuicoes.html", "membro/oracoes.html",
  "js/membro/comum.js", "js/membro/painel.js", "js/membro/carteirinha.js", "js/membro/perfil.js", "js/membro/avisos.js", "js/membro/escalas.js", "js/membro/eventos.js", "js/membro/celula.js", "js/membro/contribuicoes.js", "js/membro/oracoes.js",
  "js/biblia/leitor.js", "js/biblia/anotacoes.js", "js/biblia/culto.js", "js/biblia/notas-store.js", "js/biblia/editor-nota.js", "js/biblia/dados.js", "js/biblia/referencias.js", "js/biblia/livros.js",
  "js/arvore/arvore.js", "js/arvore/dados.js", "js/arvore/ligacao.js",
  "assets/img/logo-idpb.jpg", "assets/img/logo-idpb-transparente.png",
  "assets/img/icons/icon-192.png", "assets/img/icons/icon-512.png", "assets/img/icons/favicon-48.png"
].map((p) => new URL(p, BASE).href);

// Bibliotecas externas com versão fixa (podem ficar em cache por tempo indeterminado).
const CDN_HOSTS = ["www.gstatic.com", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];
// Nunca interceptar: APIs do Firebase/Google (dados, login) e YouTube.
const NUNCA = ["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com", "firebaseinstallations.googleapis.com", "www.googleapis.com", "apis.google.com", "youtube", "ytimg", "firebaseapp.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ESQUELETO.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("idpb-") && k !== CACHE && k !== CACHE_CDN).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (NUNCA.some((h) => url.hostname.includes(h))) return;

  // CDN: cache primeiro (URLs com versão fixa)
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(CACHE_CDN).then(async (c) => {
      const r = await c.match(req);
      if (r) return r;
      const n = await fetch(req);
      if (n.ok || n.type === "opaque") c.put(req, n.clone());
      return n;
    }));
    return;
  }
  if (!req.url.startsWith(BASE)) return;

  // Páginas: rede primeiro (conteúdo sempre atual), cache se estiver sem internet.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const n = await fetch(req, { cache: "no-cache" });
        const c = await caches.open(CACHE); c.put(req, n.clone());
        return n;
      } catch {
        const c = await caches.open(CACHE);
        return (await c.match(req, { ignoreSearch: true })) || (await c.match(new URL("offline.html", BASE).href));
      }
    })());
    return;
  }
  // Arquivos do site (CSS, JS, imagens): rede primeiro, para nunca mostrar versão antiga
  // quando há internet. O cache só entra sem conexão ou se a rede demorar mais de 4 s.
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const emCache = () => c.match(req, { ignoreSearch: true });
    try {
      const n = await Promise.race([
        fetch(req, { cache: "no-cache" }),
        new Promise((_, falha) => setTimeout(() => falha(new Error("lento")), 4000))
      ]);
      if (n.ok) c.put(req, n.clone());
      return n;
    } catch {
      return (await emCache()) || fetch(req);
    }
  }));
});
