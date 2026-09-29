import React, { useState } from 'react';
import { PlusCircle, Sparkles, X, FileText, Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { PracticeQuestion } from '../types';
import { parseCustomQuestionsFromText, generateMockSqlData } from '../lib/gemini';
import { executeSqlScript, resetDatabase } from '../lib/sqlite';

interface CustomQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schemaText: string;
  onQuestionsAdded: (newQuestions: PracticeQuestion[]) => void;
  onDatabaseUpdated: () => void;
  hasApi: boolean;
  onOpenApiKeyModal: () => void;
}

export const CustomQuestionsModal: React.FC<CustomQuestionsModalProps> = ({
  isOpen,
  onClose,
  schemaText,
  onQuestionsAdded,
  onDatabaseUpdated,
  hasApi,
  onOpenApiKeyModal
}) => {
  const [activeTab, setActiveTab] = useState<'bulk' | 'single'>('bulk');
  const [bulkText, setBulkText] = useState<string>(
`1. Thông tin về quyển sách tiêu đề Mạng máy tính?
2. Cho biết họ tên và phái của các độc giả ở Cần Thơ?
3. Tìm những sinh viên có học các môn học có 3 tín chỉ.`
  );
  const [singleText, setSingleText] = useState<string>('');
  const [singleDifficulty, setSingleDifficulty] = useState<'Dễ' | 'Trung bình' | 'Khó'>('Trung bình');
  const [singleExpectedSql, setSingleExpectedSql] = useState<string>('');
  const [singleSampleAlgebra, setSingleSampleAlgebra] = useState<string>('');
  const [singleHint, setSingleHint] = useState<string>('');
  const [syncMockData, setSyncMockData] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcess = async () => {
    if (activeTab === 'single') {
      const qText = singleText.trim();
      if (!qText) {
        setErrorMsg('Vui lòng nhập nội dung câu hỏi trước khi thêm.');
        return;
      }

      const newQ: PracticeQuestion = {
        id: `custom-${Date.now()}-1`,
        question: qText,
        difficulty: singleDifficulty,
        hint: singleHint.trim() || 'Bấm nút "AI Hướng dẫn giải từng bước" hoặc "AI Sinh đáp án chuẩn" để xem hướng dẫn.',
        expectedSql: singleExpectedSql.trim(),
        sampleRelationalAlgebra: singleSampleAlgebra.trim()
      };

      onQuestionsAdded([newQ]);
      onClose();
      return;
    }

    // Bulk tab
    const textToProcess = bulkText.trim();
    if (!textToProcess) {
      setErrorMsg('Vui lòng nhập nội dung danh sách câu hỏi trước khi thêm.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Phân tích câu hỏi
      const questions = await parseCustomQuestionsFromText(textToProcess, schemaText);
      if (!questions || questions.length === 0) {
        throw new Error('Không trích xuất được câu hỏi nào từ nội dung vừa nhập.');
      }

      // 2. Nếu người dùng chủ động chọn tạo lại mock data và có API
      if (syncMockData && hasApi) {
        try {
          const generatedSql = await generateMockSqlData(schemaText, textToProcess);
          await resetDatabase();
          await executeSqlScript(generatedSql);
          onDatabaseUpdated();
        } catch (dbErr) {
          console.warn('Lỗi sinh mock data kèm câu hỏi:', dbErr);
        }
      }

      onQuestionsAdded(questions);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi phân tích câu hỏi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Tự nhập Đề bài tập để giải</h3>
            <p className="text-xs text-slate-500">
              Dán câu hỏi từ đề thi / bài tập của bạn, AI sẽ hỗ trợ kiểm tra và chấm điểm trực tiếp
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'bulk'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dán danh sách nhiều câu (Bulk Paste)
          </button>
          <button
            onClick={() => setActiveTab('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'single'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Thêm nhanh 1 câu hỏi
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto space-y-3 py-1">
          {activeTab === 'bulk' ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Dán toàn bộ các câu hỏi (mỗi câu một dòng hoặc ghi dạng &quot;Câu 1:&quot;, &quot;Câu 2:&quot;):
              </label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                placeholder="Câu 1: ...&#10;Câu 2: ...&#10;Câu 3: ..."
                className="w-full font-sans text-xs sm:text-sm bg-slate-900 text-indigo-200 rounded-xl p-3 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y leading-relaxed shadow-inner"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Nội dung câu hỏi bài tập cần giải: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={singleText}
                  onChange={(e) => setSingleText(e.target.value)}
                  rows={3}
                  placeholder="Ví dụ: 1. Thông tin về quyển sách tiêu đề Mạng máy tính?"
                  className="w-full font-sans text-xs sm:text-sm bg-slate-900 text-indigo-200 rounded-xl p-3 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y leading-relaxed shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mức độ:</label>
                  <select
                    value={singleDifficulty}
                    onChange={(e: any) => setSingleDifficulty(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  >
                    <option value="Dễ">Dễ</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Khó">Khó</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Gợi ý giải (tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={singleHint}
                    onChange={(e) => setSingleHint(e.target.value)}
                    placeholder="Ví dụ: Dùng bảng SACH và điều kiện tua = ..."
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Câu lệnh SQL chuẩn để so sánh (tùy chọn, để trống AI sẽ tự sinh):
                </label>
                <input
                  type="text"
                  value={singleExpectedSql}
                  onChange={(e) => setSingleExpectedSql(e.target.value)}
                  placeholder="SELECT * FROM SACH WHERE tua = 'Mạng máy tính'"
                  className="w-full font-mono text-xs bg-slate-900 text-emerald-400 rounded-lg p-2 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Biểu thức ĐSQH mẫu (tùy chọn):
                </label>
                <input
                  type="text"
                  value={singleSampleAlgebra}
                  onChange={(e) => setSingleSampleAlgebra(e.target.value)}
                  placeholder="σ[tua='Mạng máy tính'](SACH)"
                  className="w-full font-mono text-xs bg-slate-900 text-indigo-300 rounded-lg p-2 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Sync Mock Data Option */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={syncMockData}
                onChange={(e) => setSyncMockData(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  Sinh lại dữ liệu mẫu tự động khớp các thực thể trong câu hỏi
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                  <strong className="text-amber-700">Lưu ý:</strong> Tùy chọn này sẽ ghi đè và nạp lại dữ liệu trong RAM. Nếu bạn đã tải file Excel hoặc nhập dữ liệu của riêng mình trước đó, <strong className="text-rose-600">hãy để trống tùy chọn này</strong> để giữ nguyên dữ liệu thực tế.
                </p>
              </div>
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI sẽ tự động tính toán đáp án chuẩn và các gợi ý</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleProcess}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xử lý & Phân tích...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Thêm vào Phòng Luyện tập</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
