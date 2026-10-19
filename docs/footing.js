// Browser copy of rc_beam/footing.py. tests/test_web.js checks the two agree.
const _ar=d=>Math.PI*d*d/4,_TBD={20:1.2,25:1.4,30:1.5,35:1.7,40:1.9},
_tauC=(pt,fck)=>{const be=Math.max(.8*fck/(6.89*Math.min(pt,3)),1);return .85*Math.sqrt(.8*fck)*(Math.sqrt(1+5*be)-1)/(6*be)},
_edge=D=>Math.max(150,Math.ceil(D*.25/25)*25),
_d1=D=>Math.max(150,Math.ceil(D*.5/25)*25),_steps=(i,B,L)=>[Math.max(i.a/1e3+.3,Math.ceil(L*.5/.05-1e-9)*.05),Math.max(i.c/1e3+.3,Math.ceil(B*.5/.05-1e-9)*.05)],
_vol=(i,B,L,D)=>{if(i.type=='stepped'){const[L2,B2]=_steps(i,B,L),D1=_d1(D);return B*L*D1/1e3+L2*B2*(D-D1)/1e3}if(i.type=='sloped'){const h=(D-_edge(D))/1e3,A1=B*L,A2=i.a*i.c/1e6;return B*L*_edge(D)/1e3+h/3*(A1+A2+Math.sqrt(A1*A2))}return B*L*D/1e3};
function _ast(Mu,b,d,fck,fy){const k=.0035/(.0055+.87*fy/200000);if(Mu*1e6>.36*k*(1-.42*k)*fck*b*d*d)return null;return .5*fck/fy*(1-Math.sqrt(1-4.6*Mu*1e6/(fck*b*d*d)))*b*d}
const _n=(A,w,d,dia,D,cov)=>Math.max(Math.ceil(Math.max(A,.0012*w*D)/_ar(dia)),Math.ceil((w-2*cov)/Math.min(3*d,300))+1,2);
function _design(i,B,L,D){const{fck,fy,dia,cover:cov,a,c}=i,sl=i.type=='sloped',De=_edge(D),Pu=1.5*i.P,e=i.type=='ecc'?i.M/i.P:0,qu=Pu/(B*L),qmx=qu*(1+6*e/L),qmn=qu*(1-6*e/L),
 dL=D-cov-dia/2,dB=dL-dia,l=(L-a/1e3)/2,lb=(B-c/1e3)/2,qf=qmx-(qmx-qmn)*l/L,MuL=B*(qf*l*l/2+(qmx-qf)*l*l/3),MuB=L*qu*lb*lb/2,
 AL=_ast(MuL,B*1e3,dL,fck,fy),AB=_ast(MuB,L*1e3,dB,fck,fy);if(AL===null||AB===null)return null;
 const nL=_n(AL,B*1e3,dL,dia,D,cov),nB=_n(AB,L*1e3,dB,dia,D,cov),PL=nL*_ar(dia),PB=nB*_ar(dia),x=Math.max(l-dL/1e3,0),qx=qmx-(qmx-qmn)*x/L,VL=B*(qmx+qx)/2*x;let ds=dL,tvL;
 if(sl){ds=De+(D-De)*x/l-cov-dia/2;if(ds<=0)return null;const Ms=B*(qmx*x*x/2-(qmx-qmn)*x*x*x/(6*L));tvL=(VL*1e3-Ms*1e6*((D-De)/(l*1e3))/ds)/(B*1e3*ds)}else tvL=VL*1e3/(B*1e3*dL);
 const tcL=_tauC(100*PL/(B*1e3*ds),fck),xb=Math.max(lb-dB/1e3,0),VB=L*qu*xb;let tvB;ds=dB;
 if(sl){ds=De+(D-De)*xb/lb-cov-1.5*dia;if(ds<=0)return null;const Ms=L*qu*xb*xb/2;tvB=(VB*1e3-Ms*1e6*((D-De)/(lb*1e3))/ds)/(L*1e3*ds)}else tvB=VB*1e3/(L*1e3*dB);
 const tcB=_tauC(100*PB/(L*1e3*ds),fck),dp=(dL+dB)/2;let dpp=dp;
 if(sl){const lm=Math.min(l,lb);dpp=De+(D-De)*Math.max(lm-dp/2e3,0)/lm-cov-1.5*dia;if(dpp<=0)return null}
 const Vp=Pu-qu*(a+dp)*(c+dp)/1e6,tvp=Vp*1e3/(2*((a+dp)+(c+dp))*dpp),tcp=Math.min(1,.5+Math.min(a,c)/Math.max(a,c))*.25*Math.sqrt(fck);
 let stOK=true,tvS=0,tcS=1;
 if(i.type=='stepped'){const[L2,B2]=_steps(i,B,L),D1=_d1(D),d1=D1-cov-dia/2,lsL=(L-L2)/2,lsB=(B-B2)/2,d1B=d1-dia;if((L2*1e3-a)/2<dp/2||(B2*1e3-c)/2<dp/2||d1B<=0)return null;
  const As=_ast(B*qu*lsL*lsL/2,B*1e3,d1,fck,fy),Bs=_ast(L*qu*lsB*lsB/2,L*1e3,d1B,fck,fy);if(As===null||Bs===null)return null;
  tvS=qu*B*Math.max(lsL-d1/1e3,0)*1e3/(B*1e3*d1);tcS=_tauC(100*PL/(B*1e3*d1),fck);const tvS2=qu*L*Math.max(lsB-d1B/1e3,0)*1e3/(L*1e3*d1B),tcS2=_tauC(100*PB/(L*1e3*d1B),fck);stOK=As<=PL&&Bs<=PB&&tvS<=tcS&&tvS2<=tcS2}
 return{stOK,tvS,tcS,Pu,e,qu,qmx,qmn,dL,dB,MuL,MuB,AL,AB,nL,nB,PL,PB,tvL,tcL,tvB,tcB,tvp,tcp,l,lb,De:sl?De:D}}
function _wall(i){const{P:w,qa,a,fck,fy,dia,cover:cov}=i;let Wf=.1*w,B,D,l,qu;const Ld0=dia*.87*fy/(4*_TBD[fck]*1.6);
 for(let it=0;it<8;it++){B=null;for(let k=8;k<=160;k++){if(k*.05*1e3>=a+300&&(w+Wf)/(k*.05)<=qa&&(k*50-a)/2-cov+8*dia>=Ld0){B=k*.05;break}}
  if(B===null)return{fail:'No wall footing up to 8 m wide satisfies the soil pressure; check the load or bearing capacity',pass:false};
  l=(B-a/1e3)/2;qu=1.5*w/B;D=null;
  for(let Dc=250;Dc<=1500;Dc+=25){const d=Dc-cov-dia/2,A=_ast(qu*l*l/2,1000,d,fck,fy);if(A===null)continue;const sp=Math.floor(Math.min(1000*_ar(dia)/Math.max(A,1.2*Dc),3*d,300)/5)*5;
   if(qu*Math.max(l-d/1e3,0)*1e3/(1000*d)<=_tauC(100*1000*_ar(dia)/sp/(1000*d),fck)){D=Dc;break}}
  if(D===null)return{fail:'No depth up to 1500 mm satisfies bending and shear; raise fck, widen the wall or reduce the load',pass:false};
  const nw=25*B*D/1e3,done=nw<=Wf+1e-9;if(!done)Wf=nw;if(done)break}
 const d=D-cov-dia/2,Mu=qu*l*l/2,A=Math.max(_ast(Mu,1000,d,fck,fy),1.2*D),sp=Math.floor(Math.min(1000*_ar(dia)/A,3*d,300)/5)*5,Ap=1000*_ar(dia)/sp,tv=qu*Math.max(l-d/1e3,0)*1e3/(1000*d),
 tc=_tauC(100*Ap/(1000*d),fck),spD=Math.floor(Math.min(1000*_ar(dia)/(1.2*D),5*d,450)/5)*5,Ld=dia*.87*fy/(4*_TBD[fck]*1.6),avail=l*1e3-cov+8*dia,Wact=25*B*D/1e3,qs=(w+Wact)/B,
 checks=[qs<=qa,tv<=tc,Ld<=avail],r={B,D,l,qu,Mu,Ast:A,spM:sp,spD,tv,tc,Ld,avail,Wf:Wact,qs,checks,vol:B*D/1e3,wt:dia*dia/162*(1000/sp+1000/spD*B),type:'wall'};
 r.cost=r.vol*(i.rc||9000)+r.wt*(i.rs||110);r.pass=checks.every(Boolean);return r}
function footCalc(i){if(i.type=='wall')return _wall(i);
 const F2=typeof combinedCalc==='function'?{combinedCalc,pilecapCalc}:require('./footing2.js');if(i.type=='combined')return F2.combinedCalc(i);if(i.type=='pilecap')return F2.pilecapCalc(i);
 const{P,qa,a,c,cover:cov,dia,fck,fy}=i,ratio=Math.max(i.ratio||1,1),e=i.type=='ecc'?i.M/P:0;let Wf=.1*P,B,L,D,d;const Ld0=dia*.87*fy/(4*_TBD[fck]*1.6),dow0=.005*a*c,dd0=[12,16,20,25,32].find(x=>4*_ar(x)>=dow0)||32,Ldc0=dd0*.87*fy/(4*_TBD[fck]*1.6*1.25);
 for(let it=0;it<8;it++){B=L=null;
  for(let k=8;k<=160;k++){const Bc=k*.05,Lc=Math.ceil(k*ratio-1e-9)*.05;if(Bc*1e3<c+300||Lc*1e3<a+300||e>Lc/6||(Lc*1e3-a)/2-cov+8*dia<Ld0||(Bc*1e3-c)/2-cov+8*dia<Ld0)continue;
   if((P+Wf)/(Bc*Lc)*(1+6*e/Lc)<=qa){B=Bc;L=Lc;break}}
  if(B===null)return{fail:'No footing up to 8 m satisfies the soil pressure; check the load or bearing capacity',pass:false};
  D=null;for(let Dc=300;Dc<=2000;Dc+=25){d=_design(i,B,L,Dc);if(d&&d.tvL<=d.tcL&&d.tvB<=d.tcB&&d.tvp<=d.tcp&&Ldc0<=Dc-cov-2*dia+8*dd0&&d.stOK){D=Dc;break}}
  if(D===null)return{fail:'No depth up to 2000 mm satisfies bending, shear and punching; enlarge the column, raise fck or reduce the load',pass:false};
  const nw=25*_vol(i,B,L,D),done=nw<=Wf+1e-9;if(!done)Wf=nw;if(done)break}
 const A1=Math.min(B*L*1e6,(a+4*D)*(c+4*D)),A2=a*c,Pbr=.45*fck*Math.min(Math.sqrt(A1/A2),2)*A2/1e3,Ld=dia*.87*fy/(4*_TBD[fck]*1.6),avail=Math.min(d.l,d.lb)*1e3-cov+8*dia,
 Wact=25*_vol(i,B,L,D),qs=(P+Wact)/(B*L)*(1+6*e/L),qm=(P+Wact)/(B*L)*(1-6*e/L),beta=L/B,nC=Math.ceil(2/(beta+1)*d.nB-1e-9),dow=.005*a*c,
 ddia=[12,16,20,25,32].find(x=>4*_ar(x)>=dow)||32,ndow=Math.max(4,Math.ceil(dow/_ar(ddia))),Ldc=ddia*.87*fy/(4*_TBD[fck]*1.6*1.25),extC=Math.max(300,Math.ceil(Ldc/25-1e-9)*25),
 spL=Math.floor((B*1e3-2*cov)/(d.nL-1)/5)*5,spB=Math.floor((L*1e3-2*cov)/(d.nB-1)/5)*5,vol=_vol(i,B,L,D),
 wt=dia*dia/162*(d.nL*(L*1e3-2*cov)+d.nB*(B*1e3-2*cov))/1e3+ddia*ddia/162*ndow*(D-cov+extC)/1e3,
 checks=[qs<=qa,qm>=0,d.tvL<=d.tcL,d.tvB<=d.tcB,d.tvp<=d.tcp,Pbr>=d.Pu,Ld<=avail,Ldc<=D-cov-2*dia+8*ddia,d.stOK],
 [L2s,B2s]=i.type=='stepped'?_steps(i,B,L):[L,B],r=Object.assign({},d,{D1:_d1(D),L2:L2s,B2:B2s,B,L,D,Wf:Wact,qs,qm,Pbr,Ld,avail,beta,nC,nSide:d.nB-nC,dow,ddia,ndow,Ldc,extC,spL,spB,vol,wt,cost:vol*(i.rc||9000)+wt*(i.rs||110),checks});
 r.pass=checks.every(Boolean);return r}
if(typeof module!=='undefined')module.exports={footCalc,_ast,_n,_tauC,_ar,_TBD};
