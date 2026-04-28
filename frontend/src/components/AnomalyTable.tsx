import { Anomaly } from "../types";

const methodBadge: Record<string, string> = {
  rule: "bg-danger/20 text-danger border border-danger/30",
  statistical: "bg-warn/20 text-warn border border-warn/30",
  ml: "bg-accent/20 text-accent border border-accent/30",
};

const methodLabel: Record<string, string> = {
  rule: "Rule",
  statistical: "Statistical",
  ml: "ML",
};

export default function AnomalyTable({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-8 text-center text-gray-400">
        No anomalies detected in this log.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-surface border border-border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-panel text-xs uppercase tracking-wider text-gray-400 font-mono">
          <tr>
            <th className="text-left px-3 py-2">Confidence</th>
            <th className="text-left px-3 py-2">Method</th>
            <th className="text-left px-3 py-2">Time</th>
            <th className="text-left px-3 py-2">User</th>
            <th className="text-left px-3 py-2">Destination</th>
            <th className="text-left px-3 py-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {anomalies.map((a) => (
            <tr key={a.id} className="border-t border-border hover:bg-panel/50 transition">
              <td className="px-3 py-3 font-mono">
                <ConfidenceBar value={a.confidence} />
              </td>
              <td className="px-3 py-3">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono ${
                    methodBadge[a.method] || ""
                  }`}
                >
                  {methodLabel[a.method] || a.method}
                </span>
              </td>
              <td className="px-3 py-3 font-mono text-xs text-gray-400">
                {new Date(a.log_entry.timestamp).toLocaleString()}
              </td>
              <td className="px-3 py-3 font-mono">{a.log_entry.username || "-"}</td>
              <td className="px-3 py-3 font-mono truncate max-w-xs">
                {a.log_entry.dst || "-"}
              </td>
              <td className="px-3 py-3 text-gray-300">{a.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.85 ? "bg-danger" : value >= 0.7 ? "bg-warn" : "bg-accent";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-panel rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums">{pct}%</span>
    </div>
  );
}
