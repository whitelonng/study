/**
 * 小地图组件
 * 显示地牢布局和当前位置
 */

import Phaser from 'phaser';
import { RoomData } from '../systems/RoomManager';

interface MinimapConfig {
  x: number;
  y: number;
  cellSize: number;
  padding: number;
}

export class Minimap {
  private scene: Phaser.Scene;
  private config: MinimapConfig;
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private roomCells: Map<string, Phaser.GameObjects.Container> = new Map();
  private currentRoomId: string = '';
  private visible: boolean = true;

  constructor(scene: Phaser.Scene, config?: Partial<MinimapConfig>) {
    this.scene = scene;

    this.config = {
      x: config?.x ?? 16,
      y: config?.y ?? 150,
      cellSize: config?.cellSize ?? 20,
      padding: config?.padding ?? 8,
    };

    // 创建容器
    this.container = scene.add.container(this.config.x, this.config.y);
    this.container.setScrollFactor(0);
    this.container.setDepth(200);

    // 创建背景
    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);
  }

  /**
   * 更新小地图显示
   */
  update(rooms: RoomData[], currentRoomId: string): void {
    this.currentRoomId = currentRoomId;

    // 清除旧内容
    this.graphics.clear();
    this.roomCells.forEach((cell) => cell.destroy());
    this.roomCells.clear();

    if (rooms.length === 0) return;

    // 计算房间网格位置
    const roomPositions = this.calculateRoomPositions(rooms);

    // 绘制背景
    this.drawBackground(roomPositions);

    // 绘制房间
    rooms.forEach((room) => {
      const pos = roomPositions.get(room.id);
      if (pos) {
        this.drawRoom(room, pos);
      }
    });

    // 绘制连接线
    this.drawConnections(rooms, roomPositions);
  }

  private calculateRoomPositions(
    rooms: RoomData[]
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    // 从房间数据获取网格位置
    rooms.forEach((room) => {
      const extendedRoom = room as RoomData & { gridX?: number; gridY?: number };
      if (extendedRoom.gridX !== undefined && extendedRoom.gridY !== undefined) {
        positions.set(room.id, {
          x: extendedRoom.gridX,
          y: extendedRoom.gridY,
        });
      } else {
        // 如果没有网格位置，使用默认值
        positions.set(room.id, { x: 0, y: 0 });
      }
    });

    return positions;
  }

  private drawBackground(positions: Map<string, { x: number; y: number }>): void {
    if (positions.size === 0) return;

    // 计算边界
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    positions.forEach((pos) => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    });

    const width = (maxX - minX + 1) * this.config.cellSize + this.config.padding * 2;
    const height = (maxY - minY + 1) * this.config.cellSize + this.config.padding * 2;

    // 绘制半透明背景
    this.graphics.fillStyle(0x000000, 0.7);
    this.graphics.fillRoundedRect(
      -this.config.padding,
      -this.config.padding,
      width,
      height,
      4
    );
  }

  private drawRoom(room: RoomData, pos: { x: number; y: number }): void {
    const cellX = pos.x * this.config.cellSize;
    const cellY = pos.y * this.config.cellSize;
    const size = this.config.cellSize - 4;

    const isCurrentRoom = room.id === this.currentRoomId;

    // 绘制房间方块
    const graphics = this.scene.add.graphics();

    // 背景
    graphics.fillStyle(isCurrentRoom ? 0x66ff66 : 0x444466, 1);
    graphics.fillRoundedRect(cellX - size / 2, cellY - size / 2, size, size, 2);

    // 边框
    graphics.lineStyle(1, isCurrentRoom ? 0x88ff88 : 0x666688);
    graphics.strokeRoundedRect(cellX - size / 2, cellY - size / 2, size, size, 2);

    // 起始房间标记
    if (room.id === 'room_1') {
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(cellX, cellY, 3);
    }

    this.container.add(graphics);
    this.roomCells.set(room.id, this.scene.add.container(0, 0).add(graphics));
  }

  private drawConnections(
    rooms: RoomData[],
    positions: Map<string, { x: number; y: number }>
  ): void {
    const connectionGraphics = this.scene.add.graphics();
    connectionGraphics.lineStyle(2, 0x666688);

    const drawnConnections = new Set<string>();

    rooms.forEach((room) => {
      const pos1 = positions.get(room.id);
      if (!pos1) return;

      room.doors.forEach((door) => {
        const connectionKey = [room.id, door.targetRoomId].sort().join('-');
        if (drawnConnections.has(connectionKey)) return;
        drawnConnections.add(connectionKey);

        const pos2 = positions.get(door.targetRoomId);
        if (!pos2) return;

        connectionGraphics.beginPath();
        connectionGraphics.moveTo(
          pos1.x * this.config.cellSize,
          pos1.y * this.config.cellSize
        );
        connectionGraphics.lineTo(
          pos2.x * this.config.cellSize,
          pos2.y * this.config.cellSize
        );
        connectionGraphics.strokePath();
      });
    });

    this.container.add(connectionGraphics);
  }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
