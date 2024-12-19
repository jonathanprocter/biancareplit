export default EventEmitter;
export class EventEmitter {
    events: any;
    onceEvents: Map<any, any>;
    _maxListeners: number;
    _listenerCounts: Map<any, any>;
    _warnings: Set<any>;
    _debugMode: boolean;
    _handleConfigChange(config: any): void;
    _handleConfigError(error: any): void;
    setMaxListeners(n: any): this;
    getMaxListeners(): number;
    _addListener(eventMap: any, event: any, listener: any, prepend?: boolean): () => void;
    on(event: any, listener: any): () => void;
    off(event: any, listener: any): void;
    emit(event: any, ...args: any[]): boolean;
    once(event: any, listener: any): () => void;
    removeAllListeners(event: any): this;
    listenerCount(event: any): any;
    rawListeners(event: any): any[];
}
