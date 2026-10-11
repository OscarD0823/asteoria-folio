/**
 * PDF Form Filler Processor
 * Requirements: 5.1
 */

import type { ProcessInput, ProcessOutput, ProgressCallback } from '@/types/pdf';
import { PDFErrorCode } from '@/types/pdf';
import { BasePDFProcessor } from '../processor';
import { loadPdfLib } from '../loader';

export interface FormFieldValue {
  fieldName: string;
  value: string | boolean;
}

export interface FormFillerOptions {
  fields: FormFieldValue[];
  flatten?: boolean;
}

export class FormFillerProcessor extends BasePDFProcessor {
  async process(input: ProcessInput, onProgress?: ProgressCallback): Promise<ProcessOutput> {
    this.reset();
    this.onProgress = onProgress;

    const { files, options } = input;
    const inputOptions = options as Partial<FormFillerOptions>;
    const formOptions: FormFillerOptions = {
      fields: inputOptions.fields ?? [],
      flatten: inputOptions.flatten ?? false,
    };

    if (files.length !== 1) {
      return this.createErrorOutput(PDFErrorCode.INVALID_OPTIONS, 'Exactly 1 PDF file is required.');
    }

    try {
      this.updateProgress(10, 'Loading PDF library...');
      const pdfLib = await loadPdfLib();

      this.updateProgress(20, 'Loading PDF...');
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      this.updateProgress(30, 'Getting form fields...');
      const form = pdf.getForm();
      const fields = form.getFields();

      if (fields.length === 0) {
        return this.createErrorOutput(PDFErrorCode.INVALID_OPTIONS, 'This PDF does not contain any form fields.');
      }

      this.updateProgress(40, 'Filling form fields...');

      let filledCount = 0;
      for (const fieldValue of formOptions.fields) {
        try {
          const field = form.getField(fieldValue.fieldName);

          if (field) {
            const fieldType = field.constructor.name;

            if (fieldType === 'PDFTextField') {
              const textField = form.getTextField(fieldValue.fieldName);
              textField.setText(String(fieldValue.value));
              filledCount++;
            } else if (fieldType === 'PDFCheckBox') {
              const checkBox = form.getCheckBox(fieldValue.fieldName);
              if (fieldValue.value) {
                checkBox.check();
              } else {
                checkBox.uncheck();
              }
              filledCount++;
            } else if (fieldType === 'PDFDropdown') {
              const dropdown = form.getDropdown(fieldValue.fieldName);
              dropdown.select(String(fieldValue.value));
              filledCount++;
            } else if (fieldType === 'PDFRadioGroup') {
              const radioGroup = form.getRadioGroup(fieldValue.fieldName);
              radioGroup.select(String(fieldValue.value));
              filledCount++;
            }
          }
        } catch (fieldError) {
          console.warn(`Failed to fill field ${fieldValue.fieldName}:`, fieldError);
        }
      }

      this.updateProgress(80, 'Processing form...');

      if (formOptions.flatten) {
        form.flatten();
      }

      this.updateProgress(95, 'Saving PDF...');
      const pdfBytes = await pdf.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

      this.updateProgress(100, 'Complete!');
      return this.createSuccessOutput(blob, file.name.replace('.pdf', '_filled.pdf'), {
        totalFields: fields.length,
        filledFields: filledCount,
        flattened: formOptions.flatten,
      });

    } catch (error) {
      return this.createErrorOutput(PDFErrorCode.PROCESSING_FAILED, 'Failed to fill form.', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  protected getAcceptedTypes(): string[] {
    return ['application/pdf'];
  }
}

export function createFormFillerProcessor(): FormFillerProcessor {
  return new FormFillerProcessor();
}

export async function fillForm(file: File, options: FormFillerOptions, onProgress?: ProgressCallback): Promise<ProcessOutput> {
  const processor = createFormFillerProcessor();
  return processor.process({ files: [file], options: options as unknown as Record<string, unknown> }, onProgress);
}

export async function getFormFields(file: File): Promise<{ name: string; type: string; value?: string }[]> {
  const pdfLib = await loadPdfLib();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const form = pdf.getForm();
  const fields = form.getFields();

  return fields.map(field => ({
    name: field.getName(),
    type: field.constructor.name.replace('PDF', '').replace('Field', ''),
  }));
}
