// Sessão do membro: carrega o perfil (members/{uid}), protege páginas e faz o "Sair" seguro.
import { auth, authPronto, getDb, SITE } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp, terminate, clearIndexedDbPersistence, waitForPendingWrites
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { rota, esc, toast, confirmar } from "./ui.js";
import { icon } from "./icons.js";

export const PAPEIS = ["membro", "lider", "tesoureiro", "admin"];
export const temPapel = (m, p) => !!m && Array.isArray(m.papeis) && (m.papeis.includes(p) || m.papeis.includes("admin"));
export const ehAdmin = (m) => !!m && Array.isArray(m.papeis) && m.papeis.includes("admin");

/** Cria o documento do membro no primeiro acesso (sempre como "pendente"). */
export async function garantirMembro(user, extra = {}) {
  const db = await getDb();
  const ref = doc(db, "members", user.uid);
  const s = await getDoc(ref);
  if (s.exists()) return { id: user.uid, ...s.data() };
  const novo = {
    nome: extra.nome || user.displayName || "",
    email: (user.email || "").toLowerCase(),
    status: "pendente",
    papeis: [],
    perfilCompleto: false,
    consentimentoEm: serverTimestamp(),
    criadoEm: serverTimestamp()
  };
  await setDoc(ref, novo);
  return { id: user.uid, ...novo };
}

let _membro = null;
/** Membro logado atual (ou null). */
export const membroAtual = () => _membro;

/**
 * Protege uma página da área do membro.
 * - sem login: vai para entrar.html
 * - pendente/recusado: mostra a mensagem e para
 * - aprovado sem perfil completo: vai para perfil (completar)
 * - `papel`: exige papel (lider/tesoureiro/admin)
 * @returns {Promise<{user, membro, db}>}
 */
export async function exigirMembro({ papel = null, permitirPerfilIncompleto = false } = {}) {
  const user = await authPronto;
  if (!user) {
    sessionStorage.setItem("voltarPara", location.href);
    location.replace(rota("entrar.html"));
    return new Promise(() => {});
  }
  try { localStorage.setItem("idpb_logado", "1"); } catch {}
  const db = await getDb();
  let membro;
  try { membro = await garantirMembro(user); }
  catch (e) {
    // Sem internet e sem cache: tenta seguir com o mínimo para não travar as anotações offline.
    membro = JSON.parse(localStorage.getItem("idpb_membro_" + user.uid) || "null");
    if (!membro) { telaBloqueio("Sem conexão", "Não foi possível carregar seus dados. Verifique a internet e tente de novo."); return new Promise(() => {}); }
  }
  _membro = membro;
  try { localStorage.setItem("idpb_membro_" + user.uid, JSON.stringify({ id: membro.id, nome: membro.nome, status: membro.status, papeis: membro.papeis, perfilCompleto: membro.perfilCompleto })); } catch {}

  if (membro.status !== "aprovado") {
    const recusado = membro.status === "recusado";
    telaBloqueio(
      recusado ? "Cadastro não aprovado" : "Cadastro em análise",
      recusado
        ? "Seu cadastro não foi aprovado. Se acha que foi engano, fale com a liderança da igreja."
        : "Seu cadastro foi recebido e aguarda aprovação da liderança."
    );
    return new Promise(() => {});
  }
  if (!permitirPerfilIncompleto && !membro.perfilCompleto) {
    location.replace(rota("membro/perfil.html?completar=1"));
    return new Promise(() => {});
  }
  if (papel && !temPapel(membro, papel)) {
    telaBloqueio("Acesso restrito", "Esta área é só para a liderança autorizada.");
    return new Promise(() => {});
  }
  document.documentElement.classList.add("logado");
  return { user, membro, db };
}

function telaBloqueio(titulo, texto) {
  const main = document.getElementById("conteudo") || document.body;
  main.innerHTML = `<section class="secao"><div class="container estreito" style="text-align:center">
    <div class="icone-card verde" style="margin:0 auto 16px;width:64px;height:64px;border-radius:18px;display:grid;place-items:center;background:var(--bg-suave)">${icon("relogio")}</div>
    <h1 style="font-size:1.8rem">${esc(titulo)}</h1><p class="muted">${esc(texto)}</p>
    <p class="pequeno">Conta: ${esc(auth.currentUser?.email || "")}</p>
    <div class="linha" style="justify-content:center"><a class="btn secundario" href="${rota("index.html")}">Ir para o site</a>
    <button class="btn fantasma" id="bloq-sair">${icon("sair")}Sair</button></div></div></section>`;
  document.getElementById("bloq-sair").onclick = () => sairComSeguranca();
}

/* ---------- Sair com segurança ----------
   1) envia tudo que estiver pendente (anotações) — se não der, avisa e NÃO sai;
   2) desliga o Firestore e apaga o cache offline do aparelho (inclui textos bíblicos);
   3) os rascunhos locais NÃO enviados continuam guardados (só são apagados após confirmação na nuvem). */
const _antesDeSair = new Set();
/** Módulos registram aqui funções async que retornam o nº de itens ainda pendentes. */
export const registrarAntesDeSair = (fn) => _antesDeSair.add(fn);

export async function sairComSeguranca({ forcar = false } = {}) {
  let pendentes = 0;
  for (const fn of _antesDeSair) { try { pendentes += (await fn()) || 0; } catch { pendentes++; } }
  try {
    const { contarPendentes } = await import("../biblia/notas-store.js");
    pendentes = Math.max(pendentes, await contarPendentes(auth.currentUser?.uid));
  } catch {}
  let db = null;
  try { db = await getDb(); } catch {}
  if (pendentes === 0 && db && navigator.onLine) {
    try { await Promise.race([waitForPendingWrites(db), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 8000))]); }
    catch { pendentes = Math.max(pendentes, 1); }
  }
  if (pendentes > 0 && !forcar) {
    const sair = await confirmar("Há anotações ainda não enviadas. Conecte-se à internet antes de sair. (Se sair mesmo assim, elas continuam guardadas neste aparelho e serão enviadas quando você entrar de novo.)", { ok: "Sair mesmo assim", perigo: true, titulo: "Anotações pendentes" });
    if (!sair) return false;
  }
  try { await signOut(auth); } catch {}
  try { localStorage.removeItem("idpb_logado"); } catch {}
  try { sessionStorage.clear(); } catch {}
  try { if (db) { await terminate(db); await clearIndexedDbPersistence(db); } } catch (e) { console.warn("Cache não pôde ser limpo agora:", e); try { localStorage.setItem("idpb_limpar_cache", "1"); } catch {} }
  try { const cs = await caches.keys(); await Promise.all(cs.filter((c) => c.includes("biblia")).map((c) => caches.delete(c))); } catch {}
  location.replace(rota("entrar.html?saiu=1"));
  return true;
}
