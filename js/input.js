class InputHandler {
  constructor(onAction) {
    this.onAction = onAction;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.minSwipeDistance = 30;

    this.bindKeyboard();
    this.bindTouch();
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.onAction('LEFT');
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.onAction('RIGHT');
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          this.onAction('JUMP');
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.onAction('SLIDE');
          break;
      }
    });
  }

  bindTouch() {
    window.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].clientX;
      this.touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      const dy = e.changedTouches[0].clientY - this.touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) > this.minSwipeDistance) {
        if (absX > absY) {
          this.onAction(dx > 0 ? 'RIGHT' : 'LEFT');
        } else {
          this.onAction(dy > 0 ? 'SLIDE' : 'JUMP');
        }
      }
    }, { passive: true });
  }
}