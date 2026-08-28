(() => {
  "use strict";
 
  // ---------- DOM ----------
  const gameCanvas = document.getElementById('game');
  const ctx = gameCanvas.getContext('2d');
  const trackerCanvas = document.getElementById('trackerCanvas');
  const tctx = trackerCanvas.getContext('2d', { willReadFrequently: true });
  const video = document.getElementById('video');
  const reticle = document.getElementById('reticle');
 
  const startOverlay = document.getElementById('startOverlay');
  const overOverlay = document.getElementById('overOverlay');
  const deniedOverlay = document.getElementById('deniedOverlay');
  const startBtn = document.getElementById('startBtn');
  const retryBtn = document.getElementById('retryBtn');
  const keyboardBtn = document.getElementById('keyboardBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const pauseStatus = document.getElementById('pauseStatus');
  const camStatus = document.getElementById('camStatus');
  const motionStatus = document.getElementById('motionStatus');
  const sensitivitySlider = document.getElementById('sensitivity');
  const scoreVal = document.getElementById('scoreVal');
  const livesVal = document.getElementById('livesVal');
  const finalScore = document.getElementById('finalScore');
 
  const W = gameCanvas.width, H = gameCanvas.height;
  const TW = trackerCanvas.width, TH = trackerCanvas.height;
 
  // ---------- state ----------
  let usingCamera = false;
  let usingKeyboard = false;
  let running = false;
  let paused = false;
  let gameOver = true;
 
  let prevFrame = null;
  let smoothX = TW / 2, smoothY = TH / 2;
  let hasMotionTarget = false;
 
  const keys = { up:false, down:false, left:false, right:false };
 
  const ship = { x: W/2, y: H*0.8, r: 16, targetX: W/2, targetY: H*0.8, invuln: 0 };
  let asteroids = [];
  let orbs = [];
  let stars = [];
  let score = 0;
  let lives = 3;
  let spawnTimer = 0;
  let orbTimer = 0;
  let elapsed = 0;
  let lastT = 0;
 
  for (let i = 0; i < 70; i++) {
    stars.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.6+0.3, s: Math.random()*22+8 });
  }
 
  function resetGame(){
    asteroids = []; orbs = []; score = 0; lives = 3;
    ship.x = ship.targetX = W/2;
    ship.y = ship.targetY = H*0.8;
    ship.invuln = 1.2;
    spawnTimer = 0; orbTimer = 0; elapsed = 0;
    gameOver = false;
    updateHUD();
  }
 
  function updateHUD(){
    scoreVal.textContent = Math.floor(score);
    livesVal.textContent = '●●●'.slice(0, lives) + '○○○'.slice(0, 3-lives);
  }
 
  // ---------- camera + motion tracking ----------
  async function startCamera(){
    camStatus.querySelector('span:last-child').textContent = 'Requesting camera…';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      video.srcObject = stream;
      await video.play();
      usingCamera = true;
      camStatus.classList.add('live');
      camStatus.querySelector('span:last-child').textContent = 'Camera live';
      return true;
    } catch (err) {
      usingCamera = false;
      return false;
    }
  }
 
  function sampleMotion(){
    // draw mirrored frame into small tracker canvas
    tctx.save();
    tctx.translate(TW, 0);
    tctx.scale(-1, 1);
    tctx.drawImage(video, 0, 0, TW, TH);
    tctx.restore();
 
    const frame = tctx.getImageData(0, 0, TW, TH);
    const data = frame.data;
    const gray = new Uint8ClampedArray(TW * TH);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = (data[i]*0.3 + data[i+1]*0.59 + data[i+2]*0.11) | 0;
    }
 
    const threshold = 261 - Number(sensitivitySlider.value) * 4; // slider: twitchy(low) -> calm(high)
    let sumX = 0, sumY = 0, sumW = 0;
 
    if (prevFrame) {
      for (let y = 0; y < TH; y++) {
        for (let x = 0; x < TW; x++) {
          const idx = y * TW + x;
          const diff = Math.abs(gray[idx] - prevFrame[idx]);
          if (diff > threshold) {
            sumX += x * diff;
            sumY += y * diff;
            sumW += diff;
          }
        }
      }
    }
    prevFrame = gray;
 
    const minMotion = 4000;
    if (sumW > minMotion) {
      const cx = sumX / sumW;
      const cy = sumY / sumW;
      smoothX += (cx - smoothX) * 0.35;
      smoothY += (cy - smoothY) * 0.35;
      hasMotionTarget = true;
      motionStatus.classList.add('live');
      motionStatus.querySelector('span:last-child').textContent = 'Tracking';
    } else {
      hasMotionTarget = false;
      motionStatus.classList.remove('live');
      motionStatus.querySelector('span:last-child').textContent = 'No motion';
    }
 
    // reticle overlay position (relative to displayed tracker canvas size)
    if (hasMotionTarget) {
      const rect = trackerCanvas.getBoundingClientRect();
      const scaleX = rect.width / TW, scaleY = rect.height / TH;
      reticle.style.left = (smoothX * scaleX) + 'px';
      reticle.style.top = (smoothY * scaleY) + 'px';
      reticle.classList.add('active');
    } else {
      reticle.classList.remove('active');
    }
 
    if (usingCamera && !paused && !gameOver) {
      ship.targetX = (smoothX / TW) * (W - ship.r*2) + ship.r;
      ship.targetY = (smoothY / TH) * (H - ship.r*2) + ship.r;
    }
  }
 
  // ---------- keyboard fallback ----------
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') keys.up = true;
    if (e.key === 'ArrowDown') keys.down = true;
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key.toLowerCase() === 'p') togglePause();
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') keys.up = false;
    if (e.key === 'ArrowDown') keys.down = false;
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
  });
 
  function applyKeyboard(dt){
    if (!usingKeyboard || paused || gameOver) return;
    const speed = 320 * dt;
    if (keys.up) ship.targetY -= speed;
    if (keys.down) ship.targetY += speed;
    if (keys.left) ship.targetX -= speed;
    if (keys.right) ship.targetX += speed;
    ship.targetX = Math.max(ship.r, Math.min(W - ship.r, ship.targetX));
    ship.targetY = Math.max(ship.r, Math.min(H - ship.r, ship.targetY));
  }
 
  // ---------- entities ----------
  function spawnAsteroid(){
    const r = 14 + Math.random()*20;
    asteroids.push({
      x: Math.random()*(W-2*r)+r,
      y: -r,
      r,
      vy: 90 + Math.random()*60 + Math.min(elapsed*2.4, 140),
      rot: Math.random()*Math.PI*2,
      vrot: (Math.random()-0.5)*2,
    });
  }
 
  function spawnOrb(){
    const r = 8;
    orbs.push({ x: Math.random()*(W-2*r)+r, y: -r, r, vy: 110, pulse: Math.random()*Math.PI*2 });
  }
 
  function circleHit(a, b){
    const dx = a.x-b.x, dy = a.y-b.y;
    return Math.hypot(dx,dy) < a.r + b.r;
  }
 
  // ---------- update ----------
  function update(dt){
    if (paused || gameOver) return;
 
    elapsed += dt;
    score += dt * 8;
 
    applyKeyboard(dt);
 
    // smooth ship toward target
    ship.x += (ship.targetX - ship.x) * Math.min(1, dt*8);
    ship.y += (ship.targetY - ship.y) * Math.min(1, dt*8);
    if (ship.invuln > 0) ship.invuln -= dt;
 
    // stars
    for (const s of stars){
      s.y += s.s * dt;
      if (s.y > H) { s.y = 0; s.x = Math.random()*W; }
    }
 
    // spawn logic, ramps with score
    spawnTimer -= dt;
    const spawnInterval = Math.max(0.35, 1.1 - elapsed*0.01);
    if (spawnTimer <= 0){ spawnAsteroid(); spawnTimer = spawnInterval; }
 
    orbTimer -= dt;
    if (orbTimer <= 0){ spawnOrb(); orbTimer = 1.6 + Math.random()*1.2; }
 
    // asteroids
    for (let i = asteroids.length-1; i >= 0; i--){
      const a = asteroids[i];
      a.y += a.vy * dt;
      a.rot += a.vrot * dt;
      if (a.y - a.r > H) { asteroids.splice(i,1); continue; }
      if (ship.invuln <= 0 && circleHit(ship, a)){
        asteroids.splice(i,1);
        lives -= 1;
        ship.invuln = 1.4;
        updateHUD();
        if (lives <= 0) triggerGameOver();
      }
    }
 
    // orbs
    for (let i = orbs.length-1; i >= 0; i--){
      const o = orbs[i];
      o.y += o.vy * dt;
      o.pulse += dt*6;
      if (o.y - o.r > H) { orbs.splice(i,1); continue; }
      if (circleHit(ship, o)){
        orbs.splice(i,1);
        score += 40;
      }
    }
 
    updateHUD();
  }
 
  function triggerGameOver(){
    gameOver = true;
    finalScore.textContent = Math.floor(score);
    overOverlay.classList.remove('hidden');
  }
 
  // ---------- render ----------
  function drawShip(){
    ctx.save();
    ctx.translate(ship.x, ship.y);
    const flicker = ship.invuln > 0 ? (Math.sin(elapsed*30) > 0 ? 0.35 : 1) : 1;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#5EEAD4';
    ctx.shadowColor = '#5EEAD4';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, -ship.r);
    ctx.lineTo(ship.r*0.8, ship.r*0.9);
    ctx.lineTo(0, ship.r*0.4);
    ctx.lineTo(-ship.r*0.8, ship.r*0.9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
 
  function render(){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0,0,W,H);
 
    ctx.fillStyle = 'rgba(232,236,245,0.5)';
    for (const s of stars){
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
 
    for (const a of asteroids){
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.fillStyle = '#3a1626';
      ctx.strokeStyle = '#FF4D8D';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const spikes = 7;
      for (let i=0;i<spikes;i++){
        const ang = (i/spikes)*Math.PI*2;
        const rad = a.r * (0.75 + (i%2===0?0.25:0));
        const px = Math.cos(ang)*rad, py = Math.sin(ang)*rad;
        if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
 
    for (const o of orbs){
      const pulseR = o.r + Math.sin(o.pulse)*2;
      ctx.save();
      ctx.fillStyle = '#FFB84D';
      ctx.shadowColor = '#FFB84D';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(o.x, o.y, pulseR, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
 
    if (!gameOver) drawShip();
  }
 
  // ---------- loop ----------
  function loop(t){
    if (!running) return;
    if (!lastT) lastT = t;
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
 
    if (usingCamera && video.readyState >= 2) sampleMotion();
 
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
 
  function togglePause(){
    if (gameOver || !running) return;
    paused = !paused;
    pauseStatus.style.opacity = paused ? 1 : 0;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  }
 
  // ---------- wiring ----------
  startBtn.addEventListener('click', async () => {
    const ok = await startCamera();
    if (!ok) {
      startOverlay.classList.add('hidden');
      deniedOverlay.classList.remove('hidden');
      return;
    }
    startOverlay.classList.add('hidden');
    resetGame();
    running = true;
    lastT = 0;
    requestAnimationFrame(loop);
  });
 
  keyboardBtn.addEventListener('click', () => {
    usingKeyboard = true;
    deniedOverlay.classList.add('hidden');
    resetGame();
    running = true;
    lastT = 0;
    requestAnimationFrame(loop);
  });
 
  retryBtn.addEventListener('click', () => {
    overOverlay.classList.add('hidden');
    resetGame();
  });
 
  pauseBtn.addEventListener('click', togglePause);
})();