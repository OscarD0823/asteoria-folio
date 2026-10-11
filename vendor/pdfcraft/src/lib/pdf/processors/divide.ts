/**
 * PDF Divide Pages Processor
 * Requirements: 5.1
 * 
 * Implements PDF page division functionality using pdf-lib.
 * Splits each page into multiple sections (horizontally or vertically).
 */

import type {
  ProcessInput,
  ProcessOutput,
  ProgressCallback,
} from '@/types/pdf';
import { PDFErrorCode } from '@/types/pdf';
import { BasePDFProcessor } from '../processor';
import { loadPdfLib } from '../loader';

/**
 * Division type options
 */
export type DivisionType = 'vertical' | 'horizontal' | 'grid-2x2' | 'grid-3x3';

/**
 * Divide pages options
 */
export interface DivideOptions {
  /** Type of division */
  divisionType: DivisionType;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: DivideOptions = {
  divisionType: 'vertical',
};

/**
 * Grid dimensions for each division type
 */
const DIVISION_GRID: Record<DivisionType, { cols: number; rows: number }> = {
  'vertical': { cols: 2, rows: 1 },
  'horizontal': { cols: 1, rows: 2 },
  'grid-2x2': { cols: 2, rows: 2 },
  'grid-3x3': { cols: 3, rows: 3 },
};

/**
 * Divide Pages PDF Processor
 * Splits each page of a PDF into multiple sections.
 */
export class DividePagesPDFProcessor extends BasePDFProcessor {
  /**
   * Process a PDF file and divide its pages
   */
  async process(
    input: ProcessInput,
    onProgress?: ProgressCallback
  ): Promise<ProcessOutput> {
    this.reset();
    this.onProgress = onProgress;

    const { files, options } = input;
    const divideOptions: DivideOptions = {
      ...DEFAULT_OPTIONS,
      ...(options as Partial<DivideOptions>),
    };

    // Validate we have exactly 1 file
    if (files.length !== 1) {
      return this.createErrorOutput(
        PDFErrorCode.INVALID_OPTIONS,
        'Exactly 1 PDF file is required.',
        `Received ${files.length} file(s).`
      );
    }

    try {
      this.updateProgress(5, 'Loading PDF library...');

      const pdfLib = await loadPdfLib();

      if (this.checkCancelled()) {
        return this.createErrorOutput(
          PDFErrorCode.PROCESSING_CANCELLED,
          'Processing was cancelled.'
        );
      }

      this.updateProgress(10, 'Loading source PDF...');

      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();

      // Load the source PDF
      let sourcePdf;
      try {
        sourcePdf = await pdfLib.PDFDocument.load(arrayBuffer, {
          ignoreEncryption: true,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('encrypt')) {
          return this.createErrorOutput(
            PDFErrorCode.PDF_ENCRYPTED,
            'The PDF file is encrypted.',
            'Please decrypt the file first.'
          );
        }
        throw error;
      }

      const sourcePages = sourcePdf.getPages();
      const totalPages = sourcePages.length;
      this.updateProgress(15, `Source PDF has ${totalPages} pages.`);

      if (this.checkCancelled()) {
        return this.createErrorOutput(
          PDFErrorCode.PROCESSING_CANCELLED,
          'Processing was cancelled.'
        );
      }

      // Get grid dimensions
      const grid = DIVISION_GRID[divideOptions.divisionType];
      const sectionsPerPage = grid.cols * grid.rows;

      this.updateProgress(20, 'Creating divided PDF...');

      // Create new PDF
      const newPdf = await pdfLib.PDFDocument.create();
      const progressPerPage = 70 / totalPages;

      for (let i = 0; i < totalPages; i++) {
        if (this.checkCancelled()) {
          return this.createErrorOutput(
            PDFErrorCode.PROCESSING_CANCELLED,
            'Processing was cancelled.'
          );
        }

        this.updateProgress(
          20 + (i * progressPerPage),
          `Processing page ${i + 1} of ${totalPages}...`
        );

        const originalPage = sourcePages[i];
        const { width, height } = originalPage.getSize();

        // Calculate section dimensions
        const sectionWidth = width / grid.cols;
        const sectionHeight = height / grid.rows;

        // Create sections in reading order (top-left to bottom-right, row by row)
        for (let row = 0; row < grid.rows; row++) {
          for (let col = 0; col < grid.cols; col++) {
            // Copy the page
            const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);

            // Calculate crop box coordinates
            // PDF coordinates start from bottom-left, so we need to flip the row order
            const x = col * sectionWidth;
            const y = height - ((row + 1) * sectionHeight); // Flip Y for PDF coordinates

            // Set the crop box to show only this section
            copiedPage.setCropBox(x, y, sectionWidth, sectionHeight);

            // Also set the media box to match the crop box size
            // This ensures the output page has the correct dimensions
            copiedPage.setMediaBox(x, y, sectionWidth, sectionHeight);

            newPdf.addPage(copiedPage);
          }
        }
      }

      this.updateProgress(90, 'Saving PDF...');

      // Save the new PDF
      const pdfBytes = await newPdf.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

      this.updateProgress(100, 'Complete!');

      // Generate output filename
      const outputFilename = generateFilename(file.name, divideOptions.divisionType);
      const outputPageCount = totalPages * sectionsPerPage;

      return this.createSuccessOutput(blob, outputFilename, {
        originalPageCount: totalPages,
        outputPageCount,
        divisionType: divideOptions.divisionType,
        sectionsPerPage,
      });

    } catch (error) {
      return this.createErrorOutput(
        PDFErrorCode.PROCESSING_FAILED,
        'Failed to divide PDF pages.',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get accepted file types
   */
  protected getAcceptedTypes(): string[] {
    return ['application/pdf'];
  }
}

/**
 * Get filename without extension
 */
function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return filename;
  return filename.slice(0, lastDot);
}

/**
 * Generate output filename
 */
function generateFilename(originalName: string, divisionType: DivisionType): string {
  const baseName = getFileNameWithoutExtension(originalName);
  return `${baseName}_divided_${divisionType}.pdf`;
}

/**
 * Create a new instance of the processor
 */
export function createDivideProcessor(): DividePagesPDFProcessor {
  return new DividePagesPDFProcessor();
}

/**
 * Divide PDF pages (convenience function)
 */
export async function dividePages(
  file: File,
  options: Partial<DivideOptions>,
  onProgress?: ProgressCallback
): Promise<ProcessOutput> {
  const processor = createDivideProcessor();
  return processor.process(
    {
      files: [file],
      options: options as Record<string, unknown>,
    },
    onProgress
  );
}
