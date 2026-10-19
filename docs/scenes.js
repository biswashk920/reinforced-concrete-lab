// Builds 3D scenes, bar schedules and CSV files from the design results (same numbers as the tables).
const cf=(x,n=1)=>(+x).toFixed(n);
function dlCSV(name,rows){const t=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\r\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download=name;a.click()}
const bbs=items=>{const rows=[['Mark','Item','Dia (mm)','No.','Length each (mm)','Total length (m)','Weight (kg)']];let tw=0;
 items.forEach((it,k)=>{const tl=it[2]*it[3]/1e3,w=it[1]*it[1]/162*tl;tw+=w;rows.push([String.fromCharCode(65+k),it[0],it[1],it[2],cf(it[3],0),cf(tl,2),cf(w,1)])});rows.push(['','Total','','','','',cf(tw,1)]);return rows};
function beamBBS(r,i){const L=i.L*1e3,c=i.cover,sd=i.sdia,it=[...(r.ca?[['Main bars (to supports)',i.dia,r.ca[0],L-2*c],['Main bars (curtailed)',i.dia,r.n-r.ca[0],L-2*r.ca[2]*1e3]]:[['Main bars',i.dia,r.n,L-2*c]]),['Top / compression bars',r.dbl?i.dia:12,r.dbl?r.nc:2,L-2*c],
 ['Stirrups (incl. 135° hooks)',sd,r.nst,2*((i.b-2*c-sd)+(i.D-2*c-sd))+20*sd]];if(r.sideDia)it.push(['Side-face bars',r.sideDia,2*r.sideN,L-2*c]);return bbs(it)}
function beamCSV(r,i){const z=r.zones.map(z=>[cf(z[0],2),cf(z[1],2),z[2]]);return[['RC beam design, IS 456:2000'+(i.eq?' with IS 13920 detailing':'')],[],['INPUTS'],...Object.entries(i).map(([k,v])=>[k,v]),[],
 ['RESULTS'],['Factored moment Mu (kN.m)',cf(r.Mu)],['Factored shear at d Vu (kN)',cf(r.Vd)],['Effective depth d (mm)',cf(r.d,0)],['Ast required (mm2)',cf(r.Areq,0)],['Ast provided (mm2)',cf(r.Aprov,0)],['Bottom bars',`${r.n}-${i.dia} mm`],
 ['Moment capacity (kN.m)',cf(r.Mcap)],['Development length (mm)',cf(r.Ld,0)],['Stirrups total',r.nst],['Bar curtailment',r.ca?`${r.n-r.ca[0]} bars start ${cf(r.ca[2],2)} m from each support (theoretical cut-off ${cf(r.ca[1],2)} m)`:'none'],['Cost (rate units)',cf(r.cost,0)],[],['CHECKS'],['Check','Demand','Capacity','Result'],...r.checks.map(c=>[c.n,c.dm,c.cp,c.ok?'OK':'FAIL']),[],
 ['STIRRUP ZONES (from each support; mirrored about midspan unless cantilever)'],['From (m)','To (m)','Spacing (mm)'],...z,[],['STIRRUP POSITIONS (m from left end)'],[r.pos.map(p=>cf(p,3)).join(' ')],[],['BAR SCHEDULE (straight lengths; curtailment and anchorage not included)'],...beamBBS(r,i)]}
function beamScene(r,i){const X=i.L*1e3,Y=i.D,Z=i.b,c=i.cover,sd=i.sdia,dc=r.dc,o=c+sd/2,P=[],zc=(k,n,off)=>off+(Z-2*off)*(n==1?.5:k/(n-1)),
 zone=p=>{const x=i.type=='cant'?p:Math.min(p,i.L-p);return(r.zones.find(z=>x<=z[1]+1e-9)||r.zones[r.zones.length-1])[2]};
 const cut=new Set(r.ca?[...Array(r.n).keys()].sort((a,b)=>Math.abs(a-(r.n-1)/2)-Math.abs(b-(r.n-1)/2)).slice(0,r.n-r.ca[0]):[]);
 for(let k=0;k<r.n;k++){const x0=cut.has(k)?r.ca[2]*1e3:c;P.push({a:[x0,dc,zc(k,r.n,dc)],b:[X-x0,dc,zc(k,r.n,dc)],rad:i.dia/2,L:'main',t:`Main bar ${k+1} of ${r.n} · Ø${i.dia} mm${cut.has(k)?` · curtailed, starts ${cf(r.ca[2],2)} m from the support`:''}`})}
 const nt=r.dbl?r.nc:2,td=r.dbl?i.dia:12;for(let k=0;k<nt;k++)P.push({a:[c,Y-dc,zc(k,nt,dc)],b:[X-c,Y-dc,zc(k,nt,dc)],rad:td/2,L:'top',t:`${r.dbl?'Compression':'Hanger'} bar ${k+1} of ${nt} · Ø${td} mm`});
 if(r.sideDia)for(let j=0;j<r.sideN;j++){const y=dc+(Y-2*dc)*(j+1)/(r.sideN+1);for(const z of[o+sd/2+r.sideDia/2,Z-o-sd/2-r.sideDia/2])P.push({a:[c,y,z],b:[X-c,y,z],rad:r.sideDia/2,L:'side',t:`Side-face bar · Ø${r.sideDia} mm, ${r.sideN} per face (cl. 26.5.1.3)`})}
 r.pos.forEach((p,k)=>{const x=p*1e3,t=`Stirrup ${k+1} of ${r.pos.length} · Ø${sd} mm · x = ${cf(p,2)} m · zone spacing ${zone(p)} mm`,
  s=(a,b)=>P.push({a,b,rad:sd/2,L:'stir',idx:k,n:r.pos.length,t});s([x,o,o],[x,Y-o,o]);s([x,Y-o,o],[x,Y-o,Z-o]);s([x,Y-o,Z-o],[x,o,Z-o]);s([x,o,Z-o],[x,o,o]);{const z2=k%2?Z-o:o,yc=i.type=='cant'?o:Y-o,dy=yc>Y/2?-1:1,dz=z2<Z/2?1:-1;s([x,yc,z2],[x,yc+dy*7.1*sd,z2+dz*7.1*sd])}});
 const Vf=x=>i.type=='cant'?r.wu*(i.L-x)+r.Pu:Math.max(r.V0-r.wu*Math.min(x,i.L-x),0),Mf=x=>i.type=='cant'?r.wu*(i.L-x)**2/2+r.Pu*(i.L-x):r.wu*x*(i.L-x)/2+r.Pu*Math.min(x,i.L-x)/2;
 return{X,Y,Z,prims:P,c:[X/2,Y/2,Z/2],size:Math.max(X,Y,Z)*.9,
  dims:[[[0,-40,0],[X,-40,0],`L = ${cf(i.L,2)} m`],[[X+40,0,Z],[X+40,Y,Z],`D = ${i.D}`],[[0,-40,Z+40],[0,-40,0],`b = ${i.b}`]],
  sec:t=>({axis:'x',v:t*X,text:`x = ${cf(t*i.L,2)} m · Vu ≈ ${cf(Vf(t*i.L))} kN · Mu ≈ ${cf(Mf(t*i.L))} kN·m${i.type=='cont'?' (indicative)':''} · stirrups here at ${zone(t*i.L)} mm`}),
  desc:`${r.nst} stirrups of ${sd} mm in zones: ${r.zones.map(z=>`${cf(z[0],2)} to ${cf(z[1],2)} m at ${z[2]} mm`).join('; ')}${i.type=='cant'?'':' (mirrored about midspan)'}. ${r.n} bottom bars of ${i.dia} mm.`}}
function colBBS(r,i){const H=r.H*1e3,c=i.cover,t=r.tie,A=i.b-2*c-t,B=i.D-2*c-t,it=[['Vertical bars',r.dia,r.n,H],['Ties (incl. 135° hooks)',t,r.nties,2*(A+B)+20*t]];
 if(r.nd>2)it.push(['Cross-ties across b',t,(r.nd-2)*r.nties,A+20*t]);if(r.nb>2)it.push(['Cross-ties across D',t,(r.nb-2)*r.nties,B+20*t]);return bbs(it)}
function colCSV(r,i){return[['RC column design, IS 456:2000'+(i.eq?' with IS 13920 detailing':'')],[],['INPUTS'],...Object.entries(i).map(([k,v])=>[k,v]),[],['RESULTS'],['Pu (kN)',cf(r.Pu)],['Design moments Mux, Muy (kN.m)',cf(r.Mxd)+', '+cf(r.Myd)],
 ['Slenderness lex/D, ley/b',cf(r.sx)+', '+cf(r.sy)],['Puz (kN)',cf(r.Puz,0)],['alpha n',cf(r.an,2)],['Mux1, Muy1 (kN.m)',cf(r.M1)+', '+cf(r.M2)],['Interaction ratio',cf(r.ratio,3)],
 ['Longitudinal steel',`${r.n}-${r.dia} mm (${r.nb} per b-face, ${r.nd} per D-face), ${cf(r.As,0)} mm2, ${cf(r.pt,2)}%`],['Ties',`${r.tie} mm @ ${r.sv} mm c/c${i.eq?`, ${r.se} mm in end zones of ${cf(r.le,0)} mm`:''}`],['Number of ties',r.nties],[],
 ['TIE POSITIONS (m from base)'],[r.tpos.map(p=>cf(p,3)).join(' ')],[],['BAR SCHEDULE (no lap or anchorage allowance)'],...colBBS(r,i)]}
function colScene(r,i){const X=i.b,Z=i.D,Y=r.H*1e3,c=i.cover,t=r.tie,dc=r.dc,o=c+t/2,P=[],xs=k=>dc+(X-2*dc)*k/(r.nb-1),zs=j=>dc+(Z-2*dc)*j/(r.nd-1),pts=[];
 for(let k=0;k<r.nb;k++)pts.push([xs(k),dc],[xs(k),Z-dc]);for(let j=1;j<r.nd-1;j++)pts.push([dc,zs(j)],[X-dc,zs(j)]);
 pts.forEach((p,k)=>P.push({a:[p[0],0,p[1]],b:[p[0],Y,p[1]],rad:r.dia/2,L:'main',t:`Vertical bar ${k+1} of ${pts.length} · Ø${r.dia} mm`}));
 const zone=p=>i.eq&&(p*1e3<r.le||(r.H-p)*1e3<r.le)?r.se:r.sv;
 r.tpos.forEach((p,k)=>{const y=p*1e3,tt=`Tie ${k+1} of ${r.tpos.length} · Ø${t} mm @ ${zone(p)} mm`,s=(a,b,L='stir')=>P.push({a,b,rad:t/2,L,idx:k,n:r.tpos.length,t:L=='cross'?`Cross-tie · Ø${t} mm`:tt});
  s([o,y,o],[X-o,y,o]);s([X-o,y,o],[X-o,y,Z-o]);s([X-o,y,Z-o],[o,y,Z-o]);s([o,y,Z-o],[o,y,o]);{const cx=k%2?X-o:o,cz=(k>>1)%2?Z-o:o,dx=cx<X/2?1:-1,dz=cz<Z/2?1:-1;s([cx,y,cz],[cx+dx*7.1*t,y,cz+dz*7.1*t])}
  for(let j=1;j<r.nd-1;j++)s([o,y,zs(j)],[X-o,y,zs(j)],'cross');for(let m=1;m<r.nb-1;m++)s([xs(m),y,o],[xs(m),y,Z-o],'cross')});
 return{X,Y,Z,prims:P,c:[X/2,Y/2,Z/2],size:Math.max(X,Y,Z)*.8,dims:[[[0,-30,Z+30],[X,-30,Z+30],`b = ${i.b}`],[[X+30,0,Z+30],[X+30,Y,Z+30],`H = ${cf(r.H,2)} m`],[[X+30,-30,0],[X+30,-30,Z],`D = ${i.D}`]],
  sec:t=>{const y=t*Y,p=y/1e3,k=r.tpos.reduce((b,q,j)=>Math.abs(q-p)<Math.abs(r.tpos[b]-p)?j:b,0);return{axis:'y',v:y,text:`Height ${cf(p,2)} m · ties ${zone(p)} mm c/c here · nearest tie no. ${k+1} · Pu = ${cf(r.Pu,0)} kN, Mux = ${cf(r.Mxd)}, Muy = ${cf(r.Myd)} kN·m (design values)`}},
  desc:`${r.n} vertical bars of ${r.dia} mm (${r.nb} along each b-face, ${r.nd} along each D-face). ${r.nties} ties of ${t} mm at ${r.sv} mm${i.eq?`, ${r.se} mm in the ${cf(r.le,0)} mm end zones`:''}; ${r.xt} cross-tie${r.xt==1?'':'s'} per tie level.`}}
if(typeof module!=='undefined')module.exports={beamScene,colScene,beamCSV,colCSV};
