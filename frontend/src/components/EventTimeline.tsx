import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { TimelineBucket } from "../types";

interface Props {
  data: TimelineBucket[];
}

/**
 * Hourly event timeline.
 *
 * Stacked bar chart:
 *   - blue bottom segment  = normal events
 *   - red top segment      = events flagged as anomalies
 *
 * The attack-hour bar visibly dominates because anomalies stack on top
 * of normal traffic, while quiet hours stay mostly blue with a thin red
 * sliver if any anomalies were detected.
 */
export default function EventTimeline({ data }: Props) {
  // Reformat into the shape recharts wants for stacked bars.
  // We split total_events into normal + anomalies so the segments stack.
  const chartData = useMemo(
    () =>
      data.map((b) => {
        const d = new Date(b.hour);
        const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`;
        const normal = Math.max(0, b.total_events - b.anomaly_count);
        return {
          label,
          normal,
          anomalies: b.anomaly_count,
        };
      }),
    [data]
  );

  if (data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-8 text-center text-gray-400">
        No timeline data available.
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-400">
            Events over time (hourly)
          </div>
          <div className="text-xs text-gray-500 mt-1 font-mono">
            Anomalies stacked in red on top of normal traffic
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3348" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#9ca3af", fontSize: 11, fontFamily: "JetBrains Mono" }}
              tickLine={{ stroke: "#2a3348" }}
              axisLine={{ stroke: "#2a3348" }}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 11, fontFamily: "JetBrains Mono" }}
              tickLine={{ stroke: "#2a3348" }}
              axisLine={{ stroke: "#2a3348" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(59,130,246,0.05)" }}
              contentStyle={{
                background: "#1a2236",
                border: "1px solid #2a3348",
                borderRadius: "6px",
                fontFamily: "JetBrains Mono",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#9ca3af" }}
              itemStyle={{ color: "#e5e7eb" }}
            />
            <Legend
              wrapperStyle={{ fontFamily: "JetBrains Mono", fontSize: "11px" }}
              iconType="square"
            />
            <Bar
              dataKey="normal"
              stackId="events"
              name="Normal"
              fill="#3b82f6"
              fillOpacity={0.85}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="anomalies"
              stackId="events"
              name="Anomalies"
              fill="#ef4444"
              fillOpacity={0.95}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
