export const Logger = {
  info: (message, data = null) => {
    console.log(`[INFO] ${message}`, data);
  },
  error: (message, error = null) => {
    console.error(`[ERROR] ${message}`, error);
  },
  warn: (message, data = null) => {
    console.warn(`[WARN] ${message}`, data);
  }
};