import { UploadStats } from "../types";

export default function StatsCards({ stats }: { stats: UploadStats }) {
  const cards = [
    { label: "Events", value: stats.total_events.toLocaleString() },
    { label: "Unique users", value: stats.unique_users.toLocaleString() },
    { label: "Unique IPs", value: stats.unique_ips.toLocaleString() },
    { label: "Destinations", value: stats.unique_destinations.toLocaleString() },
    {
      label: "Blocked",
      value: stats.blocked_count.toLocaleString(),
      tone: stats.blocked_count > 0 ? "warn" : "default",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-surface border border-border rounded-lg p-4"
        >
          <div className="text-xs uppercase tracking-wider text-gray-400">
            {c.label}
          </div>
          <div
            className={`text-2xl font-mono font-semibold mt-1 ${
              c.tone === "warn" ? "text-warn" : "text-gray-100"
            }`}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
