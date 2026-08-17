class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.audio = new SoundController();
    this.player = new Player();

    this.obstaclesPool = Array.from({ length: 25 }, () => new Obstacle());
    this.coinsPool = Array.from({ length: 60 }, () => new Coin());

    this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
    this.score = 0;
    this.coins = 0;
    this.speed = 14;
    this.maxSpeed = 32;
    this.distanceTraveled = 0;
    this.nextSpawnZ = 30;

    this.highScore = parseInt(localStorage.getItem('cr_high_score') || '0', 10);
    this.lastTime = 0;

    this.initUI();
    this.input = new InputHandler((action) => this.handleAction(action));

    requestAnimationFrame((t) => this.loop(t));
  }

  initUI() {
    this.uiMenu = document.getElementById('menu-screen');
    this.uiHUD = document.getElementById('hud');
    this.uiGameOver = document.getElementById('game-over-screen');
    
    this.scoreDisplay = document.getElementById('score-display');
    this.coinsDisplay = document.getElementById('coins-display');
    this.multDisplay = document.getElementById('mult-display');
    
    this.finalScore = document.getElementById('final-score');
    this.finalCoins = document.getElementById('final-coins');
    this.finalHighScore = document.getElementById('final-high-score');
    this.menuHighScore = document.getElementById('menu-high-score');
    
    this.powerupBar = document.getElementById('active-powerup-bar');
    this.powerupProgress = document.getElementById('powerup-progress');

    this.menuHighScore.textContent = this.highScore;

    document.getElementById('btn-play').addEventListener('click', () => this.start());
    document.getElementById('btn-restart').addEventListener('click', () => this.start());
    
    const btnAudio = document.getElementById('btn-audio-toggle');
    btnAudio.addEventListener('click', () => {
      this.audio.init();
      const isMuted = this.audio.toggleMute();
      btnAudio.textContent = isMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
    });
  }

  handleAction(action) {
    if (this.state !== 'PLAYING') return;

    if (action === 'LEFT') this.player.moveLeft();
    if (action === 'RIGHT') this.player.moveRight();
    if (action === 'JUMP') {
      this.player.jump();
      this.audio.playJump();
    }
    if (action === 'SLIDE') {
      this.player.slide();
      this.audio.playSlide();
    }
  }

  start() {
    this.audio.init();
    this.audio.startMusic();
    this.player.reset();
    
    this.obstaclesPool.forEach(o => o.active = false);
    this.coinsPool.forEach(c => c.active = false);

    this.score = 0;
    this.coins = 0;
    this.speed = 14;
    this.distanceTraveled = 0;
    this.nextSpawnZ = 30;

    this.state = 'PLAYING';
    this.uiMenu.classList.add('hidden');
    this.uiGameOver.classList.add('hidden');
    this.uiHUD.classList.remove('hidden');
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.audio.stopMusic();
    this.audio.playHit();

    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
      localStorage.setItem('cr_high_score', this.highScore.toString());
    }

    this.finalScore.textContent = Math.floor(this.score);
    this.finalCoins.textContent = this.coins;
    this.finalHighScore.textContent = this.highScore;
    this.menuHighScore.textContent = this.highScore;

    this.uiHUD.classList.add('hidden');
    this.uiGameOver.classList.remove('hidden');
  }

  spawnSegment(z) {
    const lanePattern = [-1, 0, 1].sort(() => Math.random() - 0.5);
    const primaryLane = lanePattern[0];
    const secondaryLane = lanePattern[1];

    const rand = Math.random();
    let obsType = 'BARRIER_LOW';
    if (rand > 0.6) obsType = 'TRAIN';
    else if (rand > 0.35) obsType = 'BARRIER_HIGH';

    const obs = this.obstaclesPool.find(o => !o.active);
    if (obs) {
      const trainSpeed = (obsType === 'TRAIN' && Math.random() > 0.5) ? -4 : 0;
      obs.spawn(primaryLane, z, obsType, trainSpeed);
    }

    // Spawn coin arcs in free lane
    for (let i = 0; i < 5; i++) {
      const coin = this.coinsPool.find(c => !c.active);
      if (coin) {
        coin.spawn(secondaryLane, 0.8, z + (i * 1.8));
      }
    }
  }

  checkAABB(b1, b2) {
    return (
      b1.minX < b2.maxX &&
      b1.maxX > b2.minX &&
      b1.minY < b2.maxY &&
      b1.maxY > b2.minY &&
      b1.minZ < b2.maxZ &&
      b1.maxZ > b2.minZ
    );
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    // Difficulty and forward momentum
    this.speed = Math.min(this.maxSpeed, this.speed + 0.12 * dt);
    const forwardStep = this.speed * dt;
    this.player.z += forwardStep;
    this.distanceTraveled += forwardStep;
    this.score += forwardStep * 1.5;

    this.player.update(dt);
    this.renderer.camera.z = this.player.z - 6;

    // Procedural level generation trigger
    if (this.player.z + 70 > this.nextSpawnZ) {
      this.spawnSegment(this.nextSpawnZ);
      this.nextSpawnZ += 24 + Math.random() * 8;
    }

    // Update obstacles and check collisions
    const pBounds = this.player.getBounds();
    this.obstaclesPool.forEach(obs => {
      if (!obs.active) return;
      obs.update(dt, this.player.z);
      if (this.checkAABB(pBounds, obs.getBounds())) {
        this.gameOver();
      }
    });

    // Update coins & pickups
    this.coinsPool.forEach(coin => {
      if (!coin.active) return;
      coin.update(dt, this.player, this.player.z);
      
      // Radius collision with player
      const pCenter = { x: this.player.x, y: this.player.y + 0.8, z: this.player.z };
      const dist = Math.hypot(pCenter.x - coin.x, pCenter.y - coin.y, pCenter.z - coin.z);
      
      if (dist < 0.9) {
        coin.active = false;
        this.coins++;
        this.score += 25;
        this.audio.playCoin();
      }
    });

    // Update HUD display elements
    this.scoreDisplay.textContent = Math.floor(this.score);
    this.coinsDisplay.textContent = `🪙 ${this.coins}`;
    this.multDisplay.textContent = `x${(1 + (this.speed - 14) * 0.1).toFixed(1)}`;
  }

  render() {
    this.renderer.clear();
    this.renderer.renderTrack(this.player.z);
    this.renderer.renderObstacles(this.obstaclesPool);
    this.renderer.renderCoins(this.coinsPool);
    this.renderer.renderPlayer(this.player);
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Start game on window load
window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});