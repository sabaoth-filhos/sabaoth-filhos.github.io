/* =========================================================
   CONFIGURAÇÃO DO SITE — ÚNICO LUGAR PARA TROCAR O ENDEREÇO
   ---------------------------------------------------------
   Este arquivo é lido pelas páginas (como módulo) e pelo service worker
   (via importScripts), por isso não usa "export": ele grava em self.SITE_CONFIG.

   Para mudar para um domínio próprio (ex.: https://sabaothfilhos.com/):
     1. troque BASE_URL abaixo (sempre terminando com "/");
     2. no Firebase: Authentication > Configurações > Domínios autorizados > adicionar o novo domínio;
     3. pronto: o manifest e o service worker usam caminhos relativos.
   ========================================================= */
self.SITE_CONFIG = {
  BASE_URL: "https://sabaoth-filhos.github.io/",

  // Versão do cache do PWA. Aumente quando publicar mudanças grandes.
  CACHE_VERSION: "v29",

  // Dados padrão da igreja (usados enquanto o admin não preenche
  // "Conteúdo público" no painel, que fica em settings/public no Firestore).
  IGREJA: {
    nome: "IDPB Jave Sabaoth",
    nomeCurto: "Jave Sabaoth",
    lema: "Proclamando a verdade da Bíblia no poder do Espírito Santo",
    endereco: "Rua Quarenta B, 36 - Novo Aleixo, Manaus – AM, 69099-113",
    mapsQuery: "Rua Quarenta B, 36, Novo Aleixo, Manaus - AM, 69099-113", // texto usado no botão "Como chegar"
    horarios: [
      { dia: "[DIA]", hora: "[HORÁRIO]", nome: "[NOME DO CULTO]" },
      { dia: "[DIA]", hora: "[HORÁRIO]", nome: "[NOME DO CULTO]" },
      { dia: "[DIA]", hora: "[HORÁRIO]", nome: "[NOME DO CULTO]" }
    ],
    instagram: "[INSTAGRAM]",   // ex.: https://instagram.com/usuario
    youtube: "[YOUTUBE]",       // ex.: https://youtube.com/@canal
    whatsapp: "[WHATSAPP]",     // ex.: 5592999999999 (só números, com DDI e DDD)
    pixChave: "[CHAVE PIX]",
    pixTitular: "[NOME DO TITULAR]",
    pixCidade: "MANAUS"
  },

  // Avisos de direitos autorais das versões da Bíblia (rodapé do leitor).
  // Substitua pelo texto exato fornecido pelas editoras.
  BIBLIAS: [
    { id: "KJA", nome: "King James Atualizada", aviso: "[AVISO KJA]" },
    { id: "NTLH", nome: "Nova Tradução na Linguagem de Hoje", aviso: "[AVISO NTLH]" },
    { id: "ACF", nome: "Almeida Corrigida Fiel", aviso: "[AVISO ACF]" }
  ],

  // Limite de versículos que podem ser copiados/compartilhados de uma vez.
  MAX_VERSICULOS_COPIA: 5
};

/** URL base efetiva: em testes locais (localhost) usa a origem atual. */
self.SITE_CONFIG.baseUrl = function () {
  try {
    const h = self.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return self.location.origin + "/";
  } catch (e) { /* ignore */ }
  return self.SITE_CONFIG.BASE_URL;
};
