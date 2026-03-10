/**
 * 障碍物实体类
 * 不可移动的障碍物
 */

import Phaser from 'phaser';

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'wall');

    // 添加到场景和物理系统
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // 静态物体

    // 设置深度
    this.setDepth(4);
  }
}
