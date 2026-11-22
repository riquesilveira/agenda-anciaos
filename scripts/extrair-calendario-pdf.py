#!/usr/bin/env python3
"""
Extrai o calendário anual da Associação (PDF em grade mensal, como o
"Calendário de Eventos ANP 2027") para JSON, pronto para `npm run importar`.

    pip install pdfplumber
    python3 scripts/extrair-calendario-pdf.py Calendario_ANP_2027.pdf dados/associacao-2027.json

Como funciona: o PDF tem texto real. Cada mês é uma página; a cor do texto
indica a origem (legenda "FILTRAR POR ORIGEM": ANP, USB, DSA, NACIONAL,
COMISSÕES); a posição indica o dia. Eventos iguais em dias seguidos viram um
evento só, com data_fim (ex: Missão Calebe 16/01 a 29/01).

Se a Associação mudar o layout do PDF, os números de tamanho de fonte
(16 = mês, 8.1 = dia, 5.7 = evento) e de coluna podem precisar de ajuste.
"""
import json, re, sys
from collections import defaultdict
from datetime import date, timedelta

import pdfplumber

MESES = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"]
COL_X0 = 47     # borda esquerda da grade
COL_W = 99.2    # largura de cada coluna (dia da semana)

SIGLAS = {"ANP","USB","DSA","MDA","JA","MJA","MC","MM","MA","MCA","MF","MP","NT","OYM","PAMP","PGP","FAP","CPB",
          "MIPES","AFAM","LDR","MGÁ","DBV","AVT","MEL","MAP","CADE","GEPEA","EDMC","UNASP","ASA","SC","VI","I","(S)"}
MINUSCULAS = {"de","da","do","das","dos","e","em","na","no","nas","nos","a","o","as","os","para","com","ao"}

def titulo_bonito(texto):
    """'MISSÃO CALEBE - LOCAL' -> 'Missão Calebe - Local', mantendo siglas."""
    palavras = texto.split(" ")
    saida = []
    for i, p in enumerate(palavras):
        base = p.strip("(),.:")
        if base in SIGLAS or p in SIGLAS or re.fullmatch(r"[\d/º()]+", base or "0"):
            saida.append(p)
        elif i > 0 and p.lower() in MINUSCULAS:
            saida.append(p.lower())
        else:
            # maiúscula na 1ª letra de cada pedaço: "ON-LINE" -> "On-Line", "(DISTRITAIS" -> "(Distritais"
            saida.append(re.sub(r"(^|[-/(])(\w)", lambda m: m.group(1) + m.group(2).upper(), p.lower()))
    return " ".join(saida).rstrip(".")

def coluna(w): return int((w["x0"] - COL_X0) // COL_W)

def cor(c): return tuple(round(x, 2) for x in c) if c else None

def extrair_por_dia(caminho, ano):
    eventos = []
    pdf = pdfplumber.open(caminho)
    for page in pdf.pages:
        words = page.extract_words(extra_attrs=["non_stroking_color", "size"])
        titulo = [w["text"] for w in words if round(w["size"]) == 16]
        if not titulo or titulo[0] not in MESES:
            continue
        mes = MESES.index(titulo[0]) + 1
        legenda = {}
        for w in words:
            if abs(w["top"] - 94) < 3 and w["text"] not in ("FILTRAR", "POR", "ORIGEM:"):
                legenda[cor(w["non_stroking_color"])] = w["text"]
        dias = [w for w in words if round(w["size"], 1) == 8.1 and w["text"].isdigit()]
        textos = [w for w in words if round(w["size"], 1) == 5.7]
        celulas = defaultdict(list)
        for t in textos:
            cand = [d for d in dias if coluna(d) == coluna(t) and d["top"] < t["top"]]
            if not cand:
                print(f"aviso: texto fora da grade em {mes:02d}: {t['text']}", file=sys.stderr)
                continue
            celulas[int(max(cand, key=lambda d: d["top"])["text"])].append(t)
        for dia, ws in sorted(celulas.items()):
            ws.sort(key=lambda w: (round(w["top"]), w["x0"]))
            linhas = []
            for w in ws:
                if linhas and abs(linhas[-1]["top"] - w["top"]) < 2 and linhas[-1]["cor"] == cor(w["non_stroking_color"]):
                    linhas[-1]["texto"] += " " + w["text"]
                else:
                    linhas.append({"top": w["top"], "texto": w["text"], "cor": cor(w["non_stroking_color"])})
            # linhas próximas (< 8pt) e da mesma cor são o mesmo evento quebrado
            evs = []
            for l in linhas:
                if evs and l["top"] - evs[-1]["ultimo"] < 8 and evs[-1]["cor"] == l["cor"]:
                    atual = evs[-1]["texto"]
                    if atual.endswith("-") and not atual.endswith(" -"):
                        evs[-1]["texto"] = atual[:-1] + l["texto"]  # "ORA-" + "ÇÃO"
                    else:
                        evs[-1]["texto"] = atual + " " + l["texto"]
                    evs[-1]["ultimo"] = l["top"]
                else:
                    evs.append({"texto": l["texto"], "cor": l["cor"], "ultimo": l["top"]})
            for e in evs:
                eventos.append({"data": date(ano, mes, dia), "titulo": e["texto"], "fonte": legenda.get(e["cor"], "?")})
    return eventos

def juntar_dias_seguidos(eventos):
    grupos = {}
    for x in eventos:
        grupos.setdefault((x["titulo"], x["fonte"]), set()).add(x["data"])
    saida = []
    for (titulo, fonte), datas in grupos.items():
        datas = sorted(datas)
        ini = ant = datas[0]
        for d in datas[1:] + [None]:
            if d is not None and d - ant == timedelta(days=1):
                ant = d
                continue
            saida.append({
                "data": ini.isoformat(),
                "data_fim": ant.isoformat() if ant != ini else None,
                "titulo": titulo_bonito(titulo),
                "titulo_original": titulo,
                "fonte": fonte,
            })
            if d is not None:
                ini = ant = d
    saida.sort(key=lambda x: (x["data"], x["titulo"]))
    return saida

if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    entrada, saida = sys.argv[1], sys.argv[2]
    ano = int(re.search(r"20\d\d", entrada).group()) if re.search(r"20\d\d", entrada) else date.today().year + 1
    por_dia = extrair_por_dia(entrada, ano)
    eventos = juntar_dias_seguidos(por_dia)
    json.dump({"ano": ano, "origem": "associacao", "eventos": eventos}, open(saida, "w"), ensure_ascii=False, indent=1)
    print(f"{len(por_dia)} registros por dia -> {len(eventos)} eventos em {saida}", file=sys.stderr)
