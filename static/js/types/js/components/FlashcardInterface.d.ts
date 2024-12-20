interface InitializationState {
  configLoaded: boolean;
  analyticsInitialized: boolean;
  studyMaterialInitialized: boolean;
}
declare class FlashcardSystem {
  private rootElement;
  private initialized;
  private analyticsReady;
  private initializationError;
  private initializationState;
  constructor(rootElement: HTMLElement);
  initialize(): Promise<FlashcardSystem>;
  private initializeConfiguration;
  private initializeComponents;
  private initializeAnalytics;
  private initializeStudyMaterialHandler;
  getInitializationState(): InitializationState & {
    initialized: boolean;
    error?: string;
  };
  getInitializationError(): Error | null;
}
export declare const FlashcardInterface: {
  instance: FlashcardSystem | null;
  instancePromise: Promise<FlashcardSystem> | null;
  create(rootElement: HTMLElement): Promise<FlashcardSystem>;
  initialize(rootElement: HTMLElement): Promise<FlashcardSystem>;
};
export default FlashcardInterface;
