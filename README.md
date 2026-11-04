# IDPB Jave Sabaoth — site e área de membros

Site oficial da **IDPB Jave Sabaoth** (Igreja de Deus Pentecostal do Brasil, Manaus – AM):

- **Parte pública**: início, primeira visita, assistir (mensagens por série), participar (células, voluntariado, batismo), oração, contribuir (Pix) e sobre.
- **Área do membro** (com login): painel "Olá, nome", perfil e família, célula, escalas, eventos, contribuições, avisos, carteirinha digital com QR, **Bíblia com anotações** e **Árvore da Fé**.
- **Painel da liderança**: aprovação de cadastros e gestão de tudo (por papel: admin, líder, tesoureiro).

Tecnologia: HTML, CSS e JavaScript puros (ES modules), **sem build**, hospedado no **GitHub Pages**; login e banco de dados no **Firebase** (Authentication + Cloud Firestore, plano gratuito Spark, sem Cloud Storage). É um **PWA**: pode ser instalado na tela inicial do celular e funciona offline nas partes já abertas.

---

## ✅ O que você precisa fazer (passo a passo)

O projeto Firebase já está criado e configurado. Falta:

### 1. Ativar o GitHub Pages
GitHub → repositório `sabaoth-filhos.github.io` → **Settings → Pages** → *Build and deployment*: **Deploy from a branch** → Branch **`main`**, pasta **`/ (root)`** → **Save**.
Em 1–2 minutos o site abre em **https://sabaoth-filhos.github.io/**.

### 2. Publicar as regras de segurança do Firestore
O Firestore está em modo produção (tudo bloqueado) até você publicar as regras.

- **Pelo console** (mais simples): [console.firebase.google.com](https://console.firebase.google.com/) → projeto **idpb-jave-sabaoth** → **Firestore Database → Regras** → apague o conteúdo, cole todo o arquivo [`firestore.rules`](firestore.rules) → **Publicar**.
- **Pela Firebase CLI** (opcional):
  ```bash
  npm install -g firebase-tools
  firebase login
  firebase deploy --only firestore:rules --project idpb-jave-sabaoth
  ```

### 3. Criar os índices
Quatro consultas precisam de índice composto. **Pelo console**: Firestore → **Índices → Compostos → Criar índice**, um para cada linha:

| Coleção | Campo 1 | Campo 2 |
|---|---|---|
| `events` | `publico` Crescente | `data` Crescente |
| `schedules` | `memberId` Crescente | `data` Crescente |
| `contributions` | `memberId` Crescente | `data` Decrescente |
| `prayerRequests` | `uid` Crescente | `criadoEm` Decrescente |

> Atalho: se faltar algum índice, o navegador mostra no console (F12) um erro com um **link que cria o índice automaticamente**.

Recomendado (economiza espaço e evita lentidão): em **Índices → Campo único → Adicionar isenção**, desative a indexação dos campos de texto grandes: `books.capitulos`, `chapters.versiculos`, `members.foto`, `directory.foto`, `notes.texto`, `versoes.texto` (escopo: *Coleção* e *Grupo de coleções*).

**Pela CLI** (cria tudo, inclusive as isenções): `firebase deploy --only firestore:indexes --project idpb-jave-sabaoth`

### 4. Fazer seu cadastro e virar admin
1. Abra https://sabaoth-filhos.github.io/entrar.html e entre (Google, link por e-mail ou e-mail e senha). Seu cadastro já entra aprovado (aprovação automática), mas ainda sem papel de admin.
2. No console: **Firestore Database → Dados → `members`** → clique no documento com o seu e-mail.
3. Edite os campos:
   - `status` → `aprovado` (texto), se ainda não estiver
   - `papeis` → tipo **array**, adicione um item texto `admin`
4. Volte ao site e recarregue. Complete o perfil. No painel aparece **"Painel da liderança"** (`/admin/`).
5. Daqui em diante, os cadastros entram aprovados sozinhos. No painel, a aba *Controle de cadastros* lista todos: gere o nº e a carteirinha, **bloqueie** quem não deve ter acesso (a pessoa não consegue se recadastrar) ou **exclua** um cadastro (se a pessoa entrar de novo, volta aprovada). Para dar papel de **líder** ou **tesoureiro**, use a aba *Membros*.

### 5. Personalizar os e-mails do Firebase (já em português)
Console → **Authentication → Templates**: *Verificação de endereço de e-mail*, *Redefinição de senha* e *Login por link de e-mail*. Ali você altera o nome do remetente, o assunto e o texto (o idioma já está em pt-BR). Em **Authentication → Settings → Domínios autorizados** deve constar `sabaoth-filhos.github.io` (já está).

### 6. Importar a primeira Bíblia
Veja a seção [Importação da Bíblia](#-importação-da-bíblia-pdf--firestore). Comece com um PDF pequeno, confira a amostra (Gênesis 1 e Salmos 23) e só depois importe o restante.

### 7. Trocar os textos provisórios e fotos
Procure por `[` nos arquivos (ex.: `[ENDEREÇO]`, `[CHAVE PIX]`) ou preencha pelo painel → **Conteúdo público** (sobrepõe o arquivo de configuração):

| O quê | Onde |
|---|---|
| Endereço, horários, redes, WhatsApp, Pix, titular | Painel → *Conteúdo público* (ou `js/site-config.js` → `IGREJA`) |
| Avisos de direitos autorais **KJA / NTLH / ACF** (texto exato das editoras) | `js/site-config.js` → `BIBLIAS[].aviso` |
| Foto do culto (home) | Opcional. Hoje o topo da página inicial usa fundo escuro liso. Para usar uma foto, coloque `assets/img/hero-culto.webp` (1600×1000, WebP, ~150 KB) e o `<picture>` de volta no `.hero` do `index.html`. |
| Fotos de ministério infantil / células | `assets/img/ministerio-infantil.webp`, `assets/img/celulas.webp` |
| Texto "Como é o culto", estacionamento, faixa etária do infantil | `primeira-visita.html` |
| História, vínculo com a IDPB, crenças | `sobre.html` |
| Política de privacidade (data, e-mail do encarregado) | `privacidade.html` |
| Logo PNG transparente (para usar sobre fotos) | `assets/img/logo-idpb-transparente.png` (gerado a partir do JPG; troque por um oficial se tiver) |

Mantenha os mesmos nomes de arquivo ao trocar as fotos. Depois de mudanças grandes, aumente `CACHE_VERSION` em `js/site-config.js` para os celulares baixarem a versão nova.

---

### 8. Transmissão ao vivo (a cada culto transmitido)
Painel admin → **Conteúdo público** → **Transmissão ao vivo**: cole o link da live do YouTube e toque em **Estou ao vivo**. O site mostra o selo “Ao vivo” no menu, um destaque na página inicial e o vídeo no topo de **Assistir**. O selo some sozinho depois de 3 horas (ou toque em **Encerrar transmissão**).

O destaque **“Próximo culto”** é calculado automaticamente a partir dos horários cadastrados (fuso de Manaus). Escreva o dia por extenso ou abreviado (“Domingo”, “Quarta-feira”, “Seg a Sex”) e a hora como “18h”, “19h30” ou “19:30”.

## 🌐 Endereço do site e domínio próprio

Todos os caminhos do site são **relativos**. A URL base fica num único arquivo, [`js/site-config.js`](js/site-config.js) (`BASE_URL`), usada no **link mágico** e no link de verificação da carteirinha. O `manifest.webmanifest` e o `sw.js` usam caminhos relativos ao local onde o site está, então não precisam ser alterados.

Para passar a usar, por exemplo, `https://sabaothfilhos.com/`:
1. Em `js/site-config.js`, troque `BASE_URL: "https://sabaothfilhos.com/"` (com `/` no final).
2. No GitHub: Settings → Pages → *Custom domain* → `sabaothfilhos.com` (e configure o DNS conforme a página do GitHub indicar).
3. No Firebase: Authentication → Settings → **Domínios autorizados** → adicionar `sabaothfilhos.com`.
4. Aumente `CACHE_VERSION` em `js/site-config.js`.

> Observação: o `404.html` usa `/` (raiz do domínio) de propósito, porque o GitHub Pages o serve em qualquer caminho inexistente.

---

## 📁 Estrutura de arquivos

```
index.html, primeira-visita.html, assistir.html, participar.html, oracao.html,
contribuir.html, sobre.html, privacidade.html, entrar.html, verificar.html, offline.html, 404.html
membro/        index (painel), perfil, celula, escalas, eventos, contribuicoes, avisos,
               carteirinha, biblia, anotacoes, culto ("Estou no culto"), arvore, oracoes
admin/         index.html (painel da liderança, abas por papel)
css/style.css  identidade visual (variáveis em :root + modo escuro)
js/site-config.js     URL base, dados da igreja, avisos das Bíblias (ÚNICO arquivo de endereço)
js/firebase-config.js configuração pública do app web
js/core/       firebase (init), sessao (login/permissões/sair seguro), layout (menu/rodapé/PWA),
               ui, icons, forms (fluxo único de formulários), pix, imagem (compressão de fotos)
js/paginas/    scripts das páginas públicas
js/membro/     scripts da área do membro
js/biblia/     leitor, anotações, "Estou no culto", notas-store (salvamento à prova de perda)
js/arvore/     Árvore da Fé (dados, visualização D3, "Quem me ganhou")
js/admin/      painel, motor de CRUD, dados de exemplo
assets/img/    logo, ícones do PWA, fotos (placeholders marcados)
assets/data/seed-exemplo.json   dados FICTÍCIOS para teste
scripts/importar-biblia/        importador de PDFs (Python)
firestore.rules, firestore.indexes.json, firebase.json, manifest.webmanifest, sw.js
```

---

## 🗄️ Modelo de dados (Cloud Firestore)

| Coleção | Conteúdo | Quem lê / escreve |
|---|---|---|
| `settings/public` | dados públicos da igreja (endereço, horários, Pix, liderança) | todos leem · admin |
| `series`, `sermons` | séries ("campanhas") e mensagens (YouTube) | todos leem · admin |
| `events` | eventos (`publico`, `inscricoes`) | públicos: todos · demais: membros · admin |
| `visitorForms` | "Avise que você vem", células, voluntariado, batismo (mesmo formato) | qualquer um cria · admin |
| `prayerRequests` | pedidos de oração (anônimo = sem `uid`, nome ou contato) | qualquer um cria · autor e admin leem |
| `members/{uid}` | cadastro completo; `status` (pendente/aprovado/recusado/inativo), `papeis[]`, `cargo`, `dataBatismo`, `dataMembresia`, `numeroMembro`, `cartaoToken`, `foto` (data URL), `familia{conjuge, filhos[]}` | o próprio (só dados pessoais) · admin |
| `directory/{uid}` | o que outros membros podem ver: nome, foto (se permitido), dia/mês do aniversário | membros aprovados · o próprio |
| `cards/{token}` | verificação pública da carteirinha (QR) — só por código, sem listar | todos (get) · admin |
| `groups` | células: líder, dia, horário, local, `membros[]` | participantes e líder · admin; líder edita o próprio |
| `ministries` | ministérios: `liderIds[]`, `membros[]`, WhatsApp do líder | membros · admin |
| `schedules` | escalas: ministério, pessoa, data, função, `status`, `motivo` | a pessoa e os líderes · admin/líder; a pessoa marca "Não poderei ir" |
| `registrations/{evento_uid}` | inscrições em eventos | o próprio, líderes e admin |
| `contributions` | dízimos e ofertas | **só o próprio, tesoureiro e admin** |
| `notices` | avisos (`alvoTipo`: geral, grupo, ministerio, lista) | membros · admin/líder |
| `bible/{versao}/books/{livro}/chapters/{n}` | `versiculos[]` de um capítulo | **só membros aprovados** · admin/script |
| `bible/{versao}/books/{livro}` | livro inteiro (busca por palavra e leitura offline) | idem |
| `bible/{versao}/meta/progresso` | livros importados e data ("ACF: 12 de 66") | idem |
| `users/{uid}/notes/{id}` (+`/versoes`) | anotações: `tipo`, `texto`, `referencias`, `data`, `culto`, `criadoEm`, `atualizadoEm`, `excluidoEm` | **só o dono — nem líder nem admin** |
| `users/{uid}/highlights`, `readingProgress`, `state` | destaques/favoritos, último ponto de leitura, avisos lidos | só o dono |
| `spiritualLinks/{uid}` | Árvore da Fé: `ganhoPorId` ou `ganhoPorNomeExterno`, `modos[]`, `dataConversao`, `contribuiram[]`, `status`, `raiz`, `criadoPor`, `historico[]` | membros aprovados leem · regras de edição abaixo |
| `testimonies/{uid}` | testemunho (`texto`, `visivel`) separado para a privacidade valer no servidor | o próprio, admin, e membros se `visivel` |
| `counters/membros` | próximo número de membro | admin |

Mudanças em relação à sugestão do briefing: `families` virou o campo `familia` dentro de `members` (o membro edita sozinho); `directory` e `cards` foram criados para que ninguém precise ler o cadastro completo de outra pessoa; `testimonies` foi separado de `spiritualLinks` para que o "permitir que outros vejam" seja garantido pelas regras.

---

## 🔐 Segurança e privacidade

- Papéis ficam no Firestore (`members/{uid}.papeis`), nunca no front-end. As regras verificam o papel a cada operação.
- Conta nova = `aprovado` automaticamente, sem papéis. Contas bloqueadas (`recusado`) ou pendentes não leem nada da área do membro (nem a Bíblia).
- O membro só edita os próprios dados pessoais; cargo, batismo, membresia, número, situação e papéis só a liderança altera.
- Foto: comprimida no navegador (256×256, WebP/JPEG, ~40 KB); as regras recusam fotos com mais de 60.000 caracteres ou que não sejam imagem.
- Contribuições: leitura só pelo próprio membro, pelo tesoureiro e pelo admin.
- Pedido de oração anônimo: as regras recusam qualquer `uid`, nome ou contato.
- Anotações, destaques e progresso de leitura: só o dono. **Nem o admin** consegue ler.
- Nenhuma chave secreta no repositório. A configuração do app web (`js/firebase-config.js`) é pública por natureza; a chave de serviço do importador fica fora do repositório (variável de ambiente).
- LGPD: consentimento obrigatório no cadastro e nos formulários; política em `privacidade.html`.

**Textos bíblicos licenciados**: nunca vão para o Git (`/biblias-pdf/`, `/biblias-json/` e `*.pdf` estão no `.gitignore`); ficam no Firestore com leitura só para aprovados; o cache offline só existe para quem está logado e é apagado ao sair; cópia e compartilhamento limitados a 5 versículos por vez (configurável em `MAX_VERSICULOS_COPIA`), sempre com referência e versão. Como em qualquer site, isso dificulta, mas não impede totalmente, a cópia por alguém determinado (ex.: captura de tela).

**Limitações conhecidas** (escolhas conscientes para o plano gratuito, sem Cloud Functions):
- Quem escolhe "não aparecer" na Árvore aparece como "Membro" para não líderes, mas o nome continua no `directory` (usado em aniversariantes e listas de célula).
- A prevenção de ciclos na Árvore é completa no app e no painel; nas regras, o servidor bloqueia o ciclo direto (A↔B) e o auto-vínculo.
- A busca por palavra em "Toda a Bíblia" baixa o livro inteiro de cada livro importado (uma vez; depois fica no cache do aparelho).
- Cota do plano Spark: 50 mil leituras e 20 mil gravações por dia, o que sobra para cerca de 70 membros.

---

## ✍️ Anotações: por que elas nunca se perdem

1. **Cópia local imediata** (IndexedDB `idpb-notas`) a cada tecla.
2. **Envio automático** ao Firestore 1 s depois de parar de digitar, e também ao ocultar a aba, fechar, trocar de tela ou tocar em "Sair". Indicador: *Salvando… / Salvo / Salvo no aparelho, será enviado quando houver internet*.
3. **Cache offline do Firestore**: sem internet, as gravações ficam na fila e sobem sozinhas quando a conexão volta.
4. **Controle de versão nas regras**: cada gravação diz em qual versão do servidor se baseou (`baseMs`); se outro aparelho gravou antes, o servidor recusa e o app resolve: a **mais recente** fica como principal e a outra vai para **"Versões anteriores"** (`notes/{id}/versoes`).
5. O rascunho local só é apagado **depois que o servidor confirma**. Ao sair, se houver pendências, o app avisa: *"Há anotações ainda não enviadas. Conecte-se à internet antes de sair."*
6. Excluir manda para a **lixeira por 30 dias**.

**Cenários testados** (Firebase Emulator + navegador automatizado, com as regras reais):

| Cenário | Resultado |
|---|---|
| Fechar a aba no meio da digitação (antes do envio) | Ao reabrir, o rascunho local foi recuperado e enviado; a nota completa apareceu no servidor e na lista. |
| Ficar sem internet e voltar | Indicador mostrou "Salvo no aparelho…"; ao voltar a conexão, enviou sozinho e mudou para "Salvo". |
| Sair e entrar de novo | Sem internet, o "Sair" mostrou o aviso e não saiu. Online, saiu com 0 pendências, apagou o cache offline (inclusive textos bíblicos) e, ao entrar de novo, as notas estavam lá. |
| Abrir em outro aparelho (edição simultânea) | Aparelho B (online) e A (offline) editaram a mesma nota. Ao A voltar, o servidor recusou a gravação antiga; ficou como principal a versão mais recente, e a outra foi guardada em "Versões anteriores". Nada se perdeu. |

---

## 📖 Importação da Bíblia (PDF → Firestore)

Instruções completas em [`scripts/importar-biblia/LEIAME.md`](scripts/importar-biblia/LEIAME.md). Resumo:

```bash
cd scripts/importar-biblia
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/chaves/idpb-jave-sabaoth.json"   # chave de serviço FORA do repositório

python importar.py extrair --versao ACF --pdf ../../biblias-pdf/acf-parte1.pdf
python importar.py amostra --versao ACF --ref "gn 1" --ref "sl 23"     # confira e me mostre
python importar.py validar --versao ACF                                # 66 livros, capítulos e versículos
python importar.py enviar  --versao ACF --livros gn,ex                 # só livros sem divergências
python importar.py status  --versao ACF                                # "ACF: 2 de 66 livros"
```

Cada PDF pode ter diagramação diferente: ajuste `perfis/acf.json`, `kja.json` ou `ntlh.json` (margens, colunas, tamanho da fonte dos números de versículo e das notas, padrões de cabeçalho). O extrator foi testado com um PDF sintético de 2 colunas com cabeçalho, número de página, títulos de seção, versículos sobrescritos, marcadores e notas de rodapé, que foram removidos corretamente. **Com os PDFs reais, rode primeiro a amostra (Gn 1 e Sl 23) para aprovar antes de importar o resto.** Livros não importados aparecem como "Em breve" no leitor.

Chave de serviço: Console → ⚙ Configurações do projeto → **Contas de serviço** → *Gerar nova chave privada*. Guarde fora do repositório; o script se recusa a rodar se a chave estiver dentro da pasta do projeto.

---

## 🧪 Dados de exemplo (fictícios)

Painel → **Ferramentas → Carregar dados de exemplo**: 15 membros fictícios, 2 células, 2 ministérios, escalas, 3 eventos, 2 séries com 4 mensagens, avisos, contribuições e uma **Árvore da Fé com 4 gerações** (Maria → Márcia → Paulo → Lucas), com pessoa sem cadastro, "também contribuíram", privacidade e uma ligação pendente. Tudo tem "(fictício)" no nome, ID `exemplo-…` e `ficticio: true`. **Remover dados de exemplo** apaga tudo isso com um clique. Não há texto bíblico nos dados de exemplo.

---

## 🛠️ Desenvolvimento local (opcional)

```bash
npm install -g firebase-tools
firebase emulators:start --project idpb-jave-sabaoth     # Auth (9099) e Firestore (8080), com as regras do repositório
python3 -m http.server 5500                              # em outro terminal, na raiz do projeto
```
Abra `http://localhost:5500/?emulador=1` (o parâmetro liga o modo emulador neste navegador; só funciona em localhost). Para importar textos de teste no emulador: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 python importar.py enviar ...`.

---

## 🎨 Identidade visual

Cores do logo, em variáveis CSS (`css/style.css`, `:root`), com modo escuro automático ou pelo botão 🌙:
ouro `#F0C749` (principal), ouro escuro `#D8AD34` (hover/bordas), verde `#9AB47A` (detalhes), preto `#0F0E0D` (textos), branco `#FFFFFF`. Nunca há texto amarelo sobre branco. Títulos em Montserrat 800 e corpo em Inter (Google Fonts). Menu principal com 5 itens: Início · Assistir · Participar · Contribuir · Entrar.
