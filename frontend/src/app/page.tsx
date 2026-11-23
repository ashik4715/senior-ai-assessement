"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiFetchAuth } from "@/lib/api";

export default function Home() {
  const [users, setUsers] = useState<any[]>([]);
  const [uid, setUid] = useState<string>("");
  const router = useRouter();
  useEffect(() => {
    apiFetch("/users").then(setUsers).catch(() => {});
    const stored = localStorage.getItem("uid");
    if (stored) setUid(stored);
  }, []);
  async function enter() {
    if (!uid) return;
    localStorage.setItem("uid", uid);
    const teams = await apiFetchAuth("/teams");
    if (teams && teams.length) router.push(`/teams/${teams[0].id}`);
  }
  const selected = users.find((u) => u.id === uid);
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-amber-400 font-mono font-bold">L10</div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Level 10 Meetings</h1>
          <p className="mt-2 text-sm text-slate-500">Track measurables, rocks, to-dos and issues. Run the meeting.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label htmlFor="user" className="block text-sm font-medium text-slate-700">Sign in as</label>
          <select
            id="user"
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
          >
            <option value="">Choose a seeded user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} — {u.role.replace("_", " ")}</option>
            ))}
          </select>
          {selected && (
            <p className="mt-3 text-xs text-slate-500">Role: <span className="font-medium text-slate-700">{selected.role}</span> · {selected.email}</p>
          )}
          <button
            onClick={enter}
            disabled={!uid}
            className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Enter workspace
          </button>
        </div>
      </div>
    </main>
  );
}