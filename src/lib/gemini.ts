import { PracticeQuestion, TranspileResult, VerificationResult } from '../types';

const API_KEY_STORAGE_KEY = 'csdl_gemini_api_key';

export function getStoredApiKey(): string {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const local = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (local && local.trim()) return local.trim();
  }
  const envKey = (import.meta.env?.VITE_GEMINI_API_KEY as string) || '';
  return envKey.trim();
}

export function saveApiKey(key: string): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
  }
}

export function removeApiKey(): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

export function hasApiKey(): boolean {
  return getStoredApiKey().length > 0;
}

// Danh sách các model ưu tiên thử lần lượt (ưu tiên các model ổn định, tải cao nhất trên Google AI Studio)
const MODELS_TO_TRY = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-1.5-pro',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite'
];

/**
 * Gọi Gemini API trực tiếp từ browser qua REST endpoint an toàn với cơ chế tự động chuyển model khi quá tải
 */
async function callGeminiApi(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('Chưa thiết lập Gemini API Key. Vui lòng bấm vào nút "Cài đặt API Key" ở góc trên.');
  }

  let lastError: any = null;

  for (const model of MODELS_TO_TRY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload: any = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        lastError = new Error(`Gemini API Error (${model}): ${message}`);

        // Nếu model bị quá tải (503 / high demand), rate limit (429), không tìm thấy (404) hoặc server error (500), tự động thử model tiếp theo!
        if (
          response.status === 404 ||
          response.status === 429 ||
          response.status === 503 ||
          response.status >= 500 ||
          message.toLowerCase().includes('demand') ||
          message.toLowerCase().includes('quota')
        ) {
          console.warn(`Model ${model} tạm thời không khả dụng (${message}), đang chuyển sang model tiếp theo trong danh sách...`);
          continue;
        }

        throw lastError;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Mô hình không trả về kết quả.');
      }
      return text;
    } catch (err: any) {
      lastError = err;
      console.warn(`Thử model ${model} gặp lỗi:`, err?.message);
      // Tiếp tục thử model kế tiếp để đảm bảo trải nghiệm không bị gián đoạn
      continue;
    }
  }

  throw lastError || new Error('Không thể kết nối đến Google Gemini API');
}

/**
 * MODULE 1: AI Mock Data Generator (Tạo DDL và DML từ text schema, có thể kèm theo câu hỏi để khớp thực thể)
 */
export async function generateMockSqlData(schemaText: string, questionsContext?: string): Promise<string> {
  const systemInstruction = `Bạn là chuyên gia cơ sở dữ liệu.
Nhiệm vụ: Chuyển đổi lược đồ quan hệ dạng text thành mã SQL SQLite (DDL và DML) hợp lệ.
Yêu cầu:
1. Đặt kiểu dữ liệu phù hợp (TEXT, INTEGER, REAL).
2. Tạo 5-10 bản ghi mẫu cho mỗi bảng, dữ liệu thực tế bằng tiếng Việt và có tính liên kết khóa ngoại nhất quán.
3. QUAN TRỌNG: Nếu có danh sách câu hỏi đi kèm, hãy tạo dữ liệu mẫu chứa ĐÚNG các giá trị thực thể được nhắc đến trong câu hỏi (ví dụ: tên giáo viên, tên sinh viên, môn học, năm học, học kỳ, điểm số...) để khi chạy truy vấn, kết quả trả về dữ liệu thực tế chứ không bị rỗng.
4. Chỉ trả về mã SQL thuần, không bọc markdown triple backticks (không \`\`\`sql), không giải thích.`;

  let prompt = `USER SCHEMA:\n${schemaText}\n`;
  if (questionsContext && questionsContext.trim()) {
    prompt += `\nDANH SÁCH CÂU HỎI CỦA ĐỀ BÀI CẦN TẠO DỮ LIỆU KHỚP:\n${questionsContext}\n`;
  }
  prompt += `\nHãy tạo toàn bộ câu lệnh CREATE TABLE và INSERT INTO cho SQLite:`;

  const rawSql = await callGeminiApi(prompt, systemInstruction);
  return cleanCodeFence(rawSql);
}

/**
 * MODULE 3: Transpiler (Dịch biểu thức Đại số quan hệ sang SQLite SELECT)
 */
export async function transpileRelationalAlgebra(
  schemaText: string,
  userExpression: string
): Promise<TranspileResult> {
  if (!hasApiKey()) {
    const localResult = localRuleTranspiler(userExpression);
    if (localResult) return localResult;
    return {
      status: 'error',
      error_message: 'Chưa có Gemini API Key để dịch biểu thức nâng cao. Vui lòng nhập API Key để sử dụng AI Transpiler đầy đủ.'
    };
  }

  const systemInstruction = `Bạn là công cụ biên dịch Đại số quan hệ sang SQL (SQLite dialect).
Nhiệm vụ: Dịch biểu thức Đại số quan hệ được cung cấp thành 1 câu lệnh SELECT duy nhất.
Quy ước ký hiệu:
- σ[điều_kiện](R): Mệnh đề WHERE
- π[danh_sách_cột](R): Mệnh đề SELECT
- R * S hoặc R ⋈ S: Phép kết nối tự nhiên (NATURAL JOIN hoặc JOIN ON các khóa chung)
- R ⋈[điều_kiện] S: Phép kết nối có điều kiện (JOIN ON điều_kiện)
- R ∪ S: Phép hợp (UNION)
- R ∩ S: Phép giao (INTERSECT)
- R - S: Phép trừ (EXCEPT)
- R ÷ S: Phép chia quan hệ
- COUNT, SUM, AVG, MIN, MAX: Các hàm aggregate tương ứng
- Ký hiệu logic: = (bằng), ≠ hoặc != (khác), ≥ hoặc >= (lớn hơn bằng), ≤ hoặc <= (nhỏ hơn bằng), AND (và), OR (hoặc)

QUY TẮC CÚ PHÁP SQL QUAN TRỌNG:
1. Khi có phép kết nối có lồng phép chọn như R ⋈ σ[cond](S) hoặc R * σ[cond](S):
   - Ưu tiên làm phẳng thành câu lệnh JOIN trực tiếp: SELECT R.* FROM R JOIN S ON R.khoa = S.khoa WHERE cond;
   - HOẶC dùng NATURAL JOIN: SELECT * FROM R NATURAL JOIN (SELECT * FROM S WHERE cond);
   - HOẶC nếu dùng subquery với ON thì BẮT BUỘC phải đặt alias: JOIN (SELECT * FROM S WHERE cond) AS S ON R.col = S.col;
   - TUYỆT ĐỐI KHÔNG sinh ra subquery thiếu alias khiến SQLite báo lỗi "no such column".

Chỉ trả về duy nhất định dạng JSON thuần (không bọc markdown):
{
  "status": "success" | "error",
  "sql": "SELECT ...",
  "error_message": "Giải thích ngắn nếu biểu thức không hợp lệ"
}`;

  const prompt = `DATABASE SCHEMA:
${schemaText}

USER RELATIONAL ALGEBRA EXPRESSION:
${userExpression}

Trả về JSON:`;

  try {
    const responseText = await callGeminiApi(prompt, systemInstruction);
    const cleanedJson = extractJson(responseText);
    const parsed = JSON.parse(cleanedJson);

    if (parsed.status === 'success' && parsed.sql) {
      let sql = parsed.sql.trim();
      if (!sql.endsWith(';')) sql += ';';
      return {
        status: 'success',
        sql
      };
    } else {
      return {
        status: 'error',
        error_message: parsed.error_message || 'Biểu thức không hợp lệ hoặc không thể dịch sang SQL.'
      };
    }
  } catch (err: any) {
    const local = localRuleTranspiler(userExpression);
    if (local && local.status === 'success') {
      return local;
    }
    return {
      status: 'error',
      error_message: `Lỗi Transpiler: ${err?.message || err}`
    };
  }
}

/**
 * MODULE 4: Question Generator (Sinh đề bài tự động theo Schema)
 */
export async function generatePracticeQuestions(schemaText: string): Promise<PracticeQuestion[]> {
  const systemInstruction = `Bạn là giảng viên môn Cơ sở dữ liệu trường Đại học Cần Thơ (CTU).
Nhiệm vụ: Dựa trên lược đồ quan hệ được cung cấp, hãy tạo ra 4 câu hỏi bài tập Đại số quan hệ (từ Dễ đến Nâng cao).
Mỗi câu hỏi phải bao gồm:
1. Câu hỏi bằng tiếng Việt rõ ràng, bối cảnh thực tế.
2. Mức độ (Dễ, Trung bình, Khó).
3. Gợi ý hướng giải (dùng phép toán nào).
4. Câu lệnh SQL chuẩn SQLite (expectedSql) để kiểm tra kết quả.
5. Biểu thức ĐSQH mẫu (sampleRelationalAlgebra).

Chỉ trả về JSON thuần (Array):
[
  {
    "id": "q1",
    "question": "...",
    "difficulty": "Dễ" | "Trung bình" | "Khó",
    "hint": "...",
    "expectedSql": "SELECT ...",
    "sampleRelationalAlgebra": "π[...](...)"
  }
]`;

  const prompt = `LƯỢC ĐỒ QUAN HỆ:
${schemaText}

Hãy tạo 4 câu hỏi:`;

  try {
    const responseText = await callGeminiApi(prompt, systemInstruction);
    const cleanedJson = extractJson(responseText);
    return JSON.parse(cleanedJson);
  } catch (err: any) {
    console.error('Lỗi sinh câu hỏi:', err);
    throw new Error(`Không thể sinh câu hỏi: ${err.message}`);
  }
}
/**
 * TÍNH NĂNG MỚI: Phân tích và nạp Đề bài tùy chỉnh do người dùng tự nhập / dán
 */
export async function parseCustomQuestionsFromText(
  rawQuestionsText: string,
  schemaText: string
): Promise<PracticeQuestion[]> {
  if (!rawQuestionsText.trim()) return [];

  // Tách các dòng câu hỏi dựa trên các mẫu phổ biến (Câu 1, 1., -, etc.)
  const rawLines = rawQuestionsText
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => l.length > 3);

  // Nếu số lượng ít (<= 4 câu) và có API key, nhờ AI phân tích chi tiết toàn bộ
  if (rawLines.length <= 4 && hasApiKey()) {
    const systemInstruction = `Bạn là chuyên gia phân tích đề thi môn Cơ sở dữ liệu (Đại số quan hệ).
Nhiệm vụ: Nhận một đoạn văn bản thô chứa các câu hỏi bài tập và lược đồ quan hệ hiện tại.
Hãy phân tích và tạo danh sách các đối tượng bài tập hoàn chỉnh.
Mỗi câu hỏi gồm:
- id: chuỗi id duy nhất (ví dụ "custom-1", "custom-2")
- question: nội dung câu hỏi đã chuẩn hóa
- difficulty: "Dễ" | "Trung bình" | "Khó"
- hint: Gợi ý các bảng cần kết nối và phép toán
- expectedSql: Câu lệnh SQL SQLite SELECT chuẩn chính xác để so sánh dữ liệu
- sampleRelationalAlgebra: Biểu thức Đại số quan hệ mẫu chuẩn giáo trình CTU (dùng π, σ, *, ⋈, etc.)

Chỉ trả về JSON thuần (Array các object):
[
  {
    "id": "...",
    "question": "...",
    "difficulty": "Dễ" | "Trung bình" | "Khó",
    "hint": "...",
    "expectedSql": "SELECT ...",
    "sampleRelationalAlgebra": "π[...](...)"
  }
]`;

    const prompt = `LƯỢC ĐỒ QUAN HỆ:
${schemaText}

VĂN BẢN ĐỀ BÀI CỦA NGƯỜI DÙNG:
${rawQuestionsText}

Hãy trích xuất và sinh câu lệnh SQL chuẩn + ĐSQH mẫu:`;

    try {
      const responseText = await callGeminiApi(prompt, systemInstruction);
      const cleanedJson = extractJson(responseText);
      const parsed = JSON.parse(cleanedJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn('AI không parse được custom questions, chuyển sang trích xuất nhanh:', err);
    }
  }

  // Trích xuất danh sách câu hỏi nhanh (an toàn với số lượng lớn câu hỏi như 10-50 câu)
  const questions: PracticeQuestion[] = [];
  rawLines.forEach((line, idx) => {
    // Chuẩn hóa tiêu đề câu hỏi
    const cleanTitle = line.replace(/^[-*•]\s*/, '').trim();
    questions.push({
      id: `custom-${Date.now()}-${idx + 1}`,
      question: cleanTitle,
      difficulty: 'Trung bình',
      hint: 'Bấm nút "AI Hướng dẫn giải từng bước" bên dưới để xem hướng dẫn chi tiết.',
      expectedSql: '', // Sẽ được sinh động khi sinh viên chọn làm bài hoặc bấm "Tạo lại đáp án chuẩn"
      sampleRelationalAlgebra: ''
    });
  });

  return questions;
}

/**
 * Sinh đáp án chuẩn (SQL + ĐSQH) cho một câu hỏi cụ thể theo yêu cầu
 */
export async function generateExpectedSqlForQuestion(
  question: string,
  schemaText: string
): Promise<{
  expectedSql: string;
  sampleRelationalAlgebra: string;
  hint: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
}> {
  const systemInstruction = `Bạn là giảng viên môn Cơ sở dữ liệu trường Đại học Cần Thơ.
Nhiệm vụ: Phân tích 1 câu hỏi bài tập và tạo câu lệnh SQL SQLite SELECT chuẩn chính xác + Biểu thức ĐSQH mẫu.
Trả về JSON thuần:
{
  "expectedSql": "SELECT ...",
  "sampleRelationalAlgebra": "π[...](...)",
  "hint": "Gợi ý ngắn gọn các bảng và điều kiện",
  "difficulty": "Dễ" | "Trung bình" | "Khó"
}`;

  const prompt = `LƯỢC ĐỒ:
${schemaText}

CÂU HỎI:
${question}

Trả về JSON:`;

  const responseText = await callGeminiApi(prompt, systemInstruction);
  const cleaned = extractJson(responseText);
  return JSON.parse(cleaned);
}

/**
 * Chấm bài thông minh: AI đánh giá trực tiếp bài làm của sinh viên theo ngữ nghĩa câu hỏi
 * Tránh việc phụ thuộc vào SQL đáp án cũ nếu đáp án cũ bị sai lệch hoặc rỗng.
 */
export async function verifyStudentAnswer(
  question: string,
  schemaText: string,
  userAlgebra: string,
  userSql: string,
  currentExpectedSql?: string
): Promise<{
  isCorrect: boolean;
  correctSql: string;
  correctAlgebra?: string;
  feedback: string;
}> {
  if (!hasApiKey()) {
    return {
      isCorrect: false,
      correctSql: currentExpectedSql || '',
      feedback: 'Vui lòng cấu hình Gemini API Key để kích hoạt AI chấm điểm và nhận xét thông minh.'
    };
  }

  const systemInstruction = `Bạn là giảng viên chấm thi môn Cơ sở dữ liệu (Đại số quan hệ).
Nhiệm vụ: Chấm bài làm ĐSQH của sinh viên cho một câu hỏi cụ thể dựa trên Lược đồ quan hệ.

Yêu cầu ĐẶC BIỆT QUAN TRỌNG:
1. Đánh giá tính đúng đắn dựa trên ngữ nghĩa của ĐỀ BÀI và LƯỢC ĐỒ, KHÔNG bị phụ thuộc vào SQL đáp án cũ nếu SQL đáp án cũ sai hoặc là placeholder rỗng.
Ví dụ: Đề bài "Thông tin về quyển sách tiêu đề Mạng máy tính" -> Sinh viên dùng bảng SACH với điều kiện tua = 'Mạng máy tính' là ĐÚNG HOÀN TOÀN! Tuyệt đối không được bắt sinh viên đổi sang bảng TU_KHOA.
2. Trả về isCorrect: true nếu sinh viên chọn đúng bảng, đúng điều kiện và chiếu đúng thuộc tính; false nếu sai hoặc thiếu.
3. Luôn trả về câu lệnh SQL SQLite chuẩn chính xác nhất cho câu hỏi này trong trường "correctSql".
4. Viết nhận xét (feedback) sư phạm ngắn gọn, chỉ rõ ưu điểm hoặc lỗi sai cụ thể.

Chỉ trả về JSON thuần:
{
  "isCorrect": boolean,
  "correctSql": "SELECT ...",
  "correctAlgebra": "π[...](...)",
  "feedback": "Nhận xét của thầy/cô..."
}`;

  const prompt = `LƯỢC ĐỒ QUAN HỆ:
${schemaText}

ĐỀ BÀI:
${question}

BÀI LÀM ĐSQH CỦA SINH VIÊN:
${userAlgebra}

SQL SINH RA TỪ BÀI LÀM:
${userSql}

SQL ĐÁP ÁN THAM KHẢO HIỆN TẠI (nếu có):
${currentExpectedSql || '(Chưa có)'}

Hãy chấm điểm:`;

  try {
    const resText = await callGeminiApi(prompt, systemInstruction);
    const cleaned = extractJson(resText);
    const parsed = JSON.parse(cleaned);
    return {
      isCorrect: Boolean(parsed.isCorrect),
      correctSql: parsed.correctSql || userSql,
      correctAlgebra: parsed.correctAlgebra || '',
      feedback: parsed.feedback || (parsed.isCorrect ? 'Bài làm chính xác!' : 'Bài làm chưa chính xác.')
    };
  } catch (err: any) {
    console.warn('Lỗi chấm điểm AI, dùng fallback:', err);
    throw err;
  }
}

/**
 * TÍNH NĂNG MỚI: Hướng dẫn giải chi tiết từng bước cho câu hỏi bài tập
 */
export async function getStepByStepSolution(
  question: string,
  schemaText: string
): Promise<{
  steps: string[];
  finalAlgebra: string;
  expectedSql: string;
  explanation: string;
}> {
  const systemInstruction = `Bạn là giảng viên môn Cơ sở dữ liệu trường Đại học Cần Thơ.
Nhiệm vụ: Hướng dẫn giải chi tiết từng bước một bài tập Đại số quan hệ.
Cấu trúc các bước:
- Bước 1: Xác định các quan hệ (bảng) cần sử dụng
- Bước 2: Phép kết nối các bảng (kết nối tự nhiên * hoặc kết nối có điều kiện ⋈)
- Bước 3: Phép chọn σ với các vị từ / điều kiện lọc
- Bước 4: Phép chiếu π để lấy đúng các thuộc tính kết quả
- Biểu thức ĐSQH hoàn chỉnh và câu lệnh SQL tương đương.

Chỉ trả về JSON thuần:
{
  "steps": [
    "Bước 1: ...",
    "Bước 2: ...",
    "Bước 3: ...",
    "Bước 4: ..."
  ],
  "finalAlgebra": "π[...](σ[...](...))",
  "expectedSql": "SELECT ...",
  "explanation": "Tóm tắt ngắn gọn tư duy giải bài này"
}`;

  const prompt = `LƯỢC ĐỒ:
${schemaText}

ĐỀ BÀI:
${question}

Hãy giải chi tiết từng bước:`;

  try {
    const responseText = await callGeminiApi(prompt, systemInstruction);
    const cleanedJson = extractJson(responseText);
    return JSON.parse(cleanedJson);
  } catch (err: any) {
    throw new Error(`Không thể tạo hướng dẫn giải: ${err?.message || err}`);
  }
}

/**
 * MODULE 4: Hybrid Verification / Feedback (Nhận xét lỗi sai)
 */
export async function evaluateAnswerFeedback(
  question: string,
  userAlgebra: string,
  userSql: string,
  expectedSql: string,
  userRows: any[][],
  expectedRows: any[][]
): Promise<string> {
  const systemInstruction = `Bạn là trợ giảng môn Cơ sở dữ liệu.
Nhiệm vụ: Đánh giá bài làm Đại số quan hệ của sinh viên và chỉ ra chính xác điểm sai nếu kết quả không khớp với đáp án.
Yêu cầu:
- Ngắn gọn, súc tích, mang tính sư phạm khuyến khích.
- Chỉ rõ lỗi: sai bảng kết nối, thiếu điều kiện chọn WHERE, sai phép chiếu cột, hoặc thiếu liên kết khóa ngoại.`;

  const prompt = `ĐỀ BÀI:
${question}

BIỂU THỨC ĐSQH CỦA SINH VIÊN:
${userAlgebra}

SQL SINH RA TỪ ĐSQH CỦA SINH VIÊN:
${userSql}
Số dòng kết quả sinh viên: ${userRows.length}

SQL CHUẨN CỦA ĐỀ BÀI:
${expectedSql}
Số dòng kết quả mong đợi: ${expectedRows.length}

Hãy nhận xét chi tiết và hướng dẫn sinh viên sửa:`;

  try {
    return await callGeminiApi(prompt, systemInstruction);
  } catch (e: any) {
    return `Kết quả chưa khớp. Sinh viên vui lòng kiểm tra lại phép kết nối bảng và các điều kiện chọn trong biểu thức.`;
  }
}

/**
 * Parser quy tắc cục bộ (Local Transpiler) - hoạt động 100% offline, không độ trễ, không phụ thuộc API Key
 * Hỗ trợ các biểu thức ĐSQH kinh điển:
 * - π[cols](σ[cond](TABLE1 * TABLE2 * ...))
 * - π[cols](TABLE1 * TABLE2 * ...)
 * - σ[cond](TABLE1 * TABLE2 * ...)
 * - TABLE1 * TABLE2
 */
function localRuleTranspiler(expr: string): TranspileResult | null {
  const trimmed = expr.trim();

  // Pattern 1: π[cols](σ[cond](tables))
  const p1 = trimmed.match(/^π\s*\[([^\]]+)\]\s*\(\s*σ\s*\[([^\]]+)\]\s*\((.+)\)\s*\)$/i);
  if (p1) {
    const cols = p1[1].trim();
    const cond = cleanSqlCondition(p1[2]);
    const fromClause = formatFromClause(p1[3]);
    return {
      status: 'success',
      sql: `SELECT DISTINCT ${cols} FROM ${fromClause} WHERE ${cond};`
    };
  }

  // Pattern 2: π[cols](tables)
  const p2 = trimmed.match(/^π\s*\[([^\]]+)\]\s*\((.+)\)\s*$/i);
  if (p2) {
    const cols = p2[1].trim();
    const fromClause = formatFromClause(p2[2]);
    return {
      status: 'success',
      sql: `SELECT DISTINCT ${cols} FROM ${fromClause};`
    };
  }

  // Pattern 3: σ[cond](tables)
  const p3 = trimmed.match(/^σ\s*\[([^\]]+)\]\s*\((.+)\)\s*$/i);
  if (p3) {
    const cond = cleanSqlCondition(p3[1]);
    const fromClause = formatFromClause(p3[2]);
    return {
      status: 'success',
      sql: `SELECT * FROM ${fromClause} WHERE ${cond};`
    };
  }

  // Pattern 3a: π[cols](TABLE1 (* | ⋈) σ[cond](TABLE2))
  const p3a = trimmed.match(/^π\s*\[([^\]]+)\]\s*\(\s*([A-Za-z0-9_]+)\s*(?:\*|⋈)\s*[\[\(]?\s*σ\s*\[([^\]]+)\]\s*\(([A-Za-z0-9_]+)\)\s*[\]\)]?\s*\)$/i);
  if (p3a) {
    const cols = p3a[1].trim();
    const t1 = p3a[2].trim();
    const cond = cleanSqlCondition(p3a[3]);
    const t2 = p3a[4].trim();
    return {
      status: 'success',
      sql: `SELECT DISTINCT ${cols} FROM "${t1}" NATURAL JOIN (SELECT * FROM "${t2}" WHERE ${cond});`
    };
  }

  // Pattern 3b: TABLE1 (* | ⋈) σ[cond](TABLE2) - ví dụ: BAN_SAO_SACH ⋈[σ[tua='Cuốn theo chiều gió'](SACH)]
  const p3b = trimmed.match(/^([A-Za-z0-9_]+)\s*(?:\*|⋈)\s*[\[\(]?\s*σ\s*\[([^\]]+)\]\s*\(([A-Za-z0-9_]+)\)\s*[\]\)]?$/i);
  if (p3b) {
    const t1 = p3b[1].trim();
    const cond = cleanSqlCondition(p3b[2]);
    const t2 = p3b[3].trim();
    return {
      status: 'success',
      sql: `SELECT * FROM "${t1}" NATURAL JOIN (SELECT * FROM "${t2}" WHERE ${cond});`
    };
  }

  // Pattern 3c: σ[cond](TABLE2) (* | ⋈) TABLE1
  const p3c = trimmed.match(/^σ\s*\[([^\]]+)\]\s*\(([A-Za-z0-9_]+)\)\s*(?:\*|⋈)\s*[\[\(]?\s*([A-Za-z0-9_]+)\s*[\]\)]?$/i);
  if (p3c) {
    const cond = cleanSqlCondition(p3c[1]);
    const t2 = p3c[2].trim();
    const t1 = p3c[3].trim();
    return {
      status: 'success',
      sql: `SELECT * FROM "${t1}" NATURAL JOIN (SELECT * FROM "${t2}" WHERE ${cond});`
    };
  }

  // Pattern 4: tables tự nhiên kết: TABLE1 * TABLE2 * TABLE3
  if (trimmed.includes('*') || trimmed.includes('⋈')) {
    const fromClause = formatFromClause(trimmed);
    return {
      status: 'success',
      sql: `SELECT * FROM ${fromClause};`
    };
  }

  return null;
}

function formatFromClause(inner: string): string {
  let cleaned = inner.trim();
  while (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Phân tách bởi dấu * hoặc ⋈
  const parts = cleaned
    .split(/\s*[\*⋈]\s*/)
    .map(p => p.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);

  if (parts.length > 1) {
    return parts.map(p => `"${p}"`).join(' NATURAL JOIN ');
  }

  return `"${cleaned.replace(/^["']|["']$/g, '')}"`;
}

function cleanSqlCondition(cond: string): string {
  let c = cond.trim();
  // Chuyển dấu nháy kép tiếng Việt hoặc chuẩn sang nháy đơn: "text", “text”, ”text” -> 'text'
  c = c.replace(/["“”]/g, "'");
  c = c.replace(/==/g, '=');
  c = c.replace(/!=/g, '<>');
  c = c.replace(/≠/g, '<>');
  c = c.replace(/&&/g, ' AND ');
  c = c.replace(/\|\|/g, ' OR ');
  return c;
}

function cleanCodeFence(text: string): string {
  let clean = text.trim();
  if (clean.startsWith('```sql')) {
    clean = clean.substring(6);
  } else if (clean.startsWith('```')) {
    clean = clean.substring(3);
  }
  if (clean.endsWith('```')) {
    clean = clean.substring(0, clean.length - 3);
  }
  return clean.trim();
}

function extractJson(text: string): string {
  let clean = cleanCodeFence(text);
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');

  let start = -1;
  let end = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = clean.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = clean.lastIndexOf(']');
  }

  if (start !== -1 && end !== -1 && end >= start) {
    return clean.substring(start, end + 1);
  }
  return clean;
}
