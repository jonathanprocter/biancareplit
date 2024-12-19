export const singletonManager: SingletonManager;
export default singletonManager;
declare class SingletonManager {
    instances: Map<any, any>;
    getInstance(key: any, creator: any): any;
    hasInstance(key: any): boolean;
    clearInstance(key: any): void;
}
