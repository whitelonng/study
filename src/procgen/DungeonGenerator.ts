/**
 * 地牢生成器
 * 使用图结构生成连通的房间布局
 */

import { SeededRNG, getGlobalRNG } from '../utils/SeededRNG';
import { RoomData, RoomConnection } from '../game/systems/RoomManager';
import { GameConfig } from '../game/config/GameConfig';

export interface DungeonConfig {
  minRooms: number;
  maxRooms: number;
  branchRatio: number;
  roomMinWidth: number;
  roomMaxWidth: number;
  roomMinHeight: number;
  roomMaxHeight: number;
}

export interface GeneratedDungeon {
  rooms: RoomData[];
  connections: RoomConnection[];
  startRoomId: string;
  seed: string;
}

// 方向枚举
type Direction = 'north' | 'south' | 'east' | 'west';
const DIRECTIONS: Direction[] = ['north', 'south', 'east', 'west'];
const OPPOSITE: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

export class DungeonGenerator {
  private rng: SeededRNG;
  private config: DungeonConfig;
  private rooms: Map<string, RoomData> = new Map();
  private connections: RoomConnection[] = [];
  private roomGrid: Map<string, string> = new Map(); // "x,y" -> roomId
  private roomCounter: number = 0;

  constructor(config?: Partial<DungeonConfig>) {
    this.rng = getGlobalRNG();
    this.config = {
      minRooms: config?.minRooms ?? GameConfig.DUNGEON.MIN_ROOMS,
      maxRooms: config?.maxRooms ?? GameConfig.DUNGEON.MAX_ROOMS,
      branchRatio: config?.branchRatio ?? GameConfig.DUNGEON.BRANCH_RATIO,
      roomMinWidth: config?.roomMinWidth ?? GameConfig.DUNGEON.ROOM_MIN_WIDTH,
      roomMaxWidth: config?.roomMaxWidth ?? GameConfig.DUNGEON.ROOM_MAX_WIDTH,
      roomMinHeight: config?.roomMinHeight ?? GameConfig.DUNGEON.ROOM_MIN_HEIGHT,
      roomMaxHeight: config?.roomMaxHeight ?? GameConfig.DUNGEON.ROOM_MAX_HEIGHT,
    };
  }

  /**
   * 生成地牢
   */
  generate(): GeneratedDungeon {
    // 重置状态
    this.rooms.clear();
    this.connections = [];
    this.roomGrid.clear();
    this.roomCounter = 0;

    // 确定房间数量
    const roomCount = this.rng.nextInt(this.config.minRooms, this.config.maxRooms);

    // 创建起始房间
    const startRoom = this.createRoom(0, 0);
    this.rooms.set(startRoom.id, startRoom);
    this.roomGrid.set('0,0', startRoom.id);

    // 使用 BFS 扩展生成房间
    const queue: { roomId: string; gridX: number; gridY: number }[] = [
      { roomId: startRoom.id, gridX: 0, gridY: 0 },
    ];
    const visited = new Set<string>();

    while (this.rooms.size < roomCount && queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.roomId)) continue;
      visited.add(current.roomId);

      // 确定此房间需要的连接数
      const remainingRooms = roomCount - this.rooms.size;
      const maxConnections = Math.min(remainingRooms, 3);
      const minConnections = this.rooms.size < roomCount ? 1 : 0;
      const connectionCount = this.rng.nextInt(minConnections, maxConnections);

      // 随机选择方向
      const shuffledDirs = this.rng.shuffle([...DIRECTIONS]);
      let connectionsMade = 0;

      for (const dir of shuffledDirs) {
        if (connectionsMade >= connectionCount) break;
        if (this.rooms.size >= roomCount) break;

        const [newGridX, newGridY] = this.getGridPosition(current.gridX, current.gridY, dir);
        const gridKey = `${newGridX},${newGridY}`;

        // 检查是否已有房间
        if (this.roomGrid.has(gridKey)) {
          // 连接到已有房间（如果还没连接）
          const existingRoomId = this.roomGrid.get(gridKey)!;
          if (!this.areRoomsConnected(current.roomId, existingRoomId)) {
            this.connectRooms(current.roomId, existingRoomId, dir);
          }
          continue;
        }

        // 创建新房间
        const newRoom = this.createRoom(newGridX, newGridY);
        this.rooms.set(newRoom.id, newRoom);
        this.roomGrid.set(gridKey, newRoom.id);

        // 连接房间
        this.connectRooms(current.roomId, newRoom.id, dir);

        // 加入队列
        queue.push({ roomId: newRoom.id, gridX: newGridX, gridY: newGridY });

        connectionsMade++;
      }
    }

    // 确保连通性：添加额外连接（分支）
    this.addBranchConnections();

    // 为每个房间的门排序
    this.finalizeRoomDoors();

    // 生成房间内容
    this.generateRoomContents();

    return {
      rooms: Array.from(this.rooms.values()),
      connections: this.connections,
      startRoomId: startRoom.id,
      seed: this.rng.getInitialSeed(),
    };
  }

  private createRoom(gridX: number, gridY: number): RoomData {
    this.roomCounter++;
    const roomId = `room_${this.roomCounter}`;

    // 房间尺寸使用固定值（简化显示）
    const width = GameConfig.GAME_WIDTH - 64;
    const height = GameConfig.GAME_HEIGHT - 64;

    return {
      id: roomId,
      x: 32,
      y: 32,
      width,
      height,
      gridX,
      gridY,
      doors: [],
      obstacles: [],
      enemies: [],
      items: [],
    } as RoomData & { gridX: number; gridY: number };
  }

  private getGridPosition(x: number, y: number, dir: Direction): [number, number] {
    switch (dir) {
      case 'north':
        return [x, y - 1];
      case 'south':
        return [x, y + 1];
      case 'east':
        return [x + 1, y];
      case 'west':
        return [x - 1, y];
    }
  }

  private connectRooms(room1Id: string, room2Id: string, direction: Direction): void {
    const room1 = this.rooms.get(room1Id)!;
    const room2 = this.rooms.get(room2Id)!;

    // 添加门到房间
    const door1Id = `door_${room1Id}_${direction}`;
    const door2Id = `door_${room2Id}_${OPPOSITE[direction]}`;

    room1.doors.push({
      id: door1Id,
      targetRoomId: room2Id,
      targetDoorId: door2Id,
      direction,
    });

    room2.doors.push({
      id: door2Id,
      targetRoomId: room1Id,
      targetDoorId: door1Id,
      direction: OPPOSITE[direction],
    });

    // 记录连接
    this.connections.push({
      fromRoom: room1Id,
      fromDoor: door1Id,
      toRoom: room2Id,
      toDoor: door2Id,
    });
  }

  private areRoomsConnected(room1Id: string, room2Id: string): boolean {
    return this.connections.some(
      (c) =>
        (c.fromRoom === room1Id && c.toRoom === room2Id) ||
        (c.fromRoom === room2Id && c.toRoom === room1Id)
    );
  }

  private addBranchConnections(): void {
    const branchCount = Math.floor(this.rooms.size * this.config.branchRatio);
    const roomIds = Array.from(this.rooms.keys());
    let added = 0;

    // 尝试添加额外的连接（创建循环/分支）
    for (let i = 0; i < branchCount * 3 && added < branchCount; i++) {
      const room1 = this.rooms.get(this.rng.pick(roomIds))!;
      const room1Data = room1 as RoomData & { gridX: number; gridY: number };

      const dir = this.rng.pick(DIRECTIONS);
      const [newGridX, newGridY] = this.getGridPosition(
        room1Data.gridX,
        room1Data.gridY,
        dir
      );
      const gridKey = `${newGridX},${newGridY}`;

      const room2Id = this.roomGrid.get(gridKey);
      if (room2Id && !this.areRoomsConnected(room1.id, room2Id)) {
        this.connectRooms(room1.id, room2Id, dir);
        added++;
      }
    }
  }

  private finalizeRoomDoors(): void {
    // 移除重复的门
    this.rooms.forEach((room) => {
      const seenDirs = new Set<Direction>();
      room.doors = room.doors.filter((door) => {
        if (seenDirs.has(door.direction)) return false;
        seenDirs.add(door.direction);
        return true;
      });
    });
  }

  private generateRoomContents(): void {
    this.rooms.forEach((room) => {
      // 生成障碍物
      const obstacleCount = this.rng.nextInt(0, 4);
      for (let i = 0; i < obstacleCount; i++) {
        room.obstacles.push({
          x: this.rng.nextInt(100, room.width - 100),
          y: this.rng.nextInt(100, room.height - 100),
        });
      }

      // 生成敌人（非起始房间）
      if (room.id !== 'room_1') {
        const enemyCount = this.rng.nextInt(1, 3);
        for (let i = 0; i < enemyCount; i++) {
          const types = ['SLIME', 'SKELETON', 'MAGE'] as const;
          room.enemies.push({
            type: this.rng.pick(types),
            x: this.rng.nextInt(100, room.width - 100),
            y: this.rng.nextInt(100, room.height - 100),
          });
        }
      }

      // 生成物品（稀有）
      if (this.rng.nextBool(0.3)) {
        const itemTypes = ['HEALTH_POTION', 'IRON_SWORD', 'STEEL_SHIELD'] as const;
        room.items.push({
          type: this.rng.pick(itemTypes),
          x: this.rng.nextInt(100, room.width - 100),
          y: this.rng.nextInt(100, room.height - 100),
        });
      }
    });
  }

  /**
   * 验证连通性（BFS）
   */
  static verifyConnectivity(dungeon: GeneratedDungeon): boolean {
    if (dungeon.rooms.length === 0) return true;

    const visited = new Set<string>();
    const queue = [dungeon.startRoomId];
    const adjacency = new Map<string, Set<string>>();

    // 构建邻接表
    dungeon.rooms.forEach((room) => {
      adjacency.set(room.id, new Set());
    });
    dungeon.connections.forEach((conn) => {
      adjacency.get(conn.fromRoom)!.add(conn.toRoom);
      adjacency.get(conn.toRoom)!.add(conn.fromRoom);
    });

    // BFS
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = adjacency.get(current);
      if (neighbors) {
        neighbors.forEach((neighbor) => {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        });
      }
    }

    return visited.size === dungeon.rooms.length;
  }
}
