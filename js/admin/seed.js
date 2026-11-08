// Dados de EXEMPLO (fictícios) para testar o site. Todos os documentos levam `ficticio: true`
// e IDs começando com "exemplo-", para serem removidos com um clique.
import {
  doc, writeBatch, collection, query, where, getDocs, serverTimestamp, arrayUnion
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { rota } from "../core/ui.js";

const COLECOES = ["members", "directory", "cards", "spiritualLinks", "testimonies", "groups", "ministries", "schedules", "events", "registrations", "series", "sermons", "notices", "contributions"];

function dataRel(v) {
  const m = typeof v === "string" && v.match(/^([+-]\d+)d$/);
  if (!m) return v;
  const d = new Date(); d.setDate(d.getDate() + +m[1]);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function carregarExemplo(db, meuUid, aoProgresso = () => {}) {
  const seed = await (await fetch(rota("assets/data/seed-exemplo.json"))).json();
  const ops = [];
  const add = (col, id, dados) => ops.push([col, id, { ...dados, ficticio: true }]);

  seed.members.forEach((m, i) => {
    const [, mes, dia] = m.aniversario.split("-").map(Number);
    const numero = "EX-" + String(i + 1).padStart(3, "0");
    const token = ("exemplo" + m.id.replace(/\W/g, "") + "0000000000000000").slice(0, 24);
    add("members", m.id, { nome: m.nome, email: "", status: "aprovado", papeis: [], cargo: m.cargo, aniversario: m.aniversario,
      dataMembresia: "2015-01-10", numeroMembro: numero, cartaoToken: token, perfilCompleto: true, arvoreVisibilidade: m.arvoreVisibilidade, criadoEm: serverTimestamp() });
    add("directory", m.id, { nome: m.nome, foto: "", aniversarioDia: dia, aniversarioMes: mes, arvore: m.arvoreVisibilidade });
    add("cards", token, { nome: m.nome, cargo: m.cargo, numero, membroDesde: "2015-01-10", status: "ativo" });
  });
  seed.spiritualLinks.forEach(({ id, ...l }) => add("spiritualLinks", id, { ...l, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() }));
  seed.testimonies.forEach(({ id, ...t }) => add("testimonies", id, { ...t, atualizadoEm: serverTimestamp() }));
  seed.groups.forEach(({ id, ...g }) => add("groups", id, g));
  seed.ministries.forEach(({ id, ...m }) => add("ministries", id, m));
  seed.schedules.forEach(({ id, ...s }) => {
    const min = seed.ministries.find((x) => x.id === s.ministerioId);
    add("schedules", id, { ...s, data: dataRel(s.data), liderIds: min?.liderIds || [] });
  });
  seed.events.forEach(({ id, ...e }) => add("events", id, { ...e, data: dataRel(e.data) }));
  seed.series.forEach(({ id, ...s }) => add("series", id, s));
  seed.sermons.forEach(({ id, ...s }) => add("sermons", id, { ...s, data: dataRel(s.data) }));
  seed.notices.forEach(({ id, ...n }) => add("notices", id, { ...n, criadoEm: new Date(dataRel(n.criadoEm) + "T12:00:00"), autorId: meuUid }));
  seed.contributions.forEach(({ id, ...c }) => add("contributions", id, { ...c, data: dataRel(c.data), lancadoPor: meuUid }));

  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach(([c, id, d]) => b.set(doc(db, c, id), d));
    await b.commit();
    aoProgresso(Math.min(i + 400, ops.length), ops.length);
  }
  // inclui você na Mesa de exemplo, para ver "Minha Mesa" funcionando
  const b = writeBatch(db);
  b.update(doc(db, "groups", "exemplo-g1"), { membros: arrayUnion(meuUid) });
  await b.commit();
  return ops.length;
}

export async function removerExemplo(db) {
  let total = 0;
  for (const c of COLECOES) {
    const s = await getDocs(query(collection(db, c), where("ficticio", "==", true)));
    for (let i = 0; i < s.docs.length; i += 400) {
      const b = writeBatch(db);
      s.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
    total += s.size;
  }
  return total;
}
