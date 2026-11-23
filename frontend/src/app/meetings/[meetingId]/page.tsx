"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetchAuth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SECTION_NAMES = ["Scorecard", "IDS", "Conclude"];
const DURATIONS = [5, 60, 10];

export default function MeetingPage() {
  const params = useParams();
  const meetingId = params.meetingId as string;
  const router = useRouter();
  const [meeting, setMeeting] = useState<any>(null);
  const [teamId, setTeamId] = useState<string>("");
  const [measurables, setMeasurables] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [todosData, setTodosData] = useState<any>(null);
  const [rating, setRating] = useState("");
  const [summary, setSummary] = useState<any>(null);

  async function loadMeeting() {
    const m = await apiFetchAuth(`/meetings/${meetingId}`);
    setMeeting(m);
    if (!teamId && m.team_id) setTeamId(m.team_id);
    return m;
  }
  async function loadTeamData(tid: string) {
    const [ms, iss, td] = await Promise.all([
      apiFetchAuth(`/teams/${tid}/measurables`),
      apiFetchAuth(`/teams/${tid}/issues`),
      apiFetchAuth(`/teams/${tid}/todos`),
    ]);
    setMeasurables(ms);
    setIssues(iss);
    setTodosData(td);
  }
  useEffect(() => {
    loadMeeting().then((m) => { if (m?.team_id) loadTeamData(m.team_id); });
    const iv = setInterval(loadMeeting, 2000);
    return () => clearInterval(iv);
  }, [meetingId]);
  useEffect(() => { if (teamId) loadTeamData(teamId); }, [teamId]);
  useEffect(() => {
    if (meeting?.ended_at && !summary) {
      apiFetchAuth(`/meetings/${meetingId}/summary`).then(setSummary).catch(() => {});
    }
  }, [meeting?.ended_at]);

  async function advance() { await apiFetchAuth(`/meetings/${meetingId}/advance`, { method: "POST" }); loadMeeting(); }
  async function end() { await apiFetchAuth(`/meetings/${meetingId}/end`, { method: "POST" }); loadMeeting(); }
  async function rate() {
    if (!rating) return;
    await apiFetchAuth(`/meetings/${meetingId}/rate`, { method: "POST", body: JSON.stringify({ rating: Number(rating) }) });
    setRating("");
    loadMeeting();
  }
  async function join() { await apiFetchAuth(`/meetings/${meetingId}/join`, { method: "POST" }); loadMeeting(); }

  if (!meeting) return <div className="p-6 text-slate-500">Loading meeting…</div>;

  const mins = Math.floor(meeting.elapsed_seconds / 60);
  const secs = meeting.elapsed_seconds % 60;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Level 10 meeting</p>
          <h1 className="text-2xl font-bold tracking-tight">In progress</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={join}>Join</Button>
          <Button variant="outline" onClick={() => router.push(`/teams/${teamId}`)}>Back to team</Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Agenda & timer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SECTION_NAMES.map((name, idx) => (
              <div
                key={idx}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                  meeting.section === idx ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {name} · {DURATIONS[idx]}m
              </div>
            ))}
          </div>
          <div className={`mt-4 font-mono text-5xl font-bold tabular-nums ${meeting.over_time ? "text-rose-600" : "text-slate-900"}`}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            <span className="ml-3 text-lg font-sans font-normal text-slate-400">/ {meeting.duration_minutes}:00</span>
            {meeting.over_time && <span className="ml-3 text-base font-sans font-semibold text-rose-600">OVERTIME</span>}
          </div>
          <p className="mt-2 text-sm text-slate-500">Attendees: {(meeting.attendee_ids || []).join(", ")}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={advance} disabled={!!meeting.ended_at}>Next section</Button>
            <Button variant="destructive" onClick={end} disabled={!!meeting.ended_at}>End meeting</Button>
          </div>
          {meeting.ended_at && <p className="mt-2 text-sm text-slate-500">Meeting ended.</p>}
        </CardContent>
      </Card>

      {meeting.section === 0 && (
        <Card>
          <CardHeader><CardTitle>Scorecard — review last closed week</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-2 text-left font-semibold">Measurable</th>
                  {(measurables.length ? Object.keys(measurables[0].weeks) : []).map((w) => (
                    <th key={w} className="p-2 text-center font-medium text-slate-500">{w.slice(5)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {measurables.map((m: any) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="p-2 font-medium">{m.name}</td>
                    {Object.keys(m.weeks).map((w) => {
                      const cell = m.weeks[w];
                      const cls = cell.status === "on_track" ? "bg-emerald-50/60" : cell.status === "off_track" ? "bg-rose-50/60" : "bg-slate-50/40";
                      return (
                        <td key={w} className={`p-2 text-center transition-colors ${cls} hover:bg-slate-100`}>
                          <div className={`font-mono text-sm font-bold ${cell.status === "on_track" ? "text-emerald-700" : cell.status === "off_track" ? "text-rose-700" : "text-slate-300"}`}>
                            {cell.score ?? "—"}
                          </div>
                          {cell.status === "off_track" && (
                            <button
                              onClick={async () => { await apiFetchAuth(`/teams/${teamId}/issues/from-measurable`, { method: "POST", body: JSON.stringify({ measurable_id: m.id, week_start: w }) }); loadTeamData(teamId); }}
                              className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 transition hover:bg-amber-200"
                            >
                              Make issue
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {meeting.section === 1 && (
        <Card>
          <CardHeader><CardTitle>IDS — issues in order</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {issues.map((i: any) => (
              <div key={i.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{i.title}</span>
                  <span className="text-xs text-slate-400">P{i.priority ?? "—"}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">Owner {i.owner_id}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={async () => { const note = prompt("Resolution note:"); if (!note) return; await apiFetchAuth(`/teams/${teamId}/issues/${i.id}/solve`, { method: "POST", body: JSON.stringify({ note }) }); loadTeamData(teamId); }}>Solve</Button>
                  <Button size="sm" variant="outline" onClick={async () => { const title = prompt("To-Do title:"); if (!title) return; const owner = prompt("Owner user id:"); if (!owner) return; await apiFetchAuth(`/teams/${teamId}/issues/${i.id}/todos`, { method: "POST", body: JSON.stringify({ title, owner_id: owner }) }); loadTeamData(teamId); }}>Add To-Do</Button>
                </div>
              </div>
            ))}
            {issues.length === 0 && <p className="text-sm text-slate-500">No open issues.</p>}
          </CardContent>
        </Card>
      )}

      {meeting.section === 2 && (
        <Card>
          <CardHeader><CardTitle>Conclude</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">New To-Dos created during this meeting</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {(todosData?.todos || []).map((t: any) => <li key={t.id}>{t.title} ({t.owner_id})</li>)}
              </ul>
            </div>
            {!meeting.ended_at && (
              <div className="flex items-center gap-2">
                <Input placeholder="Rating 1–10" value={rating} onChange={(e) => setRating(e.target.value)} className="w-28" />
                <Button onClick={rate}>Submit rating</Button>
              </div>
            )}
            <p className="text-xs text-slate-500">Ratings: {Object.entries(meeting.ratings || {}).map(([u, r]) => `${u}: ${r}`).join(", ") || "none yet"}</p>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card>
          <CardHeader><CardTitle>Meeting summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="font-medium">Scorecard week:</span> {summary.scorecard_week}</div>
            <div><span className="font-medium">Measurable status:</span> {Object.entries(summary.measurable_status || {}).map(([k, v]) => `${k} ${v}`).join(" · ")}</div>
            <div><span className="font-medium">Issues solved:</span> {(summary.issues_solved || []).join(", ") || "none"}</div>
            <div><span className="font-medium">To-Dos created:</span> {(summary.todos_created || []).join(", ") || "none"}</div>
            <div><span className="font-medium">Attendees:</span> {(summary.attendee_ids || []).join(", ")}</div>
            <div><span className="font-medium">Rating:</span> {summary.rating ?? "—"}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}