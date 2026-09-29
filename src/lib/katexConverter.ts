import katex from 'katex';

/**
 * Chuyển đổi chuỗi biểu thức ĐSQH người dùng nhập sang định dạng LaTeX chuẩn để KaTeX render:
 * Ví dụ:
 *  - π[hoten, tenlop](SINHVIEN * LOP) -> \pi_{\text{hoten, tenlop}}(\text{SINHVIEN} \bowtie \text{LOP})
 *  - σ[diachi = 'Cần Thơ'](SINHVIEN)  -> \sigma_{\text{diachi = 'Cần Thơ'}}(\text{SINHVIEN})
 *  - R ⋈[R.A = S.A] S                 -> \text{R} \bowtie_{\text{R.A = S.A}} \text{S}
 */
export function formatRelationalAlgebraToLatex(expr: string): string {
  if (!expr || !expr.trim()) {
    return '\\text{\\textit{Chưa có biểu thức...}}';
  }

  let formatted = expr.trim();

  // 0. Chuẩn hóa & escape dấu gạch dưới `_` để KaTeX không nhầm thành chỉ số dưới (subscript)
  // Trong LaTeX math mode, `_` tạo chỉ số dưới (ví dụ BAN_SAO_SACH biến thành BAN_S AO_S ACH).
  // Cần escape thành `\_` để hiển thị đúng ký tự gạch dưới trong tên bảng/cột.
  formatted = formatted.replace(/\\_/g, '_');
  formatted = formatted.replace(/_/g, '\\_');

  // 1. Chuyển đổi tên hàm / toán tử dạng chữ sang ký hiệu nếu người dùng gõ chữ
  formatted = formatted.replace(/\bPI\b/g, 'π');
  formatted = formatted.replace(/\bSIGMA\b/g, 'σ');
  formatted = formatted.replace(/\bRHO\b/g, 'ρ');

  // 2. Chuyển đổi các toán tử so sánh & logic sang TeX
  formatted = formatted.replace(/!=/g, ' \\ne ');
  formatted = formatted.replace(/≠/g, ' \\ne ');
  formatted = formatted.replace(/>=/g, ' \\ge ');
  formatted = formatted.replace(/≥/g, ' \\ge ');
  formatted = formatted.replace(/<=/g, ' \\le ');
  formatted = formatted.replace(/≤/g, ' \\le ');
  formatted = formatted.replace(/\bAND\b/gi, ' \\land ');
  formatted = formatted.replace(/\bOR\b/gi, ' \\lor ');
  formatted = formatted.replace(/\bNOT\b/gi, ' \\neg ');

  // 3. Chuyển đổi các toán tử quan hệ
  // Phép kết nối điều kiện: ⋈[condition] -> \bowtie_{condition}
  formatted = formatted.replace(/⋈\s*\[([^\]]*)\]/g, (_m, cond) => {
    return `\\bowtie_{${cleanSubscriptText(cond)}}`;
  });
  // Phép kết nối tự nhiên: * hoặc ⋈ đứng một mình
  formatted = formatted.replace(/\s*(\*|⋈)\s*/g, ' \\bowtie ');

  // Phép chia: ÷ -> \div
  formatted = formatted.replace(/\s*÷\s*/g, ' \\div ');

  // Phép hợp: ∪ -> \cup
  formatted = formatted.replace(/\s*∪\s*/g, ' \\cup ');

  // Phép giao: ∩ -> \cap
  formatted = formatted.replace(/\s*∩\s*/g, ' \\cap ');

  // Phép trừ quan hệ: - (giữa các bảng/biểu thức)
  formatted = formatted.replace(/\s*-\s*(?=[A-Za-z(])/g, ' - ');

  // 4. Chuyển đổi π[...] thành \pi_{...}
  formatted = formatted.replace(/π\s*\[([^\]]*)\]/g, (_m, inner) => {
    return `\\pi_{${cleanSubscriptText(inner)}}`;
  });

  // 5. Chuyển đổi σ[...] thành \sigma_{...}
  formatted = formatted.replace(/σ\s*\[([^\]]*)\]/g, (_m, inner) => {
    return `\\sigma_{${cleanSubscriptText(inner)}}`;
  });

  // 6. Chuyển đổi ρ[...] thành \rho_{...}
  formatted = formatted.replace(/ρ\s*\[([^\]]*)\]/g, (_m, inner) => {
    return `\\rho_{${cleanSubscriptText(inner)}}`;
  });

  // Nếu còn π hay σ đơn lẻ chưa có ngoặc
  formatted = formatted.replace(/π/g, '\\pi ');
  formatted = formatted.replace(/σ/g, '\\sigma ');
  formatted = formatted.replace(/ρ/g, '\\rho ');

  // 7. Bọc các định danh tiếng Việt hoặc chuỗi ký tự không phải toán tử bằng \text{...} nếu cần
  return formatted;
}

function cleanSubscriptText(text: string): string {
  let trimmed = text.trim();
  if (!trimmed) return '';

  // Đảm bảo dấu gạch dưới được escape an toàn
  trimmed = trimmed.replace(/\\_/g, '_').replace(/_/g, '\\_');

  // Bọc các chuỗi ký tự đặt trong dấu nháy bằng \text{'...'} để KaTeX giữ nguyên khoảng trắng tiếng Việt
  trimmed = trimmed.replace(/(['"“”][^'"“”]*['"“”])/g, '\\text{$1}');

  return `\\mathrm{${trimmed}}`;
}

/**
 * Render chuỗi LaTeX sang chuỗi HTML an toàn qua KaTeX (không throw error)
 */
export function renderToKatexHtml(latex: string, displayMode = true): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml'
    });
  } catch (e: any) {
    return `<span class="text-rose-500 italic text-sm">Lỗi KaTeX: ${e?.message || 'Biểu thức chưa hoàn chỉnh'}</span>`;
  }
}
