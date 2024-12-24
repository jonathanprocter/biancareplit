export class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Function) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((cb) => cb !== callback);
  }

  emit(event: string, data?: any) {
    if (!this.events[event]) return;

    this.events[event].forEach((callback) => {
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
        console.error(`Error in event handler for ${event}:`, error);
        // Log the error but continue execution for other handlers
      }
    });
  }

  removeAllListeners(event?: string) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  getListenerCount(event: string): number {
    return this.events[event]?.length || 0;
  }
}

export default EventEmitter;
