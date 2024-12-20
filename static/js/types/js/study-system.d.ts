export default FlashcardSystem;
/**
 * @class FlashcardSystem
 * @extends EventEmitter
 * @description Core system for managing flashcard functionality
 */
declare class FlashcardSystem extends EventEmitter<[never]> {
  static getInstance(): any;
  constructor();
  cards: any[];
  currentIndex: number;
  analytics: any;
  initialized: boolean;
  initializationErrors: any[];
  addCard(
    front: any,
    back: any,
    metadata?: {}
  ): Promise<
    | {
        success: boolean;
        card: {
          id: number;
          front: any;
          back: any;
          metadata: {};
          lastReviewed: null;
          created: string;
        };
        error?: undefined;
      }
    | {
        success: boolean;
        error: any;
        card?: undefined;
      }
  >;
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
  initializeAnalytics(): Promise<boolean>;
  handleResult(result: any): Promise<
    | {
        success: boolean;
        data: any;
        error?: undefined;
      }
    | {
        success: boolean;
        error: any;
        data?: undefined;
      }
  >;
  getSystemStatus(): {
    initialized: boolean;
    cardsCount: number;
    errors: any[];
    timestamp: string;
  };
}
import { EventEmitter } from 'events';
