// Checks that the browser engine reproduces the Python reference. Run: node tests/test_web.js
const assert=require('assert'),fs=require('fs'),{calc,optimise}=require('../docs/is456.js'),{colCalc}=require('../docs/column.js'),{footCalc}=require('../docs/footing.js');
const G=JSON.parse(fs.readFileSync(__dirname+'/golden_cases.json'));
for(const c of G.cases){const r=calc(c.input),e=c.expected;
 if(e.fail){assert.strictEqual(r.fail,e.fail,c.name);continue}
 for(const[k,v]of Object.entries(e)){
  if(typeof v==='number')assert(Math.abs(r[k]-v)<=1e-9*Math.max(1,Math.abs(v)),`${c.name} ${k}: ${r[k]} vs ${v}`);
  else assert.deepStrictEqual(r[k],v,`${c.name} ${k}`)}}
const top=optimise(G.optimise.input).slice(0,3).map(x=>[x.i.b,x.i.D]);
assert.deepStrictEqual(top,G.optimise.top3,'optimiser order');
for(const c of G.columns){const r=colCalc(c.input),e=c.expected;
 if(e.fail){assert.strictEqual(r.fail,e.fail,c.name);continue}
 for(const[k,v]of Object.entries(e)){
  if(typeof v==='number')assert(Math.abs(r[k]-v)<=1e-9*Math.max(1,Math.abs(v)),`${c.name} ${k}: ${r[k]} vs ${v}`);
  else assert.deepStrictEqual(r[k],v,`${c.name} ${k}`)}}
for(const c of G.footings){const r=footCalc(c.input),e=c.expected;
 if(e.fail){assert.strictEqual(r.fail,e.fail,c.name);continue}
 for(const[k,v]of Object.entries(e)){
  if(typeof v==='number')assert(Math.abs(r[k]-v)<=1e-9*Math.max(1,Math.abs(v)),`${c.name} ${k}: ${r[k]} vs ${v}`);
  else assert.deepStrictEqual(r[k],v,`${c.name} ${k}`)}}
console.log(`Web engine matches the Python reference on ${G.cases.length} beam cases and ${G.columns.length} column cases and ${G.footings.length} footing cases`);
