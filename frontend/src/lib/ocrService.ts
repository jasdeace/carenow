import Tesseract from 'tesseract.js';
import { supabase } from './supabase';

interface OCRResult {
  rawText: string;
  parsedData?: any;
  confidence: number;
}

export const processImageOCR = async (
  imageBase64: string,
  userTier: 'free' | 'premium'
): Promise<OCRResult> => {
  if (userTier === 'premium') {
    return processWithGemini(imageBase64);
  } else {
    return processWithTesseract(imageBase64);
  }
};

/**
 * Free Tier: Runs Tesseract.js directly in the browser
 * No server cost. Lower accuracy on complex documents.
 */
const processWithTesseract = async (imageUrl: string): Promise<OCRResult> => {
  console.log('Using Free Tier: Tesseract.js OCR');
  try {
    // We load both Korean and English language packs
    const result = await Tesseract.recognize(imageUrl, 'kor+eng', {
      logger: (m) => console.log('Tesseract Progress:', m),
    });

    return {
      rawText: result.data.text,
      confidence: result.data.confidence,
      // For free tier, we'd need custom regex here to extract structured data
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
const processWithGemini = async (imageBase64: string): Promise<OCRResult> => {
  console.log('Using Premium Tier: Gemini AI OCR');
  try {
    // We invoke a Supabase Edge Function (to be created later)
    // that handles the Gemini API call securely.
    const { data, error } = await supabase.functions.invoke('process-ocr-gemini', {
      body: { imageBase64 },
    });

    if (error) throw error;

    return {
      rawText: data.rawText,
      parsedData: data.structuredJson,
      confidence: 99, // Gemini doesn't return raw confidence like Tesseract
    };
  } catch (error) {
    console.error('Gemini OCR Error:', error);
    throw new Error('Failed to process image with Premium AI');
  }
};
