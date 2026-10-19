// Browser copy of rc_beam/column.py. tests/test_web.js checks the two agree.
const _fs=typeof fsAt==='function'?fsAt:require('./is456.js').fsAt,ar=d=>Math.PI*d*d/4,
cEps=(x,y,D)=>x<=D?.0035*(x-y)/x:.002*(x-y)/(x-3*D/7),
cStr=(e,f)=>{if(e<=0)return 0;const q=e/.002;return e<.002?.446*f*(2*q-q*q):.446*f},
lay=(wc,hc,dc,depth,A)=>[[dc,wc*A],[depth-dc,wc*A]].concat(Array.from({length:hc-2},(_,j)=>[dc+(depth-2*dc)*(j+1)/(hc-1),2*A]));
function cPM(x,b,D,fck,fy,bars){const N=400,h=Math.min(x,D)/N;let F=0,M=0;
 for(let j=0;j<N;j++){const y=(j+.5)*h,s=cStr(cEps(x,y,D),fck);F+=s*b*h;M+=s*b*h*(D/2-y)}
 for(const[y,A]of bars){const e=cEps(x,y,D),f=A*(_fs(Math.abs(e),fy)*(e>0?1:-1)-cStr(e,fck));F+=f;M+=f*(D/2-y)}
 return[F,M]}
function cCap(P,b,D,fck,fy,bars){let lo=.05*D,hi=20*D;if(cPM(hi,b,D,fck,fy,bars)[0]/1e3<P)return null;
 for(let q=0;q<60;q++){const m=(lo+hi)/2;if(cPM(m,b,D,fck,fy,bars)[0]/1e3<P)lo=m;else hi=m}
 return cPM(hi,b,D,fck,fy,bars)[1]/1e6}
function colCalc(i){const{fck,fy,b,D,cover:cov}=i,Pu=1.5*i.P,Mx=1.5*i.Mx,My=1.5*i.My,
 sx=i.kf*i.Lx*1e3/D,sy=i.kf*i.Ly*1e3/b,Max=sx>12?Pu*D*sx*sx/2e6:0,May=sy>12?Pu*b*sy*sy/2e6:0,
 ex=Math.max(i.Lx*1e3/500+D/30,20),ey=Math.max(i.Ly*1e3/500+b/30,20),Mxd=Math.max(Mx+Max,Pu*ex/1e3),Myd=Math.max(My+May,Pu*ey/1e3),
 r={Pu,sx,sy,Max,May,ex,ey,Mxd,Myd,pass:false};
 if(sx>60||sy>60){r.fail='Too slender (effective length / dimension above 60, cl. 25.3.1)';return r}
 const C=[];for(const dia of[12,16,20,25,32]){const tie=[6,8,10,12].find(t=>t>=dia/4);
  for(let nb=2;nb<=6;nb++)for(let nd=2;nd<=8;nd++){const n=2*nb+2*nd-4,As=n*ar(dia),pt=100*As/(b*D);if(pt>4||n>32)continue;
   const cb=(b-2*(cov+tie)-nb*dia)/(nb-1),cd=(D-2*(cov+tie)-nd*dia)/(nd-1),lo=Math.max(dia,25);
   if(pt>=.8&&cb>=lo&&cb<=300&&cd>=lo&&cd<=300)C.push({As,dia,n,nb,nd,tie,dc:cov+tie+dia/2,pt})}}
 C.sort((a,c)=>a.As-c.As||a.dia-c.dia||a.nb-c.nb||a.nd-c.nd);
 let best=null,puzMax=0;
 for(const c of C){const Puz=(.45*fck*(b*D-c.As)+.75*fy*c.As)/1e3;puzMax=Math.max(puzMax,Puz);if(Pu>Puz)continue;
  const A1=ar(c.dia),M1=cCap(Pu,b,D,fck,fy,lay(c.nb,c.nd,c.dc,D,A1)),M2=cCap(Pu,D,b,fck,fy,lay(c.nd,c.nb,c.dc,b,A1));if(!M1||!M2||M1<=0||M2<=0)continue;
  const z=Pu/Puz,an=z<=.2?1:z>=.8?2:1+(z-.2)/.6,ratio=Math.pow(Mxd/M1,an)+Math.pow(Myd/M2,an);
  if(best===null||ratio<best)best=ratio;
  if(ratio<=1){const sv=Math.floor(Math.min(b,D,16*c.dia,300)/5)*5,H=Math.max(i.Lx,i.Ly),le=Math.max(Math.max(b,D),H*1e3/6,450),
    se=Math.max(75,Math.floor(Math.min(Math.min(b,D)/4,100)/5)*5),tpos=[];let p=.05;
   while(p<H-.05+1e-9){tpos.push(p);p+=(i.eq&&(p*1e3<le||(H-p)*1e3<le)?se:sv)/1e3}
   return Object.assign(r,c,{Puz,an,M1,M2,ratio,sv,se,le,tpos,nties:tpos.length,xt:(c.nb-2)+(c.nd-2),H,pass:true})}}
 r.bestRatio=best;r.puzMax=puzMax;r.fail='No bar arrangement satisfies the checks; increase the section or concrete grade';return r}
if(typeof module!=='undefined')module.exports={colCalc,cPM};
