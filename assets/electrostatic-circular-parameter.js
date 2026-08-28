(() => {
  'use strict';

  const stage = document.getElementById('ef-stage');
  const overlay = document.getElementById('ef-overlay');
  const presetSelect = document.getElementById('ef-preset');
  const angleInput = document.getElementById('ef-angle');
  const angleOutput = document.getElementById('ef-angle-value');
  const nativeControl = angleInput?.closest('.angle-control');
  const angleRow = nativeControl?.closest('.angle-row');
  const sourceMarks = nativeControl?.querySelector('.ef-singular-marks');
  const focusCanvas = document.getElementById('ef-curve-focus');

  if (!stage || !overlay || !presetSelect || !angleInput || !nativeControl || !angleRow) return;

  const simplePresets = new Set(['dipole', 'like']);
  const state = {
    paused: false,
    dragging: false,
    transitionFrame: 0,
    renderQueued: false,
    marksQueued: false,
    manualBlurTimer: 0
  };

  const memberCanvas = document.createElement('canvas');
  memberCanvas.id = 'ef-full-member';
  memberCanvas.setAttribute('aria-hidden', 'true');
  const particles = document.getElementById('ef-particles');
  stage.insertBefore(memberCanvas, particles || overlay);

  const panel = document.createElement('div');
  panel.className = 'ef-circular-parameter-panel';
  panel.innerHTML = `
    <span class="ef-circular-parameter-label">pencil parameter</span>
    <div class="ef-circular-parameter-controls">
      <div class="ef-parameter-dial" role="slider" tabindex="0"
           aria-label="Pencil parameter on the real projective line"
           aria-valuemin="0" aria-valuemax="180" aria-valuenow="45">
        <span class="ef-dial-ring" aria-hidden="true"></span>
        <span class="ef-dial-indicator" aria-hidden="true"></span>
        <span class="ef-dial-knob" aria-hidden="true"></span>
        <span class="ef-dial-center" aria-hidden="true">ℝP¹</span>
        <span class="ef-dial-marks" aria-label="Singular pencil parameters"></span>
      </div>
      <button type="button" class="ef-animation-toggle" aria-pressed="false">Pause</button>
      <output class="ef-circular-angle-value">45°</output>
    </div>`;
  angleRow.append(panel);

  const dial = panel.querySelector('.ef-parameter-dial');
  const indicator = panel.querySelector('.ef-dial-indicator');
  const knob = panel.querySelector('.ef-dial-knob');
  const dialMarks = panel.querySelector('.ef-dial-marks');
  const animateButton = panel.querySelector('.ef-animation-toggle');
  const dialValue = panel.querySelector('.ef-circular-angle-value');

  nativeControl.classList.add('ef-native-angle-control');

  function installStyles() {
    if (document.getElementById('ef-circular-parameter-styles')) return;
    const style = document.createElement('style');
    style.id = 'ef-circular-parameter-styles';
    style.textContent = `
      .ef-native-angle-control {
        position: absolute !important;
        left: -10000px !important;
        top: auto !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      .angle-row {
        position: relative;
        display: block !important;
      }
      .ef-circular-parameter-panel {
        display: grid;
        grid-template-columns: auto minmax(0,1fr);
        align-items: center;
        gap: 8px 12px;
        width: 100%;
      }
      .ef-circular-parameter-label {
        color: var(--muted);
        font-size: 12px;
        font-weight: 750;
        white-space: nowrap;
      }
      .ef-circular-parameter-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .ef-parameter-dial {
        --dial-size: 84px;
        position: relative;
        flex: 0 0 var(--dial-size);
        width: var(--dial-size);
        height: var(--dial-size);
        border-radius: 50%;
        touch-action: none;
        cursor: grab;
        user-select: none;
      }
      .ef-parameter-dial:active { cursor: grabbing; }
      .ef-parameter-dial:focus-visible {
        outline: 2px solid var(--accent-2);
        outline-offset: 3px;
      }
      .ef-dial-ring {
        position: absolute;
        inset: 7px;
        border: 2px solid rgba(24,33,31,.26);
        border-radius: 50%;
        background:
          radial-gradient(circle, rgba(255,255,255,.96) 0 47%, transparent 48%),
          conic-gradient(from -90deg, rgba(22,135,117,.16), rgba(49,95,159,.16), rgba(22,135,117,.16));
        box-shadow: inset 0 0 0 5px rgba(255,255,255,.62), 0 1px 4px rgba(24,33,31,.12);
      }
      .ef-dial-indicator {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 2px;
        height: 28px;
        border-radius: 999px;
        background: var(--accent);
        transform-origin: 50% 100%;
        transform: translate(-50%,-100%) rotate(0deg);
        box-shadow: 0 0 5px rgba(22,135,117,.3);
        pointer-events: none;
      }
      .ef-dial-knob {
        position: absolute;
        left: 50%;
        top: 8px;
        width: 11px;
        height: 11px;
        border: 1.5px solid #06131d;
        border-radius: 50%;
        background: #fff;
        transform: translate(-50%,-50%);
        box-shadow: 0 1px 5px rgba(0,0,0,.26);
        pointer-events: none;
      }
      .ef-dial-center {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%,-50%);
        color: var(--muted);
        font: 750 11px/1 ui-serif, Georgia, serif;
        pointer-events: none;
      }
      .ef-dial-marks {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .ef-dial-singular-mark {
        position: absolute;
        display: grid;
        place-items: center;
        width: 14px;
        height: 14px;
        border: 1.5px solid rgba(6,19,29,.92);
        border-radius: 50%;
        background: #ffad52;
        color: #07131d;
        padding: 0;
        font: 900 8px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
        box-shadow: 0 0 0 1px rgba(255,255,255,.75), 0 2px 5px rgba(0,0,0,.22);
        cursor: pointer;
        pointer-events: auto;
        transform: translate(-50%,-50%);
        transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
      }
      .ef-dial-singular-mark:hover,
      .ef-dial-singular-mark:focus-visible {
        transform: translate(-50%,-50%) scale(1.2);
        outline: none;
        box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 3px 8px rgba(0,0,0,.28);
      }
      .ef-dial-singular-mark.is-current {
        background: #fff0b8;
        box-shadow: 0 0 0 2px #ffad52, 0 0 9px rgba(255,173,82,.85);
      }
      .ef-animation-toggle {
        min-width: 76px;
        min-height: 34px;
        border: 1px solid rgba(24,33,31,.18) !important;
        border-radius: 999px !important;
        background: #fff !important;
        color: var(--ink) !important;
        font-weight: 750 !important;
        cursor: pointer;
      }
      .ef-animation-toggle[aria-pressed="true"] {
        border-color: var(--accent) !important;
        background: rgba(22,135,117,.1) !important;
        color: var(--accent) !important;
      }
      .ef-circular-angle-value {
        min-width: 43px;
        color: var(--ink);
        font: 12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
        text-align: right;
      }
      .ef-singular-marks { display: none !important; }
      #ef-full-member {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
      }
      @media (max-width: 640px) {
        .ef-circular-parameter-panel { grid-template-columns: 1fr; }
        .ef-circular-parameter-label { display: none; }
        .ef-circular-parameter-controls { justify-content: center; }
      }
    `;
    document.head.append(style);
  }

  const C = (re = 0, im = 0) => ({ re, im });
  const mul = (a, b) => C(a.re*b.re-a.im*b.im, a.re*b.im+a.im*b.re);
  const conj = a => C(a.re, -a.im);
  const expi = t => C(Math.cos(t), Math.sin(t));
  const modPi = t => ((t % Math.PI) + Math.PI) % Math.PI;

  function currentDegrees() {
    const value = +angleInput.value || 0;
    return ((value % 180) + 180) % 180;
  }

  function currentTheta() {
    return currentDegrees() * Math.PI / 180;
  }

  function setAngleDegrees(degrees) {
    const normalized = ((degrees % 180) + 180) % 180;
    angleInput.value = normalized.toFixed(2);
    angleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function updateDial() {
    const degrees = currentDegrees();
    const rotation = 2 * degrees;
    indicator.style.transform = `translate(-50%,-100%) rotate(${rotation}deg)`;
    const phi = (2 * degrees - 90) * Math.PI / 180;
    const radius = dial.clientWidth / 2 - 8;
    knob.style.left = `${dial.clientWidth/2 + radius*Math.cos(phi)}px`;
    knob.style.top = `${dial.clientHeight/2 + radius*Math.sin(phi)}px`;
    dialValue.value = `${degrees.toFixed(degrees % 1 ? 1 : 0)}°`;
    dialValue.textContent = dialValue.value;
    dial.setAttribute('aria-valuenow', degrees.toFixed(2));
    dial.setAttribute('aria-valuetext', `${degrees.toFixed(1)} degrees modulo 180`);
    syncCircularMarks();
  }

  function thetaFromPointer(event) {
    const rect = dial.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width/2);
    const dy = event.clientY - (rect.top + rect.height/2);
    let phi = Math.atan2(dy, dx) + Math.PI/2;
    phi = ((phi % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
    return phi/2;
  }

  function beginManualInteraction() {
    if (!state.paused) angleInput.focus({ preventScroll: true });
  }

  function endManualInteraction(delay = 0) {
    clearTimeout(state.manualBlurTimer);
    if (state.paused) return;
    state.manualBlurTimer = setTimeout(() => angleInput.blur(), delay);
  }

  function setPaused(paused) {
    state.paused = paused;
    animateButton.setAttribute('aria-pressed', paused ? 'true' : 'false');
    animateButton.textContent = paused ? 'Animate' : 'Pause';
    if (paused) angleInput.focus({ preventScroll: true });
    else angleInput.blur();
  }

  animateButton.addEventListener('click', () => setPaused(!state.paused));

  dial.addEventListener('pointerdown', event => {
    event.preventDefault();
    state.dragging = true;
    beginManualInteraction();
    dial.setPointerCapture?.(event.pointerId);
    setAngleDegrees(thetaFromPointer(event) * 180 / Math.PI);
  });
  dial.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    setAngleDegrees(thetaFromPointer(event) * 180 / Math.PI);
  });
  const finishDrag = event => {
    if (!state.dragging) return;
    state.dragging = false;
    dial.releasePointerCapture?.(event.pointerId);
    endManualInteraction(0);
  };
  dial.addEventListener('pointerup', finishDrag);
  dial.addEventListener('pointercancel', finishDrag);

  dial.addEventListener('keydown', event => {
    let delta = event.shiftKey ? 5 : 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta *= -1;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta *= 1;
    else if (event.key === 'Home') { delta = -currentDegrees(); }
    else if (event.key === 'End') { delta = 179.75-currentDegrees(); }
    else return;
    event.preventDefault();
    beginManualInteraction();
    setAngleDegrees(currentDegrees()+delta);
    endManualInteraction(650);
  });

  function smoothToTheta(targetTheta) {
    cancelAnimationFrame(state.transitionFrame);
    beginManualInteraction();
    const start = currentTheta();
    let delta = targetTheta-start;
    if (delta > Math.PI/2) delta -= Math.PI;
    if (delta < -Math.PI/2) delta += Math.PI;
    const started = performance.now();
    const duration = 520;
    const ease = t => 1-Math.pow(1-t,3);
    const step = now => {
      const u = Math.min(1,(now-started)/duration);
      setAngleDegrees(modPi(start+delta*ease(u))*180/Math.PI);
      if (u < 1) state.transitionFrame = requestAnimationFrame(step);
      else endManualInteraction(0);
    };
    state.transitionFrame = requestAnimationFrame(step);
  }

  function sourceMarkData() {
    if (!sourceMarks) return [];
    return [...sourceMarks.querySelectorAll('.ef-singular-mark')].map(button => ({
      percent: parseFloat(button.style.left) || 0,
      label: button.textContent || '',
      title: button.title || 'Singular member'
    }));
  }

  function syncCircularMarks() {
    dialMarks.replaceChildren();
    const current = currentTheta();
    const radius = dial.clientWidth/2 - 7;
    sourceMarkData().forEach(mark => {
      const theta = mark.percent/100*Math.PI;
      const phi = 2*theta-Math.PI/2;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ef-dial-singular-mark';
      button.style.left = `${dial.clientWidth/2 + radius*Math.cos(phi)}px`;
      button.style.top = `${dial.clientHeight/2 + radius*Math.sin(phi)}px`;
      button.textContent = mark.label;
      button.title = mark.title;
      button.setAttribute('aria-label', mark.title);
      const distance = Math.min(Math.abs(current-theta), Math.PI-Math.abs(current-theta));
      button.classList.toggle('is-current', distance < Math.PI/180*1.1);
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        smoothToTheta(theta);
      });
      dialMarks.append(button);
    });
  }

  function queueMarkSync() {
    if (state.marksQueued) return;
    state.marksQueued = true;
    requestAnimationFrame(() => {
      state.marksQueued = false;
      syncCircularMarks();
    });
  }

  if (sourceMarks) new MutationObserver(queueMarkSync).observe(sourceMarks,{childList:true,subtree:true,attributes:true});

  function nodeCenter(node) {
    if (!node) return null;
    if (node.tagName.toLowerCase()==='circle') return {x:+node.getAttribute('cx'),y:+node.getAttribute('cy')};
    try { const box=node.getBBox(); return {x:box.x+box.width/2,y:box.y+box.height/2}; }
    catch { return null; }
  }

  function chargesFromOverlay() {
    const positives=[...overlay.querySelectorAll('.ef-zero')].map(nodeCenter).filter(Boolean).map(p=>({q:1,screen:p}));
    const negatives=[...overlay.querySelectorAll('.ef-pole')].map(nodeCenter).filter(Boolean).map(p=>({q:-1,screen:p}));
    return [...positives,...negatives];
  }

  function resizeMemberCanvas() {
    const w=Math.max(1,Math.round(stage.clientWidth));
    const h=Math.max(1,Math.round(stage.clientHeight));
    const dpr=Math.min(window.devicePixelRatio||1,2);
    if (memberCanvas.width!==Math.round(w*dpr) || memberCanvas.height!==Math.round(h*dpr)) {
      memberCanvas.width=Math.round(w*dpr); memberCanvas.height=Math.round(h*dpr);
      memberCanvas.style.width=`${w}px`; memberCanvas.style.height=`${h}px`;
    }
    const ctx=memberCanvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return {ctx,w,h};
  }

  function pencilValue(x,y,charges,theta) {
    const z=C(x,-y);
    let p=C(1,0),q=C(1,0);
    charges.forEach(charge=>{
      const dz=C(z.re-charge.screen.x,z.im+charge.screen.y);
      if(charge.q>0)p=mul(p,dz); else q=mul(q,dz);
    });
    return mul(mul(p,conj(q)),expi(-theta)).im;
  }

  function edgePoint(edge,x,y,a,b,c,d) {
    const interp=(v0,v1)=>{
      const den=v1-v0;
      return Math.max(0,Math.min(1,Math.abs(den)<1e-14?.5:-v0/den));
    };
    if(edge===0){const t=interp(a,b);return[x+t,y];}
    if(edge===1){const t=interp(b,c);return[x+1,y+t];}
    if(edge===2){const t=interp(d,c);return[x+t,y+1];}
    const t=interp(a,d);return[x,y+t];
  }

  function drawWholeMember(ctx,w,h,charges,theta) {
    const N=140,row=N+1,values=new Float64Array(row*row);
    for(let j=0;j<=N;j++)for(let i=0;i<=N;i++)values[j*row+i]=pencilValue(i/N*w,j/N*h,charges,theta);
    const sx=w/N,sy=h/N;
    ctx.save();ctx.beginPath();
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const a=values[j*row+i],b=values[j*row+i+1],c=values[(j+1)*row+i+1],d=values[(j+1)*row+i];
      if(![a,b,c,d].every(Number.isFinite))continue;
      const crossings=[];
      if((a>0)!==(b>0))crossings.push(0);
      if((b>0)!==(c>0))crossings.push(1);
      if((d>0)!==(c>0))crossings.push(2);
      if((a>0)!==(d>0))crossings.push(3);
      const segment=(e0,e1)=>{const u=edgePoint(e0,i,j,a,b,c,d),v=edgePoint(e1,i,j,a,b,c,d);ctx.moveTo(u[0]*sx,u[1]*sy);ctx.lineTo(v[0]*sx,v[1]*sy);};
      if(crossings.length===2)segment(crossings[0],crossings[1]);
      else if(crossings.length===4){
        const high=(a+b+c+d)/4>0;
        const mask=(a>0?1:0)|(b>0?2:0)|(c>0?4:0)|(d>0?8:0);
        if(mask===5){if(high){segment(0,1);segment(2,3);}else{segment(0,3);segment(1,2);}}
        else if(mask===10){if(high){segment(0,3);segment(1,2);}else{segment(0,1);segment(1,2);}}
      }
    }
    ctx.strokeStyle='rgba(255,222,126,.98)';ctx.lineWidth=2.8;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.shadowColor='rgba(255,200,78,.38)';ctx.shadowBlur=4;ctx.stroke();ctx.restore();
  }

  function renderMemberRule() {
    state.renderQueued=false;
    const {ctx,w,h}=resizeMemberCanvas();ctx.clearRect(0,0,w,h);
    const simple=simplePresets.has(presetSelect.value);
    if(focusCanvas)focusCanvas.style.display=simple?'block':'none';
    if(simple)return;
    const charges=chargesFromOverlay();
    if(charges.length<3)return;
    drawWholeMember(ctx,w,h,charges,currentTheta());
  }

  function scheduleMemberRule() {
    if(state.renderQueued)return;
    state.renderQueued=true;
    requestAnimationFrame(renderMemberRule);
  }

  angleInput.addEventListener('input',()=>{updateDial();scheduleMemberRule();});
  presetSelect.addEventListener('change',()=>{updateDial();scheduleMemberRule();});
  window.addEventListener('resize',()=>{updateDial();scheduleMemberRule();});
  new ResizeObserver(()=>{updateDial();scheduleMemberRule();}).observe(stage);
  new MutationObserver(scheduleMemberRule).observe(overlay,{childList:true,subtree:false});

  installStyles();
  updateDial();
  scheduleMemberRule();
})();