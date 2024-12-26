interface DeploymentCheck {
  name: string;
  check: () => Promise<boolean>;
}

export class DeploymentChecker {
  private checks: DeploymentCheck[] = [];

  constructor() {
    this.initializeChecks();
  }

  private initializeChecks() {
    // Environment Variables Check
    this.checks.push({
      name: 'Environment Variables',
      check: async () => {
        const requiredVars = ['DATABASE_URL'];
        return requiredVars.every(
          (varName) => typeof import.meta.env[`VITE_${varName}`] !== 'undefined',
        );
      },
    });

    // Component Dependencies Check
    this.checks.push({
      name: 'Component Dependencies',
      check: async () => {
        try {
          const requiredComponents = ['@/components/ui/toast', '@/components/ui/card'];
          for (const component of requiredComponents) {
            const imported = await import(/* @vite-ignore */ component);
            if (!imported) return false;
          }
          return true;
        } catch {
          return false;
        }
      },
    });

    // API Health Check
    this.checks.push({
      name: 'API Health',
      check: async () => {
        try {
          const response = await fetch('/api/health');
          return response.status === 200;
        } catch {
          return false;
        }
      },
    });
  }

  async verifyDeployment(): Promise<{
    ready: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    for (const check of this.checks) {
      try {
        const passed = await check.check();
        if (!passed) {
          issues.push(`${check.name} check failed`);
        }
      } catch (error) {
        issues.push(
          `${check.name} check failed with error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      ready: issues.length === 0,
      issues,
    };
  }
}