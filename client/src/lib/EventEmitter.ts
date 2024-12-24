export class EventEmitter<T extends Record<string, any>> {
  private events: { [K in keyof T]?: Array<(data: T[K]) => void> } = {};

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event]?.push(callback);
    return () => this.off(event, callback);
  }

  off<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    if (!this.events[event]) return;
    const callbacks = this.events[event];
    if (callbacks) {
      this.events[event] = callbacks.filter((cb) => cb !== callback);
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const callbacks = this.events[event];
    if (!callbacks) return;

    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error in event handler for ${String(event)}:`, message);
      }
    });
  }

  removeAllListeners(event?: keyof T): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  getListenerCount(event: keyof T): number {
    return this.events[event]?.length || 0;
  }
}

export default EventEmitter;
