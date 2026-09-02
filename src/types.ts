export interface SystemMetric {
  label: string;
  value: string;
  status: 'verified' | 'warning' | 'info';
  detail?: string;
}

export interface ArtifactItem {
  id: string;
  fileName: string;
  status: 'CREATED' | 'UPDATED' | 'INSPECTED' | 'VERIFIED';
  statusColor: string;
  responsibility: string;
  summary: string;
}

export interface ArchitectureRisk {
  id: string;
  title: string;
  description: string;
  mitigation: string;
  severity: 'high' | 'medium' | 'low';
}

export interface CheckFinding {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  selector?: string;
  fixHint?: string;
  time?: number;
  ratio?: number;
  requiredRatio?: number;
  suggestedColor?: string;
}

export type ActiveTab = 'overview' | 'check-gate' | 'architecture' | 'system';
