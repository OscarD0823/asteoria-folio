/**
 * Base PDF Processor
 * Requirements: 5.1
 * 
 * Abstract base class for all PDF processors.
 * Provides common functionality for validation, progress tracking, and cancellation.
 */

import type {
  PDFProcessor,
  ProcessInput,
  ProcessOutput,
  ValidationResult,
  ProgressCallback,
  PDFError,
} from '@/types/pdf';
import { PDFErrorCode, ErrorCategory, ERROR_CODE_CATEGORY } from '@/types/pdf';
import { validateFile, validatePdfStructure } from './validation';

/**
 * Abstract base class for PDF processors
 */
export abstract class BasePDFProcessor implements PDFProcessor {
  protected progress: number = 0;
  protected cancelled: boolean = false;
  protected onProgress?: ProgressCallback;

  /**
   * Process the input files - must be implemented by subclasses
   */
  abstract process(input: ProcessInput, onProgress?: ProgressCallback): Promise<ProcessOutput>;

  /**
   * Validate input files before processing
   */
  async validate(files: File[]): Promise<ValidationResult> {
    const errors: PDFError[] = [];

    for (const file of files) {
      // Basic file validation
      const fileValidation = validateFile(file, {
        maxSize: this.getMaxFileSize(),
        acceptedTypes: this.getAcceptedTypes(),
      });

      if (!fileValidation.valid) {
        errors.push(...fileValidation.errors);
        continue;
      }

      // PDF structure validation for PDF files
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const structureValidation = await validatePdfStructure(file);
        if (!structureValidation.valid) {
          errors.push(...structureValidation.errors);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get current processing progress (0-100)
   */
  getProgress(): number {
    return this.progress;
  }

  /**
   * Cancel ongoing processing
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Reset processor state
   */
  protected reset(): void {
    this.progress = 0;
    this.cancelled = false;
  }

  /**
   * Update progress and notify callback
   */
  protected updateProgress(progress: number, message?: string): void {
    this.progress = Math.min(100, Math.max(0, progress));
    if (this.onProgress) {
      this.onProgress(this.progress, message);
    }
  }

  /**
   * Check if processing was cancelled
   */
  protected checkCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Create a success output
   */
  protected createSuccessOutput(result: Blob | Blob[], filename?: string, metadata?: Record<string, unknown>): ProcessOutput {
    return {
      success: true,
      result,
      filename,
      metadata,
    };
  }

  /**
   * Create an error output
   */
  protected createErrorOutput(code: PDFErrorCode, message: string, details?: string): ProcessOutput {
    return {
      success: false,
      error: createPDFError(code, message, details),
    };
  }

  /**
   * Get maximum file size for this processor
   * Override in subclasses if needed
   */
  protected getMaxFileSize(): number {
    return 100 * 1024 * 1024; // 100MB default
  }

  /**
   * Get accepted file types for this processor
   * Override in subclasses if needed
   */
  protected getAcceptedTypes(): string[] {
    return ['application/pdf'];
  }
}

/**
 * Create a PDF error object
 */
export function createPDFError(
  code: PDFErrorCode,
  message: string,
  details?: string,
  suggestedAction?: string
): PDFError {
  const category = ERROR_CODE_CATEGORY[code] || ErrorCategory.PROCESSING_ERROR;
  const recoverable = isRecoverableError(code);

  return {
    code,
    category,
    message,
    details,
    recoverable,
    suggestedAction: suggestedAction || getDefaultSuggestedAction(code),
  };
}

/**
 * Check if an error is recoverable
 */
function isRecoverableError(code: PDFErrorCode): boolean {
  const nonRecoverableErrors: PDFErrorCode[] = [
    PDFErrorCode.FILE_CORRUPTED,
    PDFErrorCode.PDF_MALFORMED,
    PDFErrorCode.BROWSER_NOT_SUPPORTED,
  ];
  return !nonRecoverableErrors.includes(code);
}

/**
 * Get default suggested action for an error code
 */
function getDefaultSuggestedAction(code: PDFErrorCode): string {
  const actions: Partial<Record<PDFErrorCode, string>> = {
    [PDFErrorCode.FILE_TOO_LARGE]: 'Try compressing or splitting the file first.',
    [PDFErrorCode.FILE_TYPE_INVALID]: 'Please upload a valid PDF file.',
    [PDFErrorCode.FILE_CORRUPTED]: 'The file may be damaged. Try a different file.',
    [PDFErrorCode.PDF_ENCRYPTED]: 'Please decrypt the PDF first using the Decrypt tool.',
    [PDFErrorCode.PDF_MALFORMED]: 'Try using the Repair PDF tool first.',
    [PDFErrorCode.PROCESSING_TIMEOUT]: 'Try with a smaller file or fewer pages.',
    [PDFErrorCode.MEMORY_EXCEEDED]: 'Close other browser tabs and try again.',
    [PDFErrorCode.WORKER_FAILED]: 'Refresh the page and try again.',
  };
  return actions[code] || 'Please try again.';
}
