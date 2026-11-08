# CLAUDE.md: contexto do site da IDPB Javé Sabaoth

> **Para qualquer Claude que abrir este repositório, em qualquer conta.** Este arquivo é a memória do projeto. Leia-o inteiro antes de mexer em qualquer coisa.
> **Fale com o usuário sempre em português do Brasil e em linguagem simples.** Todo o conteúdo do site também é em pt-BR.
> O usuário decide o visual peça por peça e costuma mandar prints. Faça **exatamente** o que ele pede. Quando algo for ambíguo, escolha o caminho mais sensato e diga qual foi. Antes de remover algo que deixe outra coisa sem acesso, avise o efeito colateral.
> **Mantenha este arquivo atualizado:** ao fim de cada pedido que mude o site, decisões ou pendências, atualize as seções afetadas (principalmente 3, 4 e 8) no mesmo commit.
> O repositório é **público**: nunca escreva aqui segredos, e-mails pessoais ou dados de membros.

---

## 1. O projeto em poucas linhas

- **O que é:** site oficial da **IDPB Javé Sabaoth**, igreja local da Igreja de Deus Pentecostal do Brasil em Manaus (AM).
  - Endereço: **Rua Quarenta B, 36 - Novo Aleixo, Manaus – AM, 69099-113**.
- **Onde está:**
  - repositório GitHub `sabaoth-filhos/sabaoth-filhos.github.io`, branch `main`;
  - publicado pelo **GitHub Pages** na raiz: https://sabaoth-filhos.github.io/
  - `js/site-config.js` também cita o domínio `sabaothfilhos.com` (domínio próprio futuro; veja o README).
- **Três partes:**
  1. **Pública:** visitantes, sem login.
  2. **Área do membro:** exige login.
  3. **Painel admin:** por papel (`lider`, `tesoureiro`, `admin`).
- **Arquitetura:**
  - site **estático**, sem servidor e **sem build**: HTML, CSS e JS (módulos ES) puros;
  - **Firebase JS SDK 12.19.0** carregado de `https://www.gstatic.com/firebasejs/12.19.0/…`;
  - **Firebase Authentication** (Google, link por e-mail, e-mail e senha) e **Cloud Firestore**, projeto **`idpb-jave-sabaoth`**, plano gratuito **Spark**;
  - é **PWA**: `manifest.webmanifest` + `sw.js`, com cache offline.
- **Onde está a segurança de verdade:** nas **regras do Firestore** (`firestore.rules`). A interface só esconde botões. Toda permissão tem que estar garantida nas regras.

## 2. Regras do usuário. Não quebre nenhuma

1. **Idioma:** tudo em **pt-BR**, tanto o site quanto as respostas.
2. **Commits:**
   - autor e committer `user5214 <329302688+user5214@users.noreply.github.com>`. **Nunca use o e-mail pessoal do usuário** em código, commits ou arquivos;
   - um hook do ambiente pode pedir para trocar o autor para "Claude"; **não troque**, a menos que o usuário peça;
   - termine as mensagens de commit com as linhas de atribuição do seu ambiente (ex.: `Co-Authored-By: …` e `Claude-Session: …`).
3. **Fluxo de trabalho:** trabalhe direto no `main`. Faça commit e `git push -u origin main` **ao fim de cada pedido**; o usuário confere no site publicado. Se o push for bloqueado por falta de acesso, peça para conectar o repositório à sessão.
4. **Bíblia:** **nunca** coloque no repositório PDFs nem textos bíblicos (JSON, TXT ou qualquer formato). Os textos são licenciados (KJA, NTLH, ACF) e ficam só no Firestore, com leitura apenas para membros liberados. O `.gitignore` cobre `biblias-pdf/`, `biblias-json/` e `*.pdf`.
5. **Segredos:** nenhum no repositório, como a chave de conta de serviço do Admin SDK ou `.env`. A config web do Firebase em `js/firebase-config.js` é pública por design, inclusive a chave `AIza…`.
6. **Não usar Firebase Storage.** Fotos são comprimidas no navegador para 256×256 (`js/core/imagem.js`) e salvas como data URL. As regras limitam a 60.000 caracteres.
7. **Anotações pessoais:** ninguém, nem o admin, lê as anotações dos membros (`users/{uid}/**`).
8. **Visual:** nunca use texto amarelo sobre fundo branco.
9. **Caminhos:** sempre relativos. A URL base fica num só lugar: `BASE_URL` em `js/site-config.js`. A exceção é `404.html`, que usa `/` de propósito.
10. **Dados de exemplo:** sempre fictícios, com "(fictício)" no nome e `ficticio: true`.
11. **Vocabulário da igreja:** o grupo pequeno se chama **Mesa** (nunca "célula"). O acompanhamento de perto (o que outras igrejas chamam de discipulado) também se chama **Mesa**: é o líder da Mesa acompanhando os participantes. Use "Mesa" com M maiúsculo em todo texto visível.

## 3. Histórico resumido

1. **3 a 4/11/2026: construção em 6 etapas** (commits `2a6fe08` a `9684af1`): parte pública; login e área do membro; Bíblia, anotações e script de importação; Árvore da Fé; painel admin; regras, PWA e README.
2. **Correção de acesso:** a tela "Sem conexão" aparecia porque as regras não estavam publicadas. O site passou a mostrar a mensagem correta quando o Firestore recusa.
3. **Aprovação automática de cadastros** (`c4d357a`), depois trocada pela lista de e-mails autorizados (seção 7).
4. **5 rodadas de UX** (`129fa63` a `d6ecaf5`): cabeçalho e avatar; telas de bloqueio; site público; área do membro (painel "Hoje", menu "Mais", confirmar escala, carteirinha em tela cheia, estados vazios); painel admin (Pendências, busca única, Desfazer); acessibilidade.
5. **Ajustes visuais pedidos pelo usuário** (seção 4): limpou a página inicial, o "Sobre nós" e o "Participar", tirou o rodapé, trocou o logo por um sem fundo e reorganizou o menu.
6. **Auditoria de segurança completa** (`f75b56b` e `c8792d2`): seção 7.
7. **`dbb441e` a `ede82b1`:** painel "Como chegar"; menu novo; "Planejar minha visita" e "Pedir oração" desativadas; WhatsApp no menu; nome com acento: **Javé**.
8. **08/11/2026 (`fc92754`):** "célula" virou **"Mesa"** em todos os textos visíveis (Minha Mesa, abas Mesas / Minha Mesa no admin, avisos, formulário, Árvore da Fé, privacidade, dados de exemplo, README). Nomes internos mantidos de propósito: arquivo `membro/celula.html`, `js/membro/celula.js`, coleção `groups`, tipo de formulário `grupo`, `alvoTipo: "grupo"` e chave `celula` da Árvore. `CACHE_VERSION` v46.
9. **08/11/2026:** criado este `CLAUDE.md` para o usuário trocar de conta do Claude sem levar arquivo de contexto.

## 4. Como o site está HOJE (decisões do usuário; não "desfaça")

- **Nome:** "IDPB **Javé** Sabaoth" e, na forma curta, "Javé Sabaoth" (`IGREJA.nome` e `nomeCurto` em `js/site-config.js`).
- **Logo:** `assets/img/logo-idpb.png`, PNG sem fundo de 380×459. Favicon e `icon-192`/`icon-512` também sem fundo, com `?v=2` no link do favicon. `maskable-512` e `apple-touch-icon` mantêm fundo (exigência do Android e do iOS).
- **Menu do topo e menu de baixo no celular** (array `MENU` em `js/core/layout.js`), nesta ordem:
  1. **Início**;
  2. **Como chegar**: painel (`js/core/como-chegar.js`) com endereço, Google Maps, Waze, Uber, Apple Maps (no iPhone), "Copiar endereço" e horários; lembra o app escolhido;
  3. **Contribuir**;
  4. **WhatsApp**: abre a conversa com a igreja e some se não houver número; números com 10 ou 11 dígitos ganham o "55";
  5. **Entrar** ou **Minha área**: o botão dourado.
  - Na área do membro, o menu de baixo é: Início, Bíblia, Agenda, Carteirinha e **Mais** (lista única em `js/membro/secoes.js`).
- **Páginas desativadas:** "Planejar minha visita" (`primeira-visita.html`) e "Pedir oração" (`oracao.html`). Abertas direto, mostram "Página indisponível". Para reativar: `PAGINAS_ATIVAS` em `js/site-config.js` (`true`) e aumentar `CACHE_VERSION`.
- **Página inicial (`index.html`):** **vazia de propósito**, só com um `<h1>` para leitores de tela. O usuário removeu o destaque com foto, a faixa de horários, "Venha nos visitar", "Próximos eventos", "Última mensagem" e os cartões de convite.
- **"Sobre nós" (`sobre.html`) e "Participar" (`participar.html`):** **limpas**, só com o `<h1>`. Esperam texto novo. Nenhuma das duas está no menu.
- **Contribuir (`contribuir.html`):** título **"Dízimos, Ofertas e Primícias"** e só o quadro do Pix ("Copiar código Pix", QR code, chave e titular).
- **Rodapé:** **removido do site inteiro.**
- **Links "política de privacidade":** sem sublinhado, em negrito (classe `link-sutil`).
- **Avatar do cabeçalho:** mostra as **iniciais**. O usuário quer **manter assim**, sem foto. Não ofereça de novo.
- **Assistir (`assistir.html`):** existe, mas **sem nenhum link** no site.
- **Horários dos cultos:** ainda `[DIA]`/`[HORÁRIO]`. O admin preenche em "Conteúdo público".

## 5. Mapa de arquivos

```
*.html públicas: index, sobre, participar, contribuir, oracao (desativada), primeira-visita (desativada),
                 assistir (sem link), privacidade, entrar, verificar (QR da carteirinha), offline, 404
membro/*.html (13): index (painel "Hoje"), perfil, celula (= "Minha Mesa"), escalas, eventos (Agenda), avisos,
                    carteirinha, contribuicoes, oracoes, biblia, anotacoes, culto ("Estou no culto"), arvore
admin/index.html  → js/admin/painel.js (abas por papel) + js/admin/crud.js (motor genérico) + js/admin/seed.js
css/style.css     (tokens em :root, modo escuro, leitor da Bíblia, carteirinha, esqueletos, impressão)
js/site-config.js (self.SITE_CONFIG; BASE_URL, CACHE_VERSION, PAGINAS_ATIVAS, IGREJA, BIBLIAS,
                   APP_CHECK_SITE_KEY, MAX_VERSICULOS_COPIA)  ·  js/firebase-config.js (config pública)
js/core/    firebase, sessao, layout, ui, icons, forms, pix, imagem, dados-publicos, agenda, como-chegar
js/paginas/ comum, home, assistir, entrar, contribuir, oracao, primeira-visita, verificar
js/membro/  comum, painel, secoes, perfil, celula (Minha Mesa), escalas, eventos, contribuicoes, avisos, carteirinha, oracoes
js/biblia/  livros, referencias, dados, notas-store, editor-nota, leitor, anotacoes, culto
js/arvore/  dados, ligacao, arvore
assets/vendor/ d3-7.9.0, jspdf-4.2.1, html2canvas-1.4.1, qrcode-generator-1.4.4 (locais, sem CDN de terceiros)
assets/data/seed-exemplo.json (15 membros fictícios, 2 Mesas, árvore com 4 gerações)
scripts/importar-biblia/ importar.py, canon.json, perfis/*.json, requirements.txt, LEIAME.md
firestore.rules · firestore.indexes.json · firebase.json · manifest.webmanifest · sw.js · .nojekyll · .gitignore · README.md
```

O **README.md** tem os passos manuais do usuário (1 a 10), o modelo de dados, a segurança e o desenvolvimento local. Mantenha-o atualizado.

## 6. Funcionalidades (prontas e testadas)

### 6.1 Área do membro
- **Login:** Google (popup, com redirect como reserva), link mágico por e-mail e e-mail e senha; confirmação de e-mail; trata `account-exists-with-different-credential` com `linkWithCredential`.
- **Cadastro:** segue a lista de autorizados (7.1). Depois, o membro completa o perfil (nome, celular, aniversário, foto, endereço, família, privacidade na Árvore).
- **Painel "Hoje":** saudação pelo horário de Manaus, próxima escala (Confirmo / Não posso), continuar leitura, avisos não lidos, próximo evento, aniversariantes dos próximos 7 dias, acesso rápido.
- **Agenda:** escalas (Confirmo, Não posso, Vou poder ir, avisando o líder pelo WhatsApp) e eventos com inscrição.
- **Minha Mesa, Avisos, Contribuições e Pedidos de oração:** cada membro vê só o que é seu.
- **Carteirinha digital:** nº de membro, QR (`verificar.html?c=token`), baixar imagem, imprimir, tela cheia mantendo a tela acesa.
- **Bíblia** (KJA, NTLH, ACF): grade de livros, ajuste de fonte, comparar, destaques em 4 cores, favoritos, copiar com **limite de 5 versículos**, busca, "Em breve" para livros não importados, último ponto salvo.
- **Anotações à prova de perda** (`js/biblia/notas-store.js`): IndexedDB a cada tecla, envio com debounce de 1 s e ao fechar/ocultar/voltar internet/sair; controle de versão nas regras (`baseMs == atualizadoEm`); conflito guarda a outra versão em `versoes`; lixeira de 30 dias; exportação PDF/texto; "Estou no culto".
- **Sair seguro:** envia pendências, `terminate` + `clearIndexedDbPersistence`; rascunhos não enviados ficam no aparelho.
- **Árvore da Fé:** "quem me ganhou para Jesus", confirmação pela pessoa indicada, ciclos bloqueados, privacidade foto/nome/oculto, testemunho opcional, visões Minha árvore / Árvore da igreja / Gerações (d3), exportação PNG e PDF.

### 6.2 Painel admin (abas por papel)
- **Pendências**, **busca única por pessoa**, **Controle de cadastros** (Liberar acesso, Gerar nº e carteirinha, Bloquear, Excluir com Desfazer de 6 s etc.), **E-mails autorizados**.
- Outras abas: Membros (CRUD e CSV), **Mesas** (admin) / **Minha Mesa** (líder), Ministérios, Escalas, Eventos, Séries e mensagens, Avisos (geral, Mesa, ministério ou lista), Formulários, Pedidos de oração, Contribuições, Bíblia, Árvore da Fé, Ferramentas.
- **Conteúdo público** (`settings/public`): nome, endereço, Maps, Instagram, YouTube, WhatsApp, Pix, horários, liderança, transmissão ao vivo ("Estou ao vivo" expira em 3 h).

### 6.3 Parte pública
- **Contribuir:** Pix copia e cola gerado em `js/core/pix.js`. Em produção, `settings/public` já tem `pixChave`, `whatsapp` e `lideranca`.
- **Formulários** (`js/core/forms.js`): visita, Mesa (tipo interno `grupo`), voluntariado e batismo, com consentimento LGPD.
- **Pedido de oração:** pode ser anônimo (não guarda uid, nome nem contato).

### 6.4 Experiência e acessibilidade
- Modo escuro automático ou pelo botão; telas de bloqueio por caso; esqueletos; axe com **zero violações**; letra em 200% sem rolagem lateral; `prefers-reduced-motion`; alvos de 44 px.
- **Service worker:** rede primeiro para HTML/CSS/JS (cache só sem internet ou após 4 s); `updateViaCache: "none"`; recarrega uma vez com versão nova, nunca durante digitação ou com janela aberta.

## 7. Segurança (auditoria de 04 e 05/11; regras JÁ PUBLICADAS)

### 7.1 Quem pode ser membro
- Coleção **`allowlist/{email}`** (ID = e-mail em minúsculo), mantida na aba **"E-mails autorizados"**.
- **E-mail confirmado e na lista:** cadastro entra `aprovado`, `liberadoPor: 'lista'`.
- **Qualquer outro caso:** entra `pendente` e **não lê nada** de membro até um admin tocar em **Liberar acesso** (`liberadoPor: 'admin'`).
- Pendente é liberado sozinho no próximo acesso quando o e-mail entra na lista.
- E-mail do cadastro tem que ser igual a `request.auth.token.email`; `emailVerificado` conferido com o token; cada pessoa só consulta **o próprio** e-mail na `allowlist`.
- Cadastros antigos sem `liberadoPor`/`aprovadoPor` aparecem como **"a revisar"**.
- **A lista ainda está vazia** (o usuário vai mandar os e-mails).

### 7.2 Auditoria
| # | Gravidade | Problema | Situação |
|---|---|---|---|
| 1 | Alta | Aprovação automática expunha dados de membros (LGPD art. 11) | Corrigido (7.1) |
| 2 | Alta | Cadastro com e-mail falso ou não confirmado | Corrigido |
| 3 | Média | Sem limite de envios | App Check pronto e **desligado** até preencher `APP_CHECK_SITE_KEY` |
| 4 | Média | Sem cabeçalhos de segurança no GitHub Pages | CSP e Referrer-Policy em `<meta>` em todas as páginas; anti-iframe em `layout.js` |
| 5 | Média | jsPDF antigo | jsPDF **4.2.1** |
| 6 | Média | CDN sem SRI | Libs em `assets/vendor/`; Firebase segue no gstatic (risco aceito) |
| 7 | Baixa | WhatsApp dos líderes visível | `ministries` só para participantes, líderes e admin |
| 8 | Baixa | Nome falso no diretório | `directory.nome == members.nome` (`perfil.js` grava `members` antes de `directory`) |
| 9 | Baixa | Campos sem limite | Limites nas regras |
| 10 | Baixa | Dependências do importador | Atualizadas (pip-audit limpo) |

### 7.3 CSP: atenção sempre
- **Domínio externo novo:** acrescente-o na `<meta http-equiv="Content-Security-Policy">` de **todas** as páginas (inclusive `membro/` e `admin/`), senão o navegador bloqueia sem avisar.
- **Script embutido** (`<script>` sem `src`) é **bloqueado**. Coloque o código em `js/paginas/*.js`.

## 8. Pendências

### 8.1 Com o usuário (lembre e ajude)
1. **Colar a lista de e-mails autorizados.**
2. **Revisar os cadastros "a revisar".**
3. **App Check** (README, passo 9).
4. **Ajustes no console** (README, passo 10): domínios autorizados do Auth, restringir a Browser key, "Enforce HTTPS" no GitHub Pages.
5. **Índices compostos** (README, passo 3), se ainda não existirem.
6. **Conteúdo:** textos de "Sobre nós" e "Participar", horários dos cultos, fotos reais, avisos de direitos autorais das Bíblias (`BIBLIAS[].aviso`), textos provisórios de `primeira-visita.html` e `privacidade.html`.
7. **Bíblia com PDF real:** `python importar.py extrair --versao ACF --pdf ... --paginas 1-30`, ajustar `perfis/<versao>.json`, mostrar **amostra** e **esperar aprovação**, depois `validar` e `enviar` (chave de serviço **dele**, fora do repositório, em `GOOGLE_APPLICATION_CREDENTIALS`). **Nunca faça commit de PDF nem de JSON.**

### 8.2 Ideias em andamento (plano combinado em 08/11/2026)
O usuário trouxe referências de plataformas de mentoria e comunidade (Skool, Circle, ADPList, Mentorfy). Ficou combinado:
- **Trazer, em ordem de valor:**
  1. **Mesa com acompanhamento:** o líder da Mesa marca encontros, registra presença e acompanha cada participante com um plano de estudos e barra de progresso. O participante vê "Minha Mesa" com líder, encontros, o próprio progresso e aniversariantes. O líder vê só a própria Mesa (garantido nas regras). A Árvore da Fé continua separada.
  2. **Trilhas de ensino** (novos convertidos, batismo, integração, EBD): vídeo do YouTube não listado + texto, progresso por módulo.
  3. **Painel do líder da Mesa:** participantes, aniversariantes, faltas, pedidos de oração do grupo.
  4. **Progresso pessoal** (dias seguidos de leitura, trilhas concluídas), visível só para a própria pessoa.
- **Não trazer:** ranking/placar de pontos; feed ou chat interno (o WhatsApp cumpre esse papel e gastaria cota); assinatura paga ou checkout; trocar a tecnologia para React/Next/Tailwind.
- **Cuidados:** dados religiosos são sensíveis (LGPD); anotações pessoais continuam privadas mesmo dentro da Mesa; espaço compartilhado líder–participante, se houver, é separado.
- **Próximo passo sugerido:** construir a Mesa com acompanhamento. Ainda não iniciado.

### 8.3 Pontas soltas para oferecer (não faça sem pedir)
- Página inicial, "Sobre nós" e "Participar" vazias.
- "Sobre nós", "Participar" e "Assistir" sem link no menu.
- Política de privacidade só aparece nas frases de consentimento (pela LGPD, o ideal é um link sempre visível).
- O estado vazio de "Minha Mesa" leva a `participar.html#grupo`, hoje vazia.
- Formulários de Mesa, voluntariado e batismo não aparecem em nenhuma página.
- A lista de liderança de "Conteúdo público" não aparece em lugar nenhum.

## 9. Modelo de dados (Firestore)

- **Públicos:** `settings/public` (igreja, Pix, WhatsApp, horários, liderança, `aoVivo{url,titulo,ate}`), `series`, `sermons`; `events` públicos ou para membros liberados.
- **Cadastro e acesso:** `counters/membros` (admin); `allowlist/{email}`; `members/{uid}` (nome, email, emailVerificado, status, liberadoPor, aprovadoPor, papeis[], perfilCompleto, cargo, datas, numeroMembro, cartaoToken, foto, celular, aniversario, endereco, familia, arvoreVisibilidade; leitura: o próprio e o admin); `directory/{uid}` (o que outros membros veem); `cards/{token}` (verificação pública, só `get`).
- **Mesas e agenda:** `groups` (= **Mesas**: nome, liderId, liderNome, liderWhatsapp, dia, horario, local, membros[]); `ministries` (membros[], liderIds[], liderWhatsapp); `schedules` (liderIds, ministerioNome, memberNome, status); `registrations/{eventId_uid}`.
- **Privados:** `contributions`, `visitorForms`, `prayerRequests`.
- **Avisos:** `notices` com `alvoTipo` geral/grupo (= Mesa)/ministerio/lista.
- **Bíblia:** `bible/{V}/books/{livro}`, `.../chapters/{n}` (`versiculos[]`), `bible/{V}/meta/progresso`.
- **Pessoais (só o dono):** `users/{uid}/notes/{id}` (+`/versoes`), `users/{uid}/highlights|readingProgress|state`.
- **Árvore da Fé:** `spiritualLinks/{uid}`, `testimonies/{uid}`.

**Atenção:** campo novo em `members/{uid}` precisa entrar no `hasOnly` do `create` ou do `update` em `firestore.rules`, senão o salvamento falha com "permissão negada". Depois de mudar as regras, **o usuário precisa publicá-las**: Console Firebase → Firestore → Regras → colar o arquivo → Publicar. Ele pode fazer isso com ajuda do Claude in Chrome, clicando ele mesmo em "Publicar".

## 10. Como testar

- **Ferramentas:** `npm i firebase-tools firebase@12.19.0 axe-core` + Playwright com Chromium + Java para o emulador.
- **Servidor:** `python3 -m http.server 5500 --bind 127.0.0.1` na raiz.
- **Emulador:** `firebase emulators:start --only auth,firestore --project idpb-jave-sabaoth` (portas 9099 e 8080). Use uma **cópia** do `firestore.rules`; reinicie após mudar as regras; para parar, `pkill -f "[c]loud-firestore-emulator"`.
- **Modo emulador no site:** só em localhost, com `?emulador=1`.
- **Playwright:** redirecione `https://www.gstatic.com/firebasejs/12.19.0/*` para `node_modules/firebase/*`; confirmar e-mail no emulador com `POST /identitytoolkit.googleapis.com/v1/accounts:update` `{localId, emailVerified:true}` e `Authorization: Bearer owner`.
- **Testes que devem continuar passando:** 53 testes de regras; fluxo fora da lista → em análise → liberado; 4 cenários de anotações; PDF/PNG/QR/carteirinha; 17 abas do admin sem erro; CSP; axe com zero violações.
- **Produção:** confira **só com leituras** pela API REST pública (ex.: `members` deve responder `PERMISSION_DENIED`). **Não crie contas nem dados em produção.**
- O "Sair" fica no menu do avatar: `#btn-conta` → `#btn-sair`.

## 11. Armadilhas e convenções

- **A cada publicação:** aumente `CACHE_VERSION` em `js/site-config.js`.
- **JS novo importado por `layout.js`:** acrescente-o à lista `ESQUELETO` do `sw.js`.
- **`ev.currentTarget` vira `null` depois de `await`:** guarde o botão numa variável antes.
- **Liberar alguém pelo painel:** `status:'aprovado', liberadoPor:'admin', aprovadoPor:<uid>`.
- Use `esc()` em todo texto de usuário em HTML; `estadoVazio()`, `esqueleto()` e `comDesfazer()` para os padrões de tela.
- `[hidden]{display:none!important}` existe: elementos com `hidden` sempre somem.
- Chips de formulário (`label.chip > input` invisível): o clique é no `label`.
- Membro "oculto" na Árvore continua com o nome no `directory`.
- A proteção da Bíblia é dissuasiva (captura de tela não é impedida).

## 12. Como retomar (em qualquer conta)

1. Garanta acesso de escrita ao repositório `sabaoth-filhos/sabaoth-filhos.github.io` (o usuário conecta o GitHub na conta ou anexa o repositório à sessão).
2. Clone e confira `git log --oneline -5`.
3. Configure o autor:
   ```bash
   git config user.name user5214
   git config user.email 329302688+user5214@users.noreply.github.com
   ```
4. Leia este arquivo, `README.md`, `firestore.rules`, `js/site-config.js` e `js/core/layout.js`.
5. Pergunte ao usuário o que ele quer fazer agora.
