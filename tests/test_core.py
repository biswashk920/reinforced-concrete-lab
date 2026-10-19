import json, pathlib
import pytest
from rc_beam import calc, optimise

G = json.loads((pathlib.Path(__file__).parent / "golden_cases.json").read_text())
BASE = G["optimise"]["input"]


def test_factored_moment():
    assert calc(BASE)["Mu"] == pytest.approx(1.5 * (20 + 25 * .3 * .5) * 36 / 8)


def test_cantilever_moment():
    assert calc({**BASE, "type": "cant"})["Mu"] == pytest.approx(1.5 * (20 + 3.75) * 36 / 2)


@pytest.mark.parametrize("fy,coef", [(250, .148), (415, .138), (500, .133)])
def test_limiting_moment_coefficient(fy, coef):
    r = calc({**BASE, "fy": fy})
    assert r["Ml"] / (25 * 300 * r["d"] ** 2 / 1e6) == pytest.approx(coef, abs=.002)


def test_capacity_covers_demand():
    r = calc(BASE)
    assert r["pass"] and r["Mcap"] >= r["Mu"]


def test_doubly_reinforced_when_over_limit():
    r = calc({**BASE, "w": 60, "D": 400})
    assert r["dbl"] and r["Asc"] > 0


def test_t_beam_needs_no_more_steel_than_rectangle():
    t, rect = calc({**BASE, "sect": "T", "w": 35}), calc({**BASE, "w": 35})
    assert t["fl"] and t["Areq"] <= rect["Areq"] and t["Mcap"] >= t["Mu"]


def test_optimiser_sorted_and_passing():
    o = optimise(BASE)
    assert o and all(a["cost"] <= b["cost"] for a, b in zip(o, o[1:])) and all(r["pass"] for r in o)


@pytest.mark.parametrize("case", G["cases"], ids=lambda c: c["name"])
def test_golden(case):
    r, e = calc(case["input"]), case["expected"]
    if "fail" in e:
        assert r["fail"] == e["fail"]
        return
    for k, v in e.items():
        assert (r[k] == pytest.approx(v, rel=1e-9)) if isinstance(v, float) else (r[k] == v), k


from rc_beam import column

CB = G["columns"][0]["input"]


def test_column_axial_capacity_formula():
    r = column(CB)
    assert r["pass"] and r["Puz"] == pytest.approx((.45 * 25 * (300 * 450 - r["As"]) + .75 * 500 * r["As"]) / 1e3)


def test_minimum_eccentricity_governs_light_moments():
    r = column({**CB, "Mx": 0, "My": 0})
    assert r["Mxd"] == pytest.approx(r["Pu"] * max(3200 / 500 + 450 / 30, 20) / 1e3)


def test_slender_column_adds_moment():
    assert column({**CB, "Lx": 5.5})["Max"] > 0


def test_more_load_needs_no_less_steel():
    a, b = column(CB), column({**CB, "P": 1000})
    assert a["pass"] and b["pass"] and b["As"] >= a["As"] and a["ratio"] <= 1


@pytest.mark.parametrize("case", G["columns"], ids=lambda c: c["name"])
def test_column_golden(case):
    r, e = column(case["input"]), case["expected"]
    if "fail" in e:
        assert r["fail"] == e["fail"]
        return
    for k, v in e.items():
        assert (r[k] == pytest.approx(v, rel=1e-9)) if isinstance(v, float) else (r[k] == v), k


from rc_beam.core import tau_c


@pytest.mark.parametrize("pt,fck,table", [(.5, 25, .49), (1.0, 25, .64), (1.0, 20, .62), (.5, 20, .48)])
def test_shear_strength_matches_table_19(pt, fck, table):
    assert tau_c(pt, fck) == pytest.approx(table, abs=.02)


def test_stirrup_zones_group_into_at_most_three_and_widen_to_midspan():
    z = calc({**BASE, "w": 120, "L": 3.5, "b": 350})["zones"]
    assert 1 < len(z) <= 3 and [a[2] for a in z] == sorted(a[2] for a in z)


def test_curtailment_keeps_at_least_half_the_bars():
    r = calc(BASE)
    assert r["ca"] and r["ca"][0] >= 2 and 0 <= r["ca"][2] < r["ca"][1]


def test_seismic_option_adds_member_checks():
    assert len(calc({**BASE, "eq": 1})["checks"]) == len(calc(BASE)["checks"]) + 4


from rc_beam import footing

FB = G["footings"][0]["input"]


def test_footing_soil_pressure_and_depth_rules():
    r = footing(FB)
    assert r["pass"] and r["qs"] <= FB["qa"] and r["D"] >= 300 and r["L"] * r["B"] * FB["qa"] >= FB["P"]


def test_eccentric_footing_is_larger_and_has_no_tension():
    a, b = footing(FB), footing({**FB, "type": "ecc", "M": 150})
    assert b["L"] * b["B"] >= a["L"] * a["B"] and b["qm"] >= 0 and b["qmx"] > b["qmn"]


def test_rectangular_footing_uses_central_band_rule():
    r = footing({**FB, "ratio": 1.5, "a": 300, "c": 600})
    assert r["beta"] > 1 and r["nC"] < r["nB"] and r["nC"] == -(-int(2 / (r["beta"] + 1) * r["nB"] * 1e6) // 1000000) or r["nC"] >= 2 / (r["beta"] + 1) * r["nB"] - 1e-9


@pytest.mark.parametrize("case", G["footings"], ids=lambda c: c["name"])
def test_footing_golden(case):
    r, e = footing(case["input"]), case["expected"]
    if "fail" in e:
        assert r["fail"] == e["fail"]
        return
    for k, v in e.items():
        assert (r[k] == pytest.approx(v, rel=1e-9)) if isinstance(v, float) else (r[k] == v), k


def test_matches_worked_example_sloped_footing():
    """Rectangular sloped footing, column 250 x 750 mm, 2000 kN, SBC 220 kN/m2, M20, Fe415 (published IS 456 worked example)."""
    r = footing({**FB, "type": "sloped", "P": 2000, "a": 750, "c": 250, "qa": 220, "fck": 20, "fy": 415, "dia": 12, "ratio": 3.45 / 2.95})
    assert (round(r["L"], 2), round(r["B"], 2)) == (3.45, 2.95)
    assert r["qu"] == pytest.approx(294.8, abs=.3)
    assert sorted([r["MuL"], r["MuB"]]) == pytest.approx([792.5, 926.8], abs=1.5)
    assert r["tcp"] == pytest.approx(.93, abs=.01) and r["Ld"] == pytest.approx(47 * 12, abs=1)


def test_wall_footing_width_and_checks():
    r = footing({**FB, "type": "wall", "P": 150, "a": 230, "qa": 150, "dia": 12})
    assert r["pass"] and r["B"] * 150 >= 150 and r["spM"] <= 300 and r["tv"] <= r["tc"]


def test_column_dowels_are_anchored_into_the_footing():
    r = footing(FB)
    assert r["extC"] >= 300 and r["Ldc"] < r["Ld"]


def test_combined_footing_centroid_on_resultant_and_moments_balance():
    r = footing({**FB, "type": "combined", "P": 1000, "P2": 1400, "a2": 400, "c2": 400, "S": 4.0, "pe": 0})
    assert r["pass"] and abs(r["L"] / 2 - r["p0"] - r["xb"]) < 1e-9 and r["Mneg"] > 0 and r["Mpos"] >= 0
    assert r["qs"] <= FB["qa"] and r["q"] >= .35


def test_pile_cap_uses_fewest_piles_and_respects_pile_capacity():
    r = footing({**FB, "type": "pilecap", "P": 1500, "Qp": 600, "pd": 450})
    assert r["n"] == 3 and r["Rs"] <= 600 and (1500 + r["Wf"]) / 2 > 600 and r["cov"] >= 100


def test_stepped_footing_is_lighter_than_flat_and_checks_the_step():
    s, f = footing({**FB, "type": "stepped", "P": 1500}), footing({**FB, "P": 1500})
    assert s["pass"] and s["vol"] <= f["vol"] * 1.05 and s["L2"] < s["L"] and s["stOK"]


def test_too_many_piles_is_reported():
    assert "More than 4 piles" in footing({**FB, "type": "pilecap", "P": 9000, "Qp": 500, "pd": 450})["fail"]
