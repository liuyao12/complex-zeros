"use strict";

// Refine Euclidean arc length across reciprocal-chart portions. Merely using
// the u=1/z chart does not mean the curve passes through infinity; reconstruct
// every sampled point stereographically and sum in the affine z-coordinate.
// An actual crossing of u=0 is detected from consecutive reciprocal samples.

function r6SphereToAffine(p){
  const den=1-p.z;
  if(!(den>1e-14))return null;
  return C(p.x/den,p.y/den);
}
function r6SphereToReciprocal(p){
  const den=1+p.z;
  if(!(den>1e-14))return null;
  return C(p.x/den,-p.y/den);
}
function r6SegmentDistanceToOrigin(a,b){
  const d=sub(b,a),den=abs2(d);
  if(den<1e-30)return cabs(a);
  const t=Math.max(0,Math.min(1,-(a.re*d.re+a.im*d.im)/den));
  return cabs(add(a,scale(d,t)));
}
function r6CrossesInfinity(a,b){
  if(a.z<.45||b.z<.45)return false;
  const u0=r6SphereToReciprocal(a),u1=r6SphereToReciprocal(b);
  if(!u0||!u1)return true;
  const chord=dist(u0,u1);
  if(chord<1e-14)return false;
  const dot=u0.re*u1.re+u0.im*u1.im;
  return dot<0&&r6SegmentDistanceToOrigin(u0,u1)<.04*chord;
}

r5BranchArcLength=function(branch){
  if(!branch?.resolved)return NaN;
  if(branch.endpointInfinity)return Infinity;
  const points=branch.spherePoints||[];
  if(points.length<2){
    if(branch.crossedInfinity)return NaN;
    let fallback=0;
    for(const segment of branch.segments||[])for(let i=1;i<segment.length;i++)fallback+=dist(segment[i-1],segment[i]);
    return fallback;
  }
  let previous=r6SphereToAffine(points[0]);
  if(!previous)return Infinity;
  let length=0;
  for(let i=1;i<points.length;i++){
    if(r6CrossesInfinity(points[i-1],points[i]))return Infinity;
    const current=r6SphereToAffine(points[i]);
    if(!current)return Infinity;
    const step=dist(previous,current);
    if(!Number.isFinite(step))return Infinity;
    length+=step;previous=current;
  }
  return length;
};

state.dataDirty=true;
scheduleRender(true);
