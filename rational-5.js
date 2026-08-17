"use strict";

// ---------- zero disk and Newton-edge length diagnostics ----------
// For each finite zero, measure the shortest resolved descending Newton edge
// from a finite non-pole critical point. Euclidean length is infinite if the
// spherical edge passes through infinity in the current affine chart.

const r5Bars=document.getElementById("rationalFlowBars");
const r5Axis=document.getElementById("rationalFlowAxis");
const r5Summary=document.getElementById("rationalFlowSummary");
const r5Status=document.getElementById("zeroDiskStatus");

function r5ZeroDiskData(){
  const inf=r4InfinityData();
  if(inf.zeroOrder>0)return{available:false,reason:`∞ is a zero of multiplicity ${inf.zeroOrder}. No finite Euclidean disk contains the complete zero fiber in this chart.`,inf};
  if(!state.zeros.length)return{available:false,reason:"There are no finite zeros.",inf};
  return{available:true,disk:smallestEnclosingCircle(state.zeros),inf};
}

function r5BranchArcLength(branch){
  if(!branch?.resolved)return NaN;
  if(branch.endpointInfinity||branch.crossedInfinity)return Infinity;
  let length=0;
  for(const segment of branch.segments||[]){
    for(let i=1;i<segment.length;i++)length+=dist(segment[i-1],segment[i]);
  }
  return length;
}

function r5FiniteCriticalSites(){
  const all=[...state.critical.map(clone)];
  const addUnique=z=>{const scaleRef=Math.max(1,cabs(z));if(!all.some(q=>dist(q,z)<=2e-8*scaleRef))all.push(clone(z))};
  for(let i=0;i<state.zeros.length;i++)if(groupMembers("zero",i).length>1)addUnique(state.zeros[i]);
  for(let i=0;i<state.poles.length;i++)if(groupMembers("pole",i).length>1)addUnique(state.poles[i]);
  return all;
}

function r5ComputeZeroMetrics(flow,zeroDiskData){
  const criticalSites=r5FiniteCriticalSites();
  const R=zeroDiskData.available?zeroDiskData.disk.radius:NaN;
  const zeroBranches=(flow.branches||[]).filter(b=>b.type==="zero");
  return state.zeros.map((zero,index)=>{
    const direct=groupMembers("zero",index).length>1||criticalSites.some(w=>dist(w,zero)<=2e-8*Math.max(1,cabs(zero)));
    let selected=null,arc=direct?0:NaN,incidentChord=direct?0:NaN;
    if(!direct){
      const candidates=zeroBranches.filter(b=>b.resolved&&b.endpoint===index);
      for(const branch of candidates){
        const value=r5BranchArcLength(branch);
        if(!selected||value<arc||(!Number.isFinite(arc)&&Number.isFinite(value))){
          selected=branch;arc=value;
          const start=branch.segments?.[0]?.[0];
          incidentChord=start?dist(start,zero):NaN;
        }
      }
    }
    let nearestChord=Infinity;
    for(const w of criticalSites)nearestChord=Math.min(nearestChord,dist(zero,w));
    if(!criticalSites.length)nearestChord=NaN;
    const normalize=value=>{
      if(!zeroDiskData.available)return NaN;
      if(R<=1e-14)return value===0?0:Infinity;
      return value/R;
    };
    return{index,zero,direct,branch:selected,arc,incidentChord,nearestChord,arcRatio:normalize(arc),incidentRatio:normalize(incidentChord),nearestRatio:normalize(nearestChord)};
  });
}

const r5BaseComputeFlow=computeFlow;
computeFlow=function(quality){
  const flow=r5BaseComputeFlow(quality),zeroDiskData=r5ZeroDiskData();
  flow.zeroDiskData=zeroDiskData;
  flow.zeroMetrics=r5ComputeZeroMetrics(flow,zeroDiskData);
  return flow;
};

function r5InsertBeforeGraph(el){
  const anchor=svg.querySelector(".flow,.critical-node,.node,.stack-ring");
  if(anchor)svg.insertBefore(el,anchor);else svg.appendChild(el);
}

function r5ReplaceDisplayedDisk(){
  for(const el of [...svg.querySelectorAll(".enclosing-disk,.disk-center")])el.remove();
  if(!document.getElementById("diskToggle").checked)return;
  const data=state.flow?.zeroDiskData||r5ZeroDiskData();
  if(!data.available)return;
  const{w,h}=dims(plot),p=toScreen(data.disk.center),ppu=Math.min(w,h)/(2*state.view.half),r=data.disk.radius*ppu;
  const circle=svgEl("circle",{cx:p.x,cy:p.y,r,class:"enclosing-disk zero-enclosing-disk"});
  const horizontal=svgEl("line",{x1:p.x-5,y1:p.y,x2:p.x+5,y2:p.y,class:"disk-center zero-disk-center"});
  const vertical=svgEl("line",{x1:p.x,y1:p.y-5,x2:p.x,y2:p.y+5,class:"disk-center zero-disk-center"});
  r5InsertBeforeGraph(vertical);r5InsertBeforeGraph(horizontal);r5InsertBeforeGraph(circle);
}

function r5MarkMeasuredBranches(){
  for(const path of [...svg.querySelectorAll(".flow.to-zero")])path.classList.remove("measured");
  const selected=new Set((state.flow?.zeroMetrics||[]).map(m=>m.branch).filter(Boolean));
  const paths=[...svg.querySelectorAll(".flow.to-zero")];
  let cursor=0;
  for(const branch of (state.flow?.branches||[]).filter(b=>b.type==="zero")){
    const count=(branch.segments||[]).filter(seg=>seg.length>1).length;
    for(let k=0;k<count;k++)if(selected.has(branch)&&paths[cursor+k])paths[cursor+k].classList.add("measured");
    cursor+=count;
  }
}

const r5BaseRenderSvg=renderSvg;
renderSvg=function(quality){r5BaseRenderSvg(quality);r5ReplaceDisplayedDisk();r5MarkMeasuredBranches()};

function r5RatioText(value){
  if(Number.isNaN(value))return"—";
  if(!Number.isFinite(value))return"∞";
  return value.toFixed(3);
}
function r5ValueText(value){
  if(Number.isNaN(value))return"unresolved";
  if(!Number.isFinite(value))return"infinite in this affine chart";
  return value.toPrecision(6);
}

function r5RenderBars(){
  if(!r5Bars||!r5Axis||!r5Summary||!r5Status)return;
  const flow=state.flow,zeroDiskData=flow?.zeroDiskData||r5ZeroDiskData(),metrics=flow?.zeroMetrics||[];
  if(!zeroDiskData.available){
    r5Status.textContent="R unavailable";
    r5Bars.innerHTML="";r5Axis.innerHTML="";
    r5Summary.textContent=zeroDiskData.reason;
    return;
  }
  const R=zeroDiskData.disk.radius;
  r5Status.textContent=`R ${R.toFixed(4)} · ${metrics.length} finite Z`;
  const ordered=metrics.slice().sort((a,b)=>{
    const ar=a.arcRatio,br=b.arcRatio;
    if(!Number.isFinite(ar)&&!Number.isFinite(br))return a.index-b.index;
    if(!Number.isFinite(ar))return-1;if(!Number.isFinite(br))return 1;
    return br-ar;
  });
  const finiteArc=ordered.map(m=>m.arcRatio).filter(Number.isFinite);
  const maxArc=finiteArc.length?Math.max(...finiteArc):0;
  const scaleMax=Math.max(2.2,Math.ceil((maxArc+.05)*10)/10);
  const pct=value=>Number.isFinite(value)?Math.max(0,Math.min(100,100*value/scaleMax)):100;
  const onePct=100/scaleMax,twoPct=200/scaleMax;
  r5Bars.innerHTML=ordered.map(m=>{
    const unresolved=Number.isNaN(m.arcRatio),infinite=m.arcRatio===Infinity,over2=Number.isFinite(m.arcRatio)&&m.arcRatio>2+1e-6,over1=Number.isFinite(m.arcRatio)&&m.arcRatio>1+1e-6;
    const title=`arc ${r5ValueText(m.arc)}; incident chord ${r5ValueText(m.incidentChord)}; nearest critical chord ${r5ValueText(m.nearestChord)}; R ${R.toPrecision(6)}`;
    const nearest=Number.isFinite(m.nearestRatio)?`<span class="r5-nearest-marker" style="left:${pct(m.nearestRatio).toFixed(3)}%" title="nearest critical chord / R = ${m.nearestRatio.toFixed(5)}"></span>`:"";
    return`<div class="r5-row" data-root-index="${m.index}" title="${title}">
      <span class="r5-root-dot"></span>
      <span class="r5-track">
        <span class="r5-fill${over2?" over-two":over1?" over-one":""}${infinite?" infinite":""}${unresolved?" unresolved":""}" style="width:${unresolved?0:pct(m.arcRatio).toFixed(3)}%"></span>
        <span class="r5-threshold one" style="left:${onePct.toFixed(3)}%"></span>
        <span class="r5-threshold two" style="left:${twoPct.toFixed(3)}%"></span>
        ${nearest}
      </span>
      <span class="r5-value${over2||infinite?" over":""}">${r5RatioText(m.arcRatio)}</span>
    </div>`;
  }).join("");
  const ticks=[0,1,2];if(scaleMax>2.21)ticks.push(scaleMax);
  r5Axis.innerHTML=ticks.map(v=>`<span style="left:${(100*v/scaleMax).toFixed(3)}%">${v===scaleMax&&v!==2?v.toFixed(1):v}</span>`).join("");
  const resolved=metrics.filter(m=>!Number.isNaN(m.arcRatio)).length,infinite=metrics.filter(m=>m.arcRatio===Infinity).length;
  const maxNearest=Math.max(...metrics.map(m=>m.nearestRatio).filter(Number.isFinite),0);
  const maxFiniteArc=finiteArc.length?Math.max(...finiteArc):NaN;
  let text="Bars are shortest incident Newton-edge arc lengths. Orange markers are nearest critical-point chords. The lines at 1 and 2 mark R and 2R; only the straight chord statistic has the sharp universal ≤2 theorem.";
  if(Number.isFinite(maxFiniteArc))text+=` Largest finite arc ratio: ${maxFiniteArc.toFixed(4)}.`;
  if(Number.isFinite(maxNearest))text+=` Largest nearest-critical ratio: ${maxNearest.toFixed(4)}.`;
  if(resolved<metrics.length)text+=` ${metrics.length-resolved} zero${metrics.length-resolved===1?" is":"s are"} unresolved.`;
  if(infinite)text+=` ${infinite} selected edge${infinite===1?" crosses":"s cross"} ∞, hence has infinite Euclidean length in this chart.`;
  r5Summary.textContent=text;
}

const r5BaseRender=render;
render=function(quality){r5BaseRender(quality);r5RenderBars()};
state.dataDirty=true;
scheduleRender(true);
