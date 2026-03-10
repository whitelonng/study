/**
 * 战斗系统
 * 处理 hitbox/hurtbox、伤害计算、击退效果
 */

import Phaser from 'phaser';
import { Entity } from '../entities/Entity';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { DamageNumber } from '../ui/DamageNumber';

export interface HitboxConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  knockback?: number;
  owner: Entity;
  duration?: number;
}

export interface AttackResult {
  hit: boolean;
  damage: number;
  critical: boolean;
  target: Entity;
}

export class CombatSystem {
  private scene: Phaser.Scene;
  private damageNumbers: DamageNumber[] = [];
  private hitboxes: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 创建攻击 hitbox
   */
  createHitbox(config: HitboxConfig): Phaser.GameObjects.Rectangle {
    const hitbox = this.scene.add.rectangle(
      config.x,
      config.y,
      config.width,
      config.height,
      0xff0000,
      0
    );

    // 物理
    this.scene.physics.add.existing(hitbox, false);
    const body = hitbox.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    // 设置持续时间
    if (config.duration) {
      this.scene.time.delayedCall(config.duration, () => {
        hitbox.destroy();
      });
    }

    this.hitboxes.push(hitbox);
    return hitbox;
  }

  /**
   * 扇形攻击检测
   */
  performSectorAttack(
    originX: number,
    originY: number,
    direction: Phaser.Math.Vector2,
    range: number,
    arcAngle: number,
    damage: number,
    knockback: number,
    attacker: Entity,
    targets: Entity[]
  ): AttackResult[] {
    const results: AttackResult[] = [];
    const attackAngle = Math.atan2(direction.y, direction.x);

    targets.forEach((target) => {
      if (!target.active) return;

      const distance = Phaser.Math.Distance.Between(originX, originY, target.x, target.y);

      if (distance > range) return;

      const angleToTarget = Phaser.Math.Angle.Between(originX, originY, target.x, target.y);
      const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToTarget - attackAngle));

      if (angleDiff <= arcAngle / 2) {
        // 命中！
        const result = this.applyDamage(target, damage, attacker, knockback, direction);
        results.push(result);
      }
    });

    return results;
  }

  /**
   * 应用伤害
   */
  applyDamage(
    target: Entity,
    baseDamage: number,
    attacker: Entity,
    knockback: number = 0,
    direction?: Phaser.Math.Vector2
  ): AttackResult {
    // 计算实际伤害
    const targetStats = target.getStats();
    const attackerStats = attacker.getStats();
    const defense = targetStats.def;
    const actualDamage = Math.max(1, baseDamage - defense);

    // 暴击判定（10% 概率）
    const critical = Math.random() < 0.1;
    const finalDamage = critical ? Math.floor(actualDamage * 1.5) : actualDamage;

    // 应用伤害
    const success = target.takeDamage(finalDamage);

    if (success) {
      // 显示伤害数字
      this.showDamageNumber(target.x, target.y - 20, finalDamage, critical);

      // 击退效果
      if (knockback > 0) {
        const knockbackDir = direction || new Phaser.Math.Vector2(1, 0);
        this.applyKnockback(target, knockbackDir, knockback);
      }
    }

    return {
      hit: success,
      damage: finalDamage,
      critical,
      target,
    };
  }

  /**
   * 应用击退
   */
  applyKnockback(target: Entity, direction: Phaser.Math.Vector2, force: number): void {
    const normalizedDir = direction.clone().normalize();
    const body = target.body as Phaser.Physics.Arcade.Body;

    if (body) {
      body.setVelocity(normalizedDir.x * force, normalizedDir.y * force);

      // 短暂禁用移动
      target.setVelocity(normalizedDir.x * force, normalizedDir.y * force);

      // 击退结束后恢复
      this.scene.time.delayedCall(200, () => {
        if (target.active) {
          target.setVelocity(0, 0);
        }
      });
    }
  }

  /**
   * 显示伤害数字
   */
  private showDamageNumber(x: number, y: number, damage: number, critical: boolean): void {
    const damageNumber = new DamageNumber(this.scene, x, y, damage, critical);
    this.damageNumbers.push(damageNumber);
  }

  /**
   * 清理
   */
  cleanup(): void {
    this.damageNumbers.forEach((dn) => dn.destroy());
    this.damageNumbers = [];
    this.hitboxes.forEach((hb) => hb.destroy());
    this.hitboxes = [];
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.cleanup();
  }
}
