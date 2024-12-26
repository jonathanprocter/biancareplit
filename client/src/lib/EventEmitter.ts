type EventCallback<T> = (data: T) => void;

// Generic event map interface to constrain the Events type
interface EventMap {
  [K: string]: unknown;
}

export class EventEmitter<Events extends EventMap> {
  private events: Map<keyof Events, Set<EventCallback<Events[keyof Events]>>> = new Map();

  protected emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const callbacks = this.events.get(event);
    callbacks?.forEach((callback) => callback(data));
  }

  public on<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)?.add(callback);
  }

  public off<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): void {
    this.events.get(event)?.delete(callback);
    if (this.events.get(event)?.size === 0) {
      this.events.delete(event);
    }
  }

  public removeAllListeners(): void {
    this.events.clear();
  }
}
