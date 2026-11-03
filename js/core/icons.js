// Conjunto único de ícones (traço 2px, 24x24) para manter consistência visual.
const P = {
  casa: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
  assistir: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor"/>',
  maos: '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/>',
  coracao: '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/>',
  grupo: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.2 5 2.6 5 5.8"/>',
  pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  entrar: '<path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
  sair: '<path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  presente: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18"/><path d="M12 8S10.5 3 7.8 3.6C5.6 4.1 6.4 8 12 8zM12 8s1.5-5 4.2-4.4C18.4 4.1 17.6 8 12 8z"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  calendario: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  voltar: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  copiar: '<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  alerta: '<path d="M12 3 2 20h20z"/><path d="M12 10v4.5M12 17.5v.5"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lua: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  biblia: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5V4.5M20 19v3H6.5"/><path d="M12 6v8M9 9h6"/>',
  nota: '<path d="M4 4h11l5 5v11H4z"/><path d="M15 4v5h5M8 13h8M8 17h5"/>',
  lapis: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  arvore: '<path d="M12 22v-7"/><path d="M12 15c-4 0-7-2.5-7-6a5 5 0 0 1 3.5-4.8A4.5 4.5 0 0 1 12 2a4.5 4.5 0 0 1 3.5 2.2A5 5 0 0 1 19 9c0 3.5-3 6-7 6z"/><path d="M12 15l-3-3M12 13l3-3"/>',
  cartao: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8" cy="11" r="2"/><path d="M5.5 16c.5-1.5 1.5-2.2 2.5-2.2s2 .7 2.5 2.2M13 10h5M13 14h4"/>',
  sino: '<path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  escala: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m8.5 15 2.2 2.2 4.8-4.8"/>',
  moeda: '<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.6-.9-1.7-1.5-3-1.5-1.9 0-3.2 1-3.2 2.4 0 3.4 6.4 1.8 6.4 5.2 0 1.4-1.4 2.4-3.2 2.4-1.4 0-2.6-.6-3.2-1.6M12 5v2M12 17v2"/>',
  ingresso: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  bolo: '<path d="M4 21h16v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M4 16c1.3 0 1.3 1 2.7 1s1.3-1 2.6-1 1.3 1 2.7 1 1.3-1 2.6-1 1.4 1 2.7 1 1.4-1 2.7-1"/><path d="M12 11V7M12 4.5v.5"/>',
  oracao: '<path d="M12 3c-1 2-2 3.5-2 6v4l-4.5 4.5L7 19l5-4 5 4 1.5-1.5L14 13V9c0-2.5-1-4-2-6z"/>',
  igreja: '<path d="M12 2v4M10 4h4"/><path d="M5 21V11l7-5 7 5v10"/><path d="M10 21v-5h4v5M3 21h18"/>',
  whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.8z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9c-1.2-.5-2.3-1.6-2.8-2.8l.9-1-1-2z" fill="currentColor" stroke="none"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor"/>',
  carro: '<path d="M5 17h14v-5l-2-5H7l-2 5z"/><path d="M3 12h18"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  crianca: '<circle cx="12" cy="6" r="3"/><path d="M8 22v-6l-2-4 4-2h4l4 2-2 4v6M10 22v-4h4v4"/>',
  cafe: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2v3M12 2v3"/>',
  agua: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  maoAmiga: '<path d="M11 14h2a2 2 0 0 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.8-2.8l-4.2 3.9"/><path d="m2 15 6 6"/>',
  estrela: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  marcador: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  baixar: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  imprimir: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  compartilhar: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
  lixeira: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  filtro: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  escudo: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  microfone: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
  livro: '<path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>',
  amizade: '<circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/><path d="M2 20c0-3 2.7-5.5 6-5.5 1.6 0 3 .5 4 1.4 1-.9 2.4-1.4 4-1.4 3.3 0 6 2.5 6 5.5"/>',
  jejum: '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 3v18M17 3c-2 0-3 3-3 6s1 4 3 4v8"/><path d="M3 21 21 3"/>',
  comunhao: '<path d="M8 3h8l-1 7a3 3 0 0 1-6 0z"/><path d="M12 13v6M8 21h8"/>',
  evangelismo: '<path d="M3 11v2a2 2 0 0 0 2 2h2l5 4V5L7 9H5a2 2 0 0 0-2 2z"/><path d="M16 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  convite: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  familia: '<circle cx="7" cy="6" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="12" cy="12" r="2"/><path d="M3 20v-5a4 4 0 0 1 8 0M13 20v-5a4 4 0 0 1 8 0M10 20v-2a2 2 0 0 1 4 0v2"/>',
  outro: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  zoomMais: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/>',
  zoomMenos: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6"/>',
  centro: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  fonte: '<path d="M4 20 9.5 5h1L16 20M6 15h8M17 20l2.5-7h.5l2.5 7M18 18h3.5"/>',
  colunas: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  nuvem: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/>',
  semNuvem: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/><path d="M3 3l18 18"/>',
  historico: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  usuarios: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.2 5 2.6 5 5.8"/>',
  painel: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
  mapa: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'
};

/** Retorna o SVG de um ícone. `rotulo` vazio = decorativo (aria-hidden). */
export function icon(nome, rotulo = "") {
  const corpo = P[nome] || P.outro;
  const a11y = rotulo ? `role="img" aria-label="${rotulo}"` : 'aria-hidden="true" focusable="false"';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${corpo}</svg>`;
}

/** Substitui todos os elementos <i data-icon="nome"> pelo SVG correspondente. */
export function hidratarIcones(raiz = document) {
  raiz.querySelectorAll("i[data-icon]").forEach((el) => {
    el.outerHTML = icon(el.dataset.icon, el.getAttribute("aria-label") || "");
  });
}
