import React from "react";

type MatchRow = {
  id: string;
  playedAt: string; // ISO string
  opponent: string;
  result: "WIN" | "LOSE";
  score: string; // "11-8" みたいに表示用でOK
};

const dummy: MatchRow[] = [
  { id: "1", playedAt: "2026-02-14T08:10:00Z", opponent: "alice", result: "WIN", score: "11-7" },
  { id: "2", playedAt: "2026-02-13T14:22:00Z", opponent: "bob", result: "LOSE", score: "8-11" },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function HistoryPage() {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Match History</h2>
      <p style={{ marginTop: 4, opacity: 0.7 }}>
        1v1の対戦履歴（日時・結果・相手）を表示します（後でAPI連携）
      </p>

      {dummy.length === 0 ? (
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          対戦履歴がまだありません
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "10px 8px", borderBottom: "1px solid #ddd" }}>Date</th>
                <th style={{ padding: "10px 8px", borderBottom: "1px solid #ddd" }}>Opponent</th>
                <th style={{ padding: "10px 8px", borderBottom: "1px solid #ddd" }}>Result</th>
                <th style={{ padding: "10px 8px", borderBottom: "1px solid #ddd" }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {dummy.map((m) => (
                <tr key={m.id}>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>
                    {formatDate(m.playedAt)}
                  </td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>
                    {m.opponent}
                  </td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid #ddd",
                        fontWeight: 600,
                      }}
                    >
                      {m.result}
                    </span>
                  </td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>
                    {m.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}