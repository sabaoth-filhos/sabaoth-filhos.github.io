// Preenche horários, endereço e links (Maps/WhatsApp) nas páginas públicas.
import { getIgreja } from "../core/dados-publicos.js";
import { esc } from "../core/ui.js";
import { icon } from "../core/icons.js";

export const linkMaps = (I) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(I.mapsQuery || I.endereco)}`;
export const linkWa = (I) => /^\d{10,}$/.test(String(I.whatsapp)) ? `https://wa.me/${I.whatsapp}?text=${encodeURIComponent("Olá! Vim pelo site da IDPB Jave Sabaoth.")}` : "#";

export async function preencherDadosIgreja() {
  const I = await getIgreja();
  document.querySelectorAll("#maps, #hero-maps").forEach((a) => (a.href = linkMaps(I)));
  document.querySelectorAll("#wa").forEach((a) => (a.href = linkWa(I)));
  document.querySelectorAll("#endereco-texto").forEach((e) => (e.innerHTML = `${icon("pin")} ${esc(I.endereco)}`.replace("<svg", '<svg style="display:inline;width:18px;vertical-align:-3px"')));
  const h = document.getElementById("lista-horarios");
  if (h) h.innerHTML = (I.horarios || []).map((x) => `<div class="horario">${icon("relogio")}<div><strong>${esc(x.dia)} · ${esc(x.hora)}</strong><span>${esc(x.nome)}</span></div></div>`).join("");
  const hs = document.getElementById("lista-horarios-simples");
  if (hs) hs.innerHTML = (I.horarios || []).map((x) => `<li>${icon("relogio")}<span><b>${esc(x.dia)}, ${esc(x.hora)}</b> — ${esc(x.nome)}</span></li>`).join("");
  return I;
}

/** Vídeo do YouTube com "fachada" leve: só carrega o player ao tocar (rápido no celular). */
export function videoFachada(ytId, titulo) {
  if (!ytId) return `<div class="video"><div class="sem-video">Vídeo em breve</div></div>`;
  return `<div class="video"><button type="button" data-yt="${esc(ytId)}" aria-label="Assistir: ${esc(titulo)}">
    <img src="https://i.ytimg.com/vi/${esc(ytId)}/hqdefault.jpg" alt="" loading="lazy"><span class="play">${icon("play")}</span></button></div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-yt]");
  if (!b) return;
  const f = document.createElement("iframe");
  f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0`;
  f.title = b.getAttribute("aria-label") || "Vídeo";
  f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  f.allowFullscreen = true;
  b.replaceWith(f);
});
