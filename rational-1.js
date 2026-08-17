"use strict";

// ---------- complex and polynomial arithmetic ----------
const C=(re=0,im=0)=>({re,im});
const add=(a,b)=>C(a.re+b.re,a.im+b.im),sub=(a,b)=>C(a.re-b.re,a.im-b.im);
const mul=(a,b)=>C(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
const div=(a,b)=>{const d=b.re*b.re+b.im*b.im||1e-300;return C((a.re*b.re+a.im*b.im)/d,(a.im*b.re-a.re*b.im)/d)};
const scale=(a,s)=>C(a.re*s,a.im*s),neg=a=>C(-a.re,-a.im),conj=a=>C(a.re,-a.im);
const abs2=a=>a.re*a.re+a.im*a.im,cabs=a=>Math.hypot(a.re,a.im),carg=a=>Math.atan2(a.im,a.re);
const expi=t=>C(Math.cos(t),Math.sin(t)),dist=(a,b)=>cabs(sub(a,b)),clone=a=>C(a.re,a.im);
const finiteC=a=>Number.isFinite(a.re)&&Number.isFinite(a.im);
const polyEval=(a,z)=>{let y=C();for(let k=a.length-1;k>=0;k--)y=add(mul(y,z),a[k]);return y};
const polyDerivative=a=>a.length<=1?[C()]:a.slice(1).map((v,k)=>scale(v,k+1));
const polyMul=(a,b)=>{const c=Array.from({length:a.length+b.length-1},()=>C());for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)c[i+j]=add(c[i+j],mul(a[i],b[j]));return c};
const polySub=(a,b)=>{const n=Math.max(a.length,b.length),c=[];for(let i=0;i<n;i++)c.push(sub(a[i]||C(),b[i]||C()));return trimPoly(c)};
const polyFromRoots=roots=>{let a=[C(1,0)];for(const r of roots)a=polyMul(a,[neg(r),C(1,0)]);return a};
function trimPoly(a){let m=0;for(const z of a)m=Math.max(m,cabs(z));const tol=1e-12*Math.max(1,m);while(a.length>1&&cabs(a.at(-1))<tol)a.pop();return a}
function factorial(n){let x=1;for(let k=2;k<=n;k++)x*=k;return x}
function solvePolynomial(coeffs,seeds=null){
  let a=trimPoly(coeffs.map(clone));const n=a.length-1;if(n<=0)return[];
  const lead=a[n];a=a.map(z=>div(z,lead));const da=polyDerivative(a);let roots;
  if(seeds&&seeds.length===n&&seeds.every(finiteC))roots=seeds.map((z,k)=>add(z,scale(expi(1.31*k+.47),1e-5)));
  else{
    let R=1;for(let k=0;k<n;k++){const ak=cabs(a[k]);if(ak>0)R=Math.max(R,2*Math.pow(ak,1/(n-k)))}
    roots=Array.from({length:n},(_,k)=>scale(expi(2*Math.PI*(k+.29)/n),R*(.72+.22*(k+.5)/n)));
  }
  let rootScale=Math.max(1,...roots.map(cabs));
  for(let iter=0;iter<320;iter++){
    let maxCorr=0;
    const next=roots.map((z,i)=>{
      const p=polyEval(a,z),dp=polyEval(da,z);let newton=cabs(dp)>1e-18?div(p,dp):scale(expi(iter*.31+i),1e-5),sum=C();
      for(let j=0;j<n;j++)if(j!==i){let dz=sub(z,roots[j]);if(cabs(dz)<1e-13)dz=add(dz,scale(expi(iter+i+j),1e-9));sum=add(sum,div(C(1,0),dz))}
      const den=sub(C(1,0),mul(newton,sum));let corr=cabs(den)>1e-14?div(newton,den):newton;
      if(!finiteC(corr))corr=scale(expi(i+.2*iter),1e-5);const cap=Math.max(1,rootScale*.55);if(cabs(corr)>cap)corr=scale(corr,cap/cabs(corr));
      maxCorr=Math.max(maxCorr,cabs(corr));return sub(z,corr);
    });
    roots=next;rootScale=Math.max(1,...roots.map(cabs));if(maxCorr<2e-13)break;
  }
  return roots.map(z=>{for(let k=0;k<24;k++){const p=polyEval(a,z),dp=polyEval(da,z);if(cabs(dp)<1e-18)break;const corr=div(p,dp);if(!finiteC(corr))break;z=sub(z,corr);if(cabs(corr)<2e-14)break}return z});
}
function popcount(x){let c=0;while(x){x&=x-1;c++}return c}
function matchPoints(oldPts,newPts){
  const n=newPts.length;if(!oldPts||oldPts.length!==n||n>12)return newPts;
  const size=1<<n,dp=Array(size).fill(Infinity),parent=Array(size).fill(null);dp[0]=0;
  for(let mask=0;mask<size;mask++){const i=popcount(mask);if(i>=n||!Number.isFinite(dp[mask]))continue;for(let j=0;j<n;j++)if(!(mask&(1<<j))){const m=mask|(1<<j),v=dp[mask]+abs2(sub(oldPts[i],newPts[j]));if(v<dp[m]){dp[m]=v;parent[m]=[mask,j]}}}
  const out=Array(n);let mask=size-1;for(let i=n-1;i>=0;i--){if(!parent[mask])return newPts;const[p,j]=parent[mask];out[i]=newPts[j];mask=p}return out;
}

// ---------- Euclidean geometry ----------
function smallestEnclosingCircle(points){
  if(!points.length)return{center:C(),radius:0};const candidates=[];
  for(const p of points)candidates.push({center:clone(p),radius:0});
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){const center=scale(add(points[i],points[j]),.5);candidates.push({center,radius:dist(center,points[i])})}
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)for(let k=j+1;k<points.length;k++){
    const a=points[i],b=points[j],c=points[k],d=2*(a.re*(b.im-c.im)+b.re*(c.im-a.im)+c.re*(a.im-b.im));if(Math.abs(d)<1e-12)continue;
    const aa=abs2(a),bb=abs2(b),cc=abs2(c),center=C((aa*(b.im-c.im)+bb*(c.im-a.im)+cc*(a.im-b.im))/d,(aa*(c.re-b.re)+bb*(a.re-c.re)+cc*(b.re-a.re))/d);candidates.push({center,radius:dist(center,a)});
  }
  let best=null;for(const q of candidates){const tol=1e-9*Math.max(1,q.radius);if(points.every(z=>dist(z,q.center)<=q.radius+tol)&&(!best||q.radius<best.radius))best=q}return best||{center:clone(points[0]),radius:0};
}
function niceStep(x){const p=10**Math.floor(Math.log10(x)),m=x/p;return(m<1.5?1:m<3.5?2:m<7.5?5:10)*p}

// ---------- state ----------
const state={degree:2,zeros:[],poles:[],zeroGroups:[],poleGroups:[],P:[],Q:[],Pd:[],Qd:[],D:[],Pr:[],Qr:[],Prd:[],Qrd:[],Dr:[],critical:[],view:{cx:0,cy:1,half:2.8},dragging:null,renderQueued:false,fullRender:true,dataDirty:true,flow:null,warning:""};
const singletonGroups=n=>Array.from({length:n},(_,i)=>i);
const defaults={
  2:{zeros:[C(-1,0),C(1,0)],poles:[C(0,2),C(0,3)]},
  3:{zeros:[C(-1.45,-.25),C(.25,1.15),C(1.2,-.55)],poles:[C(-.85,1.9),C(.65,2.05),C(.25,-1.75)]},
  4:{zeros:[C(-1.55,-.25),C(-.45,1.15),C(.65,1),C(1.45,-.55)],poles:[C(-1.1,2),C(.6,2.15),C(1.55,.25),C(-.2,-1.75)]},
  5:{zeros:[C(-1.7,-.35),C(-.9,1.05),C(.05,1.45),C(1.15,.85),C(1.55,-.65)],poles:[C(-1.45,1.95),C(-.25,2.2),C(1.1,1.85),C(1.75,.15),C(-.15,-1.8)]},
  6:{zeros:[C(-1.8,-.25),C(-1.25,.85),C(-.35,1.45),C(.65,1.35),C(1.45,.55),C(1.55,-.75)],poles:[C(-1.55,1.95),C(-.55,2.3),C(.55,2.15),C(1.55,1.35),C(1.85,-.1),C(-.1,-1.95)]}
};
function recompute(){
  const old=state.critical.map(clone);state.P=polyFromRoots(state.zeros);state.Q=polyFromRoots(state.poles);state.Pd=polyDerivative(state.P);state.Qd=polyDerivative(state.Q);
  state.D=trimPoly(polySub(polyMul(state.Pd,state.Q),polyMul(state.P,state.Qd)));
  state.Pr=state.P.slice().reverse().map(clone);state.Qr=state.Q.slice().reverse().map(clone);state.Prd=polyDerivative(state.Pr);state.Qrd=polyDerivative(state.Qr);state.Dr=trimPoly(polySub(polyMul(state.Prd,state.Qr),polyMul(state.Pr,state.Qrd)));
  state.critical=matchPoints(old,solvePolynomial(state.D,old));state.dataDirty=true;
  state.warning="";for(const a of state.zeros)for(const b of state.poles)if(dist(a,b)<1e-5)state.warning="A zero and a pole nearly coincide. Their common factor should be cancelled; separate them to keep the displayed degree and graph unambiguous.";
}
function reset(degree=state.degree){state.degree=degree;const d=defaults[degree]||defaults[2];state.zeros=d.zeros.map(clone);state.poles=d.poles.map(clone);state.zeroGroups=singletonGroups(degree);state.poleGroups=singletonGroups(degree);state.critical=[];recompute();fitView()}
function randomize(){
  const d=state.degree,zeros=[],poles=[];for(let k=0;k<d;k++){const t=2*Math.PI*k/d+(Math.random()-.5)*.5,r=.7+Math.random()*1.15;zeros.push(C(r*Math.cos(t)+(Math.random()-.5)*.25,r*Math.sin(t)+(Math.random()-.5)*.25));const s=t+.55+.8*Math.random(),rp=1.25+Math.random()*1.25;poles.push(C(rp*Math.cos(s)+(Math.random()-.5)*.35,rp*Math.sin(s)+(Math.random()-.5)*.35))}
  state.zeros=zeros;state.poles=poles;state.zeroGroups=singletonGroups(d);state.poleGroups=singletonGroups(d);state.critical=[];recompute();fitView();
}

// ---------- DOM and coordinate transforms ----------
const plot=document.getElementById("plot"),svg=document.getElementById("plotSvg"),canvas=document.getElementById("contourCanvas"),NS="http://www.w3.org/2000/svg";
function dims(el){return{w:el.clientWidth,h:el.clientHeight}}
function toScreen(z){const{w,h}=dims(plot),s=Math.min(w,h)/(2*state.view.half);return{x:w/2+(z.re-state.view.cx)*s,y:h/2-(z.im-state.view.cy)*s}}
function fromScreen(x,y){const{w,h}=dims(plot),s=Math.min(w,h)/(2*state.view.half);return C(state.view.cx+(x-w/2)/s,state.view.cy-(y-h/2)/s)}
function eventPoint(e){const r=plot.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function svgEl(name,attrs={}){const el=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);return el}
function clearSvg(){while(svg.firstChild)svg.removeChild(svg.firstChild)}
function fitView(){const disk=smallestEnclosingCircle([...state.zeros,...state.poles]);state.view.cx=disk.center.re;state.view.cy=disk.center.im;state.view.half=Math.max(.8,disk.radius*1.42);scheduleRender(true)}
function drawGrid(){
  const{w,h}=dims(plot),step=niceStep(2*state.view.half/5),den=Math.min(w,h),xmin=state.view.cx-state.view.half*w/den,xmax=state.view.cx+state.view.half*w/den,ymin=state.view.cy-state.view.half*h/den,ymax=state.view.cy+state.view.half*h/den,origin=smallestEnclosingCircle([...state.zeros,...state.poles]).center;
  for(let k=Math.ceil((xmin-origin.re)/step);k<=Math.floor((xmax-origin.re)/step);k++){const p=toScreen(C(origin.re+k*step,origin.im));svg.appendChild(svgEl("line",{x1:p.x,y1:0,x2:p.x,y2:h,class:k===0?"axis-line":"grid-line"}))}
  for(let k=Math.ceil((ymin-origin.im)/step);k<=Math.floor((ymax-origin.im)/step);k++){const p=toScreen(C(origin.re,origin.im+k*step));svg.appendChild(svgEl("line",{x1:0,y1:p.y,x2:w,y2:p.y,class:k===0?"axis-line":"grid-line"}))}
}
function resizeCanvas(){const w=Math.max(1,Math.floor(plot.clientWidth)),h=Math.max(1,Math.floor(plot.clientHeight));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}return{w,h}}
