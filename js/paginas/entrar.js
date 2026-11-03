// Tela "Entrar": Google, link mágico por e-mail (sem senha) e e-mail/senha.
import { auth, authPronto, SITE } from "../core/firebase.js";
import {
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  sendEmailVerification, updateProfile, linkWithCredential
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { garantirMembro } from "../core/sessao.js";
import { $, $$, esc, rota, mensagemErro } from "../core/ui.js";
import { icon, hidratarIcones } from "../core/icons.js";

const CHAVE_EMAIL = "idpb_emailParaLogin";
const msg = $("#msg");
const mostrar = (texto, tipo = "") => {
  msg.innerHTML = `<div class="alerta ${tipo} aparecer">${icon(tipo === "erro" ? "alerta" : tipo === "ok" ? "check" : "info")}<p>${texto}</p></div>`;
  msg.scrollIntoView({ behavior: "smooth", block: "nearest" });
};
const consent = $("#consentimento");
try { consent.checked = localStorage.getItem("idpb_consentiu") === "1"; } catch {}
consent.addEventListener("change", () => { try { localStorage.setItem("idpb_consentiu", consent.checked ? "1" : "0"); } catch {} });
function exigirConsentimento() {
  if (consent.checked) return true;
  mostrar("Para continuar, marque que você leu e aceita a política de privacidade.", "erro");
  consent.focus();
  return false;
}
const ocupado = (btn, sim) => sim ? btn.setAttribute("aria-busy", "true") : btn.removeAttribute("aria-busy");

/** Credencial pendente para vincular (mesmo e-mail com outro método). */
let credPendente = null;

async function aposEntrar(user, nome) {
  if (credPendente) {
    try { await linkWithCredential(user, credPendente); } catch (e) { console.warn("Vinculação:", e.code); }
    credPendente = null;
  }
  try { localStorage.setItem("idpb_logado", "1"); } catch {}
  mostrar("Entrando…", "ok");
  try { await garantirMembro(user, { nome }); } catch (e) { console.warn(e); }
  const volta = sessionStorage.getItem("voltarPara");
  sessionStorage.removeItem("voltarPara");
  location.replace(volta && volta.startsWith(location.origin) ? volta : rota("membro/index.html"));
}

function tratarErro(e) {
  if (e?.code === "auth/account-exists-with-different-credential") {
    credPendente = GoogleAuthProvider.credentialFromError(e);
    const email = e.customData?.email || "";
    mostrar(`Já existe uma conta com <b>${esc(email)}</b> usando outro método. Entre abaixo com o <b>link por e-mail</b> ou com <b>e-mail e senha</b>: o Google será vinculado à mesma conta automaticamente.`);
    $("#email-link").value = email; $("#det-link").open = true;
    return;
  }
  mostrar(esc(mensagemErro(e)), "erro");
}

/* ---------- 1. Google ---------- */
$("#btn-google").addEventListener("click", async (ev) => {
  if (!exigirConsentimento()) return;
  const b = ev.currentTarget; ocupado(b, true);
  const prov = new GoogleAuthProvider();
  prov.setCustomParameters({ prompt: "select_account" });
  try {
    const r = await signInWithPopup(auth, prov);
    await aposEntrar(r.user);
  } catch (e) {
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, prov);
    } else tratarErro(e);
  } finally { ocupado(b, false); }
});

/* ---------- 2. Link mágico ---------- */
$("#form-link").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!exigirConsentimento()) return;
  const email = $("#email-link").value.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) { mostrar("Digite um e-mail válido.", "erro"); $("#email-link").focus(); return; }
  const b = $("button", e.target); ocupado(b, true);
  try {
    await sendSignInLinkToEmail(auth, email, { url: SITE.baseUrl() + "entrar.html", handleCodeInApp: true });
    localStorage.setItem(CHAVE_EMAIL, email);
    mostrar(`<b>Enviamos um link para seu e-mail.</b> Abra-o neste celular para entrar. Verifique também a caixa de spam.<br><small>Enviado para ${esc(email)}</small>`, "ok");
  } catch (err) { tratarErro(err); }
  finally { ocupado(b, false); }
});

async function concluirLink(email) {
  const r = await signInWithEmailLink(auth, email, location.href);
  localStorage.removeItem(CHAVE_EMAIL);
  history.replaceState(null, "", rota("entrar.html"));
  await aposEntrar(r.user);
}

/* ---------- 3. E-mail e senha ---------- */
let modo = "entrar";
$$("[data-modo]").forEach((b) => b.addEventListener("click", () => {
  modo = b.dataset.modo;
  $$("[data-modo]").forEach((x) => x.setAttribute("aria-pressed", x === b));
  $("#c-nome").classList.toggle("oculto", modo !== "criar");
  $("#c-senha").classList.toggle("oculto", modo === "esqueci");
  $("#senha").autocomplete = modo === "criar" ? "new-password" : "current-password";
  $("#btn-senha").textContent = { entrar: "Entrar", criar: "Criar minha conta", esqueci: "Enviar e-mail para redefinir a senha" }[modo];
}));

$("#form-senha").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#email-senha").value.trim().toLowerCase(), senha = $("#senha").value, nome = $("#nome").value.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) { mostrar("Digite um e-mail válido.", "erro"); return; }
  const b = $("#btn-senha"); ocupado(b, true);
  try {
    if (modo === "esqueci") {
      await sendPasswordResetEmail(auth, email, { url: SITE.baseUrl() + "entrar.html" });
      mostrar("Se houver uma conta com esse e-mail, enviamos as instruções para redefinir a senha. Verifique também o spam.", "ok");
    } else if (modo === "criar") {
      if (!exigirConsentimento()) return;
      if (!nome) { mostrar("Digite seu nome.", "erro"); $("#nome").focus(); return; }
      const r = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(r.user, { displayName: nome });
      try { await sendEmailVerification(r.user, { url: SITE.baseUrl() + "entrar.html" }); } catch {}
      await aposEntrar(r.user, nome);
    } else {
      if (!exigirConsentimento()) return;
      const r = await signInWithEmailAndPassword(auth, email, senha);
      await aposEntrar(r.user);
    }
  } catch (err) { tratarErro(err); }
  finally { ocupado(b, false); }
});

/* ---------- Ao abrir a página ---------- */
(async () => {
  if (new URLSearchParams(location.search).has("saiu")) mostrar("Você saiu da sua conta. Suas anotações continuam salvas na nuvem.", "ok");
  try { const r = await getRedirectResult(auth); if (r?.user) return aposEntrar(r.user); } catch (e) { tratarErro(e); }

  if (isSignInWithEmailLink(auth, location.href)) {
    const email = localStorage.getItem(CHAVE_EMAIL);
    if (email) {
      try { await concluirLink(email); } catch (e) { tratarErro(e); }
    } else {
      $("#metodos").classList.add("oculto");
      $("#confirmar-email").classList.remove("oculto");
      $("#confirmar-email").addEventListener("submit", async (ev) => {
        ev.preventDefault();
        try { await concluirLink($("#email-confirma").value.trim().toLowerCase()); }
        catch (e) { tratarErro(e); }
      });
    }
    return;
  }
  const u = await authPronto;
  if (u) {
    msg.innerHTML = `<div class="alerta ok">${icon("check")}<div><p>Você já está conectado como <b>${esc(u.email || "")}</b>.</p>
      <div class="linha" style="margin-top:8px"><a class="btn pequeno" href="${rota("membro/index.html")}">Ir para minha área</a>
      <button class="btn fantasma pequeno" id="trocar">${icon("sair")}Sair</button></div></div></div>`;
    $("#trocar").onclick = async () => (await import("../core/sessao.js")).sairComSeguranca();
  }
})();
hidratarIcones();
