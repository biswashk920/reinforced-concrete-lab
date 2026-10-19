"""RC column design to IS 456:2000 (cl. 25, 26.5.3, 39): rectangular section, steel split equally on two faces,
slenderness with additional moment, minimum eccentricity, axial-moment interaction by strain compatibility,
and biaxial check (cl. 39.6). docs/column.js is the browser copy."""
import math
from .core import area, fs_at


def _eps(x, y, D):
    return .0035 * (x - y) / x if x <= D else .002 * (x - y) / (x - 3 * D / 7)


def _cs(e, f):
    if e <= 0:
        return 0.0
    q = e / .002
    return .446 * f * (2 * q - q * q) if e < .002 else .446 * f


def layers(wc, hc, dc, depth, A):
    """Bar rows (distance from compressed face, area): wc bars in the top and bottom rows, hc rows over the depth."""
    return [(dc, wc * A), (depth - dc, wc * A)] + [(dc + (depth - 2 * dc) * j / (hc - 1), 2 * A) for j in range(1, hc - 1)]


def pm(x, b, D, fck, fy, bars):
    """Axial force (N, compression +) and moment about the centroid (N.mm) for neutral axis depth x."""
    N = 400
    h = min(x, D) / N
    F = M = 0.0
    for j in range(N):
        y = (j + .5) * h
        s = _cs(_eps(x, y, D), fck)
        F += s * b * h
        M += s * b * h * (D / 2 - y)
    for y, A in bars:
        e = _eps(x, y, D)
        f = A * (fs_at(abs(e), fy) * (1 if e > 0 else -1) - _cs(e, fck))
        F += f
        M += f * (D / 2 - y)
    return F, M


def capacity(P, b, D, fck, fy, bars):
    """Moment capacity (kN.m) at axial load P (kN); None if P exceeds the axial capacity."""
    lo, hi = .05 * D, 20 * D
    if pm(hi, b, D, fck, fy, bars)[0] / 1e3 < P:
        return None
    for _ in range(60):
        m = (lo + hi) / 2
        if pm(m, b, D, fck, fy, bars)[0] / 1e3 < P:
            lo = m
        else:
            hi = m
    return pm(hi, b, D, fck, fy, bars)[1] / 1e6


def column(i):
    """Units: kN, kN.m, m (lengths), mm. Loads are characteristic; factor 1.5 is applied here."""
    fck, fy, b, D, cov = (i[k] for k in ("fck", "fy", "b", "D", "cover"))
    Pu, Mx, My = 1.5 * i["P"], 1.5 * i["Mx"], 1.5 * i["My"]
    sx, sy = i["kf"] * i["Lx"] * 1e3 / D, i["kf"] * i["Ly"] * 1e3 / b
    Max = Pu * D * sx * sx / 2e6 if sx > 12 else 0.0
    May = Pu * b * sy * sy / 2e6 if sy > 12 else 0.0
    ex, ey = max(i["Lx"] * 1e3 / 500 + D / 30, 20), max(i["Ly"] * 1e3 / 500 + b / 30, 20)
    Mxd, Myd = max(Mx + Max, Pu * ex / 1e3), max(My + May, Pu * ey / 1e3)
    r = {"Pu": Pu, "sx": sx, "sy": sy, "Max": Max, "May": May, "ex": ex, "ey": ey, "Mxd": Mxd, "Myd": Myd, "pass": False}
    if sx > 60 or sy > 60:
        r["fail"] = "Too slender (effective length / dimension above 60, cl. 25.3.1)"
        return r
    cands = []
    for dia in (12, 16, 20, 25, 32):
        tie = next(t for t in (6, 8, 10, 12) if t >= dia / 4)
        for nb in range(2, 7):
            for nd in range(2, 9):
                n = 2 * nb + 2 * nd - 4
                As = n * area(dia)
                pt = 100 * As / (b * D)
                if pt > 4 or n > 32:
                    continue
                cb = (b - 2 * (cov + tie) - nb * dia) / (nb - 1)
                cd = (D - 2 * (cov + tie) - nd * dia) / (nd - 1)
                lo = max(dia, 25)
                if pt >= .8 and lo <= cb <= 300 and lo <= cd <= 300:
                    cands.append((As, dia, nb, nd, tie, cov + tie + dia / 2, pt))
    best, puzmax = None, 0.0
    for As, dia, nb, nd, tie, dc, pt in sorted(cands):
        Puz = (.45 * fck * (b * D - As) + .75 * fy * As) / 1e3
        puzmax = max(puzmax, Puz)
        if Pu > Puz:
            continue
        A1 = area(dia)
        M1, M2 = capacity(Pu, b, D, fck, fy, layers(nb, nd, dc, D, A1)), capacity(Pu, D, b, fck, fy, layers(nd, nb, dc, b, A1))
        if not M1 or not M2 or M1 <= 0 or M2 <= 0:
            continue
        z = Pu / Puz
        an = 1.0 if z <= .2 else 2.0 if z >= .8 else 1 + (z - .2) / .6
        ratio = (Mxd / M1) ** an + (Myd / M2) ** an
        best = ratio if best is None or ratio < best else best
        if ratio <= 1:
            sv = math.floor(min(b, D, 16 * dia, 300) / 5) * 5
            H = max(i["Lx"], i["Ly"])
            le = max(max(b, D), H * 1e3 / 6, 450)
            se = max(75, math.floor(min(min(b, D) / 4, 100) / 5) * 5)
            tpos, p = [], .05
            while p < H - .05 + 1e-9:
                tpos.append(p)
                p += (se if i.get("eq") and (p * 1e3 < le or (H - p) * 1e3 < le) else sv) / 1e3
            r.update(As=As, dia=dia, n=2 * nb + 2 * nd - 4, nb=nb, nd=nd, tie=tie, dc=dc, pt=pt, Puz=Puz, an=an, M1=M1, M2=M2,
                     ratio=ratio, sv=sv, se=se, le=le, tpos=tpos, nties=len(tpos), xt=(nb - 2) + (nd - 2), H=H)
            r["pass"] = True
            return r
    r.update(bestRatio=best, puzMax=puzmax)
    r["fail"] = "No bar arrangement satisfies the checks; increase the section or concrete grade"
    return r
