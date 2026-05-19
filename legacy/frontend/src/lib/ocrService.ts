import Tesseract from 'tesseract.js';
import { supabase } from './supabase';

interface OCRResult {
  rawText: string;
  parsedData?: any;
  confidence: number;
}

export const processImageOCR = async (
  imagesBase64: string[],
  _userTier: 'free' | 'premium'
): Promise<OCRResult> => {
  // For now, always use Gemini for the best experience as Tesseract is unstable for Korean.
  return processWithGemini(imagesBase64);
};

/**
 * Free Tier: Runs Tesseract.js directly in the browser
 * Uses a worker with explicit CDN paths for Korean language support.
 */
export const _processWithTesseract = async (imageUrl: string): Promise<OCRResult> => {
  console.log('Using Free Tier: Tesseract.js OCR');
  try {
    const worker = await Tesseract.createWorker('kor+eng', undefined, {
      logger: (m) => console.log('Tesseract:', m.status, Math.round((m.progress || 0) * 100) + '%'),
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
    });

    const result = await worker.recognize(imageUrl);
    const text = result.data.text;
    const confidence = result.data.confidence;

    await worker.terminate();

    return {
      rawText: text,
      confidence,
      parsedData: null, 
    };
  } catch (error) {
    console.error('Tesseract OCR Error:', error);
    throw new Error('Failed to process image with Tesseract');
  }
};

/**
 * Premium Tier: Calls a Supabase Edge Function which uses Gemini API
 * Highly accurate structured JSON extraction.
 */
const processWithGemini = async (imagesBase64: string[]): Promise<OCRResult> => {
  console.log('Using Premium Tier: Gemini AI OCR');
  try {
    // We invoke a Supabase Edge Function (to be created later)
    // that handles the Gemini API call securely.
    const { data, error } = await supabase.functions.invoke('process-ocr-gemini', {
      body: { imagesBase64 },
    });

    if (error) throw error;

    return {
      rawText: data.rawText,
      parsedData: data.structuredJson,
      confidence: 99, // Gemini doesn't return raw confidence like Tesseract
    };
  } catch (error: any) {
    console.error('Gemini OCR Error:', error);
    throw new Error(error.message || 'Failed to process image with Premium AI');
  }
};
