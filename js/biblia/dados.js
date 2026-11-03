// Acesso aos textos bíblicos e aos dados pessoais de leitura.
// Estrutura no Firestore:
//   bible/{versao}                              { nome, sigla }
//   bible/{versao}/meta/progresso               { livros: { gn: {capitulos, versiculos, importadoEm} }, total }
//   bible/{versao}/books/{livro}                { nome, capitulos: { "1": [...], ... } }  (livro inteiro: busca/offline)
//   bible/{versao}/books/{livro}/chapters/{n}   { versiculos: ["texto v1", "texto v2", ...] }
import {
  doc, getDoc, getDocFromCache, setDoc, collection, query, where, getDocs, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { chaveVers } from "./referencias.js";
import { lerDoc } from "../core/firebase.js";

export const VERSOES = self.SITE_CONFIG.BIBLIAS;

const _meta = {};
export async function progresso(db, versao) {
  if (_meta[versao]) return _meta[versao];
  try {
    const s = await lerDoc(doc(db, "bible", versao, "meta", "progresso"));
    _meta[versao] = s.exists() ? s.data() : { livros: {} };
  } catch { _meta[versao] = { livros: {} }; }
  return _meta[versao];
}
export async function livroDisponivel(db, versao, livro) {
  const p = await progresso(db, versao);
  return !!p.livros?.[livro];
}

const _caps = new Map();
/** Versículos de um capítulo (array; índice 0 = versículo 1) ou null se não importado. */
export async function capitulo(db, versao, livro, cap) {
  const k = `${versao}/${livro}/${cap}`;
  if (_caps.has(k)) return _caps.get(k);
  let vs = null;
  try {
    const s = await lerDoc(doc(db, "bible", versao, "books", livro, "chapters", String(cap)));
    if (s.exists()) vs = s.data().versiculos || null;
  } catch (e) {
    // Sem internet: tenta o livro inteiro já baixado no aparelho.
    try { const b = await getDocFromCache(doc(db, "bible", versao, "books", livro)); vs = b.data()?.capitulos?.[cap] || null; } catch {}
    if (!vs) throw e;
  }
  if (vs) _caps.set(k, vs);
  return vs;
}

/** Livro inteiro (para busca por palavra e leitura offline). */
export async function livroInteiro(db, versao, livro) {
  const s = await getDoc(doc(db, "bible", versao, "books", livro));
  return s.exists() ? s.data() : null;
}

/* ---------- Destaques e favoritos: users/{uid}/highlights/{livro.cap.v} ---------- */
export async function destaquesDoCapitulo(db, uid, livro, cap) {
  const s = await getDocs(query(collection(db, "users", uid, "highlights"), where("livro", "==", livro), where("cap", "==", cap)));
  const m = {};
  s.docs.forEach((d) => (m[d.data().v] = d.data()));
  return m;
}
export async function salvarDestaque(db, uid, livro, cap, v, { cor, favorito }) {
  const id = chaveVers(livro, cap, v);
  const ref = doc(db, "users", uid, "highlights", id);
  if (!cor && !favorito) return deleteDoc(ref);
  return setDoc(ref, { livro, cap, v, cor: cor || null, favorito: !!favorito, atualizadoEm: Date.now() });
}
export async function favoritos(db, uid) {
  const s = await getDocs(query(collection(db, "users", uid, "highlights"), where("favorito", "==", true)));
  return s.docs.map((d) => d.data());
}

/* ---------- Último ponto de leitura: users/{uid}/readingProgress/atual ---------- */
const LS = "idpb_leitura";
export async function ultimoPonto(db, uid) {
  let local = null;
  try { local = JSON.parse(localStorage.getItem(LS + "_" + uid) || "null"); } catch {}
  try {
    const s = await lerDoc(doc(db, "users", uid, "readingProgress", "atual"));
    const r = s.exists() ? s.data() : null;
    if (r && (!local || (r.em || 0) >= (local.em || 0))) return r;
  } catch {}
  return local;
}
export function guardarPonto(db, uid, ponto) {
  const p = { ...ponto, em: Date.now() };
  try { localStorage.setItem(LS + "_" + uid, JSON.stringify(p)); } catch {}
  return setDoc(doc(db, "users", uid, "readingProgress", "atual"), p).catch(() => {});
}
