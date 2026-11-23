/* SPACE.TIME: kinetic typography and an autonomous robot dot. */
const stage = document.querySelector('#stage');
const canvas = document.querySelector('#scene');
const fallback = document.querySelector('#fallback');
const typeCanvas = document.querySelector('#type-layer');
const motionCanvas = document.querySelector('#motion-type-layer');
const backgroundCtx = canvas?.getContext('2d', { alpha: false });
const typeCtx = typeCanvas?.getContext('2d');
const motionCtx = motionCanvas?.getContext('2d');
let ctx = backgroundCtx;
if (!backgroundCtx || !typeCtx || !motionCtx || !stage) {
  if (fallback) fallback.style.display = 'flex';
} else {
  const glyphs = [...'SPACE.TIME'];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const letters = glyphs.map((char, i) => ({ char, i, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, a: 0, va: 0, trail: [] }));
  // The full wordmark is always visible; every glyph is an independent object.
  const dotIndex = 5;
  const robot = { x: 0, y: 0, vx: 0, vy: 0, homeX: 0, homeY: 0, targetX: 0, targetY: 0, mode: 'docked', changeAt: 0, trail: [] };
  const fontFamily = '"Unbounded", "Arial Black", sans-serif';
  const pointer = { x: -9999, y: -9999, px: 0, py: 0, down: false, dragging: null, id: null, moved: false, t: 0 };
  const ripples = [];
  let W = 0, H = 0, font = 100, gap = 100, raf = null, last = 0, tick = 0, anomaly = 0;
  let randomSeed = 8217;
  const rand = () => ((randomSeed = (1664525 * randomSeed + 1013904223) >>> 0) / 4294967296);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  function layout(reset = false) {
    const rect = stage.getBoundingClientRect();
    W = rect.width; H = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = typeCanvas.width = motionCanvas.width = Math.round(W * dpr);
    canvas.height = typeCanvas.height = motionCanvas.height = Math.round(H * dpr);
    backgroundCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    typeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motionCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx = backgroundCtx;
    // Fit a substantial display face to 94% of the width; reserve a portal for the robot dot.
    font = clamp(W / 8.1, 36, Math.min(235, H * .38));
    ctx.font = `900 ${font}px ${fontFamily}`;
    let widths = letters.map(p => p.char === '.' ? font*.33 : ctx.measureText(p.char).width);
    let total = widths.reduce((a,b)=>a+b,0) + (letters.length-1)*font*.018;
    font *= Math.min(1, W*.94/total);
    ctx.font = `900 ${font}px ${fontFamily}`;
    widths = letters.map(p => p.char === '.' ? font*.33 : ctx.measureText(p.char).width);
    total = widths.reduce((a,b)=>a+b,0) + (letters.length-1)*font*.018;
    let cursor = (W-total)/2;
    letters.forEach((p,i)=>{
      p.tx=cursor+widths[i]/2;
      p.ty=H/2;
      cursor+=widths[i]+font*.018;
      if(reset || !p.x){p.x=p.tx;p.y=p.ty;p.vx=p.vy=p.va=p.a=0;p.trail=[];}
    });
    robot.homeX = letters[dotIndex].tx;
    robot.homeY = letters[dotIndex].ty + font*.08;
    if(reset || !robot.x){robot.x=robot.homeX;robot.y=robot.homeY;robot.vx=robot.vy=0;robot.mode='docked';robot.changeAt=performance.now()+3500;}
    robot.targetX=clamp(robot.targetX||robot.homeX,25,W-25);
    robot.targetY=clamp(robot.targetY||robot.homeY,25,H-25);
    typeCanvas.style.filter = 'none';
    motionCanvas.style.filter = 'none';
  }

  const color = (a) => `rgba(209,215,231,${a})`;
  function ripple(x,y,power=1) { if (!reduced.matches) ripples.push({x,y,r:0,power,life:1}); }
  function scatter(force = 1.0) {
    if (reduced.matches) return;
    letters.forEach((p,i) => {
      if(p.char === '.') return;
      const angle = rand()*Math.PI*2;
      const speed = (5 + rand()*9)*force;
      p.vx += Math.cos(angle)*speed;
      p.vy += Math.sin(angle)*speed;
      p.va += (rand()-.5)*.12*force;
    });
    ripple(W/2,H/2,force);
  }
  function reset() {
    letters.forEach(p=>{p.vx=p.vy=p.va=p.a=0;p.x=p.tx;p.y=p.ty;p.trail=[];});
    robot.x=robot.homeX;robot.y=robot.homeY;robot.vx=robot.vy=0;
    robot.mode='docked';robot.changeAt=performance.now()+3500;robot.trail=[];
    ripples.length=0;
  }
  function hit(x,y) {
    ctx.font = `900 ${font}px ${fontFamily}`;
    for (let i=letters.length-1; i>=0; i--) {
      const p=letters[i];
      if(p.char === '.')continue;
      const ww=ctx.measureText(p.char).width;
      if (Math.abs(x-p.x)<ww*.65+16 && Math.abs(y-p.y)<font*.60+20) return p;
    }
    return null;
  }
  function updatePointer(e) { const b = stage.getBoundingClientRect();pointer.px=pointer.x;pointer.py=pointer.y;pointer.x=e.clientX-b.left;pointer.y=e.clientY-b.top; }
  stage.addEventListener('pointerdown',e=>{
    updatePointer(e); pointer.down=true;pointer.moved=false;pointer.t=performance.now();pointer.id=e.pointerId;
    if(!reduced.matches && Math.hypot(pointer.x-robot.x,pointer.y-robot.y)<Math.max(25,font*.19)){
      robot.mode='explore';robot.changeAt=performance.now()+2800;
      robot.targetX=clamp(pointer.x+(rand()-.5)*W*.6,35,W-35);
      robot.targetY=clamp(pointer.y+(rand()-.5)*H*.5,35,H-35);
      robot.vx+=(rand()-.5)*8;robot.vy-=5;
      ripple(robot.x,robot.y,.8);
    }
    const picked=hit(pointer.x,pointer.y);
    pointer.dragging = reduced.matches ? null : picked;
    if (picked) {picked.vx=0;picked.vy=0;stage.setPointerCapture(e.pointerId);}
    else ripple(pointer.x,pointer.y,.6);
  });
  stage.addEventListener('pointermove',e=>{
    // Cursor motion is sensed by the robot rather than blurring the wordmark.
    if(pointer.down&&Math.hypot(e.movementX||0,e.movementY||0)>1)pointer.moved=true;
    updatePointer(e);
    if(pointer.dragging){ const p=pointer.dragging; p.vx=(pointer.x-p.x)*.28; p.vy=(pointer.y-p.y)*.28; p.x=pointer.x;p.y=pointer.y; }
  });
  function release(e){
    if(!pointer.down) return;
    if(e) updatePointer(e);
    const p=pointer.dragging;
    if (p) {
      if (!pointer.moved || performance.now()-pointer.t<155) {
        const ang = Math.atan2(p.y-H/2,p.x-W/2) || (rand()-.5)*Math.PI;
        p.vx+=Math.cos(ang)*7+(rand()-.5)*5;
        p.vy+=Math.sin(ang)*7-3;
        p.va+=(rand()-.5)*.1;
        ripple(p.x,p.y,.65);
      } else {p.vx+=clamp(pointer.x-pointer.px,-20,20)*.7;p.vy+=clamp(pointer.y-pointer.py,-20,20)*.7;}
    } else if (!pointer.moved && !reduced.matches) {
      letters.filter(q=>q.char!=='.').forEach(q=>{const dx=q.x-pointer.x,dy=q.y-pointer.y,d=Math.max(50,Math.hypot(dx,dy)); q.vx+=dx/d*clamp(450/d,0,7);q.vy+=dy/d*clamp(450/d,0,7);});
    }
    pointer.down=false;pointer.dragging=null;pointer.id=null;
  }
  stage.addEventListener('pointerup',release);
  stage.addEventListener('pointercancel',release);
  stage.addEventListener('pointerleave',()=>{pointerInside=false;if(!pointer.down)pointer.x=pointer.y=-9999;});
  window.addEventListener('keydown',e=>{
    if(e.code==='Space'){ e.preventDefault();scatter(); }
    if(e.code==='Escape'){reset();}
  });
  stage.addEventListener('dblclick',e=>{e.preventDefault();scatter(1.35);});
  reduced.addEventListener?.('change',()=>{reset();});
  window.addEventListener('resize',()=>layout(false));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)last=0;});

  // A deliberately faint, draped network: lines and nodes are almost imperceptible
  // until the eye adjusts. No particles or bright points compete with the wordmark.
  const fabricCols = 36, fabricRows = 23;
  function drawFabric(time) {
    const grid = [];
    for(let row=0;row<=fabricRows;row++){
      const line=[];
      for(let col=0;col<=fabricCols;col++){
        const u=col/fabricCols, v=row/fabricRows;
        const center=u-.5;
        const droop=Math.pow(Math.max(0,1-Math.abs(center)*1.72),2);
        // Begin above the viewport, and introduce draping gradually so the top never goes bare.
        const drapeIn = Math.pow(Math.max(0,Math.min(1,(v-.015)/.53)),1.55);
        const x=(u*1.24-.12)*W + Math.sin(v*7+u*12+time)*W*.012;
        const y=(v*1.26-.15)*H + droop*drapeIn*H*(.14 + .055*Math.sin(time*.3+v*3))
          + Math.sin(u*13+v*9+time*.6)*H*.014;
        // The network belongs to the same world as the draggable letters.
        const dx=x-pointer.x, dy=y-pointer.y, distance=Math.hypot(dx,dy);
        const displacement = distance < 190 ? Math.pow(1-distance/190,2)*27 : 0;
        const rd=Math.hypot(x-robot.x,y-robot.y);
        const warp = rd<145 ? Math.pow(1-rd/145,2)*17 : 0;
        line.push({x:x+(distance>1?dx/distance*displacement:0)+(rd>1?(x-robot.x)/rd*warp:0),
                   y:y+(distance>1?dy/distance*displacement:0)+(rd>1?(y-robot.y)/rd*warp:0)});
      }
      grid.push(line);
    }
    ctx.save();
    ctx.lineWidth=Math.max(.65,Math.min(1.05,W/1600));
    for(let row=0;row<=fabricRows;row++){
      for(let col=0;col<=fabricCols;col++){
        const a=grid[row][col];
        const edge=Math.abs(col/fabricCols-.5)*2;
        const strength=(.65+.35*edge);
        ctx.strokeStyle=`rgba(202,209,223,${.19*strength})`;
        ctx.beginPath();
        if(col<fabricCols){const b=grid[row][col+1];ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}
        if(row<fabricRows){const b=grid[row+1][col];ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}
        if(row<fabricRows && col<fabricCols && (row+col)%3===0){const b=grid[row+1][col+1];ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}
        ctx.stroke();
        if((row+col)%2===0){
          ctx.fillStyle=`rgba(222,226,239,${.33*strength})`;
          ctx.beginPath();ctx.arc(a.x,a.y,Math.max(.75,Math.min(1.55,W/1100)),0,Math.PI*2);ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function selectDestination(){
    robot.targetX=clamp(robot.homeX+(rand()-.5)*W*.88,25,W-25);
    robot.targetY=clamp(robot.homeY+(rand()-.5)*H*.85,25,H-25);
  }
  function updateRobot(t,dt){
    if(reduced.matches){robot.x=robot.homeX;robot.y=robot.homeY;return;}
    if(t>robot.changeAt){
      if(robot.mode==='docked'){
        robot.mode='explore';selectDestination();robot.changeAt=t+2600+rand()*2100;
      }else if(robot.mode==='explore'){
        if(rand()<.50){robot.mode='return';robot.changeAt=t+3200;}
        else{selectDestination();robot.changeAt=t+1600+rand()*2400;}
      }else{
        robot.mode='docked';robot.changeAt=t+3500+rand()*4500;
      }
    }
    const toMouse=Math.hypot(robot.x-pointer.x,robot.y-pointer.y);
    let tx=robot.mode==='return'||robot.mode==='docked' ? robot.homeX : robot.targetX;
    let ty=robot.mode==='return'||robot.mode==='docked' ? robot.homeY : robot.targetY;
    // Curiosity from a distance, caution when a visitor gets too close.
    if(toMouse<105 && toMouse>1){
      tx=clamp(robot.x+(robot.x-pointer.x)/toMouse*160,20,W-20);
      ty=clamp(robot.y+(robot.y-pointer.y)/toMouse*160,20,H-20);
    }else if(toMouse<230 && robot.mode==='explore'){
      tx=clamp(pointer.x+(robot.x-pointer.x)*.25,20,W-20);
      ty=clamp(pointer.y+(robot.y-pointer.y)*.25,20,H-20);
    }
    const accel=robot.mode==='docked'?.020:.012;
    robot.vx+=(tx-robot.x)*accel*dt;
    robot.vy+=(ty-robot.y)*accel*dt;
    robot.vx*=Math.pow(.92,dt);robot.vy*=Math.pow(.92,dt);
    const speed=Math.hypot(robot.vx,robot.vy),limit=robot.mode==='return'?11:7;
    if(speed>limit){robot.vx*=limit/speed;robot.vy*=limit/speed;}
    robot.x=clamp(robot.x+robot.vx*dt,12,W-12);
    robot.y=clamp(robot.y+robot.vy*dt,12,H-12);
    if(robot.mode==='return' && Math.hypot(robot.x-robot.homeX,robot.y-robot.homeY)<5){
      robot.mode='docked';robot.changeAt=t+2800+rand()*3300;
    }
    if(speed>.8 && tick%2<dt)robot.trail.push({x:robot.x,y:robot.y,life:.22});
    robot.trail.forEach(p=>p.life-=.012*dt);
    robot.trail=robot.trail.filter(p=>p.life>0).slice(-22);
    const radius=Math.max(8,font*.085);
    letters.forEach(p=>{
      if(p.char==='.'||pointer.dragging===p)return;
      const d=Math.hypot(p.x-robot.x,p.y-robot.y);
      if(d<radius+font*.30 && d>1){
        const force=Math.pow(1-d/(radius+font*.30),2)*.8;
        p.vx+=(p.x-robot.x)/d*force*dt;
        p.vy+=(p.y-robot.y)/d*force*dt;
      }
    });
  }
  function drawRobot(){
    const r=Math.max(6,font*.068);
    ctx=typeCtx;
    for(const p of robot.trail){
      ctx.fillStyle=`rgba(221,233,255,${p.life*.22})`;
      ctx.beginPath();ctx.arc(p.x,p.y,r*.7,0,Math.PI*2);ctx.fill();
    }
    ctx.save();
    const glow=ctx.createRadialGradient(robot.x,robot.y,1,robot.x,robot.y,r*3.7);
    glow.addColorStop(0,'rgba(230,239,255,.20)');
    glow.addColorStop(1,'rgba(230,239,255,0)');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(robot.x,robot.y,r*3.7,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f2f6ff';ctx.beginPath();ctx.arc(robot.x,robot.y,r,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function frame(t){
    raf=requestAnimationFrame(frame);
    if(document.hidden)return;
    const dt=clamp((t-(last||t))/16.6667,.3,2);last=t;tick+=dt;
    ctx = backgroundCtx;
    typeCtx.clearRect(0, 0, W, H);
    motionCtx.clearRect(0, 0, W, H);
    const gentle = !reduced.matches;
    ctx.fillStyle='#080a0b';ctx.fillRect(0,0,W,H);
    // A quiet vignette. The letterforms do all the work.
    const grad=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.74);
    grad.addColorStop(0,'#101116');grad.addColorStop(.54,'#090a0e');grad.addColorStop(1,'#050608');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);

    updateRobot(t,dt);
    drawFabric(gentle ? tick * .012 : 0);

    if(gentle&&tick-anomaly>1450){
      anomaly=tick;
      const p=letters[Math.floor(rand()*letters.length)];
      p.vy-=3+rand()*3;p.vx+=(rand()-.5)*8;p.va+=(rand()-.5)*.05;
    }
    if(gentle){
      for(let i=ripples.length-1;i>=0;i--){
        const r=ripples[i];r.r+=6.5*dt;r.life-=.018*dt;
        ctx.strokeStyle=color(Math.max(0,r.life)*.18*r.power);ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();
        if(r.life<=0)ripples.splice(i,1);
      }
    }
    ctx = typeCtx;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=`900 ${font}px ${fontFamily}`;
    for(const p of letters){
      if(p.char === '.') continue;
      ctx = typeCtx;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font=`900 ${font}px ${fontFamily}`;
      if(gentle && pointer.dragging!==p){
        const dx=p.x-pointer.x,dy=p.y-pointer.y,d=Math.hypot(dx,dy);
        const radius=Math.max(110,font*1.3);
        if(d<radius && d>1){const force=Math.pow(1-d/radius,2)*.66;p.vx+=(dx/d)*force*dt;p.vy+=(dy/d)*force*dt;}
        p.vx+=(p.tx-p.x)*.012*dt;
        p.vy+=(p.ty-p.y)*.012*dt;
        p.vx*=Math.pow(.955,dt);p.vy*=Math.pow(.955,dt);
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        p.va+=(-p.a)*.0026*dt;p.va*=Math.pow(.963,dt);p.a+=p.va*dt;
        if(Math.abs(p.vx)+Math.abs(p.vy)>.65){p.trail.push({x:p.x,y:p.y,a:p.a,life:.20});}
      }
      for(let j=p.trail.length-1;j>=0;j--){
        const echo=p.trail[j];echo.life-=.009*dt;
        if(echo.life<=0){p.trail.splice(j,1);continue;}
        ctx.save();ctx.translate(echo.x,echo.y);ctx.rotate(echo.a);
        ctx.fillStyle=color(echo.life*.23);ctx.fillText(p.char,0,0);ctx.restore();
      }
      if(p.trail.length>24)p.trail.splice(0,p.trail.length-24);
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(gentle?p.a:0);
      ctx.filter='none';ctx.shadowBlur=0;
      ctx.fillStyle='rgba(244,246,250,.98)';
      ctx.fillText(p.char,0,0);
      ctx.restore();
    }
    // Dot is a real moving object, not a glyph rendered in the wordmark.
    drawRobot();
  }
  document.fonts?.ready.then(()=>layout(true));
  layout(true);raf=requestAnimationFrame(frame);
}
