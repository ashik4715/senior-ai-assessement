"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetchAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TeamPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [measurables, setMeasurables] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [solvedIssues, setSolvedIssues] = useState<any[]>([]);
  const [todosData, setTodosData] = useState<any>(null);
  const [rocks, setRocks] = useState<any[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<any>(null);
  const [showSolved, setShowSolved] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [issuePriority, setIssuePriority] = useState("");

  async function load() {
    const [t, m, iss, sol, td, rk, am] = await Promise.all([
      apiFetchAuth("/teams"),
      apiFetchAuth(`/teams/${teamId}/measurables`),
      apiFetchAuth(`/teams/${teamId}/issues`),
      apiFetchAuth(`/teams/${teamId}/issues?include_solved=true`),
      apiFetchAuth(`/teams/${teamId}/todos`),
      apiFetchAuth(`/teams/${teamId}/rocks`),
      apiFetchAuth(`/teams/${teamId}/meetings/active`),
    ]);
    setTeams(t);
    setMeasurables(m);
    setIssues(iss);
    setSolvedIssues(sol.filter((i: any) => i.solved_at));
    setTodosData(td);
    setRocks(rk);
    setActiveMeeting(am);
  }
  useEffect(() => { load(); }, [teamId]);

  async function editScore(mId: string, week: string, value: string) {
    await apiFetchAuth(`/teams/${teamId}/scores/${mId}/${week}`, { method: "PUT", body: JSON.stringify({ value: Number(value) }) });
    load();
  }
  async function makeIssue(mId: string, week: string) {
    await apiFetchAuth(`/teams/${teamId}/issues/from-measurable`, { method: "POST", body: JSON.stringify({ measurable_id: mId, week_start: week }) });
    load();
  }
  async function createIssue() {
    if (!newIssueTitle) return;
    const body: any = { title: newIssueTitle };
    if (issuePriority) body.priority = Number(issuePriority);
    await apiFetchAuth(`/teams/${teamId}/issues`, { method: "POST", body: JSON.stringify(body) });
    setNewIssueTitle(""); setIssuePriority("");
    load();
  }
  async function solveIssue(id: string) {
    const note = prompt("Resolution note (required):");
    if (!note) return;
    await apiFetchAuth(`/teams/${teamId}/issues/${id}/solve`, { method: "POST", body: JSON.stringify({ note }) });
    load();
  }
  async function setPriority(id: string, p: string) {
    await apiFetchAuth(`/teams/${teamId}/issues/${id}`, { method: "PATCH", body: JSON.stringify({ priority: p ? Number(p) : null }) });
    load();
  }
  async function addToDo(issueId: string) {
    const title = prompt("To-Do title:");
    if (!title) return;
    const owner = prompt("Owner user id (e.g. u2):");
    if (!owner) return;
    await apiFetchAuth(`/teams/${teamId}/issues/${issueId}/todos`, { method: "POST", body: JSON.stringify({ title, owner_id: owner }) });
    load();
  }
  async function markDone(id: string) { await apiFetchAuth(`/teams/${teamId}/todos/${id}/done`, { method: "POST" }); load(); }
  async function undoDone(id: string) { await apiFetchAuth(`/teams/${teamId}/todos/${id}/undo`, { method: "POST" }); load(); }
  async function startMeeting() {
    const m = await apiFetchAuth(`/teams/${teamId}/meetings`, { method: "POST" });
    router.push(`/meetings/${m.id}`);
  }

  const weeks = measurables.length ? Object.keys(measurables[0].weeks) : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Team workspace</p>
          <h1 className="text-2xl font-bold tracking-tight">Level 10</h1>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="team-switch" className="sr-only">Team</label>
          <select
            id="team-switch"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            value={teamId}
            onChange={(e) => router.push(`/teams/${e.target.value}`)}
          >
            {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {activeMeeting && <Button onClick={() => router.push(`/meetings/${activeMeeting.id}`)}>Join meeting</Button>}
          {!activeMeeting && <Button onClick={startMeeting}>Start meeting</Button>}
          <Button variant="outline" onClick={() => router.push("/")}>Switch user</Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Scorecard — last 13 weeks</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 bg-slate-50 p-2 text-left font-semibold">Measurable</th>
                {weeks.map((w) => <th key={w} className="p-2 text-center font-medium text-slate-500">{w.slice(5)}</th>)}
              </tr>
            </thead>
            <tbody>
              {measurables.map((m: any) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="sticky left-0 bg-white p-2 font-medium">{m.name}</td>
                  {weeks.map((w) => {
                    const cell = m.weeks[w];
                    const cls = cell.status === "on_track" ? "bg-emerald-50/60" : cell.status === "off_track" ? "bg-rose-50/60" : "bg-slate-50/40";
                    return (
                      <td key={w} className={`group/cell relative p-2 text-center transition-colors ${cls} hover:bg-slate-100`}>
                        <div className={`font-mono text-sm font-bold ${cell.status === "on_track" ? "text-emerald-700" : cell.status === "off_track" ? "text-rose-700" : "text-slate-300"}`}>
                          {cell.score ?? "—"}
                        </div>
                        {cell.status === "off_track" && (
                          <button
                            onClick={() => makeIssue(m.id, w)}
                            className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 transition hover:bg-amber-200"
                          >
                            Make issue
                          </button>
                        )}
                        <input
                          aria-label={`Score for ${m.name} week ${w}`}
                          className="mt-1 w-11 rounded-md border border-slate-200 bg-white/80 px-1 py-0.5 text-center text-[10px] text-slate-600 opacity-0 transition group-hover/cell:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          placeholder="edit"
                          onBlur={(e) => { if (e.target.value) editScore(m.id, w, e.target.value); }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="New issue title…" value={newIssueTitle} onChange={(e) => setNewIssueTitle(e.target.value)} />
              <Input placeholder="Pri 1–5" value={issuePriority} onChange={(e) => setIssuePriority(e.target.value)} className="w-20" />
              <Button onClick={createIssue}>Create</Button>
            </div>
            {issues.map((i: any) => (
              <div key={i.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{i.title}</span>
                  <span className="text-xs text-slate-400">{new Date(i.created_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Owner {i.owner_id} · Priority {i.priority ?? "none"}
                  {i.source && ` · Source ${i.source.measurable_id} ${i.source.week_start}`}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    aria-label="Set priority"
                    value={i.priority ?? ""}
                    onChange={(e) => setPriority(i.id, e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="">no priority</option>
                    {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => solveIssue(i.id)}>Solve</Button>
                  <Button size="sm" variant="outline" onClick={() => addToDo(i.id)}>Add To-Do</Button>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setShowSolved(!showSolved)}>
              {showSolved ? "Hide" : "Show"} solved ({solvedIssues.length})
            </Button>
            {showSolved && solvedIssues.map((i: any) => (
              <div key={i.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm opacity-70">
                <div className="font-medium">{i.title}</div>
                <div className="text-xs">Solved {new Date(i.solved_at).toLocaleString()}: {i.resolution_note}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>To-Dos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todosData && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                Last closed week:{" "}
                {todosData.completion_rate
                  ? `${todosData.completion_rate.done}/${todosData.completion_rate.due} done · ${todosData.completion_rate.rate_percent}%`
                  : "no to-dos due"}
              </div>
            )}
            {(todosData?.todos || []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div className="min-w-0">
                  <div className={`truncate font-medium ${t.overdue ? "text-rose-600" : ""}`}>{t.title}</div>
                  <div className="text-xs text-slate-500">
                    {t.owner_id} · due {t.due_date} {t.done_at ? `· done ${new Date(t.done_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.overdue && <Badge variant="destructive">Overdue</Badge>}
                  {!t.done_at && <Button size="sm" onClick={() => markDone(t.id)}>Done</Button>}
                  {t.done_at && <Button size="sm" variant="outline" onClick={() => undoDone(t.id)}>Undo</Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rocks — current quarter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rocks.map((r: any) => (
            <details key={r.id} className="group rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer list-none font-medium">
                <div className="flex items-center justify-between">
                  <span>{r.title}</span>
                  <span className="text-xs text-slate-500">{r.status} · {r.progress_percent}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${r.progress_percent}%` }} />
                </div>
              </summary>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                {r.milestones.map((ms: any) => (
                  <li key={ms.id} className="flex items-center gap-2">
                    <span className={ms.done ? "text-emerald-600" : "text-slate-300"}>{ms.done ? "✓" : "○"}</span>
                    <span>{ms.title}</span>
                    <span className="text-slate-400">· {ms.due_date}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}