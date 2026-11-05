// Fluxo ÚNICO de formulário para: visita, células/grupos, voluntariado e batismo.
// Todos gravam em visitorForms com o mesmo formato (o painel admin lê tudo num lugar só).
import { esc, $, toast, mensagemErro, rota } from "./ui.js";
import { icon, hidratarIcones } from "./icons.js";

export const FORMULARIOS = {
  visita: {
    titulo: "Avise que você vem",
    sub: "Vamos te esperar na porta e guardar um lugar para você.",
    ok: "Que alegria! Recebemos seu aviso e vamos te esperar.",
    campos: [
      { id: "dataPrevista", rotulo: "Quando pretende vir?", tipo: "date" },
      { id: "acompanhantes", rotulo: "Quantas pessoas vêm com você?", tipo: "number", min: 0, max: 20 },
      { id: "criancas", rotulo: "Vai levar crianças?", tipo: "chips", opcoes: ["Sim", "Não"] }
    ]
  },
  grupo: {
    titulo: "Quero participar de uma célula",
    sub: "Células são encontros na semana, em casas, para conversar, orar e fazer amigos.",
    ok: "Recebemos! Um líder de célula vai falar com você em breve.",
    campos: [
      { id: "bairro", rotulo: "Bairro onde você mora", tipo: "text" },
      { id: "melhorDia", rotulo: "Melhores dias", tipo: "chips", multi: true, opcoes: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] }
    ]
  },
  voluntariado: {
    titulo: "Quero servir como voluntário",
    sub: "Escolha onde você gostaria de ajudar. Não precisa ter experiência.",
    ok: "Obrigado por se dispor a servir! A liderança do ministério vai entrar em contato.",
    campos: [
      { id: "areas", rotulo: "Onde você gostaria de servir?", tipo: "chips", multi: true, opcoes: ["Louvor", "Recepção", "Mídia", "Infantil", "Intercessão", "Apoio / limpeza", "Eventos"] }
    ]
  },
  batismo: {
    titulo: "Quero me batizar",
    sub: "O batismo nas águas é um passo de obediência e uma declaração pública de fé.",
    ok: "Que decisão linda! Vamos te chamar para a próxima turma de preparação.",
    campos: [
      { id: "nascimento", rotulo: "Data de nascimento", tipo: "date" },
      { id: "aceitou", rotulo: "Você já aceitou Jesus como Salvador?", tipo: "chips", opcoes: ["Sim", "Ainda não, quero conversar"] }
    ]
  }
};

function campoHtml(c) {
  const id = "f-" + c.id;
  if (c.tipo === "chips") {
    return `<fieldset><legend>${esc(c.rotulo)}</legend><div class="opcoes-chip">${c.opcoes.map((o, i) =>
      `<label class="chip"><input type="${c.multi ? "checkbox" : "radio"}" name="${c.id}" value="${esc(o)}">${esc(o)}</label>`).join("")}</div></fieldset>`;
  }
  return `<div class="campo"><label for="${id}">${esc(c.rotulo)}</label>
    <input id="${id}" name="${c.id}" type="${c.tipo}" ${c.min != null ? `min="${c.min}"` : ""} ${c.max != null ? `max="${c.max}"` : ""}></div>`;
}

/** Renderiza o formulário `tipo` dentro de `alvo`. */
export function montarFormulario(alvo, tipo) {
  const f = FORMULARIOS[tipo];
  alvo.innerHTML = `
  <form class="form aparecer" novalidate>
    <div><h2>${esc(f.titulo)}</h2><p class="muted">${esc(f.sub)}</p></div>
    <div class="campo"><label for="f-nome">Seu nome *</label><input id="f-nome" name="nome" type="text" autocomplete="name" required maxlength="100"></div>
    <div class="campo"><label for="f-celular">Celular / WhatsApp *</label><input id="f-celular" name="celular" type="tel" autocomplete="tel" inputmode="tel" required maxlength="30" placeholder="(92) 9 0000-0000"></div>
    <div class="campo"><label for="f-email">E-mail <span class="muted">(opcional)</span></label><input id="f-email" name="email" type="email" autocomplete="email" maxlength="120"></div>
    ${f.campos.map(campoHtml).join("")}
    <div class="campo"><label for="f-msg">Quer contar algo? <span class="muted">(opcional)</span></label><textarea id="f-msg" name="mensagem" maxlength="2000"></textarea></div>
    <label class="check"><input type="checkbox" name="consentimento" required><span>Autorizo a igreja a usar estes dados para entrar em contato comigo, conforme a <a class="link-sutil" href="${rota("privacidade.html")}">política de privacidade</a>.</span></label>
    <p class="aviso-recaptcha pequeno muted">Protegido pelo reCAPTCHA: valem a <a href="https://policies.google.com/privacy?hl=pt-BR" target="_blank" rel="noopener">Política de Privacidade</a> e os <a href="https://policies.google.com/terms?hl=pt-BR" target="_blank" rel="noopener">Termos de Serviço</a> do Google.</p>
    <div class="msg" role="alert" aria-live="assertive"></div>
    <button class="btn bloco" type="submit">${icon("seta")}Enviar</button>
  </form>`;
  const form = $("form", alvo);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const msg = $(".msg", form);
    const nome = String(fd.get("nome") || "").trim(), celular = String(fd.get("celular") || "").trim();
    if (!nome || !celular) { msg.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>Preencha nome e celular.</p></div>`; (nome ? $("#f-celular", form) : $("#f-nome", form)).focus(); return; }
    if (!fd.get("consentimento")) { msg.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>Marque a autorização para podermos falar com você.</p></div>`; return; }
    const extras = {};
    for (const c of f.campos) {
      const v = c.multi ? fd.getAll(c.id) : fd.get(c.id);
      if (v != null && v !== "" && !(Array.isArray(v) && !v.length)) extras[c.id] = c.multi ? v.map(String) : String(v);
    }
    const btn = $("button[type=submit]", form); btn.setAttribute("aria-busy", "true");
    try {
      await enviarFormulario({ tipo, nome, celular, email: String(fd.get("email") || "").trim(), mensagem: String(fd.get("mensagem") || "").trim(), extras });
      alvo.innerHTML = `<div class="alerta ok aparecer">${icon("check")}<div><h3>${esc(f.ok)}</h3><p>Se quiser, fale com a gente também pelo WhatsApp.</p></div></div>`;
      hidratarIcones(alvo);
    } catch (err) {
      msg.innerHTML = `<div class="alerta erro">${icon("alerta")}<p>${esc(mensagemErro(err))}</p></div>`;
    } finally { btn.removeAttribute("aria-busy"); }
  });
}

export async function enviarFormulario({ tipo, nome, celular, email, mensagem, extras }) {
  const { getDb, auth } = await import("./firebase.js");
  const { addDoc, collection, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");
  const dados = { tipo, nome, celular, email, mensagem, extras, consentimento: true, status: "novo", criadoEm: serverTimestamp() };
  if (auth.currentUser) dados.uid = auth.currentUser.uid;
  await addDoc(collection(await getDb(), "visitorForms"), dados);
}

/** Pedido de oração (coleção própria). Anônimo => nenhum identificador do autor é gravado. */
export async function enviarPedidoOracao({ pedido, nome, contato, anonimo, publico }) {
  const { getDb, auth } = await import("./firebase.js");
  const { addDoc, collection, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");
  const d = { pedido, anonimo: !!anonimo, intercessores: !!publico, status: "novo", criadoEm: serverTimestamp() };
  if (!anonimo) {
    if (nome) d.nome = nome;
    if (contato) d.contato = contato;
    if (auth.currentUser) d.uid = auth.currentUser.uid;
  }
  await addDoc(collection(await getDb(), "prayerRequests"), d);
}
