export const servicesContainer: ServicesContainer;
import { openAIService } from './OpenAIQuestionService';
import { aiCoachService } from './AICoachService';
declare class ServicesContainer {
  services: Map<any, any>;
  initialized: boolean;
  initializationPromise: Promise<boolean> | null;
  initialize(): Promise<boolean>;
  _initializeServices(): Promise<boolean>;
  _initializeCoreServices(): Promise<void>;
  _initializeSupportingServices(): Promise<void>;
  _setupGlobalAccess(): void;
  _handleError(error: any): void;
  _showErrorUI(error: any): void;
  getService(serviceName: any): any;
}
export { openAIService, aiCoachService };
