(() => {
  'use strict';
  const api = window.EFMultiView;
  if (!api) return;

  function stereo(p){const r2=p.x*p.x+p.y*p.y,d=1+r2;return{x:2*p.x/d,y:2*p.y/d,z:(r2-1)/d};}
  function rotate(p){const yaw=-.52,pitch=-.42,cy=Math.cos(yaw),sy=Math.sin(yaw),x=cy*p.x-sy*p.y,y=sy*p.x+cy*p.y,z=p.z,cp=Math.cos(pitch),sp=Math.sin(pitch);return{x,y:cp*y-sp*z,z:sp*y+cp*z};}
  function arrow(ctx,a,b,size){const t=Math.atan2(b.y-a.y,b.x-a.x);ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-size*Math.cos(t-.55),b.y-size*Math.sin(t-.55));ctx.lineTo(b.x-size*Math.cos(t+.55),b.y-size*Math.sin(t+.55));ctx.closePath();ctx.fill();}

  function render(canvas,thumb,apiRef){
    const {ctx,width,height}=apiRef.resizeCanvas(canvas,canvas.clientWidth,canvas.clientHeight,thumb?1.5:2);
    ctx.fillStyle='#07131d';ctx.fillRect(0,0,width,height);
    const charges=apiRef.normalizedCharges();if(!charges.length)return;
    const radius=Math.min(width,height)*.42,cx=width/2,cy=height/2;
    const projectSphere=p=>{const r=rotate(p);return{x:cx+radius*r.x,y:cy-radius*r.y,depth:r.z};};
    const projectPlane=p=>projectSphere(stereo(p));
    const gradient=ctx.createRadialGradient(cx-radius*.28,cy-radius*.35,radius*.06,cx,cy,radius);gradient.addColorStop(0,'#345b78');gradient.addColorStop(.58,'#17344b');gradient.addColorStop(1,'#091826');ctx.beginPath();ctx.arc(cx,cy,radius,0,2*Math.PI);ctx.fillStyle=gradient;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.68)';ctx.lineWidth=thumb?1:1.5;ctx.stroke();
    function curve(points,front,back,lw){const pp=points.map(projectSphere);for(let pass=0;pass<2;pass++){ctx.beginPath();let open=false;for(let i=1;i<pp.length;i++){const a=pp[i-1],b=pp[i],isFront=(a.depth+b.depth)/2>=0;if(isFront!==(pass===1)){open=false;continue;}if(!open)ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);open=true;}ctx.strokeStyle=pass?front:back;ctx.lineWidth=lw;ctx.stroke();}return pp;}
    const grid=[];
    [-.65,-.32,0,.32,.65].forEach(z=>{const rr=Math.sqrt(1-z*z),line=[];for(let k=0;k<=72;k++){const t=2*Math.PI*k/72;line.push({x:rr*Math.cos(t),y:rr*Math.sin(t),z});}grid.push(line);});
    for(let m=0;m<8;m++){const phi=Math.PI*m/8,line=[];for(let k=0;k<=72;k++){const t=-Math.PI/2+Math.PI*k/72;line.push({x:Math.cos(t)*Math.cos(phi),y:Math.cos(t)*Math.sin(phi),z:Math.sin(t)});}grid.push(line);}
    grid.forEach(line=>curve(line,thumb?'rgba(255,255,255,.12)':'rgba(255,255,255,.18)','rgba(255,255,255,.035)',thumb?.45:.65));
    const paths=apiRef.traceFlows(charges,3.8,3.2,thumb?2.7:4.4);
    for(const path of paths){const pp=path.map(projectPlane);for(let pass=0;pass<2;pass++){ctx.beginPath();let open=false;for(let i=1;i<pp.length;i++){const a=pp[i-1],b=pp[i],isFront=(a.depth+b.depth)/2>=-.02;if(isFront!==(pass===1)){open=false;continue;}if(!open)ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);open=true;}ctx.strokeStyle=pass?(thumb?'rgba(154,224,255,.7)':'rgba(154,224,255,.9)'):(thumb?'rgba(154,224,255,.14)':'rgba(154,224,255,.24)');ctx.lineWidth=pass?(thumb?.85:1.35):(thumb?.5:.75);ctx.stroke();}if(!thumb&&pp.length>12){const k=Math.floor(pp.length*.62);if(pp[k].depth>=0){ctx.fillStyle='rgba(194,236,255,.94)';arrow(ctx,pp[k-2],pp[k],4);}}}
    const visible=charges.map(c=>({c,p:projectPlane(c)})),net=charges.reduce((s,c)=>s+c.q,0);if(Math.abs(net)>.5)visible.push({c:{q:-net,infinity:true},p:projectSphere({x:0,y:0,z:1})});visible.sort((a,b)=>a.p.depth-b.p.depth);
    visible.forEach(({c,p})=>{apiRef.drawCharge(ctx,p.x,p.y,c.q,thumb?5:7.6,p.depth<0?.46:1);if(c.infinity&&!thumb){ctx.fillStyle=p.depth<0?'rgba(240,248,250,.45)':'rgba(240,248,250,.86)';ctx.font='700 10px ui-sans-serif,system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('∞',p.x,p.y-9);}});
    if(!thumb){ctx.fillStyle='rgba(245,250,252,.9)';ctx.font='700 13px ui-sans-serif,system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('Riemann sphere',13,12);ctx.fillStyle='rgba(202,220,226,.76)';ctx.font='11px ui-sans-serif,system-ui,sans-serif';ctx.fillText('stereographic compactification',13,30);}
  }
  api.registerRenderer('sphere',render);
})();