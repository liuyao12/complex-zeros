(() => {
  'use strict';
  const api = window.EFMultiView;
  if (!api) return;

  const defaultCamera={yaw:-.72,pitch:.45,zoom:1};
  const camera={...defaultCamera};
  let drag=null,renderQueued=false;

  const mix = (a,b,t) => a.map((v,i)=>Math.round(v+(b[i]-v)*Math.max(0,Math.min(1,t))));
  function color(z,light){
    const valley=[88,52,92],middle=[42,108,122],peak=[162,227,244];
    const base=z<0?mix(valley,middle,z+1):mix(middle,peak,z);
    return `rgb(${base.map(v=>Math.max(0,Math.min(255,Math.round(v*light)))).join(',')})`;
  }
  function arrow(ctx,a,b,size){
    const t=Math.atan2(b.y-a.y,b.x-a.x);ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-size*Math.cos(t-.55),b.y-size*Math.sin(t-.55));ctx.lineTo(b.x-size*Math.cos(t+.55),b.y-size*Math.sin(t+.55));ctx.closePath();ctx.fill();
  }

  function render(canvas, thumb, apiRef){
    const {ctx,width,height}=apiRef.resizeCanvas(canvas,canvas.clientWidth,canvas.clientHeight,thumb?1.5:2);
    ctx.fillStyle='#07131d';ctx.fillRect(0,0,width,height);
    const charges=apiRef.normalizedCharges();if(!charges.length)return;
    const xExtent=1.72*width/Math.max(1,height),yExtent=1.72,Nx=thumb?23:43,Ny=thumb?17:31;
    const view=thumb?defaultCamera:camera;
    const cy=Math.cos(view.yaw),sy=Math.sin(view.yaw),cp=Math.cos(view.pitch),sp=Math.sin(view.pitch);
    const scale=Math.min(width,height)*.28*view.zoom;
    const project=(x,y,z)=>{const rx=cy*x-sy*y,ry=sy*x+cy*y,vertical=sp*ry+cp*z,depth=cp*ry-sp*z;return{x:width/2+rx*scale,y:height*.60-vertical*scale,depth};};
    const grid=Array.from({length:Ny+1},()=>Array(Nx+1));
    for(let j=0;j<=Ny;j++)for(let i=0;i<=Nx;i++){const x=-xExtent+2*xExtent*i/Nx,y=yExtent-2*yExtent*j/Ny,z=apiRef.height({x,y},charges);grid[j][i]={x,y,z,...project(x,y,z)};}
    const cells=[];
    for(let j=0;j<Ny;j++)for(let i=0;i<Nx;i++){const q=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]];cells.push({q,d:q.reduce((s,p)=>s+p.depth,0)/4});}
    cells.sort((a,b)=>a.d-b.d);
    for(const cell of cells){const z=cell.q.reduce((s,p)=>s+p.z,0)/4,dx=cell.q[1].z-cell.q[0].z,dy=cell.q[3].z-cell.q[0].z,light=.78+.22/Math.sqrt(1+3*(dx*dx+dy*dy));ctx.beginPath();cell.q.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color(z,light);ctx.fill();ctx.strokeStyle=thumb?'rgba(215,240,244,.08)':'rgba(215,240,244,.12)';ctx.lineWidth=thumb?.35:.55;ctx.stroke();}
    const paths=apiRef.traceFlows(charges,xExtent,yExtent,thumb?2.7:4.4);ctx.lineCap='round';ctx.lineJoin='round';
    for(const path of paths){const pp=path.map(p=>project(p.x,p.y,apiRef.height(p,charges)+.025));ctx.beginPath();pp.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=thumb?'rgba(255,225,133,.66)':'rgba(255,229,146,.82)';ctx.lineWidth=thumb?.9:1.4;ctx.stroke();if(!thumb&&pp.length>12){const k=Math.floor(pp.length*.62);ctx.fillStyle='rgba(255,236,171,.92)';arrow(ctx,pp[k-2],pp[k],4);}}
    for(const c of charges){const p=project(c.x,c.y,c.q>0?1.08:-1.08);apiRef.drawCharge(ctx,p.x,p.y,c.q,thumb?5:7.7);}
    if(!thumb){ctx.fillStyle='rgba(245,250,252,.9)';ctx.font='700 13px ui-sans-serif,system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('H = −log |f|',13,12);ctx.fillStyle='rgba(202,220,226,.76)';ctx.font='11px ui-sans-serif,system-ui,sans-serif';ctx.fillText('drag to orbit · wheel to zoom · double-click to reset',13,30);}
  }

  function queueMainRender(){
    if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;const canvas=api.state?.mains?.height;if(canvas)render(canvas,false,api);});
  }

  function installInteraction(){
    const canvas=api.state?.mains?.height;if(!canvas||canvas.dataset.interactive==='true')return;
    canvas.dataset.interactive='true';canvas.removeAttribute('aria-hidden');canvas.tabIndex=0;
    canvas.setAttribute('aria-label','Interactive 3D logarithmic height surface. Drag to orbit, use the mouse wheel to zoom, and double-click to reset the camera.');
    canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:camera.yaw,pitch:camera.pitch};canvas.classList.add('is-dragging');canvas.setPointerCapture?.(event.pointerId);});
    canvas.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;camera.yaw=drag.yaw+(event.clientX-drag.x)*.008;camera.pitch=Math.max(.12,Math.min(1.28,drag.pitch-(event.clientY-drag.y)*.006));queueMainRender();});
    const end=event=>{if(!drag||event.pointerId!==drag.id)return;drag=null;canvas.classList.remove('is-dragging');canvas.releasePointerCapture?.(event.pointerId);};
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    canvas.addEventListener('wheel',event=>{event.preventDefault();camera.zoom=Math.max(.64,Math.min(1.7,camera.zoom*Math.exp(-event.deltaY*.0012)));queueMainRender();},{passive:false});
    canvas.addEventListener('dblclick',event=>{event.preventDefault();Object.assign(camera,defaultCamera);queueMainRender();});
    canvas.addEventListener('keydown',event=>{let used=true;if(event.key==='ArrowLeft')camera.yaw-=.08;else if(event.key==='ArrowRight')camera.yaw+=.08;else if(event.key==='ArrowUp')camera.pitch=Math.min(1.28,camera.pitch+.06);else if(event.key==='ArrowDown')camera.pitch=Math.max(.12,camera.pitch-.06);else if(event.key==='+'||event.key==='=')camera.zoom=Math.min(1.7,camera.zoom*1.08);else if(event.key==='-')camera.zoom=Math.max(.64,camera.zoom/1.08);else if(event.key==='0')Object.assign(camera,defaultCamera);else used=false;if(used){event.preventDefault();queueMainRender();}});
  }
  api.registerRenderer('height',render);
  installInteraction();
})();
