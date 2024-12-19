/**
 * Configuration management for the frontend application
 */
class ConfigManager {
    constructor() {
        this.config = {
            middleware: {
                maxRetries: 3,
                retryDelay: 1000,
                timeout: 5000,
                logging: {
                    enabled: true,
                    level: 'info'
                },
                errorHandling: {
                    enabled: true,
                    retryOnError: true
                },
                performance: {
                    tracking: true,
                    warningThreshold: 2000,
                    criticalThreshold: 5000
                }
            }
        };
    }

    getConfig() {
        return this.config;
    }

    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

export const configManager = new ConfigManager();
export default configManager;
