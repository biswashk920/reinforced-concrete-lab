# Method and assumptions (IS 456:2000)
- Flexure: Annex G. xu,max/d = 0.0035/(0.0055+0.87fy/Es). Doubly reinforced uses the Fig. 23B stress-strain curve for fsc.
- T-beams: Annex G-2.2 with yf rule, effective flange width cl. 23.1.2 (lo = L simply supported, 0.7L continuous). Sagging only; flange compression steel not supported.
- Shear: tau_c = 0.85*sqrt(0.8fck)*(sqrt(1+5B)-1)/(6B), B = max(0.8fck/(6.89pt),1), pt capped at 3. Tau_c,max from Table 20. Check at d from the support.
- Deflection: basic L/d 20, 7, 26; kt is a curve fit of Fig. 4; kc from Fig. 5; flanged factor approximates Fig. 6.
- Development length: Ld = phi*0.87fy/(4*tau_bd), tau_bd x 1.6 for deformed bars.
- Loads: one UDL (self-weight optional) and one central or tip point load. Continuous beams use approximate coefficients (wL^2/12, 0.6V), not Table 12.
- Not covered: torsion, curtailment, anchorage detailing, seismic detailing (IS 13920), fire and exposure cover, flange compression steel.

## Columns (rc_beam/column.py, docs/column.js)
- Slenderness cl. 25.1.2 (limit 12), additional moment cl. 39.7.1 without the k reduction, minimum eccentricity cl. 25.4, limit 60 on le/dimension.
- Interaction by strain compatibility (cl. 38.1 stress block, 0.002 strain at 3D/7 when xu > D), 400 strips; compression steel stress reduced by 0.446 fck.
- Biaxial: (Mux/Mux1)^an + (Muy/Muy1)^an <= 1, an from Pu/Puz (cl. 39.6). Steel split equally on two opposite faces.
- Ties: size at least dia/4 and 6 mm, spacing at most min(b, D, 16 dia, 300) (cl. 26.5.3.2). Steel 0.8% to 4%, 4 to 24 bars.
- Not covered: circular columns, shear in columns, helical ties, joints, footings, braced/unbraced frame analysis.

## Round 3 additions
- Stirrup zones are grouped into at most three bands (lowest required spacing, a middle value rounded down to 25 mm, and the largest); each band is never wider than the spacing required inside it.
- Hooks: 135° tails, alternating between the two top corners (bottom corners for a cantilever), on the compression side.
- Curtailment (simply supported, singly reinforced, rectangular only): at least half the bars (minimum two) run into the supports; the rest stop at the theoretical cut-off plus the larger of d and 12 x diameter (cl. 26.2.3.2-3).
- Anchorage: Ld <= 1.3 M1/V + Lo (cl. 26.2.3.3), Lo = min(support width/2 - cover, max(d, 12 x diameter)); not checked for cantilevers.
- IS 13920 member checks added with the switch: web width >= 200 mm, b/D >= 0.3, tension steel 0.24 sqrt(fck)/fy to 2.5%, hoop diameter >= 8 mm. Column confinement area (Ash), strong-column weak-beam and joint rules are NOT implemented.
- Not implemented: two-layer bars, multi-span analysis, torsion, slabs, footings, PDF report.

## Stirrup zones, side steel, column bars, IS 13920, 3D (added)
- Beam stirrups: spacing designed at stations along the span from the shear envelope (cl. 40.4), capped at min(0.75d, 300) and the minimum-steel limit (cl. 26.5.1.5-6), rounded down to 25 mm, minimum 75 mm; first stirrup 50 mm from the support face. Shear is taken as constant between the support and d.
- IS 13920 option: end zones 2d long with spacing at most min(d/4, 8 x smallest bar, 100 mm); elsewhere at most d/2 (cl. 6.3.5). Columns: end zones of max(larger dimension, clear height/6, 450 mm) with spacing at most min(least dimension/4, 100 mm), not below 75 mm (cl. 7.4). Confirm clause numbers against your copy of the code.
- Side-face steel for D > 750 mm: 0.1% of web area split over two faces, 10 mm bars, spacing at most min(300, b) (cl. 26.5.1.3).
- Column bars sit on all four faces (2 to 6 per b-face, 2 to 8 per D-face, at most 32 in total); the interaction uses each bar's real position. Cross-ties are added at every intermediate bar; this is a simplification of cl. 26.5.3.2 (c).
- Column height for tie count is the larger of the two unsupported lengths.
- Bar schedule: straight lengths, 10d hook allowance per stirrup or tie, no laps, curtailment or anchorage. Weight = d^2/162 kg/m. The schedule is built in the browser from the same results as the tables.
- 3D view: stirrup and bar positions come from the design results, drawn to scale. The section readout for continuous beams is indicative.
- Not included: curtailment, torsion, flange compression steel, circular columns.

## Foundations (rc_beam/footing.py, docs/footing.js)
- Types: isolated footing under axial load, and isolated footing under axial load plus a moment about the long axis. Not included yet: sloped or stepped, combined, strap, pile cap, raft.
- Plan size: smallest 50 mm-step plan (aspect ratio L/B as entered) with maximum service pressure P_total/(BL)(1 + 6e/L) <= net safe bearing capacity, no tension (e <= L/6), footing self-weight (25 kN/m3) included by iteration. Bearing capacity is treated as net; check settlement (IS 1904), sliding, overturning and groundwater separately.
- Structural design uses factored column load (1.5 P) over the footing area (self-weight excluded). Bending at the column face (cl. 34.2.3.2), one-way shear at d from the face (cl. 34.2.4.1) with tau_c from Table 19, punching shear at d/2 (cl. 31.6) with ks = 0.5 + beta_c <= 1 and 0.25 sqrt(fck), no moment transfer in punching.
- Depth is the smallest multiple of 25 mm (from 300 mm) that satisfies shear, punching and the limiting moment; edge thickness is the full depth (>= 150 mm, cl. 34.1.2). Reinforcement is the larger of the flexural requirement, 0.12% of the gross section (cl. 26.5.2.1) and a spacing of at most min(3d, 300 mm). Providing more steel to reduce depth is not attempted.
- Short-direction bars: 2/(beta + 1) of the total in a central band of width B (cl. 34.3.1). Bars in the lower layer run along L; bars along B sit above them.
- Development length Ld = dia x 0.87 fy / (4 tau_bd) must fit from the column face less cover, plus 8 x dia for a 90 degree bend at the bar end (cl. 26.2.2.1). Bearing at the column base uses 0.45 fck sqrt(A1/A2) with the root capped at 2 (cl. 34.4); dowels are at least 0.5% of the column area (cl. 34.4.3). Cover defaults to 50 mm; some references quote 75 mm against earth, so enter the value your project needs.

## Foundations, round 2
- Validation: tests/test_core.py reproduces a published IS 456 worked example (rectangular sloped footing, column 250 x 750 mm, 2000 kN, SBC 220 kN/m2, M20, Fe415): plan 3.45 x 2.95 m, net pressure 294.8 kN/m2, Mu 792 and 927 kN.m, punching strength 0.93 N/mm2 (ks = 0.833) and Ld = 47 dia all match. The example's own depth (950 mm) was a trial; this engine finds the smallest depth that passes (800 mm here), and the example takes a reduced effective width in one-way shear while this engine uses the full footing width.
- Types: isolated (axial), isolated with moment, sloped isolated, wall (strip, 1 m run). Not included yet: stepped, combined, strap, pile cap, raft.
- Sloped footing: edge depth 25% of the depth at the column face (rounded up to 25 mm, at least 150 mm). One-way shear uses the depth at the critical section and tau_v = (Vu - Mu tan(beta)/d)/(b d) (cl. 40.1.1); punching is located with the average depth and stressed on the depth at that perimeter.
- Plan size and depth are enlarged where needed so the footing bars develop their length from the column face (with a 90 degree bend) and so the column bars anchor in the footing (compression development length, bond stress x 1.25, vertical length plus the foot).
- Column bars in the 3D view run straight up into the column and end in 90 degree feet turned outward and resting on the upper mesh, with ties inside the footing depth and along the stub. The number and size of these bars is the minimum 0.5% of the column area (cl. 34.4.3); the actual column bars come from the column design and may be larger.
- Wall footing: 1 m strip, uniform pressure, bending at the wall face, one-way shear at d, distribution bars 0.12% of the section at no more than min(5d, 450 mm). The wall starter bars in the 3D view are illustrative.

## Foundations, round 3 (stepped, combined, pile cap)
- Stepped isolated footing: two steps; the lower step is half the depth (rounded up to 25 mm, at least 150 mm) over the full plan, the upper step is about half the plan (at least the column plus 150 mm each side). Bending and shear are also checked at the step face using the lower-step depth with the bars provided; the upper step must extend at least d/2 beyond the column so the punching perimeter lies in it.
- Combined footing (two columns): plan sized so the centroid lies on the resultant of the service loads, left end set by the entered distance (rounded to 50 mm) and at least half the column plus 150 mm. The footing is analysed as a beam under uniform upward pressure and the two column loads: sagging at the outer column faces (bottom bars), hogging between the columns (top bars, maximum over the clear span), one-way shear at d from the column faces, transverse strips (column dimension + d wide) designed as cantilevers under each column, punching at d/2 with a three-sided perimeter where the overhang is less than d/2. Transverse minimum steel outside the strips is not drawn.
- Pile cap: 2, 3 or 4 equal piles at 3 pile diameters, edge distance = pile radius + 150 mm, axial load only. Bending at the column face from the pile reactions outside it, one-way shear at d with partial pile contribution within half a pile diameter of the section, punching at d/2 less the piles inside the perimeter. Cover is at least 100 mm so the bars clear the pile heads embedded 75 mm. Shear enhancement near the supports (cl. 40.5.1) is not used. Pile capacity and group effects come from the geotechnical report (IS 2911).
- Not included yet: strap footing and raft (mat) foundation.
