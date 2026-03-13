export type ImageProvider = "gemini" | "openai";

export function getAvailableProviders() {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
  };
}

export function getDefaultProvider(): ImageProvider {
  const configured = getAvailableProviders();
  if (configured.gemini) return "gemini";
  if (configured.openai) return "openai";
  return "gemini";
}
