/**
 * 血条组件
 * 可附加到任意实体的血条
 */

import Phaser from 'phaser';

export interface HealthBarConfig {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  showBackground: boolean;
  showBorder: boolean;
  animated: boolean;
}

export class HealthBar {
  private scene: Phaser.Scene;
  private target: Phaser.GameObjects.Sprite;
  private container!: Phaser.GameObjects.Container;
  private background!: Phaser.GameObjects.Rectangle;
  private bar!: Phaser.GameObjects.Rectangle;
  private border!: Phaser.GameObjects.Rectangle;
  private config: HealthBarConfig;
  private currentPercent: number = 1;
  private targetPercent: number = 1;

  constructor(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Sprite,
    config?: Partial<HealthBarConfig>
  ) {
    this.scene = scene;
    this.target = target;

    this.config = {
      width: config?.width ?? 40,
      height: config?.height ?? 6,
      offsetX: config?.offsetX ?? 0,
      offsetY: config?.offsetY ?? -30,
      showBackground: config?.showBackground ?? true,
      showBorder: config?.showBorder ?? true,
      animated: config?.animated ?? true,
    };

    this.create();
  }

  private create(): void {
    const { width, height, offsetX, offsetY } = this.config;

    // 容器
    this.container = this.scene.add.container(this.target.x + offsetX, this.target.y + offsetY);
    this.container.setDepth(100);

    // 背景
    this.background = this.scene.add.rectangle(0, 0, width, height, 0x333333);
    if (!this.config.showBackground) {
      this.background.setVisible(false);
    }
    this.container.add(this.background);

    // 血条
    this.bar = this.scene.add.rectangle(-width / 2 + 1, 0, width - 2, height - 2, 0x44ff44);
    this.bar.setOrigin(0, 0.5);
    this.container.add(this.bar);

    // 边框
    this.border = this.scene.add.rectangle(0, 0, width, height, 0xffffff);
    this.border.setStrokeStyle(1, 0xffffff, 0.5);
    this.border.setFillStyle(0, 0);
    if (!this.config.showBorder) {
      this.border.setVisible(false);
    }
    this.container.add(this.border);
  }

  /**
   * 更新血条
   */
  update(current: number, max: number): void {
    this.targetPercent = Math.max(0, Math.min(1, current / max));

    if (this.config.animated) {
      this.animateBar();
    } else {
      this.currentPercent = this.targetPercent;
      this.updateBarWidth();
    }

    // 更新颜色
    this.updateColor();
  }

  private animateBar(): void {
    if (Math.abs(this.currentPercent - this.targetPercent) < 0.01) {
      this.currentPercent = this.targetPercent;
      this.updateBarWidth();
      return;
    }

    this.scene.tweens.add({
      targets: this,
      currentPercent: this.targetPercent,
      duration: 200,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.updateBarWidth();
      },
    });
  }

  private updateBarWidth(): void {
    const width = this.config.width - 2;
    this.bar.width = width * this.currentPercent;
  }

  private updateColor(): void {
    if (this.targetPercent > 0.6) {
      this.bar.setFillStyle(0x44ff44);
    } else if (this.targetPercent > 0.3) {
      this.bar.setFillStyle(0xffaa44);
    } else {
      this.bar.setFillStyle(0xff4444);
    }
  }

  /**
   * 同步位置（跟随目标）
   */
  syncPosition(): void {
    if (!this.target.active) {
      this.container.setVisible(false);
      return;
    }
    this.container.setVisible(true);
    this.container.setPosition(
      this.target.x + this.config.offsetX,
      this.target.y + this.config.offsetY
    );
  }

  destroy(): void {
    this.container.destroy();
  }
}
