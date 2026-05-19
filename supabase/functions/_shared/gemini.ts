export const GEMINI_MODEL = "gemini-3.1-flash-lite"

export const geminiEndpoint = (apiKey: string, model: string = GEMINI_MODEL) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
