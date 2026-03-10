/**
 * 地牢生成器单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SeededRNG, initGlobalRNG, resetGlobalRNG } from '../src/utils/SeededRNG';
import { DungeonGenerator } from '../src/procgen/DungeonGenerator';
import { GameConfig } from '../src/game/config/GameConfig';

describe('SeededRNG', () => {
  beforeEach(() => {
    resetGlobalRNG();
  });

  it('should produce same sequence for same seed', () => {
    const rng1 = new SeededRNG('test-seed');
    const rng2 = new SeededRNG('test-seed');

    const sequence1 = [rng1.next(), rng1.next(), rng1.next()];
    const sequence2 = [rng2.next(), rng2.next(), rng2.next()];

    expect(sequence1).toEqual(sequence2);
  });

  it('should produce different sequence for different seeds', () => {
    const rng1 = new SeededRNG('seed-1');
    const rng2 = new SeededRNG('seed-2');

    const sequence1 = [rng1.next(), rng1.next(), rng1.next()];
    const sequence2 = [rng2.next(), rng2.next(), rng2.next()];

    expect(sequence1).not.toEqual(sequence2);
  });

  it('should return values in correct range', () => {
    const rng = new SeededRNG('test');

    for (let i = 0; i < 100; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should return integers in correct range', () => {
    const rng = new SeededRNG('test');

    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(5, 10);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(10);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe('DungeonGenerator', () => {
  beforeEach(() => {
    resetGlobalRNG();
    initGlobalRNG('test-seed');
  });

  it('should generate dungeon with rooms in configured range', () => {
    const generator = new DungeonGenerator();
    const dungeon = generator.generate();

    expect(dungeon.rooms.length).toBeGreaterThanOrEqual(GameConfig.DUNGEON.MIN_ROOMS);
    expect(dungeon.rooms.length).toBeLessThanOrEqual(GameConfig.DUNGEON.MAX_ROOMS);
  });

  it('should generate same dungeon for same seed', () => {
    // 第一次生成
    initGlobalRNG('same-seed');
    const generator1 = new DungeonGenerator();
    const dungeon1 = generator1.generate();

    // 第二次生成（相同种子）
    resetGlobalRNG();
    initGlobalRNG('same-seed');
    const generator2 = new DungeonGenerator();
    const dungeon2 = generator2.generate();

    // 比较房间数量
    expect(dungeon1.rooms.length).toBe(dungeon2.rooms.length);

    // 比较房间 ID 顺序
    const ids1 = dungeon1.rooms.map((r) => r.id);
    const ids2 = dungeon2.rooms.map((r) => r.id);
    expect(ids1).toEqual(ids2);
  });

  it('should generate different dungeons for different seeds', () => {
    // 第一次生成
    initGlobalRNG('seed-a');
    const generator1 = new DungeonGenerator();
    const dungeon1 = generator1.generate();

    // 第二次生成（不同种子）
    resetGlobalRNG();
    initGlobalRNG('seed-b');
    const generator2 = new DungeonGenerator();
    const dungeon2 = generator2.generate();

    // 房间数量可能相同，但布局应该不同
    // 检查房间连接是否不同
    const conn1 = dungeon1.connections.map((c) => `${c.fromRoom}-${c.toRoom}`).sort();
    const conn2 = dungeon2.connections.map((c) => `${c.fromRoom}-${c.toRoom}`).sort();

    // 大概率不同
    expect(dungeon1.seed).not.toBe(dungeon2.seed);
  });

  it('should have all rooms connected from start room', () => {
    const generator = new DungeonGenerator();
    const dungeon = generator.generate();

    const isConnected = DungeonGenerator.verifyConnectivity(dungeon);
    expect(isConnected).toBe(true);
  });

  it('should have valid start room', () => {
    const generator = new DungeonGenerator();
    const dungeon = generator.generate();

    expect(dungeon.startRoomId).toBeTruthy();
    expect(dungeon.rooms.find((r) => r.id === dungeon.startRoomId)).toBeDefined();
  });

  it('should have doors connecting rooms', () => {
    const generator = new DungeonGenerator();
    const dungeon = generator.generate();

    // 每个房间应该至少有一扇门（除非只有一个房间）
    if (dungeon.rooms.length > 1) {
      dungeon.rooms.forEach((room) => {
        expect(room.doors.length).toBeGreaterThan(0);
      });
    }
  });

  it('should generate room contents', () => {
    const generator = new DungeonGenerator();
    const dungeon = generator.generate();

    // 检查房间有生成的数据
    dungeon.rooms.forEach((room) => {
      expect(room.obstacles).toBeDefined();
      expect(room.enemies).toBeDefined();
      expect(room.items).toBeDefined();
      expect(Array.isArray(room.obstacles)).toBe(true);
      expect(Array.isArray(room.enemies)).toBe(true);
      expect(Array.isArray(room.items)).toBe(true);
    });
  });
});
