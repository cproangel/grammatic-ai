// API configuration for production/development
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = {
  translate: `${API_BASE_URL}/api/translate`,
  translateWithGrammar: `${API_BASE_URL}/api/translate-with-grammar`,
  grammarCheck: `${API_BASE_URL}/api/grammar/check`,
  grammarFix: `${API_BASE_URL}/api/grammar/fix`,
  transliterate: `${API_BASE_URL}/api/transliterate`,
  health: `${API_BASE_URL}/api/health`,
};
