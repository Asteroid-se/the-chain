import { ZodError } from 'zod';
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function ok(data: unknown, status = 200) {
  return Response.json({ success: true, data, error: null }, { status });
}
export async function endpoint(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (error) {
    const status =
      error instanceof ApiError
        ? error.status
        : error instanceof ZodError || error instanceof SyntaxError
          ? 400
          : 500;
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message
        : error instanceof ApiError
          ? error.message
          : status === 400
            ? 'Invalid JSON request.'
            : 'Something went wrong. Please try again.';
    if (status === 500) console.error('API request failed:', error);
    return Response.json({ success: false, data: null, error: message }, { status });
  }
}
