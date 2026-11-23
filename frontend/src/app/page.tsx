"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

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
    const { apiFetchAuth } = await import("@/lib/api");
    const teams = await apiFetchAuth("/teams");
    if (teams && teams.length) router.push(`/teams/${teams[0].id}`);
    else router.push("/teams");
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold">Atri AI - Level 10</h1>
        <p className="text-sm text-muted-foreground">Select a seeded user</p>
        <select className="w-full border rounded p-2" value={uid} onChange={e=>setUid(e.target.value)}>
          <option value="">Choose user...</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
        </select>
        <button onClick={enter} className="w-full bg-black text-white rounded p-2">Enter</button>
      </div>
    </div>
  );
}

async function apiFetchAuthSafe(path: string, uid: string) {
  const res = await fetch(`http://localhost:8000/api${path}`, { headers: { "X-User-Id": uid } });
  return res.json();
}
