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
    this.lastPrimaryLane = 0;
    this.sameLaneStreak = 0;
    this.lastPattern = 'single';

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
    this.lastPrimaryLane = 0;
    this.sameLaneStreak = 0;
    this.lastPattern = 'single';

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

  shuffleLanes() {
    return [-1, 0, 1].sort(() => Math.random() - 0.5);
  }

  choosePrimaryLane() {
    const lanes = this.shuffleLanes();

    if (this.sameLaneStreak >= 1) {
      const alternateLane = lanes.find(lane => lane !== this.lastPrimaryLane);
      this.lastPrimaryLane = alternateLane;
      this.sameLaneStreak = 0;
      return alternateLane;
    }

    const lane = lanes[0];
    if (lane === this.lastPrimaryLane) {
      this.sameLaneStreak++;
    } else {
      this.sameLaneStreak = 0;
      this.lastPrimaryLane = lane;
    }

    return lane;
  }

  chooseObstacleType(intensity = 0) {
    const roll = Math.random();
    const trainThreshold = 0.72 - (intensity * 0.12);
    const highBarrierThreshold = 0.38 - (intensity * 0.08);

    if (roll > trainThreshold) return 'TRAIN';
    if (roll > highBarrierThreshold) return 'BARRIER_HIGH';
    return 'BARRIER_LOW';
  }

  activateObstacle(lane, z, type, speedZ = 0) {
    const obs = this.obstaclesPool.find(o => !o.active);
    if (!obs) return false;

    obs.spawn(lane, z, type, speedZ);
    return true;
  }

  spawnCoinLine(lane, startZ, count = 5, spacing = 1.8, heightFn = () => 0.8) {
    for (let i = 0; i < count; i++) {
      const coin = this.coinsPool.find(c => !c.active);
      if (!coin) return;
      coin.spawn(lane, heightFn(i), startZ + (i * spacing));
    }
  }

  spawnSegment(z) {
    const lanes = this.shuffleLanes();
    const primaryLane = this.choosePrimaryLane();
    const remainingLanes = lanes.filter(lane => lane !== primaryLane);
    const secondaryLane = remainingLanes[0];
    const safeLane = remainingLanes[1];
    const intensity = Math.min(1, (this.speed - 14) / (this.maxSpeed - 14));

    const patternOptions = ['single', 'double', 'staggered'];
    if (intensity > 0.25) patternOptions.push('pinch');
    if (intensity > 0.45) patternOptions.push('train_mix');

    let pattern = patternOptions[Math.floor(Math.random() * patternOptions.length)];
    if (pattern === this.lastPattern && Math.random() < 0.55) {
      pattern = patternOptions[(patternOptions.indexOf(pattern) + 1) % patternOptions.length];
    }
    this.lastPattern = pattern;

    if (pattern === 'single') {
      const type = this.chooseObstacleType(intensity * 0.7);
      const trainSpeed = (type === 'TRAIN' && Math.random() > 0.5) ? -4 - (intensity * 2) : 0;
      this.activateObstacle(primaryLane, z, type, trainSpeed);
      this.spawnCoinLine(safeLane, z, 5, 1.8, i => 0.8 + Math.sin(i * 0.6) * 0.15);
      return 20 + (Math.random() * 6);
    }

    if (pattern === 'double') {
      this.activateObstacle(primaryLane, z, this.chooseObstacleType(intensity * 0.4));
      this.activateObstacle(secondaryLane, z, this.chooseObstacleType(intensity * 0.25));
      this.spawnCoinLine(safeLane, z + 1, 6, 1.7, i => 0.85 + Math.sin(i * 0.7) * 0.2);
      return 22 + (Math.random() * 6);
    }

    if (pattern === 'staggered') {
      this.activateObstacle(primaryLane, z, this.chooseObstacleType(intensity * 0.45));
      this.activateObstacle(secondaryLane, z + 8, this.chooseObstacleType(intensity * 0.6));
      this.spawnCoinLine(safeLane, z, 3, 1.8, i => 0.8 + (i * 0.08));
      this.spawnCoinLine(primaryLane, z + 10, 3, 1.8, i => 0.95 + Math.sin(i * 0.8) * 0.12);
      return 26 + (Math.random() * 7);
    }

    if (pattern === 'pinch') {
      this.activateObstacle(primaryLane, z, 'BARRIER_HIGH');
      this.activateObstacle(safeLane, z + 7, 'BARRIER_LOW');
      this.spawnCoinLine(secondaryLane, z + 1.5, 6, 1.6, i => 0.85 + Math.sin(i * 0.8) * 0.18);
      return 28 + (Math.random() * 6);
    }

    const trainLane = Math.random() > 0.5 ? primaryLane : secondaryLane;
    const supportLane = trainLane === primaryLane ? secondaryLane : primaryLane;
    const trainSpeed = Math.random() > 0.5 ? -5 - (intensity * 3) : 0;
    this.activateObstacle(trainLane, z, 'TRAIN', trainSpeed);
    this.activateObstacle(supportLane, z + 7.5, this.chooseObstacleType(intensity * 0.5));
    this.spawnCoinLine(safeLane, z + 1, 7, 1.55, i => 0.8 + Math.sin(i * 0.9) * 0.15);
    return 30 + (Math.random() * 8);
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
      const nextGap = this.spawnSegment(this.nextSpawnZ);
      this.nextSpawnZ += nextGap;
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
