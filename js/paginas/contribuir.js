// Script da página contribuir.html (separado do HTML para permitir CSP sem 'unsafe-inline').
import { getIgreja } from "../core/dados-publicos.js";
import { payloadPix, chaveEhPlaceholder } from "../core/pix.js";
import { copiar, qrSvg, esc } from "../core/ui.js";
import { icon } from "../core/icons.js";
const I = await getIgreja();
document.getElementById("pix-chave").textContent = I.pixChave;
document.getElementById("pix-titular").textContent = I.pixTitular;
const placeholder = chaveEhPlaceholder(I.pixChave);
const codigo = placeholder ? "" : payloadPix({ chave: I.pixChave, nome: I.pixTitular, cidade: I.pixCidade || "MANAUS" });
if (placeholder) {
  document.getElementById("pix-aviso").innerHTML = `<div class="alerta" style="text-align:left;margin-bottom:12px">${icon("info")}<p>A chave Pix ainda não foi configurada. Edite em <b>js/site-config.js</b> ou no painel admin (Conteúdo público).</p></div>`;
  document.getElementById("pix-qr").innerHTML = `<div style="width:220px;height:220px;display:grid;place-items:center;color:#666;border:2px dashed #ccc">QR code<br>(aguardando chave)</div>`;
} else {
  try { document.getElementById("pix-qr").innerHTML = await qrSvg(codigo, 5); } catch { document.getElementById("pix-qr").textContent = "Não foi possível gerar o QR code."; }
}
// Mostra "Copiado!" no próprio botão por alguns segundos (retorno visível além do aviso).
const confirmarBotao = (b, txt) => {
  const sp = b.querySelector("span"), antes = sp.textContent;
  sp.textContent = txt; b.classList.add("copiado");
  setTimeout(() => { sp.textContent = antes; b.classList.remove("copiado"); }, 2500);
};
const bChave = document.getElementById("copiar-chave"), bCod = document.getElementById("copiar-codigo");
bChave.onclick = async () => { if (placeholder) return alert("Chave Pix ainda não configurada."); await copiar(I.pixChave, "Chave Pix copiada!"); confirmarBotao(bChave, "Copiada!"); };
bCod.onclick = async () => { if (placeholder) return alert("Chave Pix ainda não configurada."); await copiar(codigo, "Código Pix copiado! Cole no app do banco."); confirmarBotao(bCod, "Código copiado!"); };
