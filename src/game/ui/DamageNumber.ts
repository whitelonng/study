/**
 * 伤害数字组件
 * 显示飘动的伤害数字
 */

import Phaser from 'phaser';

export class DamageNumber {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, damage: number, critical: boolean = false) {
    this.scene = scene;

    // 创建容器
    this.container = scene.add.container(x, y);
    this.container.setDepth(150);

    // 文字样式
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: critical ? '24px' : '18px',
      fontFamily: 'Arial, sans-serif',
      color: critical ? '#ff4444' : '#ffffff',
      stroke: '#000000',
      strokeThickness: critical ? 4 : 2,
      fontStyle: critical ? 'bold' : 'normal',
    };

    // 创建文字
    this.text = scene.add.text(0, 0, damage.toString(), style);
    this.text.setOrigin(0.5);
    this.container.add(this.text);

    // 暴击特效
    if (critical) {
      this.showCriticalEffect();
    }

    // 动画
    this.playAnimation();
  }

  private showCriticalEffect(): void {
    // 放大闪烁效果
    this.scene.tweens.add({
      targets: this.text,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 100,
      yoyo: true,
    });
  }

  private playAnimation(): void {
    // 上浮 + 淡出
    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.destroy();
      },
    });

    // 轻微水平漂移
    const driftX = (Math.random() - 0.5) * 20;
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + driftX,
      duration: 800,
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
