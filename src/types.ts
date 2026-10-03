export type Fix = { tunable: string; value: boolean | number };
export type Identity = { id: string; name: string };
export type Sample = {
  step: number;
  ascent: number;
  upright_score: number;
  pelvis_normal_height: number;
  uphill_speed: number;
  line_load_n: number;
  [key: string]: number;
};
export type Result = {
  seed: number;
  steps: number;
  success: boolean;
  failure?: boolean;
  ascent_m: number;
  upright_score: number;
  pelvis_normal_height: number;
};
export type Diagnosis = {
  root_cause: string;
  evidence: string[];
  failing_step: number;
  fix: Fix;
  source?: string;
  mode?: string;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  author: string;
  content: string;
  at: number;
};
export type Room = {
  id: string;
  title: string;
  scenario: string;
  revision: number;
  cursor: number;
  cursor_actor: string | null;
  incident: {
    title: string;
    config: Record<string, any>;
    before: Result;
    after: Result;
    report: Diagnosis;
    telemetry: Sample[];
    telemetry_after: Sample[];
  };
  me: Identity;
  participants: (Identity & { online: boolean })[];
  messages: Message[];
  annotations: { id: string; step: number; text: string; author: string }[];
  diagnosis: Diagnosis | null;
  proposal: {
    id: string;
    fix: Fix;
    reason: string;
    author: Identity;
    approved_by: Identity | null;
    status: string;
  } | null;
  validation: {
    mode: string;
    passed: boolean;
    note: string;
    seeds: { seed: number; before: Result; after: Result }[];
    telemetry_after: Sample[];
  } | null;
  job: {
    id: string;
    kind: string;
    status: string;
    error: string | null;
  } | null;
  events: { id: string; actor: string; action: string; at: number }[];
};
