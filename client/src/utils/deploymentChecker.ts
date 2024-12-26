
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

    // Database Connection Check
    this.checks.push({
      name: 'Database Connection',
      check: async () => {
        try {
          const response = await fetch('/api/health/db');
          return response.status === 200;
        } catch {
          return false;
        }
      },
    });

    // Component Dependencies Check
    this.checks.push({
      name: 'Component Dependencies',
      check: async () => {
        try {
          const components = [
            import('@/components/ui/alert'),
            import('@/components/ui/button'),
            import('@/components/ui/card'),
          ];
          await Promise.all(components);
          return true;
        } catch (error) {
          console.error('Component dependency check failed:', error);
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
