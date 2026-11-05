// Script da página oracao.html (separado do HTML para permitir CSP sem 'unsafe-inline').
import { enviarPedidoOracao } from "../core/forms.js";
import { icon } from "../core/icons.js";
import { esc, mensagemErro } from "../core/ui.js";
if (document.getElementById("form-oracao")) {
const f = document.getElementById("form-oracao");
const anon = document.getElementById("anonimo");
anon.addEventListener("change", () => document.getElementById("dados-pessoais").classList.toggle("oculto", anon.checked));
f.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(f), msg = f.querySelector(".msg");
  const pedido = String(fd.get("pedido") || "").trim();
  if (!pedido) { msg.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>Escreva seu pedido.</p></div>`; f.pedido.focus(); return; }
  const b = f.querySelector("button[type=submit]"); b.setAttribute("aria-busy", "true");
  try {
    await enviarPedidoOracao({ pedido, nome: String(fd.get("nome")||"").trim(), contato: String(fd.get("contato")||"").trim(), anonimo: anon.checked, publico: !!fd.get("publico") });
    document.getElementById("area-oracao").innerHTML = `<div class="alerta ok aparecer">${icon("check")}<div><h3>Recebemos seu pedido.</h3><p>Vamos orar por você. "Lancem sobre Ele toda a sua ansiedade, porque Ele tem cuidado de vocês." (1Pe 5:7)</p></div></div>`;
  } catch (err) { msg.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(mensagemErro(err))}</p></div>`; }
  finally { b.removeAttribute("aria-busy"); }
});
}
