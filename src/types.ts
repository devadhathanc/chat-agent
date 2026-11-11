export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: Role;
  content: string;
  timestamp: number; // Unix epoch ms
  metadata?: Record<string, unknown>;
}

export interface EpisodicEntity {
  name: string;
  category: string;
  baselinePrice?: string;
  baselineFeatures?: string[];
  notes?: string;
}

export interface EpisodicSnapshot {
  sessionId: string;
  timestamp: number;
  dateLabel: string;
  topic: string;
  entities: EpisodicEntity[];
  userConstraints?: string;
  summary: string;
}

export interface WebSearchQuery {
  query: string;
  entity?: string;
  timeConstraint?: 'past_24h' | 'past_week' | 'past_month';
  intent?: 'pricing' | 'changelog' | 'features' | 'general';
}

export interface WebSearchResultItem {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
  score?: number;
}

export interface WebSearchToolResult {
  query: string;
  results: WebSearchResultItem[];
  cached?: boolean;
}

export type DeltaStatus = 'CONFIRMED_CHANGED' | 'CONFIRMED_UNCHANGED' | 'UNVERIFIABLE_DELTA';

export interface DeltaItem {
  entity: string;
  status: DeltaStatus;
  baseline: string;
  current: string;
  evidenceUrl?: string;
  publishedDate?: string;
  explanation: string;
}
