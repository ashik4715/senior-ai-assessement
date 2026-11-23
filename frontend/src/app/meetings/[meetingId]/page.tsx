"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetchAuth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SECTION_NAMES = ["Scorecard (5 min)", "IDS (60 min)", "Conclude (10 min)"];
const DURATIONS = [5,60,10];

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
    if (!teamId && m.team_id) {
      setTeamId(m.team_id);
    }
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
    loadMeeting().then(m => { if (m?.team_id) loadTeamData(m.team_id); });
    const iv = setInterval(loadMeeting, 2000);
    return () => clearInterval(iv);
  }, [meetingId]);

  useEffect(() => {
    if (teamId) loadTeamData(teamId);
  }, [teamId]);

  useEffect(() => {
    if (meeting?.ended_at && !summary) {
      apiFetchAuth(`/meetings/${meetingId}/summary`).then(setSummary).catch(()=>{});
    }
  }, [meeting?.ended_at]);

  async function advance() {
    await apiFetchAuth(`/meetings/${meetingId}/advance`, { method: "POST" });
    loadMeeting();
  }
  async function end() {
    await apiFetchAuth(`/meetings/${meetingId}/end`, { method: "POST" });
    loadMeeting();
  }
  async function rate() {
    if (!rating) return;
    await apiFetchAuth(`/meetings/${meetingId}/rate`, { method: "POST", body: JSON.stringify({ rating: Number(rating) }) });
    setRating("");
    loadMeeting();
  }
  async function join() {
    await apiFetchAuth(`/meetings/${meetingId}/join`, { method: "POST" });
    loadMeeting();
  }

  if (!meeting) return <div className="p-4">Loading...</div>;

  const elapsedMin = Math.floor(meeting.elapsed_seconds / 60);
  const elapsedSec = meeting.elapsed_seconds % 60;
  const durSec = meeting.duration_minutes * 60;
  const over = meeting.over_time;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Meeting</h1>
        <Button variant="outline" onClick={join}>Join</Button>
        <Button variant="outline" onClick={()=>router.push(`/teams/${teamId}`)}>Back to team</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Agenda & Timer</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            {SECTION_NAMES.map((name, idx) => (
              <div key={idx} className={`px-2 py-1 rounded ${meeting.section===idx?"bg-blue-200 font-bold":""}`}>{name}</div>
            ))}
          </div>
          <div className={`text-2xl font-mono mt-2 ${over?"text-red-600":""}`}>
            {elapsedMin}:{String(elapsedSec).padStart(2,"0")} / {meeting.duration_minutes}:00 {over?"(OVER)":""}
          </div>
          <div className="text-sm mt-1">Attendees: {(meeting.attendee_ids||[]).join(", ")}</div>
          <div className="flex gap-2 mt-2">
            <Button onClick={advance} disabled={meeting.ended_at}>Next section</Button>
            <Button variant="destructive" onClick={end} disabled={meeting.ended_at}>End meeting</Button>
          </div>
          {meeting.ended_at && <div className="text-sm text-gray-500 mt-1">Meeting ended</div>}
        </CardContent>
      </Card>

      {/* Section content */}
      {meeting.section === 0 && (
        <Card>
          <CardHeader><CardTitle>Scorecard</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-1 border">Measurable</th>
                  {(measurables.length ? Object.keys(measurables[0].weeks) : []).map(w => <th key={w} className="p-1 border">{w.slice(5)}</th>)}
                </tr>
              </thead>
              <tbody>
                {measurables.map((m:any) => (
                  <tr key={m.id}>
                    <td className="p-1 border font-medium">{m.name}</td>
                    {(Object.keys(m.weeks)).map(w => {
                      const cell = m.weeks[w];
                      const color = cell.status === "on_track" ? "bg-green-100" : cell.status === "off_track" ? "bg-red-100" : "bg-gray-100";
                      return (
                        <td key={w} className={`p-1 border text-center ${color}`}>
                          <div>{cell.score ?? "-"}</div>
                          {cell.status === "off_track" && (
                            <button className="text-[10px] text-blue-600" onClick={async()=>{ await apiFetchAuth(`/teams/${teamId}/issues/from-measurable`, {method:"POST", body: JSON.stringify({measurable_id:m.id, week_start:w})}); loadTeamData(teamId); }}>Make Issue</button>
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
          <CardHeader><CardTitle>IDS - Issues</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {issues.map((i:any) => (
              <div key={i.id} className="border rounded p-2 text-sm space-y-1">
                <div className="font-medium">{i.title}</div>
                <div className="text-xs">Owner {i.owner_id} Priority {i.priority ?? "none"}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={async()=>{ const note=prompt("Resolution note:"); if(!note) return; await apiFetchAuth(`/teams/${teamId}/issues/${i.id}/solve`,{method:"POST",body:JSON.stringify({note})}); loadTeamData(teamId); }}>Solve</Button>
                  <Button size="sm" variant="outline" onClick={async()=>{ const title=prompt("To-Do title:"); if(!title) return; const owner=prompt("Owner user id:"); if(!owner) return; await apiFetchAuth(`/teams/${teamId}/issues/${i.id}/todos`,{method:"POST",body:JSON.stringify({title,owner_id:owner})}); loadTeamData(teamId); }}>Add To-Do</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {meeting.section === 2 && (
        <Card>
          <CardHeader><CardTitle>Conclude</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">New To-Dos created during meeting:</div>
            <ul className="text-xs list-disc ml-4">
              {(todosData?.todos||[]).map((t:any) => <li key={t.id}>{t.title} ({t.owner_id})</li>)}
            </ul>
            {!meeting.ended_at && (
              <div className="flex gap-2 items-center">
                <Input placeholder="Rating 1-10" value={rating} onChange={e=>setRating(e.target.value)} className="w-24" />
                <Button onClick={rate}>Rate</Button>
              </div>
            )}
            <div className="text-xs">Ratings: {JSON.stringify(meeting.ratings)}</div>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Scorecard week: {summary.scorecard_week}</div>
            <div>Measurable status: {JSON.stringify(summary.measurable_status)}</div>
            <div>Issues solved: {(summary.issues_solved||[]).join(", ")}</div>
            <div>To-Dos created: {(summary.todos_created||[]).join(", ")}</div>
            <div>Attendees: {(summary.attendee_ids||[]).join(", ")}</div>
            <div>Rating: {summary.rating}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
