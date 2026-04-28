import { useEffect, useState, DragEvent, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { UploadSummary } from "../types";
import Shell from "../components/Shell";

export default function Upload() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<UploadSummary[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUploads = async () => {
    try {
      const { data } = await api.get<UploadSummary[]>("/uploads");
      setUploads(data);
    } catch (err: any) {
      // soft-fail; 401 is handled by axios interceptor
    }
  };

  useEffect(() => {
    loadUploads();
  }, []);

  const uploadFile = async (file: File) => {
    setError(null);
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.post("/uploads", form);
      navigate(`/results/${data.upload_id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.[0]) uploadFile(e.dataTransfer.files[0]);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) uploadFile(e.target.files[0]);
  };

  return (
    <Shell>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-1">Upload a log file</h2>
          <p className="text-sm text-gray-400 mb-5">
            ZScaler-format web proxy logs. Plain text, one event per line.
          </p>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`block border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition ${
              dragging
                ? "border-accent bg-accent/5"
                : "border-border bg-surface hover:border-gray-500"
            }`}
          >
            <input
              type="file"
              accept=".log,.txt"
              className="hidden"
              onChange={onPick}
              disabled={uploading}
            />
            <div className="text-4xl mb-3 font-mono text-accent">↑</div>
            <div className="font-medium">
              {uploading ? "Uploading…" : "Drop a .log or .txt file here"}
            </div>
            <div className="text-xs text-gray-500 mt-1 font-mono">
              or click to browse
            </div>
          </label>

          {error && (
            <div className="mt-4 text-sm text-danger bg-danger/10 border border-danger/30 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-1">Recent uploads</h2>
          <p className="text-sm text-gray-400 mb-5">Click to view results.</p>
          <div className="space-y-2">
            {uploads.length === 0 ? (
              <div className="text-sm text-gray-500 italic">No uploads yet.</div>
            ) : (
              uploads.map((u) => (
                <button
                  key={u.id}
                  onClick={() => navigate(`/results/${u.id}`)}
                  className="w-full text-left bg-surface border border-border rounded-lg p-3 hover:border-accent transition group"
                >
                  <div className="font-mono text-sm truncate group-hover:text-accent">
                    {u.filename}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex justify-between">
                    <span>{u.row_count.toLocaleString()} events</span>
                    <span>{new Date(u.uploaded_at).toLocaleString()}</span>
                  </div>
                  {u.analyzed && (
                    <span className="inline-block mt-2 text-[10px] uppercase tracking-wider bg-ok/10 text-ok border border-ok/30 px-1.5 py-0.5 rounded">
                      analyzed
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
