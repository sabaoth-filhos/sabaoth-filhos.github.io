# Importação das Bíblias (KJA, NTLH, ACF)

> **Nunca** faça commit dos PDFs nem dos JSON gerados. As pastas `biblias-pdf/` e `biblias-json/` estão no `.gitignore`.

## Preparação (uma vez)
```bash
cd scripts/importar-biblia
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```
Chave de serviço: Console do Firebase > ⚙ Configurações do projeto > Contas de serviço > **Gerar nova chave privada**.
Salve **fora** do repositório (ex.: `~/chaves/idpb-jave-sabaoth.json`) e:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/chaves/idpb-jave-sabaoth.json"   # Windows (PowerShell): $env:GOOGLE_APPLICATION_CREDENTIALS="C:\chaves\idpb.json"
```

## Para cada PDF novo
1. Coloque o PDF em `biblias-pdf/` (na raiz do repositório; a pasta é ignorada pelo Git).
2. Extraia: `python importar.py extrair --versao ACF --pdf ../../biblias-pdf/acf-parte1.pdf`
   (use `--paginas 1-30` para testar com poucas páginas, e `--livros gn,ex` para limitar.)
3. Confira a amostra: `python importar.py amostra --versao ACF --ref "gn 1" --ref "sl 23"`
4. Se algo vier errado (número de versículo no meio do texto, cabeçalho misturado, nota de rodapé), ajuste `perfis/acf.json`
   (veja os campos em `perfis/padrao.json`) e repita o passo 2 com `--sobrescrever`.
5. Valide: `python importar.py validar --versao ACF` — lista capítulos/versículos faltando, duplicados ou cortados,
   comparando com a tabela padrão (`canon.json`, 66 livros, 31.102 versículos).
6. Envie: `python importar.py enviar --versao ACF --livros gn,ex`
   Só sobem livros sem divergências. Se a divergência for da própria versão (versificação diferente), registre em
   `versificacao` no perfil, ou confira e use `--aceitar-divergencias`.
7. Progresso: `python importar.py status --versao ACF` (também aparece no painel admin: "ACF: 12 de 66 livros").

A importação é incremental: rodar de novo um livro substitui só aquele livro; os outros continuam.

## Onde fica no Firestore
- `bible/{VERSAO}/books/{livro}/chapters/{n}` → `{ versiculos: [...] }` (leitura)
- `bible/{VERSAO}/books/{livro}` → livro inteiro (busca por palavra e leitura offline)
- `bible/{VERSAO}/meta/progresso` → livros importados e data
