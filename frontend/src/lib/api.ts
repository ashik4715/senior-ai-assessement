const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(apiUrl(path), {
    ...opts,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function setUserHeader(userId: string) {
  // store in localStorage for header-based auth
  if (typeof window !== "undefined") localStorage.setItem("uid", userId);
}

export function getUid(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("uid");
}

export async function apiFetchAuth(path: string, opts: RequestInit = {}) {
  const uid = getUid();
  const headers: any = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (uid) headers["X-User-Id"] = uid;
  const res = await fetch(apiUrl(path), {
    ...opts,
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}
