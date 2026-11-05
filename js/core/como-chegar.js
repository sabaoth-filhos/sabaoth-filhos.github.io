// "Como chegar": em vez de pular direto para o Google Maps, abre um painel com o endereço,
// opções de app (Google Maps, Waze, Uber, Apple Maps no iPhone) e "Copiar endereço".
// Funciona em qualquer link de Como chegar do site (href do Google Maps), sem precisar mudar cada página.
import { icon } from "./icons.js";
import { esc } from "./ui.js";

const SITE = self.SITE_CONFIG;
const CHAVE_APP = "idpb_rota_app";
const ehMaps = (a) => a && /^https:\/\/www\.google\.com\/maps\/search\//.test(a.href || "");

const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const celular = matchMedia("(pointer: coarse)").matches;

function dadosIgreja() {
  let I = SITE.IGREJA;
  try { const c = JSON.parse(sessionStorage.getItem("pub_igreja") || "null"); if (c && c.v) I = { ...I, ...c.v }; } catch {}
  return I;
}

function apps(destino) {
  const q = encodeURIComponent(destino);
  const lista = [
    { id: "google", nome: "Google Maps", ic: "mapa", url: `https://www.google.com/maps/search/?api=1&query=${q}` },
    { id: "waze", nome: "Waze", ic: "carro", url: `https://waze.com/ul?q=${q}&navigate=yes` },
    celular && { id: "uber", nome: "Uber", ic: "carro", url: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff%5Bformatted_address%5D=${q}` },
    iOS && { id: "apple", nome: "Apple Maps", ic: "pin", url: `https://maps.apple.com/?q=${q}` }
  ].filter(Boolean);
  // O app escolhido da última vez aparece primeiro.
  let ultimo = null;
  try { ultimo = localStorage.getItem(CHAVE_APP); } catch {}
  const i = lista.findIndex((a) => a.id === ultimo);
  if (i > 0) lista.unshift(...lista.splice(i, 1));
  return { lista, ultimo: i >= 0 ? ultimo : null };
}

// Mini mapa ilustrativo (não é o mapa real: só ajuda a reconhecer o destino antes de sair do site).
const MINI_MAPA = `<svg class="cc-mapa-svg" viewBox="0 0 320 120" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
  <rect width="320" height="120" fill="var(--bg-suave)"/>
  <g stroke="var(--borda)" stroke-width="10" stroke-linecap="round" fill="none">
    <path d="M-10 78 C 70 70, 120 92, 200 80 S 300 60, 340 66"/><path d="M96 -10 L 118 130"/><path d="M228 -10 C 220 40, 236 80, 226 130"/>
  </g>
  <g stroke="var(--borda)" stroke-width="4" fill="none"><path d="M-10 30 L 340 40"/><path d="M40 -10 L 52 130"/><path d="M168 -10 L 160 130"/><path d="M284 -10 L 296 130"/></g>
  <circle cx="160" cy="58" r="26" fill="var(--ouro)" opacity=".22"/>
  <path d="M160 74s-15-13-15-25a15 15 0 0 1 30 0c0 12-15 25-15 25z" fill="var(--ouro)" stroke="var(--preto)" stroke-width="2"/>
  <circle cx="160" cy="49" r="5" fill="var(--preto)"/>
</svg>`;

let aberto = null;

export function abrirComoChegar(origem) {
  if (aberto) return;
  const I = dadosIgreja();
  const destino = I.mapsQuery || I.endereco || "";
  const end = String(I.endereco || destino);
  const [linha1, ...resto] = end.split(/\s+-\s+/);
  const { lista, ultimo } = apps(destino);
  const horarios = (I.horarios || []).filter((h) => h && h.dia && !String(h.dia).includes("["));
  const nomeApp = (a) => (a.id === ultimo ? `Abrir no ${a.nome}` : a.nome);

  const d = document.createElement("dialog");
  d.className = "folha cc";
  d.setAttribute("aria-labelledby", "cc-titulo");
  d.innerHTML = `
    <div class="cc-alca" aria-hidden="true"></div>
    <div class="dialog-cabeca"><h2 id="cc-titulo">Como chegar</h2>
      <button class="btn-icone" type="button" data-fechar aria-label="Fechar">${icon("fechar")}</button></div>
    <div class="dialog-corpo">
      <div class="cc-mapa">${MINI_MAPA}</div>
      <p class="cc-end"><strong>${esc(linha1)}</strong>${resto.length ? `<span>${esc(resto.join(" - "))}</span>` : ""}</p>
      <p class="cc-rotulo">Abrir no app</p>
      <div class="cc-apps">${lista.map((a, i) => `<a class="btn ${i === 0 ? "" : "secundario "}cc-app" data-app="${a.id}" href="${esc(a.url)}" target="_blank" rel="noopener">
        ${icon(a.ic)}<span>${esc(nomeApp(a))}</span><span class="cc-fora" aria-hidden="true">↗</span><span class="sr-only">(abre fora do site)</span></a>`).join("")}</div>
      <button class="btn fantasma bloco cc-copiar" type="button" id="cc-copiar">${icon("copiar")}<span>Copiar endereço</span></button>
      ${horarios.length ? `<p class="cc-extra">${icon("relogio")}<span>${horarios.map((h) => `${esc(h.dia)} ${esc(h.hora)}`).join(" · ")}</span></p>` : ""}
    </div>`;
  document.body.append(d);
  aberto = d;

  // Botão Voltar do celular fecha o painel em vez de sair do site.
  let peloVoltar = false;
  try { history.pushState({ comoChegar: 1 }, ""); } catch {}
  const aoVoltar = () => { peloVoltar = true; d.close(); };
  addEventListener("popstate", aoVoltar);

  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-fechar]")) d.close(); });
  d.addEventListener("close", () => {
    removeEventListener("popstate", aoVoltar);
    if (!peloVoltar && history.state && history.state.comoChegar) history.back();
    d.remove(); aberto = null;
    origem?.focus?.();
  });
  d.querySelectorAll("[data-app]").forEach((a) => a.addEventListener("click", () => {
    try { localStorage.setItem(CHAVE_APP, a.dataset.app); } catch {}
    setTimeout(() => d.close(), 300);
  }));
  const bc = d.querySelector("#cc-copiar");
  bc.addEventListener("click", async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(end); ok = true; } catch {
      const t = Object.assign(document.createElement("textarea"), { value: end });
      d.append(t); t.select(); try { ok = document.execCommand("copy"); } catch {} t.remove();
    }
    bc.querySelector("span").textContent = ok ? "Endereço copiado!" : "Não deu para copiar";
    bc.classList.toggle("copiado", ok);
    setTimeout(() => { bc.querySelector("span").textContent = "Copiar endereço"; bc.classList.remove("copiado"); }, 2200);
  });

  // Arrastar para baixo fecha (celular).
  let y0 = null;
  const alca = d.querySelector(".cc-alca"), cab = d.querySelector(".dialog-cabeca");
  [alca, cab].forEach((el) => {
    el.addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; d.style.transition = "none"; }, { passive: true });
    el.addEventListener("touchmove", (e) => { if (y0 === null) return; const dy = Math.max(0, e.touches[0].clientY - y0); d.style.transform = `translateY(${dy}px)`; }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (y0 === null) return;
      const dy = e.changedTouches[0].clientY - y0; y0 = null;
      d.style.transition = ""; d.style.transform = "";
      if (dy > 80) d.close();
    });
  });

  d.showModal();
  d.querySelector(".cc-app")?.focus();
}

// Intercepta todos os links "Como chegar" (links do Google Maps) do site.
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest("a");
  if (!ehMaps(a) || a.closest(".cc")) return;
  e.preventDefault();
  abrirComoChegar(a);
});
// Sinaliza para leitores de tela que o link abre um painel.
const marcar = () => document.querySelectorAll('a[href^="https://www.google.com/maps/search/"]').forEach((a) => {
  if (a.closest(".cc")) return;
  a.setAttribute("aria-haspopup", "dialog");
});
marcar();
new MutationObserver(marcar).observe(document.body, { childList: true, subtree: true });
