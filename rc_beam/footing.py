"""RC footing design to IS 456:2000 cl. 34: isolated (axial, axial + moment, sloped) and wall (strip) footings.
Flexure at the column face, one-way shear at d, punching at d/2 (cl. 31.6), sloping-depth shear (cl. 40.1.1),
central-band distribution 2/(beta+1) (cl. 34.3.1), development length, bearing and dowels (cl. 34.4).
docs/footing.js is the browser copy. Plan sizes in m, sections in mm. P and M are service values; 1.5 is applied here."""
import math
from .core import area, tau_c, TBD

E = 200000.0


def _ast(Mu, b, d, fck, fy):
    k = .0035 / (.0055 + .87 * fy / E)
    if Mu * 1e6 > .36 * k * (1 - .42 * k) * fck * b * d * d:
        return None
    return .5 * fck / fy * (1 - math.sqrt(1 - 4.6 * Mu * 1e6 / (fck * b * d * d))) * b * d


def _n(A, width, d, dia, D, cov):
    return max(math.ceil(max(A, .0012 * width * D) / area(dia)), math.ceil((width - 2 * cov) / min(3 * d, 300)) + 1, 2)


def _edge(D):
    return max(150, math.ceil(D * .25 / 25) * 25)


def _d1(D):
    return max(150, math.ceil(D * .5 / 25) * 25)


def _steps(i, B, L):
    return max(i["a"] / 1e3 + .3, math.ceil(L * .5 / .05 - 1e-9) * .05), max(i["c"] / 1e3 + .3, math.ceil(B * .5 / .05 - 1e-9) * .05)


def _vol(i, B, L, D):
    if i["type"] == "stepped":
        L2, B2 = _steps(i, B, L)
        return B * L * _d1(D) / 1e3 + L2 * B2 * (D - _d1(D)) / 1e3
    if i["type"] == "sloped":
        h, A1, A2 = (D - _edge(D)) / 1e3, B * L, i["a"] * i["c"] / 1e6
        return B * L * _edge(D) / 1e3 + h / 3 * (A1 + A2 + math.sqrt(A1 * A2))
    return B * L * D / 1e3


def _design(i, B, L, D):
    fck, fy, dia, cov, a, c = (i[k] for k in ("fck", "fy", "dia", "cover", "a", "c"))
    sl, De = i["type"] == "sloped", _edge(D)
    Pu = 1.5 * i["P"]
    e = i["M"] / i["P"] if i["type"] == "ecc" else 0.0
    qu = Pu / (B * L)
    qmx, qmn = qu * (1 + 6 * e / L), qu * (1 - 6 * e / L)
    dL = D - cov - dia / 2
    dB = dL - dia
    l, lb = (L - a / 1e3) / 2, (B - c / 1e3) / 2
    qf = qmx - (qmx - qmn) * l / L
    MuL = B * (qf * l * l / 2 + (qmx - qf) * l * l / 3)
    MuB = L * qu * lb * lb / 2
    AL, AB = _ast(MuL, B * 1e3, dL, fck, fy), _ast(MuB, L * 1e3, dB, fck, fy)
    if AL is None or AB is None:
        return None
    nL, nB = _n(AL, B * 1e3, dL, dia, D, cov), _n(AB, L * 1e3, dB, dia, D, cov)
    PL, PB = nL * area(dia), nB * area(dia)
    x = max(l - dL / 1e3, 0)
    qx = qmx - (qmx - qmn) * x / L
    VL = B * (qmx + qx) / 2 * x
    ds = dL
    if sl:
        ds = De + (D - De) * x / l - cov - dia / 2
        if ds <= 0:
            return None
        Ms = B * (qmx * x * x / 2 - (qmx - qmn) * x * x * x / (6 * L))
        tvL = (VL * 1e3 - Ms * 1e6 * ((D - De) / (l * 1e3)) / ds) / (B * 1e3 * ds)
    else:
        tvL = VL * 1e3 / (B * 1e3 * dL)
    tcL = tau_c(100 * PL / (B * 1e3 * ds), fck)
    xb = max(lb - dB / 1e3, 0)
    VB, ds = L * qu * xb, dB
    if sl:
        ds = De + (D - De) * xb / lb - cov - 1.5 * dia
        if ds <= 0:
            return None
        Ms = L * qu * xb * xb / 2
        tvB = (VB * 1e3 - Ms * 1e6 * ((D - De) / (lb * 1e3)) / ds) / (L * 1e3 * ds)
    else:
        tvB = VB * 1e3 / (L * 1e3 * dB)
    tcB = tau_c(100 * PB / (L * 1e3 * ds), fck)
    dp, dpp = (dL + dB) / 2, (dL + dB) / 2
    if sl:
        lm = min(l, lb)
        dpp = De + (D - De) * max(lm - dp / 2e3, 0) / lm - cov - 1.5 * dia
        if dpp <= 0:
            return None
    Vp = Pu - qu * (a + dp) * (c + dp) / 1e6
    tvp = Vp * 1e3 / (2 * ((a + dp) + (c + dp)) * dpp)
    tcp = min(1, .5 + min(a, c) / max(a, c)) * .25 * math.sqrt(fck)
    stOK, tvS, tcS = True, 0.0, 1.0
    if i["type"] == "stepped":
        L2, B2 = _steps(i, B, L)
        D1 = _d1(D)
        d1 = D1 - cov - dia / 2
        lsL, lsB = (L - L2) / 2, (B - B2) / 2
        d1B = d1 - dia
        if (L2 * 1e3 - a) / 2 < dp / 2 or (B2 * 1e3 - c) / 2 < dp / 2 or d1B <= 0:
            return None
        As, Bs = _ast(B * qu * lsL * lsL / 2, B * 1e3, d1, fck, fy), _ast(L * qu * lsB * lsB / 2, L * 1e3, d1B, fck, fy)
        if As is None or Bs is None:
            return None
        tvS, tcS = qu * B * max(lsL - d1 / 1e3, 0) * 1e3 / (B * 1e3 * d1), tau_c(100 * PL / (B * 1e3 * d1), fck)
        tvS2, tcS2 = qu * L * max(lsB - d1B / 1e3, 0) * 1e3 / (L * 1e3 * d1B), tau_c(100 * PB / (L * 1e3 * d1B), fck)
        stOK = As <= PL and Bs <= PB and tvS <= tcS and tvS2 <= tcS2
    return dict(stOK=stOK, tvS=tvS, tcS=tcS, Pu=Pu, e=e, qu=qu, qmx=qmx, qmn=qmn, dL=dL, dB=dB, MuL=MuL, MuB=MuB, AL=AL, AB=AB, nL=nL, nB=nB, PL=PL, PB=PB,
                tvL=tvL, tcL=tcL, tvB=tvB, tcB=tcB, tvp=tvp, tcp=tcp, l=l, lb=lb, De=De if sl else D)


def _wall(i):
    w, qa, a, fck, fy, dia, cov = (i[k] for k in ("P", "qa", "a", "fck", "fy", "dia", "cover"))
    Wf, Ld0 = .1 * w, dia * .87 * fy / (4 * TBD[fck] * 1.6)
    for _ in range(8):
        B = next((k * .05 for k in range(8, 161) if k * .05 * 1e3 >= a + 300 and (w + Wf) / (k * .05) <= qa and (k * 50 - a) / 2 - cov + 8 * dia >= Ld0), None)
        if B is None:
            return {"fail": "No wall footing up to 8 m wide satisfies the soil pressure; check the load or bearing capacity", "pass": False}
        l, qu, D = (B - a / 1e3) / 2, 1.5 * w / B, None
        for Dc in range(250, 1501, 25):
            d = Dc - cov - dia / 2
            A = _ast(qu * l * l / 2, 1000, d, fck, fy)
            if A is None:
                continue
            sp = math.floor(min(1000 * area(dia) / max(A, 1.2 * Dc), 3 * d, 300) / 5) * 5
            if qu * max(l - d / 1e3, 0) * 1e3 / (1000 * d) <= tau_c(100 * 1000 * area(dia) / sp / (1000 * d), fck):
                D = Dc
                break
        if D is None:
            return {"fail": "No depth up to 1500 mm satisfies bending and shear; raise fck, widen the wall or reduce the load", "pass": False}
        new = 25 * B * D / 1e3
        done = new <= Wf + 1e-9
        Wf = Wf if done else new
        if done:
            break
    d = D - cov - dia / 2
    Mu = qu * l * l / 2
    A = max(_ast(Mu, 1000, d, fck, fy), 1.2 * D)
    sp = math.floor(min(1000 * area(dia) / A, 3 * d, 300) / 5) * 5
    Ap = 1000 * area(dia) / sp
    tv = qu * max(l - d / 1e3, 0) * 1e3 / (1000 * d)
    tc = tau_c(100 * Ap / (1000 * d), fck)
    spD = math.floor(min(1000 * area(dia) / (1.2 * D), 5 * d, 450) / 5) * 5
    Ld = dia * .87 * fy / (4 * TBD[fck] * 1.6)
    avail = l * 1e3 - cov + 8 * dia
    Wact = 25 * B * D / 1e3
    qs = (w + Wact) / B
    checks = [qs <= qa, tv <= tc, Ld <= avail]
    r = dict(B=B, D=D, l=l, qu=qu, Mu=Mu, Ast=A, spM=sp, spD=spD, tv=tv, tc=tc, Ld=Ld, avail=avail, Wf=Wact, qs=qs, checks=checks,
             vol=B * D / 1e3, wt=dia * dia / 162 * (1000 / sp + 1000 / spD * B) * 1.0, type="wall")
    r["cost"] = r["vol"] * i.get("rc", 9000) + r["wt"] * i.get("rs", 110)
    r["pass"] = all(checks)
    return r


def footing(i):
    if i["type"] == "wall":
        return _wall(i)
    P, qa, a, c, cov, dia, fck, fy = (i[k] for k in ("P", "qa", "a", "c", "cover", "dia", "fck", "fy"))
    ratio = max(i.get("ratio") or 1, 1)
    e = i["M"] / P if i["type"] == "ecc" else 0.0
    Wf, Ld0 = .1 * P, dia * .87 * fy / (4 * TBD[fck] * 1.6)
    dow0 = .005 * a * c
    dd0 = next((x for x in (12, 16, 20, 25, 32) if 4 * area(x) >= dow0), 32)
    Ldc0 = dd0 * .87 * fy / (4 * TBD[fck] * 1.6 * 1.25)
    for _ in range(8):
        B = L = None
        for k in range(8, 161):
            Bc, Lc = k * .05, math.ceil(k * ratio - 1e-9) * .05
            if Bc * 1e3 < c + 300 or Lc * 1e3 < a + 300 or e > Lc / 6 or (Lc * 1e3 - a) / 2 - cov + 8 * dia < Ld0 or (Bc * 1e3 - c) / 2 - cov + 8 * dia < Ld0:
                continue
            if (P + Wf) / (Bc * Lc) * (1 + 6 * e / Lc) <= qa:
                B, L = Bc, Lc
                break
        if B is None:
            return {"fail": "No footing up to 8 m satisfies the soil pressure; check the load or bearing capacity", "pass": False}
        D = d = None
        for Dc in range(300, 2001, 25):
            d = _design(i, B, L, Dc)
            if d and d["tvL"] <= d["tcL"] and d["tvB"] <= d["tcB"] and d["tvp"] <= d["tcp"] and Ldc0 <= Dc - cov - 2 * dia + 8 * dd0 and d["stOK"]:
                D = Dc
                break
        if D is None:
            return {"fail": "No depth up to 2000 mm satisfies bending, shear and punching; enlarge the column, raise fck or reduce the load", "pass": False}
        new = 25 * _vol(i, B, L, D)
        done = new <= Wf + 1e-9
        Wf = Wf if done else new
        if done:
            break
    A1, A2 = min(B * L * 1e6, (a + 4 * D) * (c + 4 * D)), a * c
    Pbr = .45 * fck * min(math.sqrt(A1 / A2), 2) * A2 / 1e3
    Ld = dia * .87 * fy / (4 * TBD[fck] * 1.6)
    avail = min(d["l"], d["lb"]) * 1e3 - cov + 8 * dia  # 90 degree bend at the bar end counts 8 dia (cl. 26.2.2.1)
    Wact = 25 * _vol(i, B, L, D)
    qs = (P + Wact) / (B * L) * (1 + 6 * e / L)
    qm = (P + Wact) / (B * L) * (1 - 6 * e / L)
    beta = L / B
    nC = math.ceil(2 / (beta + 1) * d["nB"] - 1e-9)
    dow = .005 * a * c
    ddia = next((x for x in (12, 16, 20, 25, 32) if 4 * area(x) >= dow), 32)
    ndow = max(4, math.ceil(dow / area(ddia)))
    Ldc = ddia * .87 * fy / (4 * TBD[fck] * 1.6 * 1.25)  # compression bars: bond stress x 1.25 (cl. 26.2.1.1)
    extC = max(300, math.ceil(Ldc / 25 - 1e-9) * 25)
    spL = math.floor((B * 1e3 - 2 * cov) / (d["nL"] - 1) / 5) * 5
    spB = math.floor((L * 1e3 - 2 * cov) / (d["nB"] - 1) / 5) * 5
    vol = _vol(i, B, L, D)
    wt = dia * dia / 162 * (d["nL"] * (L * 1e3 - 2 * cov) + d["nB"] * (B * 1e3 - 2 * cov)) / 1e3 + ddia * ddia / 162 * ndow * (D - cov + extC) / 1e3
    checks = [qs <= qa, qm >= 0, d["tvL"] <= d["tcL"], d["tvB"] <= d["tcB"], d["tvp"] <= d["tcp"], Pbr >= d["Pu"], Ld <= avail,
              Ldc <= D - cov - 2 * dia + 8 * ddia, d["stOK"]]
    L2, B2 = _steps(i, B, L) if i["type"] == "stepped" else (L, B)
    r = dict(d, D1=_d1(D), L2=L2, B2=B2, B=B, L=L, D=D, Wf=Wact, qs=qs, qm=qm, Pbr=Pbr, Ld=Ld, avail=avail, beta=beta, nC=nC, nSide=d["nB"] - nC, dow=dow, ddia=ddia,
             ndow=ndow, Ldc=Ldc, extC=extC, spL=spL, spB=spB, vol=vol, wt=wt, cost=vol * i.get("rc", 9000) + wt * i.get("rs", 110), checks=checks)
    r["pass"] = all(checks)
    return r
