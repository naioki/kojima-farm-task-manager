// ── Domain Models ─────────────────────────────────────────────

export interface House {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Task {
  id: string;
  house_id: string;
  task_description: string;
  status: 'pending' | 'completed';
  due_date: string | null;
  created_at: string;
}

export interface Log {
  id: string;
  house_id: string;
  raw_transcript: string | null;
  structured_data: StructuredFarmData | null;
  created_at: string;
}

// ── AI Data Models ────────────────────────────────────────────

/** Structured data extracted by Gemini from a voice transcript */
export interface StructuredFarmData {
  Crop_Status: string | null;
  Pest_Control: string | null;
  Next_Task: string | null;
}

// ── Chat UI Models ────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ── API Contract ──────────────────────────────────────────────

export type ConversationPhase = 'initial' | 'awaiting_next_task';

export interface GeminiApiRequest {
  transcript: string;
  houseId: string;
  phase: ConversationPhase;
  /** Partially extracted data carried over from phase 1 into phase 2 */
  partialData?: Partial<StructuredFarmData>;
  /** Original phase-1 transcript, used to build the combined log entry */
  initialTranscript?: string;
}

export interface GeminiApiSuccess {
  reply: string;
  phase: ConversationPhase | 'complete';
  partialData?: Partial<StructuredFarmData>;
  structuredData?: StructuredFarmData;
}

export interface GeminiApiError {
  error: string;
}

export type GeminiApiResponse = GeminiApiSuccess | GeminiApiError;
