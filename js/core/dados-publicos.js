// Dados públicos da igreja (Firestore: settings/public, series, sermons, events públicos).
// Sempre há um valor padrão (site-config.js) para a página nunca ficar vazia.
import { getDb } from "./firebase.js";
import {
  doc, getDoc, collection, getDocs, query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { hojeISO } from "./ui.js";

const SITE = self.SITE_CONFIG;
const TTL = 10 * 60 * 1000;

async function cache(chave, fn) {
  try {
    const c = JSON.parse(sessionStorage.getItem("pub_" + chave) || "null");
    if (c && Date.now() - c.t < TTL) return c.v;
  } catch {}
  const v = await fn();
  try { sessionStorage.setItem("pub_" + chave, JSON.stringify({ t: Date.now(), v })); } catch {}
  return v;
}

export async function getIgreja() {
  try {
    const extra = await cache("igreja", async () => {
      const s = await getDoc(doc(await getDb(), "settings", "public"));
      return s.exists() ? s.data() : {};
    });
    return { ...SITE.IGREJA, ...limpar(extra) };
  } catch { return { ...SITE.IGREJA }; }
}
const limpar = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== "" && v != null && !(Array.isArray(v) && !v.length)));

export async function getSeries() {
  try {
    return await cache("series", async () => {
      const s = await getDocs(query(collection(await getDb(), "series"), orderBy("ordem", "desc")));
      return s.docs.map((d) => ({ id: d.id, ...d.data() }));
    });
  } catch { return []; }
}

export async function getMensagens(max = 200) {
  try {
    return await cache("sermons" + max, async () => {
      const s = await getDocs(query(collection(await getDb(), "sermons"), orderBy("data", "desc"), limit(max)));
      return s.docs.map((d) => ({ id: d.id, ...d.data() }));
    });
  } catch { return []; }
}

export async function getEventosPublicos(max = 6) {
  try {
    return await cache("eventos" + max, async () => {
      const s = await getDocs(query(collection(await getDb(), "events"), where("publico", "==", true), where("data", ">=", hojeISO()), orderBy("data"), limit(max)));
      return s.docs.map((d) => ({ id: d.id, ...d.data() }));
    });
  } catch { return []; }
}

/** Extrai o ID de um vídeo do YouTube a partir de URL ou ID. */
export function youtubeId(v = "") {
  const m = String(v).match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : (/^[\w-]{11}$/.test(v) ? v : "");
}
