// ---------- critical points and levels ----------
function logAbsF(z){return Math.log(Math.max(1e-300,cabs(polyEval(state.P,z))))-Math.log(Math.max(1e-300,cabs(polyEval(state.Q,z))))}
function localCriticalData(w){
  const p=polyEval(state.P,w),q=polyEval(state.Q,w);if(cabs(p)<1e-10||cabs(q)<1e-10)return null;let der=state.D;
  for(let m=1;m<=state.D.length;m++){der=polyDerivative(der);const v=polyEval(der,w);if(cabs(v)>1e-8*Math.max(1,cabs(p)*cabs(q))){const k=m+1,A=div(v,scale(mul(p,q),factorial(m)*k));return{w:clone(w),p,q,k,A,level:Math.log(cabs(p)/cabs(q)),ratio2:abs2(p)/abs2(q)}}}return null;
}
function criticalEntries(){const disk=smallestEnclosingCircle([...state.zeros,...state.poles]),tol=Math.max(1e-8,disk.radius*1e-7),out=[];for(const w of state.critical){if(out.some(e=>dist(e.w,w)<tol))continue;const e=localCriticalData(w);if(e)out.push(e)}return out}
function groupLevels(entries,tol=1e-8){const sorted=entries.slice().sort((a,b)=>a.level-b.level),groups=[];for(const e of sorted){const g=groups.at(-1),s=1+Math.abs(e.level)+(g?Math.abs(g.level):0);if(!g||Math.abs(e.level-g.level)>tol*s)groups.push({level:e.level,entries:[e]});else{g.entries.push(e);g.level=g.entries.reduce((x,q)=>x+q.level,0)/g.entries.length}}return groups}
function levelColor(i,n){const t=n<=1?.5:i/(n-1),h=220-195*t,l=68-4*Math.abs(2*t-1);return`hsl(${h.toFixed(1)} 82% ${l.toFixed(1)}%)`}

// ---------- critical lemniscates ----------
function edgePoint(edge,x,y,a,b,c,d,level){const interp=(v0,v1)=>{const den=v1-v0;return Math.max(0,Math.min(1,Math.abs(den)<1e-14?.5:(level-v0)/den))};if(edge===0){const t=interp(a,b);return[x+t,y]}if(edge===1){const t=interp(b,c);return[x+1,y+t]}if(edge===2){const t=interp(d,c);return[x+t,y+1]}const t=interp(a,d);return[x,y+t]}
function marchLevel(ctx,grid,N,level,sx,sy){
  ctx.beginPath();const row=N+1;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const a=grid[y*row+x],b=grid[y*row+x+1],c=grid[(y+1)*row+x+1],d=grid[(y+1)*row+x];if(!Number.isFinite(a+b+c+d))continue;
    const mask=(a>level?1:0)|(b>level?2:0)|(c>level?4:0)|(d>level?8:0);if(mask===0||mask===15)continue;const cr=[];if((a>level)!==(b>level))cr.push(0);if((b>level)!==(c>level))cr.push(1);if((d>level)!==(c>level))cr.push(2);if((a>level)!==(d>level))cr.push(3);
    const seg=(e0,e1)=>{const p=edgePoint(e0,x,y,a,b,c,d,level),q=edgePoint(e1,x,y,a,b,c,d,level);ctx.moveTo(p[0]*sx,p[1]*sy);ctx.lineTo(q[0]*sx,q[1]*sy)};
    if(cr.length===2){seg(cr[0],cr[1]);continue}if(cr.length!==4)continue;const high=(a+b+c+d)/4>level;if(mask===5){if(high){seg(0,1);seg(2,3)}else{seg(0,3);seg(1,2)}}else if(mask===10){if(high){seg(0,3);seg(1,2)}else{seg(0,1);seg(2,3)}}
  }ctx.stroke();
}
function correctAngle(entry,r,theta){
  const span=.42*Math.PI/entry.k;let t=theta;
  for(let it=0;it<12;it++){const radial=scale(expi(t),r),z=add(entry.w,radial),dz=C(-radial.im,radial.re),p=polyEval(state.P,z),q=polyEval(state.Q,z),pd=polyEval(state.Pd,z),qd=polyEval(state.Qd,z),g=abs2(p)-entry.ratio2*abs2(q),slope=2*(mul(conj(p),mul(pd,dz)).re-entry.ratio2*mul(conj(q),mul(qd,dz)).re);if(!Number.isFinite(g)||!Number.isFinite(slope)||Math.abs(slope)<1e-16)break;const step=Math.max(-span,Math.min(span,g/slope));t-=step;if(Math.abs(step)<1e-10)break}return t;
}
function patchRadius(entry,entries,quality){const px=2*state.view.half/Math.min(plot.clientWidth,plot.clientHeight),disk=smallestEnclosingCircle([...state.zeros,...state.poles]);let r=px*(quality?25:16),nearest=Infinity;for(const z of [...state.zeros,...state.poles])nearest=Math.min(nearest,dist(entry.w,z));for(const e of entries)if(e!==entry)nearest=Math.min(nearest,dist(entry.w,e.w));if(Number.isFinite(nearest))r=Math.min(r,.26*nearest);r=Math.min(r,.13*Math.max(disk.radius,px));return Math.max(px*7,r)}
function nodeBranches(entry,r,quality){const out=[],count=quality?20:10;for(let j=0;j<2*entry.k;j++){let theta=(Math.PI/2-carg(entry.A)+j*Math.PI)/entry.k;const pts=[clone(entry.w)];for(let m=1;m<=count;m++){const s=m/count,rr=r*(.035+.965*s**1.12);theta=correctAngle(entry,rr,theta);pts.push(add(entry.w,scale(expi(theta),rr)))}out.push(pts)}return out}
function drawContours(quality){
  const{w,h}=resizeCanvas(),ctx=canvas.getContext("2d");ctx.clearRect(0,0,w,h);if(!document.getElementById("lemniscateToggle").checked)return;
  const entries=criticalEntries();if(!entries.length)return;const groups=groupLevels(entries,quality?1e-9:1e-7),colors=new Map();groups.forEach((g,i)=>{g.color=levelColor(i,groups.length);for(const e of g.entries)colors.set(e,g.color)});
  const side=Math.min(w,h),N=quality?Math.max(150,Math.min(260,Math.round(side/2.8))):Math.max(70,Math.min(112,Math.round(side/6.3))),row=N+1,grid=new Float64Array(row*row);
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const z=fromScreen(i/N*plot.clientWidth,j/N*plot.clientHeight);grid[j*row+i]=Math.max(-45,Math.min(45,logAbsF(z)))}
  const sx=w/N,sy=h/N;ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=quality?1.55:1.2;for(const g of groups){ctx.strokeStyle=g.color;marchLevel(ctx,grid,N,g.level,sx,sy)}
  const patches=entries.map(e=>({e,r:patchRadius(e,entries,quality)})),ppu=Math.min(w,h)/(2*state.view.half);ctx.globalCompositeOperation="destination-out";ctx.fillStyle="#000";for(const q of patches){const p=toScreen(q.e.w);ctx.beginPath();ctx.arc(p.x,p.y,q.r*ppu*1.04+1.7,0,2*Math.PI);ctx.fill()}
  ctx.globalCompositeOperation="source-over";ctx.lineWidth=quality?2:1.55;for(const q of patches){ctx.strokeStyle=colors.get(q.e)||"#fff";for(const branch of nodeBranches(q.e,q.r,quality)){ctx.beginPath();branch.forEach((z,i)=>{const p=toScreen(z);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.stroke()}}ctx.restore();
}

// ---------- Newton flow in two spherical charts ----------
function newtonVelocity(P,Q,D,z,down){const d=polyEval(D,z);if(cabs(d)<1e-18)return null;let v=div(mul(polyEval(P,z),polyEval(Q,z)),d);if(down)v=neg(v);return finiteC(v)?v:null}
function reciprocal(z){return div(C(1,0),z)}
function traceBranch(entry,type,arm,disk,quality){
  const down=type==="zero",theta=((down?Math.PI:0)-carg(entry.A)+2*Math.PI*arm)/entry.k,scaleRef=Math.max(disk.radius,1e-3),stepZ=Math.max(scaleRef*(quality?.0045:.0105),2e-6),eps=Math.max(stepZ*.55,scaleRef*4e-4),hit=Math.max(stepZ*2.7,scaleRef*8e-4);
  const switchRadius=Math.max(10,5*(cabs(disk.center)+disk.radius),4*state.view.half),returnRadius=.62*switchRadius,stepU=6*stepZ/(switchRadius*switchRadius),maxSteps=quality?7200:2100;
  let chart="z",coord=add(entry.w,scale(expi(theta),eps)),segments=[[clone(entry.w),clone(coord)]],current=segments[0],endpoint=-1,resolved=false,hitSaddle=false,crossedInfinity=false;
  for(let k=0;k<maxSteps;k++){
    if(chart==="z"){
      const z=coord,targets=down?state.zeros:state.poles;let nearest=Infinity,ni=-1;for(let i=0;i<targets.length;i++){const dd=dist(z,targets[i]);if(dd<nearest){nearest=dd;ni=i}}if(nearest<hit){current.push(clone(targets[ni]));endpoint=ni;resolved=true;break}
      for(const w of state.critical)if(dist(w,entry.w)>hit&&dist(z,w)<hit*1.2){hitSaddle=true;break}if(hitSaddle)break;
      let v=newtonVelocity(state.P,state.Q,state.D,z,down);if(!v)break;v=scale(v,1/cabs(v));const mid=add(z,scale(v,stepZ*.5));let v2=newtonVelocity(state.P,state.Q,state.D,mid,down);if(!v2)break;v2=scale(v2,1/cabs(v2));const next=add(z,scale(v2,stepZ));if(k%(quality?2:1)===0)current.push(clone(next));coord=next;
      if(cabs(next)>switchRadius){current.push(clone(next));coord=reciprocal(next);chart="u";current=null;crossedInfinity=true}
    }else{
      const u=coord;let v=newtonVelocity(state.Pr,state.Qr,state.Dr,u,down);if(!v)break;v=scale(v,1/cabs(v));const mid=add(u,scale(v,stepU*.5));let v2=newtonVelocity(state.Pr,state.Qr,state.Dr,mid,down);if(!v2)break;v2=scale(v2,1/cabs(v2));const next=add(u,scale(v2,stepU));coord=next;
      if(cabs(next)>1/returnRadius){const z=reciprocal(next);chart="z";coord=z;current=[clone(z)];segments.push(current)}
    }
  }
  return{type,segments,endpoint,resolved,hitSaddle,crossedInfinity};
}
function computeFlow(quality){const disk=smallestEnclosingCircle([...state.zeros,...state.poles]),entries=criticalEntries(),branches=[];for(const e of entries){for(let j=0;j<e.k;j++)branches.push(traceBranch(e,"zero",j,disk,quality));for(let j=0;j<e.k;j++)branches.push(traceBranch(e,"pole",j,disk,quality))}return{disk,entries,branches}}
function pathString(points){let d="";points.forEach((z,i)=>{const p=toScreen(z);d+=(i?"L":"M")+p.x.toFixed(2)+","+p.y.toFixed(2)});return d}
