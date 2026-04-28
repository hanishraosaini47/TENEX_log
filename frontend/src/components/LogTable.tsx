import { LogEntry } from "../types";

interface Props {
  entries: LogEntry[];
  flaggedIds?: Set<number>;
  limit?: number;
}

export default function LogTable({ entries, flaggedIds, limit = 500 }: Props) {
  const shown = entries.slice(0, limit);

  return (
    <div className="overflow-x-auto bg-surface border border-border rounded-lg">
      <table className="w-full text-sm font-mono">
        <thead className="bg-panel text-xs uppercase tracking-wider text-gray-400">
          <tr>
            <th className="text-left px-3 py-2">Time</th>
            <th className="text-left px-3 py-2">User</th>
            <th className="text-left px-3 py-2">Source IP</th>
            <th className="text-left px-3 py-2">Destination</th>
            <th className="text-right px-3 py-2">Bytes</th>
            <th className="text-right px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Category</th>
            <th className="text-left px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((e) => {
            const flagged = flaggedIds?.has(e.id);
            return (
              <tr
                key={e.id}
                className={`border-t border-border hover:bg-panel/50 transition ${
                  flagged ? "bg-danger/10" : ""
                }`}
              >
                <td className="px-3 py-2 text-gray-400">
                  {new Date(e.timestamp).toLocaleString()}
                </td>
                <td className="px-3 py-2">{e.username || "-"}</td>
                <td className="px-3 py-2 text-gray-400">{e.src_ip || "-"}</td>
                <td className="px-3 py-2 truncate max-w-xs">{e.dst || "-"}</td>
                <td className="px-3 py-2 text-right">
                  {e.bytes_transferred.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">{e.status}</td>
                <td className="px-3 py-2">{e.category || "-"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                      (e.action || "").toLowerCase() === "blocked"
                        ? "bg-danger/20 text-danger"
                        : "bg-ok/10 text-ok"
                    }`}
                  >
                    {e.action || "-"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {entries.length > limit && (
        <div className="text-center text-xs text-gray-500 py-3 border-t border-border">
          Showing {limit.toLocaleString()} of {entries.length.toLocaleString()} events
        </div>
      )}
    </div>
  );
}
