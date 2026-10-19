// Self-contained 3D viewer: orbit/zoom/pan, translucent concrete, tube bars to scale, hover labels, section plane, build animation.
const V3=(()=>{
const COL={main:'#14a085',top:'#6f8bb0',side:'#a56cc1',stir:'#e08a2e',cross:'#d4a017',strip:'#2e9bd6'},
 NAME={main:'Main bars',top:'Top / compression bars',side:'Side-face bars',stir:'Stirrups / ties',cross:'Cross-ties'},
 PRE={iso:[-.7,.45],front:[0,0],side:[-1.5708,0],top:[0,1.5]};
function mount(host,S){
 const layers=[...new Set(S.prims.map(p=>p.L))],on={concrete:true,dims:true};layers.forEach(l=>on[l]=true);
 host.innerHTML=`<div class="v3bar">${['iso','front','side','top'].map(v=>`<button type="button" class="alt" data-v="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}<button type="button" class="alt" data-a="play">Play build</button><button type="button" class="alt" data-a="png">Save PNG</button></div>
 <div class="v3bar">${['concrete',...layers,'dims'].map(l=>`<label><input type="checkbox" data-l="${l}" checked> ${l=='concrete'?'Concrete':l=='dims'?'Dimensions':(S.names&&S.names[l])||NAME[l]}</label>`).join('')}<label>Opacity <input type="range" data-a="op" min="0" max="60" value="14"></label></div>
 <canvas tabindex="0" role="img" aria-label="3D view of the reinforcement. Drag to rotate, scroll to zoom, right-drag to pan, arrow keys rotate."></canvas><div class="v3tip" hidden></div>
 <div class="v3bar"><label>Section position <input type="range" data-a="sec" min="0" max="1000" value="500"></label></div><p class="hint" data-a="read"></p><p class="hint" aria-live="polite">${S.desc}</p>`;
 const cv=host.querySelector('canvas'),ctx=cv.getContext('2d'),tip=host.querySelector('.v3tip'),q=s=>host.querySelector(s),
  reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let yaw=-.7,pit=.45,dist=S.size*2.1,pan=[0,0],op=.14,build=1,sec=.5,hov=null,W=0,H=0,F=1;
 const size=()=>{const d=devicePixelRatio||1,w=host.clientWidth||600,h=Math.min(520,Math.max(320,w*.6));cv.width=w*d;cv.height=h*d;cv.style.width=w+'px';cv.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);W=w;H=h;F=Math.min(w,h)*1.1};
 const rot=(p,t)=>{const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pit),sp=Math.sin(pit),x=p[0]-(t?0:S.c[0]),y=p[1]-(t?0:S.c[1]),z=p[2]-(t?0:S.c[2]),x1=x*cy+z*sy,z1=-x*sy+z*cy;return[x1,y*cp-z1*sp,y*sp+z1*cp]};
 const pr=p=>{const[x,y,z]=rot(p),zc=dist+z,f=F/zc;return[W/2+(x+pan[0])*f,H/2-(y+pan[1])*f,zc,f]};
 const box=(X,Y,Z)=>[[0,0,0],[X,0,0],[X,Y,0],[0,Y,0],[0,0,Z],[X,0,Z],[X,Y,Z],[0,Y,Z]],B=box(S.X,S.Y,S.Z),
  FACES=[[[0,1,2,3],[0,0,-1]],[[4,5,6,7],[0,0,1]],[[0,1,5,4],[0,-1,0]],[[3,2,6,7],[0,1,0]],[[0,3,7,4],[-1,0,0]],[[1,2,6,5],[1,0,0]]];
 const vis=p=>{if(!on[p.L])return 0;if(build>=1)return 1;const b=build;return p.L=='main'?Math.min(1,b/.35):p.L=='top'||p.L=='side'?(b>.35?Math.min(1,(b-.35)/.1):0):(b>.45+.45*p.idx/Math.max(p.n,1)?1:0)};
 const face=(f,a)=>{ctx.beginPath();f[0].forEach((k,j)=>{const s=pr(B[k]);j?ctx.lineTo(s[0],s[1]):ctx.moveTo(s[0],s[1])});ctx.closePath();ctx.fillStyle=`rgba(150,170,175,${a})`;ctx.fill()};
 function tube(p,g,hl){const a=pr(p.a),e=[p.a[0]+(p.b[0]-p.a[0])*g,p.a[1]+(p.b[1]-p.a[1])*g,p.a[2]+(p.b[2]-p.a[2])*g],b=pr(e),w=Math.max(2*p.rad*(a[3]+b[3])/2,1.6)*(hl?1.5:1);
  ctx.lineCap='round';ctx.strokeStyle=hl?'#fff':COL[p.L];ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=w*.35;ctx.stroke();return[a,b,w]}
 function draw(){ctx.clearRect(0,0,W,H);const cs=getComputedStyle(cv).color,k=build<.9?0:(build-.9)*10,o=on.concrete?op*(build>=1?1:k):0,front=[],back=[];
  FACES.forEach(f=>{(rot(f[1],1)[2]<0?front:back).push(f)});back.forEach(f=>face(f,o));
  const list=S.prims.map(p=>({p,g:vis(p)})).filter(e=>e.g>0).map(e=>({...e,z:(pr(e.p.a)[2]+pr(e.p.b)[2])/2})).sort((a,b)=>b.z-a.z);
  S._hit=[];for(const e of list){const[a,b,w]=tube(e.p,e.g,e.p===hov);S._hit.push([a,b,w,e.p])}
  front.forEach(f=>face(f,o));ctx.strokeStyle=cs;ctx.globalAlpha=.55;ctx.lineWidth=1;
  [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([i,j])=>{const a=pr(B[i]),b=pr(B[j]);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()});for(const[p,q2]of S.lines||[]){const a=pr(p),b=pr(q2);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}for(const bx of S.boxes||[]){const[x0,y0,z0,x1,y1,z1]=bx,K=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([i,j])=>{const a=pr(K[i]),b=pr(K[j]);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()})}ctx.globalAlpha=1;
  const sc=S.sec(sec),Q=sc.axis=='x'?[[sc.v,0,0],[sc.v,S.Y,0],[sc.v,S.Y,S.Z],[sc.v,0,S.Z]]:sc.axis=='z'?[[0,0,sc.v],[S.X,0,sc.v],[S.X,S.Y,sc.v],[0,S.Y,sc.v]]:[[0,sc.v,0],[S.X,sc.v,0],[S.X,sc.v,S.Z],[0,sc.v,S.Z]];
  ctx.beginPath();Q.forEach((p,j)=>{const s=pr(p);j?ctx.lineTo(s[0],s[1]):ctx.moveTo(s[0],s[1])});ctx.closePath();ctx.fillStyle='rgba(201,63,39,.16)';ctx.fill();ctx.strokeStyle='#c93f27';ctx.lineWidth=1.5;ctx.stroke();
  q('[data-a=read]').textContent=sc.text;
  if(on.dims){ctx.font='12px system-ui,sans-serif';ctx.fillStyle=cs;ctx.strokeStyle=cs;ctx.lineWidth=1;for(const[a,b,t]of S.dims){const A=pr(a),C=pr(b);ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(C[0],C[1]);ctx.stroke();ctx.fillText(t,(A[0]+C[0])/2+4,(A[1]+C[1])/2-4)}}}
 const redraw=()=>requestAnimationFrame(draw);
 function pick(x,y){let best=null,bd=1e9;for(const[a,b,w,p]of S._hit||[]){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/l)),d=Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);if(d<Math.max(w/2,6)&&d<=bd){bd=d;best=p}}return best}
 let drag=null;
 const ptrs=new Map();let pd=0;cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);drag={x:e.clientX,y:e.clientY,pan:e.button==2||e.shiftKey};if(ptrs.size==2){const[a,b]=[...ptrs.values()];pd=Math.hypot(a[0]-b[0],a[1]-b[1])}});
 const up=e=>{ptrs.delete(e.pointerId);if(!ptrs.size)drag=null};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('contextmenu',e=>e.preventDefault());
 cv.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,[e.clientX,e.clientY]);if(ptrs.size==2){const[a,b]=[...ptrs.values()],dd=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pd)dist=Math.max(S.size*.6,Math.min(S.size*6,dist*pd/dd));pd=dd;redraw();return}if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
   if(drag.pan){pan[0]+=dx*dist/F;pan[1]-=dy*dist/F}else{yaw+=dx*.008;pit=Math.max(-1.5,Math.min(1.5,pit+dy*.008))}tip.hidden=true}
  else{const h=pick(e.clientX-r.left,e.clientY-r.top);if(h!==hov){hov=h;if(h){tip.hidden=false;tip.textContent=h.t}else tip.hidden=true}if(h){tip.style.left=e.clientX-r.left+12+'px';tip.style.top=e.clientY-r.top+12+'px'}}redraw()});
 cv.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(S.size*.6,Math.min(S.size*6,dist*(e.deltaY>0?1.1:.9)));redraw()},{passive:false});
 cv.addEventListener('keydown',e=>{const m={ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]}[e.key];if(m){yaw+=m[0];pit=Math.max(-1.5,Math.min(1.5,pit+m[1]));e.preventDefault()}else if(e.key=='+'||e.key=='-')dist*=e.key=='+'?.9:1.1;redraw()});
 host.addEventListener('click',e=>{const v=e.target.dataset.v,a=e.target.dataset.a;if(v){[yaw,pit]=PRE[v];pan=[0,0];dist=S.size*2.1;redraw()}
  if(a=='png')cv.toBlob(b=>{const l=document.createElement('a');l.href=URL.createObjectURL(b);l.download='rc_3d_view.png';l.click()});
  if(a=='play'){const bt=e.target,t0=performance.now();build=0;const step=()=>{build=Math.min(1,(performance.now()-t0)/5000);bt.textContent=build<1?'Building '+Math.round(build*100)+'%':'Play build';draw();if(build<1)requestAnimationFrame(step)};step()}});
 host.addEventListener('input',e=>{const t=e.target;if(t.dataset.l)on[t.dataset.l]=t.checked;if(t.dataset.a=='op')op=t.value/100;if(t.dataset.a=='sec')sec=t.value/1000;redraw()});
 new ResizeObserver(()=>{size();redraw()}).observe(host);size();draw()}
return{mount}})();
