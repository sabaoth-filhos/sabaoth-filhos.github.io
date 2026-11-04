// Perfil e família. O membro edita os próprios dados; cargo, batismo e membresia só a liderança edita.
import { exigirMembro } from "../core/sessao.js";
import { doc, updateDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, toast, fmtData, avatar, mensagemErro, $ } from "../core/ui.js";
import { icon, hidratarIcones } from "../core/icons.js";
import { comprimirFoto } from "../core/imagem.js";

const { user, membro, db } = await exigirMembro({ permitirPerfilIncompleto: true });
const completar = new URLSearchParams(location.search).has("completar") || !membro.perfilCompleto;
const m = { familia: { conjuge: {}, filhos: [] }, arvoreVisibilidade: "foto", ...membro };
m.familia = { conjuge: {}, filhos: [], ...(m.familia || {}) };
let foto = m.foto || "";

const app = document.getElementById("app");
app.innerHTML = `
${completar ? `<div class="alerta" style="margin-bottom:16px">${icon("info")}<p><b>Bem-vindo(a)! Seu cadastro foi aprovado.</b> Complete seu perfil para continuar.</p></div>` : ""}
<form class="form" id="f" novalidate>
  <section class="card pilha">
    <div class="linha" style="gap:16px">
      <div id="foto-prev">${avatar(m.nome, foto, "g")}</div>
      <div class="pilha" style="flex:1;min-width:180px">
        <label class="btn secundario pequeno" style="align-self:flex-start">${icon("pessoa")}Escolher foto<input type="file" accept="image/*" id="foto" class="sr-only"></label>
        <button type="button" class="btn fantasma pequeno ${foto ? "" : "oculto"}" id="rem-foto" style="align-self:flex-start">${icon("lixeira")}Remover foto</button>
        <small class="muted">A foto é reduzida no seu aparelho (256×256) antes de salvar.</small>
      </div>
    </div>
    <div class="campo"><label for="nome">Nome completo *</label><input id="nome" required maxlength="100" value="${esc(m.nome)}" autocomplete="name"></div>
    <div class="campo"><label for="celular">Celular / WhatsApp *</label><input id="celular" type="tel" inputmode="tel" required maxlength="30" value="${esc(m.celular || "")}" autocomplete="tel"></div>
    <div class="campo"><label for="aniversario">Data de aniversário *</label><input id="aniversario" type="date" required value="${esc(m.aniversario || "")}"></div>
    <div class="campo"><label for="endereco">Endereço <span class="muted">(opcional)</span></label><input id="endereco" maxlength="200" value="${esc(m.endereco || "")}" autocomplete="street-address"></div>
    <div class="campo"><label for="p-email">E-mail</label><input id="p-email" type="email" value="${esc(m.email || user.email || "")}" disabled><small class="ajuda">O e-mail da conta não pode ser alterado aqui.</small></div>
  </section>

  <section class="card pilha">
    <h2 style="font-size:1.15rem" class="linha">${icon("familia")} Família</h2>
    <div class="campo"><label for="conjuge">Cônjuge <span class="muted">(opcional)</span></label><input id="conjuge" maxlength="100" value="${esc(m.familia.conjuge?.nome || "")}"></div>
    <div><span class="rotulo">Filhos</span><div id="filhos" class="pilha" style="margin-top:8px"></div>
      <button type="button" class="btn fantasma pequeno" id="add-filho" style="margin-top:8px">${icon("mais")}Adicionar filho(a)</button></div>
  </section>

  <section class="card pilha">
    <h2 style="font-size:1.15rem" class="linha">${icon("escudo")} Dados da igreja <span class="selo">só a liderança altera</span></h2>
    <dl style="display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0">
      <dt class="muted">Cargo</dt><dd style="margin:0">${esc(m.cargo || "Membro")}</dd>
      <dt class="muted">Nº de membro</dt><dd style="margin:0">${esc(m.numeroMembro || "—")}</dd>
      <dt class="muted">Membro desde</dt><dd style="margin:0">${esc(fmtData(m.dataMembresia) || "—")}</dd>
      <dt class="muted">Batismo</dt><dd style="margin:0">${esc(fmtData(m.dataBatismo) || "—")}</dd>
    </dl>
  </section>

  <section class="card pilha">
    <h2 style="font-size:1.15rem" class="linha">${icon("arvore")} Árvore da Fé · privacidade</h2>
    <fieldset><legend class="sr-only">Como aparecer na Árvore da Fé da igreja</legend>
      ${[["foto", "Aparecer com foto"], ["nome", "Aparecer só com nome"], ["oculto", "Não aparecer (mostrar como \"Membro\")"]].map(([v, t]) =>
        `<label class="check"><input type="radio" name="arv" value="${v}" ${m.arvoreVisibilidade === v ? "checked" : ""}><span>${t}</span></label>`).join("")}
    </fieldset>
    <small class="muted">Também vale para a lista da sua célula. Os ramos continuam ligados em qualquer opção.</small>
  </section>

  <div class="msg" role="alert"></div>
  <button class="btn bloco" type="submit">${icon("check")}${completar ? "Salvar e continuar" : "Salvar alterações"}</button>
</form>
<section class="card" id="ganho-por" style="margin-top:16px"></section>`;

function linhaFilho(f = {}) {
  const d = document.createElement("div");
  d.className = "linha filho";
  d.innerHTML = `<input aria-label="Nome do filho(a)" placeholder="Nome" maxlength="100" value="${esc(f.nome || "")}" style="flex:2;min-width:140px">
    <input aria-label="Nascimento" type="date" value="${esc(f.nascimento || "")}" style="flex:1;min-width:140px">
    <button type="button" class="btn-icone" aria-label="Remover">${icon("lixeira")}</button>`;
  d.querySelector("button").onclick = () => d.remove();
  $("#filhos").append(d);
}
(m.familia.filhos || []).forEach(linhaFilho);
$("#add-filho").onclick = () => linhaFilho();

$("#foto").addEventListener("change", async (e) => {
  const arq = e.target.files[0]; if (!arq) return;
  try {
    foto = await comprimirFoto(arq);
    $("#foto-prev").innerHTML = avatar(m.nome, foto, "g");
    $("#rem-foto").classList.remove("oculto");
    toast(`Foto pronta (${Math.round(foto.length * 0.75 / 1024)} KB). Toque em Salvar.`);
  } catch (err) { toast(err.message, "erro"); }
});
$("#rem-foto").onclick = () => { foto = ""; $("#foto-prev").innerHTML = avatar(m.nome, "", "g"); $("#rem-foto").classList.add("oculto"); };

$("#f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = $("#nome").value.trim(), celular = $("#celular").value.trim(), aniversario = $("#aniversario").value;
  const msg = $(".msg");
  if (!nome || !celular || !aniversario) { msg.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>Preencha nome, celular e aniversário.</p></div>`; return; }
  const filhos = [...document.querySelectorAll(".filho")].map((d) => { const [n, dt] = d.querySelectorAll("input"); return { nome: n.value.trim(), nascimento: dt.value }; }).filter((f) => f.nome).slice(0, 15);
  const arvoreVisibilidade = document.querySelector("input[name=arv]:checked")?.value || "foto";
  const dados = {
    nome, celular, aniversario, foto, endereco: $("#endereco").value.trim(),
    familia: { conjuge: { nome: $("#conjuge").value.trim() }, filhos },
    arvoreVisibilidade, perfilCompleto: true, atualizadoEm: serverTimestamp()
  };
  const [, mes, dia] = aniversario.split("-").map(Number);
  const btn = e.target.querySelector("button[type=submit]"); btn.setAttribute("aria-busy", "true");
  try {
    await updateDoc(doc(db, "members", user.uid), dados);
    // Cartão público (para outros membros aprovados): só o necessário.
    await setDoc(doc(db, "directory", user.uid), {
      nome, foto: arvoreVisibilidade === "foto" ? foto : "", aniversarioDia: dia, aniversarioMes: mes,
      arvore: arvoreVisibilidade, atualizadoEm: serverTimestamp()
    });
    toast("Perfil salvo!");
    if (completar) location.href = "index.html";
  } catch (err) { msg.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(mensagemErro(err))}</p></div>`; }
  finally { btn.removeAttribute("aria-busy"); }
});

// "Quem me ganhou para Jesus?" (Árvore da Fé)
if (!completar) import("../arvore/ligacao.js").then((mod) => mod.montarMinhaLigacao($("#ganho-por"), { db, user, membro })).catch(() => $("#ganho-por").remove());
else $("#ganho-por").remove();
hidratarIcones();
