import axios from 'axios';
import type {
  Camera,
  CameraHealth,
  PeakHourPoint,
  RevenueStats,
  SampleClip,
  Violation,
  ViolationStats,
} from '../types/violation';

// In dev, Vite proxies /api -> http://localhost:8000 (see vite.config.ts).
// In prod, set VITE_API_BASE_URL to the deployed backend, e.g. https://api.example.com/api/v1
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
});

// --- Violations ---

export async function getViolations(params?: {
  camera_id?: string;
  violation_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Violation[]> {
  const { data } = await api.get('/violations/', { params });
  return data;
}

export async function getViolation(id: string): Promise<Violation> {
  const { data } = await api.get(`/violations/${id}`);
  return data;
}

export async function updateViolation(
  id: string,
  update: { status?: string; license_plate?: string }
): Promise<Violation> {
  const { data } = await api.patch(`/violations/${id}`, update);
  return data;
}

export async function getViolationStats(): Promise<ViolationStats> {
  const { data } = await api.get('/violations/stats');
  return data;
}

export async function getPeakHours(days = 7): Promise<PeakHourPoint[]> {
  const { data } = await api.get('/violations/stats/peak-hours', { params: { days } });
  return data;
}

export async function getRevenue(days = 30): Promise<RevenueStats> {
  const { data } = await api.get('/violations/stats/revenue', { params: { days } });
  return data;
}

export async function getCameraHealth(): Promise<CameraHealth[]> {
  const { data } = await api.get('/cameras/health');
  return data;
}

// --- Cameras ---

export async function getCameras(): Promise<Camera[]> {
  const { data } = await api.get('/cameras/');
  return data;
}

export async function createCamera(camera: {
  id: string;
  name: string;
  stream_url: string;
  location?: string;
  lat?: number;
  lng?: number;
  stop_line_geom?: number[][];
}): Promise<Camera> {
  const { data } = await api.post('/cameras/', camera);
  return data;
}

export async function deleteCamera(id: string): Promise<void> {
  await api.delete(`/cameras/${id}`);
}

// --- Processing ---

export interface UploadResponse {
  task_id: string;
  filename: string;
  status: string;
  message: string;
}

export interface ProcessingStatus {
  task_id: string;
  status: string;
  meta?: {
    frames_processed: number;
    total_frames: number;
    violations_found: number;
    camera_id: string;
    progress_pct: number;
  };
  result?: {
    frames_processed: number;
    violations_found: number;
    camera_id: string;
  };
  error?: string;
}

export async function getSamples(): Promise<SampleClip[]> {
  const { data } = await api.get('/process/samples');
  return data;
}

export async function runSample(filename: string): Promise<UploadResponse> {
  const { data } = await api.post('/process/sample', { filename });
  return data;
}

export async function uploadVideo(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/process/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function startStreamProcessing(cameraId: string): Promise<{
  task_id: string;
  status: string;
  message: string;
}> {
  const { data } = await api.post('/process/stream', { camera_id: cameraId });
  return data;
}

export async function getTaskStatus(taskId: string): Promise<ProcessingStatus> {
  const { data } = await api.get(`/process/status/${taskId}`);
  return data;
}
