/**
 * 物品配置数据
 * 定义所有物品类型的属性和效果
 */

export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type ItemType = 'CONSUMABLE' | 'WEAPON' | 'ARMOR' | 'ACCESSORY';
export type StatType = 'hp' | 'atk' | 'def' | 'spd';

export interface ItemStatBonus {
  stat: StatType;
  value: number;
}

export interface ItemConfig {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  statBonuses: ItemStatBonus[];
  color: number;
  stackable: boolean;
}

export const RARITY_COLORS: Record<ItemRarity, number> = {
  COMMON: 0xffffff,
  UNCOMMON: 0x44ff44,
  RARE: 0x4444ff,
  EPIC: 0xaa44ff,
  LEGENDARY: 0xffaa00,
};

export const ITEM_CONFIGS: Record<string, ItemConfig> = {
  HEALTH_POTION: {
    id: 'HEALTH_POTION',
    name: '生命药水',
    type: 'CONSUMABLE',
    rarity: 'COMMON',
    description: '恢复 30 点生命值',
    statBonuses: [{ stat: 'hp', value: 30 }],
    color: 0xff4444,
    stackable: true,
  },
  IRON_SWORD: {
    id: 'IRON_SWORD',
    name: '铁剑',
    type: 'WEAPON',
    rarity: 'UNCOMMON',
    description: '攻击力 +5',
    statBonuses: [{ stat: 'atk', value: 5 }],
    color: 0xaaaaaa,
    stackable: false,
  },
  STEEL_SHIELD: {
    id: 'STEEL_SHIELD',
    name: '钢盾',
    type: 'ARMOR',
    rarity: 'UNCOMMON',
    description: '防御力 +4',
    statBonuses: [{ stat: 'def', value: 4 }],
    color: 0x666688,
    stackable: false,
  },
  SWIFT_BOOTS: {
    id: 'SWIFT_BOOTS',
    name: '疾速之靴',
    type: 'ARMOR',
    rarity: 'RARE',
    description: '移动速度 +30',
    statBonuses: [{ stat: 'spd', value: 30 }],
    color: 0x44aaff,
    stackable: false,
  },
  BERSERKER_AXE: {
    id: 'BERSERKER_AXE',
    name: '狂战士之斧',
    type: 'WEAPON',
    rarity: 'RARE',
    description: '攻击力 +12, 防御力 -3',
    statBonuses: [
      { stat: 'atk', value: 12 },
      { stat: 'def', value: -3 },
    ],
    color: 0xff6644,
    stackable: false,
  },
};

export function getItemConfig(id: string): ItemConfig | undefined {
  return ITEM_CONFIGS[id];
}

export function getItemsByRarity(rarity: ItemRarity): ItemConfig[] {
  return Object.values(ITEM_CONFIGS).filter((item) => item.rarity === rarity);
}
