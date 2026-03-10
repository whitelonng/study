/**
 * 实体基类
 * 所有游戏实体（玩家、敌人、NPC）的基类
 */

import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export interface EntityStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
}

export abstract class Entity extends Phaser.Physics.Arcade.Sprite {
  protected stats: EntityStats;
  protected isInvincible: boolean = false;
  protected invincibleTimer: number = 0;
  protected isKnockedBack: boolean = false;
  protected knockbackTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    // 添加到场景和物理系统
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 初始化属性
    this.stats = {
      hp: 100,
      maxHp: 100,
      atk: 10,
      def: 5,
      spd: 150,
    };

    // 物理属性设置
    this.setCollideWorldBounds(true);
    this.setBounce(0, 0);

    // 设置碰撞体大小
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.8, this.height * 0.8);
    body.setOffset(this.width * 0.1, this.height * 0.1);
  }

  getStats(): EntityStats {
    return { ...this.stats };
  }

  setStats(stats: Partial<EntityStats>): void {
    this.stats = { ...this.stats, ...stats };
  }

  takeDamage(amount: number): boolean {
    if (this.isInvincible) {
      return false;
    }

    // 扣除 HP
    this.stats.hp -= amount;

    // 触发无敌帧
    this.activateInvincibility();

    // 发送受伤事件
    this.scene.events.emit('entity-damaged', {
      entity: this,
      damage: amount,
    });

    // 检查死亡
    if (this.stats.hp <= 0) {
      this.stats.hp = 0;
      this.onDeath();
    }

    return true;
  }

  /**
   * 应用击退
   */
  applyKnockback(direction: Phaser.Math.Vector2, force: number): void {
    if (this.isKnockedBack) return;

    this.isKnockedBack = true;
    this.knockbackTimer = 200; // 200ms 击退时间

    const normalizedDir = direction.clone().normalize();
    this.setVelocity(normalizedDir.x * force, normalizedDir.y * force);

    // 发送击退事件
    this.scene.events.emit('entity-knockback', {
      entity: this,
      direction: normalizedDir,
      force,
    });
  }

  protected activateInvincibility(): void {
    this.isInvincible = true;
    this.invincibleTimer = GameConfig.PLAYER.INVINCIBLE_FRAMES;

    // 闪烁效果
    this.startInvincibilityFlicker();
  }

  protected startInvincibilityFlicker(): void {
    // 使用 tween 实现平滑闪烁
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: Math.floor(GameConfig.PLAYER.INVINCIBLE_FRAMES / 160) - 1,
      onComplete: () => {
        this.alpha = 1;
      },
    });
  }

  protected onDeath(): void {
    // 子类实现
    this.setActive(false);
    this.setVisible(false);
  }

  override update(delta: number): void {
    // 更新无敌帧计时
    if (this.isInvincible) {
      this.invincibleTimer -= delta;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.alpha = 1;
      }
    }

    // 更新击退计时
    if (this.isKnockedBack) {
      this.knockbackTimer -= delta;
      if (this.knockbackTimer <= 0) {
        this.isKnockedBack = false;
        this.setVelocity(0, 0);
      }
    }
  }

  isEntityInvincible(): boolean {
    return this.isInvincible;
  }

  isEntityKnockedBack(): boolean {
    return this.isKnockedBack;
  }
}
