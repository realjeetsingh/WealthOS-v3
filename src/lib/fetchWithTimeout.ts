/**
 * Reusable fetch wrapper that enforces request timeouts using AbortController.
 * This prevents indefinite loading states when networks are unstable.
 */

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options; // Default 10 second timeout

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      throw new Error('Request timeout. The operation took too long to respond. Please check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
