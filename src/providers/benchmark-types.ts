import type { RoutingMode } from "./router.js";

export type BenchmarkSource = "manual" | "receipt";

export interface ProviderBenchmarkRecord {
  schemaVersion: 1;
  id: string;
  providerId: string;
  mode: RoutingMode;
  recordedAt: string;
  success: boolean;
  durationMs: number;
  costEur: number;
  qualityScore?: number;
  source: BenchmarkSource;
}

export interface ProviderBenchmarkStore {
  schemaVersion: 1;
  records: ProviderBenchmarkRecord[];
}

export interface ProviderBenchmarkSummary {
  providerId: string;
  mode: RoutingMode;
  sampleCount: number;
  successCount: number;
  successRate: number;
  medianDurationMs: number;
  averageCostEur: number;
  qualitySampleCount: number;
  averageQualityScore?: number;
  trustedForRouting: boolean;
}

export interface BenchmarkRecordInput {
  providerId: string;
  mode: RoutingMode;
  success: boolean;
  durationMs: number;
  costEur: number;
  qualityScore?: number;
  source?: BenchmarkSource;
}
