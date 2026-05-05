export type ViolationType =
  | 'helmet_violation'
  | 'signal_jump'
  | 'wrong_way'
  | 'speeding'
  | 'no_seatbelt'
  | 'illegal_parking';

export type ViolationStatus =
  | 'detected'
  | 'confirmed'
  | 'rejected'
  | 'evidence_generated'
  | 'sent_to_authority';

export interface Violation {
  id: string;
  camera_id: string;
  violation_type: ViolationType;
  status: ViolationStatus;
  license_plate: string | null;
  confidence: number;
  fine_amount?: number;
  clip_url: string | null;
  thumbnail_url: string | null;
  evidence_package_url: string | null;
  location: string | null;
  detected_at: string;
  created_at: string;
}

export interface ViolationStats {
  total_violations: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_camera: Record<string, number>;
  today_count: number;
  this_week_count: number;
}

export interface Camera {
  id: string;
  name: string;
  stream_url: string;
  location: string | null;
  status: string;
  lat?: number | null;
  lng?: number | null;
  stop_line_geom?: number[][] | null;
  last_frame_at?: string | null;
  created_at: string;
}

export interface CameraHealth {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  status: string;
  last_frame_at: string | null;
}

export interface PeakHourPoint {
  hour: number;
  count: number;
}

export interface RevenueStats {
  days: number;
  total_inr: number;
}

export interface SampleClip {
  filename: string;
  label: string;
  description: string;
  expected_violations: string[];
  source?: string | null;
  source_url?: string | null;
  duration_seconds?: number | null;
}
