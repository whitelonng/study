/**
 * 输入管理器
 * 统一管理键盘输入，支持 WASD 和方向键
 */

import Phaser from 'phaser';
import { MoveDirection } from '../entities/Player';

export class InputManager {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private attackKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // 创建方向键
    this.cursors = scene.input.keyboard!.createCursorKeys();

    // 创建 WASD 键
    this.wasdKeys = {
      W: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // 攻击键（空格或 J）
    this.attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // 注册功能键
    this.registerFunctionKeys();
  }

  private registerFunctionKeys(): void {
    // F1: 开关 debug overlay
    this.scene.input.keyboard!.on('keydown-F1', () => {
      const debugEnabled = this.scene.registry.get('debugEnabled') ?? true;
      this.scene.registry.set('debugEnabled', !debugEnabled);
      this.scene.events.emit('toggle-debug', !debugEnabled);
    });

    // F2: 重新生成地牢（开发模式）
    if (import.meta.env.DEV) {
      this.scene.input.keyboard!.on('keydown-F2', () => {
        this.scene.events.emit('regenerate-dungeon');
      });
    }

    // F5: 快速存档
    this.scene.input.keyboard!.on('keydown-F5', (event: KeyboardEvent) => {
      event.preventDefault();
      this.scene.events.emit('quick-save');
    });

    // F9: 快速读档
    this.scene.input.keyboard!.on('keydown-F9', () => {
      this.scene.events.emit('quick-load');
    });
  }

  getMovementDirection(): MoveDirection {
    let x = 0;
    let y = 0;

    // WASD 输入
    if (this.wasdKeys.A.isDown || this.cursors.left.isDown) {
      x = -1;
    } else if (this.wasdKeys.D.isDown || this.cursors.right.isDown) {
      x = 1;
    }

    if (this.wasdKeys.W.isDown || this.cursors.up.isDown) {
      y = -1;
    } else if (this.wasdKeys.S.isDown || this.cursors.down.isDown) {
      y = 1;
    }

    return { x, y };
  }

  isAttackPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.attackKey);
  }

  destroy(): void {
    // 清理事件监听
    this.scene.input.keyboard!.off('keydown-F1');
    this.scene.input.keyboard!.off('keydown-F2');
    this.scene.input.keyboard!.off('keydown-F5');
    this.scene.input.keyboard!.off('keydown-F9');
  }
}
