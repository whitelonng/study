/**
 * 敌人配置数据
 * 定义所有敌人类型的属性和行为
 */

export type EnemyType = 'SLIME' | 'SKELETON' | 'MAGE';

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  color: number;
  size: number;
  behavior: 'PATROL' | 'CHASE' | 'RANGED';
  sightRange: number;
  attackRange: number;
  attackCooldown: number;
  xpReward: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  SLIME: {
    type: 'SLIME',
    name: '史莱姆',
    hp: 30,
    atk: 5,
    def: 2,
    spd: 60,
    color: 0x44ff44,
    size: 24,
    behavior: 'PATROL',
    sightRange: 150,
    attackRange: 30,
    attackCooldown: 1000,
    xpReward: 10,
  },
  SKELETON: {
    type: 'SKELETON',
    name: '骷髅',
    hp: 50,
    atk: 12,
    def: 5,
    spd: 90,
    color: 0xccccaa,
    size: 28,
    behavior: 'CHASE',
    sightRange: 200,
    attackRange: 40,
    attackCooldown: 800,
    xpReward: 25,
  },
  MAGE: {
    type: 'MAGE',
    name: '法师',
    hp: 25,
    atk: 18,
    def: 3,
    spd: 70,
    color: 0xaa44ff,
    size: 26,
    behavior: 'RANGED',
    sightRange: 250,
    attackRange: 150,
    attackCooldown: 1500,
    xpReward: 30,
  },
};

export function getEnemyConfig(type: EnemyType): EnemyConfig {
  return ENEMY_CONFIGS[type];
}
