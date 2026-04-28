import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import {
  Anomaly,
  UploadDetail,
  AnalyzeResponse,
  TimelineBucket,
} from "../types";
import Shell from "../components/Shell";
import StatsCards from "../components/StatsCards";
import LogTable from "../components/LogTable";
import AnomalyTable from "../components/AnomalyTable";
import EventTimeline from "../components/EventTimeline";

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<UploadDetail | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [tab, setTab] = useState<"events" | "anomalies">("events");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = async () => {
    if (!id) return;
    try {
      const { data } = await api.get<TimelineBucket[]>(`/uploads/${id}/timeline`);
      setTimeline(data);
    } catch {
      // soft-fail; timeline is supplementary
    }
  };

  const load = async () => {
    if (!id) return;
    try {
      const { data } = await api.get<UploadDetail>(`/uploads/${id}`);
      setDetail(data);
      if (data.upload.analyzed) {
        const res = await api.get<Anomaly[]>(`/uploads/${id}/anomalies`);
        setAnomalies(res.data);
      }
      await loadTimeline();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load upload");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runAnalyze = async () => {
    if (!id) return;
    setAnalyzing(true);
    setError(null);
    try {
      await api.post<AnalyzeResponse>(`/uploads/${id}/analyze`);
      const res = await api.get<Anomaly[]>(`/uploads/${id}/anomalies`);
      setAnomalies(res.data);
      setDetail((d) => (d ? { ...d, upload: { ...d.upload, analyzed: true } } : d));
      await loadTimeline();
      setTab("anomalies");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const flaggedIds = useMemo(
    () => new Set(anomalies.map((a) => a.log_entry_id)),
    [anomalies]
  );

  if (error) {
    return (
      <Shell>
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-6 text-danger">
          {error}
          <Link to="/" className="ml-3 underline">
            ← Back to uploads
          </Link>
        </div>
      </Shell>
    );
  }

  if (!detail) {
    return (
      <Shell>
        <div className="text-gray-400">Loading…</div>
      </Shell>
    );
  }

  const byMethod = anomalies.reduce<Record<string, number>>((acc, a) => {
    acc[a.method] = (acc[a.method] || 0) + 1;
    return acc;
  }, {});

  return (
    <Shell>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <Link to="/" className="text-sm text-gray-400 hover:text-accent">
            ← All uploads
          </Link>
          <h2 className="text-2xl font-semibold mt-1 font-mono">
            {detail.upload.filename}
          </h2>
          <div className="text-sm text-gray-400 mt-1">
            Uploaded {new Date(detail.upload.uploaded_at).toLocaleString()}
          </div>
        </div>
        <button
          onClick={runAnalyze}
          disabled={analyzing}
          className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded font-medium transition"
        >
          {analyzing
            ? "Analyzing…"
            : detail.upload.analyzed
            ? "Re-run anomaly detection"
            : "Run anomaly detection"}
        </button>
      </div>

      <div className="mb-6">
        <StatsCards stats={detail.stats} />
      </div>

      {/* Timeline chart */}
      <div className="mb-6">
        <EventTimeline data={timeline} />
      </div>

      {detail.stats.top_categories.length > 0 && (
        <div className="mb-6 bg-surface border border-border rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">
            Top categories
          </div>
          <div className="flex flex-wrap gap-2">
            {detail.stats.top_categories.map((c) => (
              <span
                key={c.category}
                className="bg-panel border border-border rounded px-3 py-1 text-sm font-mono"
              >
                {c.category}{" "}
                <span className="text-gray-500">· {c.count.toLocaleString()}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-border mb-4 flex gap-1">
        <TabButton active={tab === "events"} onClick={() => setTab("events")}>
          Events ({detail.entries.length.toLocaleString()})
        </TabButton>
        <TabButton active={tab === "anomalies"} onClick={() => setTab("anomalies")}>
          Anomalies ({anomalies.length.toLocaleString()})
          {anomalies.length > 0 && (
            <span className="ml-2 text-xs font-mono text-gray-500">
              {Object.entries(byMethod)
                .map(([k, v]) => `${k}:${v}`)
                .join(" ")}
            </span>
          )}
        </TabButton>
      </div>

      {tab === "events" ? (
        <LogTable entries={detail.entries} flaggedIds={flaggedIds} />
      ) : detail.upload.analyzed ? (
        <AnomalyTable anomalies={anomalies} />
      ) : (
        <div className="bg-surface border border-border rounded-lg p-8 text-center text-gray-400">
          Click <span className="text-accent">Run anomaly detection</span> to analyze this log.
        </div>
      )}
    </Shell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-gray-400 hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
