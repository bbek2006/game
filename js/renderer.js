class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 0, y: 3.2, z: -5.5, fov: 280 };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.cx = this.canvas.width / 2;
    this.cy = this.canvas.height / 2;
  }

  project(x, y, z) {
    const relZ = z - this.camera.z;
    if (relZ <= 0.1) return null; // Behind camera clipping
    const scale = this.camera.fov / relZ;
    return {
      x: this.cx + (x - this.camera.x) * scale,
      y: this.cy - (y - this.camera.y) * scale,
      scale: scale
    };
  }

  clear() {
    this.ctx.fillStyle = '#0b0d19';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderTrack(playerZ) {
    const renderDist = 80;
    const startZ = Math.floor(playerZ / 4) * 4;

    // Horizon sky gradient
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.cy);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.cy + 50);

    // Track surface projection
    for (let z = startZ; z < startZ + renderDist; z += 4) {
      const p1 = this.project(-3.8, 0, z);
      const p2 = this.project(3.8, 0, z);
      const p3 = this.project(3.8, 0, z + 4);
      const p4 = this.project(-3.8, 0, z + 4);

      if (p1 && p3) {
        this.ctx.fillStyle = ((z / 4) % 2 === 0) ? '#181828' : '#12121f';
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.lineTo(p4.x, p4.y);
        this.ctx.closePath();
        this.ctx.fill();
      }

      // Lane separator lines
      [-1.2, 1.2].forEach(laneX => {
        const lp1 = this.project(laneX, 0, z);
        const lp2 = this.project(laneX, 0, z + 2.5);
        if (lp1 && lp2) {
          this.ctx.strokeStyle = '#38bdf8';
          this.ctx.lineWidth = Math.max(1, lp1.scale * 0.05);
          this.ctx.beginPath();
          this.ctx.moveTo(lp1.x, lp1.y);
          this.ctx.lineTo(lp2.x, lp2.y);
          this.ctx.stroke();
        }
      });
    }
  }

  drawBox(x, y, z, w, h, d, color, strokeColor = null) {
    const minX = x - w / 2, maxX = x + w / 2;
    const minY = y, maxY = y + h;
    const minZ = z - d / 2, maxZ = z + d / 2;

    const p = [
      this.project(minX, minY, minZ),
      this.project(maxX, minY, minZ),
      this.project(maxX, maxY, minZ),
      this.project(minX, maxY, minZ),
      this.project(minX, minY, maxZ),
      this.project(maxX, minY, maxZ),
      this.project(maxX, maxY, maxZ),
      this.project(minX, maxY, maxZ)
    ];

    if (!p[0] || !p[6]) return;

    this.ctx.fillStyle = color;
    if (strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 1;
    }

    // Render Front face
    this.ctx.beginPath();
    this.ctx.moveTo(p[0].x, p[0].y);
    this.ctx.lineTo(p[1].x, p[1].y);
    this.ctx.lineTo(p[2].x, p[2].y);
    this.ctx.lineTo(p[3].x, p[3].y);
    this.ctx.closePath();
    this.ctx.fill();
    if (strokeColor) this.ctx.stroke();

    // Render Top face
    this.ctx.beginPath();
    this.ctx.moveTo(p[3].x, p[3].y);
    this.ctx.lineTo(p[2].x, p[2].y);
    this.ctx.lineTo(p[6].x, p[6].y);
    this.ctx.lineTo(p[7].x, p[7].y);
    this.ctx.closePath();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.fill();
  }

  renderPlayer(player) {
    // Shadow under player
    const sp = this.project(player.x, 0, player.z);
    if (sp) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.beginPath();
      this.ctx.ellipse(sp.x, sp.y, 18 * (sp.scale / 40), 8 * (sp.scale / 40), 0, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const playerColor = player.isSliding ? '#f43f5e' : '#06b6d4';
    this.drawBox(player.x, player.y, player.z, player.width, player.height, player.depth, playerColor, '#ffffff');

    // Draw active powerup aura
    if (player.magnetTimer > 0) {
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  renderCoins(coins) {
    coins.forEach(c => {
      if (!c.active) return;
      const p = this.project(c.x, c.y, c.z);
      if (p) {
        const radius = Math.max(2, c.radius * p.scale);
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.scale(Math.cos(c.rotation), 1);
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#d97706';
        this.ctx.stroke();
        this.ctx.restore();
      }
    });
  }

  renderObstacles(obstacles) {
    obstacles.forEach(obs => {
      if (!obs.active) return;
      let color = '#dc2626';
      if (obs.type === 'BARRIER_HIGH') color = '#e11d48';
      if (obs.type === 'TRAIN') color = '#4f46e5';

      this.drawBox(obs.x, obs.y, obs.z, obs.width, obs.height, obs.depth, color, '#f8fafc');
    });
  }
}