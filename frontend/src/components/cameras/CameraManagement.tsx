import { useCallback, useEffect, useState } from 'react';
import { Camera, Plus, Trash2, Play, Video } from 'lucide-react';
import {
  getCameras,
  createCamera,
  deleteCamera,
  startStreamProcessing,
} from '../../services/api';
import type { Camera as CameraType } from '../../types/violation';

export default function CameraManagement() {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');

  const fetchCameras = useCallback(async () => {
    try {
      const data = await getCameras();
      setCameras(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cameras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createCamera({
        id: formId,
        name: formName,
        stream_url: formUrl,
        location: formLocation || undefined,
        lat: formLat ? parseFloat(formLat) : undefined,
        lng: formLng ? parseFloat(formLng) : undefined,
      });
      setShowForm(false);
      setFormId('');
      setFormName('');
      setFormUrl('');
      setFormLocation('');
      setFormLat('');
      setFormLng('');
      setSuccess('Camera added');
      fetchCameras();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create camera');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this camera?')) return;
    try {
      await deleteCamera(id);
      setSuccess('Camera deleted');
      fetchCameras();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleStartProcessing = async (cameraId: string) => {
    try {
      const result = await startStreamProcessing(cameraId);
      setSuccess(`${result.message} (Task: ${result.task_id.slice(0, 8)}…)`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to start processing');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500">Loading cameras...</p>
      </div>
    );
  }

  const inputCls =
    'mt-1 block w-full rounded-md border-border-subtle bg-bg-card text-sm text-slate-100 placeholder-slate-500 focus:border-accent-cyan focus:ring-accent-cyan';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-100">Cameras</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-md bg-accent-cyan px-4 py-2 text-sm font-medium text-bg hover:bg-accent-cyan/90"
        >
          <Plus className="h-4 w-4" /> Add Camera
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-ok/40 bg-ok/10 p-4 text-sm text-ok">
          {success}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-border-subtle bg-bg-elevated p-6"
        >
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Add New Camera</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Camera ID">
              <input
                type="text"
                required
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="cam-01"
                className={inputCls}
              />
            </Field>
            <Field label="Name">
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Main Street Camera"
                className={inputCls}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Stream URL">
                <input
                  type="text"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="rtsp://192.168.1.100:554/stream"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Location (optional)">
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Hyderabad — Banjara Hills"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Latitude (optional)">
              <input
                type="number"
                step="any"
                value={formLat}
                onChange={(e) => setFormLat(e.target.value)}
                placeholder="17.41"
                className={inputCls}
              />
            </Field>
            <Field label="Longitude (optional)">
              <input
                type="number"
                step="any"
                value={formLng}
                onChange={(e) => setFormLng(e.target.value)}
                placeholder="78.45"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-accent-cyan px-4 py-2 text-sm font-medium text-bg hover:bg-accent-cyan/90"
            >
              Add Camera
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {cameras.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-elevated p-12 text-center">
          <Camera className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-slate-400">No cameras registered yet.</p>
          <p className="text-sm text-slate-500">Add one to start monitoring.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cameras.map((cam) => (
            <div
              key={cam.id}
              className="rounded-lg border border-border-subtle bg-bg-elevated p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-md p-2 ${
                      cam.status === 'active' ? 'bg-ok/15' : 'bg-slate-700/40'
                    }`}
                  >
                    <Video
                      className={`h-5 w-5 ${
                        cam.status === 'active' ? 'text-ok' : 'text-slate-500'
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-100">{cam.name}</h4>
                    <p className="text-xs text-slate-500">{cam.id}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    cam.status === 'active'
                      ? 'bg-ok/15 text-ok'
                      : 'bg-slate-700/40 text-slate-400'
                  }`}
                >
                  {cam.status}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-400">
                <p className="truncate" title={cam.stream_url}>
                  {cam.stream_url}
                </p>
                {cam.location && <p>{cam.location}</p>}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleStartProcessing(cam.id)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-accent-cyan/15 px-3 py-1.5 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/25"
                >
                  <Play className="h-3 w-3" /> Start
                </button>
                <button
                  onClick={() => handleDelete(cam.id)}
                  className="flex items-center justify-center gap-1 rounded-md bg-danger/15 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/25"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      {children}
    </div>
  );
}
