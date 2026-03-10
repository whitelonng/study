/**
 * 实体管理器
 * 管理房间内的敌人、物品、障碍物
 */

import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { Item, ItemDropConfig } from '../entities/Item';
import { Obstacle } from '../entities/Obstacle';
import { Player } from '../entities/Player';
import { AIManager } from './AIManager';
import { RoomData } from './RoomManager';

export class EntityManager {
  private scene: Phaser.Scene;
  private enemies: Enemy[] = [];
  private items: Item[] = [];
  private obstacles: Obstacle[] = [];
  private aiManager: AIManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.aiManager = new AIManager(scene);

    // 监听敌人掉落事件
    this.scene.events.on('enemy-drop', (config: ItemDropConfig) => {
      this.spawnItem(config);
    });

    // 监听敌人死亡事件
    this.scene.events.on('enemy-death', (data: { enemy: Enemy }) => {
      this.aiManager.unregisterEnemy(data.enemy);
    });
  }

  /**
   * 加载房间内容
   */
  loadRoomContent(room: RoomData, player: Player, walls: Phaser.Physics.Arcade.StaticGroup): void {
    // 清理旧实体
    this.cleanup();

    // 生成障碍物
    room.obstacles.forEach((obstacle) => {
      const obs = new Obstacle(this.scene, room.x + obstacle.x, room.y + obstacle.y);
      this.obstacles.push(obs);
    });

    // 生成敌人
    room.enemies.forEach((enemyData) => {
      const enemy = new Enemy(
        this.scene,
        room.x + enemyData.x,
        room.y + enemyData.y,
        enemyData.type as 'SLIME' | 'SKELETON' | 'MAGE'
      );
      enemy.setTarget(player);
      this.enemies.push(enemy);

      // 注册 AI
      this.aiManager.registerEnemy(enemy, player, walls);
    });

    // 生成物品
    room.items.forEach((itemData) => {
      const item = new Item(this.scene, room.x + itemData.x, room.y + itemData.y, itemData.type);
      this.items.push(item);
    });
  }

  /**
   * 生成单个物品
   */
  spawnItem(config: ItemDropConfig): void {
    const item = new Item(this.scene, config.x, config.y, config.itemId);
    this.items.push(item);
  }

  /**
   * 获取所有敌人
   */
  getEnemies(): Enemy[] {
    return this.enemies;
  }

  /**
   * 获取所有物品
   */
  getItems(): Item[] {
    return this.items;
  }

  /**
   * 获取所有障碍物
   */
  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  /**
   * 获取 AI 管理器
   */
  getAIManager(): AIManager {
    return this.aiManager;
  }

  /**
   * 更新所有实体
   */
  update(delta: number): void {
    // 更新 AI
    this.aiManager.update(delta);

    // 更新敌人
    this.enemies.forEach((enemy) => {
      if (enemy.active) {
        enemy.update(delta);
      }
    });
  }

  /**
   * 清理所有实体
   */
  cleanup(): void {
    // 清理 AI
    this.aiManager.clear();

    // 清理敌人
    this.enemies.forEach((enemy) => enemy.destroy());
    this.enemies = [];

    // 清理物品
    this.items.forEach((item) => item.destroy());
    this.items = [];

    // 清理障碍物
    this.obstacles.forEach((obstacle) => obstacle.destroy());
    this.obstacles = [];
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.cleanup();
    this.aiManager.destroy();
    this.scene.events.off('enemy-drop');
    this.scene.events.off('enemy-death');
  }
}
