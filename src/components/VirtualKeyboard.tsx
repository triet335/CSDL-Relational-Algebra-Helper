import React from 'react';
import { TableSchema } from '../types';

interface VirtualKeyboardProps {
  onInsert: (symbol: string) => void;
  tables: TableSchema[];
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ onInsert, tables }) => {
  // Nhóm các phép toán quan hệ
  const relationalOps = [
    { label: 'σ', title: 'Phép chọn (Selection / WHERE)', insert: 'σ[]()' },
    { label: 'π', title: 'Phép chiếu (Projection / SELECT)', insert: 'π[]()' },
    { label: '*', title: 'Kết nối tự nhiên (Natural Join)', insert: ' * ' },
    { label: '⋈', title: 'Kết nối có điều kiện (Theta Join)', insert: ' ⋈[] ' },
    { label: '÷', title: 'Phép chia quan hệ (Division)', insert: ' ÷ ' },
    { label: '∪', title: 'Phép hợp (Union)', insert: ' ∪ ' },
    { label: '∩', title: 'Phép giao (Intersection)', insert: ' ∩ ' },
    { label: '−', title: 'Phép trừ (Difference / EXCEPT)', insert: ' - ' },
    { label: 'ρ', title: 'Phép đổi tên (Rename)', insert: 'ρ[]()' },
  ];

  // Nhóm các hàm thống kê gom cụm
  const aggregates = [
    { label: 'COUNT', title: 'Đếm số lượng', insert: 'COUNT()' },
    { label: 'SUM', title: 'Tính tổng', insert: 'SUM()' },
    { label: 'AVG', title: 'Trung bình', insert: 'AVG()' },
    { label: 'MIN', title: 'Giá trị nhỏ nhất', insert: 'MIN()' },
    { label: 'MAX', title: 'Giá trị lớn nhất', insert: 'MAX()' },
  ];

  // Nhóm toán tử logic & so sánh
  const comparisonOps = [
    { label: '=', title: 'Bằng', insert: ' = ' },
    { label: '≠', title: 'Khác', insert: ' ≠ ' },
    { label: '≥', title: 'Lớn hơn hoặc bằng', insert: ' >= ' },
    { label: '≤', title: 'Nhỏ hơn hoặc bằng', insert: ' <= ' },
    { label: '>', title: 'Lớn hơn', insert: ' > ' },
    { label: '<', title: 'Nhỏ hơn', insert: ' < ' },
    { label: 'AND', title: 'Và', insert: ' AND ' },
    { label: 'OR', title: 'Hoặc', insert: ' OR ' },
    { label: 'NOT', title: 'Phủ định', insert: ' NOT ' },
  ];

  // Ký hiệu ngoặc & phân tách
  const brackets = [
    { label: '[ ]', title: 'Cặp ngoặc vuông', insert: '[]' },
    { label: '( )', title: 'Cặp ngoặc tròn', insert: '()' },
    { label: ',', title: 'Dấu phẩy phân tách', insert: ', ' },
    { label: "' '", title: 'Dấu nháy đơn chuỗi', insert: "''" },
  ];

  // Lấy danh sách tên bảng và toàn bộ thuộc tính độc nhất
  const allAttributes = Array.from(
    new Set(tables.flatMap(t => t.columns.map(c => c.name)))
  );

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
          Phép toán ĐSQH:
        </span>
        {relationalOps.map(op => (
          <button
            key={op.label}
            type="button"
            title={op.title}
            onClick={() => onInsert(op.insert)}
            className="h-8 min-w-[34px] px-2 rounded-lg bg-white border border-slate-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 text-slate-800 font-serif font-bold text-sm shadow-2xs transition-all active:scale-95"
          >
            {op.label}
          </button>
        ))}

        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
          Gom cụm:
        </span>
        {aggregates.map(ag => (
          <button
            key={ag.label}
            type="button"
            title={ag.title}
            onClick={() => onInsert(ag.insert)}
            className="h-8 px-2 rounded-lg bg-white border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-mono font-semibold text-xs shadow-2xs transition-all active:scale-95"
          >
            {ag.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
          So sánh & Logic:
        </span>
        {comparisonOps.map(op => (
          <button
            key={op.label}
            type="button"
            title={op.title}
            onClick={() => onInsert(op.insert)}
            className="h-7 min-w-[28px] px-1.5 rounded-md bg-white border border-slate-200 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-800 text-slate-700 font-mono text-xs shadow-2xs transition-all active:scale-95"
          >
            {op.label}
          </button>
        ))}

        <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
          Ngoặc:
        </span>
        {brackets.map(b => (
          <button
            key={b.label}
            type="button"
            title={b.title}
            onClick={() => onInsert(b.insert)}
            className="h-7 min-w-[28px] px-2 rounded-md bg-white border border-slate-200 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-800 text-slate-700 font-mono text-xs shadow-2xs transition-all active:scale-95"
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Dynamic Schema Quick Pills */}
      {tables.length > 0 && (
        <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
          {/* Table Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider min-w-[50px]">
              Bảng:
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {tables.map(t => (
                <button
                  key={t.tableName}
                  type="button"
                  onClick={() => onInsert(t.tableName)}
                  className="h-6 px-2.5 rounded-md bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-800 font-mono font-bold text-[11px] border border-blue-200 hover:border-blue-600 shadow-2xs transition-all active:scale-95"
                >
                  {t.tableName}
                </button>
              ))}
            </div>
          </div>

          {/* Top Attribute Pills */}
          {allAttributes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[50px]">
                Cột:
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {allAttributes.slice(0, 16).map(attr => (
                  <button
                    key={attr}
                    type="button"
                    onClick={() => onInsert(attr)}
                    className="h-6 px-2 rounded-md bg-white hover:bg-slate-700 hover:text-white text-slate-700 font-mono text-[11px] border border-slate-200 hover:border-slate-700 shadow-2xs transition-all active:scale-95"
                  >
                    {attr}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
