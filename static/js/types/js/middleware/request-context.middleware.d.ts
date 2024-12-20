export default RequestContextMiddleware;
declare class RequestContextMiddleware {
  constructor(options?: {});
  options: {
    contextHeader: string;
    trackingEnabled: boolean;
  };
  contextStore: Map<any, any>;
  execute(context: any, next: any): Promise<any>;
  generateRequestId(): string;
  trackRequest(requestId: any, duration: any): void;
}
