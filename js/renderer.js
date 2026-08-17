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

  renderBackdrop(playerZ) {
    const sky = this.ctx.createLinearGradient(0, 0, 0, this.cy + 120);
    sky.addColorStop(0, '#60a5fa');
    sky.addColorStop(0.35, '#a78bfa');
    sky.addColorStop(0.7, '#f9a8d4');
    sky.addColorStop(1, '#f3c98b');
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, this.canvas.width, this.cy + 120);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width * 0.82, this.canvas.height * 0.16, 54, 0, Math.PI * 2);
    this.ctx.fill();

    this.renderMountainRange(playerZ, 0.14, this.cy * 0.9, ['#6b4f3a', '#7b5a40', '#8c6948'], 240, 118, 0.65);
    this.renderMountainRange(playerZ, 0.26, this.cy * 0.98, ['#8b6b4a', '#a07a55', '#7b8b5d'], 190, 82, 0.55);
    this.renderBirds(playerZ);
  }

  renderMountainRange(playerZ, drift, baseY, colors, width, height, softness = 0.6) {
    const offset = -((playerZ * drift) % width);
    const step = width * 0.58;

    for (let x = offset - width; x < this.canvas.width + width; x += step) {
      const color = colors[Math.abs(Math.floor(x / width)) % colors.length];
      const peak1X = x + (width * 0.22);
      const peak1Y = baseY - (height * 0.72);
      const peak2X = x + (width * 0.48);
      const peak2Y = baseY - height;
      const ridgeEndX = x + width;
      const ridgeEndY = baseY - (height * 0.18);

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(x, baseY);
      this.ctx.quadraticCurveTo(x + width * 0.08, baseY - height * 0.14, peak1X, peak1Y);
      this.ctx.quadraticCurveTo(x + width * 0.34, baseY - height * (0.95 + softness * 0.08), peak2X, peak2Y);
      this.ctx.quadraticCurveTo(x + width * 0.72, baseY - height * (0.38 + softness * 0.08), ridgeEndX, ridgeEndY);
      this.ctx.lineTo(ridgeEndX, baseY);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(245, 222, 179, 0.18)';
      this.ctx.beginPath();
      this.ctx.moveTo(x + width * 0.34, baseY - height * 0.72);
      this.ctx.quadraticCurveTo(x + width * 0.44, baseY - height * 0.97, x + width * 0.55, baseY - height * 0.62);
      this.ctx.lineTo(x + width * 0.48, baseY - height * 0.55);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(59, 41, 28, 0.14)';
      this.ctx.beginPath();
      this.ctx.moveTo(x + width * 0.52, baseY - height * 0.18);
      this.ctx.quadraticCurveTo(x + width * 0.68, baseY - height * 0.52, x + width * 0.84, baseY - height * 0.12);
      this.ctx.lineTo(x + width * 0.8, baseY);
      this.ctx.lineTo(x + width * 0.58, baseY);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  renderBirds(playerZ) {
    const flockOffset = (playerZ * 0.9) % (this.canvas.width + 140);
    const startX = this.canvas.width - flockOffset + 70;
    const startY = this.cy * 0.28;

    this.ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
    this.ctx.lineWidth = 2;

    for (let i = 0; i < 5; i++) {
      const x = startX + (i * 26);
      const y = startY + Math.sin((playerZ * 0.08) + i) * 8;
      this.ctx.beginPath();
      this.ctx.moveTo(x - 7, y);
      this.ctx.quadraticCurveTo(x - 2, y - 5, x + 3, y);
      this.ctx.quadraticCurveTo(x + 8, y - 5, x + 13, y);
      this.ctx.stroke();
    }
  }

  renderTreeRow(playerZ, side = 1) {
    const spacing = 14;
    const startZ = Math.floor(playerZ / spacing) * spacing;

    for (let z = startZ - spacing; z < playerZ + 95; z += spacing) {
      const x = side * (5.8 + ((Math.floor(z / spacing) % 2) * 0.7));
      const p = this.project(x, 0, z);
      if (!p) continue;

      const scale = Math.max(0.18, p.scale / 36);
      const trunkW = 10 * scale;
      const trunkH = 28 * scale;
      const crownW = 42 * scale;
      const crownH = 46 * scale;

      this.ctx.fillStyle = '#7c3f00';
      this.ctx.fillRect(p.x - trunkW / 2, p.y - trunkH, trunkW, trunkH);

      this.ctx.fillStyle = side > 0 ? '#22c55e' : '#10b981';
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y - trunkH - crownH);
      this.ctx.lineTo(p.x - crownW / 2, p.y - trunkH + 6 * scale);
      this.ctx.lineTo(p.x + crownW / 2, p.y - trunkH + 6 * scale);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      this.ctx.beginPath();
      this.ctx.arc(p.x - 6 * scale, p.y - trunkH - crownH * 0.55, 8 * scale, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  renderTrack(playerZ) {
    const renderDist = 80;
    const startZ = Math.floor(playerZ / 4) * 4;

    this.renderBackdrop(playerZ);

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

    this.renderTreeRow(playerZ, -1);
    this.renderTreeRow(playerZ, 1);
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
