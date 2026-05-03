export const runtime = 'edge'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import type {
  GeminiApiError,
  GeminiApiRequest,
  GeminiApiSuccess,
  StructuredFarmData,
} from '@/lib/types'

// ── Gemini setup ──────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

// ── Prompt builders ───────────────────────────────────────────

/**
 * Phase 1: Extract all three fields from the initial transcript (Japanese or Thai).
 * Always translate extracted fields to Japanese for database storage.
 * Detect the user's input language (th or ja) for reply localization.
 */
function buildExtractionPrompt(transcript: string): string {
  return `You are a multilingual AI assistant that analyzes farm work reports in Japanese or Thai.

CRITICAL INSTRUCTIONS:
1. Detect the language of the input transcript: "ja" for Japanese, "th" for Thai
2. Extract three fields from the transcript in the language it was provided
3. TRANSLATE each extracted field to Japanese BEFORE adding to the JSON response (this is mandatory for database storage)
4. Always include "detected_language" field in your response

Extract these three fields:
- Crop_Status: Current state of crops (TRANSLATE TO JAPANESE; use null if not mentioned)
- Pest_Control: Information about pests/diseases and control measures (TRANSLATE TO JAPANESE; use null if not mentioned)
- Next_Task: Plan for next work session (TRANSLATE TO JAPANESE; use null if not mentioned)
- detected_language: The language code of the input ("ja" for Japanese or "th" for Thai)

Return ONLY a valid JSON object with no markdown fences and no explanation:

Transcript: ${JSON.stringify(transcript)}

JSON:`
}

/**
 * Phase 2: The user replied with their next task (in Japanese or Thai).
 * Extract Next_Task, translate to Japanese, detect language for reply localization.
 */
function buildNextTaskPrompt(transcript: string): string {
  return `You are a multilingual AI assistant. The user has provided a follow-up response about their next task in Japanese or Thai.

CRITICAL INSTRUCTIONS:
1. Detect the language of the response: "ja" for Japanese, "th" for Thai
2. Extract the "next task" content from the user's message
3. TRANSLATE TO JAPANESE (mandatory for database storage)
4. Return JSON with both fields

Return ONLY a valid JSON object with no markdown:
{"Next_Task": "extracted and translated to Japanese", "detected_language": "ja or th"}

If the task is unclear or missing: {"Next_Task": null, "detected_language": "ja or th"}

User response: ${JSON.stringify(transcript)}

JSON:`
}

// ── JSON extraction helper ────────────────────────────────────

/**
 * Strips markdown code fences that Gemini occasionally wraps around JSON,
 * then parses. Throws if the result is not valid JSON.
 */
function extractJSON(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
  return JSON.parse(cleaned)
}

// ── Supabase helpers ──────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/** Returns tomorrow's date as YYYY-MM-DD in JST (not UTC). */
function tomorrowJST(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}

/**
 * Atomically saves a log entry and its derived task via a single RPC call.
 *
 * The `save_farm_record` PostgreSQL function runs both INSERTs in one
 * transaction (see supabase/migrations/001_save_farm_record_rpc.sql).
 * If either INSERT fails, the entire function is rolled back — no partial
 * state can be committed to the database.
 */
async function saveFarmRecord(
  supabase: SupabaseClient,
  houseId: string,
  rawTranscript: string,
  structuredData: StructuredFarmData,
): Promise<void> {
  const { error } = await supabase.rpc('save_farm_record', {
    p_house_id: houseId,
    p_raw_transcript: rawTranscript,
    p_structured_data: structuredData,
    p_task_description: structuredData.Next_Task,
    p_due_date: tomorrowJST(),
  })
  if (error) throw new Error(`save_farm_record RPC failed: ${error.message}`)
}

// ── Multilingual message builders (Japanese & Thai) ────────

function buildConfirmationReply(data: StructuredFarmData, detectedLanguage: string = 'ja'): string {
  const translations = {
    ja: {
      title: '✅ 作業記録を保存しました！',
      crop: '🌿 作物状況',
      pest: '🐛 病害虫管理',
      next: '📋 次回タスク',
      empty: '（記録なし）',
      closing: '次の作業記録はいつでも話しかけてください。',
    },
    th: {
      title: '✅ บันทึกสถานะเรียบร้อยแล้ว!',
      crop: '🌿 สถานะพืช',
      pest: '🐛 การจัดการศัตรูพืช',
      next: '📋 งานในครั้งต่อไป',
      empty: '(ไม่มีบันทึก)',
      closing: 'คุณสามารถบันทึกการทำงานของคุณได้ตลอดเวลา',
    },
  }

  const t = translations[detectedLanguage] || translations.ja

  return [
    t.title,
    '',
    `${t.crop}: ${data.Crop_Status ?? t.empty}`,
    `${t.pest}: ${data.Pest_Control ?? t.empty}`,
    `${t.next}: ${data.Next_Task}`,
    '',
    t.closing,
  ].join('\n')
}

function buildNextTaskRequestReply(detectedLanguage: string = 'ja'): string {
  const replies = {
    ja: '作業状況を記録しました。\n\n明日はどのような作業を予定していますか？\n具体的に教えていただけると自動でタスクを登録します。\n（例：「トマトの誘引作業」「施肥と水やり」など）',
    th: 'บันทึกสถานะการทำงานเรียบร้อยแล้ว\n\nงานที่คุณวางแผนจะทำเมื่อวันพรุ่งนี้คืออะไร?\nหากคุณระบุรายละเอียดเฉพาะเจาะจง ฉันสามารถลงทะเบียนงานโดยอัตโนมัติได้\n(ตัวอย่าง: "การฝึกอบรมมะเขือเทศ" หรือ "การก่อปุ๋ยและการรดน้ำ")',
  }

  return replies[detectedLanguage] || replies.ja
}

// ── Route handler ─────────────────────────────────────────────

function errorResponse(message: string, status = 500): Response {
  return Response.json({ error: message } satisfies GeminiApiError, { status })
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body: GeminiApiRequest = await request.json()
    const { transcript, houseId, phase, partialData, initialTranscript } = body

    if (!transcript?.trim() || !houseId) {
      return errorResponse('transcript と houseId は必須です', 400)
    }

    const supabase = await createClient()

    // ── Phase 1: Initial extraction ───────────────────────────
    if (phase === 'initial') {
      const geminiResult = await model.generateContent(buildExtractionPrompt(transcript))
      const rawText = geminiResult.response.text()

      let extractedRaw: any
      try {
        extractedRaw = extractJSON(rawText) as any
      } catch (err) {
        console.error('JSON parse failed:', rawText, err)
        return errorResponse('AI応答の解析に失敗しました。もう一度お試しください。')
      }

      const extracted: Partial<StructuredFarmData> = extractedRaw
      const detectedLanguage: string = extractedRaw.detected_language || 'ja'

      // Missing Next_Task → transition to phase 2, ask follow-up in user's language
      if (!extracted.Next_Task) {
        const reply = buildNextTaskRequestReply(detectedLanguage)

        return Response.json({
          reply,
          phase: 'awaiting_next_task',
          partialData: extracted,
        } satisfies GeminiApiSuccess)
      }

      // All fields present → save and confirm in user's language
      const structuredData: StructuredFarmData = {
        Crop_Status: extracted.Crop_Status ?? null,
        Pest_Control: extracted.Pest_Control ?? null,
        Next_Task: extracted.Next_Task,
      }

      await saveFarmRecord(supabase, houseId, transcript, structuredData)

      return Response.json({
        reply: buildConfirmationReply(structuredData, detectedLanguage),
        phase: 'complete',
        structuredData,
      } satisfies GeminiApiSuccess)
    }

    // ── Phase 2: Collect missing Next_Task ────────────────────
    if (phase === 'awaiting_next_task') {
      const geminiResult = await model.generateContent(buildNextTaskPrompt(transcript))
      const rawText = geminiResult.response.text()

      let nextTaskResultRaw: any
      try {
        nextTaskResultRaw = extractJSON(rawText) as any
      } catch {
        // Raw transcript is a reasonable fallback (user just stated the task directly)
        nextTaskResultRaw = { Next_Task: transcript.trim(), detected_language: 'ja' }
      }

      const detectedLanguage: string = nextTaskResultRaw.detected_language || 'ja'
      const nextTaskValue = nextTaskResultRaw.Next_Task

      const structuredData: StructuredFarmData = {
        Crop_Status: partialData?.Crop_Status ?? null,
        Pest_Control: partialData?.Pest_Control ?? null,
        // Prefer extracted value, fall back to raw transcript
        Next_Task: nextTaskValue ?? transcript.trim(),
      }

      // Combine both turns into a single log entry for traceability
      const combinedTranscript = initialTranscript
        ? `[初回報告] ${initialTranscript}\n[次回タスク追記] ${transcript}`
        : transcript

      await saveFarmRecord(supabase, houseId, combinedTranscript, structuredData)

      return Response.json({
        reply: buildConfirmationReply(structuredData, detectedLanguage),
        phase: 'complete',
        structuredData,
      } satisfies GeminiApiSuccess)
    }

    return errorResponse('無効な conversationPhase です', 400)
  } catch (err) {
    console.error('POST /api/gemini error:', err)
    return errorResponse('サーバーエラーが発生しました。しばらく経ってからお試しください。')
  }
}
