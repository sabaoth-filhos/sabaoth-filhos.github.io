// Árvore da Fé — modelo de dados e montagem do grafo.
// spiritualLinks/{membroId}: { ganhoPorId | ganhoPorNomeExterno, ganhoPorNome, modos[], modoOutro, dataConversao,
//   contribuiram[{id?,nome}], status: 'pendente'|'confirmado', raiz?, criadoPor, criadoEm, atualizadoEm, historico[] }
// testimonies/{membroId}: { texto, visivel }   (separado para a regra de visibilidade valer no servidor)
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { normalizar } from "../core/ui.js";

// Cores derivadas da paleta do site (ouro, verde, grafite), legíveis no claro e no escuro.
export const MODOS = {
  relacionamento: { nome: "Relacionamento/amizade", ic: "amizade", cor: "#D8AD34" },
  oracao: { nome: "Oração", ic: "oracao", cor: "#9AB47A" },
  jejum: { nome: "Jejum", ic: "jejum", cor: "#5E7A44" },
  comunhao: { nome: "Comunhão", ic: "comunhao", cor: "#C47F2C" },
  evangelismo: { nome: "Evangelismo pessoal", ic: "evangelismo", cor: "#6B665D" },
  convite: { nome: "Convite para o culto", ic: "convite", cor: "#B08A2E" },
  celula: { nome: "Mesa", ic: "grupo", cor: "#7FA05C" },
  familia: { nome: "Família", ic: "familia", cor: "#A39D90" },
  outro: { nome: "Outro", ic: "outro", cor: "#BDB6A6" }
};

export const idExterno = (nome) => "ext:" + normalizar(nome).replace(/[^a-z0-9]+/g, "-").slice(0, 60);

/** Carrega perfis públicos e ligações. */
export async function carregarArvore(db) {
  const [dir, links] = await Promise.all([
    getDocs(collection(db, "directory")),
    getDocs(collection(db, "spiritualLinks"))
  ]);
  const pessoas = new Map(dir.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
  const ligacoes = new Map(links.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
  return { pessoas, ligacoes };
}

/**
 * Monta o grafo só com ligações CONFIRMADAS.
 * Retorna { nos: Map(id -> {id, nome, foto, oculto, externo, paiId, filhos[], ligacao}), raizes[] }
 */
export function montarGrafo({ pessoas, ligacoes }) {
  const nos = new Map();
  const no = (id, base = {}) => { if (!nos.has(id)) nos.set(id, { id, filhos: [], paiId: null, ...base }); return nos.get(id); };
  for (const p of pessoas.values()) no(p.id, { nome: p.nome, foto: p.foto, visibilidade: p.arvore || "foto" });
  for (const l of ligacoes.values()) {
    if (l.status !== "confirmado" || l.raiz) continue;
    const filho = nos.get(l.id) || no(l.id, { nome: "Membro", visibilidade: "nome" });
    let paiId = l.ganhoPorId;
    if (!paiId && l.ganhoPorNomeExterno) {
      paiId = idExterno(l.ganhoPorNomeExterno);
      no(paiId, { nome: l.ganhoPorNomeExterno, externo: true, visibilidade: "nome" });
    }
    if (!paiId || paiId === l.id) continue;
    const pai = nos.get(paiId) || no(paiId, { nome: l.ganhoPorNome || "Membro", visibilidade: "nome" });
    filho.paiId = pai.id; filho.ligacao = l;
    pai.filhos.push(filho.id);
  }
  // proteção extra contra ciclos (dados antigos/manuais): quebra o laço
  for (const n of nos.values()) {
    const vistos = new Set([n.id]); let p = n.paiId;
    while (p) { if (vistos.has(p)) { n.paiId = null; break; } vistos.add(p); p = nos.get(p)?.paiId; }
  }
  for (const n of nos.values()) n.filhos = n.filhos.filter((f) => nos.get(f)?.paiId === n.id);
  const raizes = [...nos.values()].filter((n) => !n.paiId && (n.filhos.length || !n.externo));
  contar(nos);
  return { nos, raizes };
}

/** frutos = filhos diretos; geracao = todos os descendentes. */
function contar(nos) {
  const memo = new Map();
  const desc = (id) => {
    if (memo.has(id)) return memo.get(id);
    memo.set(id, 0);
    const n = nos.get(id);
    const t = n.filhos.reduce((s, f) => s + 1 + desc(f), 0);
    memo.set(id, t); return t;
  };
  for (const n of nos.values()) { n.frutos = n.filhos.length; n.geracao = desc(n.id); }
}

/** Contagem por geração a partir de uma pessoa: [4, 11, 3] = 4 diretos, 11 na 2ª, 3 na 3ª. */
export function geracoes(nos, id) {
  const r = []; let nivel = [id];
  while (nivel.length) {
    const prox = nivel.flatMap((x) => nos.get(x)?.filhos || []);
    if (prox.length) r.push(prox.length);
    nivel = prox;
  }
  return r;
}

/** Sobe de `id` até a raiz (lista de ids, da raiz até id). */
export function ancestrais(nos, id) {
  const c = []; let p = id; const vistos = new Set();
  while (p && !vistos.has(p)) { vistos.add(p); c.unshift(p); p = nos.get(p)?.paiId; }
  return c;
}

/** true se definir `ganhador` como "ganho por" de `membro` criaria um ciclo. */
export function criaCiclo(ligacoes, membro, ganhador) {
  if (!ganhador) return false;
  if (ganhador === membro) return true;
  let p = ganhador; const vistos = new Set();
  while (p && !vistos.has(p)) {
    if (p === membro) return true;
    vistos.add(p);
    p = ligacoes.get(p)?.ganhoPorId || null;
  }
  return false;
}

/** Nome a exibir respeitando a privacidade escolhida pelo membro. */
export function nomeVisivel(n, { lider = false, meuId = null } = {}) {
  if (!n) return "Membro";
  if (n.visibilidade === "oculto" && !lider && n.id !== meuId) return "Membro";
  return n.nome || "Membro";
}
export function fotoVisivel(n, { lider = false, meuId = null } = {}) {
  if (!n || !n.foto) return "";
  if (n.visibilidade !== "foto" && !lider && n.id !== meuId) return "";
  return n.foto;
}
