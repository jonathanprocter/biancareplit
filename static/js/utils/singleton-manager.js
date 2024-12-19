// Singleton manager to prevent multiple initializations
class SingletonManager {
  constructor() {
    this.instances = new Map();
  }

  getInstance(key, creator) {
    if (!this.instances.has(key)) {
      this.instances.set(key, creator());
    }
    return this.instances.get(key);
  }

  hasInstance(key) {
    return this.instances.has(key);
  }

  clearInstance(key) {
    this.instances.delete(key);
  }
}

export const singletonManager = new SingletonManager();
export default singletonManager;
