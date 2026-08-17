const LANE_WIDTH = 2.4; // 3D units

class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.targetLane = 0; // -1 (left), 0 (center), 1 (right)
    this.currentLane = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    
    this.isJumping = false;
    this.isSliding = false;
    this.vy = 0;
    this.jumpForce = 8.5;
    this.gravity = -24;
    
    this.slideTimer = 0;
    this.slideDuration = 0.65;
    
    this.width = 0.8;
    this.height = 1.6;
    this.depth = 0.5;

    this.hasShield = false;
    this.magnetTimer = 0;
  }

  moveLeft() {
    if (this.targetLane > -1) this.targetLane--;
  }

  moveRight() {
    if (this.targetLane < 1) this.targetLane++;
  }

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.vy = this.jumpForce;
      this.isSliding = false;
      this.slideTimer = 0;
    }
  }

  slide() {
    if (this.isJumping) {
      // Fast drop
      this.vy = -15;
    }
    this.isSliding = true;
    this.slideTimer = this.slideDuration;
  }

  update(dt) {
    // Smooth lane transition interpolation
    const targetX = this.targetLane * LANE_WIDTH;
    this.x += (targetX - this.x) * 14 * dt;

    // Jump physics
    if (this.isJumping) {
      this.y += this.vy * dt;
      this.vy += this.gravity * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.isJumping = false;
      }
    }

    // Slide state timer
    if (this.isSliding) {
      this.slideTimer -= dt;
      this.height = 0.8; // Shrink hitbox
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        this.height = 1.6;
      }
    } else {
      this.height = 1.6;
    }

    if (this.magnetTimer > 0) {
      this.magnetTimer -= dt;
    }
  }

  getBounds() {
    return {
      minX: this.x - this.width / 2,
      maxX: this.x + this.width / 2,
      minY: this.y,
      maxY: this.y + this.height,
      minZ: this.z - this.depth / 2,
      maxZ: this.z + this.depth / 2
    };
  }
}

class Obstacle {
  constructor() {
    this.active = false;
    this.lane = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.type = 'BARRIER_LOW'; // BARRIER_LOW, BARRIER_HIGH, TRAIN
    this.width = 1.8;
    this.height = 1.0;
    this.depth = 0.5;
    this.speedZ = 0; // For moving trains
  }

  spawn(lane, z, type = 'BARRIER_LOW', speedZ = 0) {
    this.active = true;
    this.lane = lane;
    this.x = lane * LANE_WIDTH;
    this.z = z;
    this.type = type;
    this.speedZ = speedZ;

    if (type === 'BARRIER_LOW') {
      // Jumpable barrier
      this.y = 0;
      this.width = 1.8;
      this.height = 0.8;
      this.depth = 0.4;
    } else if (type === 'BARRIER_HIGH') {
      // Slidable barrier (high clearance)
      this.y = 0.9;
      this.width = 1.8;
      this.height = 1.5;
      this.depth = 0.4;
    } else if (type === 'TRAIN') {
      // Large solid moving or static vehicle
      this.y = 0;
      this.width = 2.0;
      this.height = 2.8;
      this.depth = 12.0;
    }
  }

  update(dt, playerZ) {
    if (!this.active) return;
    this.z += this.speedZ * dt;
    // Deactivate once far behind player
    if (this.z < playerZ - 15) {
      this.active = false;
    }
  }

  getBounds() {
    return {
      minX: this.x - this.width / 2,
      maxX: this.x + this.width / 2,
      minY: this.y,
      maxY: this.y + this.height,
      minZ: this.z - this.depth / 2,
      maxZ: this.z + this.depth / 2
    };
  }
}

class Coin {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0.8;
    this.z = 0;
    this.radius = 0.35;
    this.rotation = 0;
  }

  spawn(lane, y, z) {
    this.active = true;
    this.lane = lane;
    this.x = lane * LANE_WIDTH;
    this.y = y;
    this.z = z;
  }

  update(dt, player, playerZ) {
    if (!this.active) return;
    this.rotation += 4 * dt;

    // Magnet attraction mechanic
    if (player.magnetTimer > 0) {
      const distZ = Math.abs(this.z - player.z);
      if (distZ < 15) {
        this.x += (player.x - this.x) * 8 * dt;
        this.y += ((player.y + 0.8) - this.y) * 8 * dt;
        this.z += (player.z - this.z) * 8 * dt;
      }
    }

    if (this.z < playerZ - 10) {
      this.active = false;
    }
  }
}