# Reinforced Concrete Lab: beams, columns and foundations (IS 456:2000)

**Live app: [biswashk920.github.io/reinforced-concrete-lab](https://biswashk920.github.io/reinforced-concrete-lab/)**

Design a reinforced concrete beam (rectangular or T), column or footing (isolated, sloped, stepped, wall, combined or pile cap) to IS 456:2000, with optional IS 13920 seismic detailing. You get clause-referenced checks, zoned stirrups, 2D diagrams, an interactive 3D view of the reinforcement cage, a bar schedule, and CSV and PNG downloads. Everything runs in your browser; no third-party scripts or fonts are loaded.

## How to use the app
1. **Pick a mode** at the top: Beam design, Column design or Foundation design. In Foundation mode pick the footing type (isolated under axial load, isolated with a moment, sloped or stepped isolated, wall strip, combined two-column, or pile cap); the plan size comes from the soil bearing capacity, then depth, bars, column bars and checks follow.
2. **Enter loads and size.** Loads are characteristic (unfactored); the app applies 1.5. Beam: span (m), UDL (kN/m), optional point load at midspan or tip. Column: axial load, moments about both axes, unsupported lengths, end condition.
3. **Choose materials.** Concrete grade (fck) and steel grade (fy). Turn on *Seismic detailing (IS 13920)* for closer stirrups or ties in the end zones.
4. **Press Design beam / Design column.** Green means every check passed; the check table shows each clause and how close it is.
5. **If a design fails,** enlarge the section, raise the concrete grade or reduce the load. For beams, *Find cheapest section* lists the lowest-cost passing sizes; press *Use* to apply one.
6. **Read the results.** *Provide* gives bars, stirrup zones and spacing; *Working* shows intermediate values.
7. **Explore the 3D view.** Drag to rotate, scroll or pinch to zoom, right-drag or Shift-drag to pan, arrow keys to rotate. Hover a bar or stirrup for its label. Use the layer boxes and opacity slider to see through the concrete, the preset buttons for Iso, Front, Side and Top, and *Play build* to watch the cage assemble.
8. **Move the section slider** to slide a cutting plane along the member and read shear, moment and stirrup spacing there.
9. **Download.** *Download CSV* saves inputs, results, checks, stirrup zones and a bar schedule. *Save PNG* saves the 3D view. *Print report* prints the page.

## Project layout
```
rc_beam/core.py, column.py, footing.py   reference implementations (Python)
docs/index.html              the live page; is456.js and column.js are browser copies of core.py and column.py
docs/viewer.js, scenes.js, foot_ui.js, footing.js    3D viewer, 3D scenes, bar schedules, CSV, footing UI and engine
tests/test_core.py           pytest: hand-checked cases plus golden cases
tests/test_web.js            checks the browser engines against the same golden cases
tests/golden_cases.json      expected values, made by tests/make_golden.py
```
Run locally: open `docs/index.html`. Tests: `pip install -r requirements.txt`, then `python -m pytest` and `node tests/test_web.js`.
Publish: Settings > Pages > Deploy from a branch > `main` / `/docs`.

If you change the method, edit the Python and JavaScript engines together, run `python tests/make_golden.py`, then both test suites.
Method, clauses and limits are in `docs/ASSUMPTIONS.md`. Not a validated package; have a qualified engineer verify real designs.
