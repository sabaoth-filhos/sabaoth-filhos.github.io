// Consultas compartilhadas da área do membro.
import {
  collection, query, where, getDocs, doc, getDoc, setDoc, orderBy, limit, arrayUnion
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export const FS = "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export async function meusGrupos(db, uid) {
  const s = await getDocs(query(collection(db, "groups"), where("membros", "array-contains", uid)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function meusMinisterios(db, uid) {
  const s = await getDocs(query(collection(db, "ministries"), where("membros", "array-contains", uid)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function perfisPublicos(db, ids) {
  const r = await Promise.all([...new Set(ids)].map(async (id) => {
    try { const s = await getDoc(doc(db, "directory", id)); return s.exists() ? { id, ...s.data() } : { id, nome: "Membro" }; }
    catch { return { id, nome: "Membro" }; }
  }));
  return Object.fromEntries(r.map((p) => [p.id, p]));
}

/** Avisos visíveis para mim (gerais + meus grupos/ministérios + lista direcionada). */
export async function meusAvisos(db, uid) {
  const [g, m, s] = await Promise.all([
    meusGrupos(db, uid), meusMinisterios(db, uid),
    getDocs(query(collection(db, "notices"), orderBy("criadoEm", "desc"), limit(60)))
  ]);
  const gIds = g.map((x) => x.id), mIds = m.map((x) => x.id);
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) =>
    !a.alvoTipo || a.alvoTipo === "geral" ||
    (a.alvoTipo === "grupo" && gIds.includes(a.alvoId)) ||
    (a.alvoTipo === "ministerio" && mIds.includes(a.alvoId)) ||
    (a.alvoTipo === "lista" && (a.alvoIds || []).includes(uid)));
}
export async function avisosLidos(db, uid) {
  try { const s = await getDoc(doc(db, "users", uid, "state", "avisos")); return new Set(s.exists() ? s.data().lidos || [] : []); }
  catch { return new Set(); }
}
export async function marcarLido(db, uid, ids) {
  await setDoc(doc(db, "users", uid, "state", "avisos"), { lidos: arrayUnion(...ids) }, { merge: true });
}
