
type EventCallback<T> = (data: T) => void;

export class EventEmitter<Events extends Record<string, any>> {
  private events: Map<keyof Events, Set<EventCallback<Events[keyof Events]>>>;

  constructor() {
    this.events = new Map();
  }

  on<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)?.add(callback);
  }

  off<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): void {
    this.events.get(event)?.delete(callback);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.events.get(event)?.forEach(callback => callback(data));
  }
}
