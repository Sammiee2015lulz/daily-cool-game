const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const livesEl = document.getElementById('lives');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');

// Game state
let gameRunning = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('neonDodgerHigh') || '0');
let lives = 3;
let player = { x: 175, y: 540, w: 50, h: 30, speed: 6 };
let obstacles = [];
let stars = [];
let particles = [];
let keys = {};
let frame = 0;
let spawnRate = 60;

highScoreEl.textContent = highScore;

// Input
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key === ' ' && !gameRunning) startGame();
});
document.addEventListener('keyup', (e) => keys[e.key] = false);

// Touch support
let touchStartX = 0;
canvas.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  e.preventDefault();
});
canvas.addEventListener('touchmove', (e) => {
  if (!gameRunning) return;
  const dx = e.touches[0].clientX - touchStartX;
  player.x += dx * 0.5;
  touchStartX = e.touches[0].clientX;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  e.preventDefault();
}, { passive: false });

startBtn.addEventListener('click', startGame);

function startGame() {
  gameRunning = true;
  score = 0;
  lives = 3;
  obstacles = [];
  stars = [];
  particles = [];
  player.x = 175;
  frame = 0;
  spawnRate = 60;
  overlay.classList.add('hidden');
  updateUI();
  gameLoop();
}

function updateUI() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  if (score > highScore) {
    highScore = score;
    highScoreEl.textContent = highScore;
    localStorage.setItem('neonDodgerHigh', highScore);
  }
}

function spawnObstacle() {
  const w = 20 + Math.random() * 40;
  obstacles.push({
    x: Math.random() * (canvas.width - w),
    y: -30,
    w,
    h: 25 + Math.random() * 20,
    speed: 2 + score * 0.02 + Math.random() * 2,
    color: '#ff3366'
  });
}

function spawnStar() {
  stars.push({
    x: Math.random() * (canvas.width - 20),
    y: -20,
    size: 12,
    speed: 1.5 + Math.random() * 1.5,
    angle: 0
  });
}

function createParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 30,
      color
    });
  }
}

function update() {
  if (!gameRunning) return;
  frame++;

  // Move player
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.x -= player.speed;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) player.x += player.speed;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

  // Spawn
  if (frame % Math.max(20, spawnRate - Math.floor(score / 5)) === 0) {
    spawnObstacle();
    if (Math.random() < 0.4) spawnStar();
  }

  // Update obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.y += o.speed;
    if (o.y > canvas.height) {
      obstacles.splice(i, 1);
      score += 1;
      updateUI();
    }
    // Collision
    if (rectCollide(player, o)) {
      createParticles(o.x + o.w/2, o.y + o.h/2, '#ff3366', 15);
      obstacles.splice(i, 1);
      lives--;
      updateUI();
      if (lives <= 0) gameOver();
    }
  }

  // Update stars
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    s.y += s.speed;
    s.angle += 0.1;
    if (s.y > canvas.height) stars.splice(i, 1);
    if (circleRectCollide(s.x + s.size/2, s.y + s.size/2, s.size/2, player)) {
      createParticles(s.x, s.y, '#ffff00', 12);
      stars.splice(i, 1);
      score += 10;
      updateUI();
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectCollide(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) < (r * r);
}

function draw() {
  // Background stars (static feel)
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Distant stars
  ctx.fillStyle = '#ffffff33';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 97) % canvas.width;
    const sy = (i * 53 + frame * 0.3) % canvas.height;
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Player (neon ship)
  ctx.save();
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#00f5ff';
  ctx.beginPath();
  ctx.moveTo(player.x + player.w/2, player.y);
  ctx.lineTo(player.x, player.y + player.h);
  ctx.lineTo(player.x + player.w, player.y + player.h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Obstacles
  obstacles.forEach(o => {
    ctx.save();
    ctx.shadowColor = o.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = o.color;
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.restore();
  });

  // Stars
  stars.forEach(s => {
    ctx.save();
    ctx.translate(s.x + s.size/2, s.y + s.size/2);
    ctx.rotate(s.angle);
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffff66';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? s.size/2 : s.size/4;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  });
  ctx.globalAlpha = 1;
}

function gameOver() {
  gameRunning = false;
  overlayTitle.textContent = 'Game Over!';
  overlayText.textContent = `Score: ${score} • High: ${highScore}`;
  startBtn.textContent = 'Play Again';
  overlay.classList.remove('hidden');
}

function gameLoop() {
  if (!gameRunning) return;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Initial draw
draw();
overlayTitle.textContent = 'Neon Dodger';
overlayText.textContent = 'Dodge meteors • Catch stars';
