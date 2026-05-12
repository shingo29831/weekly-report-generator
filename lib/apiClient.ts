// @ai-role: robust fetch wrapper with timeout and retry mechanisms

// Transient errors commonly encountered with external AI or file APIs
const isRetryableError = (status: number) => [408, 429, 500, 502, 503, 504].includes(status);

export const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries = 3,
  timeoutMs = 15000
): Promise<Response> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok && isRetryableError(response.status) && attempt < retries) {
        await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
        continue;
      }

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
    } finally {
      clearTimeout(id);
    }
  }
  throw new Error("Unreachable");
};