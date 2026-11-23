/* space.time: an interactive kinetic wordmark, no external animation dependencies. */
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
  const glyphs = [...'space.time'];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const letters = glyphs.map((char, i) => ({ char, i, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, a: 0, va: 0, trail: [] }));
  // The full wordmark is always visible; every glyph is an independent object.
  let motionBlur = 0, motionEnergy = 0, pointerInside = false;
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
    font = clamp(W / 10.2, 28, Math.min(180, H * .31));
    ctx.font = `900 ${font}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    const widths = letters.map(p => ctx.measureText(p.char).width);
    const totalWidth = widths.reduce((a,b)=>a+b,0) + (letters.length-1)*font*.03 + font*.11;
    font *= Math.min(1, (W*.89)/totalWidth);
    const baseBlur = clamp(font*.038, 3.7, 7.5);
    typeCanvas.style.filter = `blur(${baseBlur}px)`;
    motionCanvas.style.filter = typeCanvas.style.filter;
    ctx.font = `900 ${font}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    const fittedWidths = letters.map(p => ctx.measureText(p.char).width);
    const total = fittedWidths.reduce((a,b)=>a+b,0) + (letters.length-1)*font*.03 + font*.11;
    let cursor=(W-total)/2;
    letters.forEach((p,i)=>{
      const width=fittedWidths[i];
      p.tx=cursor+width/2;
      p.ty=H/2;
      cursor+=width+font*.03+(i===5?font*.11:0);
      if(reset || p.x === 0){p.x=p.tx;p.y=p.ty;p.vx=p.vy=p.va=p.a=0;p.trail=[];}
    });
  }

  const color = (a) => `rgba(209,215,231,${a})`;
  function ripple(x,y,power=1) { if (!reduced.matches) ripples.push({x,y,r:0,power,life:1}); }
  function scatter(force = 1.0) {
    if (reduced.matches) return;
    letters.forEach((p,i) => {
      const angle = rand()*Math.PI*2;
      const speed = (5 + rand()*9)*force;
      p.vx += Math.cos(angle)*speed;
      p.vy += Math.sin(angle)*speed;
      p.va += (rand()-.5)*.12*force;
    });
    ripple(W/2,H/2,force);
  }
  function reset() { letters.forEach(p => {p.vx=p.vy=p.va=p.a=0;p.x=p.tx;p.y=p.ty;p.trail=[];});ripples.length=0; }
  function hit(x,y) {
    ctx.font = `900 ${font}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    for (let i=letters.length-1; i>=0; i--) {
      const p=letters[i], ww=ctx.measureText(p.char).width;
      if (Math.abs(x-p.x)<ww*.65+16 && Math.abs(y-p.y)<font*.60+20) return p;
    }
    return null;
  }
  function updatePointer(e) { const b = stage.getBoundingClientRect();pointer.px=pointer.x;pointer.py=pointer.y;pointer.x=e.clientX-b.left;pointer.y=e.clientY-b.top; }
  stage.addEventListener('pointerdown',e=>{
    updatePointer(e); pointer.down=true;pointer.moved=false;pointer.t=performance.now();pointer.id=e.pointerId;
    const picked=hit(pointer.x,pointer.y);
    pointer.dragging = reduced.matches ? null : picked;
    if (picked) {picked.vx=0;picked.vy=0;stage.setPointerCapture(e.pointerId);}
    else ripple(pointer.x,pointer.y,.6);
  });
  stage.addEventListener('pointermove',e=>{
    pointerInside = true;
    const moved = Math.hypot(e.movementX||0,e.movementY||0);
    if (moved > 2) {
      motionEnergy = Math.max(motionEnergy, clamp(moved/17,.2,1));
    }
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
      letters.forEach(q=>{const dx=q.x-pointer.x,dy=q.y-pointer.y,d=Math.max(50,Math.hypot(dx,dy)); q.vx+=dx/d*clamp(450/d,0,7);q.vy+=dy/d*clamp(450/d,0,7);});
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
        line.push({x:x+(distance>1?dx/distance*displacement:0), y:y+(distance>1?dy/distance*displacement:0)});
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

  function frame(t){
    raf=requestAnimationFrame(frame);
    if(document.hidden)return;
    const dt=clamp((t-(last||t))/16.6667,.3,2);last=t;tick+=dt;
    ctx = backgroundCtx;
    typeCtx.clearRect(0, 0, W, H);
    motionCtx.clearRect(0, 0, W, H);
    const baseBlur = clamp(font * .038, 3.7, 7.5);
    motionEnergy *= Math.pow(.94, dt);
    const proximity = pointerInside ? Math.max(0,1-Math.min(
      Math.hypot(pointer.x-letters[7].x,pointer.y-letters[7].y),
      Math.hypot(pointer.x-letters[9].x,pointer.y-letters[9].y)
    ) / (font*2.8)) : 0;
    const targetMotionBlur = reduced.matches ? 0 : motionEnergy * (.45 + .55 * proximity);
    motionBlur += (targetMotionBlur-motionBlur) * Math.min(1, .12*dt);
    motionCanvas.style.filter = `blur(${(baseBlur + motionBlur * Math.min(19, font*.13)).toFixed(2)}px)`;
    const gentle = !reduced.matches;
    ctx.fillStyle='#080a0b';ctx.fillRect(0,0,W,H);
    // A quiet vignette. The letterforms do all the work.
    const grad=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.74);
    grad.addColorStop(0,'#101116');grad.addColorStop(.54,'#090a0e');grad.addColorStop(1,'#050608');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);

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
    ctx.font=`900 ${font}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    for(const p of letters){
      // I and final E in TIME react to pointer movement.
      ctx = (p.i === 7 || p.i === 9) ? motionCtx : typeCtx;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${font}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
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
      // Blur the letterforms themselves, rather than placing sharp glyphs over a glow.
      // Both passes stay soft: a faint atmospheric halo and a dense blurred core.
      const softness = clamp(font * .032, 2.6, 6.4);
      ctx.shadowBlur = 0;
      ctx.filter = `blur(${softness * 2.8}px)`;
      ctx.fillStyle = 'rgba(227,233,243,.24)';
      ctx.fillText(p.char,0,0);
      ctx.filter = `blur(${softness}px)`;
      ctx.fillStyle = 'rgba(244,245,249,.97)';
      ctx.fillText(p.char,0,0);
      ctx.filter = 'none';
      ctx.restore();
    }
  }
  layout(true);raf=requestAnimationFrame(frame);
}
