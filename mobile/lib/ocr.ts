import { supabase } from './supabase';

export type OCRResult = {
  rawText: string;
  parsedData?: any;
  confidence?: number;
};

// Structured OCR via the Gemini-backed edge function (Korean medical docs).
export async function processImageOCR(imagesBase64: string[]): Promise<OCRResult> {
  const { data, error } = await supabase.functions.invoke('process-ocr-gemini', {
    body: { imagesBase64 },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  // The edge function returns { rawText, structuredJson } — expose
  // structuredJson under parsedData (the shape every screen expects).
  return {
    rawText: data?.rawText ?? '',
    parsedData: data?.structuredJson ?? null,
  };
}
