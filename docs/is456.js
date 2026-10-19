// Browser copy of the method in rc_beam/core.py. tests/test_web.js checks the two agree.
const E=200000,AREA=d=>Math.PI*d*d/4,TMAX={20:2.8,25:3.1,30:3.5,35:3.7,40:4.0},TBD={20:1.2,25:1.4,30:1.5,35:1.7,40:1.9};
// Design stress of steel at a given strain (IS 456 Fig. 23B); mild steel is elastic-plastic.
function fsAt(eps,fy){const fd=.87*fy;if(fy<=250)return Math.min(eps*E,fd);
 const P=[[.8,0],[.85,1e-4],[.9,3e-4],[.95,7e-4],[.975,1e-3],[1,2e-3]].map(([r,i])=>[r*fd/E+i,r*fd]);
 if(eps<=P[0][0])return eps*E;for(let j=1;j<P.length;j++)if(eps<=P[j][0]){const[a,b]=[P[j-1],P[j]];return a[1]+(b[1]-a[1])*(eps-a[0])/(b[0]-a[0])}return fd}
function calc(i){const{L,b,D,cover,dia,sdia,fck,fy}=i,r={i,checks:[]},d=D-cover-sdia-dia/2,dc=cover+sdia+dia/2;r.d=d;r.dc=dc;
 const fail=m=>Object.assign(r,{fail:m,pass:false});if(d<=60||L<=0)return fail('Section too shallow or span invalid');
 const sw=i.sw?25*b*D/1e6:0,wu=1.5*(i.w+sw),Pu=1.5*i.P;let Mu,V0,basic;
 if(i.type=='ss'){Mu=wu*L*L/8+Pu*L/4;V0=wu*L/2+Pu/2;basic=20}else if(i.type=='cant'){Mu=wu*L*L/2+Pu*L;V0=wu*L+Pu;basic=7}else{Mu=wu*L*L/12+Pu*L/8;V0=.6*(wu*L+Pu);basic=26}
 const Vd=Math.max(V0-wu*d/1e3,0),k=.0035/(.0055+.87*fy/E),Ml=.36*k*(1-.42*k)*fck*b*d*d/1e6,fd=.87*fy,fl=i.sect=='T'&&i.type!='cant',Df=i.Df,bf=fl?Math.max(b,Math.min((i.type=='ss'?L*1e3:.7*L*1e3)/6+b+6*Df,i.bs)):b,yfF=x=>Df<=.2*d?Df:.15*x+.65*Df,M=x=>(x<=Df?.36*fck*bf*x*(d-.42*x):.36*fck*b*x*(d-.42*x)+.45*fck*(bf-b)*yfF(x)*(d-yfF(x)/2))/1e6,Cf=x=>x<=Df?.36*fck*bf*x:.36*fck*b*x+.45*fck*(bf-b)*yfF(x),bis=(f,t,h)=>{let a=0;for(let q=0;q<60;q++){const m=(a+h)/2;f(m)<t?a=m:h=m}return h},dbl=Mu>Ml&&!fl;let Ast,Asc=0,fsc=0,xT=0;
 if(fl){if(M(k*d)<Mu)return fail('T-section too small: increase depth or flange (flange compression steel not supported)');xT=bis(M,Mu,k*d);Ast=Cf(xT)/fd}else if(!dbl)Ast=.5*fck/fy*(1-Math.sqrt(1-4.6*Mu*1e6/(fck*b*d*d)))*b*d;
 else{const xu=k*d;if(dc>=xu)return fail("d' is too large for compression steel; increase D");fsc=fsAt(.0035*(1-dc/xu),fy);
  Asc=(Mu-Ml)*1e6/((fsc-.446*fck)*(d-dc));Ast=Ml*1e6/(fd*(d-.42*xu))+Asc*(fsc-.446*fck)/fd}
 const Amin=.85*b*d/fy,Amax=.04*b*D,Areq=Math.max(Ast,Amin),n=Math.max(2,Math.ceil(Areq/AREA(dia))),Aprov=n*AREA(dia),
  clear=(b-2*(cover+sdia)-n*dia)/(n-1),minsp=Math.max(dia,25),nc=dbl?Math.max(2,Math.ceil(Asc/AREA(dia))):0,
  xuA=Math.min(fd*Aprov/(.36*fck*b),k*d),Mcap=dbl?Ml+(fsc-.446*fck)*nc*AREA(dia)*(d-dc)/1e6:fl?M(bis(Cf,fd*Aprov,k*d)):fd*Aprov*(d-.42*xuA)/1e6;
 const pt=100*Aprov/(b*d),be=Math.max(.8*fck/(6.89*Math.min(pt,3)),1),tc=.85*Math.sqrt(.8*fck)*(Math.sqrt(1+5*be)-1)/(6*be),tv=Vd*1e3/(b*d),
  Asv=2*AREA(sdia),svMin=.87*fy*Asv/(.4*b),svMax=Math.min(.75*d,300,svMin);let sv=svMax;
 if(tv>tc){const Vus=Vd*1e3-tc*b*d;sv=Math.min(svMax,.87*fy*Asv*d/Vus)}sv=Math.floor(sv/5)*5;
 const Vx=x=>i.type=='cant'?wu*(L-x)+Pu:Math.max(V0-wu*Math.min(x,L-x),0),
 zs_=x=>{const v=Vx(Math.max(x,d/1e3));let s=svMax;if(v*1e3/(b*d)>tc)s=Math.min(svMax,.87*fy*Asv*d/(v*1e3-tc*b*d));s=Math.max(75,Math.floor(s/25)*25);
  if(i.eq){s=Math.min(s,Math.floor(d/2/5)*5);if(x*1e3<2*d||(i.type!='cant'&&(L-x)*1e3<2*d))s=Math.min(s,Math.floor(Math.min(d/4,8*dia,100)/5)*5)}return s},
 Hh=i.type=='cant'?L:L/2,zones=[];
 for(let q=0;q<40;q++){const x0=Hh*q/40,x1=Hh*(q+1)/40,s=zs_(x0);if(zones.length&&zones[zones.length-1][2]==s)zones[zones.length-1][1]=x1;else zones.push([x0,x1,s])}
{const lv=[...new Set(zones.map(z=>z[2]))].sort((a,c)=>a-c),lo=lv[0],hi=lv[lv.length-1],mid=Math.floor((lo+hi)/2/25)*25,bands=[lo].concat(lo<mid&&mid<hi?[mid]:[],hi>lo?[hi]:[]),g=[];
 for(const[x0,x1,s]of zones){const s2=Math.max(...bands.filter(v=>v<=s));if(g.length&&g[g.length-1][2]==s2)g[g.length-1][1]=x1;else g.push([x0,x1,s2])}zones.length=0;g.forEach(z=>zones.push(z))}
 let pos=[],pp=.05;for(const[,x1,s]of zones){while(pp<x1-1e-9){pos.push(pp);pp+=s/1e3}}
 if(i.type!='cant'){const m=new Map();for(const q of pos.concat(pos.map(q=>L-q)))m.set(Math.round(q*1e6),q);pos=[...m.entries()].sort((a,c)=>a[0]-c[0]).map(e=>e[1])}
 sv=Math.min(...zones.map(z=>z[2]));
 const sideDia=D>750?10:0,sideN=sideDia?Math.max(Math.ceil(.0005*b*D/AREA(10)),Math.ceil((D-2*dc)/Math.min(300,b))-1,1):0;
 const fs=.58*fy*Areq/Aprov,pc=100*(nc*AREA(dia))/(b*d),kc=Math.min(1+pc/(pc+3),1.5),kt=Math.min(2,1/(.225+.00322*fs-.625*Math.log10(1/pt))),
  allow=basic*kt*kc*(fl?.8+.2*Math.min(1,Math.max(0,(b/bf-.3)/.7)):1),act=L*1000/d,Ld=dia*fd/(4*TBD[fck]*(fy>250?1.6:1)),slim=i.type=='cant'?Math.min(25*b,100*b*b/d):Math.min(60*b,250*b*b/d);
 const C=(n,dm,cp,ok)=>r.checks.push({n,dm,cp,ok});
 C('Flexure: Mu ≤ capacity (cl. 38.1, Annex G)',Mu.toFixed(1)+' kN·m',Mcap.toFixed(1)+' kN·m',Mu<=Mcap+1e-6);
 C('Tension steel ≤ 4% bD (cl. 26.5.1.1)',Aprov.toFixed(0)+' mm²',Amax.toFixed(0)+' mm²',Aprov<=Amax);
 C('Bar spacing in one layer (cl. 26.3.2)','clear '+clear.toFixed(0)+' mm','≥ '+minsp+' mm',clear>=minsp);
 C('Shear stress τv ≤ τc,max (Table 20)',tv.toFixed(2)+' N/mm²',TMAX[fck]+' N/mm²',tv<=TMAX[fck]);
 C('Stirrup spacing practical (≥ 75 mm)',sv+' mm','≥ 75 mm',sv>=75);
 C('Deflection: L/d ≤ allowable (cl. 23.2)',act.toFixed(1),allow.toFixed(1),act<=allow);
 C('Lateral stability: L ≤ limit (cl. 23.3)',(L*1000).toFixed(0)+' mm',slim.toFixed(0)+' mm',L*1000<=slim);
 const Mxx=x=>wu*x*(L-x)/2+Pu*Math.min(x,L-x)/2;let ca=null,Mk=Mcap;
 if(i.type=='ss'&&!fl&&!dbl&&n>=4){const keep=Math.max(2,Math.ceil(n/2)),Ak=keep*AREA(dia);Mk=fd*Ak*(d-.42*Math.min(fd*Ak/(.36*fck*b),k*d))/1e6;
  if(Mk<Mxx(L/2)){let a=0,h=L/2;for(let q=0;q<60;q++){const m=(a+h)/2;if(Mxx(m)<Mk)a=m;else h=m}const rd=v=>Math.round(v*1e6)/1e6;ca=[keep,rd(h),rd(Math.max(h-Math.max(d,12*dia)/1e3,0))]}}
 const Lo=Math.min((i.sup||230)/2-cover,Math.max(d,12*dia)),anc=V0>0?1.3*(ca?Mk:Mcap)*1e6/(V0*1e3)+Lo:1e9;
 if(i.type!='cant')C('Anchorage of bottom bars at support (cl. 26.2.3.3)',Ld.toFixed(0)+' mm',anc.toFixed(0)+' mm',Ld<=anc);else r.checks.push({n:'Anchorage (cantilever: check by hand)',dm:'–',cp:'–',ok:true});
 if(i.eq){C('IS 13920: web width ≥ 200 mm',b+' mm','200 mm',b>=200);C('IS 13920: b/D ≥ 0.3',(b/D).toFixed(2),'0.30',b/D>=.3);
  C('IS 13920: tension steel 0.24√fck/fy to 2.5%',pt.toFixed(2)+'%',(.24*Math.sqrt(fck)/fy*100).toFixed(2)+'–2.5%',pt>=.24*Math.sqrt(fck)/fy*100&&pt<=2.5);C('IS 13920: hoop diameter ≥ 8 mm',sdia+' mm','8 mm',sdia>=8)}
 const vol=b*D/1e6*L,nSt=pos.length,wt=7.85e-3*(Aprov*L+(nc||2)*AREA(nc?dia:12)*L)+AREA(sdia)*2*(b+D-4*cover+100)*7.85e-6*nSt;
 return Object.assign(r,{ca,zones,zs:zones.map(z=>z[2]),pos,nst:nSt,sideN,sideDia,V0,nc,fl,bf,xT,sw,wu,Pu,Mu,Vd,V0,Ml,k,dbl,Ast,Asc,fsc,Amin,Amax,Areq,n,Aprov,clear,nc,Mcap,pt,tc,tv,sv,svMax,fs,kt,kc,allow,act,Ld,vol,wt,
  cost:vol*i.rc+wt*i.rs,pass:r.checks.every(c=>c.ok)})}
function optimise(i){const o=[];for(let b=200;b<=i.maxB;b+=25)for(let D=300;D<=i.maxD;D+=50){const r=calc({...i,b,D});if(!r.fail&&r.pass)o.push(r)}return o.sort((a,c)=>a.cost-c.cost).slice(0,8)}
if(typeof module!=='undefined')module.exports={calc,optimise,fsAt};
