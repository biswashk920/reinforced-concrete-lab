"""Combined (two-column) and pile-cap footings to IS 456:2000 cl. 34; docs/footing2.js is the browser copy.
Combined: plan centroid on the resultant of the service loads, longitudinal beam analysis (hogging between the columns, sagging at the
overhangs), transverse strips under each column, one-way shear at d, punching at d/2. Pile cap: 2, 3 or 4 piles, bending at the column face
from the pile reactions outside it, shear at d with partial pile contribution, punching at d/2 less the piles inside."""
import math
from .core import area, tau_c, TBD
from .footing import _ast, _n


def _dowel(a, c, fck, fy):
    dow = .005 * a * c
    dd = next((x for x in (12, 16, 20, 25, 32) if 4 * area(x) >= dow), 32)
    Ldc = dd * .87 * fy / (4 * TBD[fck] * 1.6 * 1.25)
    return dd, max(4, math.ceil(dow / area(dd))), Ldc, max(300, math.ceil(Ldc / 25 - 1e-9) * 25)


def _punch(Pu_i, q, a, c, dm, outside, fck):
    e = min(outside, dm / 2)
    if e >= dm / 2 - 1e-9:
        b0, ain = 2 * ((a + dm) + (c + dm)), (a + dm) * (c + dm)
    else:
        b0, ain = 2 * (a + dm / 2 + e) + (c + dm), (a + dm / 2 + e) * (c + dm)
    return (Pu_i - q * ain / 1e6) * 1e3 / (b0 * dm), min(1, .5 + min(a, c) / max(a, c)) * .25 * math.sqrt(fck)


def _cd(i, B, L, D, p0, q, S):
    a1, c1, a2, c2, fck, fy, dia, cov = (i[k] for k in ("a", "c", "a2", "c2", "fck", "fy", "dia", "cover"))
    Pu1, Pu2 = 1.5 * i["P"], 1.5 * i["P2"]
    w, x1, x2 = (Pu1 + Pu2) / L, p0, p0 + S

    def M(x):
        return w * x * x / 2 - Pu1 * max(x - x1, 0) - Pu2 * max(x - x2, 0)

    def V(x):
        return w * x - Pu1 * (1 if x > x1 else 0) - Pu2 * (1 if x > x2 else 0)

    d = D - cov - dia / 2
    dT = d - dia
    Mpos = max(M(x1 - a1 / 2e3), M(x2 + a2 / 2e3), 0)
    lo, hi = x1 + a1 / 2e3, x2 - a2 / 2e3
    if hi <= lo:
        return None
    Mneg = -min(min(M(lo + (hi - lo) * k / 200) for k in range(201)), 0)
    Ab, At = _ast(Mpos, B * 1e3, d, fck, fy), _ast(Mneg, B * 1e3, d, fck, fy)
    if Ab is None or At is None:
        return None
    nBot, nTop = _n(Ab, B * 1e3, d, dia, D, cov), _n(At, B * 1e3, d, dia, D, cov)
    Pb, Pt = nBot * area(dia), nTop * area(dia)
    secs = [min(max(x, 0), L) for x in (lo + d / 1e3, hi - d / 1e3, x1 - a1 / 2e3 - d / 1e3, x2 + a2 / 2e3 + d / 1e3)]
    Vm = max(abs(V(x)) for x in secs)
    tv, tc = Vm * 1e3 / (B * 1e3 * d), tau_c(100 * min(Pb, Pt) / (B * 1e3 * d), fck)
    strips = []
    for Pu_i, a, c in ((Pu1, a1, c1), (Pu2, a2, c2)):
        bs, lb = a + d, (B - c / 1e3) / 2
        A = _ast(Pu_i / B * lb * lb / 2, bs, dT, fck, fy)
        if A is None:
            return None
        nt = max(math.ceil(max(A, .0012 * bs * D) / area(dia)), math.ceil((bs - 2 * cov) / 300) + 1, 2)
        strips.append((bs, nt, math.floor((bs - 2 * cov) / (nt - 1) / 5) * 5))
    dm, qp = (d + dT) / 2, (Pu1 + Pu2) / (B * L)
    tp1, tc1 = _punch(Pu1, qp, a1, c1, dm, (p0 - a1 / 2e3) * 1e3, fck)
    tp2, tc2 = _punch(Pu2, qp, a2, c2, dm, (q - a2 / 2e3) * 1e3, fck)
    return dict(d=d, Mpos=Mpos, Mneg=Mneg, Ab=Ab, At=At, nBot=nBot, nTop=nTop, tv=tv, tc=tc, strips=strips, tp1=tp1, tc1=tc1, tp2=tp2, tc2=tc2,
                spBot=math.floor((B * 1e3 - 2 * cov) / (nBot - 1) / 5) * 5, spTop=math.floor((B * 1e3 - 2 * cov) / (nTop - 1) / 5) * 5,
                ok=tv <= tc and tp1 <= tc1 and tp2 <= tc2)


def combined(i):
    P1, P2, S = i["P"], i["P2"], i["S"]
    a1, c1, a2, c2, qa, fck, fy, dia, cov = (i[k] for k in ("a", "c", "a2", "c2", "qa", "fck", "fy", "dia", "cover"))
    xb = P2 * S / (P1 + P2)
    pmin, qmin = a1 / 2e3 + .15, a2 / 2e3 + .15
    Ld = dia * .87 * fy / (4 * TBD[fck] * 1.6)
    L = math.ceil(2 * (xb + max(i.get("pe") or 0, pmin)) / .05 - 1e-9) * .05
    p0, q = L / 2 - xb, L / 2 + xb - S
    while q < qmin or p0 < pmin:
        L += .05
        p0, q = L / 2 - xb, L / 2 + xb - S
    d1, d2 = _dowel(a1, c1, fck, fy), _dowel(a2, c2, fck, fy)
    Wf = .1 * (P1 + P2)
    for _ in range(8):
        B = max(math.ceil((P1 + P2 + Wf) / (qa * L) / .05 - 1e-9) * .05, max(c1, c2) / 1e3 + .3)
        while (B * 1e3 - max(c1, c2)) / 2 - cov + 8 * dia < Ld:
            B += .05
        if B > 8:
            return {"fail": "No combined footing satisfies the soil pressure; check the loads or bearing capacity", "pass": False}
        D = r = None
        for Dc in range(400, 2001, 25):
            t = _cd(i, B, L, Dc, p0, q, S)
            if t and t["ok"] and d1[3] and d1[2] <= Dc - cov - 2 * dia + 8 * d1[0] and d2[2] <= Dc - cov - 2 * dia + 8 * d2[0]:
                D, r = Dc, t
                break
        if D is None:
            return {"fail": "No depth up to 2000 mm satisfies bending, shear and punching; enlarge the columns, raise fck or reduce the loads", "pass": False}
        new = 25 * B * L * D / 1e3
        done = new <= Wf + 1e-9
        Wf = Wf if done else new
        if done:
            break
    Wact = 25 * B * L * D / 1e3
    qs = (P1 + P2 + Wact) / (B * L)
    checks = [qs <= qa, r["tv"] <= r["tc"], r["tp1"] <= r["tc1"], r["tp2"] <= r["tc2"], d1[2] <= D - cov - 2 * dia + 8 * d1[0], d2[2] <= D - cov - 2 * dia + 8 * d2[0]]
    vol = B * L * D / 1e3
    wt = dia * dia / 162 * (r["nBot"] + r["nTop"]) * (L * 1e3 - 2 * cov) / 1e3 + dia * dia / 162 * sum(s[1] for s in r["strips"]) * (B * 1e3 - 2 * cov) / 1e3
    out = dict(r, type="combined", L=L, B=B, D=D, p0=p0, q=q, xb=xb, qs=qs, Wf=Wact, Ld=Ld, dd1=d1[0], nd1=d1[1], ext1=d1[3], Ldc1=d1[2], dd2=d2[0], nd2=d2[1], ext2=d2[3], Ldc2=d2[2],
               vol=vol, wt=wt, cost=vol * i.get("rc", 9000) + wt * i.get("rs", 110), checks=checks)
    out["pass"] = all(checks)
    return out


def pilecap(i):
    P, a, c, Qp, pd = i["P"], i["a"], i["c"], i["Qp"], i["pd"]
    fck, fy, dia = i["fck"], i["fy"], i["dia"]
    cov = max(i["cover"], 100)
    s, e = 3 * pd, pd / 2 + 150
    Pu, Ld = 1.5 * P, dia * .87 * fy / (4 * TBD[fck] * 1.6)
    dd, nd, Ldc, ext = _dowel(a, c, fck, fy)
    Wf = .1 * P
    for _ in range(8):
        n = i.get("np") if i.get("np") in (2, 3, 4) else next((k for k in (2, 3, 4) if (P + Wf) / k <= Qp), None)
        if n is None:
            return {"fail": "More than 4 piles are needed; use a larger pile capacity or a layout with more piles (not included yet)", "pass": False}
        h = s * math.sqrt(3) / 2
        pts = {2: [(-s / 2, 0), (s / 2, 0)], 3: [(-s / 2, -h / 3), (s / 2, -h / 3), (0, 2 * h / 3)], 4: [(x * s / 2, z * s / 2) for x in (-1, 1) for z in (-1, 1)]}[n]
        L = math.ceil((s + 2 * e) / 25) * 25
        B = math.ceil({2: 2 * e, 3: h + 2 * e, 4: s + 2 * e}[n] / 25) * 25
        colZ = e + h / 3 if n == 3 else B / 2
        Ru, D = Pu / n, None
        for Dc in range(450, 2501, 25):
            d = Dc - cov - dia / 2
            dB = d - dia
            ML = sum(Ru * (x - a / 2) / 1e3 for x, z in pts if x > a / 2)
            MB = sum(Ru * (z - c / 2) / 1e3 for x, z in pts if z > c / 2)
            AL = _ast(ML, B, d, fck, fy) if ML > 0 else 0
            AB = _ast(MB, L, dB, fck, fy) if MB > 0 else 0
            if AL is None or AB is None:
                continue
            nL, nB = _n(AL, B, d, dia, Dc, cov), _n(AB, L, dB, dia, Dc, cov)
            VL = sum(Ru * min(1, max(0, .5 + (x - a / 2 - d) / pd)) for x, z in pts if x > 0)
            VB = sum(Ru * min(1, max(0, .5 + (z - c / 2 - dB) / pd)) for x, z in pts if z > 0)
            tvL, tcL = VL * 1e3 / (B * d), tau_c(100 * nL * area(dia) / (B * d), fck)
            tvB, tcB = VB * 1e3 / (L * dB), tau_c(100 * nB * area(dia) / (L * dB), fck)
            dm = (d + dB) / 2
            Vp = Pu - sum(Ru for x, z in pts if abs(x) <= (a + dm) / 2 and abs(z) <= (c + dm) / 2)
            tvp, tcp = Vp * 1e3 / (2 * ((a + dm) + (c + dm)) * dm), min(1, .5 + min(a, c) / max(a, c)) * .25 * math.sqrt(fck)
            if tvL <= tcL and tvB <= tcB and tvp <= tcp and Ldc <= Dc - cov - 2 * dia + 8 * dd:
                D = Dc
                break
        if D is None:
            return {"fail": "No depth up to 2500 mm satisfies bending, shear and punching; enlarge the column, raise fck or add piles", "pass": False}
        new = 25 * B * L * D / 1e9
        done = new <= Wf + 1e-9 or i.get("np")
        Wf = Wf if done else new
        if done:
            break
    Wact = 25 * B * L * D / 1e9
    Rs = (P + Wact) / n
    avail = L / 2 - a / 2 - cov + 8 * dia
    checks = [Rs <= Qp, tvL <= tcL, tvB <= tcB, tvp <= tcp, Ld <= avail, Ldc <= D - cov - 2 * dia + 8 * dd]
    vol = B * L * D / 1e9
    wt = dia * dia / 162 * (nL * (L - 2 * cov) + nB * (B - 2 * cov)) / 1e6
    out = dict(type="pilecap", n=n, pts=pts, s=s, e=e, L=L / 1e3, B=B / 1e3, D=D, colZ=colZ, Rs=Rs, Ru=Ru, ML=ML, MB=MB, nL=nL, nB=nB,
               spL=math.floor((B - 2 * cov) / (nL - 1) / 5) * 5, spB=math.floor((L - 2 * cov) / (nB - 1) / 5) * 5, tvL=tvL, tcL=tcL, tvB=tvB, tcB=tcB, tvp=tvp, tcp=tcp,
               Ld=Ld, avail=avail, dd=dd, nd=nd, Ldc=Ldc, ext=ext, Wf=Wact, vol=vol, wt=wt, cov=cov, cost=vol * i.get("rc", 9000) + wt * i.get("rs", 110), checks=checks)
    out["pass"] = all(checks)
    return out
