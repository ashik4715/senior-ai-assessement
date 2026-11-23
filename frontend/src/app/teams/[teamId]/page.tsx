"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetchAuth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    setSolvedIssues(sol.filter((i:any)=>i.solved_at));
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
    // owner from team members; pick first? Let's prompt via simple select not available; use current? We'll fetch team members not loaded. Use u1? Better: ask owner id.
    const owner = prompt("Owner user id (e.g. u2):");
    if (!owner) return;
    await apiFetchAuth(`/teams/${teamId}/issues/${issueId}/todos`, { method: "POST", body: JSON.stringify({ title, owner_id: owner }) });
    load();
  }

  async function markDone(id: string) {
    await apiFetchAuth(`/teams/${teamId}/todos/${id}/done`, { method: "POST" });
    load();
  }
  async function undoDone(id: string) {
    await apiFetchAuth(`/teams/${teamId}/todos/${id}/undo`, { method: "POST" });
    load();
  }

  const weeks = measurables.length ? Object.keys(measurables[0].weeks) : [];

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Team</h1>
        <select className="border rounded p-1" value={teamId} onChange={e=>router.push(`/teams/${e.target.value}`)}>
          {teams.map((t:any)=> <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <Button variant="outline" onClick={()=>router.push("/")}>Switch user</Button>
        {activeMeeting && <Button onClick={()=>router.push(`/meetings/${activeMeeting.id}`)}>Join active meeting</Button>}
        {!activeMeeting && <Button onClick={async()=>{ const m = await apiFetchAuth(`/teams/${teamId}/meetings`, {method:"POST"}); router.push(`/meetings/${m.id}`); }}>Start meeting</Button>}
      </div>

      {/* Scorecard */}
      <Card>
        <CardHeader><CardTitle>Scorecard</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-1 border">Measurable</th>
                {weeks.map(w => <th key={w} className="p-1 border">{w.slice(5)}</th>)}
              </tr>
            </thead>
            <tbody>
              {measurables.map((m:any) => (
                <tr key={m.id}>
                  <td className="p-1 border font-medium">{m.name}</td>
                  {weeks.map(w => {
                    const cell = m.weeks[w];
                    const color = cell.status === "on_track" ? "bg-green-100" : cell.status === "off_track" ? "bg-red-100" : "bg-gray-100";
                    return (
                      <td key={w} className={`p-1 border text-center ${color}`}>
                        <div>{cell.score ?? "-"}</div>
                        {cell.status === "off_track" && (
                          <button className="text-[10px] text-blue-600" onClick={()=>makeIssue(m.id,w)}>Make Issue</button>
                        )}
                        <input className="w-10 text-[10px] border" placeholder="score" onBlur={e=>{ if(e.target.value) editScore(m.id,w,e.target.value); }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Issues */}
      <Card>
        <CardHeader><CardTitle>Issues</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder="New issue title" value={newIssueTitle} onChange={e=>setNewIssueTitle(e.target.value)} />
            <Input placeholder="Priority 1-5" value={issuePriority} onChange={e=>setIssuePriority(e.target.value)} className="w-24" />
            <Button onClick={createIssue}>Create</Button>
          </div>
          {issues.map((i:any) => (
            <div key={i.id} className="border rounded p-2 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="font-medium">{i.title}</span>
                <span className="text-xs text-gray-500">{i.created_at}</span>
              </div>
              <div className="text-xs">Owner: {i.owner_id} Priority: {i.priority ?? "none"} {i.source && `Source: ${i.source.measurable_id} ${i.source.week_start}`}</div>
              <div className="flex gap-2">
                <select value={i.priority ?? ""} onChange={e=>setPriority(i.id,e.target.value)} className="border text-xs">
                  <option value="">no priority</option>
                  {[1,2,3,4,5].map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                <Button size="sm" variant="outline" onClick={()=>solveIssue(i.id)}>Solve</Button>
                <Button size="sm" variant="outline" onClick={()=>addToDo(i.id)}>Add To-Do</Button>
              </div>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={()=>setShowSolved(!showSolved)}>{showSolved?"Hide":"Show"} solved</Button>
          {showSolved && solvedIssues.map((i:any)=>(
            <div key={i.id} className="border rounded p-2 text-sm opacity-70">
              <div className="font-medium">{i.title}</div>
              <div className="text-xs">Solved {i.solved_at}: {i.resolution_note}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* To-Dos */}
      <Card>
        <CardHeader><CardTitle>To-Dos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {todosData && (
            <div className="text-sm">Last closed week completion: {todosData.completion_rate ? `${todosData.completion_rate.done}/${todosData.completion_rate.due} = ${todosData.completion_rate.rate_percent}%` : "n/a"}</div>
          )}
          {(todosData?.todos||[]).map((t:any)=>(
            <div key={t.id} className="border rounded p-2 text-sm flex justify-between items-center">
              <div>
                <span className={t.overdue?"text-red-600 font-medium":""}>{t.title}</span>
                <span className="text-xs text-gray-500 ml-2">owner {t.owner_id} due {t.due_date} {t.done_at?`done ${t.done_at}`:""}</span>
                {t.overdue && <Badge variant="destructive" className="ml-2">Overdue</Badge>}
              </div>
              <div className="flex gap-2">
                {!t.done_at && <Button size="sm" onClick={()=>markDone(t.id)}>Done</Button>}
                {t.done_at && <Button size="sm" variant="outline" onClick={()=>undoDone(t.id)}>Undo</Button>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rocks */}
      <Card>
        <CardHeader><CardTitle>Rocks (current quarter)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rocks.map((r:any)=>(
            <details key={r.id} className="border rounded p-2">
              <summary className="cursor-pointer text-sm font-medium">{r.title} - {r.status} ({r.progress_percent}%)</summary>
              <ul className="text-xs mt-2 space-y-1">
                {r.milestones.map((ms:any)=>(
                  <li key={ms.id}>{ms.title} due {ms.due_date} {ms.done?"✓":""}</li>
                ))}
              </ul>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
