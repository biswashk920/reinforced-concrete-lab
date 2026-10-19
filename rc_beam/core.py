"""RC beam design to IS 456:2000 (rectangular and T-beams). Reference implementation.
docs/is456.js is the browser copy; tests/golden_cases.json keeps the two in agreement."""
import math

E = 200000.0
TMAX = {20: 2.8, 25: 3.1, 30: 3.5, 35: 3.7, 40: 4.0}   # Table 20
TBD = {20: 1.2, 25: 1.4, 30: 1.5, 35: 1.7, 40: 1.9}    # cl. 26.2.1.1, plain bars


def area(d):
    return math.pi * d * d / 4


def tau_c(pt, fck):
    """Design shear strength of concrete (IS 456 Table 19, closed-form fit)."""
    be = max(.8 * fck / (6.89 * min(pt, 3)), 1)
    return .85 * math.sqrt(.8 * fck) * (math.sqrt(1 + 5 * be) - 1) / (6 * be)


def fs_at(eps, fy):
    """Design steel stress at a strain (Fig. 23B); mild steel is elastic-plastic."""
    fd = .87 * fy
    if fy <= 250:
        return min(eps * E, fd)
    pts = [(r * fd / E + inel, r * fd) for r, inel in
           ((.8, 0), (.85, 1e-4), (.9, 3e-4), (.95, 7e-4), (.975, 1e-3), (1, 2e-3))]
    if eps <= pts[0][0]:
        return eps * E
    for j in range(1, len(pts)):
        if eps <= pts[j][0]:
            (a0, a1), (b0, b1) = pts[j - 1], pts[j]
            return a1 + (b1 - a1) * (eps - a0) / (b0 - a0)
    return fd


def _fail(r, msg):
    r.update(fail=msg)
    r["pass"] = False
    return r


def calc(i):
    """Design one section. Units: m, kN, mm, N/mm2. Returns a dict; 'fail' is set if no design exists."""
    L, b, D, cover, dia, sdia, fck, fy = (i[k] for k in ("L", "b", "D", "cover", "dia", "sdia", "fck", "fy"))
    d = D - cover - sdia - dia / 2
    dc = cover + sdia + dia / 2
    r = {"d": d, "dc": dc}
    if d <= 60 or L <= 0:
        return _fail(r, "Section too shallow or span invalid")
    sw = 25 * b * D / 1e6 if i["sw"] else 0
    wu, Pu, t = 1.5 * (i["w"] + sw), 1.5 * i["P"], i["type"]
    if t == "ss":
        Mu, V0, basic = wu * L * L / 8 + Pu * L / 4, wu * L / 2 + Pu / 2, 20
    elif t == "cant":
        Mu, V0, basic = wu * L * L / 2 + Pu * L, wu * L + Pu, 7
    else:
        Mu, V0, basic = wu * L * L / 12 + Pu * L / 8, .6 * (wu * L + Pu), 26
    Vd = max(V0 - wu * d / 1e3, 0)
    k = .0035 / (.0055 + .87 * fy / E)
    Ml = .36 * k * (1 - .42 * k) * fck * b * d * d / 1e6
    fd = .87 * fy
    fl, Df = i["sect"] == "T" and t != "cant", i["Df"]
    bf = max(b, min((L * 1e3 if t == "ss" else .7 * L * 1e3) / 6 + b + 6 * Df, i["bs"])) if fl else b

    def yf(x):
        return Df if Df <= .2 * d else .15 * x + .65 * Df

    def M(x):  # moment of resistance of a flanged section, kN.m (Annex G-2.2)
        if x <= Df:
            return .36 * fck * bf * x * (d - .42 * x) / 1e6
        return (.36 * fck * b * x * (d - .42 * x) + .45 * fck * (bf - b) * yf(x) * (d - yf(x) / 2)) / 1e6

    def Cf(x):  # compressive force, N
        return .36 * fck * bf * x if x <= Df else .36 * fck * b * x + .45 * fck * (bf - b) * yf(x)

    def bis(f, target, hi):
        lo = 0.0
        for _ in range(60):
            m = (lo + hi) / 2
            if f(m) < target:
                lo = m
            else:
                hi = m
        return hi

    dbl = Mu > Ml and not fl
    Ast = Asc = fsc = xT = 0.0
    if fl:
        if M(k * d) < Mu:
            return _fail(r, "T-section too small: increase depth or flange (flange compression steel not supported)")
        xT = bis(M, Mu, k * d)
        Ast = Cf(xT) / fd
    elif not dbl:
        Ast = .5 * fck / fy * (1 - math.sqrt(1 - 4.6 * Mu * 1e6 / (fck * b * d * d))) * b * d
    else:
        xu = k * d
        if dc >= xu:
            return _fail(r, "d' is too large for compression steel; increase D")
        fsc = fs_at(.0035 * (1 - dc / xu), fy)
        Asc = (Mu - Ml) * 1e6 / ((fsc - .446 * fck) * (d - dc))
        Ast = Ml * 1e6 / (fd * (d - .42 * xu)) + Asc * (fsc - .446 * fck) / fd
    Amin, Amax = .85 * b * d / fy, .04 * b * D
    Areq = max(Ast, Amin)
    n = max(2, math.ceil(Areq / area(dia)))
    Aprov = n * area(dia)
    clear, minsp = (b - 2 * (cover + sdia) - n * dia) / (n - 1), max(dia, 25)
    nc = max(2, math.ceil(Asc / area(dia))) if dbl else 0
    xuA = min(fd * Aprov / (.36 * fck * b), k * d)
    if dbl:
        Mcap = Ml + (fsc - .446 * fck) * nc * area(dia) * (d - dc) / 1e6
    elif fl:
        Mcap = M(bis(Cf, fd * Aprov, k * d))
    else:
        Mcap = fd * Aprov * (d - .42 * xuA) / 1e6
    pt = 100 * Aprov / (b * d)
    be = max(.8 * fck / (6.89 * min(pt, 3)), 1)
    tc = .85 * math.sqrt(.8 * fck) * (math.sqrt(1 + 5 * be) - 1) / (6 * be)   # Table 19 fit
    tv = Vd * 1e3 / (b * d)
    Asv = 2 * area(sdia)
    sv = svmax = min(.75 * d, 300, .87 * fy * Asv / (.4 * b))
    if tv > tc:
        sv = min(svmax, .87 * fy * Asv * d / (Vd * 1e3 - tc * b * d))
    sv = math.floor(sv / 5) * 5
    fs = .58 * fy * Areq / Aprov
    pc = 100 * (nc * area(dia)) / (b * d)
    kc = min(1 + pc / (pc + 3), 1.5)
    kt = min(2, 1 / (.225 + .00322 * fs - .625 * math.log10(1 / pt)))
    kf = .8 + .2 * min(1, max(0, (b / bf - .3) / .7)) if fl else 1
    allow, act = basic * kt * kc * kf, L * 1000 / d
    Ld = dia * fd / (4 * TBD[fck] * (1.6 if fy > 250 else 1))
    slim = min(25 * b, 100 * b * b / d) if t == "cant" else min(60 * b, 250 * b * b / d)
    # Shear zones (cl. 40, 26.5.1.5-6); IS 13920 cl. 6.3.5 end zones if i['eq']
    def Vx(x):
        return wu * (L - x) + Pu if t == "cant" else max(V0 - wu * min(x, L - x), 0)

    def zone_s(x):
        v, s = Vx(max(x, d / 1e3)), svmax
        if v * 1e3 / (b * d) > tc:
            s = min(svmax, .87 * fy * Asv * d / (v * 1e3 - tc * b * d))
        s = max(75, math.floor(s / 25) * 25)
        if i.get("eq"):
            s = min(s, math.floor(d / 2 / 5) * 5)
            if x * 1e3 < 2 * d or (t != "cant" and (L - x) * 1e3 < 2 * d):
                s = min(s, math.floor(min(d / 4, 8 * dia, 100) / 5) * 5)
        return s

    Hh, zones = (L if t == "cant" else L / 2), []
    for q in range(40):
        x0, x1 = Hh * q / 40, Hh * (q + 1) / 40
        s = zone_s(x0)
        if zones and zones[-1][2] == s:
            zones[-1][1] = x1
        else:
            zones.append([x0, x1, s])
    levels = sorted({z[2] for z in zones})
    lo_s, hi_s = levels[0], levels[-1]
    mid_s = math.floor((lo_s + hi_s) / 2 / 25) * 25
    bands = [lo_s] + ([mid_s] if lo_s < mid_s < hi_s else []) + ([hi_s] if hi_s > lo_s else [])
    grouped = []
    for x0, x1, s in zones:  # group into at most three practical bands, never wider than required
        s2 = max(v for v in bands if v <= s)
        if grouped and grouped[-1][2] == s2:
            grouped[-1][1] = x1
        else:
            grouped.append([x0, x1, s2])
    zones = grouped
    pos, p = [], .05
    for _, x1, s in zones:
        while p < x1 - 1e-9:
            pos.append(p)
            p += s / 1e3
    if t != "cant":
        pos = [v for _, v in sorted({int(round(q * 1e6)): q for q in pos + [L - q for q in pos]}.items())]
    sv = min(z[2] for z in zones)
    sideDia = 10 if D > 750 else 0
    sideN = max(math.ceil(.0005 * b * D / area(10)), math.ceil((D - 2 * dc) / min(300, b)) - 1, 1) if sideDia else 0
    checks = [Mu <= Mcap + 1e-6, Aprov <= Amax, clear >= minsp, tv <= TMAX[fck], sv >= 75, act <= allow, L * 1000 <= slim]
    def Mxx(x):
        return wu * x * (L - x) / 2 + Pu * min(x, L - x) / 2

    ca, Mk = None, Mcap
    if t == "ss" and not fl and not dbl and n >= 4:  # curtailment (cl. 26.2.3.2-3), simply supported only
        keep = max(2, math.ceil(n / 2))
        Ak = keep * area(dia)
        Mk = fd * Ak * (d - .42 * min(fd * Ak / (.36 * fck * b), k * d)) / 1e6
        if Mk < Mxx(L / 2):
            a, h = 0.0, L / 2
            for _ in range(60):
                m = (a + h) / 2
                if Mxx(m) < Mk:
                    a = m
                else:
                    h = m
            ca = [keep, round(h, 6), round(max(h - max(d, 12 * dia) / 1e3, 0.0), 6)]
    Lo = min((i.get("sup") or 230) / 2 - cover, max(d, 12 * dia))
    anc = 1.3 * (Mk if ca else Mcap) * 1e6 / (V0 * 1e3) + Lo if V0 > 0 else 1e9
    checks.append(t == "cant" or Ld <= anc)
    if i.get("eq"):  # IS 13920 member checks (cl. 6.1, 6.2)
        checks += [b >= 200, b / D >= .3, .24 * math.sqrt(fck) / fy * 100 <= pt <= 2.5, sdia >= 8]
    vol, nst = b * D / 1e6 * L, len(pos)
    wt = 7.85e-3 * (Aprov * L + (nc or 2) * area(dia if nc else 12) * L) + area(sdia) * 2 * (b + D - 4 * cover + 100) * 7.85e-6 * nst
    r.update(ca=ca, zones=zones, zs=[z[2] for z in zones], pos=pos, nst=nst, sideN=sideN, sideDia=sideDia, V0=V0, nc=nc, fl=fl, bf=bf, xT=xT, sw=sw, wu=wu, Mu=Mu, Vd=Vd, Ml=Ml, dbl=dbl, Asc=Asc, fsc=fsc, Areq=Areq, n=n,
             Aprov=Aprov, clear=clear, Mcap=Mcap, pt=pt, tc=tc, tv=tv, sv=sv, allow=allow, act=act, Ld=Ld, vol=vol, wt=wt,
             cost=vol * i.get("rc", 9000) + wt * i.get("rs", 110), checks=checks)
    r["pass"] = all(checks)
    return r


def optimise(i):
    """Cheapest sections (b 200..maxB step 25, D 300..maxD step 50) that pass every check."""
    out = []
    for b in range(200, int(i["maxB"]) + 1, 25):
        for D in range(300, int(i["maxD"]) + 1, 50):
            r = calc({**i, "b": b, "D": D})
            if "fail" not in r and r["pass"]:
                out.append({**r, "b": b, "D": D})
    return sorted(out, key=lambda r: r["cost"])[:8]
