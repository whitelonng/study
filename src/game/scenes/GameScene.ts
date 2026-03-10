/**
 * 主游戏场景
 * 负责游戏主循环、玩家控制、渲染
 */

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { InputManager } from '../systems/InputManager';
import { RoomManager } from '../systems/RoomManager';
import { CombatSystem } from '../systems/CombatSystem';
import { Minimap } from '../ui/Minimap';
import { DamageNumber } from '../ui/DamageNumber';
import { GameConfig } from '../config/GameConfig';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputManager!: InputManager;
  private roomManager!: RoomManager;
  private combatSystem!: CombatSystem;
  private minimap!: Minimap;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private debugText!: Phaser.GameObjects.Text;
  private roomInfoText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private messageText!: Phaser.GameObjects.Text;
  private debugEnabled: boolean = true;
  private aiDebugEnabled: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // 初始化战斗系统
    this.combatSystem = new CombatSystem(this);

    // 初始化房间管理器
    this.roomManager = new RoomManager(this);

    // 生成地牢
    this.roomManager.generateDungeon();

    // 创建玩家
    this.player = new Player(this, GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2);
    this.player.setActive(false);
    this.player.setVisible(false);

    // 初始化输入管理器
    this.inputManager = new InputManager(this);

    // 创建小地图
    this.minimap = new Minimap(this, {
      x: 16,
      y: 180,
      cellSize: 18,
    });

    // 监听事件
    this.setupEventListeners();

    // 创建 UI
    this.createUI();

    // 加载起始房间
    this.walls = this.roomManager.loadStartRoom(this.player);

    // 激活玩家
    this.player.setActive(true);
    this.player.setVisible(true);

    // 设置镜头跟随
    this.cameras.main.startFollow(
      this.player,
      true,
      GameConfig.MOVEMENT.CAMERA_LERP,
      GameConfig.MOVEMENT.CAMERA_LERP
    );

    // 更新小地图
    this.updateMinimap();

    // 显示操作提示
    this.showControlsHint();
  }

  private setupEventListeners(): void {
    // 监听 debug 开关
    this.events.on('toggle-debug', (enabled: boolean) => {
      this.debugEnabled = enabled;
      this.debugText.setVisible(enabled);
      this.roomInfoText.setVisible(enabled);
      if (enabled) {
        this.minimap.show();
      } else {
        this.minimap.hide();
      }
    });

    // 监听 AI debug 开关（F3）
    this.input.keyboard!.on('keydown-F3', () => {
      this.aiDebugEnabled = !this.aiDebugEnabled;
      const aiManager = this.roomManager.getEntityManager().getAIManager();
      aiManager.setDebugEnabled(this.aiDebugEnabled);
      this.showMessage(this.aiDebugEnabled ? 'AI Debug: ON' : 'AI Debug: OFF');
    });

    // 监听房间加载完成
    this.events.on('room-loaded', () => {
      this.updateRoomInfo();
      this.updateMinimap();
      this.updatePlayerColliders();
    });

    // 监听玩家攻击
    this.events.on(
      'player-attack',
      (attackData: { x: number; y: number; direction: Phaser.Math.Vector2; range: number; damage: number }) => {
        this.handlePlayerAttack(attackData);
      }
    );

    // 监听敌人攻击
    this.events.on(
      'enemy-attack',
      (data: { target: Player; damage: number; direction: Phaser.Math.Vector2 }) => {
        // 应用击退
        this.player.applyKnockback(data.direction, 200);

        // 显示伤害数字
        new DamageNumber(this, this.player.x, this.player.y - 30, data.damage, false);
      }
    );

    // 监听物品拾取
    this.events.on('item-collected', (result: { message: string; statChanges: { stat: string; value: number }[] }) => {
      this.showMessage(result.message);
    });

    // 监听 XP 更新
    this.events.on(
      'xp-updated',
      (data: { xp: number; level: number; xpToNextLevel: number }) => {
        this.updateXPBar(data);
        this.updateHPBar();
      }
    );

    // 监听升级
    this.events.on('player-levelup', (data: { level: number; stats: ReturnType<Player['getStats']> }) => {
      this.showMessage(`升级！等级 ${data.level}`);
      this.updateHPBar();

      // 升级特效
      this.showLevelUpEffect();
    });

    // 监听玩家受伤
    this.events.on('player-damaged', (data: { damage: number; hp: number; maxHp: number }) => {
      this.updateHPBar();

      // 屏幕抖动效果
      this.cameras.main.shake(100, 0.01);
    });

    // 监听玩家死亡
    this.events.on('player-death', () => {
      this.showMessage('你死了！按 F2 重新开始');
      this.showGameOver();
    });

    // 监听快速存档
    this.events.on('quick-save', () => {
      this.showMessage('存档成功！');
      console.log('[GameScene] Quick save triggered (TBD in M9)');
    });

    // 监听快速读档
    this.events.on('quick-load', () => {
      this.showMessage('读档成功！');
      console.log('[GameScene] Quick load triggered (TBD in M9)');
    });

    // 监听重新生成地牢
    this.events.on('regenerate-dungeon', () => {
      this.regenerateDungeon();
    });
  }

  private updatePlayerColliders(): void {
    const entityManager = this.roomManager.getEntityManager();
    const enemies = entityManager.getEnemies();

    // 设置敌人与世界碰撞
    enemies.forEach((enemy) => {
      this.physics.add.collider(enemy, this.walls);
    });
  }

  private handlePlayerAttack(attackData: {
    x: number;
    y: number;
    direction: Phaser.Math.Vector2;
    range: number;
    damage: number;
  }): void {
    const entityManager = this.roomManager.getEntityManager();
    const enemies = entityManager.getEnemies().filter((e) => e.active);

    // 使用战斗系统进行攻击判定
    const results = this.combatSystem.performSectorAttack(
      attackData.x,
      attackData.y,
      attackData.direction,
      attackData.range,
      Math.PI / 2, // 90度扇形
      attackData.damage,
      150, // 击退力
      this.player,
      enemies
    );

    // 处理命中结果
    results.forEach((result) => {
      if (result.hit) {
        console.log(`[Combat] Hit enemy for ${result.damage} damage${result.critical ? ' (CRITICAL!)' : ''}`);

        // 应用击退
        const enemy = result.target as Enemy;
        enemy.applyKnockback(attackData.direction, 150);
      }
    });
  }

  private showLevelUpEffect(): void {
    // 升级光效
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillCircle(this.player.x, this.player.y, 100);
    graphics.setDepth(50);

    this.tweens.add({
      targets: graphics,
      alpha: 0,
      scale: 2,
      duration: 500,
      onComplete: () => graphics.destroy(),
    });
  }

  private showGameOver(): void {
    // 游戏结束遮罩
    const overlay = this.add.rectangle(
      GameConfig.GAME_WIDTH / 2,
      GameConfig.GAME_HEIGHT / 2,
      GameConfig.GAME_WIDTH,
      GameConfig.GAME_HEIGHT,
      0x000000,
      0.7
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(300);

    // 游戏结束文字
    this.add
      .text(GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2 - 30, '游戏结束', {
        fontSize: '48px',
        color: '#ff4444',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(301);

    this.add
      .text(GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2 + 30, '按 F2 重新开始', {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(301);
  }

  private regenerateDungeon(): void {
    console.log('[GameScene] Regenerating dungeon...');

    // 清理战斗系统
    this.combatSystem.cleanup();

    // 重置 AI 调试
    this.aiDebugEnabled = false;

    // 清理当前房间
    this.player.setActive(false);
    this.player.setVisible(false);

    // 生成新地牢
    this.roomManager.generateDungeon();

    // 重置玩家
    this.player = new Player(this, GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2);
    this.player.setActive(false);
    this.player.setVisible(false);

    // 加载新起始房间
    this.walls = this.roomManager.loadStartRoom(this.player);

    // 激活玩家
    this.player.setActive(true);
    this.player.setVisible(true);

    // 重新设置镜头跟随
    this.cameras.main.startFollow(
      this.player,
      true,
      GameConfig.MOVEMENT.CAMERA_LERP,
      GameConfig.MOVEMENT.CAMERA_LERP
    );

    // 更新 UI
    this.updateRoomInfo();
    this.updateMinimap();
    this.updateHPBar();
    this.updateXPBar({ xp: 0, level: 1, xpToNextLevel: 100 });

    console.log(`[GameScene] New dungeon generated with seed: ${this.registry.get('gameSeed')}`);
  }

  private createUI(): void {
    // FPS 显示
    const fpsText = this.add
      .text(GameConfig.GAME_WIDTH - 16, 16, '', {
        fontSize: '12px',
        color: '#66ff66',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    // 调试信息文本
    this.debugText = this.add
      .text(16, 16, '', {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
        lineSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(100);

    // 房间信息文本
    this.roomInfoText = this.add
      .text(GameConfig.GAME_WIDTH - 16, 36, '', {
        fontSize: '12px',
        color: '#aaaaaa',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    // HP 条
    this.hpBar = this.add.graphics();
    this.hpBar.setScrollFactor(0);
    this.hpBar.setDepth(100);
    this.updateHPBar();

    // XP 条
    this.xpBar = this.add.graphics();
    this.xpBar.setScrollFactor(0);
    this.xpBar.setDepth(100);
    this.updateXPBar({ xp: 0, level: 1, xpToNextLevel: 100 });

    // 消息文本
    this.messageText = this.add
      .text(GameConfig.GAME_WIDTH / 2, 100, '', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);

    // Seed 信息
    const seed = this.registry.get('gameSeed');
    this.add
      .text(GameConfig.GAME_WIDTH - 16, 56, `Seed: ${seed}`, {
        fontSize: '11px',
        color: '#666666',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    // 更新循环
    this.events.on('update', () => {
      // 更新 FPS
      fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);

      // 更新调试信息
      if (this.debugEnabled && this.player && this.player.active) {
        const stats = this.player.getStats();
        this.debugText.setText(
          [
            `Pos: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`,
            `HP: ${stats.hp}/${stats.maxHp}`,
            `LV: ${this.player.getLevel()} XP: ${this.player.getXP()}/${this.player.getXPToNextLevel()}`,
            `ATK: ${stats.atk} | DEF: ${stats.def}`,
            `SPD: ${stats.spd}`,
          ].join('\n')
        );
      }
    });
  }

  private updateHPBar(): void {
    this.hpBar.clear();

    const x = 16;
    const y = GameConfig.GAME_HEIGHT - 60;
    const width = 200;
    const height = 16;

    const stats = this.player?.getStats();
    if (!stats) return;

    const hpPercent = stats.hp / stats.maxHp;

    // 背景
    this.hpBar.fillStyle(0x333333, 1);
    this.hpBar.fillRect(x, y, width, height);

    // HP 条
    const hpColor = hpPercent > 0.5 ? 0x44ff44 : hpPercent > 0.25 ? 0xffaa44 : 0xff4444;
    this.hpBar.fillStyle(hpColor, 1);
    this.hpBar.fillRect(x, y, width * hpPercent, height);

    // 边框
    this.hpBar.lineStyle(2, 0xffffff, 0.5);
    this.hpBar.strokeRect(x, y, width, height);
  }

  private updateXPBar(data: { xp: number; level: number; xpToNextLevel: number }): void {
    this.xpBar.clear();

    const x = 16;
    const y = GameConfig.GAME_HEIGHT - 40;
    const width = 200;
    const height = 10;

    const xpPercent = data.xp / data.xpToNextLevel;

    // 背景
    this.xpBar.fillStyle(0x333333, 1);
    this.xpBar.fillRect(x, y, width, height);

    // XP 条
    this.xpBar.fillStyle(0x44aaff, 1);
    this.xpBar.fillRect(x, y, width * xpPercent, height);

    // 边框
    this.xpBar.lineStyle(1, 0xffffff, 0.3);
    this.xpBar.strokeRect(x, y, width, height);
  }

  private showMessage(message: string): void {
    this.messageText.setText(message);
    this.messageText.setVisible(true);

    this.time.delayedCall(2000, () => {
      this.messageText.setVisible(false);
    });
  }

  private updateRoomInfo(): void {
    const room = this.roomManager.getCurrentRoom();
    const dungeon = this.roomManager.getDungeon();

    if (room && dungeon) {
      const entityManager = this.roomManager.getEntityManager();
      const doorCount = room.doors.length;
      const enemyCount = entityManager.getEnemies().filter((e) => e.active).length;
      const roomIndex = dungeon.rooms.findIndex((r) => r.id === room.id) + 1;
      const totalRooms = dungeon.rooms.length;

      this.roomInfoText.setText(
        [
          `Room: ${roomIndex}/${totalRooms}`,
          `Doors: ${doorCount}`,
          `Enemies: ${enemyCount}`,
        ].join(' | ')
      );
    }
  }

  private updateMinimap(): void {
    const rooms = Array.from(this.roomManager.getAllRooms().values());
    const currentRoomId = this.roomManager.getCurrentRoomId();
    this.minimap.update(rooms, currentRoomId);
  }

  private showControlsHint(): void {
    this.add
      .text(
        GameConfig.GAME_WIDTH / 2,
        GameConfig.GAME_HEIGHT - 16,
        'WASD: Move | Space: Attack | F1: Debug | F2: New | F3: AI Debug',
        {
          fontSize: '11px',
          color: '#666666',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
  }

  update(_time: number, delta: number): void {
    if (!this.player.active) return;

    // 处理移动输入
    const direction = this.inputManager.getMovementDirection();
    this.player.move(direction);

    // 处理攻击输入
    if (this.inputManager.isAttackPressed()) {
      this.player.attack();
    }

    // 更新玩家
    this.player.update(delta);

    // 更新实体
    const entityManager = this.roomManager.getEntityManager();
    entityManager.update(delta);

    // 更新 HP 条（实时）
    this.updateHPBar();
  }
}
