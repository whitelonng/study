/**
 * 物品实体类
 * 地面上的可拾取物品
 */

import Phaser from 'phaser';
import { getItemConfig, ItemConfig, RARITY_COLORS } from '../data/ItemData';

export interface ItemDropConfig {
  itemId: string;
  x: number;
  y: number;
}

export class Item extends Phaser.Physics.Arcade.Sprite {
  private itemConfig: ItemConfig;
  private isCollected: boolean = false;
  private bobTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, itemId: string) {
    const config = getItemConfig(itemId);
    if (!config) {
      throw new Error(`Unknown item id: ${itemId}`);
    }

    const textureKey = `item_${itemId.toLowerCase()}`;
    super(scene, x, y, textureKey);

    this.itemConfig = config;

    // 添加到场景和物理系统
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // 静态物体

    // 设置深度
    this.setDepth(6);

    // 设置大小
    this.setDisplaySize(20, 20);

    // 浮动动画
    this.startBobAnimation();

    // 显示稀有度指示
    this.showRarityIndicator();
  }

  private startBobAnimation(): void {
    this.bobTween = this.scene.tweens.add({
      targets: this,
      y: this.y - 5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private showRarityIndicator(): void {
    // 在物品下方显示稀有度颜色点
    const color = RARITY_COLORS[this.itemConfig.rarity];

    // 创建光晕效果
    const glow = this.scene.add.graphics();
    glow.fillStyle(color, 0.3);
    glow.fillCircle(0, 5, 12);
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * 玩家拾取物品
   */
  collect(playerStats: { hp: number; maxHp: number; atk: number; def: number; spd: number }): {
    success: boolean;
    message: string;
    statChanges: { stat: string; value: number }[];
  } {
    if (this.isCollected) {
      return { success: false, message: 'Already collected', statChanges: [] };
    }

    this.isCollected = true;
    const statChanges: { stat: string; value: number }[] = [];

    // 应用属性加成
    this.itemConfig.statBonuses.forEach((bonus) => {
      switch (bonus.stat) {
        case 'hp':
          // 消耗品直接恢复 HP
          if (this.itemConfig.type === 'CONSUMABLE') {
            playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + bonus.value);
            statChanges.push({ stat: 'hp', value: bonus.value });
          }
          break;
        case 'atk':
          playerStats.atk += bonus.value;
          statChanges.push({ stat: 'atk', value: bonus.value });
          break;
        case 'def':
          playerStats.def += bonus.value;
          statChanges.push({ stat: 'def', value: bonus.value });
          break;
        case 'spd':
          playerStats.spd += bonus.value;
          statChanges.push({ stat: 'spd', value: bonus.value });
          break;
      }
    });

    // 拾取动画
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.5,
      y: this.y - 30,
      duration: 300,
      onComplete: () => {
        if (this.bobTween) {
          this.bobTween.stop();
        }
        this.destroy();
      },
    });

    console.log(`[Item] Collected: ${this.itemConfig.name}`);

    return {
      success: true,
      message: `获得 ${this.itemConfig.name}`,
      statChanges,
    };
  }

  getItemConfig(): ItemConfig {
    return this.itemConfig;
  }

  canCollect(): boolean {
    return !this.isCollected;
  }
}
