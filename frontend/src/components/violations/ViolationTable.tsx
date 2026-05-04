import { format } from 'date-fns';
import type { Violation } from '../../types/violation';

interface ViolationTableProps {
  violations: Violation[];
  onSelect: (violation: Violation) => void;
}

const statusColors: Record<string, string> = {
  detected: 'bg-warning/15 text-warning',
  confirmed: 'bg-accent-cyan/15 text-accent-cyan',
  rejected: 'bg-slate-700/40 text-slate-400',
  evidence_generated: 'bg-ok/15 text-ok',
  sent_to_authority: 'bg-purple-500/15 text-purple-300',
};

const typeLabels: Record<string, string> = {
  helmet_violation: 'No Helmet',
  signal_jump: 'Red Light',
  wrong_way: 'Wrong Way',
  speeding: 'Speeding',
  no_seatbelt: 'No Seatbelt',
  illegal_parking: 'Illegal Parking',
};

export default function ViolationTable({
  violations,
  onSelect,
}: ViolationTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-elevated">
      <table className="min-w-full divide-y divide-border-subtle">
        <thead className="bg-bg-card">
          <tr>
            {['Type', 'Camera', 'Plate', 'Confidence', 'Status', 'Detected'].map((h) => (
              <th
                key={h}
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {violations.map((v) => (
            <tr
              key={v.id}
              onClick={() => onSelect(v)}
              className="cursor-pointer transition-colors hover:bg-white/5"
            >
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-100">
                {typeLabels[v.violation_type] ?? v.violation_type}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                {v.camera_id}
              </td>
              <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-100">
                {v.license_plate ?? '—'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                {(v.confidence * 100).toFixed(1)}%
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    statusColors[v.status] ?? ''
                  }`}
                >
                  {v.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                {format(new Date(v.detected_at), 'MMM d, yyyy HH:mm')}
              </td>
            </tr>
          ))}
          {violations.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-12 text-center text-sm text-slate-500"
              >
                No violations found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
