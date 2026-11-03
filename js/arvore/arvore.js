// Árvore da Fé — visualização interativa (D3, layout hierárquico de cima para baixo).
import { exigirMembro, temPapel } from "../core/sessao.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { esc, carregarScript, CDN, abrirDialogo, normalizar, toast, iniciais, hojeISO } from "../core/ui.js";
import { icon, hidratarIcones } from "../core/icons.js";
import { MODOS, carregarArvore, montarGrafo, geracoes, ancestrais, nomeVisivel, fotoVisivel } from "./dados.js";

const { user, membro, db } = await exigirMembro();
const lider = temPapel(membro, "lider");
const priv = { lider, meuId: user.uid };
await carregarScript(CDN.d3);
const d3 = self.d3;

const app = document.getElementById("app");
app.innerHTML = `<p class="muted"><span class="carregando"></span> Montando a árvore…</p>`;
const dados = await carregarArvore(db);
const { nos, raizes } = montarGrafo(dados);
if (!nos.has(user.uid)) nos.set(user.uid, { id: user.uid, nome: membro.nome, foto: membro.foto, filhos: [], paiId: null, frutos: 0, geracao: 0, visibilidade: "foto" });

let visao = location.hash.slice(1) || "minha";
const CARD_W = 184, CARD_H = 60, GAP_X = 22, GAP_Y = 64;

app.innerHTML = `
<div class="tabs" role="tablist" aria-label="Visões da árvore" style="margin-bottom:10px">
  <button class="chip" role="tab" data-v="minha">${icon("pessoa")}Minha árvore</button>
  <button class="chip" role="tab" data-v="igreja">${icon("arvore")}Árvore da igreja</button>
  <button class="chip" role="tab" data-v="geracoes">${icon("grupo")}Gerações</button>
</div>
<div id="ferramentas" class="linha" style="margin-bottom:8px">
  <input id="busca" type="search" placeholder="Buscar pessoa…" aria-label="Buscar pessoa na árvore" style="flex:1;min-width:160px;min-height:44px">
  <button class="btn-icone" id="z-mais" aria-label="Aproximar">${icon("zoomMais")}</button>
  <button class="btn-icone" id="z-menos" aria-label="Afastar">${icon("zoomMenos")}</button>
  <button class="btn-icone" id="z-centro" aria-label="Centralizar">${icon("centro")}</button>
  <button class="btn secundario pequeno" id="exp-png">${icon("baixar")}PNG</button>
  <button class="btn secundario pequeno" id="exp-pdf">${icon("baixar")}PDF</button>
</div>
<div id="sug" class="card oculto" style="position:relative;z-index:5;padding:6px;margin-bottom:8px"></div>
<div id="palco" style="height:min(68vh,640px);border:1px solid var(--borda);border-radius:var(--raio);background:var(--bg-suave);overflow:hidden;touch-action:none;position:relative"></div>
<div id="legenda" class="linha" style="gap:8px 14px;margin-top:10px;font-size:.82rem"></div>
<div id="geracoes" class="oculto"></div>
<p class="pequeno muted" style="margin-top:8px">Toque num cartão para ver a história. Toque em <b>+</b>/<b>−</b> para abrir ou fechar os ramos. Arraste para mover e use dois dedos (ou a roda do mouse) para aproximar.</p>`;

document.getElementById("legenda").innerHTML = Object.values(MODOS).map((m) =>
  `<span class="linha" style="gap:6px"><span style="width:22px;height:4px;border-radius:2px;background:${m.cor}"></span>${esc(m.nome)}</span>`).join("") +
  `<span class="linha" style="gap:6px"><span style="width:22px;border-top:2px dashed var(--texto-3)"></span>Também contribuíram</span>`;

// ---------- Hierarquias ----------
const RAIZ_VIRTUAL = "__igreja__";
function dadosHierarquia(modo) {
  const no = (id, filtroFilhos) => {
    const n = nos.get(id);
    const filhos = filtroFilhos ? filtroFilhos(n) : n.filhos;
    return { id, filhos: filhos.map((f) => no(f, filtroFilhos)) };
  };
  if (modo === "minha") {
    const caminho = ancestrais(nos, user.uid);           // raiz ... eu
    const naLinha = new Set(caminho);
    // acima de mim: só o caminho; de mim para baixo: todos os frutos
    const montar = (id) => {
      const n = nos.get(id);
      if (id === user.uid) return no(id);
      const prox = n.filhos.filter((f) => naLinha.has(f));
      return { id, filhos: prox.map(montar) };
    };
    return montar(caminho[0]);
  }
  return { id: RAIZ_VIRTUAL, filhos: raizes.sort((a, b) => b.geracao - a.geracao).map((r) => no(r.id)) };
}

// ---------- Desenho ----------
const palco = document.getElementById("palco");
const svg = d3.select(palco).append("svg").attr("width", "100%").attr("height", "100%").attr("role", "img").attr("aria-label", "Árvore da Fé");
const g = svg.append("g");
const zoom = d3.zoom().scaleExtent([0.15, 2.5]).on("zoom", (e) => g.attr("transform", e.transform));
svg.call(zoom).on("dblclick.zoom", null);
let raiz = null;

function corDoLink(link) {
  const l = nos.get(link.target.data.id)?.ligacao;
  return MODOS[l?.modos?.[0]]?.cor || "#BDB6A6";
}

function construir() {
  const h = d3.hierarchy(dadosHierarquia(visao), (d) => d.filhos);
  h.descendants().forEach((d) => {
    d._children = d.children;
    // muitas pessoas: começa fechado a partir da 3ª geração na visão da igreja
    if (visao === "igreja" && d.depth >= 3 && d.children) d.children = null;
  });
  raiz = h;
  desenhar(true);
}

function desenhar(centralizarEm = false) {
  const layout = d3.tree().nodeSize([CARD_W + GAP_X, CARD_H + GAP_Y]).separation((a, b) => (a.parent === b.parent ? 1 : 1.15));
  layout(raiz);
  const virtual = raiz.data.id === RAIZ_VIRTUAL;
  const visiveis = raiz.descendants().filter((d) => !(virtual && d === raiz));
  const links = raiz.links().filter((l) => !(virtual && l.source === raiz));
  const temCss = getComputedStyle(document.documentElement);
  const cBg = temCss.getPropertyValue("--bg-elev").trim() || "#fff", cTxt = temCss.getPropertyValue("--texto").trim() || "#0F0E0D", cTxt2 = temCss.getPropertyValue("--texto-2").trim() || "#4A4640", cBorda = temCss.getPropertyValue("--borda").trim() || "#E8E2D2";

  g.selectAll("*").remove();
  g.append("g").attr("fill", "none").selectAll("path").data(links).join("path")
    .attr("stroke", corDoLink).attr("stroke-width", 3).attr("stroke-linecap", "round")
    .attr("d", (l) => `M${l.source.x},${l.source.y + CARD_H / 2}C${l.source.x},${(l.source.y + l.target.y) / 2} ${l.target.x},${(l.source.y + l.target.y) / 2} ${l.target.x},${l.target.y - CARD_H / 2}`);

  // "também contribuíram": linha tracejada (não vira segundo pai)
  const pos = new Map(visiveis.map((d) => [d.data.id, d]));
  const extras = [];
  for (const d of visiveis) for (const c of nos.get(d.data.id)?.ligacao?.contribuiram || []) if (c.id && pos.has(c.id)) extras.push([pos.get(c.id), d]);
  g.append("g").attr("fill", "none").selectAll("path").data(extras).join("path")
    .attr("stroke", cTxt2).attr("stroke-width", 1.5).attr("stroke-dasharray", "5 5").attr("opacity", .7)
    .attr("d", ([a, b]) => `M${a.x},${a.y}Q${(a.x + b.x) / 2},${Math.min(a.y, b.y) - 40} ${b.x},${b.y}`);

  const defs = svg.select("defs").empty() ? svg.insert("defs", ":first-child") : svg.select("defs");
  const cards = g.append("g").selectAll("g").data(visiveis).join("g")
    .attr("transform", (d) => `translate(${d.x - CARD_W / 2},${d.y - CARD_H / 2})`)
    .attr("tabindex", 0).attr("role", "button")
    .attr("aria-label", (d) => nomeVisivel(nos.get(d.data.id), priv))
    .style("cursor", "pointer")
    .on("click", (e, d) => { if (!e.defaultPrevented) painel(d.data.id); })
    .on("keydown", (e, d) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); painel(d.data.id); } });

  cards.append("rect").attr("width", CARD_W).attr("height", CARD_H).attr("rx", 14)
    .attr("fill", cBg).attr("stroke", (d) => d.data.id === user.uid ? "#D8AD34" : d.data.id === destaqueId ? "#9AB47A" : cBorda)
    .attr("stroke-width", (d) => d.data.id === user.uid || d.data.id === destaqueId ? 4 : 1.5);
  cards.each(function (d) {
    const n = nos.get(d.data.id), el = d3.select(this);
    const foto = fotoVisivel(n, priv);
    if (foto) {
      const cid = "c" + btoa(unescape(encodeURIComponent(d.data.id))).replace(/[^a-zA-Z0-9]/g, "");
      if (defs.select("#" + cid).empty()) defs.append("clipPath").attr("id", cid).append("circle").attr("cx", 30).attr("cy", 30).attr("r", 20);
      el.append("image").attr("href", foto).attr("x", 10).attr("y", 10).attr("width", 40).attr("height", 40).attr("clip-path", `url(#${cid})`).attr("preserveAspectRatio", "xMidYMid slice");
    } else {
      el.append("circle").attr("cx", 30).attr("cy", 30).attr("r", 20).attr("fill", n.externo ? "#CFC9BC" : "#F0C749");
      el.append("text").attr("x", 30).attr("y", 35).attr("text-anchor", "middle").attr("font-family", "Montserrat, system-ui, sans-serif").attr("font-weight", 800).attr("font-size", 14).attr("fill", "#0F0E0D")
        .text(nomeVisivel(n, priv) === "Membro" ? "?" : iniciais(n.nome));
    }
    const nomeCompleto = nomeVisivel(n, priv);
    const ficticio = /\(.*fict/i.test(nomeCompleto);
    const nome = nomeCompleto.replace(/\s*\(.*?\)\s*/g, " ").trim();
    el.append("title").text(nomeCompleto);
    el.append("text").attr("x", 58).attr("y", 26).attr("font-family", "Montserrat, system-ui, sans-serif").attr("font-weight", 800).attr("font-size", 12.5).attr("fill", cTxt)
      .text(nome.length > 17 ? nome.slice(0, 16) + "…" : nome);
    el.append("text").attr("x", 58).attr("y", 44).attr("font-family", "Inter, system-ui, sans-serif").attr("font-size", 10.5).attr("fill", cTxt2)
      .text((ficticio ? "fictício · " : "") + (n.externo ? "sem cadastro" : `${n.frutos} fruto${n.frutos === 1 ? "" : "s"} · ${n.geracao} na geração`));
    if (d._children?.length) {
      const bt = el.append("g").attr("transform", `translate(${CARD_W / 2 - 13},${CARD_H - 4})`).style("cursor", "pointer")
        .attr("role", "button").attr("aria-label", d.children ? "Fechar ramo" : "Abrir ramo")
        .on("click", (e) => { e.stopPropagation(); d.children = d.children ? null : d._children; desenhar(); });
      bt.append("rect").attr("width", 26).attr("height", 20).attr("rx", 10).attr("fill", d.children ? cBg : "#F0C749").attr("stroke", "#D8AD34").attr("stroke-width", 1.5);
      bt.append("text").attr("x", 13).attr("y", 15).attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 800).attr("fill", "#0F0E0D").text(d.children ? "−" : "+");
    }
  });
  if (centralizarEm) centralizar(typeof centralizarEm === "string" ? centralizarEm : visao === "minha" ? user.uid : null);
}

function centralizar(id = null, escala = null, topo = false) {
  const W = palco.clientWidth, H = palco.clientHeight;
  const alvo = id && raiz.descendants().find((d) => d.data.id === id);
  if (alvo) {
    const k = escala || 0.9;
    svg.transition().duration(450).call(zoom.transform, d3.zoomIdentity.translate(W / 2 - alvo.x * k, (topo ? H * 0.16 : H / 2) - alvo.y * k).scale(k));
    return;
  }
  const b = g.node().getBBox();
  const k = Math.min(1, 0.92 * Math.min(W / (b.width || 1), H / (b.height || 1)));
  // árvore larga no celular: em vez de ficar minúscula, começa pela maior raiz em tamanho legível
  if (k < 0.45 && !id) {
    const primeira = raiz.data.id === RAIZ_VIRTUAL ? raiz.children?.[0] : raiz;
    if (primeira) return centralizar(primeira.data.id, 0.75, true);
  }
  svg.transition().duration(450).call(zoom.transform, d3.zoomIdentity.translate(W / 2 - (b.x + b.width / 2) * k, H / 2 - (b.y + b.height / 2) * k).scale(k));
}

// ---------- Painel da pessoa ----------
async function painel(id) {
  const n = nos.get(id); if (!n) return;
  const l = n.ligacao;
  const pai = n.paiId ? nos.get(n.paiId) : null;
  const ger = geracoes(nos, id);
  const nome = nomeVisivel(n, priv), foto = fotoVisivel(n, priv);
  const d = abrirDialogo({
    titulo: nome,
    corpo: `<div class="linha" style="gap:14px;margin-bottom:12px">${foto ? `<img class="avatar g" src="${esc(foto)}" alt="">` : `<span class="avatar g">${esc(nome === "Membro" ? "?" : iniciais(n.nome))}</span>`}
      <div><b>${n.frutos} fruto${n.frutos === 1 ? "" : "s"} direto${n.frutos === 1 ? "" : "s"}</b><br><span class="muted">${n.geracao} na geração${ger.length ? " · " + ger.map((x, i) => `${x} na ${i + 1}ª`).join(", ") : ""}</span></div></div>
      ${pai ? `<p><b>Ganho(a) por:</b> ${esc(nomeVisivel(pai, priv))}${pai.externo ? " (sem cadastro)" : ""}</p>` : n.externo ? `<p class="muted">Pessoa sem cadastro na igreja.</p>` : `<p class="muted">Raiz da árvore.</p>`}
      ${l?.modos?.length ? `<p><b>Como foi:</b></p><div class="opcoes-chip" style="margin-bottom:10px">${l.modos.map((m) => `<span class="chip" style="cursor:default;border-color:${MODOS[m]?.cor}">${icon(MODOS[m]?.ic || "outro")}${esc(m === "outro" && l.modoOutro ? l.modoOutro : MODOS[m]?.nome || m)}</span>`).join("")}</div>` : ""}
      ${l?.dataConversao ? `<p><b>Conversão:</b> ${esc(l.dataConversao)}</p>` : ""}
      ${l?.contribuiram?.length ? `<p><b>Também contribuíram:</b> ${esc(l.contribuiram.map((c) => c.id ? nomeVisivel(nos.get(c.id), priv) : c.nome).join(", "))}</p>` : ""}
      <div id="testemunho"></div>
      ${!n.externo ? `<button class="btn secundario pequeno" id="ver-ramo">${icon("centro")}Ver na árvore</button>` : ""}`
  });
  d.querySelector("#ver-ramo")?.addEventListener("click", () => { d.close(); focar(id); });
  if (!n.externo) {
    try {
      const t = await getDoc(doc(db, "testimonies", id));
      // Só aparece se o membro permitiu (vale também para liderança nesta tela).
      if (t.exists() && t.data().texto && (t.data().visivel || id === user.uid)) d.querySelector("#testemunho").innerHTML = `<blockquote class="card" style="margin:10px 0;border-left:4px solid var(--verde);font-style:italic">"${esc(t.data().texto)}"</blockquote>`;
    } catch { /* testemunho não liberado pelo membro */ }
  }
}

// ---------- Busca (centraliza e destaca) ----------
let destaqueId = null;
function focar(id) {
  if (visao !== "igreja") { mudarVisao("igreja", false); }
  destaqueId = id;
  // abre os ramos até a pessoa
  const caminho = new Set(ancestrais(nos, id));
  raiz.descendants().forEach((d) => { if (caminho.has(d.data.id) && d._children) d.children = d._children; });
  desenhar(); centralizar(id, 1);
}
const busca = document.getElementById("busca"), sug = document.getElementById("sug");
busca.addEventListener("input", () => {
  const q = normalizar(busca.value);
  const r = q.length < 2 ? [] : [...nos.values()].filter((n) => nomeVisivel(n, priv) !== "Membro" && normalizar(n.nome).includes(q)).slice(0, 8);
  sug.classList.toggle("oculto", !r.length);
  sug.innerHTML = r.map((n) => `<button class="resultado-busca" data-id="${esc(n.id)}">${esc(n.nome)} <small class="muted">${n.frutos} frutos</small></button>`).join("");
});
sug.addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (!b) return; sug.classList.add("oculto"); busca.value = nos.get(b.dataset.id).nome; focar(b.dataset.id); });

// ---------- Gerações ----------
function renderGeracoes() {
  const el = document.getElementById("geracoes");
  const linha = (n) => {
    const ger = geracoes(nos, n.id);
    const max = Math.max(1, ...ger);
    return `<article class="card" style="margin-bottom:10px"><div class="linha entre"><b>${esc(nomeVisivel(n, priv))}</b><span class="selo verde">${n.geracao} no total</span></div>
      ${ger.length ? `<div class="pilha" style="margin-top:8px">${ger.map((x, i) => `<div class="linha" style="gap:8px;flex-wrap:nowrap"><span style="width:92px;flex:none" class="pequeno">${i === 0 ? "Frutos diretos" : `${i + 1}ª geração`}</span>
        <span style="height:14px;border-radius:7px;background:${i === 0 ? "#F0C749" : i === 1 ? "#9AB47A" : "#D8AD34"};width:${Math.max(6, (x / max) * 100)}%"></span><b>${x}</b></div>`).join("")}</div>` : `<p class="muted pequeno" style="margin:6px 0 0">Ainda sem frutos registrados.</p>`}</article>`;
  };
  const eu = nos.get(user.uid);
  el.innerHTML = `<h2 style="font-size:1.15rem">Você</h2>${linha(eu)}
    <h2 style="font-size:1.15rem;margin-top:18px">Raízes da igreja</h2>${raizes.filter((r) => r.filhos.length).sort((a, b) => b.geracao - a.geracao).map(linha).join("") || `<p class="muted">Nenhuma ligação confirmada ainda.</p>`}`;
}

// ---------- Exportar ----------
async function paraPng() {
  const b = g.node().getBBox(), pad = 40;
  const clone = svg.node().cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", b.width + pad * 2); clone.setAttribute("height", b.height + pad * 2 + 50);
  clone.setAttribute("viewBox", `${b.x - pad} ${b.y - pad - 50} ${b.width + pad * 2} ${b.height + pad * 2 + 50}`);
  clone.querySelector("g").setAttribute("transform", "");
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  Object.entries({ x: b.x - pad, y: b.y - pad - 50, width: b.width + pad * 2, height: b.height + pad * 2 + 50, fill: "#FFFFFF" }).forEach(([k, v]) => bg.setAttribute(k, v));
  clone.insertBefore(bg, clone.firstChild);
  const tit = document.createElementNS("http://www.w3.org/2000/svg", "text");
  Object.entries({ x: b.x, y: b.y - pad - 10, "font-family": "Montserrat, sans-serif", "font-weight": 800, "font-size": 22, fill: "#0F0E0D" }).forEach(([k, v]) => tit.setAttribute(k, v));
  tit.textContent = `Árvore da Fé — IDPB Jave Sabaoth · ${new Date().toLocaleDateString("pt-BR")}`;
  clone.appendChild(tit);
  // exporta sempre em cores claras (para impressão)
  clone.querySelectorAll("rect[rx='14']").forEach((r) => r.setAttribute("fill", "#FFFFFF"));
  clone.querySelectorAll("text").forEach((t) => { if (!["#0F0E0D"].includes(t.getAttribute("fill"))) t.setAttribute("fill", t.getAttribute("font-size") == 10.5 ? "#4A4640" : "#0F0E0D"); });
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const escala = Math.min(3, 8000 / (b.width + pad * 2));
  await new Promise((ok, erro) => { img.onload = ok; img.onerror = erro; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml); });
  const c = document.createElement("canvas");
  c.width = (b.width + pad * 2) * escala; c.height = (b.height + pad * 2 + 50) * escala;
  const ctx = c.getContext("2d"); ctx.scale(escala, escala); ctx.drawImage(img, 0, 0);
  return c;
}
document.getElementById("exp-png").onclick = async () => {
  try { const c = await paraPng(); const a = document.createElement("a"); a.download = `arvore-da-fe-${hojeISO()}.png`; a.href = c.toDataURL("image/png"); a.click(); }
  catch { toast("Não foi possível exportar a imagem.", "erro"); }
};
document.getElementById("exp-pdf").onclick = async () => {
  try {
    await carregarScript(CDN.jspdf);
    const c = await paraPng();
    const paisagem = c.width >= c.height;
    const pdf = new self.jspdf.jsPDF({ orientation: paisagem ? "landscape" : "portrait", unit: "pt", format: "a4" });
    const W = pdf.internal.pageSize.getWidth() - 40, H = pdf.internal.pageSize.getHeight() - 40;
    const k = Math.min(W / c.width, H / c.height);
    pdf.addImage(c.toDataURL("image/png"), "PNG", 20 + (W - c.width * k) / 2, 20, c.width * k, c.height * k);
    pdf.save(`arvore-da-fe-${hojeISO()}.pdf`);
  } catch { toast("Não foi possível gerar o PDF.", "erro"); }
};

// ---------- Visões ----------
function mudarVisao(v, redesenhar = true) {
  visao = v; history.replaceState(null, "", "#" + v);
  document.querySelectorAll("[data-v]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === v));
  const ger = v === "geracoes";
  document.getElementById("palco").classList.toggle("oculto", ger);
  document.getElementById("ferramentas").classList.toggle("oculto", ger);
  document.getElementById("legenda").classList.toggle("oculto", ger);
  document.getElementById("geracoes").classList.toggle("oculto", !ger);
  if (ger) renderGeracoes(); else if (redesenhar) { destaqueId = null; construir(); } else construir();
}
document.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => mudarVisao(b.dataset.v));
document.getElementById("z-mais").onclick = () => svg.transition().call(zoom.scaleBy, 1.3);
document.getElementById("z-menos").onclick = () => svg.transition().call(zoom.scaleBy, 1 / 1.3);
document.getElementById("z-centro").onclick = () => centralizar(visao === "minha" ? user.uid : null);
document.addEventListener("tema-alterado", () => desenhar());
mudarVisao(["minha", "igreja", "geracoes"].includes(visao) ? visao : "minha");
hidratarIcones();
