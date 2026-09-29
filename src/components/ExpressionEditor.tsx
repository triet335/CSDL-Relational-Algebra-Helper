import React, { useRef, useMemo } from 'react';
import { Play, Trash2, Sparkles, HelpCircle, Code, Eye, Loader2 } from 'lucide-react';
import { VirtualKeyboard } from './VirtualKeyboard';
import { TableSchema } from '../types';
import { formatRelationalAlgebraToLatex, renderToKatexHtml } from '../lib/katexConverter';

interface ExpressionEditorProps {
  expression: string;
  onChange: (val: string) => void;
  onExecute: () => void;
  isLoading: boolean;
  tables: TableSchema[];
}

export const ExpressionEditor: React.FC<ExpressionEditorProps> = ({
  expression,
  onChange,
  onExecute,
  isLoading,
  tables
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Chèn chuỗi ký hiệu tại vị trí con trỏ (Cursor Insertion) mà không làm mất focus
  const handleInsert = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(expression + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = expression.substring(0, start);
    const after = expression.substring(end);

    const newExpression = before + textToInsert + after;
    onChange(newExpression);

    // Tính toán vị trí con trỏ thông minh:
    // Nếu chèn dạng "σ[]()", đặt con trỏ vào giữa dấu ngoặc vuông "[" và "]"
    let newCursorPos = start + textToInsert.length;
    if (textToInsert.includes('[]')) {
      newCursorPos = start + textToInsert.indexOf('[]') + 1;
    } else if (textToInsert.includes('()')) {
      newCursorPos = start + textToInsert.indexOf('()') + 1;
    } else if (textToInsert === "''") {
      newCursorPos = start + 1;
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Tính toán chuỗi LaTeX và chuỗi HTML KaTeX theo thời gian thực
  const latexString = useMemo(() => {
    return formatRelationalAlgebraToLatex(expression);
  }, [expression]);

  const katexHtml = useMemo(() => {
    return renderToKatexHtml(latexString);
  }, [latexString]);

  // Các ví dụ mẫu nhanh
  const sampleQueries = [
    {
      name: 'Chọn (σ)',
      query: "σ[diachi = 'Cần Thơ'](SINHVIEN)"
    },
    {
      name: 'Chiếu (π)',
      query: 'π[MASV, hoten, SDT](SINHVIEN)'
    },
    {
      name: 'Kết nối tự nhiên (*)',
      query: 'π[hoten, tenlop](SINHVIEN * LOP)'
    },
    {
      name: 'Chọn + Kết nối + Chiếu',
      query: "π[hoten, diem](σ[diem >= 8.0](SINHVIEN * KETQUA))"
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
            σπ
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Soạn thảo Biểu thức Đại số Quan hệ</h3>
            <p className="text-[11px] text-slate-500">Gõ bàn phím tự do kết hợp bấm nút chèn ký hiệu</p>
          </div>
        </div>

        {/* Mẫu nhanh */}
        <div className="hidden sm:flex items-center gap-1 text-xs">
          <span className="text-[11px] text-slate-400 font-medium">Mẫu nhanh:</span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(sq.query)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition-colors"
            >
              {sq.name}
            </button>
          ))}
        </div>
      </div>

      {/* Virtual Keyboard Toolbar */}
      <VirtualKeyboard onInsert={handleInsert} tables={tables} />

      {/* Hybrid Textarea Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold uppercase text-[11px] tracking-wider text-slate-600 flex items-center gap-1">
            <Code className="w-3.5 h-3.5" />
            Biểu thức ĐSQH của bạn:
          </span>
          {expression && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Xóa ô nhập
            </button>
          )}
        </div>
        <textarea
          ref={textareaRef}
          value={expression}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="Ví dụ: π[hoten, tenlop](σ[tenlop='DI2096A1'](SINHVIEN * LOP))"
          className="w-full font-mono text-sm sm:text-base bg-slate-950 text-sky-300 rounded-xl p-3.5 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y leading-relaxed shadow-inner"
        />
      </div>

      {/* Real-time KaTeX Live Preview */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold uppercase text-[11px] tracking-wider text-slate-600 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            Xem trước công thức (KaTeX Live Preview):
          </span>
          <span className="text-[10px] text-slate-400">Chuẩn tài liệu giáo trình</span>
        </div>
        <div className="min-h-[64px] bg-blue-50/40 border border-blue-100 rounded-xl p-4 flex items-center justify-center text-center overflow-x-auto shadow-2xs">
          <div
            className="text-base sm:text-lg text-slate-800 font-serif leading-relaxed"
            dangerouslySetInnerHTML={{ __html: katexHtml }}
          />
        </div>
      </div>

      {/* Execution Actions */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>AI sẽ biên dịch ĐSQH sang câu lệnh SQL SELECT tương ứng</span>
        </div>

        <button
          type="button"
          onClick={onExecute}
          disabled={isLoading || !expression.trim()}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang dịch & Thực thi...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Chạy thử & Kiểm tra</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
