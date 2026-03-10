/**
 * 敌人 AI 实现
 * 使用状态机管理不同行为
 */

import Phaser from 'phaser';
import { StateMachine, State } from './StateMachine';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { getEnemyConfig, EnemyConfig } from '../data/EnemyData';

type EnemyAIState = 'IDLE' | 'PATROL' | 'CHASE' | 'ATTACK' | 'RETREAT' | 'STUNNED';

export interface AIContext {
  enemy: Enemy;
  player: Player | null;
  walls: Phaser.Physics.Arcade.StaticGroup | null;
  lastKnownPlayerPos: Phaser.Math.Vector2 | null;
  patrolIndex: number;
  patrolPoints: Phaser.Math.Vector2[];
  attackCooldown: number;
  stunnedDuration: number;
  alertLevel: number; // 0-1, 警觉等级
}

export class EnemyAI {
  private stateMachine: StateMachine<EnemyAIState>;
  private context: AIContext;
  private config: EnemyConfig;

  constructor(enemy: Enemy) {
    this.config = getEnemyConfig(enemy.getEnemyType());

    // 初始化上下文
    this.context = {
      enemy,
      player: null,
      walls: null,
      lastKnownPlayerPos: null,
      patrolIndex: 0,
      patrolPoints: [],
      attackCooldown: 0,
      stunnedDuration: 0,
      alertLevel: 0,
    };

    // 创建状态机
    this.stateMachine = new StateMachine<EnemyAIState>(this);

    // 注册状态
    this.registerStates();

    // 初始状态
    this.stateMachine.setState('IDLE');
  }

  private registerStates(): void {
    // 空闲状态
    this.stateMachine.addState('IDLE', {
      name: 'IDLE',
      onEnter: () => {
        this.context.enemy.setVelocity(0, 0);
      },
      onUpdate: (delta) => this.updateIdle(delta),
      onExit: () => {},
    });

    // 巡逻状态
    this.stateMachine.addState('PATROL', {
      name: 'PATROL',
      onEnter: () => {
        this.generatePatrolPoints();
      },
      onUpdate: (delta) => this.updatePatrol(delta),
      onExit: () => {},
    });

    // 追击状态
    this.stateMachine.addState('CHASE', {
      name: 'CHASE',
      onEnter: () => {
        this.context.alertLevel = 1;
      },
      onUpdate: (delta) => this.updateChase(delta),
      onExit: () => {},
    });

    // 攻击状态
    this.stateMachine.addState('ATTACK', {
      name: 'ATTACK',
      onEnter: () => this.performAttack(),
      onUpdate: (delta) => this.updateAttack(delta),
      onExit: () => {},
    });

    // 撤退状态（远程敌人专用）
    this.stateMachine.addState('RETREAT', {
      name: 'RETREAT',
      onUpdate: (delta) => this.updateRetreat(delta),
      onExit: () => {},
    });

    // 眩晕状态
    this.stateMachine.addState('STUNNED', {
      name: 'STUNNED',
      onEnter: () => {
        this.context.stunnedDuration = 500;
        this.context.enemy.setVelocity(0, 0);
      },
      onUpdate: (delta) => this.updateStunned(delta),
      onExit: () => {},
    });
  }

  setPlayer(player: Player): void {
    this.context.player = player;
  }

  setWalls(walls: Phaser.Physics.Arcade.StaticGroup): void {
    this.context.walls = walls;
  }

  private generatePatrolPoints(): void {
    const enemy = this.context.enemy;
    const startX = enemy.x;
    const startY = enemy.y;
    const range = 100;

    // 生成 2-3 个巡逻点
    const pointCount = 2 + Math.floor(Math.random() * 2);
    this.context.patrolPoints = [];

    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2;
      this.context.patrolPoints.push(
        new Phaser.Math.Vector2(
          startX + Math.cos(angle) * range,
          startY + Math.sin(angle) * range
        )
      );
    }

    this.context.patrolIndex = 0;
  }

  // === 状态更新方法 ===

  private updateIdle(_delta: number): void {
    // 检查是否看到玩家
    if (this.canSeePlayer()) {
      this.stateMachine.setState('CHASE');
      return;
    }

    // 随机开始巡逻
    if (Math.random() < 0.01) {
      this.stateMachine.setState('PATROL');
    }
  }

  private updatePatrol(_delta: number): void {
    const enemy = this.context.enemy;

    // 检查是否看到玩家
    if (this.canSeePlayer()) {
      this.stateMachine.setState('CHASE');
      return;
    }

    // 没有巡逻点则返回空闲
    if (this.context.patrolPoints.length === 0) {
      this.stateMachine.setState('IDLE');
      return;
    }

    const targetPoint = this.context.patrolPoints[this.context.patrolIndex];
    const distance = Phaser.Math.Distance.Between(
      enemy.x,
      enemy.y,
      targetPoint.x,
      targetPoint.y
    );

    if (distance < 10) {
      // 到达巡逻点，切换到下一个
      this.context.patrolIndex = (this.context.patrolIndex + 1) % this.context.patrolPoints.length;

      // 随机暂停
      if (Math.random() < 0.3) {
        this.stateMachine.setState('IDLE');
        return;
      }
    }

    // 移动到巡逻点（较慢速度）
    this.moveToward(targetPoint.x, targetPoint.y, this.config.spd * 0.5);
  }

  private updateChase(_delta: number): void {
    const enemy = this.context.enemy;
    const player = this.context.player;

    if (!player) {
      this.stateMachine.setState('PATROL');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      enemy.x,
      enemy.y,
      player.x,
      player.y
    );

    // 记录玩家最后位置
    this.context.lastKnownPlayerPos = new Phaser.Math.Vector2(player.x, player.y);

    // 检查是否可以攻击
    if (distance <= this.config.attackRange && this.context.attackCooldown <= 0) {
      this.stateMachine.setState('ATTACK');
      return;
    }

    // 远程敌人保持距离
    if (this.config.behavior === 'RANGED' && distance < this.config.attackRange * 0.5) {
      this.stateMachine.setState('RETREAT');
      return;
    }

    // 超出视野范围
    if (distance > this.config.sightRange * 1.5) {
      this.context.alertLevel -= 0.01;
      if (this.context.alertLevel <= 0) {
        this.stateMachine.setState('PATROL');
        return;
      }
    }

    // 追击玩家
    this.moveToward(player.x, player.y, this.config.spd);
  }

  private performAttack(): void {
    const enemy = this.context.enemy;
    const player = this.context.player;

    if (!player) return;

    // 停止移动
    enemy.setVelocity(0, 0);

    // 发送攻击事件
    const direction = new Phaser.Math.Vector2(
      player.x - enemy.x,
      player.y - enemy.y
    ).normalize();

    enemy.attackPlayer(this.config.atk, direction);

    // 设置冷却
    this.context.attackCooldown = this.config.attackCooldown;
  }

  private updateAttack(_delta: number): void {
    // 攻击后返回追击或巡逻
    if (this.context.attackCooldown <= 0) {
      if (this.canSeePlayer()) {
        this.stateMachine.setState('CHASE');
      } else {
        this.stateMachine.setState('PATROL');
      }
    }
  }

  private updateRetreat(_delta: number): void {
    const enemy = this.context.enemy;
    const player = this.context.player;

    if (!player) {
      this.stateMachine.setState('PATROL');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      enemy.x,
      enemy.y,
      player.x,
      player.y
    );

    // 达到理想距离后攻击
    if (distance >= this.config.attackRange * 0.7 && this.context.attackCooldown <= 0) {
      this.stateMachine.setState('ATTACK');
      return;
    }

    // 后退
    const direction = new Phaser.Math.Vector2(
      enemy.x - player.x,
      enemy.y - player.y
    ).normalize();
    enemy.setVelocity(
      direction.x * this.config.spd,
      direction.y * this.config.spd
    );
  }

  private updateStunned(delta: number): void {
    this.context.stunnedDuration -= delta;
    if (this.context.stunnedDuration <= 0) {
      this.stateMachine.setState('PATROL');
    }
  }

  // === 辅助方法 ===

  private canSeePlayer(): boolean {
    const enemy = this.context.enemy;
    const player = this.context.player;
    const walls = this.context.walls;

    if (!player) return false;

    const distance = Phaser.Math.Distance.Between(
      enemy.x,
      enemy.y,
      player.x,
      player.y
    );

    // 超出视野范围
    if (distance > this.config.sightRange) return false;

    // 检查是否有墙壁遮挡（简单射线检测）
    if (walls) {
      const ray = new Phaser.Math.Vector2(
        player.x - enemy.x,
        player.y - enemy.y
      ).normalize();

      const steps = Math.floor(distance / 16);
      for (let i = 1; i < steps; i++) {
        const checkX = enemy.x + ray.x * i * 16;
        const checkY = enemy.y + ray.y * i * 16;

        // 检查该点是否在墙壁内
        const wallBodies = walls.getChildren();
        for (const wall of wallBodies) {
          const wallSprite = wall as Phaser.GameObjects.Sprite;
          const bounds = wallSprite.getBounds();
          if (bounds.contains(checkX, checkY)) {
            return false; // 被墙壁遮挡
          }
        }
      }
    }

    return true;
  }

  private moveToward(targetX: number, targetY: number, speed: number): void {
    const enemy = this.context.enemy;
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
    enemy.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  // === 公共方法 ===

  update(delta: number): void {
    // 更新冷却
    if (this.context.attackCooldown > 0) {
      this.context.attackCooldown -= delta;
    }

    // 更新状态机
    this.stateMachine.update(delta);
  }

  stun(duration: number): void {
    this.context.stunnedDuration = duration;
    this.stateMachine.setState('STUNNED');
  }

  getCurrentStateName(): string {
    return this.stateMachine.getCurrentStateName() || 'UNKNOWN';
  }

  getContext(): AIContext {
    return this.context;
  }

  getDebugInfo(): {
    state: string;
    alertLevel: number;
    hasTarget: boolean;
    cooldown: number;
  } {
    return {
      state: this.getCurrentStateName(),
      alertLevel: this.context.alertLevel,
      hasTarget: this.context.player !== null,
      cooldown: this.context.attackCooldown,
    };
  }
}
