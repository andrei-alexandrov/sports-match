import type { ApiErrorBody } from "@sports-match/shared";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (res.status === 204) {
    return undefined as T;
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const envelope = body as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      envelope?.error?.code ?? "UNKNOWN",
      envelope?.error?.message ?? "Something went wrong",
    );
  }
  return body as T;
}
