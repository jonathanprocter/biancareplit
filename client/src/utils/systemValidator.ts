import type { SystemCheck, ValidationResult } from '@/types/api';

export class SystemValidator {
  private static instance: SystemValidator;
  private checkRegistry: SystemCheck[] = [];

  private constructor() {
    this.initializeChecks();
  }

  static getInstance(): SystemValidator {
    if (!SystemValidator.instance) {
      SystemValidator.instance = new SystemValidator();
    }
    return SystemValidator.instance;
  }

  private initializeChecks() {
    // Component Dependencies Check
    this.registerCheck({
      name: 'Component Dependencies',
      check: async () => {
        try {
          // Import toast dynamically to check availability
          await import('@/components/ui/toast');
          return true;
        } catch {
          return false;
        }
      },
      critical: true,
    });

    // Data Layer Checks
    this.registerCheck({
      name: 'LocalStorage Access',
      check: async () => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return true;
        } catch {
          return false;
        }
      },
      critical: true,
    });

    // API Integration Checks
    this.registerCheck({
      name: 'API Connectivity',
      check: async () => {
        try {
          const response = await fetch('/api/health');
          return response.status === 200;
        } catch {
          return false;
        }
      },
      critical: true,
    });
  }

  registerCheck(check: SystemCheck): void {
    this.checkRegistry.push(check);
  }

  async validateSystem(): Promise<ValidationResult> {
    const failedChecks: string[] = [];
    const warnings: string[] = [];

    for (const check of this.checkRegistry) {
      try {
        const passed = await check.check();
        if (!passed) {
          if (check.critical) {
            failedChecks.push(check.name);
          } else {
            warnings.push(check.name);
          }
        }
      } catch (error) {
        if (check.critical) {
          failedChecks.push(check.name);
        } else {
          warnings.push(check.name);
        }
      }
    }

    return {
      success: failedChecks.length === 0,
      failedChecks,
      warnings,
    };
  }
}
