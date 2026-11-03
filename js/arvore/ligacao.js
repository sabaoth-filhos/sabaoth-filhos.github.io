// "Quem me ganhou para Jesus?" (no perfil) + confirmações de quem me indicou como ganhador.
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp, arrayUnion
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, toast, mensagemErro, normalizar, avatar } from "../core/ui.js";
import { icon } from "../core/icons.js";
import { MODOS, criaCiclo } from "./dados.js";

const entrada = (acao, por, extra = {}) => ({ em: Date.now(), por, acao, ...extra });

export async function montarMinhaLigacao(alvo, { db, user, membro }) {
  alvo.innerHTML = `<span class="carregando"></span>`;
  const [lSnap, tSnap, dirSnap, linksSnap, pedidos] = await Promise.all([
    getDoc(doc(db, "spiritualLinks", user.uid)),
    getDoc(doc(db, "testimonies", user.uid)).catch(() => null),
    getDocs(collection(db, "directory")),
    getDocs(collection(db, "spiritualLinks")),
    getDocs(query(collection(db, "spiritualLinks"), where("ganhoPorId", "==", user.uid)))
  ]);
  const minha = lSnap.exists() ? lSnap.data() : null;
  const test = tSnap?.exists() ? tSnap.data() : { texto: "", visivel: false };
  const pessoas = dirSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.id !== user.uid).sort((a, b) => a.nome.localeCompare(b.nome));
  const ligacoes = new Map(linksSnap.docs.map((d) => [d.id, d.data()]));
  const nomeDe = (id) => pessoas.find((p) => p.id === id)?.nome || "Membro";
  const aConfirmar = pedidos.docs.filter((d) => d.data().status === "pendente").map((d) => ({ id: d.id, ...d.data() }));

  const editavel = !minha || minha.status === "pendente" || minha.raiz;
  let tipo = minha?.raiz ? "raiz" : minha?.ganhoPorNomeExterno ? "externo" : "membro";
  let ganhoPorId = minha?.ganhoPorId || "";
  let contribuiram = [...(minha?.contribuiram || [])];

  alvo.innerHTML = `
  <h2 style="font-size:1.15rem" class="linha">${icon("arvore")} Quem me ganhou para Jesus?</h2>
  <p class="muted pequeno">Faz parte da <a href="arvore.html">Árvore da Fé</a>. Quando você indica um membro, a ligação fica <b>aguardando confirmação</b> dessa pessoa (ou da liderança).</p>
  ${aConfirmar.length ? `<div class="pilha" style="margin:12px 0">${aConfirmar.map((p) => `
    <div class="alerta ok"><span>${icon("arvore")}</span><div><p><b>${esc(nomeDe(p.id))}</b> disse que foi ganho(a) para Jesus por você${p.modos?.length ? " (" + p.modos.map((m) => MODOS[m]?.nome || m).join(", ") + ")" : ""}.</p>
      <button class="btn pequeno" data-confirmar="${esc(p.id)}" style="margin-top:8px">${icon("check")}Sim, ${esc(nomeDe(p.id).split(" ")[0])} é meu fruto</button>
      <small class="muted" style="display:block;margin-top:6px">Não reconhece? Avise a liderança.</small></div></div>`).join("")}</div>` : ""}
  ${minha ? `<p class="selo ${minha.status === "confirmado" ? "verde" : "ouro"}" style="margin:8px 0">${minha.raiz ? "Raiz da árvore" : minha.status === "confirmado" ? "Ligação confirmada" : "Aguardando confirmação"}</p>` : ""}
  ${!editavel ? `<p class="muted">Ganho(a) por <b>${esc(minha.ganhoPorId ? nomeDe(minha.ganhoPorId) : minha.ganhoPorNomeExterno || "—")}</b>${minha.dataConversao ? " · " + esc(minha.dataConversao) : ""}. Para corrigir, fale com a liderança.</p>` : ""}
  <form class="form" id="f-lig" novalidate ${editavel ? "" : 'style="display:none"'}>
    <fieldset><legend>Quem foi?</legend><div class="opcoes-chip">
      <label class="chip"><input type="radio" name="tipo" value="membro" ${tipo === "membro" ? "checked" : ""}>Um membro da igreja</label>
      <label class="chip"><input type="radio" name="tipo" value="externo" ${tipo === "externo" ? "checked" : ""}>Alguém sem cadastro</label>
      <label class="chip"><input type="radio" name="tipo" value="raiz" ${tipo === "raiz" ? "checked" : ""}>Ninguém daqui</label></div></fieldset>
    <div class="campo" id="c-membro"><label for="busca-m">Buscar membro</label><input id="busca-m" autocomplete="off" placeholder="Digite o nome…" value="${esc(ganhoPorId ? nomeDe(ganhoPorId) : "")}">
      <div id="sug" class="pilha" style="gap:4px"></div></div>
    <div class="campo oculto" id="c-externo"><label for="ext">Nome da pessoa</label><input id="ext" maxlength="100" value="${esc(minha?.ganhoPorNomeExterno || "")}" placeholder="Ex.: Irmã Joana (já falecida)"></div>
    <div id="c-detalhes" class="pilha">
      <fieldset><legend>Como foi?</legend><div class="opcoes-chip">${Object.entries(MODOS).map(([k, m]) =>
        `<label class="chip"><input type="checkbox" name="modo" value="${k}" ${(minha?.modos || []).includes(k) ? "checked" : ""}>${icon(m.ic)}${esc(m.nome)}</label>`).join("")}</div></fieldset>
      <div class="campo oculto" id="c-outro"><label for="outro">Outro (descreva)</label><input id="outro" maxlength="80" value="${esc(minha?.modoOutro || "")}"></div>
      <div class="campo"><label>Também contribuíram <span class="muted">(opcional)</span></label><div class="opcoes-chip" id="contrib"></div>
        <input id="busca-c" autocomplete="off" placeholder="Adicionar pessoa…"><div id="sug-c" class="pilha" style="gap:4px"></div></div>
    </div>
    <div class="campo"><label for="conv">Ano ou data aproximada da conversão <span class="muted">(opcional)</span></label><input id="conv" maxlength="20" placeholder="Ex.: 2015 ou 03/2015" value="${esc(minha?.dataConversao || "")}"></div>
    <div class="campo"><label for="test">Testemunho curto <span class="muted">(opcional, até 500 caracteres)</span></label><textarea id="test" maxlength="500">${esc(test.texto || "")}</textarea>
      <label class="check"><input type="checkbox" id="test-vis" ${test.visivel ? "checked" : ""}><span>Permitir que outros membros vejam meu testemunho</span></label></div>
    <div class="msg" role="alert"></div>
    <button class="btn" type="submit">${icon("check")}Salvar na Árvore da Fé</button>
  </form>
  ${!editavel ? `<form class="form" id="f-test"><div class="campo"><label for="test2">Meu testemunho</label><textarea id="test2" maxlength="500">${esc(test.texto || "")}</textarea>
    <label class="check"><input type="checkbox" id="test-vis2" ${test.visivel ? "checked" : ""}><span>Permitir que outros membros vejam</span></label></div><button class="btn secundario pequeno">Salvar testemunho</button></form>` : ""}`;

  const $ = (s) => alvo.querySelector(s);
  const atualizarTipo = () => {
    tipo = alvo.querySelector("input[name=tipo]:checked")?.value || "membro";
    $("#c-membro").classList.toggle("oculto", tipo !== "membro");
    $("#c-externo").classList.toggle("oculto", tipo !== "externo");
    $("#c-detalhes").classList.toggle("oculto", tipo === "raiz");
  };
  alvo.querySelectorAll("input[name=tipo]").forEach((r) => r.addEventListener("change", atualizarTipo));
  atualizarTipo();
  const outroCb = alvo.querySelector('input[name=modo][value=outro]');
  const verOutro = () => $("#c-outro").classList.toggle("oculto", !outroCb?.checked);
  outroCb?.addEventListener("change", verOutro); verOutro();

  function sugestoes(inp, box, aoEscolher) {
    inp?.addEventListener("input", () => {
      const q = normalizar(inp.value);
      box.innerHTML = q.length < 2 ? "" : pessoas.filter((p) => normalizar(p.nome).includes(q)).slice(0, 6).map((p) =>
        `<button type="button" class="resultado-busca linha" data-id="${esc(p.id)}" style="padding:6px 8px">${avatar(p.nome, p.foto)}<span>${esc(p.nome)}</span></button>`).join("");
    });
    box?.addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b) { aoEscolher(b.dataset.id); box.innerHTML = ""; } });
  }
  sugestoes($("#busca-m"), $("#sug"), (id) => { ganhoPorId = id; $("#busca-m").value = nomeDe(id); });
  const chipsContrib = () => {
    $("#contrib").innerHTML = contribuiram.map((c, i) => `<span class="chip" style="cursor:default">${esc(c.nome)}<button type="button" data-rm="${i}" aria-label="Remover" style="background:none;border:0;padding:0;cursor:pointer;color:inherit">${icon("fechar")}</button></span>`).join("");
  };
  chipsContrib();
  $("#contrib")?.addEventListener("click", (e) => { const b = e.target.closest("[data-rm]"); if (b) { contribuiram.splice(+b.dataset.rm, 1); chipsContrib(); } });
  sugestoes($("#busca-c"), $("#sug-c"), (id) => { if (!contribuiram.some((c) => c.id === id) && contribuiram.length < 10) contribuiram.push({ id, nome: nomeDe(id) }); $("#busca-c").value = ""; chipsContrib(); });

  async function salvarTestemunho(texto, visivel) {
    if (texto || test.texto) await setDoc(doc(db, "testimonies", user.uid), { texto: texto.slice(0, 500), visivel, atualizadoEm: serverTimestamp() });
  }

  $("#f-lig")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $(".msg");
    const erro = (t) => (msg.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(t)}</p></div>`);
    const modos = [...alvo.querySelectorAll("input[name=modo]:checked")].map((c) => c.value);
    const dados = { dataConversao: $("#conv").value.trim(), atualizadoEm: serverTimestamp(), criadoPor: minha?.criadoPor || user.uid };
    if (tipo === "membro") {
      if (!ganhoPorId) return erro("Escolha o membro na lista de sugestões.");
      if (criaCiclo(ligacoes, user.uid, ganhoPorId)) return erro("Essa ligação criaria um ciclo na árvore (essa pessoa é sua descendente na fé).");
      Object.assign(dados, { ganhoPorId, ganhoPorNome: nomeDe(ganhoPorId), modos, modoOutro: $("#outro").value.trim(), contribuiram, status: "pendente" });
    } else if (tipo === "externo") {
      const nome = $("#ext").value.trim();
      if (!nome) return erro("Digite o nome da pessoa.");
      Object.assign(dados, { ganhoPorNomeExterno: nome, ganhoPorNome: nome, modos, modoOutro: $("#outro").value.trim(), contribuiram, status: "pendente" });
    } else {
      Object.assign(dados, { raiz: true, status: "confirmado", modos: [], contribuiram: [] });
    }
    const hist = [...(minha?.historico || []), entrada(minha ? "editado" : "criado", user.uid, { tipo, ganhoPorId: dados.ganhoPorId || null, externo: dados.ganhoPorNomeExterno || null })].slice(-100);
    dados.historico = hist;
    if (!minha) dados.criadoEm = serverTimestamp(); else if (minha.criadoEm) dados.criadoEm = minha.criadoEm;
    const b = e.target.querySelector("button[type=submit]"); b.setAttribute("aria-busy", "true");
    try {
      await setDoc(doc(db, "spiritualLinks", user.uid), dados);
      await salvarTestemunho($("#test").value.trim(), $("#test-vis").checked);
      toast(tipo === "membro" ? "Salvo! Aguardando a confirmação da pessoa indicada." : "Salvo na Árvore da Fé.");
      montarMinhaLigacao(alvo, { db, user, membro });
    } catch (err) { erro(mensagemErro(err)); }
    finally { b.removeAttribute("aria-busy"); }
  });

  $("#f-test")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try { await salvarTestemunho($("#test2").value.trim(), $("#test-vis2").checked); toast("Testemunho salvo."); } catch (err) { toast(mensagemErro(err), "erro"); }
  });

  alvo.querySelectorAll("[data-confirmar]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.confirmar;
    const l = aConfirmar.find((x) => x.id === id);
    try {
      await updateDoc(doc(db, "spiritualLinks", id), {
        status: "confirmado", confirmadoPor: user.uid, confirmadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
        historico: [...(l.historico || []), entrada("confirmado", user.uid)].slice(-100)
      });
      toast("Confirmado! Que alegria 🙌");
      montarMinhaLigacao(alvo, { db, user, membro });
    } catch (err) { toast(mensagemErro(err), "erro"); }
  }));
}

export { deleteDoc };
