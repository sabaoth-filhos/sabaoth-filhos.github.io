// Lista única das seções da área do membro (painel "Acesso rápido" e menu "Mais").
// `href` é relativo à pasta membro/. `papel`: só aparece para quem tem um desses papéis.
export const SECOES = [
  { id: "perfil", href: "perfil.html", ic: "pessoa", t: "Perfil e família", s: "Seus dados, foto e família" },
  { id: "celula", href: "celula.html", ic: "grupo", t: "Minha Mesa", s: "Encontro e participantes" },
  { id: "escalas", href: "escalas.html", ic: "escala", t: "Minhas escalas", s: "Confirme sua presença" },
  { id: "eventos", href: "eventos.html", ic: "ingresso", t: "Meus eventos", s: "Inscrições" },
  { id: "avisos", href: "avisos.html", ic: "sino", t: "Avisos", s: "Mural da igreja" },
  { id: "biblia", href: "biblia.html", ic: "biblia", t: "Bíblia", s: "Leitura e destaques" },
  { id: "anotacoes", href: "anotacoes.html", ic: "nota", t: "Minhas anotações", s: "Versículos, diário e cultos" },
  { id: "culto", href: "culto.html", ic: "microfone", t: "Estou no culto", s: "Anote a pregação" },
  { id: "arvore", href: "arvore.html", ic: "arvore", t: "Árvore da Fé", s: "Quem te ganhou e seus frutos" },
  { id: "carteirinha", href: "carteirinha.html", ic: "cartao", t: "Carteirinha", s: "Digital, com QR code" },
  { id: "contribuicoes", href: "contribuicoes.html", ic: "moeda", t: "Minhas contribuições", s: "Dízimos e ofertas" },
  { id: "oracoes", href: "oracoes.html", ic: "oracao", t: "Meus pedidos de oração", s: "Acompanhe" },
  { id: "admin", href: "../admin/index.html", ic: "config", t: "Painel da liderança", s: "Gestão e cadastros", papel: ["lider", "tesoureiro"] }
];
