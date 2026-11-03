// Referências bíblicas: interpretar "Jo 3:16", "1 Co 13.4-7", "Salmos 23" e formatar de volta.
import { LIVROS } from "./livros.js";

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const MAPA = new Map();
for (const l of LIVROS) {
  const chaves = [l.id, l.nome, l.abrev, ...(l.aliases || [])];
  for (const k of chaves) {
    MAPA.set(norm(k), l.id);
    MAPA.set(norm(k).replace(/\s/g, ""), l.id);
  }
}
MAPA.set("jo", "jo"); // "Jo" = João (Jó é "Jó" com acento ou "job")

export const livroPorId = (id) => LIVROS.find((l) => l.id === id);

export function acharLivro(txt) {
  const bruto = String(txt || "").trim().toLowerCase();
  if (bruto === "jó") return "job";
  const n = norm(txt);
  return MAPA.get(n) || MAPA.get(n.replace(/\s/g, "")) || null;
}

/** "Jo 3:16-18" → {livro:'jo', cap:3, v1:16, v2:18}. Retorna null se não entender. */
export function interpretar(txt) {
  const m = String(txt || "").trim().match(/^([1-3]?\s*[^\d:.,]+?)\s*(\d{1,3})(?:\s*[:.,]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?\s*$/i);
  if (!m) return null;
  const livro = acharLivro(m[1]);
  if (!livro) return null;
  const L = livroPorId(livro);
  const cap = +m[2];
  if (cap < 1 || cap > L.versiculos.length) return null;
  const max = L.versiculos[cap - 1];
  let v1 = m[3] ? +m[3] : null, v2 = m[4] ? +m[4] : v1;
  if (v1 && (v1 < 1 || v1 > max + 3)) return null;
  if (v2 && v2 < v1) v2 = v1;
  return { livro, cap, v1, v2 };
}

export function formatar(r, { longo = false } = {}) {
  if (!r) return "";
  const L = livroPorId(r.livro);
  const nome = L ? (longo ? L.nome : L.abrev) : r.livro;
  if (!r.v1) return `${nome} ${r.cap}`;
  return `${nome} ${r.cap}:${r.v1}${r.v2 && r.v2 !== r.v1 ? "-" + r.v2 : ""}`;
}

/** Agrupa números de versículos em intervalos: [1,2,3,5] → "1-3,5" */
export function faixas(nums) {
  const s = [...new Set(nums)].sort((a, b) => a - b), out = [];
  for (let i = 0; i < s.length; i++) {
    let j = i; while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(i === j ? `${s[i]}` : `${s[i]}-${s[j]}`); i = j;
  }
  return out.join(",");
}
export const chaveVers = (livro, cap, v) => `${livro}.${cap}.${v}`;
export const chaveCap = (livro, cap) => `${livro}.${cap}`;
