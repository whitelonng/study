/**
 * 敌人实体类
 * 继承 Entity，实现不同类型敌人的行为
 */

import Phaser from 'phaser';
import { Entity, EntityStats } from './Entity';
import { EnemyType, getEnemyConfig, EnemyConfig } from '../data/EnemyData';
import { Player } from './Player';
import { HealthBar } from '../ui/HealthBar';

export type EnemyState = 'IDLE' | 'PATROL' | 'CHASE' | 'ATTACK' | 'DEAD' | 'KNOCKBACK';

export class Enemy extends Entity {
  private enemyType: EnemyType;
  private config: EnemyConfig;
  private state: EnemyState = 'IDLE';
  private target: Player | null = null;
  private patrolPoints: Phaser.Math.Vector2[] = [];
  private currentPatrolIndex: number = 0;
  private attackCooldownTimer: number = 0;
  private stateText: Phaser.GameObjects.Text | null = null;
  private healthBar: HealthBar | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType) {
    const config = getEnemyConfig(type);
    const textureKey = `enemy_${type.toLowerCase()}`;

    super(scene, x, y, textureKey);

    this.enemyType = type;
    this.config = config;

    // 设置属性
    this.stats = {
      hp: config.hp,
      maxHp: config.hp,
      atk: config.atk,
      def: config.def,
      spd: config.spd,
    };

    // 设置深度
    this.setDepth(8);

    // 生成巡逻点
    this.generatePatrolPoints(x, y);

    // 创建血条
    this.healthBar = new HealthBar(scene, this, {
      width: 36,
      height: 5,
      offsetY: -22,
    });

    // 创建状态显示（调试用）
    if (scene.registry.get('debugEnabled')) {
      this.createStateText();
    }
  }

  private generatePatrolPoints(startX: number, startY: number): void {
    const range = 100;
    this.patrolPoints = [
      new Phaser.Math.Vector2(startX - range, startY),
      new Phaser.Math.Vector2(startX + range, startY),
    ];
  }

  private createStateText(): void {
    this.stateText = this.scene.add.text(this.x, this.y - 20, '', {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 2, y: 1 },
    });
    this.stateText.setDepth(100);
  }

  setTarget(player: Player): void {
    this.target = player;
  }

  getState(): EnemyState {
    return this.state;
  }

  /**
   * 攻击玩家（由 AI 调用）
   */
  attackPlayer(damage: number, direction: Phaser.Math.Vector2): void {
    this.state = 'ATTACK';
    this.setVelocity(0, 0);

    // 攻击动画
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
    });

    // 对玩家造成伤害
    if (this.target && !this.target.isEntityInvincible()) {
      this.target.takeDamage(damage);

      // 发送敌人攻击事件
      this.scene.events.emit('enemy-attack', {
        target: this.target,
        damage: damage,
        direction,
      });
    }

    console.log(`[Enemy] ${this.config.name} attacks player for ${damage} damage`);
  }

  override update(delta: number): void {
    super.update(delta);

    if (this.state === 'DEAD') return;

    // 被击退时不执行其他行为
    if (this.isEntityKnockedBack()) {
      this.state = 'KNOCKBACK';
      this.updateHealthBar();
      return;
    }

    // 更新攻击冷却
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= delta;
    }

    // 更新血条位置
    this.updateHealthBar();

    // 更新状态文本位置
    if (this.stateText) {
      this.stateText.setPosition(this.x - 15, this.y - 35);
      this.stateText.setText(`${this.state}`);
    }
  }

  private updateHealthBar(): void {
    if (this.healthBar) {
      this.healthBar.update(this.stats.hp, this.stats.maxHp);
      this.healthBar.syncPosition();
    }
  }

  // 简化的行为方法（AI 会调用这些）
  startPatrol(): void {
    this.state = 'PATROL';
  }

  startChase(): void {
    this.state = 'CHASE';
  }

  moveToward(targetX: number, targetY: number, speed?: number): void {
    const moveSpeed = speed ?? this.stats.spd;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.setVelocity(Math.cos(angle) * moveSpeed, Math.sin(angle) * moveSpeed);
  }

  stopMoving(): void {
    this.setVelocity(0, 0);
  }

  override takeDamage(amount: number): boolean {
    const success = super.takeDamage(amount);

    if (success) {
      // 受伤反馈
      this.scene.tweens.add({
        targets: this,
        tint: 0xff0000,
        duration: 50,
        yoyo: true,
        onComplete: () => {
          this.clearTint();
        },
      });
    }

    return success;
  }

  override onDeath(): void {
    this.state = 'DEAD';
    this.setVelocity(0, 0);
    this.setActive(false);

    // 销毁血条
    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = null;
    }

    // 死亡动画
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      onComplete: () => {
        this.destroy();
      },
    });

    // 掉落物品（概率）
    this.dropLoot();

    // 给玩家经验值
    if (this.target) {
      this.target.addXP(this.config.xpReward);
    }

    // 销毁状态文本
    if (this.stateText) {
      this.stateText.destroy();
    }

    // 发送死亡事件
    this.scene.events.emit('enemy-death', { enemy: this });

    console.log(`[Enemy] ${this.config.name} died!`);
  }

  private dropLoot(): void {
    // 30% 概率掉落物品
    if (Math.random() < 0.3) {
      this.scene.events.emit('enemy-drop', {
        x: this.x,
        y: this.y,
        itemId: 'HEALTH_POTION',
      });
    }
  }

  getEnemyType(): EnemyType {
    return this.enemyType;
  }

  getConfig(): EnemyConfig {
    return this.config;
  }

  getTarget(): Player | null {
    return this.target;
  }

  override destroy(fromScene?: boolean): void {
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    if (this.stateText) {
      this.stateText.destroy();
    }
    super.destroy(fromScene);
  }
}
