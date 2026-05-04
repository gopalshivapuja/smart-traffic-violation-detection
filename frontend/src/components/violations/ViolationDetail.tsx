import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Play, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { getViolation, updateViolation } from '../../services/api';
import type { Violation } from '../../types/violation';

const typeLabels: Record<string, string> = {
  helmet_violation: 'No Helmet',
  signal_jump: 'Red Light',
  wrong_way: 'Wrong Way',
  speeding: 'Speeding',
  no_seatbelt: 'No Seatbelt',
  illegal_parking: 'Illegal Parking',
};

const statusColors: Record<string, string> = {
  detected: 'bg-warning/15 text-warning',
  confirmed: 'bg-accent-cyan/15 text-accent-cyan',
  rejected: 'bg-slate-700/40 text-slate-400',
  evidence_generated: 'bg-ok/15 text-ok',
  sent_to_authority: 'bg-purple-500/15 text-purple-300',
};

export default function ViolationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [violation, setViolation] = useState<Violation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getViolation(id)
      .then(setViolation)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id || !violation) return;
    try {
      const updated = await updateViolation(id, { status: newStatus });
      setViolation(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (error || !violation) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-md border border-danger/40 bg-danger/10 p-4">
          <p className="text-sm text-danger">{error || 'Violation not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="text-2xl font-semibold text-slate-100">
            {typeLabels[violation.violation_type] || violation.violation_type}
          </h2>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              statusColors[violation.status] || ''
            }`}
          >
            {violation.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-black">
            {violation.clip_url ? (
              <video
                controls
                className="w-full"
                poster={violation.thumbnail_url || undefined}
              >
                <source src={violation.clip_url} type="video/mp4" />
              </video>
            ) : violation.thumbnail_url ? (
              <img src={violation.thumbnail_url} alt="" className="w-full" />
            ) : (
              <div className="flex h-64 items-center justify-center text-slate-600">
                <Play className="h-12 w-12" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border-subtle bg-bg-elevated p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Details</h3>
            <dl className="space-y-3">
              <Field label="Violation Type">
                <span className="flex items-center gap-2 text-slate-100">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                  {typeLabels[violation.violation_type] || violation.violation_type}
                </span>
              </Field>
              <Field label="Camera">{violation.camera_id}</Field>
              <Field label="License Plate">
                <span className="font-mono">{violation.license_plate || 'Not detected'}</span>
              </Field>
              <Field label="Confidence">{(violation.confidence * 100).toFixed(1)}%</Field>
              <Field label="Detected At">
                {format(new Date(violation.detected_at), 'MMM d, yyyy HH:mm:ss')}
              </Field>
              {violation.fine_amount ? (
                <Field label="Fine">
                  <span className="font-semibold text-accent-cyan">
                    ₹{violation.fine_amount.toLocaleString('en-IN')}
                  </span>
                </Field>
              ) : null}
            </dl>
          </div>

          <div className="rounded-lg border border-border-subtle bg-bg-elevated p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Actions</h3>
            <div className="space-y-2">
              {violation.status === 'detected' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('confirmed')}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-cyan px-4 py-2 text-sm font-medium text-bg hover:bg-accent-cyan/90"
                  >
                    <Shield className="h-4 w-4" /> Confirm Violation
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('rejected')}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                  >
                    Reject
                  </button>
                </>
              )}
              <a
                href={`/api/v1/violations/${violation.id}/evidence`}
                download
                className="flex w-full items-center justify-center gap-2 rounded-md border border-ok/40 bg-ok/10 px-4 py-2 text-sm font-medium text-ok hover:bg-ok/15"
              >
                <Download className="h-4 w-4" /> Download Evidence ZIP
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-100">{children}</dd>
    </div>
  );
}
