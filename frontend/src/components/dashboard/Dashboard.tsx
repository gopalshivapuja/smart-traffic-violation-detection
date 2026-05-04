import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import {
  getViolationStats,
  getViolations,
  getPeakHours,
  getRevenue,
  getCameraHealth,
} from '../../services/api';
import type {
  CameraHealth,
  PeakHourPoint,
  RevenueStats,
  Violation,
  ViolationStats,
} from '../../types/violation';

const VIOLATION_LABELS: Record<string, string> = {
  helmet_violation: 'No Helmet',
  signal_jump: 'Red Light',
  wrong_way: 'Wrong Way',
  speeding: 'Speeding',
  no_seatbelt: 'No Seatbelt',
  illegal_parking: 'Illegal Parking',
};

export default function Dashboard() {
  const [stats, setStats] = useState<ViolationStats | null>(null);
  const [recent, setRecent] = useState<Violation[]>([]);
  const [peak, setPeak] = useState<PeakHourPoint[]>([]);
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [health, setHealth] = useState<CameraHealth[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, r, p, rv, h] = await Promise.all([
          getViolationStats(),
          getViolations({ limit: 6 }),
          getPeakHours(7),
          getRevenue(30),
          getCameraHealth(),
        ]);
        if (cancelled) return;
        setStats(s);
        setRecent(r);
        setPeak(p);
        setRevenue(rv);
        setHealth(h);
      } catch (e) {
        // Silently fall back to empty state — no crash on cold backend.
        console.warn('Dashboard load failed', e);
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const activeCameras = health.filter((c) => c.status === 'healthy').length;
  const todayCount = stats?.today_count ?? 0;
  const mostActiveCamera = stats
    ? Object.entries(stats.by_camera).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    : '—';

  const categoryData = stats
    ? Object.entries(stats.by_type).map(([k, v]) => ({
        name: VIOLATION_LABELS[k] ?? k,
        count: v,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Top stat strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Cameras" value={activeCameras || health.length || 0} />
        <StatCard label="Today's Violations" value={todayCount} />
        <StatCard label="Most Active Camera" value={mostActiveCamera} />
        <StatCard
          label="Revenue (30d)"
          value={revenue ? `₹${revenue.total_inr.toLocaleString('en-IN')}` : '₹0'}
          accent
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live player area */}
        <div className="lg:col-span-2">
          <Card title="Live Camera Feed">
            <div className="relative aspect-video overflow-hidden rounded-md bg-black/60">
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <span className="text-sm">No active stream — upload a clip to begin</span>
              </div>
              <div className="absolute left-3 top-3 rounded bg-accent-cyan/20 px-2 py-0.5 text-xs font-semibold text-accent-cyan">
                YOLOv8
              </div>
            </div>
          </Card>
        </div>

        {/* Recent violations side panel */}
        <Card title="Recent Violations">
          <div className="-m-2 flex max-h-[26rem] flex-col gap-1 overflow-auto p-2">
            {recent.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No violations yet.</p>
            ) : (
              recent.map((v) => <ViolationRow key={v.id} v={v} />)
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Violations by Category">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a334e" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161c2e', border: '1px solid #2a334e' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Peak Violation Hours (last 7 days)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={peak}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a334e" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161c2e', border: '1px solid #2a334e' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Camera Health & Hotspots">
        <CameraHealthGrid cameras={health} />
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-elevated p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold ${accent ? 'text-accent-cyan' : 'text-slate-100'}`}
      >
        {value}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-elevated p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ViolationRow({ v }: { v: Violation }) {
  const ts = (() => {
    try {
      return format(parseISO(v.detected_at), 'HH:mm:ss');
    } catch {
      return '';
    }
  })();
  return (
    <Link
      to={`/violations/${v.id}`}
      className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-white/5"
    >
      <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-black/40">
        {v.thumbnail_url ? (
          <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-200">
          {v.license_plate || '—'}
        </div>
        <div className="text-xs text-danger">
          {VIOLATION_LABELS[v.violation_type] ?? v.violation_type}
        </div>
      </div>
      <div className="text-right text-xs text-slate-500">{ts}</div>
    </Link>
  );
}

function CameraHealthGrid({ cameras }: { cameras: CameraHealth[] }) {
  if (cameras.length === 0) {
    return <p className="text-sm text-slate-500">No cameras registered yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {cameras.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-2 rounded border border-border-subtle bg-bg-card p-2"
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              c.status === 'healthy' ? 'bg-ok' : 'bg-danger'
            }`}
          />
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-slate-200">{c.name}</div>
            <div className="text-[10px] text-slate-500">
              {c.lat && c.lng ? `${c.lat.toFixed(2)}, ${c.lng.toFixed(2)}` : 'no geo'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
