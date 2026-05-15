const isDev = process.env.NODE_ENV === 'development';

export function safeError(err: unknown): string {
  if (isDev && err instanceof Error) {
    return err.message;
  }
  return 'An internal error occurred';
}

export function safeErrorResponse(err: unknown) {
  return { error: safeError(err) };
}
