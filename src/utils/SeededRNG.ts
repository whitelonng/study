/**
 * 带种子的随机数生成器
 * 使用 Mulberry32 算法，保证可复现性
 */

export class SeededRNG {
  private seed: number;
  private initialSeed: string;

  /**
   * 创建随机数生成器
   * @param seedString 种子字符串，会被转换为数字
   */
  constructor(seedString: string) {
    this.initialSeed = seedString;
    this.seed = this.hashString(seedString);
  }

  /**
   * 将字符串哈希为数字
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash) || 1;
  }

  /**
   * Mulberry32 算法
   * 返回 [0, 1) 之间的随机数
   */
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * 返回 [min, max] 之间的随机整数
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * 返回 [min, max] 之间的随机浮点数
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * 随机布尔值
   * @param probability 为 true 的概率（默认 0.5）
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * 从数组中随机选择一个元素
   */
  pick<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * 打乱数组（Fisher-Yates 洗牌算法）
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * 获取初始种子字符串
   */
  getInitialSeed(): string {
    return this.initialSeed;
  }

  /**
   * 获取当前内部状态（用于存档）
   */
  getState(): number {
    return this.seed;
  }

  /**
   * 设置内部状态（用于读档）
   */
  setState(state: number): void {
    this.seed = state;
  }
}

// 全局 RNG 实例
let globalRNG: SeededRNG | null = null;

export function initGlobalRNG(seed: string): SeededRNG {
  globalRNG = new SeededRNG(seed);
  return globalRNG;
}

export function getGlobalRNG(): SeededRNG {
  if (!globalRNG) {
    throw new Error('RNG not initialized. Call initGlobalRNG first.');
  }
  return globalRNG;
}

export function resetGlobalRNG(): void {
  globalRNG = null;
}
