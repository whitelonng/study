/**
 * AI 管理器
 * 管理所有敌人的 AI 实例
 */

import Phaser from 'phaser';
import { EnemyAI } from '../ai/EnemyAI';
import { AIDebugger } from '../ai/AIDebugger';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';

export class AIManager {
  private scene: Phaser.Scene;
  private aiInstances: Map<Enemy, EnemyAI> = new Map();
  private debugger: AIDebugger;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.debugger = new AIDebugger(scene);
  }

  /**
   * 注册敌人 AI
   */
  registerEnemy(enemy: Enemy, player: Player, walls: Phaser.Physics.Arcade.StaticGroup): void {
    const ai = new EnemyAI(enemy);
    ai.setPlayer(player);
    ai.setWalls(walls);
    this.aiInstances.set(enemy, ai);
    this.debugger.registerAI(ai);
  }

  /**
   * 注销敌人 AI
   */
  unregisterEnemy(enemy: Enemy): void {
    const ai = this.aiInstances.get(enemy);
    if (ai) {
      this.debugger.unregisterAI(ai);
      this.aiInstances.delete(enemy);
    }
  }

  /**
   * 更新所有 AI
   */
  update(delta: number): void {
    this.aiInstances.forEach((ai) => {
      ai.update(delta);
    });

    // 更新调试可视化
    this.debugger.update();
  }

  /**
   * 清理所有 AI
   */
  clear(): void {
    this.aiInstances.clear();
    this.debugger.clear();
  }

  /**
   * 获取敌人的 AI 信息
   */
  getAIInfo(enemy: Enemy): ReturnType<EnemyAI['getDebugInfo']> | null {
    const ai = this.aiInstances.get(enemy);
    return ai ? ai.getDebugInfo() : null;
  }

  /**
   * 设置调试模式
   */
  setDebugEnabled(enabled: boolean): void {
    this.scene.events.emit('toggle-ai-debug', enabled);
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.clear();
    this.debugger.destroy();
  }
}
