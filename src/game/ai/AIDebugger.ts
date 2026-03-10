/**
 * AI 调试可视化
 * 显示 AI 状态、视野范围、巡逻路径等
 */

import Phaser from 'phaser';
import { EnemyAI } from './EnemyAI';
import { Enemy } from '../entities/Enemy';

export class AIDebugger {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private enabled: boolean = false;
  private aiList: EnemyAI[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(50);

    // 监听调试开关
    scene.events.on('toggle-ai-debug', (enabled: boolean) => {
      this.enabled = enabled;
      if (!enabled) {
        this.graphics.clear();
      }
    });
  }

  registerAI(ai: EnemyAI): void {
    this.aiList.push(ai);
  }

  unregisterAI(ai: EnemyAI): void {
    const index = this.aiList.indexOf(ai);
    if (index > -1) {
      this.aiList.splice(index, 1);
    }
  }

  clear(): void {
    this.aiList = [];
    this.graphics.clear();
  }

  update(): void {
    if (!this.enabled) return;

    this.graphics.clear();

    this.aiList.forEach((ai) => {
      const context = ai.getContext();
      const enemy = context.enemy;
      const config = enemy.getConfig();

      // 绘制视野范围
      this.drawSightRange(enemy, config.sightRange);

      // 绘制攻击范围
      this.drawAttackRange(enemy, config.attackRange);

      // 绘制巡逻路径
      if (ai.getCurrentStateName() === 'PATROL') {
        this.drawPatrolPath(enemy, context.patrolPoints);
      }

      // 绘制到目标的连线
      if (context.player && ai.getCurrentStateName() === 'CHASE') {
        this.drawTargetLine(enemy, context.player);
      }
    });
  }

  private drawSightRange(enemy: Enemy, range: number): void {
    this.graphics.lineStyle(1, 0x00ff00, 0.3);
    this.graphics.strokeCircle(enemy.x, enemy.y, range);
  }

  private drawAttackRange(enemy: Enemy, range: number): void {
    this.graphics.lineStyle(1, 0xff0000, 0.5);
    this.graphics.strokeCircle(enemy.x, enemy.y, range);
  }

  private drawPatrolPath(enemy: Enemy, points: Phaser.Math.Vector2[]): void {
    if (points.length < 2) return;

    this.graphics.lineStyle(2, 0x00aaff, 0.5);

    // 绘制路径线
    this.graphics.beginPath();
    this.graphics.moveTo(enemy.x, enemy.y);

    points.forEach((point) => {
      this.graphics.lineTo(point.x, point.y);
    });

    // 闭合路径
    this.graphics.lineTo(points[0].x, points[0].y);
    this.graphics.strokePath();

    // 绘制巡逻点
    points.forEach((point) => {
      this.graphics.fillStyle(0x00aaff, 0.8);
      this.graphics.fillCircle(point.x, point.y, 5);
    });
  }

  private drawTargetLine(enemy: Enemy, target: { x: number; y: number }): void {
    this.graphics.lineStyle(2, 0xff4444, 0.5);
    this.graphics.beginPath();
    this.graphics.moveTo(enemy.x, enemy.y);
    this.graphics.lineTo(target.x, target.y);
    this.graphics.strokePath();
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
