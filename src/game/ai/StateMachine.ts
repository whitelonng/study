/**
 * 状态机基类
 * 通用有限状态机实现
 */

export interface State<T> {
  name: string;
  onEnter?: (data?: unknown) => void;
  onUpdate?: (delta: number) => void;
  onExit?: () => void;
}

export class StateMachine<T extends string = string> {
  private states: Map<T, State<T>> = new Map();
  private currentState: State<T> | null = null;
  private currentStateName: T | null = null;
  private previousStateName: T | null = null;
  private owner: unknown;

  constructor(owner: unknown) {
    this.owner = owner;
  }

  addState(name: T, state: State<T>): void {
    this.states.set(name, { ...state, name });
  }

  setState(name: T, data?: unknown): void {
    const newState = this.states.get(name);
    if (!newState) {
      console.warn(`[StateMachine] State not found: ${name}`);
      return;
    }

    // 退出当前状态
    if (this.currentState && this.currentState.onExit) {
      this.currentState.onExit();
    }

    // 记录前一个状态
    this.previousStateName = this.currentStateName;

    // 进入新状态
    this.currentState = newState;
    this.currentStateName = name;

    if (newState.onEnter) {
      newState.onEnter(data);
    }
  }

  update(delta: number): void {
    if (this.currentState && this.currentState.onUpdate) {
      this.currentState.onUpdate(delta);
    }
  }

  getCurrentStateName(): T | null {
    return this.currentStateName;
  }

  getPreviousStateName(): T | null {
    return this.previousStateName;
  }

  isInState(name: T): boolean {
    return this.currentStateName === name;
  }

  getOwner(): unknown {
    return this.owner;
  }
}
