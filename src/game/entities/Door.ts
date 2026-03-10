/**
 * 门实体类
 * 连接不同房间，玩家触碰后触发房间切换
 */

import Phaser from 'phaser';

export interface DoorConfig {
  id: string;
  targetRoomId: string;
  targetDoorId: string;
  direction: 'north' | 'south' | 'east' | 'west';
}

export class Door extends Phaser.Physics.Arcade.Sprite {
  private config: DoorConfig;
  private isActive: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, config: DoorConfig) {
    super(scene, x, y, 'door');

    this.config = config;

    // 添加到场景和物理系统
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // 静态物体

    // 设置深度
    this.setDepth(5);

    // 设置交互提示
    this.setInteractive();
  }

  getConfig(): DoorConfig {
    return this.config;
  }

  canActivate(): boolean {
    return this.isActive;
  }

  setActivationDelay(delayMs: number): void {
    this.isActive = false;
    this.setAlpha(0.5);

    this.scene.time.delayedCall(delayMs, () => {
      this.isActive = true;
      this.setAlpha(1);
    });
  }

  /**
   * 显示门的视觉提示
   */
  showHint(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.6 },
      duration: 300,
      yoyo: true,
      repeat: 2,
    });
  }
}
