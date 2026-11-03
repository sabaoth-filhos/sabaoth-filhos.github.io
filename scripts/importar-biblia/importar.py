#!/usr/bin/env python3
"""
Importação das Bíblias licenciadas (KJA, NTLH, ACF) a partir de PDF para o Firestore.

  NUNCA faça commit dos PDFs nem dos JSON gerados (estão no .gitignore).

Fluxo (pode rodar livro a livro, sem apagar o que já foi importado):

  1) extrair   PDF -> JSON local em biblias-json/{VERSAO}/{livro}.json
  2) amostra   mostra trechos (ex.: Gênesis 1 e Salmos 23) para você conferir
  3) validar   compara com a tabela padrão (66 livros) e lista divergências
  4) enviar    sobe para o Firestore com o Admin SDK (só livros validados)
  5) status    mostra o progresso gravado em bible/{VERSAO}/meta/progresso

Exemplos:
  python importar.py extrair --versao ACF --pdf ../../biblias-pdf/acf-genesis-exodo.pdf
  python importar.py amostra --versao ACF --ref "gn 1" --ref "sl 23"
  python importar.py validar --versao ACF
  python importar.py enviar  --versao ACF --livros gn,ex
  python importar.py status  --versao ACF

Credenciais (passo 4/5): baixe a chave de serviço no Console do Firebase
(Configurações do projeto > Contas de serviço > Gerar nova chave privada),
guarde FORA do repositório e aponte a variável de ambiente:
  export GOOGLE_APPLICATION_CREDENTIALS="$HOME/chaves/idpb-jave-sabaoth.json"
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import statistics
import sys
import unicodedata
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SAIDA = RAIZ / "biblias-json"
CANON = json.loads((AQUI / "canon.json").read_text(encoding="utf-8"))["livros"]
POR_ID = {l["id"]: l for l in CANON}
PROJETO = "idpb-jave-sabaoth"


# ----------------------------------------------------------------------------
# Utilidades
# ----------------------------------------------------------------------------
def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip().lower()


def carregar_perfil(versao: str, caminho: str | None) -> dict:
    padrao = json.loads((AQUI / "perfis" / "padrao.json").read_text(encoding="utf-8"))
    arq = Path(caminho) if caminho else AQUI / "perfis" / f"{versao.lower()}.json"
    if arq.exists():
        especifico = json.loads(arq.read_text(encoding="utf-8"))
        padrao.update({k: v for k, v in especifico.items() if not k.startswith("_")})
    return padrao


def mapa_nomes_livros(perfil: dict) -> dict[str, str]:
    """Nome do livro como aparece no PDF (normalizado) -> id."""
    m = {}
    for l in CANON:
        for n in [l["nome"], l["abrev"], *l.get("aliases", [])]:
            m[norm(n)] = l["id"]
            m[norm(n).replace(" ", "")] = l["id"]
    for nome, lid in (perfil.get("nomes_livros") or {}).items():
        m[norm(nome)] = lid
    m["jo"] = "jo"
    return m


def pasta_versao(versao: str) -> Path:
    p = SAIDA / versao.upper()
    p.mkdir(parents=True, exist_ok=True)
    return p


# ----------------------------------------------------------------------------
# 1) EXTRAÇÃO
# ----------------------------------------------------------------------------
def linhas_da_pagina(page, perfil: dict) -> list[dict]:
    """Agrupa as palavras da página em linhas, por coluna, já sem cabeçalho/rodapé."""
    W, H = page.width, page.height
    topo = perfil["margem_topo"]
    base = H - perfil["margem_base"]
    colunas = perfil["colunas"]
    if colunas == 2:
        meio = W * perfil.get("divisao_colunas", 0.5)
        caixas = [(0, topo, meio, base), (meio, topo, W, base)]
    else:
        caixas = [(0, topo, W, base)]

    linhas = []
    for x0, y0, x1, y1 in caixas:
        area = page.within_bbox((x0, y0, x1, y1))
        palavras = area.extract_words(
            keep_blank_chars=False, use_text_flow=False, x_tolerance=1.5, y_tolerance=2,
            extra_attrs=["size", "fontname"],
        )
        # agrupa por linha pela LINHA DE BASE (bottom); números sobrescritos ficam um pouco acima
        grupos: list[list[dict]] = []
        linha_base = lambda w: w["bottom"] - 0.22 * w["size"]  # desconta a parte de baixo das letras
        for w in sorted(palavras, key=lambda w: (round(w["bottom"] - 0.22 * w["size"]), w["x0"])):
            def perto(g):
                base = max(g, key=lambda x: x["size"])  # palavra de texto normal da linha
                peq = w["size"] <= perfil["fonte_versiculo_max"] or base["size"] <= perfil["fonte_versiculo_max"]
                return abs(linha_base(base) - linha_base(w)) <= perfil["tolerancia_linha"] + (5 if peq else 0)
            alvo = next((g for g in reversed(grupos[-3:]) if perto(g)), None)
            if alvo is not None:
                alvo.append(w)
            else:
                grupos.append([w])
        grupos.sort(key=lambda g: linha_base(max(g, key=lambda x: x["size"])))
        for g in grupos:
            g.sort(key=lambda w: w["x0"])
            tamanhos = [w["size"] for w in g]
            linhas.append({
                "palavras": g,
                "texto": " ".join(w["text"] for w in g),
                "tamanho": statistics.median(tamanhos),
                "fontes": {w["fontname"] for w in g},
                "top": g[0]["top"],
            })
    return linhas


def extrair(pdf_path: Path, versao: str, perfil: dict, livros_filtro: set[str] | None, paginas: str | None) -> dict:
    import pdfplumber

    nomes = mapa_nomes_livros(perfil)
    re_remover = [re.compile(r) for r in perfil["remover_linhas_regex"]]  # diferencia maiúsculas (cabeçalhos são em CAIXA ALTA)
    re_cap = re.compile(perfil["regex_capitulo"], re.I) if perfil.get("regex_capitulo") else None
    re_vers_inline = re.compile(perfil["regex_versiculo_inline"]) if perfil.get("regex_versiculo_inline") else None
    re_fonte_titulo = re.compile(perfil["fonte_titulo_secao_regex"], re.I) if perfil.get("fonte_titulo_secao_regex") else None
    re_marcador_nota = re.compile(perfil["marcador_nota_regex"]) if perfil.get("marcador_nota_regex") else None

    livros: dict[str, dict] = {}
    avisos: list[str] = []
    livro = None
    cap = 0
    vers = 0

    def destino():
        if not livro or (livros_filtro and livro not in livros_filtro):
            return None
        return livros.setdefault(livro, {"capitulos": {}})

    def novo_versiculo(n: int):
        nonlocal vers
        d = destino()
        if d is None or cap == 0:
            return
        caps = d["capitulos"].setdefault(str(cap), {})
        if str(n) in caps and not (n == 1 and not caps["1"]):
            avisos.append(f"{livro} {cap}:{n} duplicado (mantido o primeiro, texto extra anexado)")
        caps.setdefault(str(n), "")
        vers = n

    def anexar(txt: str):
        d = destino()
        if d is None or cap == 0 or vers == 0 or not txt:
            return
        caps = d["capitulos"].setdefault(str(cap), {})
        atual = caps.get(str(vers), "")
        if atual.endswith("-") and perfil.get("juntar_hifen", True):
            caps[str(vers)] = atual[:-1] + txt.lstrip()
        else:
            caps[str(vers)] = (atual + " " + txt).strip() if atual else txt.strip()

    with pdfplumber.open(str(pdf_path)) as pdf:
        idx = range(len(pdf.pages))
        if paginas:
            a, _, b = paginas.partition("-")
            idx = range(int(a) - 1, int(b or a))
        for i in idx:
            page = pdf.pages[i]
            for ln in linhas_da_pagina(page, perfil):
                t = ln["texto"].strip()
                if not t:
                    continue
                if any(r.search(t) for r in re_remover):
                    continue                                   # cabeçalho, rodapé, nº de página
                if ln["tamanho"] <= perfil["fonte_nota_max"]:
                    continue                                   # notas de rodapé (letra pequena)
                # título de livro (letra grande + nome conhecido)
                if ln["tamanho"] >= perfil["fonte_titulo_livro_min"]:
                    lid = nomes.get(norm(t)) or nomes.get(norm(t).replace(" ", ""))
                    if lid:
                        livro, cap, vers = lid, 0, 0
                        continue
                # capítulo por texto ("Capítulo 3") ou número grande (capitular)
                m = re_cap.match(t) if re_cap else None
                palavras = ln["palavras"]
                if m:
                    cap, vers = int(m.group(1)), 0
                    if perfil.get("versiculo1_implicito", True):
                        novo_versiculo(1)
                    continue
                if palavras and palavras[0]["text"].isdigit() and palavras[0]["size"] >= perfil["fonte_capitulo_min"]:
                    cap, vers = int(palavras[0]["text"]), 0
                    if perfil.get("versiculo1_implicito", True):
                        novo_versiculo(1)
                    palavras = palavras[1:]
                    if not palavras:
                        continue
                # títulos de seção (negrito/itálico) são descartados
                if re_fonte_titulo and all(re_fonte_titulo.search(w["fontname"]) for w in palavras):
                    continue
                # palavras: números de versículo sobrescritos x texto
                buf = []
                for w in palavras:
                    txt = w["text"]
                    if re_marcador_nota and w["size"] < perfil["fonte_versiculo_max"] and re_marcador_nota.fullmatch(txt):
                        continue                               # marcador de nota (a, b, *)
                    eh_num = txt.isdigit() and (
                        (perfil["modo_versiculo"] == "sobrescrito" and w["size"] <= perfil["fonte_versiculo_max"])
                        or (perfil["modo_versiculo"] == "inline" and vers and int(txt) in (vers + 1, vers + 2))
                    )
                    if perfil["modo_versiculo"] == "sobrescrito" and eh_num and vers and int(txt) not in range(vers + 1, vers + 4) and int(txt) != 1:
                        avisos.append(f"{livro} {cap}: número {txt} fora da sequência após {vers} (tratado como versículo)")
                    if eh_num:
                        anexar(" ".join(buf)); buf = []
                        novo_versiculo(int(txt))
                    else:
                        # número colado ao texto: "16Porque Deus..."
                        mm = re_vers_inline.match(txt) if re_vers_inline else None
                        if mm and vers and int(mm.group(1)) == vers + 1:
                            anexar(" ".join(buf)); buf = []
                            novo_versiculo(int(mm.group(1)))
                            buf.append(mm.group(2))
                        else:
                            buf.append(txt)
                anexar(" ".join(buf))

    # converte para listas ordenadas
    saida = {}
    for lid, d in livros.items():
        caps = {}
        for c, vs in sorted(d["capitulos"].items(), key=lambda kv: int(kv[0])):
            maxv = max(int(v) for v in vs) if vs else 0
            caps[c] = [re.sub(r"\s+", " ", vs.get(str(n), "")).strip() for n in range(1, maxv + 1)]
        saida[lid] = {"versao": versao.upper(), "livro": lid, "nome": POR_ID[lid]["nome"], "capitulos": caps,
                      "fonte": pdf_path.name, "extraidoEm": dt.datetime.now().isoformat(timespec="seconds")}
    return {"livros": saida, "avisos": avisos}


def cmd_extrair(a):
    versao = a.versao.upper()
    perfil = carregar_perfil(versao, a.perfil)
    filtro = set(a.livros.split(",")) if a.livros else None
    r = extrair(Path(a.pdf), versao, perfil, filtro, a.paginas)
    pasta = pasta_versao(versao)
    for lid, dados in r["livros"].items():
        arq = pasta / f"{lid}.json"
        if arq.exists() and not a.sobrescrever:
            antigo = json.loads(arq.read_text(encoding="utf-8"))
            antigo["capitulos"].update(dados["capitulos"])  # incremental: junta capítulos
            dados["capitulos"] = dict(sorted(antigo["capitulos"].items(), key=lambda kv: int(kv[0])))
        arq.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"  ✔ {versao} {POR_ID[lid]['nome']}: {len(dados['capitulos'])} capítulo(s) -> {arq.relative_to(RAIZ)}")
    if not r["livros"]:
        print("  Nenhum livro reconhecido. Ajuste o perfil (fonte_titulo_livro_min, nomes_livros, margens).")
    for av in r["avisos"][:50]:
        print("  ⚠", av)
    if len(r["avisos"]) > 50:
        print(f"  … mais {len(r['avisos']) - 50} avisos")
    print("\nPróximo passo: python importar.py amostra --versao", versao, '--ref "gn 1" --ref "sl 23"')


# ----------------------------------------------------------------------------
# 2) AMOSTRA
# ----------------------------------------------------------------------------
def ler_json(versao: str, lid: str) -> dict | None:
    arq = SAIDA / versao.upper() / f"{lid}.json"
    return json.loads(arq.read_text(encoding="utf-8")) if arq.exists() else None


def cmd_amostra(a):
    nomes = mapa_nomes_livros({})
    for ref in a.ref or ["gn 1", "sl 23"]:
        m = re.match(r"^\s*(.+?)\s+(\d+)\s*$", ref)
        if not m:
            print("Referência inválida:", ref); continue
        lid = nomes.get(norm(m.group(1)))
        d = ler_json(a.versao, lid) if lid else None
        print(f"\n==== {a.versao.upper()} · {POR_ID[lid]['nome'] if lid else ref} {m.group(2)} ====")
        if not d or m.group(2) not in d["capitulos"]:
            print("  (não extraído)"); continue
        for i, t in enumerate(d["capitulos"][m.group(2)], 1):
            print(f"  {i:>3} {t}")


# ----------------------------------------------------------------------------
# 3) VALIDAÇÃO
# ----------------------------------------------------------------------------
def validar_livro(d: dict, perfil: dict) -> list[str]:
    lid = d["livro"]
    esperado = POR_ID[lid]["versiculos"]
    ajustes = (perfil.get("versificacao") or {}).get(lid, {})  # ex.: {"3": 21}
    probs = []
    caps = d["capitulos"]
    if len(caps) != len(esperado):
        faltando = [str(c) for c in range(1, len(esperado) + 1) if str(c) not in caps]
        if faltando:
            probs.append(f"capítulos faltando: {', '.join(faltando[:20])}{'…' if len(faltando) > 20 else ''}")
        extras = [c for c in caps if int(c) > len(esperado)]
        if extras:
            probs.append(f"capítulos a mais: {', '.join(extras)}")
    for c, vs in caps.items():
        n_esp = int(ajustes.get(c, esperado[int(c) - 1] if int(c) <= len(esperado) else 0))
        if len(vs) != n_esp:
            probs.append(f"{c}: {len(vs)} versículos (esperado {n_esp})")
        for i, t in enumerate(vs, 1):
            if not t:
                probs.append(f"{c}:{i} vazio/faltando")
            elif len(t) < perfil["versiculo_min_caracteres"]:
                probs.append(f"{c}:{i} muito curto (possível corte): \"{t}\"")
            elif i < len(vs) and vs[i] and vs[i][0].islower() and not re.search(r"[.;:!?,»”'\")]$", t):
                probs.append(f"{c}:{i} pode estar cortado (próximo começa com minúscula)")
            if re.search(r"\b\d{1,3}\b", t) and perfil.get("alertar_numeros_no_texto", True):
                probs.append(f"{c}:{i} contém número no texto (verifique se não é nº de versículo/nota): \"{t[:60]}…\"")
    return probs


def cmd_validar(a):
    perfil = carregar_perfil(a.versao.upper(), a.perfil)
    pasta = SAIDA / a.versao.upper()
    arquivos = sorted(p for p in pasta.glob("*.json") if not p.stem.startswith("_")) if pasta.exists() else []
    if a.livros:
        arquivos = [pasta / f"{l}.json" for l in a.livros.split(",")]
    total_ok = 0
    relatorio = {}
    for arq in arquivos:
        if not arq.exists():
            print(f"  ✘ {arq.stem}: não extraído"); continue
        d = json.loads(arq.read_text(encoding="utf-8"))
        probs = validar_livro(d, perfil)
        relatorio[d["livro"]] = probs
        if probs:
            print(f"  ⚠ {d['nome']}: {len(probs)} divergência(s)")
            for p in probs[: a.max]:
                print("      -", p)
            if len(probs) > a.max:
                print(f"      … mais {len(probs) - a.max}")
        else:
            total_ok += 1
            print(f"  ✔ {d['nome']}: OK")
    (pasta / "_validacao.json").write_text(json.dumps(relatorio, ensure_ascii=False, indent=1), encoding="utf-8") if pasta.exists() else None
    print(f"\n{total_ok} livro(s) sem divergências de {len(arquivos)}.")
    print("Livros com divergência só são enviados com --aceitar-divergencias (depois de conferir).")


# ----------------------------------------------------------------------------
# 4) ENVIO PARA O FIRESTORE (Admin SDK)
# ----------------------------------------------------------------------------
def firestore_admin():
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        sys.exit("Instale as dependências: pip install -r requirements.txt")
    if os.environ.get("FIRESTORE_EMULATOR_HOST"):  # testes locais com o emulador
        from google.auth.credentials import AnonymousCredentials
        from google.cloud import firestore as gfs
        return gfs.Client(project=PROJETO, credentials=AnonymousCredentials()), firestore
    if not firebase_admin._apps:
        if True:
            cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            if not cred_path or not Path(cred_path).exists():
                sys.exit("Defina GOOGLE_APPLICATION_CREDENTIALS com o caminho da chave de serviço (fora do repositório).")
            if Path(cred_path).resolve().is_relative_to(RAIZ):
                sys.exit("A chave de serviço está DENTRO do repositório. Mova para fora antes de continuar.")
            firebase_admin.initialize_app(credentials.Certificate(cred_path), {"projectId": PROJETO})
    return firestore.client(), firestore


def cmd_enviar(a):
    versao = a.versao.upper()
    perfil = carregar_perfil(versao, a.perfil)
    db, fs = firestore_admin()
    pasta = SAIDA / versao
    livros = a.livros.split(",") if a.livros else [p.stem for p in sorted(pasta.glob("*.json")) if not p.stem.startswith("_")]
    meta_ref = db.collection("bible").document(versao).collection("meta").document("progresso")
    db.collection("bible").document(versao).set({"sigla": versao, "atualizadoEm": fs.SERVER_TIMESTAMP}, merge=True)
    enviados = 0
    for lid in livros:
        d = ler_json(versao, lid)
        if not d:
            print(f"  ✘ {lid}: não extraído"); continue
        probs = validar_livro(d, perfil)
        if probs and not a.aceitar_divergencias:
            print(f"  ✘ {d['nome']}: {len(probs)} divergência(s). Rode 'validar' e corrija, ou use --aceitar-divergencias.")
            continue
        livro_ref = db.collection("bible").document(versao).collection("books").document(lid)
        batch = db.batch(); n = 0
        for c, vs in d["capitulos"].items():
            batch.set(livro_ref.collection("chapters").document(c), {"livro": lid, "cap": int(c), "versiculos": vs})
            n += 1
            if n % 400 == 0:
                batch.commit(); batch = db.batch()
        # documento do livro inteiro (busca por palavra e leitura offline)
        batch.set(livro_ref, {"livro": lid, "nome": d["nome"], "capitulos": d["capitulos"], "atualizadoEm": fs.SERVER_TIMESTAMP})
        batch.commit()
        total_v = sum(len(v) for v in d["capitulos"].values())
        meta_ref.set({"livros": {lid: {"capitulos": len(d["capitulos"]), "versiculos": total_v,
                                       "importadoEm": dt.datetime.now().isoformat(timespec="seconds")}},
                      "atualizadoEm": fs.SERVER_TIMESTAMP}, merge=True)
        enviados += 1
        print(f"  ⬆ {versao} {d['nome']}: {len(d['capitulos'])} capítulos, {total_v} versículos")
    meta = meta_ref.get().to_dict() or {}
    meta_ref.set({"total": len(meta.get("livros", {}))}, merge=True)
    print(f"\n{enviados} livro(s) enviado(s). {versao}: {len(meta.get('livros', {}))} de 66 livros no Firestore.")


def cmd_status(a):
    db, _ = firestore_admin()
    for v in ([a.versao.upper()] if a.versao else ["KJA", "NTLH", "ACF"]):
        meta = db.collection("bible").document(v).collection("meta").document("progresso").get().to_dict() or {}
        livros = meta.get("livros", {})
        print(f"{v}: {len(livros)} de 66 livros")
        for l in CANON:
            if l["id"] in livros:
                i = livros[l["id"]]
                print(f"   ✔ {l['nome']:<18} {i['capitulos']:>3} cap · {i['versiculos']:>5} vers · {i['importadoEm']}")


# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("extrair"); p.add_argument("--versao", required=True); p.add_argument("--pdf", required=True)
    p.add_argument("--perfil"); p.add_argument("--livros", help="ex.: gn,ex (ids de livros)"); p.add_argument("--paginas", help="ex.: 1-40")
    p.add_argument("--sobrescrever", action="store_true"); p.set_defaults(f=cmd_extrair)
    p = sub.add_parser("amostra"); p.add_argument("--versao", required=True); p.add_argument("--ref", action="append"); p.set_defaults(f=cmd_amostra)
    p = sub.add_parser("validar"); p.add_argument("--versao", required=True); p.add_argument("--perfil"); p.add_argument("--livros")
    p.add_argument("--max", type=int, default=15); p.set_defaults(f=cmd_validar)
    p = sub.add_parser("enviar"); p.add_argument("--versao", required=True); p.add_argument("--perfil"); p.add_argument("--livros")
    p.add_argument("--aceitar-divergencias", action="store_true"); p.set_defaults(f=cmd_enviar)
    p = sub.add_parser("status"); p.add_argument("--versao"); p.set_defaults(f=cmd_status)
    a = ap.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
