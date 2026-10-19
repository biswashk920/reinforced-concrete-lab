"""Regenerate golden_cases.json from the Python reference: python tests/make_golden.py"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from rc_beam import calc, optimise, column, footing

BASE = dict(type="ss", L=6, w=20, P=0, sw=1, b=300, D=500, cover=30, dia=20, sdia=8, fck=25, fy=500,
            sect="R", eq=0, Df=120, bs=3000, maxB=450, maxD=800, rc=9000, rs=110)
VAR = {"simply supported": {}, "cantilever": dict(type="cant", L=3, w=25),
       "continuous": dict(type="cont", L=7, w=30, P=40, D=550), "doubly reinforced": dict(w=60, D=400),
       "T-beam": dict(sect="T", w=35), "Fe250 M20": dict(fy=250, fck=20, w=15, dia=16),
       "Fe415 M30 with point load": dict(fy=415, fck=30, L=8, P=50, D=650), "too shallow": dict(D=100), "deep beam with side steel": dict(D=800, w=40), "ductile IS 13920": dict(eq=1, P=30), "heavy shear zones": dict(w=120, L=3.5, b=350)}
KEYS = ["Mu", "Vd", "Ml", "Areq", "n", "Aprov", "sv", "tc", "tv", "Mcap", "allow", "act", "Ld", "cost", "pass", "dbl", "Asc", "bf", "nst", "zs", "sideN", "ca"]
cases = []
for name, v in VAR.items():
    inp = {**BASE, **v}
    r = calc(inp)
    cases.append({"name": name, "input": inp, "expected": {"fail": r["fail"]} if "fail" in r else {k: r[k] for k in KEYS}})
o = optimise(BASE)
CB = dict(P=800, Mx=40, My=25, Lx=3.2, Ly=3.2, kf=1.0, b=300, D=450, cover=40, fck=25, fy=500, eq=0)
CV = {"short column": {}, "slender column": dict(Lx=5.5, Ly=5.5, b=400, D=500), "high axial load": dict(P=1500, Mx=30, My=20, b=400, D=500),
      "Fe415 M30": dict(fy=415, fck=30, P=1100, b=350, D=450), "fixed ends": dict(kf=.65, P=600), "too slender": dict(Lx=20, Ly=20), "ductile IS 13920": dict(eq=1, Lx=4.5, Ly=4.5)}
CK = ["Pu", "sx", "sy", "Mxd", "Myd", "Puz", "an", "M1", "M2", "ratio", "n", "dia", "tie", "sv", "As", "pt", "pass", "nb", "nd", "nties", "xt"]
cc = []
for name, v in CV.items():
    inp = {**CB, **v}
    r = column(inp)
    cc.append({"name": name, "input": inp, "expected": {"fail": r["fail"]} if "fail" in r else {k: r[k] for k in CK}})
    print(name, r.get("fail") or (r["n"], r["dia"], round(r["ratio"], 3)))
FB = dict(type="axial", P=1000, M=0, a=400, c=400, qa=200, ratio=1, fck=25, fy=500, dia=16, cover=50, rc=9000, rs=110)
FV = {"axial square": {}, "axial rectangular": dict(P=2000, a=600, c=300, ratio=1.5), "eccentric": dict(type="ecc", P=800, M=120),
      "light load": dict(P=300, dia=12, fck=20), "weak soil": dict(P=600, qa=100, fy=415), "too heavy": dict(P=60000, qa=100),
      "IS worked example, sloped": dict(type="sloped", P=2000, a=750, c=250, qa=220, fck=20, fy=415, dia=12, ratio=3.45 / 2.95),
      "sloped, square": dict(type="sloped", P=1200), "wall footing": dict(type="wall", P=150, a=230, qa=150, ratio=1, c=230, dia=12),
      "wall, weak soil": dict(type="wall", P=250, a=300, qa=80, c=300, dia=16),
      "stepped": dict(type="stepped"), "stepped heavy": dict(type="stepped", P=2500, a=500, c=500, ratio=1.2),
      "combined": dict(type="combined", P=1000, P2=1400, a2=400, c2=400, S=4.0, pe=0), "combined, edge column": dict(type="combined", P=800, P2=1800, a2=450, c2=450, S=3.5, pe=0.4, dia=20),
      "pile cap, 3 piles": dict(type="pilecap", P=1500, Qp=600, pd=450), "pile cap, 2 piles": dict(type="pilecap", P=1000, Qp=600, pd=450, dia=12),
      "pile cap, 4 piles": dict(type="pilecap", P=2000, Qp=600, pd=500, a=500, c=500), "pile cap, too many piles": dict(type="pilecap", P=9000, Qp=500, pd=450)}
FK = ["B", "L", "D", "nL", "nB", "nC", "spL", "spB", "MuL", "MuB", "tvL", "tcL", "tvB", "tcB", "tvp", "tcp", "Pbr", "Ld", "qs", "qm", "ndow", "ddia", "cost", "pass", "Ldc", "extC"]
fc = []
for name, v in FV.items():
    inp = {**FB, **v}
    r = footing(inp)
    keys = {"wall": ["B", "D", "spM", "spD", "Mu", "tv", "tc", "Ld", "qs", "cost", "pass"],
            "combined": ["L", "B", "D", "p0", "q", "Mpos", "Mneg", "nBot", "nTop", "tv", "tc", "tp1", "tc1", "tp2", "tc2", "qs", "cost", "pass"],
            "pilecap": ["n", "L", "B", "D", "ML", "MB", "nL", "nB", "tvL", "tcL", "tvp", "tcp", "Rs", "cost", "pass"]}.get(inp["type"], FK + (["D1", "L2", "B2"] if inp["type"] == "stepped" else []))
    fc.append({"name": name, "input": inp, "expected": {"fail": r["fail"]} if "fail" in r else {k: r[k] for k in keys}})
    print(name, r.get("fail") or (r.get("L"), r["B"], r["D"], r["pass"]))
out = {"cases": cases, "optimise": {"input": BASE, "top3": [[r["b"], r["D"]] for r in o[:3]]}, "columns": cc, "footings": fc}
pathlib.Path(__file__).with_name("golden_cases.json").write_text(json.dumps(out, indent=1))
print("wrote", len(cases), "cases")
