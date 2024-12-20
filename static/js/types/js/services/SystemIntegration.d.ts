export default systemIntegration;
declare const systemIntegration: SystemIntegration;
/**
 * @class SystemIntegration
 * @extends EventEmitter
 * @description Main system integration class that manages all subsystems
 */
declare class SystemIntegration extends EventEmitter<[never]> {
  constructor();
  flashcardSystem: any;
  initialized: boolean;
  initializationErrors: any[];
  initialize(): Promise<
    | {
        success: boolean;
        status: string;
        error?: undefined;
      }
    | {
        success: boolean;
        error: any;
        status?: undefined;
      }
  >;
  saveStudyResult(data: any): Promise<any>;
  getSystemStatus(): {
    initialized: boolean;
    flashcardSystemReady: any;
    errors: any[];
    timestamp: string;
  };
}
import { EventEmitter } from 'events';
