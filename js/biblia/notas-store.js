/* =====================================================================
   ARMAZENAMENTO DAS ANOTAÇÕES — "AS ANOTAÇÕES NUNCA PODEM SE PERDER"
   ---------------------------------------------------------------------
   Dupla proteção:
   (a) cópia local IMEDIATA no IndexedDB ("idpb-notas") a cada alteração;
   (b) gravação no Firestore (users/{uid}/notes/{id}) com cache offline,
       que sincroniza sozinho quando a internet volta.

   Controle de concorrência (entre aparelhos):
   - cada gravação leva `baseMs` = versão do servidor em que a edição se baseou;
   - as REGRAS do Firestore só aceitam a atualização se baseMs == atualizadoEm atual;
   - se outro aparelho gravou antes, o servidor recusa -> resolvemos o conflito:
     a versão mais recente fica como principal e a outra vai para
     notes/{id}/versoes (versão anterior). Nada é apagado.

   O rascunho local só sai do IndexedDB depois que o servidor confirma.
   ===================================================================== */
import {
  doc, setDoc, collection, runTransaction, getDocFromServer, getDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const NOME_IDB = "idpb-notas";
const STORE = "pendentes";
const ESPERA_MS = 1000;   // debounce do salvamento automático
const LIXEIRA_DIAS = 30;

/* ---------- IndexedDB mínimo ---------- */
let _idb = null;
function idb() {
  if (_idb) return _idb;
  _idb = new Promise((ok, erro) => {
    const r = indexedDB.open(NOME_IDB, 1);
    r.onupgradeneeded = () => { const s = r.result.createObjectStore(STORE, { keyPath: "chave" }); s.createIndex("uid", "uid"); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
  return _idb;
}
async function tx(modo, fn) {
  const db = await idb();
  return new Promise((ok, erro) => {
    const t = db.transaction(STORE, modo);
    const s = t.objectStore(STORE);
    let res;
    Promise.resolve(fn(s)).then((r) => (res = r));
    t.oncomplete = () => ok(res);
    t.onerror = () => erro(t.error);
    t.onabort = () => erro(t.error);
  });
}
const req = (r) => new Promise((ok, erro) => { r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
const idbPut = (rec) => tx("readwrite", (s) => s.put(rec));
const idbGet = (chave) => tx("readonly", (s) => req(s.get(chave)));
const idbDel = (chave) => tx("readwrite", (s) => s.delete(chave));
const idbDoUsuario = (uid) => tx("readonly", (s) => req(s.index("uid").getAll(uid)));

export async function contarPendentes(uid) {
  if (!uid) return 0;
  try { return (await idbDoUsuario(uid)).length; } catch { return 0; }
}

/* ---------- Identificação do aparelho ---------- */
export function deviceId() {
  try {
    let d = localStorage.getItem("idpb_device");
    if (!d) { d = "dev-" + Math.random().toString(36).slice(2, 10); localStorage.setItem("idpb_device", d); }
    return d;
  } catch { return "dev-anon"; }
}

export function novoId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

/** Campos que vão para o Firestore (o resto é estado local). */
function paraServidor(n) {
  const o = {};
  for (const k of ["id", "tipo", "titulo", "texto", "referencias", "refsTexto", "capitulos", "versiculos", "livros", "versao", "data", "culto", "criadoEm", "atualizadoEm", "excluidoEm"]) {
    if (n[k] !== undefined) o[k] = n[k];
  }
  o.excluidoEm = n.excluidoEm ?? null;
  return o;
}

/**
 * Cria o gerenciador de anotações do usuário.
 * @param {Firestore} db
 * @param {string} uid
 * @param {(estado:'salvando'|'salvo'|'local'|'erro', info?:any)=>void} aoMudarEstado
 */
export function criarStore(db, uid, aoMudarEstado = () => {}) {
  const dev = deviceId();
  const timers = new Map();      // id -> timeout do debounce
  const enviando = new Map();    // id -> promessas em andamento
  const enfileirado = new Map(); // id -> atualizadoEm da última gravação enviada (encadeia gravações offline)
  const ouvintesConflito = new Set();
  const ouvintesEstado = new Set([aoMudarEstado]);
  let estadoAtual = "salvo";

  const ref = (id) => doc(db, "users", uid, "notes", id);
  const chave = (id) => `${uid}|${id}`;

  function estado(e, info) { estadoAtual = e; ouvintesEstado.forEach((f) => { try { f(e, info); } catch {} }); }

  /** 1) Grava IMEDIATAMENTE no aparelho e agenda o envio (debounce ~1 s). */
  async function alterar(nota) {
    const agora = Date.now();
    nota.atualizadoEm = Math.max(agora, (nota.atualizadoEm || 0) + 1);
    nota.criadoEm = nota.criadoEm || agora;
    const anterior = await idbGet(chave(nota.id)).catch(() => null);
    // baseMs = versão do servidor em que esta edição se baseia (usada ao reabrir o app)
    const baseMs = enfileirado.has(nota.id) ? enfileirado.get(nota.id)
      : anterior ? (anterior.baseMs ?? null) : (nota._baseMs ?? null);
    await idbPut({ chave: chave(nota.id), uid, id: nota.id, nota: paraServidor(nota), baseMs, localMs: nota.atualizadoEm, dev });
    estado("salvando");
    clearTimeout(timers.get(nota.id));
    timers.set(nota.id, setTimeout(() => { timers.delete(nota.id); enviar(nota.id); }, ESPERA_MS));
  }

  /** 2) Envia uma anotação pendente para o Firestore.
      Gravações seguidas (mesmo sem internet) são encadeadas: cada uma se baseia na anterior. */
  async function enviar(id) {
    const rec = await idbGet(chave(id));
    if (!rec) return;
    if (enfileirado.get(id) === rec.localMs) return; // esta versão já está na fila
    const base = enfileirado.has(id) ? enfileirado.get(id) : (rec.baseMs ?? null);
    enfileirado.set(id, rec.localMs);
    const dadosEnvio = { ...rec.nota, baseMs: base, deviceId: dev };
    if (!navigator.onLine) estado("local");
    const avisoLocal = setTimeout(() => { if (enviando.size) estado("local"); }, 2500);
    const p = (async () => {
      try {
        // Com o cache offline, esta promessa só termina quando o SERVIDOR confirma.
        await setDoc(ref(id), dadosEnvio);
        await confirmar(rec);
      } catch (e) {
        if (e?.code === "permission-denied" || e?.code === "failed-precondition" || e?.code === "aborted") {
          enfileirado.delete(id);
          await resolverConflito(id);       // outro aparelho gravou antes
        } else {
          enfileirado.delete(id);
          estado(navigator.onLine ? "erro" : "local", e);
          throw e;
        }
      } finally { clearTimeout(avisoLocal); }
    })();
    const k = id + "@" + rec.localMs;
    enviando.set(k, p);
    try { await p; } finally { enviando.delete(k); }
    if (!timers.size && !enviando.size) {
      const restantes = await contarPendentes(uid);
      estado(restantes ? (navigator.onLine ? "salvando" : "local") : "salvo");
    }
  }

  /** Remove o rascunho local SOMENTE se nada mudou desde o envio. A próxima base passa a ser esta versão. */
  async function confirmar(recEnviado) {
    const atual = await idbGet(recEnviado.chave);
    if (!atual) return;
    if (atual.localMs === recEnviado.localMs) await idbDel(recEnviado.chave);
    else await idbPut({ ...atual, baseMs: recEnviado.localMs }); // há edição mais nova: base = o que acabou de subir
  }

  /** 3) Conflito: mantém a mais recente; a outra vira "versão anterior". */
  async function resolverConflito(id) {
    const rec = await idbGet(chave(id));
    if (!rec) return;
    const vRef = doc(collection(db, "users", uid, "notes", id, "versoes"));
    const resultado = await runTransaction(db, async (t) => {
      const s = await t.get(ref(id));
      const servidor = s.exists() ? s.data() : null;
      const local = { ...rec.nota, deviceId: dev };
      if (!servidor) { t.set(ref(id), { ...local, baseMs: null }); return { venceu: "local" }; }
      if ((servidor.atualizadoEm || 0) > (local.atualizadoEm || 0)) {
        t.set(vRef, { ...local, guardadaEm: Date.now(), motivo: "conflito", de: dev });
        return { venceu: "servidor", servidor };
      }
      // Guarda a versão do outro aparelho como "versão anterior" (a nossa própria versão antiga não precisa).
      if (servidor.deviceId !== dev) t.set(vRef, { ...servidor, guardadaEm: Date.now(), motivo: "conflito", de: servidor.deviceId || "" });
      t.set(ref(id), { ...local, baseMs: servidor.atualizadoEm ?? null });
      return { venceu: "local" };
    });
    const novaBase = resultado.venceu === "local" ? rec.localMs : resultado.servidor.atualizadoEm;
    const atual = await idbGet(chave(id));
    if (atual && atual.localMs === rec.localMs) await idbDel(chave(id));
    else if (atual) await idbPut({ ...atual, baseMs: novaBase });
    enfileirado.set(id, novaBase);
    if (atual && atual.localMs !== rec.localMs) { enfileirado.delete(id); enviar(id).catch(() => {}); }
    ouvintesConflito.forEach((f) => f({ id, ...resultado }));
  }

  /** Envia tudo imediatamente (troca de tela, aba oculta, fechar, Sair). */
  async function enviarTudo() {
    for (const [id, t] of timers) { clearTimeout(t); timers.delete(id); }
    const recs = await idbDoUsuario(uid).catch(() => []);
    await Promise.allSettled(recs.map((r) => enviar(r.id)));
    return contarPendentes(uid);
  }

  /** Ao abrir: recupera rascunhos locais ainda não enviados e sincroniza. */
  async function recuperar() {
    const recs = await idbDoUsuario(uid).catch(() => []);
    if (recs.length) estado(navigator.onLine ? "salvando" : "local");
    for (const r of recs) enviar(r.id).catch(() => {});
    return recs.map((r) => r.nota);
  }

  /** Versão mais atual de uma nota: rascunho local (se houver) tem prioridade sobre o servidor. */
  async function abrir(id) {
    const rec = await idbGet(chave(id)).catch(() => null);
    let servidor = null;
    try { const s = await getDoc(ref(id)); servidor = s.exists() ? s.data() : null; } catch {}
    if (rec) return { ...rec.nota, _local: true };
    return servidor;
  }

  /** Rascunhos locais pendentes (para mesclar em listas). */
  async function rascunhos() { return (await idbDoUsuario(uid).catch(() => [])).map((r) => r.nota); }

  /** Lixeira: marca excluidoEm (some da lista; apagada de vez após 30 dias). */
  async function excluir(nota) { await alterar({ ...nota, excluidoEm: Date.now() }); }
  async function restaurar(nota) { await alterar({ ...nota, excluidoEm: null }); }
  async function apagarDeVez(id) { await idbDel(chave(id)).catch(() => {}); await deleteDoc(ref(id)); }
  async function limparLixeira(notas) {
    const limite = Date.now() - LIXEIRA_DIAS * 864e5;
    for (const n of notas) if (n.excluidoEm && n.excluidoEm < limite) await apagarDeVez(n.id).catch(() => {});
  }

  // Salvar também nestes eventos (o IndexedDB já tem a cópia; aqui forçamos o envio).
  const flush = () => { enviarTudo().catch(() => {}); };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  addEventListener("pagehide", flush);
  addEventListener("beforeunload", flush);
  addEventListener("online", () => recuperar());

  return {
    alterar, enviar, enviarTudo, recuperar, abrir, rascunhos, excluir, restaurar, apagarDeVez, limparLixeira,
    aoConflito: (f) => ouvintesConflito.add(f),
    aoEstado: (f) => { ouvintesEstado.add(f); f(estadoAtual); return () => ouvintesEstado.delete(f); },
    uid,
    get estado() { return estadoAtual; },
    pendentes: () => contarPendentes(uid)
  };
}

/** Texto do indicador de salvamento. */
export const TEXTO_ESTADO = {
  salvando: "Salvando…",
  salvo: "Salvo",
  local: "Salvo no aparelho, será enviado quando houver internet",
  erro: "Erro ao enviar — guardado no aparelho"
};
