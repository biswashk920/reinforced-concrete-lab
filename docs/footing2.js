// Browser copy of rc_beam/footing2.py (combined and pile-cap footings). tests/test_web.js checks the two agree.
const H2=typeof _ast==='function'?{_ast,_n,_tauC,_ar,_TBD}:require('./footing.js'),
_dowel=(a,c,fck,fy)=>{const dow=.005*a*c,dd=[12,16,20,25,32].find(x=>4*H2._ar(x)>=dow)||32,Ldc=dd*.87*fy/(4*H2._TBD[fck]*1.6*1.25);return[dd,Math.max(4,Math.ceil(dow/H2._ar(dd))),Ldc,Math.max(300,Math.ceil(Ldc/25-1e-9)*25)]},
_punch=(Pu,q,a,c,dm,out,fck)=>{const e=Math.min(out,dm/2);let b0,ain;if(e>=dm/2-1e-9){b0=2*((a+dm)+(c+dm));ain=(a+dm)*(c+dm)}else{b0=2*(a+dm/2+e)+(c+dm);ain=(a+dm/2+e)*(c+dm)}
 return[(Pu-q*ain/1e6)*1e3/(b0*dm),Math.min(1,.5+Math.min(a,c)/Math.max(a,c))*.25*Math.sqrt(fck)]};
function _cd(i,B,L,D,p0,q,S){const{a:a1,c:c1,a2,c2,fck,fy,dia,cover:cov}=i,Pu1=1.5*i.P,Pu2=1.5*i.P2,w=(Pu1+Pu2)/L,x1=p0,x2=p0+S,
 M=x=>w*x*x/2-Pu1*Math.max(x-x1,0)-Pu2*Math.max(x-x2,0),V=x=>w*x-Pu1*(x>x1?1:0)-Pu2*(x>x2?1:0),d=D-cov-dia/2,dT=d-dia,
 Mpos=Math.max(M(x1-a1/2e3),M(x2+a2/2e3),0),lo=x1+a1/2e3,hi=x2-a2/2e3;if(hi<=lo)return null;
 let mn=Infinity;for(let k=0;k<=200;k++)mn=Math.min(mn,M(lo+(hi-lo)*k/200));const Mneg=-Math.min(mn,0),Ab=H2._ast(Mpos,B*1e3,d,fck,fy),At=H2._ast(Mneg,B*1e3,d,fck,fy);if(Ab===null||At===null)return null;
 const nBot=H2._n(Ab,B*1e3,d,dia,D,cov),nTop=H2._n(At,B*1e3,d,dia,D,cov),Pb=nBot*H2._ar(dia),Pt=nTop*H2._ar(dia),
 secs=[lo+d/1e3,hi-d/1e3,x1-a1/2e3-d/1e3,x2+a2/2e3+d/1e3].map(x=>Math.min(Math.max(x,0),L)),Vm=Math.max(...secs.map(x=>Math.abs(V(x)))),
 tv=Vm*1e3/(B*1e3*d),tc=H2._tauC(100*Math.min(Pb,Pt)/(B*1e3*d),fck),strips=[];
 for(const[Pu,a,c]of[[Pu1,a1,c1],[Pu2,a2,c2]]){const bs=a+d,lb=(B-c/1e3)/2,A=H2._ast(Pu/B*lb*lb/2,bs,dT,fck,fy);if(A===null)return null;
  const nt=Math.max(Math.ceil(Math.max(A,.0012*bs*D)/H2._ar(dia)),Math.ceil((bs-2*cov)/300)+1,2);strips.push([bs,nt,Math.floor((bs-2*cov)/(nt-1)/5)*5])}
 const dm=(d+dT)/2,qp=(Pu1+Pu2)/(B*L),[tp1,tc1]=_punch(Pu1,qp,a1,c1,dm,(p0-a1/2e3)*1e3,fck),[tp2,tc2]=_punch(Pu2,qp,a2,c2,dm,(q-a2/2e3)*1e3,fck);
 return{d,Mpos,Mneg,Ab,At,nBot,nTop,tv,tc,strips,tp1,tc1,tp2,tc2,spBot:Math.floor((B*1e3-2*cov)/(nBot-1)/5)*5,spTop:Math.floor((B*1e3-2*cov)/(nTop-1)/5)*5,ok:tv<=tc&&tp1<=tc1&&tp2<=tc2}}
function combinedCalc(i){const{P:P1,P2,S,a:a1,c:c1,a2,c2,qa,fck,fy,dia,cover:cov}=i,xb=P2*S/(P1+P2),pmin=a1/2e3+.15,qmin=a2/2e3+.15,Ld=dia*.87*fy/(4*H2._TBD[fck]*1.6);
 let L=Math.ceil(2*(xb+Math.max(i.pe||0,pmin))/.05-1e-9)*.05,p0=L/2-xb,q=L/2+xb-S;while(q<qmin||p0<pmin){L+=.05;p0=L/2-xb;q=L/2+xb-S}
 const d1=_dowel(a1,c1,fck,fy),d2=_dowel(a2,c2,fck,fy);let Wf=.1*(P1+P2),B,D,r;
 for(let it=0;it<8;it++){B=Math.max(Math.ceil((P1+P2+Wf)/(qa*L)/.05-1e-9)*.05,Math.max(c1,c2)/1e3+.3);while((B*1e3-Math.max(c1,c2))/2-cov+8*dia<Ld)B+=.05;
  if(B>8)return{fail:'No combined footing satisfies the soil pressure; check the loads or bearing capacity',pass:false};
  D=null;for(let Dc=400;Dc<=2000;Dc+=25){const t=_cd(i,B,L,Dc,p0,q,S);if(t&&t.ok&&d1[2]<=Dc-cov-2*dia+8*d1[0]&&d2[2]<=Dc-cov-2*dia+8*d2[0]){D=Dc;r=t;break}}
  if(D===null)return{fail:'No depth up to 2000 mm satisfies bending, shear and punching; enlarge the columns, raise fck or reduce the loads',pass:false};
  const nw=25*B*L*D/1e3,done=nw<=Wf+1e-9;if(!done)Wf=nw;if(done)break}
 const Wact=25*B*L*D/1e3,qs=(P1+P2+Wact)/(B*L),checks=[qs<=qa,r.tv<=r.tc,r.tp1<=r.tc1,r.tp2<=r.tc2,d1[2]<=D-cov-2*dia+8*d1[0],d2[2]<=D-cov-2*dia+8*d2[0]],vol=B*L*D/1e3,
 wt=dia*dia/162*(r.nBot+r.nTop)*(L*1e3-2*cov)/1e3+dia*dia/162*(r.strips[0][1]+r.strips[1][1])*(B*1e3-2*cov)/1e3,
 out=Object.assign({},r,{type:'combined',L,B,D,p0,q,xb,qs,Wf:Wact,Ld,dd1:d1[0],nd1:d1[1],ext1:d1[3],Ldc1:d1[2],dd2:d2[0],nd2:d2[1],ext2:d2[3],Ldc2:d2[2],vol,wt,cost:vol*(i.rc||9000)+wt*(i.rs||110),checks});
 out.pass=checks.every(Boolean);return out}
function pilecapCalc(i){const{P,a,c,Qp,pd,fck,fy,dia}=i,cov=Math.max(i.cover,100),s=3*pd,e=pd/2+150,Pu=1.5*P,Ld=dia*.87*fy/(4*H2._TBD[fck]*1.6),[dd,nd,Ldc,ext]=_dowel(a,c,fck,fy),ar=H2._ar;
 let Wf=.1*P,n,pts,L,B,colZ,Ru,D,o;const cl=v=>Math.min(1,Math.max(0,v));
 for(let it=0;it<8;it++){n=[2,3,4].includes(i.np)?i.np:[2,3,4].find(k=>(P+Wf)/k<=Qp);
  if(!n)return{fail:'More than 4 piles are needed; use a larger pile capacity or a layout with more piles (not included yet)',pass:false};
  const h=s*Math.sqrt(3)/2;pts={2:[[-s/2,0],[s/2,0]],3:[[-s/2,-h/3],[s/2,-h/3],[0,2*h/3]],4:[[-s/2,-s/2],[-s/2,s/2],[s/2,-s/2],[s/2,s/2]]}[n];
  L=Math.ceil((s+2*e)/25)*25;B=Math.ceil({2:2*e,3:h+2*e,4:s+2*e}[n]/25)*25;colZ=n==3?e+h/3:B/2;Ru=Pu/n;D=null;
  for(let Dc=450;Dc<=2500;Dc+=25){const d=Dc-cov-dia/2,dB=d-dia;let ML=0,MB=0;for(const[x,z]of pts){if(x>a/2)ML+=Ru*(x-a/2)/1e3;if(z>c/2)MB+=Ru*(z-c/2)/1e3}
   const AL=ML>0?H2._ast(ML,B,d,fck,fy):0,AB=MB>0?H2._ast(MB,L,dB,fck,fy):0;if(AL===null||AB===null)continue;
   const nL=H2._n(AL,B,d,dia,Dc,cov),nB=H2._n(AB,L,dB,dia,Dc,cov);let VL=0,VB=0,inside=0;
   for(const[x,z]of pts){if(x>0)VL+=Ru*cl(.5+(x-a/2-d)/pd);if(z>0)VB+=Ru*cl(.5+(z-c/2-dB)/pd)}
   const tvL=VL*1e3/(B*d),tcL=H2._tauC(100*nL*ar(dia)/(B*d),fck),tvB=VB*1e3/(L*dB),tcB=H2._tauC(100*nB*ar(dia)/(L*dB),fck),dm=(d+dB)/2;
   for(const[x,z]of pts)if(Math.abs(x)<=(a+dm)/2&&Math.abs(z)<=(c+dm)/2)inside+=Ru;
   const tvp=(Pu-inside)*1e3/(2*((a+dm)+(c+dm))*dm),tcp=Math.min(1,.5+Math.min(a,c)/Math.max(a,c))*.25*Math.sqrt(fck);
   if(tvL<=tcL&&tvB<=tcB&&tvp<=tcp&&Ldc<=Dc-cov-2*dia+8*dd){D=Dc;o={ML,MB,nL,nB,tvL,tcL,tvB,tcB,tvp,tcp};break}}
  if(D===null)return{fail:'No depth up to 2500 mm satisfies bending, shear and punching; enlarge the column, raise fck or add piles',pass:false};
  const nw=25*B*L*D/1e9,done=nw<=Wf+1e-9||!!i.np;if(!done)Wf=nw;if(done)break}
 const Wact=25*B*L*D/1e9,Rs=(P+Wact)/n,avail=L/2-a/2-cov+8*dia,checks=[Rs<=Qp,o.tvL<=o.tcL,o.tvB<=o.tcB,o.tvp<=o.tcp,Ld<=avail,Ldc<=D-cov-2*dia+8*dd],vol=B*L*D/1e9,wt=dia*dia/162*(o.nL*(L-2*cov)+o.nB*(B-2*cov))/1e6,
 out=Object.assign({},o,{type:'pilecap',n,pts,s,e,L:L/1e3,B:B/1e3,D,colZ,Rs,Ru,spL:Math.floor((B-2*cov)/(o.nL-1)/5)*5,spB:Math.floor((L-2*cov)/(o.nB-1)/5)*5,Ld,avail,dd,nd,Ldc,ext,Wf:Wact,vol,wt,cov,cost:vol*(i.rc||9000)+wt*(i.rs||110),checks});
 out.pass=checks.every(Boolean);return out}
if(typeof module!=='undefined')module.exports={combinedCalc,pilecapCalc};
