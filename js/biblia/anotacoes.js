// "Minhas anotações": lista com filtros, lixeira (30 dias), exportar PDF/texto e compartilhar no WhatsApp.
import { exigirMembro, registrarAntesDeSair } from "../core/sessao.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, fmtData, abrirDialogo, normalizar, linkWhatsApp, baixarArquivo, carregarScript, CDN, toast, confirmar, hojeISO, estadoVazio } from "../core/ui.js";
import { icon, hidratarIcones } from "../core/icons.js";
import { LIVROS } from "./livros.js";
import { criarStore, novoId } from "./notas-store.js";
import { montarEditor, TIPOS, indexar } from "./editor-nota.js";

const { user, db } = await exigirMembro();
const store = criarStore(db, user.uid);
registrarAntesDeSair(() => store.enviarTudo());
await store.recuperar();

const app = document.getElementById("app");
document.querySelector(".barra-membro").insertAdjacentHTML("beforeend", `<span class="status-salvar" id="st-geral" data-estado="salvo">Salvo</span>`);
store.aoEstado((e) => { const el = document.getElementById("st-geral"); el.dataset.estado = e; el.textContent = { salvando: "Salvando…", salvo: "Tudo salvo", local: "Salvo no aparelho, será enviado quando houver internet", erro: "Guardado no aparelho" }[e]; });

let notas = [];
const f = { tipo: "todas", de: "", ate: "", livro: "", q: "" };

async function carregar() {
  let servidor = [];
  try { servidor = (await getDocs(collection(db, "users", user.uid, "notes"))).docs.map((d) => d.data()); } catch {}
  const mapa = new Map(servidor.map((n) => [n.id, n]));
  (await store.rascunhos()).forEach((n) => mapa.set(n.id, { ...n, _local: true }));
  notas = [...mapa.values()].sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));
  store.limparLixeira(notas); // apaga de vez o que está na lixeira há mais de 30 dias
}

function filtradas() {
  const q = normalizar(f.q);
  return notas.filter((n) => {
    if (f.tipo === "lixeira") { if (!n.excluidoEm) return false; }
    else { if (n.excluidoEm) return false; if (f.tipo !== "todas" && n.tipo !== f.tipo) return false; }
    if (f.de && (n.data || "") < f.de) return false;
    if (f.ate && (n.data || "") > f.ate) return false;
    if (f.livro && !(n.livros || []).includes(f.livro)) return false;
    if (q && !normalizar([n.texto, n.titulo, n.refsTexto, n.culto?.pregador, n.culto?.tema, n.culto?.evento].join(" ")).includes(q)) return false;
    return true;
  });
}

function textoDaNota(n) {
  const cab = [TIPOS[n.tipo]?.nome, n.data ? fmtData(n.data) : "", n.refsTexto].filter(Boolean).join(" · ");
  const culto = n.tipo === "culto" ? [n.culto?.evento, n.culto?.pregador && "Pregador: " + n.culto.pregador, n.culto?.tema && "Tema: " + n.culto.tema].filter(Boolean).join("\n") : "";
  return [cab, n.titulo && n.tipo !== "culto" ? n.titulo : "", culto, "", n.texto || ""].filter((x, i) => x || i === 3).join("\n");
}

function render() {
  const l = filtradas();
  const tabs = [["todas", "Todas"], ["versiculo", "Versículos"], ["diaria", "Leitura diária"], ["culto", "Cultos"], ["lixeira", "Lixeira"]];
  app.innerHTML = `
  <div class="linha" style="margin-bottom:12px">
    <button class="btn pequeno" id="nova-diaria">${icon("mais")}Leitura diária</button>
    <a class="btn secundario pequeno" href="culto.html">${icon("microfone")}Estou no culto</a>
    <a class="btn fantasma pequeno" href="biblia.html">${icon("biblia")}Anotar num versículo</a>
  </div>
  <div class="tabs">${tabs.map(([k, t]) => `<button class="chip" aria-pressed="${f.tipo === k}" data-t="${k}">${t}${k === "lixeira" ? ` (${notas.filter((n) => n.excluidoEm).length})` : ""}</button>`).join("")}</div>
  <details class="card" style="margin:12px 0" ${f.de || f.ate || f.livro ? "open" : ""}><summary style="cursor:pointer;font-weight:700" class="linha">${icon("filtro")}Filtros e busca</summary>
    <div class="form" style="margin-top:12px">
      <div class="campo"><label for="fq">Buscar no texto</label><input id="fq" type="search" value="${esc(f.q)}"></div>
      <div class="grid grid-2" style="gap:12px"><div class="campo"><label for="fde">De</label><input id="fde" type="date" value="${f.de}"></div><div class="campo"><label for="fate">Até</label><input id="fate" type="date" value="${f.ate}"></div></div>
      <div class="campo"><label for="fl">Livro</label><select id="fl"><option value="">Todos os livros</option>${LIVROS.map((x) => `<option value="${x.id}" ${f.livro === x.id ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</select></div>
    </div></details>
  <div class="linha entre" style="margin-bottom:8px"><span class="muted pequeno">${l.length} anotação(ões)</span>
    ${f.tipo !== "lixeira" && l.length ? `<span class="linha"><button class="btn fantasma pequeno" id="exp-pdf">${icon("baixar")}PDF</button><button class="btn fantasma pequeno" id="exp-txt">${icon("baixar")}Texto</button></span>` : ""}</div>
  ${f.tipo === "lixeira" ? `<p class="alerta">${icon("info")}<span>Itens na lixeira são apagados de vez depois de 30 dias.</span></p>` : ""}
  <div class="pilha" id="lista">${l.map((n) => `
    <article class="card aparecer" data-id="${esc(n.id)}" style="cursor:pointer">
      <div class="linha entre"><span class="selo">${icon(TIPOS[n.tipo]?.ic || "nota")}${esc(TIPOS[n.tipo]?.nome || "Anotação")}</span>
        <small class="muted">${esc(fmtData(n.data || n.atualizadoEm))}${n._local ? ' · <span title="Ainda não enviado">no aparelho</span>' : ""}</small></div>
      <h3 style="margin:8px 0 2px;font-size:1.05rem">${esc(n.tipo === "culto" ? (n.culto?.tema || n.culto?.evento || "Culto") : n.titulo || n.refsTexto || "Sem título")}</h3>
      ${n.refsTexto && n.tipo !== "versiculo" ? `<p class="pequeno muted" style="margin:0">${esc(n.refsTexto)}</p>` : ""}
      <p style="margin:6px 0 0;white-space:pre-line;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(n.texto || "")}</p>
      ${f.tipo === "lixeira" ? `<div class="linha" style="margin-top:10px"><button class="btn secundario pequeno" data-rest="${esc(n.id)}">Restaurar</button><button class="btn fantasma pequeno" data-apagar="${esc(n.id)}">${icon("lixeira")}Apagar de vez</button><small class="muted">Excluída em ${esc(fmtData(n.excluidoEm))}</small></div>` : ""}
    </article>`).join("") || (f.tipo === "lixeira" ? estadoVazio({ ic: "lixeira", titulo: "A lixeira está vazia", texto: "Anotações apagadas ficam aqui por 30 dias antes de sumir." })
      : estadoVazio({ ic: "nota", titulo: "Nenhuma anotação encontrada", texto: "Toque em um versículo na Bíblia para anotar, ou use “Estou no culto” para anotar a pregação.",
          acao: `<a class="btn secundario pequeno" href="biblia.html">${icon("biblia")}Abrir a Bíblia</a>` }))}</div>`;

  app.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => { f.tipo = b.dataset.t; render(); });
  const liga = (id, k) => app.querySelector(id)?.addEventListener("input", (e) => { f[k] = e.target.value; clearTimeout(liga.t); liga.t = setTimeout(() => { render(); app.querySelector(id)?.focus(); }, 300); });
  liga("#fq", "q"); liga("#fde", "de"); liga("#fate", "ate");
  app.querySelector("#fl").onchange = (e) => { f.livro = e.target.value; render(); };
  app.querySelector("#nova-diaria").onclick = () => abrir(indexar({ id: novoId(), tipo: "diaria", texto: "", referencias: [], data: hojeISO() }), true);
  app.querySelectorAll("article[data-id]").forEach((a) => a.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    const n = notas.find((x) => x.id === a.dataset.id); if (n && !n.excluidoEm) abrir({ ...n, _baseMs: n.atualizadoEm });
  }));
  app.querySelectorAll("[data-rest]").forEach((b) => b.onclick = async () => { const n = notas.find((x) => x.id === b.dataset.rest); await store.restaurar({ ...n, _baseMs: n.atualizadoEm }); toast("Anotação restaurada."); await carregar(); render(); });
  app.querySelectorAll("[data-apagar]").forEach((b) => b.onclick = async () => {
    if (!(await confirmar("Apagar de vez? Esta ação não pode ser desfeita.", { ok: "Apagar de vez", perigo: true }))) return;
    try { await store.apagarDeVez(b.dataset.apagar); } catch { toast("Sem internet. Tente de novo depois.", "erro"); }
    await carregar(); render();
  });
  app.querySelector("#exp-txt")?.addEventListener("click", () => baixarArquivo(`anotacoes-${hojeISO()}.txt`, l.map(textoDaNota).join("\n\n" + "—".repeat(20) + "\n\n")));
  app.querySelector("#exp-pdf")?.addEventListener("click", () => exportarPdf(l));
}

function abrir(nota, nova = false) {
  const d = abrirDialogo({
    titulo: nova ? "Nova leitura diária" : TIPOS[nota.tipo]?.nome || "Anotação",
    corpo: `<div id="ed"></div>`,
    rodape: `<button class="btn fantasma pequeno" id="d-exc">${icon("lixeira")}Mover para a lixeira</button>
      <button class="btn secundario pequeno" id="d-wa">${icon("whatsapp")}WhatsApp</button><button class="btn pequeno" data-fechar>Concluir</button>`,
    aoFechar: async () => { await store.enviarTudo().catch(() => {}); await carregar(); render(); }
  });
  const ed = montarEditor(d.querySelector("#ed"), { store, nota, db });
  d.querySelector("#d-wa").onclick = () => open(linkWhatsApp(textoDaNota(ed.nota)), "_blank", "noopener");
  d.querySelector("#d-exc").onclick = async () => {
    if (!(await confirmar("Mover esta anotação para a lixeira? Você pode restaurar por 30 dias.", { ok: "Mover para a lixeira" }))) return;
    await store.excluir(ed.nota); d.close(); toast("Movida para a lixeira.");
  };
  setTimeout(() => ed.foco(), 60);
}

async function exportarPdf(l) {
  try {
    await carregarScript(CDN.jspdf);
    const { jsPDF } = self.jspdf;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const M = 48, W = pdf.internal.pageSize.getWidth() - 2 * M, H = pdf.internal.pageSize.getHeight();
    let y = M;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.text("Minhas anotações — IDPB Javé Sabaoth", M, y); y += 24;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text(`Exportado em ${new Date().toLocaleString("pt-BR")} · ${l.length} anotação(ões)`, M, y); y += 20;
    for (const n of l) {
      const linhas = pdf.splitTextToSize(textoDaNota(n), W);
      for (let i = 0; i < linhas.length; i++) {
        if (y > H - M) { pdf.addPage(); y = M; }
        pdf.setFont("helvetica", i === 0 ? "bold" : "normal"); pdf.setFontSize(i === 0 ? 11 : 10.5);
        pdf.text(linhas[i], M, y); y += 15;
      }
      y += 8; if (y < H - M) { pdf.setDrawColor(216, 173, 52); pdf.line(M, y, M + W, y); } y += 16;
    }
    pdf.save(`anotacoes-${hojeISO()}.pdf`);
  } catch (e) { toast("Não foi possível gerar o PDF agora.", "erro"); }
}

await carregar();
render();
hidratarIcones();
