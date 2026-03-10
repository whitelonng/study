/**
 * 游戏主类
 * 继承 Phaser.Game，封装游戏配置和生命周期
 */

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

export class Game extends Phaser.Game {
  constructor() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 960,
      height: 640,
      parent: 'game-container',
      backgroundColor: '#0f0f23',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [BootScene, GameScene],
      fps: {
        target: 60,
        forceSetTimeOut: false,
      },
      render: {
        pixelArt: true,
        antialias: false,
      },
    };

    super(config);
  }
}
