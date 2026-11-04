// Carteirinha digital: logo, foto, nome, cargo, membresia, número e QR de verificação.
import { exigirMembro } from "../core/sessao.js";
import { esc, fmtData, iniciais, qrSvg, carregarScript, CDN, toast, rota } from "../core/ui.js";
import { icon } from "../core/icons.js";

const { membro } = await exigirMembro();
const SITE = self.SITE_CONFIG;
const app = document.getElementById("app");
const url = membro.cartaoToken ? SITE.baseUrl() + "verificar.html?c=" + membro.cartaoToken : "";

app.innerHTML = `
<div style="display:grid;justify-items:center;gap:18px">
  <div class="carteirinha aparecer" id="cartao" role="img" aria-label="Carteirinha de membro de ${esc(membro.nome)}">
    <div class="topo"><img src="${rota("assets/img/logo-idpb-transparente.png")}" alt="">
      <div><b>IDPB Jave Sabaoth</b><small>Igreja de Deus Pentecostal do Brasil · Carteira de membro</small></div></div>
    <div class="corpo">
      ${membro.foto ? `<img class="foto" src="${esc(membro.foto)}" alt="">` : `<div class="foto">${esc(iniciais(membro.nome))}</div>`}
      <div class="dados">
        <div class="nome">${esc(membro.nome)}</div>
        <span><b>Cargo:</b> ${esc(membro.cargo || "Membro")}</span>
        <span><b>Membro desde:</b> ${esc(fmtData(membro.dataMembresia) || "—")}</span>
        <span><b>Nº:</b> ${esc(membro.numeroMembro || "—")}</span>
        ${membro.dataBatismo ? `<span><b>Batismo:</b> ${esc(fmtData(membro.dataBatismo))}</span>` : ""}
      </div>
      <div class="qrbox" id="qr" aria-label="QR code de verificação"></div>
    </div>
  </div>
  ${url ? "" : `<div class="alerta" style="max-width:420px">${icon("info")}<p>O QR code de verificação aparece depois que a secretaria gerar sua carteirinha no painel.</p></div>`}
  <div class="linha nao-imprimir" style="justify-content:center">
    <button class="btn" id="tela-cheia">${icon("zoomMais")}Mostrar em tela cheia</button>
    <button class="btn secundario" id="baixar">${icon("baixar")}Baixar imagem</button>
    <button class="btn secundario" id="imprimir">${icon("imprimir")}Imprimir</button>
  </div>
  <p class="pequeno muted nao-imprimir" style="text-align:center;max-width:420px">Dica: no celular, salve a imagem na galeria para mostrar mesmo sem internet.</p>
</div>`;

if (url) document.getElementById("qr").innerHTML = await qrSvg(url, 3).catch(() => "");
document.getElementById("imprimir").onclick = () => print();

/* ---------- Tela cheia: para mostrar na portaria/eventos ----------
   Fundo branco, cartão o maior possível, QR ampliado e tela sem apagar (Wake Lock, quando o aparelho permite).
   O brilho da tela não pode ser alterado pelo navegador: por isso o aviso. */
document.getElementById("tela-cheia").onclick = async () => {
  const ov = document.createElement("div");
  ov.className = "cartao-cheio";
  ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Carteirinha em tela cheia");
  ov.innerHTML = `<button class="btn-icone fechar-cheio" aria-label="Fechar tela cheia">${icon("fechar")}</button>
    <div class="cartao-cheio-area">${document.getElementById("cartao").outerHTML.replace('id="cartao"', "")}</div>
    ${url ? `<div class="qr-grande" aria-label="QR code de verificação">${await qrSvg(url, 6).catch(() => "")}</div>` : ""}
    <p class="pequeno">Aumente o brilho da tela para facilitar a leitura do QR code.</p>`;
  document.body.append(ov);
  document.documentElement.classList.add("sem-rolagem");
  let trava = null;
  try { trava = await navigator.wakeLock?.request("screen"); } catch {}
  try { await ov.requestFullscreen?.({ navigationUI: "hide" }); } catch {}
  const fechar = async () => {
    try { await trava?.release(); } catch {}
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch {} }
    document.documentElement.classList.remove("sem-rolagem");
    ov.remove(); document.removeEventListener("keydown", esc_); document.getElementById("tela-cheia").focus();
  };
  const esc_ = (e) => { if (e.key === "Escape") fechar(); };
  document.addEventListener("keydown", esc_);
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && ov.isConnected) fechar(); }, { once: true });
  ov.querySelector(".fechar-cheio").onclick = fechar;
  ov.querySelector(".fechar-cheio").focus();
};
document.getElementById("baixar").onclick = async () => {
  try {
    await carregarScript(CDN.html2canvas);
    const c = await self.html2canvas(document.getElementById("cartao"), { scale: 3, backgroundColor: null, useCORS: true });
    const a = document.createElement("a");
    a.download = `carteirinha-${(membro.nome || "membro").toLowerCase().replace(/\s+/g, "-")}.png`;
    a.href = c.toDataURL("image/png"); a.click();
  } catch (e) { toast("Não foi possível gerar a imagem. Use Imprimir > Salvar como PDF.", "erro"); }
};
