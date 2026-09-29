import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  RotateCw,
  Lightbulb,
  Table,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  PlusCircle,
  GraduationCap,
  ArrowRight,
  Copy,
  Trash2,
  Code,
  Save,
  CheckCheck
} from 'lucide-react';
import { PracticeQuestion, TableSchema, QueryResult } from '../types';
import { executeQuery } from '../lib/sqlite';
import {
  generatePracticeQuestions,
  transpileRelationalAlgebra,
  evaluateAnswerFeedback,
  getStepByStepSolution,
  verifyStudentAnswer,
  generateExpectedSqlForQuestion
} from '../lib/gemini';
import { PRESET_SCHEMAS } from '../lib/schemaParser';
import { ExpressionEditor } from './ExpressionEditor';
import { CustomQuestionsModal } from './CustomQuestionsModal';

interface PracticeModeProps {
  currentSchemaText: string;
  tables: TableSchema[];
  hasApi: boolean;
  onOpenApiKeyModal: () => void;
  workspaceQuestions?: PracticeQuestion[];
  onSaveQuestions?: (updatedQuestions: PracticeQuestion[]) => void;
  currentPresetId?: string;
  onDatabaseUpdated: () => void;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  currentSchemaText,
  tables,
  hasApi,
  onOpenApiKeyModal,
  workspaceQuestions,
  onSaveQuestions,
  currentPresetId,
  onDatabaseUpdated
}) => {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<PracticeQuestion | null>(null);
  const [userExpression, setUserExpression] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Trạng thái SQL chuẩn và chỉnh sửa đáp án
  const [isGeneratingSql, setIsGeneratingSql] = useState(false);
  const [showSqlEditor, setShowSqlEditor] = useState(false);
  const [editedSql, setEditedSql] = useState('');
  const [editedAlgebra, setEditedAlgebra] = useState('');
  const [isSavedToast, setIsSavedToast] = useState(false);

  // Trạng thái hướng dẫn giải từng bước (AI Teacher)
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [stepSolution, setStepSolution] = useState<{
    steps: string[];
    finalAlgebra: string;
    expectedSql: string;
    explanation: string;
  } | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Kết quả đối chiếu
  const [evalResult, setEvalResult] = useState<{
    evaluated: boolean;
    isCorrect: boolean;
    userResult: QueryResult | null;
    expectedResult: QueryResult | null;
    feedback: string;
    transpiledUserSql?: string;
  } | null>(null);

  // Khởi tạo câu hỏi ban đầu dựa theo workspace hoặc preset
  useEffect(() => {
    if (workspaceQuestions && workspaceQuestions.length > 0) {
      setQuestions(workspaceQuestions);
      setSelectedQuestion(workspaceQuestions[0]);
    } else {
      const preset = PRESET_SCHEMAS.find(p => p.id === currentPresetId);
      if (preset && preset.sampleQuestions.length > 0) {
        setQuestions(preset.sampleQuestions);
        setSelectedQuestion(preset.sampleQuestions[0]);
      } else if (PRESET_SCHEMAS[0].sampleQuestions.length > 0) {
        setQuestions(PRESET_SCHEMAS[0].sampleQuestions);
        setSelectedQuestion(PRESET_SCHEMAS[0].sampleQuestions[0]);
      }
    }
  }, [workspaceQuestions, currentPresetId]);

  // Helper cập nhật questions và đồng bộ với Workspace
  const updateQuestionsAndSync = (newQuestions: PracticeQuestion[]) => {
    setQuestions(newQuestions);
    onSaveQuestions?.(newQuestions);
  };

  // Đổi câu hỏi
  const handleSelectQuestion = (q: PracticeQuestion) => {
    setSelectedQuestion(q);
    setUserExpression('');
    setEvalResult(null);
    setShowHint(false);
    setShowSteps(false);
    setStepSolution(null);
    setShowSqlEditor(false);
    setEditedSql(q.expectedSql || '');
    setEditedAlgebra(q.sampleRelationalAlgebra || '');
  };

  useEffect(() => {
    if (selectedQuestion) {
      setEditedSql(selectedQuestion.expectedSql || '');
      setEditedAlgebra(selectedQuestion.sampleRelationalAlgebra || '');
    }
  }, [selectedQuestion?.id]);

  // AI Tạo / Cập nhật đáp án chuẩn theo yêu cầu cho câu hỏi hiện tại
  const handleGenerateExpectedSql = async () => {
    if (!selectedQuestion) return;
    if (!hasApi) {
      onOpenApiKeyModal();
      return;
    }

    setIsGeneratingSql(true);
    try {
      const res = await generateExpectedSqlForQuestion(selectedQuestion.question, currentSchemaText);
      const updatedQ: PracticeQuestion = {
        ...selectedQuestion,
        expectedSql: res.expectedSql,
        sampleRelationalAlgebra: res.sampleRelationalAlgebra,
        hint: res.hint || selectedQuestion.hint,
        difficulty: res.difficulty || selectedQuestion.difficulty
      };
      setSelectedQuestion(updatedQ);
      setEditedSql(res.expectedSql);
      setEditedAlgebra(res.sampleRelationalAlgebra);
      const updatedQuestions = questions.map(q => q.id === updatedQ.id ? updatedQ : q);
      updateQuestionsAndSync(updatedQuestions);
    } catch (e: any) {
      alert(`Không thể sinh đáp án chuẩn: ${e?.message || e}`);
    } finally {
      setIsGeneratingSql(false);
    }
  };

  // Lưu thủ công SQL đáp án đã chỉnh sửa
  const handleSaveExpectedSql = () => {
    if (!selectedQuestion) return;
    const updatedQ: PracticeQuestion = {
      ...selectedQuestion,
      expectedSql: editedSql.trim(),
      sampleRelationalAlgebra: editedAlgebra.trim()
    };
    setSelectedQuestion(updatedQ);
    const updatedQuestions = questions.map(q => q.id === updatedQ.id ? updatedQ : q);
    updateQuestionsAndSync(updatedQuestions);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2000);
  };

  // Thêm các câu hỏi tự nhập
  const handleCustomQuestionsAdded = (newQuestions: PracticeQuestion[]) => {
    const merged = [...newQuestions, ...questions];
    updateQuestionsAndSync(merged);
    if (newQuestions.length > 0) {
      handleSelectQuestion(newQuestions[0]);
    }
  };

  // Xóa câu hỏi khỏi danh sách
  const handleDeleteQuestion = (e: React.MouseEvent, qId: string) => {
    e.stopPropagation();
    const filtered = questions.filter(q => q.id !== qId);
    if (selectedQuestion?.id === qId) {
      setSelectedQuestion(filtered[0] || null);
    }
    updateQuestionsAndSync(filtered);
  };

  // Lấy hướng dẫn giải chi tiết từng bước
  const handleFetchStepSolution = async () => {
    if (!selectedQuestion) return;
    if (stepSolution) {
      setShowSteps(!showSteps);
      return;
    }
    if (!hasApi) {
      onOpenApiKeyModal();
      return;
    }

    setIsLoadingSteps(true);
    try {
      const res = await getStepByStepSolution(selectedQuestion.question, currentSchemaText);
      setStepSolution(res);
      setShowSteps(true);
    } catch (e: any) {
      alert(`Không thể tải hướng dẫn giải: ${e?.message || e}`);
    } finally {
      setIsLoadingSteps(false);
    }
  };

  // AI sinh danh sách câu hỏi mới dựa theo Schema hiện tại
  const handleGenerateAiQuestions = async () => {
    if (!hasApi) {
      onOpenApiKeyModal();
      return;
    }
    if (!currentSchemaText.trim()) return;

    setIsGeneratingQuestions(true);
    try {
      const newQuestions = await generatePracticeQuestions(currentSchemaText);
      if (newQuestions && newQuestions.length > 0) {
        setQuestions(newQuestions);
        setSelectedQuestion(newQuestions[0]);
        setUserExpression('');
        setEvalResult(null);
      }
    } catch (e: any) {
      alert(`Không thể sinh câu hỏi: ${e?.message || e}`);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Chấm điểm thông minh kết hợp (AI Semantic Verification + Local Data Match)
  const handleVerify = async () => {
    if (!selectedQuestion || !userExpression.trim()) return;

    setIsEvaluating(true);
    setEvalResult(null);

    try {
      // 1. Dịch biểu thức của người dùng sang SQL
      const transpile = await transpileRelationalAlgebra(currentSchemaText, userExpression);
      if (transpile.status === 'error' || !transpile.sql) {
        setEvalResult({
          evaluated: true,
          isCorrect: false,
          userResult: null,
          expectedResult: null,
          feedback: `Lỗi dịch biểu thức ĐSQH: ${transpile.error_message || 'Cú pháp ĐSQH chưa chuẩn hoặc không nhận diện được bảng/cột.'}`
        });
        setIsEvaluating(false);
        return;
      }

      // 2. Chạy SQL của người dùng trong SQLite
      const userRes = await executeQuery(transpile.sql);
      if (userRes.error) {
        setEvalResult({
          evaluated: true,
          isCorrect: false,
          userResult: userRes,
          expectedResult: null,
          feedback: `Biểu thức được dịch sang SQL ("${transpile.sql}") nhưng SQLite báo lỗi: ${userRes.error}. Vui lòng kiểm tra lại tên bảng, tên cột hoặc giá trị lọc.`
        });
        setIsEvaluating(false);
        return;
      }

      // 3. Chấm điểm qua AI nếu có API Key (Đánh giá chuẩn xác theo ngữ nghĩa câu hỏi, không phụ thuộc SQL cũ sai lệch)
      if (hasApi) {
        try {
          const aiEval = await verifyStudentAnswer(
            selectedQuestion.question,
            currentSchemaText,
            userExpression,
            transpile.sql,
            selectedQuestion.expectedSql
          );

          const finalExpectedSql = (aiEval.correctSql && aiEval.correctSql.trim())
            ? aiEval.correctSql
            : (selectedQuestion.expectedSql && selectedQuestion.expectedSql.trim())
            ? selectedQuestion.expectedSql
            : transpile.sql;

          // Cập nhật lại expectedSql và sampleRelationalAlgebra cho câu hỏi để đồng bộ toàn hệ thống
          const updatedQ: PracticeQuestion = {
            ...selectedQuestion,
            expectedSql: finalExpectedSql,
            sampleRelationalAlgebra: aiEval.correctAlgebra || selectedQuestion.sampleRelationalAlgebra
          };
          setSelectedQuestion(updatedQ);
          setEditedSql(finalExpectedSql);
          if (aiEval.correctAlgebra) setEditedAlgebra(aiEval.correctAlgebra);
          setQuestions(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));

          let expectedRes: QueryResult;
          if (aiEval.isCorrect) {
            expectedRes = await executeQuery(finalExpectedSql);
            if (expectedRes.error || expectedRes.rowCount !== userRes.rowCount) {
              expectedRes = userRes;
            }

            confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.6 }
            });

            setEvalResult({
              evaluated: true,
              isCorrect: true,
              userResult: userRes,
              expectedResult: expectedRes,
              feedback: aiEval.feedback || 'Xuất sắc! Biểu thức Đại số quan hệ của bạn hoàn toàn chính xác theo yêu cầu đề bài.',
              transpiledUserSql: transpile.sql
            });
            return;
          } else {
            try {
              expectedRes = await executeQuery(finalExpectedSql);
            } catch {
              expectedRes = { columns: [], values: [], rowCount: 0, executionTimeMs: 0, sqlQuery: finalExpectedSql };
            }

            setEvalResult({
              evaluated: true,
              isCorrect: false,
              userResult: userRes,
              expectedResult: expectedRes,
              feedback: aiEval.feedback || 'Biểu thức của bạn chưa chính xác theo yêu cầu đề bài.',
              transpiledUserSql: transpile.sql
            });
            return;
          }
        } catch (aiErr: any) {
          console.warn('Lỗi AI chấm điểm, chuyển sang đối chiếu SQLite thuần:', aiErr);
        }
      }

      // 4. Fallback khi không có API Key hoặc mạng lỗi (Đối chiếu SQLite thuần nếu đã có expectedSql)
      if (selectedQuestion.expectedSql && selectedQuestion.expectedSql.trim()) {
        const expectedRes = await executeQuery(selectedQuestion.expectedSql);
        const isColsMatch = userRes.columns.length === expectedRes.columns.length;
        const isCountMatch = userRes.rowCount === expectedRes.rowCount;
        const sortedUserRows = [...userRes.values].map(r => JSON.stringify(r)).sort();
        const sortedExpectedRows = [...expectedRes.values].map(r => JSON.stringify(r)).sort();
        const isDataEqual = isCountMatch && sortedUserRows.every((r, idx) => r === sortedExpectedRows[idx]);
        const isTotallyCorrect = isDataEqual && !userRes.error && isColsMatch && !expectedRes.error;

        if (isTotallyCorrect) {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 }
          });
        }

        const feedback = isTotallyCorrect
          ? 'Xuất sắc! Biểu thức Đại số quan hệ của bạn hoàn toàn chính xác và cho ra kết quả trùng khớp 100% với đáp án.'
          : generateFallbackFeedback(userRes, expectedRes);

        setEvalResult({
          evaluated: true,
          isCorrect: isTotallyCorrect,
          userResult: userRes,
          expectedResult: expectedRes,
          feedback,
          transpiledUserSql: transpile.sql
        });
      } else {
        // Chưa có expectedSql và chưa có API
        setEvalResult({
          evaluated: true,
          isCorrect: true,
          userResult: userRes,
          expectedResult: userRes,
          feedback: `Biểu thức đã chạy thành công trên CSDL SQLite (${userRes.rowCount} dòng). Hãy cấu hình Gemini API Key hoặc bấm "Xem / Sửa SQL đáp án" để hệ thống tự động so khớp tính đúng sai.`,
          transpiledUserSql: transpile.sql
        });
      }
    } catch (err: any) {
      setEvalResult({
        evaluated: true,
        isCorrect: false,
        userResult: null,
        expectedResult: null,
        feedback: `Lỗi trong quá trình chấm điểm: ${err?.message || err}`
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const generateFallbackFeedback = (userRes: QueryResult, expRes: QueryResult) => {
    if (userRes.error) {
      return `Lỗi SQLite: ${userRes.error}. Hãy kiểm tra lại các cột và điều kiện kết nối bảng.`;
    }
    if (userRes.rowCount !== expRes.rowCount) {
      return `Số lượng dòng kết quả chưa khớp (Bạn ra ${userRes.rowCount} dòng, đáp án chuẩn cần ${expRes.rowCount} dòng). Có thể bạn chọn sai điều kiện hoặc thiếu phép kết nối bảng.`;
    }
    if (userRes.columns.length !== expRes.columns.length) {
      return `Số lượng thuộc tính chiếu (π) chưa đúng (Bạn chiếu ${userRes.columns.length} cột, đề bài yêu cầu ${expRes.columns.length} cột).`;
    }
    return `Kết quả các bản ghi chưa khớp với đáp án chuẩn. Vui lòng kiểm tra lại điều kiện lọc và thuộc tính chiếu.`;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Phòng Luyện tập &amp; Giải bài tập ĐSQH trực tiếp</span>
          </h2>
          <p className="text-xs text-slate-500">
            Tự nhập đề bài hoặc giải các câu hỏi mẫu, có AI chấm điểm hai lớp &amp; hướng dẫn giải chi tiết
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút tự nhập đề bài của bạn */}
          <button
            onClick={() => setIsCustomModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Tự nhập Đề bài tập của bạn</span>
          </button>

          {/* AI Sinh đề tự động */}
          <button
            onClick={handleGenerateAiQuestions}
            disabled={isGeneratingQuestions}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-all border border-slate-200"
          >
            {isGeneratingQuestions ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang sinh đề...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>AI Sinh Đề ngẫu nhiên</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Question List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            <span>Danh sách bài tập ({questions.length})</span>
            <button
              onClick={() => setIsCustomModalOpen(true)}
              className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 capitalize font-medium"
            >
              <PlusCircle className="w-3 h-3" /> Thêm câu hỏi
            </button>
          </div>
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const isSelected = selectedQuestion?.id === q.id;
              const isCustom = q.id.startsWith('custom');
              return (
                <div
                  key={q.id || idx}
                  onClick={() => handleSelectQuestion(q)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all relative group ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-xs ring-1 ring-indigo-200'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400">Câu {idx + 1}</span>
                      {isCustom && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                          Tự nhập
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          q.difficulty === 'Dễ'
                            ? 'bg-emerald-100 text-emerald-700'
                            : q.difficulty === 'Trung bình'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteQuestion(e, q.id)}
                        title="Xóa câu này"
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug">
                    {q.question}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Question Solver & Evaluation */}
        <div className="lg:col-span-8 space-y-5">
          {selectedQuestion ? (
            <>
              {/* Question Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                        Mức độ: {selectedQuestion.difficulty}
                      </span>
                      {selectedQuestion.id.startsWith('custom') && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                          Đề bài tự nhập
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                      {selectedQuestion.question}
                    </h3>
                  </div>
                </div>

                {/* Helper action toggles */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
                  {/* Hint Toggle */}
                  {selectedQuestion.hint && (
                    <button
                      type="button"
                      onClick={() => setShowHint(!showHint)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors border border-amber-200/60"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span>{showHint ? 'Ẩn gợi ý' : 'Gợi ý giải'}</span>
                      {showHint ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {/* Step-by-Step AI Teacher Guide */}
                  <button
                    type="button"
                    onClick={handleFetchStepSolution}
                    disabled={isLoadingSteps}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors border border-indigo-200/60 disabled:opacity-50"
                  >
                    {isLoadingSteps ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang suy nghĩ các bước...</span>
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <span>{showSteps ? 'Ẩn hướng dẫn giải' : 'AI Hướng dẫn giải từng bước'}</span>
                        {showSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </>
                    )}
                  </button>

                  {/* AI Generate/Regenerate Expected Answer */}
                  <button
                    type="button"
                    onClick={handleGenerateExpectedSql}
                    disabled={isGeneratingSql}
                    title="Yêu cầu AI phân tích lại câu hỏi và tạo đáp án SQL chuẩn"
                    className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors border border-purple-200/60 disabled:opacity-50"
                  >
                    {isGeneratingSql ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang tạo đáp án...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>AI Sinh đáp án chuẩn</span>
                      </>
                    )}
                  </button>

                  {/* View / Edit Expected Answer SQL */}
                  <button
                    type="button"
                    onClick={() => setShowSqlEditor(!showSqlEditor)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-300"
                  >
                    <Code className="w-4 h-4 text-slate-600" />
                    <span>{showSqlEditor ? 'Ẩn SQL đáp án' : 'Xem / Sửa SQL đáp án'}</span>
                    {showSqlEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* View / Edit SQL panel */}
                {showSqlEditor && (
                  <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 text-xs animate-in fade-in border border-slate-700 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold text-slate-200">SQL Đáp án chuẩn của câu hỏi này</span>
                      </div>
                      {isSavedToast && (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5" /> Đã lưu đáp án!
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Hệ thống sẽ chạy câu lệnh SQL này trong SQLite để lấy kết quả bảng đối chiếu khi bạn làm bài. Bạn có thể tự chỉnh sửa hoặc bấm &quot;AI Sinh đáp án chuẩn&quot;.
                    </p>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300 block">Câu lệnh SQL chuẩn:</label>
                      <textarea
                        value={editedSql}
                        onChange={(e) => setEditedSql(e.target.value)}
                        rows={2}
                        placeholder="SELECT * FROM ..."
                        className="w-full font-mono text-xs bg-slate-950 text-emerald-400 rounded-lg p-2.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300 block">Biểu thức ĐSQH mẫu (tùy chọn):</label>
                      <input
                        type="text"
                        value={editedAlgebra}
                        onChange={(e) => setEditedAlgebra(e.target.value)}
                        placeholder="π[...](...)"
                        className="w-full font-mono text-xs bg-slate-950 text-indigo-300 rounded-lg p-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveExpectedSql}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu thay đổi</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Hint content */}
                {showHint && selectedQuestion.hint && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 animate-in fade-in">
                    {selectedQuestion.hint}
                  </div>
                )}

                {/* Step-by-step guidance content */}
                {showSteps && stepSolution && (
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 text-xs animate-in fade-in">
                    <div className="font-bold text-indigo-900 flex items-center gap-1.5 text-sm">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>Hướng dẫn giải chi tiết từ Trợ giảng:</span>
                    </div>

                    <p className="text-slate-700 italic">{stepSolution.explanation}</p>

                    <div className="space-y-1.5">
                      {stepSolution.steps.map((st, i) => (
                        <div key={i} className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-indigo-100">
                          <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-slate-800 font-medium">{st}</span>
                        </div>
                      ))}
                    </div>

                    {stepSolution.finalAlgebra && (
                      <div className="pt-2 border-t border-indigo-200 flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-100">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Biểu thức ĐSQH mẫu:</span>
                          <code className="text-indigo-900 font-mono font-bold text-xs">{stepSolution.finalAlgebra}</code>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUserExpression(stepSolution.finalAlgebra)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Dán vào ô giải</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Expression Editor for Quiz */}
              <ExpressionEditor
                expression={userExpression}
                onChange={setUserExpression}
                onExecute={handleVerify}
                isLoading={isEvaluating}
                tables={tables}
              />

              {/* Evaluation Result View */}
              {evalResult && (
                <div
                  className={`rounded-2xl border p-5 space-y-4 shadow-sm animate-in fade-in duration-200 ${
                    evalResult.isCorrect
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : 'bg-rose-50/60 border-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {evalResult.isCorrect ? (
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                          <XCircle className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h4
                          className={`text-sm font-bold ${
                            evalResult.isCorrect ? 'text-emerald-900' : 'text-rose-900'
                          }`}
                        >
                          {evalResult.isCorrect ? 'KẾT QUẢ CHÍNH XÁC!' : 'KẾT QUẢ CHƯA ĐÚNG'}
                        </h4>
                        <p className="text-xs text-slate-600">
                          {evalResult.isCorrect
                            ? 'Dữ liệu trả về hoàn toàn khớp với truy vấn chuẩn.'
                            : 'Hãy đọc nhận xét chi tiết của AI bên dưới để sửa lại.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Feedback */}
                  <div className="bg-white/90 rounded-xl border border-slate-200 p-4 text-xs space-y-1.5 shadow-2xs">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Nhận xét sư phạm từ Trợ giảng AI:</span>
                    </div>
                    <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {evalResult.feedback}
                    </div>
                  </div>

                  {/* Table Comparison View */}
                  {evalResult.userResult && evalResult.expectedResult && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {/* User's result */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>Kết quả của bạn ({evalResult.userResult.rowCount} dòng)</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {evalResult.userResult.columns.join(', ')}
                          </span>
                        </div>
                        <div className="overflow-x-auto max-h-40 border border-slate-100 rounded-lg">
                          <table className="w-full text-[11px] text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                              <tr>
                                {evalResult.userResult.columns.map(c => (
                                  <th key={c} className="py-1 px-2 font-mono whitespace-nowrap">{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {evalResult.userResult.values.slice(0, 5).map((r, i) => (
                                <tr key={i}>
                                  {r.map((cell, ci) => (
                                    <td key={ci} className="py-1 px-2 whitespace-nowrap">{String(cell)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Expected result */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>Đáp án chuẩn ({evalResult.expectedResult.rowCount} dòng)</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {evalResult.expectedResult.columns.join(', ')}
                          </span>
                        </div>
                        <div className="overflow-x-auto max-h-40 border border-slate-100 rounded-lg">
                          <table className="w-full text-[11px] text-left">
                            <thead className="bg-emerald-50 border-b border-emerald-200 font-semibold text-emerald-800">
                              <tr>
                                {evalResult.expectedResult.columns.map(c => (
                                  <th key={c} className="py-1 px-2 font-mono whitespace-nowrap">{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {evalResult.expectedResult.values.slice(0, 5).map((r, i) => (
                                <tr key={i}>
                                  {r.map((cell, ci) => (
                                    <td key={ci} className="py-1 px-2 whitespace-nowrap">{String(cell)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Chọn một bài tập ở danh sách bên trái hoặc bấm &quot;+ Tự nhập Đề bài tập của bạn&quot; để bắt đầu làm bài.
            </div>
          )}
        </div>
      </div>

      {/* Modal tự nhập đề bài tập */}
      <CustomQuestionsModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        schemaText={currentSchemaText}
        onQuestionsAdded={handleCustomQuestionsAdded}
        onDatabaseUpdated={onDatabaseUpdated}
        hasApi={hasApi}
        onOpenApiKeyModal={onOpenApiKeyModal}
      />
    </div>
  );
};
