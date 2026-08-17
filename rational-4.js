"use strict";

// ---------- mathematically correct editable rational maps ----------
// A single critical point cannot generically be moved while every other
// critical point and every pole is fixed: the zero-residue conditions on
// f'(z) constrain the critical divisor. The "move zeros (W fixed)" mode below
// instead uses the genuine one-complex-parameter family f_c=f+c.

const r4AddZeroBtn=document.getElementById("addZeroBtn");
const r4AddPoleBtn=document.getElementById("addPoleBtn");
const r4FiberBtn=document.getElementById("fiberBtn");
const r4InfinityBtn=document.getElementById("toInfinityBtn");
const r4SphereWrap=document.getElementById("sphereWrap");
const r4SphereSvg=document.getElementById("sphereSvg");
const r4SphereStatus=document.getElementById("sphereStatus");

function r4PolyAddScaled(a,b,c){
  const n=Math.max(a.length,b.length),out=[];
  for(let i=0;i<n;i++)out.push(add(a[i]||C(),mul(c,b[i]||C())));
  return trimPoly(out);
}
function r4PadAtZero(a,k){return [...Array.from({length:k},()=>C()),...a.map(clone)]}
function r4InfinityData(){
  const m=state.zeros.length,n=state.poles.length,d=Math.max(m,n);
  const finiteCriticalDegree=Math.max(0,state.D.length-1);
  return{degree:d,zeroOrder:Math.max(0,n-m),poleOrder:Math.max(0,m-n),criticalMultiplicity:Math.max(0,2*d-2-finiteCriticalDegree)};
}
function r4EnsureGroups(){
  if(state.zeroGroups.length!==state.zeros.length)state.zeroGroups=singletonGroups(state.zeros.length);
  if(state.poleGroups.length!==state.poles.length)state.poleGroups=singletonGroups(state.poles.length);
}

// Recompute in a common homogeneous degree. The reciprocal-chart polynomials
// must be padded when deg P != deg Q; a plain coefficient reversal is only
// correct in the equal-degree case.
recompute=function(){
  const old=state.critical.map(clone);
  r4EnsureGroups();
  state.P=polyFromRoots(state.zeros);
  state.Q=polyFromRoots(state.poles);
  state.Pd=polyDerivative(state.P);
  state.Qd=polyDerivative(state.Q);
  state.D=trimPoly(polySub(polyMul(state.Pd,state.Q),polyMul(state.P,state.Qd)));
  const m=state.P.length-1,n=state.Q.length-1,d=Math.max(m,n);
  state.degree=d;
  state.Pr=r4PadAtZero(state.P.slice().reverse(),d-m);
  state.Qr=r4PadAtZero(state.Q.slice().reverse(),d-n);
  state.Prd=polyDerivative(state.Pr);
  state.Qrd=polyDerivative(state.Qr);
  state.Dr=trimPoly(polySub(polyMul(state.Prd,state.Qr),polyMul(state.Pr,state.Qrd)));
  state.critical=matchPoints(old,solvePolynomial(state.D,old));
  state.dataDirty=true;
  state.warning="";
  for(const a of state.zeros)for(const b of state.poles)if(dist(a,b)<1e-5){
    state.warning="A zero and a pole nearly coincide. Cancel the common factor, or separate them, before interpreting the displayed degree and graph.";
  }
};

reset=function(){
  const d=defaults[2];
  state.zeros=d.zeros.map(clone);state.poles=d.poles.map(clone);
  state.zeroGroups=singletonGroups(state.zeros.length);state.poleGroups=singletonGroups(state.poles.length);
  state.critical=[];state.r4Notice="";r4CancelAllModes(false);recompute();fitView();
};
randomize=function(){
  r4CancelAllModes(false);
  const mz=state.zeros.length,mp=state.poles.length,zeros=[],poles=[];
  for(let k=0;k<mz;k++){
    const t=2*Math.PI*(k+.23)/Math.max(1,mz)+(Math.random()-.5)*.55,r=.65+Math.random()*1.25;
    zeros.push(C(r*Math.cos(t)+(Math.random()-.5)*.3,r*Math.sin(t)+(Math.random()-.5)*.3));
  }
  for(let k=0;k<mp;k++){
    const t=2*Math.PI*(k+.61)/Math.max(1,mp)+(Math.random()-.5)*.55,r=1.05+Math.random()*1.55;
    poles.push(C(r*Math.cos(t)+(Math.random()-.5)*.35,r*Math.sin(t)+(Math.random()-.5)*.35));
  }
  state.zeros=zeros;state.poles=poles;state.zeroGroups=singletonGroups(mz);state.poleGroups=singletonGroups(mp);state.critical=[];recompute();fitView();
};

// ---------- spherical tracing, including endpoints at infinity ----------
function r4SpherePointFromZ(z){const r2=abs2(z),d=1+r2;return{x:2*z.re/d,y:2*z.im/d,z:(r2-1)/d}}
function r4SpherePointFromU(u){const r2=abs2(u),d=1+r2;return{x:2*u.re/d,y:-2*u.im/d,z:(1-r2)/d}}
const r4North={x:0,y:0,z:1};

traceBranch=function(entry,type,arm,disk,quality){
  const down=type==="zero",theta=((down?Math.PI:0)-carg(entry.A)+2*Math.PI*arm)/entry.k,scaleRef=Math.max(disk.radius,1e-3);
  const stepZ=Math.max(scaleRef*(quality?.0045:.0105),2e-6),eps=Math.max(stepZ*.55,scaleRef*4e-4),hit=Math.max(stepZ*2.7,scaleRef*8e-4);
  const switchRadius=Math.max(10,5*(cabs(disk.center)+disk.radius),4*state.view.half),returnRadius=.62*switchRadius,stepU=6*stepZ/(switchRadius*switchRadius),hitU=Math.max(stepU*3.2,2e-7),maxSteps=quality?7200:2100;
  const inf=r4InfinityData(),infinityIsEndpoint=down?inf.zeroOrder>0:inf.poleOrder>0;
  let chart="z",coord=add(entry.w,scale(expi(theta),eps)),segments=[[clone(entry.w),clone(coord)]],current=segments[0],endpoint=-1,resolved=false,hitSaddle=false,crossedInfinity=false,endpointInfinity=false;
  const spherePoints=[r4SpherePointFromZ(entry.w),r4SpherePointFromZ(coord)];
  for(let k=0;k<maxSteps;k++){
    if(chart==="z"){
      const z=coord,targets=down?state.zeros:state.poles;let nearest=Infinity,ni=-1;
      for(let i=0;i<targets.length;i++){const dd=dist(z,targets[i]);if(dd<nearest){nearest=dd;ni=i}}
      if(nearest<hit){current.push(clone(targets[ni]));spherePoints.push(r4SpherePointFromZ(targets[ni]));endpoint=ni;resolved=true;break}
      for(const w of state.critical)if(dist(w,entry.w)>hit&&dist(z,w)<hit*1.2){hitSaddle=true;break}if(hitSaddle)break;
      let v=newtonVelocity(state.P,state.Q,state.D,z,down);if(!v)break;v=scale(v,1/cabs(v));
      const mid=add(z,scale(v,stepZ*.5));let v2=newtonVelocity(state.P,state.Q,state.D,mid,down);if(!v2)break;v2=scale(v2,1/cabs(v2));
      const next=add(z,scale(v2,stepZ));if(k%(quality?2:1)===0){current.push(clone(next));spherePoints.push(r4SpherePointFromZ(next))}coord=next;
      if(cabs(next)>switchRadius){current.push(clone(next));spherePoints.push(r4SpherePointFromZ(next));coord=reciprocal(next);chart="u";current=null;crossedInfinity=true}
    }else{
      const u=coord;
      if(infinityIsEndpoint&&cabs(u)<hitU){spherePoints.push(r4North);resolved=true;endpoint=-2;endpointInfinity=true;break}
      let v=newtonVelocity(state.Pr,state.Qr,state.Dr,u,down);if(!v)break;v=scale(v,1/cabs(v));
      const mid=add(u,scale(v,stepU*.5));let v2=newtonVelocity(state.Pr,state.Qr,state.Dr,mid,down);if(!v2)break;v2=scale(v2,1/cabs(v2));
      const next=add(u,scale(v2,stepU));coord=next;if(k%(quality?2:1)===0)spherePoints.push(r4SpherePointFromU(next));
      if(cabs(next)>1/returnRadius){const z=reciprocal(next);chart="z";coord=z;current=[clone(z)];segments.push(current);spherePoints.push(r4SpherePointFromZ(z))}
    }
  }
  return{type,segments,endpoint,resolved,hitSaddle,crossedInfinity,endpointInfinity,spherePoints};
};

// ---------- modes: live placement, fixed-critical fiber, chart change ----------
state.r4Placement=null;state.r4InfinityPick=false;state.r4FiberMode=false;state.r4FiberBase=null;state.r4Notice="";
function r4SetButtonActive(button,on){button?.classList.toggle("mode-active",!!on)}
function r4CancelPlacement(restore=true){
  const p=state.r4Placement;if(!p)return;
  if(restore){state.zeros=p.zeros.map(clone);state.poles=p.poles.map(clone);state.zeroGroups=p.zeroGroups.slice();state.poleGroups=p.poleGroups.slice();state.critical=[];recompute();scheduleRender(true)}
  state.r4Placement=null;r4SetButtonActive(r4AddZeroBtn,false);r4SetButtonActive(r4AddPoleBtn,false);plot.classList.remove("placing");
}
function r4DisableFiber(){state.r4FiberMode=false;state.r4FiberBase=null;r4SetButtonActive(r4FiberBtn,false)}
function r4DisableInfinityPick(){state.r4InfinityPick=false;r4SetButtonActive(r4InfinityBtn,false);plot.classList.remove("infinity-pick")}
function r4CancelAllModes(restorePlacement=true){r4CancelPlacement(restorePlacement);r4DisableFiber();r4DisableInfinityPick()}
function r4BeginPlacement(kind){
  if(state.r4Placement?.kind===kind){r4CancelPlacement(true);return}
  r4CancelAllModes(true);
  state.r4Placement={kind,zeros:state.zeros.map(clone),poles:state.poles.map(clone),zeroGroups:state.zeroGroups.slice(),poleGroups:state.poleGroups.slice(),preview:null};
  r4SetButtonActive(kind==="zero"?r4AddZeroBtn:r4AddPoleBtn,true);plot.classList.add("placing");state.r4Notice=`Move the pointer over the plane, then click to place the new ${kind}. Press Escape to cancel.`;scheduleRender(false);
}
function r4PreviewPlacement(z){
  const p=state.r4Placement;if(!p)return;
  state.zeros=p.zeros.map(clone);state.poles=p.poles.map(clone);state.zeroGroups=p.zeroGroups.slice();state.poleGroups=p.poleGroups.slice();
  if(p.kind==="zero"){state.zeros.push(clone(z));state.zeroGroups.push(freshGroupId(state.zeroGroups))}else{state.poles.push(clone(z));state.poleGroups.push(freshGroupId(state.poleGroups))}
  p.preview=clone(z);recompute();scheduleRender(false);
}
function r4CommitPlacement(z){if(!state.r4Placement)return;r4PreviewPlacement(z);state.r4Placement=null;r4SetButtonActive(r4AddZeroBtn,false);r4SetButtonActive(r4AddPoleBtn,false);plot.classList.remove("placing");state.r4Notice="";scheduleRender(true)}

function r4BeginFiberMode(){
  if(state.r4FiberMode){r4DisableFiber();state.r4Notice="";scheduleRender(false);return}
  r4CancelPlacement(true);r4DisableInfinityPick();state.r4FiberMode=true;state.r4FiberBase={P:state.P.map(clone),Q:state.Q.map(clone),critical:state.critical.map(clone),c:C()};r4SetButtonActive(r4FiberBtn,true);
  state.r4Notice="Fixed-critical mode: drag a blue zero. The family is f+c, so every pole and every critical point stays fixed.";scheduleRender(false);
}
function r4ApplyFiberTarget(target){
  const base=state.r4FiberBase;if(!base)return;const q=polyEval(base.Q,target);
  if(cabs(q)<1e-9){state.r4Notice="The requested zero lies at a pole, where f+c cannot vanish without cancellation.";return}
  const c=neg(div(polyEval(base.P,target),q)),coeff=r4PolyAddScaled(base.P,base.Q,c);
  if(coeff.length<=1){state.r4Notice="This value of c makes the numerator constant; move away from the exceptional point.";return}
  let roots=matchPoints(state.zeros,solvePolynomial(coeff,state.zeros));
  if(roots.length){let nearest=0;for(let i=1;i<roots.length;i++)if(dist(roots[i],target)<dist(roots[nearest],target))nearest=i;roots[nearest]=clone(target)}
  state.zeros=roots;state.zeroGroups=singletonGroups(roots.length);base.c=c;recompute();if(base.critical.length===state.critical.length)state.critical=matchPoints(base.critical,state.critical);
  state.r4Notice=`Fixed-critical family f+c, with c ≈ ${c.re.toFixed(3)} ${c.im<0?"−":"+"} ${Math.abs(c.im).toFixed(3)}i.`;scheduleRender(false);
}

function r4Median(values){const a=values.filter(x=>Number.isFinite(x)&&x>1e-10).sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)/2)]:1}
function r4SendGroupToInfinity(kind,index){
  const pts=points(kind),members=groupMembers(kind,index),selected=new Set(members),b=clone(pts[index]);
  for(const otherKind of ["zero","pole"])for(let i=0;i<points(otherKind).length;i++){
    if(otherKind===kind&&selected.has(i))continue;
    if(dist(points(otherKind)[i],b)<1e-8){state.r4Notice="A zero and pole coincide at the selected chart point; cancel the common factor first.";return}
  }
  const oldInf=r4InfinityData(),distances=[];
  for(const otherKind of ["zero","pole"])points(otherKind).forEach((z,i)=>{if(!(otherKind===kind&&selected.has(i)))distances.push(dist(z,b))});
  const s=r4Median(distances),T=z=>scale(div(C(1,0),sub(z,b)),s),newZeros=[],newZeroGroups=[],newPoles=[],newPoleGroups=[];
  state.zeros.forEach((z,i)=>{if(kind==="zero"&&selected.has(i))return;newZeros.push(T(z));newZeroGroups.push(state.zeroGroups[i])});
  state.poles.forEach((z,i)=>{if(kind==="pole"&&selected.has(i))return;newPoles.push(T(z));newPoleGroups.push(state.poleGroups[i])});
  if(oldInf.zeroOrder){const gid=freshGroupId(newZeroGroups);for(let k=0;k<oldInf.zeroOrder;k++){newZeros.push(C());newZeroGroups.push(gid)}}
  if(oldInf.poleOrder){const gid=freshGroupId(newPoleGroups);for(let k=0;k<oldInf.poleOrder;k++){newPoles.push(C());newPoleGroups.push(gid)}}
  state.zeros=newZeros;state.poles=newPoles;state.zeroGroups=newZeroGroups;state.poleGroups=newPoleGroups;state.critical=[];recompute();fitView();r4DisableInfinityPick();
  state.r4Notice=`Changed affine chart by ζ=${s.toPrecision(3)}/(z−b); the selected ${kind}${members.length>1?" stack":""} is now at ∞.`;
}
function r4BeginInfinityPick(){
  if(state.r4InfinityPick){r4DisableInfinityPick();state.r4Notice="";scheduleRender(false);return}
  r4CancelPlacement(true);r4DisableFiber();state.r4InfinityPick=true;r4SetButtonActive(r4InfinityBtn,true);plot.classList.add("infinity-pick");state.r4Notice="Click a finite zero or pole. A Möbius chart change sends that entire stack to ∞ and moves the former ∞ to 0.";scheduleRender(false);
}

r4AddZeroBtn?.addEventListener("click",()=>r4BeginPlacement("zero"));
r4AddPoleBtn?.addEventListener("click",()=>r4BeginPlacement("pole"));
r4FiberBtn?.addEventListener("click",r4BeginFiberMode);
r4InfinityBtn?.addEventListener("click",r4BeginInfinityPick);
plot.addEventListener("pointermove",e=>{if(!state.r4Placement)return;const p=eventPoint(e);r4PreviewPlacement(fromScreen(p.x,p.y))},true);
plot.addEventListener("pointerdown",e=>{
  const target=e.target;
  if(state.r4Placement){e.preventDefault();e.stopImmediatePropagation();const p=eventPoint(e);r4CommitPlacement(fromScreen(p.x,p.y));return}
  const node=target.closest?.(".draggable");
  if(state.r4InfinityPick&&node){e.preventDefault();e.stopImmediatePropagation();r4SendGroupToInfinity(node.dataset.kind,+node.dataset.index);return}
  if(target.closest?.(".critical-node")){e.preventDefault();e.stopImmediatePropagation();state.r4Notice="A single critical point cannot generally move while all other critical points and all poles remain fixed: the zero-residue constraints on f′ would fail. Use ‘Move zeros (W fixed)’ for the valid family f+c.";scheduleRender(false);return}
  if(state.r4FiberMode&&node?.dataset.kind==="zero"){e.preventDefault();e.stopImmediatePropagation();const p=eventPoint(e);state.dragging={kind:"r4fiber",pointerId:e.pointerId,startX:p.x,startY:p.y,moved:false};r4ApplyFiberTarget(fromScreen(p.x,p.y));plot.setPointerCapture?.(e.pointerId);return}
  if(state.r4FiberMode&&node?.dataset.kind==="pole")r4DisableFiber();
},true);
window.addEventListener("pointermove",e=>{const d=state.dragging;if(!d||d.kind!=="r4fiber"||e.pointerId!==d.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const p=eventPoint(e);d.moved=d.moved||Math.hypot(p.x-d.startX,p.y-d.startY)>2;r4ApplyFiberTarget(fromScreen(p.x,p.y))},true);
window.addEventListener("pointerup",e=>{const d=state.dragging;if(!d||d.kind!=="r4fiber"||e.pointerId!==d.pointerId)return;e.preventDefault();e.stopImmediatePropagation();state.dragging=null;scheduleRender(true)},true);
window.addEventListener("pointercancel",e=>{if(state.dragging?.kind!=="r4fiber")return;e.stopImmediatePropagation();state.dragging=null;scheduleRender(true)},true);
window.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(state.r4Placement){r4CancelPlacement(true);state.r4Notice=""}else if(state.r4InfinityPick){r4DisableInfinityPick();state.r4Notice=""}else if(state.r4FiberMode){r4DisableFiber();state.r4Notice=""}scheduleRender(true)});

// ---------- Riemann sphere side view ----------
const r4SphereView={yaw:-.68,pitch:.34,drag:null};
function r4RotateSphere(v){const cy=Math.cos(r4SphereView.yaw),sy=Math.sin(r4SphereView.yaw),x1=cy*v.x+sy*v.z,z1=-sy*v.x+cy*v.z,y1=v.y,cp=Math.cos(r4SphereView.pitch),sp=Math.sin(r4SphereView.pitch);return{x:x1,y:cp*y1-sp*z1,z:sp*y1+cp*z1}}
function r4SphereProjection(v,g){const q=r4RotateSphere(v);return{x:g.cx+g.r*q.x,y:g.cy-g.r*q.y,depth:q.z}}
function r4SpherePath(points,g){let d="";for(let i=0;i<points.length;i++){const p=r4SphereProjection(points[i],g);d+=(i?"L":"M")+p.x.toFixed(2)+","+p.y.toFixed(2)}return d}
function r4AppendSphereCurve(points,g,cls){
  if(points.length<2)return;const front=[],back=[];
  for(let i=1;i<points.length;i++){const a=r4SphereProjection(points[i-1],g),b=r4SphereProjection(points[i],g),arr=(a.depth+b.depth)/2>=0?front:back;arr.push(`M${a.x.toFixed(2)},${a.y.toFixed(2)}L${b.x.toFixed(2)},${b.y.toFixed(2)}`)}
  if(back.length)r4SphereSvg.appendChild(svgEl("path",{d:back.join(""),class:`sphere-curve sphere-back ${cls}`}));
  if(front.length)r4SphereSvg.appendChild(svgEl("path",{d:front.join(""),class:`sphere-curve sphere-front ${cls}`}));
}
function r4SphereNode(v,kind,multiplicity,label,g){
  const p=r4SphereProjection(v,g),group=svgEl("g",{class:`sphere-node-group ${p.depth<0?"sphere-hidden":""}`});let node;
  if(kind==="pole")node=svgEl("path",{d:`M ${p.x} ${p.y-6} L ${p.x+6} ${p.y} L ${p.x} ${p.y+6} L ${p.x-6} ${p.y} Z`,class:"sphere-node sphere-pole"});
  else node=svgEl("circle",{cx:p.x,cy:p.y,r:kind==="critical"?4.8:5.8,class:`sphere-node sphere-${kind}`});
  const title=svgEl("title");title.textContent=label;node.appendChild(title);group.appendChild(node);
  if(multiplicity>1){const t=svgEl("text",{x:p.x+7,y:p.y-7,class:"sphere-multiplicity"});t.textContent=`×${multiplicity}`;group.appendChild(t)}r4SphereSvg.appendChild(group);
}
function r4DrawGraticule(g){
  for(const lat of [-Math.PI/3,-Math.PI/6,0,Math.PI/6,Math.PI/3]){const pts=[];for(let i=0;i<=96;i++){const lon=2*Math.PI*i/96;pts.push({x:Math.cos(lat)*Math.cos(lon),y:Math.cos(lat)*Math.sin(lon),z:Math.sin(lat)})}r4SphereSvg.appendChild(svgEl("path",{d:r4SpherePath(pts,g),class:lat===0?"sphere-equator":"sphere-grid"}))}
  for(let k=0;k<8;k++){const lon=2*Math.PI*k/8,pts=[];for(let i=0;i<=64;i++){const lat=-Math.PI/2+Math.PI*i/64;pts.push({x:Math.cos(lat)*Math.cos(lon),y:Math.cos(lat)*Math.sin(lon),z:Math.sin(lat)})}r4SphereSvg.appendChild(svgEl("path",{d:r4SpherePath(pts,g),class:"sphere-grid"}))}
}
function r4RenderSphere(){
  if(!r4SphereSvg||!r4SphereWrap)return;const w=Math.max(220,r4SphereWrap.clientWidth),h=Math.max(220,r4SphereWrap.clientHeight),g={cx:w/2,cy:h/2,r:.42*Math.min(w,h)};
  r4SphereSvg.setAttribute("viewBox",`0 0 ${w} ${h}`);while(r4SphereSvg.firstChild)r4SphereSvg.removeChild(r4SphereSvg.firstChild);
  r4SphereSvg.appendChild(svgEl("circle",{cx:g.cx,cy:g.cy,r:g.r,class:"sphere-disk"}));r4DrawGraticule(g);
  if(document.getElementById("graphToggle").checked&&state.flow){for(const b of state.flow.branches){if(!b.spherePoints?.length)continue;const cls=b.resolved?(b.type==="zero"?"sphere-to-zero":"sphere-from-pole"):"sphere-unresolved";r4AppendSphereCurve(b.spherePoints,g,cls)}}
  for(const w0 of state.critical)r4SphereNode(r4SpherePointFromZ(w0),"critical",1,"critical point",g);
  const zSeen=new Set();state.zeros.forEach((z,i)=>{const gid=state.zeroGroups[i],mem=groupMembers("zero",i);if(zSeen.has(gid))return;zSeen.add(gid);r4SphereNode(r4SpherePointFromZ(z),"zero",mem.length,"zero",g)});
  const pSeen=new Set();state.poles.forEach((z,i)=>{const gid=state.poleGroups[i],mem=groupMembers("pole",i);if(pSeen.has(gid))return;pSeen.add(gid);r4SphereNode(r4SpherePointFromZ(z),"pole",mem.length,"pole",g)});
  const inf=r4InfinityData();if(inf.criticalMultiplicity)r4SphereNode(r4North,"critical",inf.criticalMultiplicity,"critical point at infinity",g);if(inf.zeroOrder)r4SphereNode(r4North,"zero",inf.zeroOrder,"zero at infinity",g);if(inf.poleOrder)r4SphereNode(r4North,"pole",inf.poleOrder,"pole at infinity",g);
  const north=r4SphereProjection(r4North,g),label=svgEl("text",{x:north.x+8,y:north.y-8,class:"sphere-infinity-label"});label.textContent="∞";r4SphereSvg.appendChild(label);
  if(r4SphereStatus){const parts=[];if(inf.zeroOrder)parts.push(`zero ×${inf.zeroOrder}`);if(inf.poleOrder)parts.push(`pole ×${inf.poleOrder}`);if(inf.criticalMultiplicity)parts.push(`critical ×${inf.criticalMultiplicity}`);r4SphereStatus.textContent=parts.length?`∞: ${parts.join(" · ")}`:"∞ regular"}
}
r4SphereSvg?.addEventListener("pointerdown",e=>{e.preventDefault();const r=r4SphereSvg.getBoundingClientRect();r4SphereView.drag={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top,yaw:r4SphereView.yaw,pitch:r4SphereView.pitch};r4SphereSvg.setPointerCapture?.(e.pointerId)});
window.addEventListener("pointermove",e=>{const d=r4SphereView.drag;if(!d||e.pointerId!==d.id)return;const r=r4SphereSvg.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;r4SphereView.yaw=d.yaw+(x-d.x)*.012;r4SphereView.pitch=Math.max(-1.35,Math.min(1.35,d.pitch+(y-d.y)*.012));r4RenderSphere()});
window.addEventListener("pointerup",e=>{if(r4SphereView.drag?.id===e.pointerId)r4SphereView.drag=null});window.addEventListener("pointercancel",()=>{r4SphereView.drag=null});

// ---------- status and render integration ----------
updateStatus=function(){
  const inf=r4InfinityData(),finiteCritical=state.critical.length,resolved=state.flow?state.flow.branches.filter(b=>b.resolved).length:0,all=state.flow?state.flow.branches.length:0;
  const zText=`${state.zeros.length} finite Z${inf.zeroOrder?` + Z∞×${inf.zeroOrder}`:""}`,pText=`${state.poles.length} finite P${inf.poleOrder?` + P∞×${inf.poleOrder}`:""}`,cText=`${finiteCritical} finite C${inf.criticalMultiplicity?` + C∞×${inf.criticalMultiplicity}`:""}`;
  document.getElementById("countStatus").textContent=`degree ${inf.degree} · ${zText} · ${pText} · ${cText}`;
  const warning=document.getElementById("warning");let msg=state.warning||"";if(state.r4Notice)msg+=(msg?" ":"")+state.r4Notice;if(all&&resolved<all)msg+=(msg?" ":"")+`${all-resolved} separatrix arm${all-resolved===1?"":"s"} did not reach a zero, pole, or ∞ numerically.`;warning.textContent=msg;warning.classList.toggle("show",!!msg);
};
const r4BaseRender=render;render=function(quality){r4BaseRender(quality);r4RenderSphere()};
const r4LegacyDegree=document.getElementById("degreeSelect");if(r4LegacyDegree)r4LegacyDegree.value="2";
recompute();fitView();scheduleRender(true);
