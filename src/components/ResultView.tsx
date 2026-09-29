import React, { useState } from 'react';
import { Table, Code2, Copy, Check, AlertTriangle, Clock, ListChecks } from 'lucide-react';
import { QueryResult } from '../types';

interface ResultViewProps {
  transpiledSql: string | null;
  queryResult: QueryResult | null;
  transpileError: string | null;
}

export const ResultView: React.FC<ResultViewProps> = ({
  transpiledSql,
  queryResult,
  transpileError
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    if (!transpiledSql) return;
    navigator.clipboard.writeText(transpiledSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!transpiledSql && !queryResult && !transpileError) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Table className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700 mb-1">Chưa có kết quả thực thi</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Nhập biểu thức Đại số quan hệ ở trên và bấm <strong>&quot;Chạy thử &amp; Kiểm tra&quot;</strong> để xem kết quả tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-6">
      {/* Transpiler Error State */}
      {transpileError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Không thể dịch biểu thức Đại số Quan hệ:</span>
          </div>
          <p className="font-mono text-rose-700 bg-white/70 p-2.5 rounded-lg border border-rose-100">
            {transpileError}
          </p>
          <p className="text-slate-600">
            Gợi ý: Kiểm tra lại tên bảng, tên thuộc tính xem đã đúng với Schema hiện tại chưa, hoặc các cặp dấu ngoặc vuông <code>[...]</code> và tròn <code>(...)</code> đã đóng đủ chưa.
          </p>
        </div>
      )}

      {/* Transpiled SQL Query View */}
      {transpiledSql && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-slate-300">Câu lệnh SQL được dịch (Transpiled SQL):</span>
            </div>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Sao chép SQL</span>
                </>
              )}
            </button>
          </div>
          <div className="p-3 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {transpiledSql}
          </div>
        </div>
      )}

      {/* SQLite Execution Error */}
      {queryResult?.error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Lỗi thực thi SQLite Database:</span>
          </div>
          <p className="font-mono bg-white p-2 rounded border border-amber-200 text-amber-700">
            {queryResult.error}
          </p>
        </div>
      )}

      {/* Resulting Table Data */}
      {queryResult && !queryResult.error && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-600" />
              <span className="font-bold uppercase tracking-wider text-slate-700">
                Bảng Kết quả Truy vấn
              </span>
              <span className="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                {queryResult.rowCount} bản ghi
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <Clock className="w-3 h-3" />
              <span>{queryResult.executionTimeMs} ms</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto max-h-80 shadow-xs">
            {queryResult.columns.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
                    <th className="py-2 px-3 text-slate-400 w-10 text-center font-mono">#</th>
                    {queryResult.columns.map(c => (
                      <th key={c} className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queryResult.values.length > 0 ? (
                    queryResult.values.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-1.5 px-3 text-slate-400 text-center font-mono text-[11px]">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-1.5 px-3 text-slate-800 whitespace-nowrap font-sans">
                            {cell === null || cell === undefined ? (
                              <span className="text-slate-300 italic text-[11px]">NULL</span>
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={queryResult.columns.length + 1} className="py-6 text-center text-slate-400 italic">
                        Truy vấn thành công nhưng không có bản ghi nào thỏa mãn điều kiện.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                Truy vấn hoàn tất không có cột nào trả về.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
