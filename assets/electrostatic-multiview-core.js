(() => {
  'use strict';

  const card = document.getElementById('ef-card');
  const toolbar = card?.querySelector('.interactive-toolbar');
  const stage = document.getElementById('ef-stage');
  const overlay = document.getElementById('ef-overlay');
  const staticCanvas = document.getElementById('ef-static');
  const legacyParticles = document.getElementById('ef-particles');
  const legacyFlow = document.getElementById('ef-flow-toggle');
  const presetSelect = document.getElementById('ef-preset');
  if (!card || !toolbar || !stage || !overlay || !staticCanvas || !legacyParticles || !legacyFlow) return;

  const api = window.EFMultiView = {
    state: {
      active: 'plane',
      charges: [],
      signature: '',
      visible: true,
      renderers: new Map(),
      particles: [],
      lastTime: 0,
      flowEnabled: true,
      chargeQueued: false,
      snapshotQueued: false
    }
  };
  const state = api.state;
  const VIEWS = ['plane', 'height', 'sphere'];
  const NAMES = { plane: 'plane', height: '3D height', sphere: 'sphere' };

  const style = document.createElement('style');
  style.id = 'ef-multiview-core-styles';
  style.textContent = `
    .ef-mv-controls{display:grid;grid-template-columns:minmax(145px,1fr) auto;align-items:center;gap:14px;padding:4px 7px 8px;width:100%}
    .ef-mv-left{display:flex;flex-direction:column;align-items:flex-start;gap:5px}
    .ef-mv-left label{display:flex;align-items:center;gap:7px;min-height:22px;white-space:nowrap}
    .ef-mv-right{display:flex;align-items:center;justify-content:flex-end;gap:8px}
    .ef-mv-right .angle-row{display:block!important;padding:0!important;margin:0!important}
    .ef-mv-right .ef-projective-parameter-panel{display:block!important;width:auto!important;padding:0!important}
    .ef-mv-right .ef-projective-parameter-label{display:none!important}
    .ef-mv-right .ef-projective-parameter-controls{gap:10px!important}
    .ef-mv-right #ef-fit{min-height:30px;padding:4px 9px;font-size:11px;background:#fff;color:var(--ink);border-color:rgba(24,33,31,.18)}
    .interactive-toolbar>.toggle-row,.interactive-toolbar>.angle-row,.interactive-toolbar>.action-row{display:none!important}
    .ef-mv-shell{position:relative;width:100%;height:var(--demo-canvas-height,min(38vw,430px));min-height:310px;overflow:hidden;background:#07131d}
    .ef-mv-shell>.demo-stage{position:absolute;inset:0;width:100%;height:100%;min-height:0;z-index:1;transition:opacity .14s ease}
    .ef-mv-shell>.demo-stage.ef-mv-hidden{visibility:hidden;pointer-events:none;opacity:0}
    .ef-mv-main{position:absolute;inset:0;width:100%;height:100%;visibility:hidden;opacity:0;pointer-events:none;z-index:2;transition:opacity .14s ease}
    .ef-mv-main.is-active{visibility:visible;opacity:1;pointer-events:auto;touch-action:none}
    .ef-mv-main[data-view="height"]{cursor:grab}
    .ef-mv-main[data-view="height"].is-dragging{cursor:grabbing}
    #ef-particles{display:none!important}
    #ef-electric-particles{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
    #ef-overlay{z-index:4!important}
    .ef-mv-insets{position:absolute;inset:0;z-index:8;pointer-events:none}
    .ef-mv-inset{position:absolute;right:10px;width:min(29%,142px);aspect-ratio:1.45;overflow:hidden;padding:0;border:1px solid rgba(231,244,247,.62);border-radius:8px;background:#07131d;box-shadow:0 5px 18px rgba(0,0,0,.31);cursor:pointer;pointer-events:auto;transition:transform .12s ease,border-color .12s ease}
    .ef-mv-inset.top{top:10px}.ef-mv-inset.bottom{bottom:10px}.ef-mv-inset[hidden]{display:none!important}
    .ef-mv-inset:hover,.ef-mv-inset:focus-visible{transform:scale(1.025);border-color:#fff;outline:none}
    .ef-mv-inset canvas{position:absolute;inset:0;width:100%;height:100%}
    .ef-mv-inset span{position:absolute;left:5px;top:4px;padding:2px 6px;border-radius:999px;background:rgba(3,13,19,.72);color:#f5fafc;font:700 10px/1.2 ui-sans-serif,system-ui,sans-serif;pointer-events:none}
    @media(max-width:640px){.ef-mv-controls{grid-template-columns:1fr auto;gap:8px;padding-inline:3px}.ef-mv-left{gap:3px}.ef-mv-right{flex-direction:column-reverse;gap:4px}.ef-mv-inset{right:7px;width:min(31%,116px)}.ef-mv-inset.top{top:7px}.ef-mv-inset.bottom{bottom:7px}}
  `;
  document.head.append(style);

  function resizeCanvas(canvas, width = canvas.clientWidth, height = canvas.clientHeight, cap = 2) {
    const w = Math.max(1, Math.round(width || 1));
    const h = Math.max(1, Math.round(height || 1));
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {
      canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return { ctx, width:w, height:h };
  }
  api.resizeCanvas = resizeCanvas;

  function drawCharge(ctx,x,y,q,r,alpha=1){
    ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);
    ctx.fillStyle=q>0?'#57c9ff':'#ff6f91';ctx.fill();ctx.strokeStyle='#06131d';ctx.lineWidth=Math.max(1,r*.16);ctx.stroke();
    ctx.fillStyle='#06131d';ctx.font=`900 ${Math.max(7,r*.82)}px ui-sans-serif,system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(`${q>0?'+':'−'}${Math.abs(q)>1?Math.abs(q):''}`,x,y+.3);ctx.restore();
  }
  api.drawCharge = drawCharge;

  function center(node){
    if(node.tagName.toLowerCase()==='circle')return{x:+node.getAttribute('cx'),y:+node.getAttribute('cy')};
    try{const b=node.getBBox();return{x:b.x+b.width/2,y:b.y+b.height/2};}catch{return null;}
  }
  function readCharges(){
    const raw=[];
    overlay.querySelectorAll('.ef-zero').forEach(n=>{const p=center(n);if(p)raw.push({...p,q:1});});
    overlay.querySelectorAll('.ef-pole').forEach(n=>{const p=center(n);if(p)raw.push({...p,q:-1});});
    const groups=[];
    raw.forEach(c=>{let g=groups.find(x=>Math.sign(x.q)===Math.sign(c.q)&&Math.hypot(x.x-c.x,x.y-c.y)<.8);if(!g){g={x:c.x,y:c.y,q:0};groups.push(g);}g.q+=c.q;});
    return groups;
  }
  function signature(list){return list.map(c=>`${c.q}:${c.x.toFixed(2)},${c.y.toFixed(2)}`).sort().join(';');}

  function normalizedCharges(){
    const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight),s=Math.max(1,Math.min(w,h))*.285;
    return state.charges.map(c=>({x:(c.x-w/2)/s,y:-(c.y-h/2)/s,q:c.q}));
  }
  api.normalizedCharges=normalizedCharges;

  function field(point, list=normalizedCharges()){
    let x=0,y=0;for(const c of list){const dx=point.x-c.x,dy=point.y-c.y,d2=dx*dx+dy*dy+.0014;x+=c.q*dx/d2;y+=c.q*dy/d2;}return{x,y};
  }
  api.field=field;
  function height(point,list=normalizedCharges()){
    let v=0;for(const c of list){const r=Math.sqrt((point.x-c.x)**2+(point.y-c.y)**2+.0018);v-=c.q*Math.log(r);}return 1.12*Math.tanh(v/2.15);
  }
  api.height=height;

  function traceFlows(list=normalizedCharges(),xExtent=2.6,yExtent=2.2,density=5){
    const paths=[];
    list.filter(c=>c.q>0).forEach(source=>{
      const n=Math.max(4,Math.min(12,Math.round(density*Math.abs(source.q))));
      for(let k=0;k<n;k++){
        const a=2*Math.PI*(k+.28)/n;let p={x:source.x+.085*Math.cos(a),y:source.y+.085*Math.sin(a)};const path=[{...p}];
        for(let i=0;i<360;i++){
          let v=field(p,list),m=Math.hypot(v.x,v.y);if(!(m>1e-8))break;v={x:v.x/m,y:v.y/m};
          const mid={x:p.x+v.x*.012,y:p.y+v.y*.012};let vm=field(mid,list);m=Math.hypot(vm.x,vm.y);if(!(m>1e-8))break;vm={x:vm.x/m,y:vm.y/m};p={x:p.x+vm.x*.024,y:p.y+vm.y*.024};
          if(i%2===0)path.push({...p});
          if(list.some(c=>c.q<0&&Math.hypot(p.x-c.x,p.y-c.y)<.075)){const t=list.find(c=>c.q<0&&Math.hypot(p.x-c.x,p.y-c.y)<.075);if(t)path.push({x:t.x,y:t.y});break;}
          if(Math.abs(p.x)>xExtent*1.3||Math.abs(p.y)>yExtent*1.3)break;
        }
        if(path.length>5)paths.push(path);
      }
    });return paths;
  }
  api.traceFlows=traceFlows;

  function buildControls(){
    const tabs=toolbar.querySelector('.configuration-row'),toggles=toolbar.querySelector('.toggle-row'),angle=toolbar.querySelector('.angle-row'),action=toolbar.querySelector('.action-row'),dial=toolbar.querySelector('.ef-projective-parameter-panel');
    if(!toggles||!dial||toolbar.querySelector('.ef-mv-controls'))return;
    const box=document.createElement('div');box.className='ef-mv-controls';const left=document.createElement('div');left.className='ef-mv-left';const right=document.createElement('div');right.className='ef-mv-right';
    const oldLabel=legacyFlow.closest('label');legacyFlow.checked=false;legacyFlow.dispatchEvent(new Event('change',{bubbles:true}));
    [...toggles.querySelectorAll('label')].forEach(l=>{if(l!==oldLabel)left.append(l);});
    const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.id='ef-electric-flow-toggle';label.append(input,document.createTextNode(' flow'));left.append(label);
    dial.querySelector('.ef-projective-parameter-label')?.remove();if(angle)right.append(angle);const fit=document.getElementById('ef-fit');if(fit)right.append(fit);box.append(left,right);tabs?.after(box);
    toggles.hidden=true;action?.setAttribute('hidden','');
    input.addEventListener('change',()=>{state.flowEnabled=input.checked;if(!input.checked)clearParticles();else resetParticles();});
  }

  function makeCanvas(cls=''){const c=document.createElement('canvas');c.className=cls;c.setAttribute('aria-hidden','true');return c;}
  function buildViews(){
    const shell=document.createElement('div');shell.className='ef-mv-shell';stage.before(shell);shell.append(stage);
    const electric=makeCanvas();electric.id='ef-electric-particles';stage.insertBefore(electric,overlay);
    const mains={height:makeCanvas('ef-mv-main'),sphere:makeCanvas('ef-mv-main')};
    Object.entries(mains).forEach(([view,canvas])=>canvas.dataset.view=view);shell.append(mains.height,mains.sphere);
    const layer=document.createElement('div');layer.className='ef-mv-insets';const buttons={},canvases={};
    VIEWS.forEach(view=>{const b=document.createElement('button');b.type='button';b.className='ef-mv-inset';b.dataset.view=view;b.title=`Show ${NAMES[view]} as the main view`;b.setAttribute('aria-label',b.title);const c=makeCanvas(),s=document.createElement('span');s.textContent=NAMES[view];b.append(c,s);b.addEventListener('click',()=>setActive(view));layer.append(b);buttons[view]=b;canvases[view]=c;});shell.append(layer);
    Object.assign(state,{shell,electric,mains,buttons,canvases});setActive('plane');
  }

  function registerRenderer(name,fn){state.renderers.set(name,fn);renderStatic();}
  api.registerRenderer=registerRenderer;
  function renderOne(view,canvas,thumb){if(view==='plane')renderPlane(canvas);else state.renderers.get(view)?.(canvas,thumb,api);}
  function renderStatic(){if(!state.canvases)return;['height','sphere'].forEach(v=>{renderOne(v,state.mains[v],false);renderOne(v,state.canvases[v],true);});}
  api.renderStatic=renderStatic;

  function renderPlane(canvas){
    if(!canvas)return;const{ctx,width,height}=resizeCanvas(canvas,canvas.clientWidth,canvas.clientHeight,1.5);ctx.fillStyle='#07131d';ctx.fillRect(0,0,width,height);
    try{ctx.drawImage(staticCanvas,0,0,width,height);if(state.electric)ctx.drawImage(state.electric,0,0,width,height);}catch{}
    const sx=width/Math.max(1,stage.clientWidth),sy=height/Math.max(1,stage.clientHeight);state.charges.forEach(c=>drawCharge(ctx,c.x*sx,c.y*sy,c.q,5));
  }
  function snapshotPlane(){if(state.snapshotQueued)return;state.snapshotQueued=true;requestAnimationFrame(()=>{state.snapshotQueued=false;renderPlane(state.canvases?.plane);});}

  function setActive(view){
    if(!VIEWS.includes(view)||!state.shell)return;state.active=view;stage.classList.toggle('ef-mv-hidden',view!=='plane');
    ['height','sphere'].forEach(v=>state.mains[v].classList.toggle('is-active',view===v));const others=VIEWS.filter(v=>v!==view);
    VIEWS.forEach(v=>{const b=state.buttons[v];b.hidden=v===view;b.classList.remove('top','bottom');const i=others.indexOf(v);if(i===0)b.classList.add('top');if(i===1)b.classList.add('bottom');});
    if(view!=='plane')snapshotPlane();renderStatic();
  }
  api.setActive=setActive;

  function electricScreen(p){let x=0,y=0;for(const c of state.charges){const dx=p.x-c.x,dy=p.y-c.y,d2=dx*dx+dy*dy+16;x+=c.q*dx/d2;y+=c.q*dy/d2;}return{x,y};}
  function spawn(){const pos=state.charges.filter(c=>c.q>0),pool=[];pos.forEach(c=>{for(let i=0;i<Math.max(1,Math.round(c.q));i++)pool.push(c);});if(!pool.length)return{x:0,y:0,age:99,ttl:0,alpha:.2};const c=pool[Math.floor(Math.random()*pool.length)],a=2*Math.PI*Math.random(),r=10+13*Math.random();return{x:c.x+r*Math.cos(a),y:c.y+r*Math.sin(a),age:0,ttl:2.4+3.2*Math.random(),alpha:.17+.25*Math.random()};}
  function clearParticles(){if(!state.electric)return;const{ctx,width,height}=resizeCanvas(state.electric,stage.clientWidth,stage.clientHeight);ctx.clearRect(0,0,width,height);}
  function resetParticles(){state.particles=Array.from({length:Math.max(46,Math.min(92,Math.round(stage.clientWidth/7.5)))},spawn);clearParticles();}
  function advance(p,dt){
    if(state.charges.some(c=>c.q<0&&Math.hypot(p.x-c.x,p.y-c.y)<9)||p.x<-25||p.x>stage.clientWidth+25||p.y<-25||p.y>stage.clientHeight+25||p.age>p.ttl)return false;
    let v=electricScreen(p),m=Math.hypot(v.x,v.y);if(!(m>1e-8))return false;v={x:v.x/m,y:v.y/m};const step=(31+18*Math.tanh(180*m))*dt,mid={x:p.x+v.x*step/2,y:p.y+v.y*step/2};let vm=electricScreen(mid);m=Math.hypot(vm.x,vm.y);if(!(m>1e-8))return false;vm={x:vm.x/m,y:vm.y/m};p.px=p.x;p.py=p.y;p.x+=vm.x*step;p.y+=vm.y*step;p.age+=dt;return true;
  }
  function animate(t){
    requestAnimationFrame(animate);if(!state.visible||!state.flowEnabled||state.active!=='plane'||!state.charges.length){state.lastTime=t;return;}
    const{ctx,width,height}=resizeCanvas(state.electric,stage.clientWidth,stage.clientHeight),dt=Math.max(.009,Math.min(.042,(t-(state.lastTime||t))/1000));state.lastTime=t;
    ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,.09)';ctx.fillRect(0,0,width,height);ctx.restore();
    state.particles.forEach((p,i)=>{if(!advance(p,dt)){state.particles[i]=spawn();return;}ctx.strokeStyle=`rgba(126,207,255,${p.alpha})`;ctx.lineWidth=.9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.px,p.py);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillStyle=`rgba(247,252,255,${Math.min(.84,p.alpha+.3)})`;ctx.beginPath();ctx.arc(p.x,p.y,1.05,0,2*Math.PI);ctx.fill();});
  }

  function updateCharges(){state.chargeQueued=false;const next=readCharges(),sig=signature(next);if(!next.length||sig===state.signature)return;state.charges=next;state.signature=sig;resetParticles();renderStatic();snapshotPlane();}
  function queueCharges(){if(state.chargeQueued)return;state.chargeQueued=true;requestAnimationFrame(updateCharges);}
  function updateCopy(){const p=[...document.querySelectorAll('.article-content p')].find(x=>x.textContent.includes('The floating diagram follows the examples'));if(!p||p.textContent.includes('corner insets'))return;p.insertAdjacentHTML('beforeend',' The corner insets show the same configuration as the height surface \\(H=-\\log|f|\\) and on the Riemann sphere. Click an inset to exchange it with the plane. In the main height view, drag to orbit, use the wheel to zoom, and double-click to reset the camera. The particles follow the electric field from positive toward negative charges.');window.MathJax?.typesetPromise?.([p]);}

  buildControls();buildViews();
  new MutationObserver(queueCharges).observe(overlay,{childList:true,subtree:false});
  new ResizeObserver(()=>{queueCharges();renderStatic();snapshotPlane();resetParticles();}).observe(stage);
  presetSelect?.addEventListener('change',queueCharges);document.getElementById('ef-angle')?.addEventListener('input',snapshotPlane);window.addEventListener('resize',()=>{renderStatic();snapshotPlane();});window.addEventListener('electrostatic:markdown-rendered',updateCopy);
  new IntersectionObserver(e=>{state.visible=e.some(x=>x.isIntersecting);},{threshold:.02}).observe(card);
  queueCharges();requestAnimationFrame(()=>{queueCharges();renderStatic();snapshotPlane();resetParticles();requestAnimationFrame(animate);updateCopy();});
})();
