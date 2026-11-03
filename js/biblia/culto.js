// "Estou no culto": anotação pensada para uma mão, durante a pregação.
import { exigirMembro, registrarAntesDeSair } from "../core/sessao.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, hojeISO, fmtDataLonga } from "../core/ui.js";
import { icon, hidratarIcones } from "../core/icons.js";
import { criarStore, novoId } from "./notas-store.js";
import { montarEditor, indexar } from "./editor-nota.js";

const { user, db } = await exigirMembro();
const store = criarStore(db, user.uid);
registrarAntesDeSair(() => store.enviarTudo());
await store.recuperar();

const app = document.getElementById("app");
app.classList.add("modo-culto");
const hoje = hojeISO();

// Anotação de culto de hoje já começada (servidor + rascunhos locais)?
let deHoje = [];
try { deHoje = (await getDocs(query(collection(db, "users", user.uid, "notes"), where("data", "==", hoje)))).docs.map((d) => d.data()); } catch {}
(await store.rascunhos()).forEach((r) => { if (r.data === hoje) deHoje = [...deHoje.filter((x) => x.id !== r.id), r]; });
deHoje = deHoje.filter((n) => n.tipo === "culto" && !n.excluidoEm).sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));

// Mensagem cadastrada para hoje? Vincula automaticamente.
let msgHoje = null;
try { const s = await getDocs(query(collection(db, "sermons"), where("data", "==", hoje))); if (!s.empty) msgHoje = { id: s.docs[0].id, ...s.docs[0].data() }; } catch {}

function nova() {
  return indexar({
    id: novoId(), tipo: "culto", texto: "", referencias: [], data: hoje,
    titulo: msgHoje?.titulo || "",
    culto: { evento: msgHoje?.evento || (new Date().getDay() === 0 ? "Culto de domingo" : "Culto"), pregador: msgHoje?.pregador || "", tema: msgHoje?.titulo || "", sermonId: msgHoje?.id || null }
  });
}

function abrir(nota) {
  app.innerHTML = `
    <p class="muted" style="margin:-6px 0 10px">${esc(fmtDataLonga(hoje))}${msgHoje ? ` · <span class="selo verde">${icon("check")}Vinculada à mensagem "${esc(msgHoje.titulo)}"</span>` : ""}</p>
    <div id="ed"></div>
    <div class="linha" style="margin-top:12px"><a class="btn secundario pequeno" href="anotacoes.html">${icon("nota")}Minhas anotações</a>
      <button class="btn fantasma pequeno" id="outra">${icon("mais")}Nova anotação de culto</button></div>`;
  const ed = montarEditor(app.querySelector("#ed"), { store, nota, db, grande: true });
  app.querySelector("#outra").onclick = () => abrir(nova());
  if (!nota.texto) setTimeout(() => ed.foco(), 80);
}

abrir(deHoje[0] ? { ...deHoje[0], _baseMs: deHoje[0].atualizadoEm } : nova());
hidratarIcones();
