declare class StudyMaterialHandler {
    form: HTMLElement | null;
    resultDiv: HTMLElement | null;
    progressBar: Element | null;
    uploadProgress: Element | null;
    uploadStatus: Element | null;
    fileInput: Element | null;
    fileValidationMessage: HTMLElement | null;
    setupEventListeners(): void;
    validateFile(event: any): boolean;
    handleSubmit(event: any): Promise<void>;
    showLoading(): void;
    progressInterval: NodeJS.Timeout | null | undefined;
    hideLoading(): void;
    showSuccess(message: any): void;
    showError(message: any): void;
    showAnalysis(analysis: any): void;
    renderAnalysisSection(title: any, items: any): string;
    renderSuggestedQuestions(questions: any): string;
}
