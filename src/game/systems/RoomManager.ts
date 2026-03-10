/**
 * 房间管理器
 * 管理房间数据、切换、加载卸载
 */

import Phaser from 'phaser';
import { Door, DoorConfig } from '../entities/Door';
import { Player } from '../entities/Player';
import { EntityManager } from './EntityManager';
import { GameConfig } from '../config/GameConfig';
import { DungeonGenerator, GeneratedDungeon } from '../../procgen/DungeonGenerator';

export interface RoomData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  doors: DoorConfig[];
  obstacles: { x: number; y: number }[];
  enemies: { type: string; x: number; y: number }[];
  items: { type: string; x: number; y: number }[];
}

export interface RoomConnection {
  fromRoom: string;
  fromDoor: string;
  toRoom: string;
  toDoor: string;
}

export class RoomManager {
  private scene: Phaser.Scene;
  private rooms: Map<string, RoomData> = new Map();
  private currentRoomId: string = '';
  private doors: Door[] = [];
  private walls: Phaser.Physics.Arcade.StaticGroup | null = null;
  private isTransitioning: boolean = false;
  private dungeon: GeneratedDungeon | null = null;
  private startRoomId: string = '';
  private entityManager: EntityManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.entityManager = new EntityManager(scene);
  }

  /**
   * 生成新的地牢
   */
  generateDungeon(): void {
    const generator = new DungeonGenerator();
    this.dungeon = generator.generate();
    this.startRoomId = this.dungeon.startRoomId;

    // 更新房间映射
    this.rooms.clear();
    this.dungeon.rooms.forEach((room) => {
      this.rooms.set(room.id, room);
    });

    console.log(`[RoomManager] Generated dungeon with ${this.rooms.size} rooms`);
  }

  /**
   * 加载起始房间
   */
  loadStartRoom(player: Player): Phaser.Physics.Arcade.StaticGroup {
    return this.loadRoom(this.startRoomId, player);
  }

  /**
   * 获取地牢数据
   */
  getDungeon(): GeneratedDungeon | null {
    return this.dungeon;
  }

  /**
   * 获取实体管理器
   */
  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  /**
   * 加载房间
   */
  loadRoom(
    roomId: string,
    player: Player,
    entryDoorId?: string
  ): Phaser.Physics.Arcade.StaticGroup {
    const roomData = this.rooms.get(roomId);
    if (!roomData) {
      console.error(`[RoomManager] Room not found: ${roomId}`);
      return this.walls!;
    }

    console.log(`[RoomManager] Loading room: ${roomId}`);
    this.currentRoomId = roomId;

    // 清理旧内容
    this.cleanupRoom();

    // 创建墙壁组
    this.walls = this.scene.physics.add.staticGroup();

    // 创建边界墙壁
    this.createBoundaryWalls(roomData);

    // 加载房间内容（敌人/物品/障碍物），传入墙壁用于 AI
    this.entityManager.loadRoomContent(roomData, player, this.walls);

    // 创建门
    this.createDoors(roomData);

    // 设置玩家碰撞
    this.scene.physics.add.collider(player, this.walls);
    this.scene.physics.add.collider(player, this.entityManager.getObstacles());

    // 设置玩家与物品的碰撞（拾取）
    this.scene.physics.add.overlap(
      player,
      this.entityManager.getItems(),
      (playerObj, itemObj) => {
        this.onItemPickup(playerObj as Player, itemObj as import('../entities/Item').Item);
      }
    );

    // 设置玩家位置（如果从门进入）
    if (entryDoorId) {
      const entryDoor = this.doors.find((d) => d.getConfig().id === entryDoorId);
      if (entryDoor) {
        player.setPosition(entryDoor.x, entryDoor.y);
        // 禁用门一段时间，防止立即切换回去
        entryDoor.setActivationDelay(GameConfig.ROOM.DOOR_COOLDOWN);
      }
    } else {
      // 默认位置（房间中心）
      player.setPosition(
        roomData.x + roomData.width / 2,
        roomData.y + roomData.height / 2
      );
    }

    // 更新世界边界
    this.scene.physics.world.setBounds(
      roomData.x,
      roomData.y,
      roomData.width,
      roomData.height
    );
    this.scene.cameras.main.setBounds(
      roomData.x,
      roomData.y,
      roomData.width,
      roomData.height
    );

    // 发送房间加载事件
    this.scene.events.emit('room-loaded', roomData);

    return this.walls;
  }

  private onItemPickup(player: Player, item: import('../entities/Item').Item): void {
    if (!item.canCollect()) return;

    const stats = player.getStats();
    const result = item.collect(stats);

    if (result.success) {
      // 更新玩家属性
      player.setStats(stats);

      // 显示拾取消息
      this.scene.events.emit('item-collected', result);
    }
  }

  private createBoundaryWalls(room: RoomData): void {
    const tileSize = GameConfig.TILE_SIZE;

    // 顶部墙壁（留出门的位置）
    const northDoors = room.doors.filter((d) => d.direction === 'north');
    for (let x = room.x; x < room.x + room.width; x += tileSize) {
      const hasDoor = northDoors.some(
        (d) => Math.abs(x - (room.x + room.width / 2)) < tileSize * 2
      );
      if (!hasDoor) {
        this.walls!.create(x + tileSize / 2, room.y + tileSize / 2, 'wall');
      }
    }

    // 底部墙壁
    const southDoors = room.doors.filter((d) => d.direction === 'south');
    for (let x = room.x; x < room.x + room.width; x += tileSize) {
      const hasDoor = southDoors.some(
        (d) => Math.abs(x - (room.x + room.width / 2)) < tileSize * 2
      );
      if (!hasDoor) {
        this.walls!.create(
          x + tileSize / 2,
          room.y + room.height - tileSize / 2,
          'wall'
        );
      }
    }

    // 左侧墙壁
    const westDoors = room.doors.filter((d) => d.direction === 'west');
    for (let y = room.y + tileSize; y < room.y + room.height - tileSize; y += tileSize) {
      const hasDoor = westDoors.some(
        (d) => Math.abs(y - (room.y + room.height / 2)) < tileSize * 2
      );
      if (!hasDoor) {
        this.walls!.create(room.x + tileSize / 2, y + tileSize / 2, 'wall');
      }
    }

    // 右侧墙壁
    const eastDoors = room.doors.filter((d) => d.direction === 'east');
    for (let y = room.y + tileSize; y < room.y + room.height - tileSize; y += tileSize) {
      const hasDoor = eastDoors.some(
        (d) => Math.abs(y - (room.y + room.height / 2)) < tileSize * 2
      );
      if (!hasDoor) {
        this.walls!.create(
          room.x + room.width - tileSize / 2,
          y + tileSize / 2,
          'wall'
        );
      }
    }
  }

  private createDoors(room: RoomData): void {
    const tileSize = GameConfig.TILE_SIZE;
    this.doors = [];

    room.doors.forEach((doorConfig) => {
      let x: number, y: number;

      switch (doorConfig.direction) {
        case 'north':
          x = room.x + room.width / 2;
          y = room.y + tileSize / 2;
          break;
        case 'south':
          x = room.x + room.width / 2;
          y = room.y + room.height - tileSize / 2;
          break;
        case 'west':
          x = room.x + tileSize / 2;
          y = room.y + room.height / 2;
          break;
        case 'east':
          x = room.x + room.width - tileSize / 2;
          y = room.y + room.height / 2;
          break;
      }

      const door = new Door(this.scene, x, y, doorConfig);
      this.doors.push(door);
    });
  }

  private cleanupRoom(): void {
    // 清理实体
    this.entityManager.cleanup();

    // 销毁门
    this.doors.forEach((door) => door.destroy());
    this.doors = [];

    // 销毁墙壁
    if (this.walls) {
      this.walls.getChildren().forEach((child) => child.destroy());
      this.walls.clear(true, true);
    }
  }

  getCurrentRoom(): RoomData | undefined {
    return this.rooms.get(this.currentRoomId);
  }

  getCurrentRoomId(): string {
    return this.currentRoomId;
  }

  getAllRooms(): Map<string, RoomData> {
    return this.rooms;
  }

  getStartRoomId(): string {
    return this.startRoomId;
  }
}
