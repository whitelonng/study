/**
 * 游戏全局配置
 * 集中管理所有游戏参数，避免 magic numbers
 */

export const GameConfig = {
  // 游戏尺寸
  GAME_WIDTH: 960,
  GAME_HEIGHT: 640,
  TILE_SIZE: 32,

  // 移动配置
  MOVEMENT: {
    CAMERA_LERP: 0.1,
    DIAGONAL_NORMALIZE: true,
  },

  // 玩家属性
  PLAYER: {
    HP: 100,
    ATK: 10,
    DEF: 5,
    SPD: 150,
    ATTACK_RANGE: 60,
    ATTACK_COOLDOWN: 500, // 毫秒
    INVINCIBLE_FRAMES: 60, // 无敌帧数
  },

  // 敌人属性
  ENEMIES: {
    SLIME: {
      HP: 30,
      ATK: 5,
      DEF: 2,
      SPD: 60,
      NAME: 'Slime',
    },
    SKELETON: {
      HP: 50,
      ATK: 12,
      DEF: 5,
      SPD: 90,
      NAME: 'Skeleton',
    },
    MAGE: {
      HP: 25,
      ATK: 18,
      DEF: 3,
      SPD: 70,
      NAME: 'Mage',
    },
  },

  // 房间配置
  ROOM: {
    PADDING: 32,
    WALL_THICKNESS: 32,
    DOOR_WIDTH: 64,
    TRANSITION_DURATION: 200, // 毫秒
    DOOR_COOLDOWN: 1000, // 门切换冷却
  },

  // 地牢生成参数
  DUNGEON: {
    MIN_ROOMS: 8,
    MAX_ROOMS: 15,
    BRANCH_RATIO: 0.3,
    ROOM_MIN_WIDTH: 320,
    ROOM_MAX_WIDTH: 640,
    ROOM_MIN_HEIGHT: 240,
    ROOM_MAX_HEIGHT: 480,
  },

  // 成长系统
  GROWTH: {
    XP_FORMULA: (level: number): number => Math.floor(100 * Math.pow(level, 1.5)),
    HP_PER_LEVEL: 10,
    ATK_PER_LEVEL: 1,
    DEF_PER_LEVEL: 1,
  },

  // 调试设置
  DEBUG: {
    SHOW_FPS: true,
    SHOW_HITBOXES: false,
    ENABLE_DEV_HOTKEYS: true,
  },
} as const;

export default GameConfig;
