/**
 * Helper to safely extract an error string message from an unknown error
 * or an API error object { message, code, status } so that toast.error()
 * NEVER crashes React with "Objects are not valid as a React child".
 */
export function getErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  if (typeof error === 'object') {
    const errObj = error as Record<string, any>;
    if (typeof errObj.message === 'string' && errObj.message.trim()) {
      return errObj.message;
    }
    if (errObj.error) {
      return getErrorMessage(errObj.error, fallback);
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
