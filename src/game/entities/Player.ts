/**
 * 玩家实体类
 * 处理玩家移动、动画、状态
 */

import Phaser from 'phaser';
import { Entity, EntityStats } from './Entity';
import { GameConfig } from '../config/GameConfig';

export type MoveDirection = {
  x: number;
  y: number;
};

export class Player extends Entity {
  private velocity: Phaser.Math.Vector2;
  private attackCooldown: number = 0;
  private isAttacking: boolean = false;
  private lastMoveDirection: Phaser.Math.Vector2;
  private xp: number = 0;
  private level: number = 1;
  private xpToNextLevel: number = 100;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    // 设置玩家特有属性
    this.stats = {
      hp: GameConfig.PLAYER.HP,
      maxHp: GameConfig.PLAYER.HP,
      atk: GameConfig.PLAYER.ATK,
      def: GameConfig.PLAYER.DEF,
      spd: GameConfig.PLAYER.SPD,
    };

    // 初始化速度向量
    this.velocity = new Phaser.Math.Vector2(0, 0);
    this.lastMoveDirection = new Phaser.Math.Vector2(1, 0);

    // 设置深度（玩家在其他对象之上）
    this.setDepth(10);
  }

  move(direction: MoveDirection): void {
    // 被击退时不允许移动
    if (this.isEntityKnockedBack()) return;

    // 归一化方向向量，防止斜向移动速度过快
    if (direction.x !== 0 || direction.y !== 0) {
      const normalized = new Phaser.Math.Vector2(direction.x, direction.y).normalize();
      this.velocity.x = normalized.x * this.stats.spd;
      this.velocity.y = normalized.y * this.stats.spd;

      // 记录移动方向
      this.lastMoveDirection.copy(normalized);
    } else {
      this.velocity.x = 0;
      this.velocity.y = 0;
    }

    // 设置物理速度
    this.setVelocity(this.velocity.x, this.velocity.y);
  }

  attack(): void {
    if (this.attackCooldown > 0 || this.isAttacking || this.isEntityKnockedBack()) {
      return;
    }

    this.isAttacking = true;
    this.attackCooldown = GameConfig.PLAYER.ATTACK_COOLDOWN;

    // 创建攻击视觉效果（扇形区域）
    this.showAttackEffect();

    // 攻击冷却
    this.scene.time.delayedCall(200, () => {
      this.isAttacking = false;
    });
  }

  private showAttackEffect(): void {
    // 使用最后的移动方向
    const direction = this.lastMoveDirection.clone();

    // 创建攻击范围图形
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff, 0.3);

    // 绘制扇形攻击范围
    const range = GameConfig.PLAYER.ATTACK_RANGE;
    const startAngle = Math.atan2(direction.y, direction.x) - Math.PI / 4;
    const endAngle = startAngle + Math.PI / 2;

    graphics.beginPath();
    graphics.moveTo(this.x, this.y);
    graphics.arc(this.x, this.y, range, startAngle, endAngle);
    graphics.closePath();
    graphics.fillPath();

    // 淡出并销毁
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 200,
      onComplete: () => graphics.destroy(),
    });

    // 发送攻击事件，让场景处理伤害
    this.scene.events.emit('player-attack', {
      x: this.x,
      y: this.y,
      direction,
      range,
      damage: this.stats.atk,
    });
  }

  /**
   * 添加经验值
   */
  addXP(amount: number): void {
    this.xp += amount;
    console.log(`[Player] Gained ${amount} XP, total: ${this.xp}/${this.xpToNextLevel}`);

    while (this.xp >= this.xpToNextLevel) {
      this.levelUp();
    }

    // 发送 XP 更新事件
    this.scene.events.emit('xp-updated', {
      xp: this.xp,
      level: this.level,
      xpToNextLevel: this.xpToNextLevel,
    });
  }

  private levelUp(): void {
    this.xp -= this.xpToNextLevel;
    this.level++;

    // 属性成长
    this.stats.maxHp += GameConfig.GROWTH.HP_PER_LEVEL;
    this.stats.hp = this.stats.maxHp;
    this.stats.atk += GameConfig.GROWTH.ATK_PER_LEVEL;
    this.stats.def += GameConfig.GROWTH.DEF_PER_LEVEL;

    // 计算下一级所需经验
    this.xpToNextLevel = GameConfig.GROWTH.XP_FORMULA(this.level);

    console.log(`[Player] Level up! Now level ${this.level}`);

    // 发送升级事件
    this.scene.events.emit('player-levelup', {
      level: this.level,
      stats: this.stats,
    });
  }

  override takeDamage(amount: number): boolean {
    const success = super.takeDamage(amount);

    if (success) {
      // 发送玩家受伤事件
      this.scene.events.emit('player-damaged', {
        damage: amount,
        hp: this.stats.hp,
        maxHp: this.stats.maxHp,
      });
    }

    return success;
  }

  getXP(): number {
    return this.xp;
  }

  getLevel(): number {
    return this.level;
  }

  getXPToNextLevel(): number {
    return this.xpToNextLevel;
  }

  getLastMoveDirection(): Phaser.Math.Vector2 {
    return this.lastMoveDirection.clone();
  }

  override update(delta: number): void {
    super.update(delta);

    // 更新攻击冷却
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
  }

  getAttackCooldown(): number {
    return Math.max(0, this.attackCooldown);
  }

  getIsAttacking(): boolean {
    return this.isAttacking;
  }

  override onDeath(): void {
    console.log('[Player] Player died!');
    this.scene.events.emit('player-death');
  }
}
