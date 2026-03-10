/**
 * 游戏入口文件
 * 负责创建游戏实例并启动
 */

import { Game } from './game/Game';

// 从 URL 获取 seed 参数（用于可复现随机）
const urlParams = new URLSearchParams(window.location.search);
const seedParam = urlParams.get('seed');

// 如果 URL 有 seed 参数，存储到 window 对象供后续使用
if (seedParam) {
  (window as Window & { gameSeed?: string }).gameSeed = seedParam;
}

// 创建游戏实例
const game = new Game();

// 开发环境下暴露游戏实例到 window 对象
if (import.meta.env.DEV) {
  (window as Window & { game?: Game }).game = game;
}

export default game;
