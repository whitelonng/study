/**
 * 启动场景
 * 负责加载资源、显示加载进度、初始化游戏数据
 */

import Phaser from 'phaser';
import { initGlobalRNG } from '../../utils/SeededRNG';
import { ENEMY_CONFIGS } from '../data/EnemyData';
import { ITEM_CONFIGS, RARITY_COLORS } from '../data/ItemData';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 显示加载文字
    const { width, height } = this.scale;
    const loadingText = this.add
      .text(width / 2, height / 2, 'Loading...', {
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // 加载完成后的回调
    this.load.on('complete', () => {
      loadingText.destroy();
    });
  }

  create(): void {
    // 初始化随机种子
    this.initSeed();

    // 创建占位图形纹理（后续替换为真实资源）
    this.createPlaceholderTextures();

    // 创建敌人纹理
    this.createEnemyTextures();

    // 创建物品纹理
    this.createItemTextures();

    // 跳转到主游戏场景
    this.scene.start('GameScene');
  }

  private initSeed(): void {
    // 从 URL 或生成随机 seed
    const windowWithSeed = window as Window & { gameSeed?: string };
    let seed = windowWithSeed.gameSeed;

    if (!seed) {
      // 生成随机 seed
      seed = Math.random().toString(36).substring(2, 10);
    }

    // 初始化全局 RNG
    initGlobalRNG(seed);

    // 存储到 registry，全局可访问
    this.registry.set('gameSeed', seed);
    console.log(`[BootScene] Game seed: ${seed}`);
  }

  private createPlaceholderTextures(): void {
    // 玩家占位图形：黄色圆形
    const playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0xffdd00, 1);
    playerGraphics.fillCircle(16, 16, 16);
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();

    // 墙壁占位图形：灰色方块
    const wallGraphics = this.add.graphics();
    wallGraphics.fillStyle(0x666688, 1);
    wallGraphics.fillRect(0, 0, 32, 32);
    wallGraphics.generateTexture('wall', 32, 32);
    wallGraphics.destroy();

    // 地板占位图形：深色方块
    const floorGraphics = this.add.graphics();
    floorGraphics.fillStyle(0x2a2a4a, 1);
    floorGraphics.fillRect(0, 0, 32, 32);
    floorGraphics.generateTexture('floor', 32, 32);
    floorGraphics.destroy();

    // 门占位图形：绿色方块
    const doorGraphics = this.add.graphics();
    doorGraphics.fillStyle(0x44aa44, 1);
    doorGraphics.fillRect(0, 0, 32, 32);
    doorGraphics.generateTexture('door', 32, 32);
    doorGraphics.destroy();
  }

  private createEnemyTextures(): void {
    // 为每种敌人类型创建纹理
    Object.values(ENEMY_CONFIGS).forEach((enemyConfig) => {
      const graphics = this.add.graphics();
      graphics.fillStyle(enemyConfig.color, 1);

      // 根据类型绘制不同形状
      if (enemyConfig.type === 'SLIME') {
        // 史莱姆：椭圆
        graphics.fillEllipse(16, 18, enemyConfig.size, enemyConfig.size * 0.8);
      } else if (enemyConfig.type === 'SKELETON') {
        // 骷髅：带眼睛的圆形
        graphics.fillCircle(16, 16, enemyConfig.size / 2);
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(12, 14, 3);
        graphics.fillCircle(20, 14, 3);
      } else if (enemyConfig.type === 'MAGE') {
        // 法师：三角形（帽子）+ 圆形
        graphics.fillCircle(16, 18, enemyConfig.size / 2);
        graphics.fillStyle(enemyConfig.color, 1);
        graphics.fillTriangle(16, 2, 8, 16, 24, 16);
      }

      const textureKey = `enemy_${enemyConfig.type.toLowerCase()}`;
      graphics.generateTexture(textureKey, 32, 32);
      graphics.destroy();
    });

    // 通用敌人纹理（备用）
    const enemyGraphics = this.add.graphics();
    enemyGraphics.fillStyle(0xff4444, 1);
    enemyGraphics.fillCircle(16, 16, 14);
    enemyGraphics.generateTexture('enemy', 32, 32);
    enemyGraphics.destroy();
  }

  private createItemTextures(): void {
    // 为每种物品创建纹理
    Object.values(ITEM_CONFIGS).forEach((itemConfig) => {
      const graphics = this.add.graphics();
      const rarityColor = RARITY_COLORS[itemConfig.rarity];

      // 根据类型绘制不同形状
      if (itemConfig.type === 'CONSUMABLE') {
        // 消耗品：药水瓶形状
        graphics.fillStyle(itemConfig.color, 1);
        graphics.fillRect(8, 6, 16, 20);
        graphics.fillStyle(rarityColor, 1);
        graphics.fillRect(10, 8, 12, 16);
      } else if (itemConfig.type === 'WEAPON') {
        // 武器：剑形状
        graphics.fillStyle(rarityColor, 1);
        graphics.fillRect(14, 4, 4, 24);
        graphics.fillRect(8, 20, 16, 4);
      } else if (itemConfig.type === 'ARMOR') {
        // 护甲：盾牌形状
        graphics.fillStyle(rarityColor, 1);
        graphics.fillRoundedRect(6, 4, 20, 24, 4);
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillRoundedRect(10, 8, 12, 16, 2);
      } else {
        // 饰品：菱形
        graphics.fillStyle(rarityColor, 1);
        graphics.fillTriangle(16, 4, 4, 16, 16, 28);
        graphics.fillTriangle(16, 4, 28, 16, 16, 28);
      }

      const textureKey = `item_${itemConfig.id.toLowerCase()}`;
      graphics.generateTexture(textureKey, 32, 32);
      graphics.destroy();
    });
  }
}
