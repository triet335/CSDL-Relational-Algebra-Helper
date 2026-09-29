import { ColumnInfo, PresetSchema, TableSchema } from '../types';

/**
 * Phân tích định dạng lược đồ quan hệ theo chuẩn giáo trình CSDL (ĐH Cần Thơ - CTU):
 * Hỗ trợ linh hoạt các biến thể như có gạch đầu dòng `- `, `• `, số thứ tự `1. `, khoảng trắng thừa:
 * Ví dụ:
 *   - SINHVIEN (MASV, hoten, namsinh, CMND, email, diachi, SDT, #ML)
 *   - LOP (ML, tenlop)
 *   - MONHOC (MM, tenmon, TC, LT, TH)
 *   - HOC (#MASV, #MM, hk, nk, diem)
 *   - GIAOVIEN (MAGV, hotenGv, namsinhGv, diachiGv)
 *   - DAY (#MAGV, #MM, #ML, hk, nk)
 */
export function parseTextSchema(rawText: string): TableSchema[] {
  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('--') && !line.startsWith('//'));

  const tables: TableSchema[] = [];

  for (let line of lines) {
    // 1. Loại bỏ các ký tự đánh dấu danh sách ở đầu dòng (- , * , • , 1. , 1) , v.v.)
    line = line.replace(/^[-*•+–—]\s*/, '');
    line = line.replace(/^\d+[\.\)]\s*/, '');
    line = line.trim();

    // 2. Regex bắt tên bảng và nội dung trong ngoặc đơn
    const match = line.match(/^([A-Za-z0-9_]+)\s*\((.+)\)[;\.]?$/);
    if (!match) continue;

    const tableName = match[1].trim();
    const columnsStr = match[2];

    const rawCols = columnsStr.split(',').map(c => c.trim()).filter(Boolean);
    const columns: ColumnInfo[] = [];

    rawCols.forEach((rawCol, idx) => {
      let isFk = false;
      let isPk = false;
      let colName = rawCol.trim();

      // Loại bỏ gạch chân nếu người dùng copy từ tài liệu OCR/Word có _col_
      colName = colName.replace(/^_+|_+$/g, '');

      if (colName.startsWith('#')) {
        isFk = true;
        colName = colName.substring(1).trim();
      }

      // Theo quy ước giáo trình:
      // Thuộc tính đầu tiên thường là khóa chính, hoặc nếu là bảng kết hợp như HOC (#MASV, #MM, hk, nk)
      if (idx === 0 && !isFk) {
        isPk = true;
      }

      // Suy luận kiểu dữ liệu sơ bộ dựa trên tên cột
      let type = 'TEXT';
      const lower = colName.toLowerCase();
      if (
        lower.includes('diem') ||
        lower.includes('luong') ||
        lower.includes('gia') ||
        lower.includes('dongia')
      ) {
        type = 'REAL';
      } else if (
        lower.includes('nam') ||
        lower.includes('namsinh') ||
        lower.includes('tc') ||
        lower.includes('lt') ||
        lower.includes('th') ||
        lower.includes('hk') ||
        lower.includes('soluong') ||
        lower.includes('tuoi')
      ) {
        type = 'INTEGER';
      }

      columns.push({
        name: colName,
        type,
        isPrimaryKey: isPk,
        isForeignKey: isFk
      });
    });

    if (columns.length > 0) {
      tables.push({
        tableName,
        columns
      });
    }
  }

  return tables;
}

/**
 * Các bộ lược đồ mẫu chuẩn giáo trình kèm dữ liệu mock sẵn sàng thực thi offline
 */
export const PRESET_SCHEMAS: PresetSchema[] = [
  {
    id: 'library-ctu-full',
    name: 'CSDL Thư viện (9 quan hệ - 20 bài tập)',
    description: 'Lược đồ quản lý Thư viện hoàn chỉnh: Từ khóa, Tác giả, NXB, Sách, Độc giả, Bản sao, Mượn sách cùng trọn bộ 20 bài tập thực tế.',
    schemaText: `TU_KHOA (MaTK, tukhoa)
TAC_GIA (MTG, hotenTG)
NHA_XB (MNXB, ten, diachi)
SACH (MS, tua, theloai)
DOC_GIA (MDG, hotenDG, namsinh, ngaythamgia, loaidg)
BAN_SAO_SACH (Maso, ngaynhap, nam_XB, #MS, #MNXB)
TU_KHOA_SACH (#MaTK, #MS)
VIET_SACH (#MS, #MTG)
MUON_SACH (#MDG, #Maso, ngaymuon, hantra, ngaytra)`,
    mockSql: `
CREATE TABLE IF NOT EXISTS TU_KHOA (
  MaTK TEXT PRIMARY KEY,
  tukhoa TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS TAC_GIA (
  MTG TEXT PRIMARY KEY,
  hotenTG TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS NHA_XB (
  MNXB TEXT PRIMARY KEY,
  ten TEXT NOT NULL,
  diachi TEXT
);

CREATE TABLE IF NOT EXISTS SACH (
  MS TEXT PRIMARY KEY,
  tua TEXT NOT NULL,
  theloai TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS DOC_GIA (
  MDG TEXT PRIMARY KEY,
  hotenDG TEXT NOT NULL,
  namsinh INTEGER,
  ngaythamgia TEXT,
  loaidg TEXT
);

CREATE TABLE IF NOT EXISTS BAN_SAO_SACH (
  Maso TEXT PRIMARY KEY,
  ngaynhap TEXT,
  nam_XB INTEGER,
  MS TEXT,
  MNXB TEXT,
  FOREIGN KEY (MS) REFERENCES SACH(MS),
  FOREIGN KEY (MNXB) REFERENCES NHA_XB(MNXB)
);

CREATE TABLE IF NOT EXISTS TU_KHOA_SACH (
  MaTK TEXT,
  MS TEXT,
  PRIMARY KEY (MaTK, MS),
  FOREIGN KEY (MaTK) REFERENCES TU_KHOA(MaTK),
  FOREIGN KEY (MS) REFERENCES SACH(MS)
);

CREATE TABLE IF NOT EXISTS VIET_SACH (
  MS TEXT,
  MTG TEXT,
  PRIMARY KEY (MS, MTG),
  FOREIGN KEY (MS) REFERENCES SACH(MS),
  FOREIGN KEY (MTG) REFERENCES TAC_GIA(MTG)
);

CREATE TABLE IF NOT EXISTS MUON_SACH (
  MDG TEXT,
  Maso TEXT,
  ngaymuon TEXT,
  hantra TEXT,
  ngaytra TEXT,
  PRIMARY KEY (MDG, Maso, ngaymuon),
  FOREIGN KEY (MDG) REFERENCES DOC_GIA(MDG),
  FOREIGN KEY (Maso) REFERENCES BAN_SAO_SACH(Maso)
);

-- 1. Từ khóa
INSERT INTO TU_KHOA VALUES ('TK01', 'Mạng máy tính');
INSERT INTO TU_KHOA VALUES ('TK02', 'Lập trình C');
INSERT INTO TU_KHOA VALUES ('TK03', 'Biển đảo quê hương');
INSERT INTO TU_KHOA VALUES ('TK04', 'Thiên nhiên hùng vĩ');
INSERT INTO TU_KHOA VALUES ('TK05', 'Triết học Mác');

-- 2. Tác giả
INSERT INTO TAC_GIA VALUES ('TG01', 'Nguyễn Trung Trực');
INSERT INTO TAC_GIA VALUES ('TG02', 'Trần Văn Hưng');
INSERT INTO TAC_GIA VALUES ('TG03', 'David Eddings');
INSERT INTO TAC_GIA VALUES ('TG04', 'Fujiko F. Fujio');
INSERT INTO TAC_GIA VALUES ('TG05', 'Nguyễn Nhật Ánh');
INSERT INTO TAC_GIA VALUES ('TG06', 'Gosho Aoyama');

-- 3. Nhà xuất bản
INSERT INTO NHA_XB VALUES ('NXB01', 'Giáo dục', 'Hà Nội');
INSERT INTO NHA_XB VALUES ('NXB02', 'Kim Đồng', 'Hà Nội');
INSERT INTO NHA_XB VALUES ('NXB03', 'Trẻ', 'TP HCM');
INSERT INTO NHA_XB VALUES ('NXB04', 'Văn học', 'Hà Nội');

-- 4. Sách
INSERT INTO SACH VALUES ('S01', 'Mạng máy tính', 'giáo trình');
INSERT INTO SACH VALUES ('S02', 'Doraemon tập 1', 'truyện tranh');
INSERT INTO SACH VALUES ('S03', 'Thám tử Conan', 'truyện tranh');
INSERT INTO SACH VALUES ('S04', 'Cuốn theo chiều gió', 'tiểu thuyết');
INSERT INTO SACH VALUES ('S05', 'The Belgariad', 'tiểu thuyết');
INSERT INTO SACH VALUES ('S06', 'The Malloreon', 'tiểu thuyết');
INSERT INTO SACH VALUES ('S07', 'Triết học Mac-Lê', 'triết học');
INSERT INTO SACH VALUES ('S08', 'Ông lão đánh cá và con cá vàng', 'truyện tranh');
INSERT INTO SACH VALUES ('S09', 'Những người khốn khổ', 'tiểu thuyết');
INSERT INTO SACH VALUES ('S10', 'Lập trình căn bản', 'giáo trình');
INSERT INTO SACH VALUES ('S11', 'Những người con của biển', 'truyện ngắn');
INSERT INTO SACH VALUES ('S12', 'Vũ trụ kỳ thú', 'khoa học');
INSERT INTO SACH VALUES ('S13', 'Thế giới vi mô', 'khoa học');
INSERT INTO SACH VALUES ('S14', 'Kính vạn hoa', 'truyện tranh');
INSERT INTO SACH VALUES ('S15', 'Mắt biếc', 'tiểu thuyết');

-- 5. Độc giả
INSERT INTO DOC_GIA VALUES ('DG01', 'Obama', 1961, '2010-01-15', 'VIP');
INSERT INTO DOC_GIA VALUES ('DG02', 'Nguyễn Lan Anh', 2002, '2021-09-01', 'Sinh viên');
INSERT INTO DOC_GIA VALUES ('DG03', 'Trần Bảo Long', 2005, '2023-03-10', 'Sinh viên');
INSERT INTO DOC_GIA VALUES ('DG04', 'Lê Hoàng Nam', 2000, '2019-05-20', 'Giảng viên');
INSERT INTO DOC_GIA VALUES ('DG05', 'Phạm Quỳnh Chi', 2003, '2022-11-12', 'Sinh viên');

-- 6. Bản sao sách
INSERT INTO BAN_SAO_SACH VALUES ('BS01', '2020-01-10', 2019, 'S01', 'NXB01');
INSERT INTO BAN_SAO_SACH VALUES ('BS02', '2020-02-15', 2020, 'S02', 'NXB02');
INSERT INTO BAN_SAO_SACH VALUES ('BS03', '2021-05-20', 2021, 'S03', 'NXB02');
INSERT INTO BAN_SAO_SACH VALUES ('BS04', '2019-11-11', 2018, 'S04', 'NXB04');
INSERT INTO BAN_SAO_SACH VALUES ('BS05', '2018-06-30', 2017, 'S05', 'NXB04');
INSERT INTO BAN_SAO_SACH VALUES ('BS06', '2019-08-25', 2019, 'S06', 'NXB04');
INSERT INTO BAN_SAO_SACH VALUES ('BS07', '2013-09-01', 2013, 'S07', 'NXB01');
INSERT INTO BAN_SAO_SACH VALUES ('BS08', '2015-04-12', 2014, 'S08', 'NXB03');
INSERT INTO BAN_SAO_SACH VALUES ('BS09', '2016-07-18', 2015, 'S09', 'NXB03');
INSERT INTO BAN_SAO_SACH VALUES ('BS10', '2021-10-05', 2021, 'S10', 'NXB01');
INSERT INTO BAN_SAO_SACH VALUES ('BS11', '2022-03-14', 2022, 'S11', 'NXB04');
INSERT INTO BAN_SAO_SACH VALUES ('BS12', '2022-08-01', 2022, 'S12', 'NXB01');
INSERT INTO BAN_SAO_SACH VALUES ('BS13', '2023-01-15', 2023, 'S13', 'NXB01');

-- 7. Từ khóa sách
INSERT INTO TU_KHOA_SACH VALUES ('TK01', 'S01');
INSERT INTO TU_KHOA_SACH VALUES ('TK02', 'S10');
INSERT INTO TU_KHOA_SACH VALUES ('TK03', 'S11');
INSERT INTO TU_KHOA_SACH VALUES ('TK04', 'S11');
INSERT INTO TU_KHOA_SACH VALUES ('TK05', 'S07');

-- 8. Viết sách (tác giả & sách)
INSERT INTO VIET_SACH VALUES ('S01', 'TG01');
INSERT INTO VIET_SACH VALUES ('S10', 'TG01');
INSERT INTO VIET_SACH VALUES ('S05', 'TG03');
INSERT INTO VIET_SACH VALUES ('S06', 'TG03');
INSERT INTO VIET_SACH VALUES ('S02', 'TG04');
INSERT INTO VIET_SACH VALUES ('S14', 'TG05');
INSERT INTO VIET_SACH VALUES ('S15', 'TG05');
INSERT INTO VIET_SACH VALUES ('S03', 'TG06');
INSERT INTO VIET_SACH VALUES ('S12', 'TG01');
INSERT INTO VIET_SACH VALUES ('S12', 'TG02');
INSERT INTO VIET_SACH VALUES ('S13', 'TG01');
INSERT INTO VIET_SACH VALUES ('S13', 'TG02');

-- 9. Mượn sách
INSERT INTO MUON_SACH VALUES ('DG01', 'BS07', '2014-03-10', '2014-03-25', '2014-03-24');
INSERT INTO MUON_SACH VALUES ('DG01', 'BS07', '2014-09-15', '2014-09-30', '2014-09-29');
INSERT INTO MUON_SACH VALUES ('DG02', 'BS01', '2023-02-10', '2023-02-25', '2023-02-20');
INSERT INTO MUON_SACH VALUES ('DG02', 'BS04', '2023-05-15', '2023-05-30', '2023-05-28');
INSERT INTO MUON_SACH VALUES ('DG02', 'BS10', '2023-11-20', '2023-12-05', '2023-12-01');
INSERT INTO MUON_SACH VALUES ('DG04', 'BS01', '2023-03-01', '2023-03-15', '2023-03-14');
INSERT INTO MUON_SACH VALUES ('DG04', 'BS04', '2023-06-10', '2023-06-25', '2023-06-22');
INSERT INTO MUON_SACH VALUES ('DG04', 'BS10', '2023-12-10', '2023-12-25', '2023-12-20');
INSERT INTO MUON_SACH VALUES ('DG05', 'BS02', '2024-01-10', '2024-01-25', '2024-02-15');
INSERT INTO MUON_SACH VALUES ('DG02', 'BS03', '2024-02-05', '2024-02-20', '2024-02-18');
INSERT INTO MUON_SACH VALUES ('DG03', 'BS11', '2024-04-12', '2024-04-26', '2024-04-25');
INSERT INTO MUON_SACH VALUES ('DG04', 'BS12', '2024-05-01', '2024-05-15', '2024-05-12');
`,
    sampleQuestions: [
      {
        id: 'lib-q1',
        question: '1. Thông tin về quyển sách tiêu đề Mạng máy tính?',
        difficulty: 'Dễ',
        hint: 'Chọn từ quan hệ SACH với điều kiện tua = "Mạng máy tính".',
        expectedSql: `SELECT * FROM SACH WHERE tua = 'Mạng máy tính'`,
        sampleRelationalAlgebra: `σ[tua = 'Mạng máy tính'](SACH)`
      },
      {
        id: 'lib-q2',
        question: '2. Thông tin về các quyển sách thuộc thể loại truyện tranh',
        difficulty: 'Dễ',
        hint: 'Chọn từ quan hệ SACH với điều kiện theloai = "truyện tranh".',
        expectedSql: `SELECT * FROM SACH WHERE theloai = 'truyện tranh'`,
        sampleRelationalAlgebra: `σ[theloai = 'truyện tranh'](SACH)`
      },
      {
        id: 'lib-q3',
        question: '3. Tên các nhà xuất bản đã xuất bản các quyển sách có trong thư viện',
        difficulty: 'Dễ',
        hint: 'Kết nối NHA_XB và BAN_SAO_SACH rồi chiếu thuộc tính ten.',
        expectedSql: `SELECT DISTINCT NHA_XB.ten FROM NHA_XB JOIN BAN_SAO_SACH ON NHA_XB.MNXB = BAN_SAO_SACH.MNXB`,
        sampleRelationalAlgebra: `π[ten](NHA_XB * BAN_SAO_SACH)`
      },
      {
        id: 'lib-q4',
        question: '4. Tìm bản sao của quyển sách tiêu đề Cuốn theo chiều gió',
        difficulty: 'Trung bình',
        hint: 'Kết nối BAN_SAO_SACH với SACH đã chọn tua = "Cuốn theo chiều gió".',
        expectedSql: `SELECT BAN_SAO_SACH.* FROM BAN_SAO_SACH JOIN SACH ON BAN_SAO_SACH.MS = SACH.MS WHERE SACH.tua = 'Cuốn theo chiều gió'`,
        sampleRelationalAlgebra: `BAN_SAO_SACH * σ[tua = 'Cuốn theo chiều gió'](SACH)`
      },
      {
        id: 'lib-q5',
        question: '5. Tìm thông tin về các quyển sách được viết bởi David Eddings',
        difficulty: 'Trung bình',
        hint: 'Kết nối SACH, VIET_SACH và TAC_GIA với điều kiện hotenTG = "David Eddings".',
        expectedSql: `SELECT SACH.* FROM SACH JOIN VIET_SACH ON SACH.MS = VIET_SACH.MS JOIN TAC_GIA ON VIET_SACH.MTG = TAC_GIA.MTG WHERE TAC_GIA.hotenTG = 'David Eddings'`,
        sampleRelationalAlgebra: `SACH * VIET_SACH * σ[hotenTG = 'David Eddings'](TAC_GIA)`
      },
      {
        id: 'lib-q6',
        question: '6. Tìm tên tác giả đã viết đồng thời các sách thuộc thể loại truyện tranh và tiểu thuyết',
        difficulty: 'Khó',
        hint: 'Dùng phép giao (∩ / INTERSECT) giữa tác giả viết truyện tranh và tác giả viết tiểu thuyết.',
        expectedSql: `SELECT TAC_GIA.hotenTG FROM TAC_GIA JOIN VIET_SACH ON TAC_GIA.MTG = VIET_SACH.MTG JOIN SACH ON VIET_SACH.MS = SACH.MS WHERE SACH.theloai = 'truyện tranh' INTERSECT SELECT TAC_GIA.hotenTG FROM TAC_GIA JOIN VIET_SACH ON TAC_GIA.MTG = VIET_SACH.MTG JOIN SACH ON VIET_SACH.MS = SACH.MS WHERE SACH.theloai = 'tiểu thuyết'`,
        sampleRelationalAlgebra: `π[hotenTG](TAC_GIA * VIET_SACH * σ[theloai = 'truyện tranh'](SACH)) ∩ π[hotenTG](TAC_GIA * VIET_SACH * σ[theloai = 'tiểu thuyết'](SACH))`
      },
      {
        id: 'lib-q7',
        question: '7. Tìm tên tác giả đã viết các sách thuộc thể loại truyện tranh và không viết tiểu thuyết',
        difficulty: 'Khó',
        hint: 'Dùng phép trừ ( - / EXCEPT) giữa tác giả viết truyện tranh trừ đi tác giả viết tiểu thuyết.',
        expectedSql: `SELECT TAC_GIA.hotenTG FROM TAC_GIA JOIN VIET_SACH ON TAC_GIA.MTG = VIET_SACH.MTG JOIN SACH ON VIET_SACH.MS = SACH.MS WHERE SACH.theloai = 'truyện tranh' EXCEPT SELECT TAC_GIA.hotenTG FROM TAC_GIA JOIN VIET_SACH ON TAC_GIA.MTG = VIET_SACH.MTG JOIN SACH ON VIET_SACH.MS = SACH.MS WHERE SACH.theloai = 'tiểu thuyết'`,
        sampleRelationalAlgebra: `π[hotenTG](TAC_GIA * VIET_SACH * σ[theloai = 'truyện tranh'](SACH)) - π[hotenTG](TAC_GIA * VIET_SACH * σ[theloai = 'tiểu thuyết'](SACH))`
      },
      {
        id: 'lib-q8',
        question: '8. Tìm số lần mượn quyển sách Triết học Mac-Lê của độc giả Obama trong năm 2014',
        difficulty: 'Trung bình',
        hint: 'Kết nối MUON_SACH, BAN_SAO_SACH, SACH, DOC_GIA với các điều kiện tương ứng và đếm.',
        expectedSql: `SELECT COUNT(*) AS so_lan_muon FROM MUON_SACH JOIN BAN_SAO_SACH ON MUON_SACH.Maso = BAN_SAO_SACH.Maso JOIN SACH ON BAN_SAO_SACH.MS = SACH.MS JOIN DOC_GIA ON MUON_SACH.MDG = DOC_GIA.MDG WHERE SACH.tua = 'Triết học Mac-Lê' AND DOC_GIA.hotenDG = 'Obama' AND MUON_SACH.ngaymuon LIKE '2014%'`,
        sampleRelationalAlgebra: `COUNT(MUON_SACH * BAN_SAO_SACH * σ[tua = 'Triết học Mac-Lê'](SACH) * σ[hotenDG = 'Obama'](DOC_GIA))`
      },
      {
        id: 'lib-q9',
        question: '9. Tìm tựa các sách được xuất bản bởi nhà xuất bản mà đã xuất bản quyển sách Ông lão đánh cá và con cá vàng',
        difficulty: 'Khó',
        hint: 'Tìm MNXB của sách Ông lão đánh cá và con cá vàng, sau đó tìm các tựa sách thuộc MNXB đó.',
        expectedSql: `SELECT DISTINCT SACH.tua FROM SACH JOIN BAN_SAO_SACH ON SACH.MS = BAN_SAO_SACH.MS WHERE BAN_SAO_SACH.MNXB IN (SELECT BAN_SAO_SACH.MNXB FROM BAN_SAO_SACH JOIN SACH ON BAN_SAO_SACH.MS = SACH.MS WHERE SACH.tua = 'Ông lão đánh cá và con cá vàng')`,
        sampleRelationalAlgebra: `π[tua](SACH * BAN_SAO_SACH * π[MNXB](BAN_SAO_SACH * σ[tua = 'Ông lão đánh cá và con cá vàng'](SACH)))`
      },
      {
        id: 'lib-q10',
        question: '10. Tìm tên độc giả đã mượn quyển sách Lập trình căn bản của tác giả Nguyễn Trung Trực',
        difficulty: 'Trung bình',
        hint: 'Kết nối DOC_GIA, MUON_SACH, BAN_SAO_SACH, SACH, VIET_SACH, TAC_GIA.',
        expectedSql: `SELECT DISTINCT DOC_GIA.hotenDG FROM DOC_GIA JOIN MUON_SACH ON DOC_GIA.MDG = MUON_SACH.MDG JOIN BAN_SAO_SACH ON MUON_SACH.Maso = BAN_SAO_SACH.Maso JOIN SACH ON BAN_SAO_SACH.MS = SACH.MS JOIN VIET_SACH ON SACH.MS = VIET_SACH.MS JOIN TAC_GIA ON VIET_SACH.MTG = TAC_GIA.MTG WHERE SACH.tua = 'Lập trình căn bản' AND TAC_GIA.hotenTG = 'Nguyễn Trung Trực'`,
        sampleRelationalAlgebra: `π[hotenDG](DOC_GIA * MUON_SACH * BAN_SAO_SACH * σ[tua = 'Lập trình căn bản'](SACH) * VIET_SACH * σ[hotenTG = 'Nguyễn Trung Trực'](TAC_GIA))`
      },
      {
        id: 'lib-q11',
        question: '11. Tìm các từ khoá của quyển sách tiêu đề Những người con của biển ?',
        difficulty: 'Dễ',
        hint: 'Kết nối TU_KHOA, TU_KHOA_SACH, SACH với điều kiện tua = "Những người con của biển".',
        expectedSql: `SELECT DISTINCT TU_KHOA.tukhoa FROM TU_KHOA JOIN TU_KHOA_SACH ON TU_KHOA.MaTK = TU_KHOA_SACH.MaTK JOIN SACH ON TU_KHOA_SACH.MS = SACH.MS WHERE SACH.tua = 'Những người con của biển'`,
        sampleRelationalAlgebra: `π[tukhoa](TU_KHOA * TU_KHOA_SACH * σ[tua = 'Những người con của biển'](SACH))`
      },
      {
        id: 'lib-q12',
        question: '12. Tìm họ tên độc giả đã trả sách quá hạn trong năm 2024.',
        difficulty: 'Trung bình',
        hint: 'Điều kiện ngaytra > hantra AND ngaytra LIKE "2024%".',
        expectedSql: `SELECT DISTINCT DOC_GIA.hotenDG FROM DOC_GIA JOIN MUON_SACH ON DOC_GIA.MDG = MUON_SACH.MDG WHERE MUON_SACH.ngaytra > MUON_SACH.hantra AND MUON_SACH.ngaytra LIKE '2024%'`,
        sampleRelationalAlgebra: `π[hotenDG](DOC_GIA * σ[ngaytra > hantra AND ngaytra LIKE '2024%'](MUON_SACH))`
      },
      {
        id: 'lib-q13',
        question: '13. Tìm mã sách của tất cả các quyển sách mà độc giả Nguyễn Lan Anh đã mượn?',
        difficulty: 'Dễ',
        hint: 'Kết nối BAN_SAO_SACH, MUON_SACH, DOC_GIA với hotenDG = "Nguyễn Lan Anh", chiếu MS.',
        expectedSql: `SELECT DISTINCT BAN_SAO_SACH.MS FROM BAN_SAO_SACH JOIN MUON_SACH ON BAN_SAO_SACH.Maso = MUON_SACH.Maso JOIN DOC_GIA ON MUON_SACH.MDG = DOC_GIA.MDG WHERE DOC_GIA.hotenDG = 'Nguyễn Lan Anh'`,
        sampleRelationalAlgebra: `π[MS](BAN_SAO_SACH * MUON_SACH * σ[hotenDG = 'Nguyễn Lan Anh'](DOC_GIA))`
      },
      {
        id: 'lib-q14',
        question: '14. Tìm số lần mượn của độc giả Nguyễn Lan Anh năm 2023?',
        difficulty: 'Dễ',
        hint: 'Đếm số lượt mượn trong MUON_SACH của Nguyễn Lan Anh với ngaymuon trong năm 2023.',
        expectedSql: `SELECT COUNT(*) AS so_lan_muon FROM MUON_SACH JOIN DOC_GIA ON MUON_SACH.MDG = DOC_GIA.MDG WHERE DOC_GIA.hotenDG = 'Nguyễn Lan Anh' AND MUON_SACH.ngaymuon LIKE '2023%'`,
        sampleRelationalAlgebra: `COUNT(MUON_SACH * σ[hotenDG = 'Nguyễn Lan Anh'](DOC_GIA) * σ[ngaymuon LIKE '2023%'](MUON_SACH))`
      },
      {
        id: 'lib-q15',
        question: '15. Tìm số lần mượn của mỗi độc giả có mượn sách trong năm 2024 ?',
        difficulty: 'Trung bình',
        hint: 'Gom cụm theo MDG và đếm số lượt mượn trong năm 2024.',
        expectedSql: `SELECT MDG, COUNT(Maso) AS so_lan_muon FROM MUON_SACH WHERE ngaymuon LIKE '2024%' GROUP BY MDG`,
        sampleRelationalAlgebra: `MDG G [COUNT(Maso) -> so_lan_muon](σ[ngaymuon LIKE '2024%'](MUON_SACH))`
      },
      {
        id: 'lib-q16',
        question: '16. Tìm số sách mà mỗi độc giả đã mượn theo từng năm',
        difficulty: 'Trung bình',
        hint: 'Gom cụm theo MDG và năm mượn.',
        expectedSql: `SELECT MDG, strftime('%Y', ngaymuon) AS nam_muon, COUNT(Maso) AS so_sach_muon FROM MUON_SACH GROUP BY MDG, strftime('%Y', ngaymuon)`,
        sampleRelationalAlgebra: `MDG, strftime('%Y', ngaymuon) G [COUNT(Maso) -> so_sach](MUON_SACH)`
      },
      {
        id: 'lib-q17',
        question: '17. Tìm mã và họ tên độc giả có mượn tất cả các sách mà Nguyễn Lan Anh đã mượn?',
        difficulty: 'Khó',
        hint: 'Phép chia quan hệ (÷) giữa tập sách độc giả đã mượn chia cho tập sách Nguyễn Lan Anh đã mượn.',
        expectedSql: `SELECT DISTINCT d.MDG, d.hotenDG FROM DOC_GIA d WHERE NOT EXISTS (SELECT b.MS FROM BAN_SAO_SACH b JOIN MUON_SACH m ON b.Maso = m.Maso JOIN DOC_GIA la ON m.MDG = la.MDG WHERE la.hotenDG = 'Nguyễn Lan Anh' EXCEPT SELECT b2.MS FROM BAN_SAO_SACH b2 JOIN MUON_SACH m2 ON b2.Maso = m2.Maso WHERE m2.MDG = d.MDG)`,
        sampleRelationalAlgebra: `(π[MDG, MS](MUON_SACH * BAN_SAO_SACH)) ÷ (π[MS](BAN_SAO_SACH * MUON_SACH * σ[hotenDG = 'Nguyễn Lan Anh'](DOC_GIA))) * DOC_GIA`
      },
      {
        id: 'lib-q18',
        question: '18. Tìm họ tên độc giả trẻ nhất bằng hai cách (có dùng hàm kết tập và không dùng hàm kết tập)?',
        difficulty: 'Trung bình',
        hint: 'Cách 1: dùng MAX(namsinh). Cách 2: Phép trừ DOC_GIA trừ đi những người có ai đó sinh sau mình.',
        expectedSql: `SELECT hotenDG FROM DOC_GIA WHERE namsinh = (SELECT MAX(namsinh) FROM DOC_GIA)`,
        sampleRelationalAlgebra: `π[hotenDG](DOC_GIA) - π[hotenDG](σ[DOC_GIA.namsinh < D2.namsinh](DOC_GIA * ρ[D2](DOC_GIA)))`
      },
      {
        id: 'lib-q19',
        question: '19. Tìm các cặp họ tên tác giả có viết chung sách với nhau, chỉ lấy các cặp (i, j) và không lấy cặp (j, i)?',
        difficulty: 'Khó',
        hint: 'Tự kết nối VIET_SACH theo cùng MS và điều kiện v1.MTG < v2.MTG.',
        expectedSql: `SELECT DISTINCT t1.hotenTG AS tac_gia_1, t2.hotenTG AS tac_gia_2 FROM VIET_SACH v1 JOIN VIET_SACH v2 ON v1.MS = v2.MS AND v1.MTG < v2.MTG JOIN TAC_GIA t1 ON v1.MTG = t1.MTG JOIN TAC_GIA t2 ON v2.MTG = t2.MTG`,
        sampleRelationalAlgebra: `π[T1.hotenTG, T2.hotenTG](σ[T1.MTG < T2.MTG](VIET_SACH * ρ[T1](TAC_GIA) * ρ[V2](VIET_SACH) * ρ[T2](TAC_GIA)))`
      },
      {
        id: 'lib-q20',
        question: '20. Tìm các cặp có viết chung ít nhất là hai quyển sách bằng cách sử dụng kết quả câu 19',
        difficulty: 'Khó',
        hint: 'Gom cụm các cặp viết chung sách và lọc HAVING COUNT >= 2.',
        expectedSql: `SELECT t1.hotenTG AS tac_gia_1, t2.hotenTG AS tac_gia_2, COUNT(v1.MS) AS so_sach_chung FROM VIET_SACH v1 JOIN VIET_SACH v2 ON v1.MS = v2.MS AND v1.MTG < v2.MTG JOIN TAC_GIA t1 ON v1.MTG = t1.MTG JOIN TAC_GIA t2 ON v2.MTG = t2.MTG GROUP BY v1.MTG, v2.MTG HAVING COUNT(v1.MS) >= 2`,
        sampleRelationalAlgebra: `v1.MTG, v2.MTG G [COUNT(v1.MS) >= 2](σ[v1.MTG < v2.MTG](v1 * v2))`
      }
    ]
  },
  {
    id: 'ctu-full-assignment',
    name: 'Đề bài tập CTU mở rộng (SV - Học - GV - Dạy)',
    description: 'Lược đồ đầy đủ từ đề bài tập thực tế gồm Sinh viên, Lớp, Môn học, Học, Giáo viên, Dạy với các câu hỏi Câu 2 -> Câu 7.',
    schemaText: `- SINHVIEN (MASV, hoten, namsinh, CMND, email, diachi, SDT, #ML)
- LOP (ML, tenlop)
- MONHOC (MM, tenmon, TC, LT, TH)
- HOC (#MASV, #MM, hk, nk, diem)
- GIAOVIEN (MAGV, hotenGv, namsinhGv, diachiGv)
- DAY (#MAGV, #MM, #ML, hk, nk)`,
    mockSql: `
CREATE TABLE IF NOT EXISTS LOP (
  ML TEXT PRIMARY KEY,
  tenlop TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS SINHVIEN (
  MASV TEXT PRIMARY KEY,
  hoten TEXT NOT NULL,
  namsinh INTEGER,
  CMND TEXT,
  email TEXT,
  diachi TEXT,
  SDT TEXT,
  ML TEXT,
  FOREIGN KEY (ML) REFERENCES LOP(ML)
);

CREATE TABLE IF NOT EXISTS MONHOC (
  MM TEXT PRIMARY KEY,
  tenmon TEXT NOT NULL,
  TC INTEGER NOT NULL,
  LT INTEGER,
  TH INTEGER
);

CREATE TABLE IF NOT EXISTS HOC (
  MASV TEXT,
  MM TEXT,
  hk INTEGER,
  nk TEXT,
  diem REAL,
  PRIMARY KEY (MASV, MM, hk, nk),
  FOREIGN KEY (MASV) REFERENCES SINHVIEN(MASV),
  FOREIGN KEY (MM) REFERENCES MONHOC(MM)
);

CREATE TABLE IF NOT EXISTS GIAOVIEN (
  MAGV TEXT PRIMARY KEY,
  hotenGv TEXT NOT NULL,
  namsinhGv INTEGER,
  diachiGv TEXT
);

CREATE TABLE IF NOT EXISTS DAY (
  MAGV TEXT,
  MM TEXT,
  ML TEXT,
  hk INTEGER,
  nk TEXT,
  PRIMARY KEY (MAGV, MM, ML, hk, nk),
  FOREIGN KEY (MAGV) REFERENCES GIAOVIEN(MAGV),
  FOREIGN KEY (MM) REFERENCES MONHOC(MM),
  FOREIGN KEY (ML) REFERENCES LOP(ML)
);

-- Lớp
INSERT INTO LOP VALUES ('DI2096A1', 'Kỹ thuật phần mềm 1');
INSERT INTO LOP VALUES ('DI2096A2', 'Kỹ thuật phần mềm 2');
INSERT INTO LOP VALUES ('DI2095A1', 'Khoa học máy tính');

-- Sinh viên (có đủ các sinh viên được hỏi trong đề)
INSERT INTO SINHVIEN VALUES ('B2001', 'Trần Quỳnh Lan', 2002, '123456789', 'lan@ctu.edu.vn', 'Cần Thơ', '0912345678', 'DI2096A1');
INSERT INTO SINHVIEN VALUES ('B2002', 'Trần Tác Tệ', 2001, '987654321', 'te@ctu.edu.vn', 'Vĩnh Long', '0923456789', 'DI2096A1');
INSERT INTO SINHVIEN VALUES ('B2003', 'Nguyễn Văn An', 2002, '456789123', 'an@ctu.edu.vn', 'Hậu Giang', '0934567890', 'DI2096A2');
INSERT INTO SINHVIEN VALUES ('B2004', 'Lê Minh Khôi', 2003, '654321987', 'khoi@ctu.edu.vn', 'Đồng Tháp', '0945678901', 'DI2095A1');

-- Môn học (có môn 3 TC, 4 TC, môn ngôn ngữ lập trình web, Oracle, CSDL)
INSERT INTO MONHOC VALUES ('CT174', 'Cơ sở dữ liệu', 4, 30, 30);
INSERT INTO MONHOC VALUES ('CT222', 'ngôn ngữ lập trình web', 3, 30, 15);
INSERT INTO MONHOC VALUES ('CT333', 'Oracle', 3, 30, 15);
INSERT INTO MONHOC VALUES ('CT175', 'Hệ điều hành', 3, 30, 15);
INSERT INTO MONHOC VALUES ('CT101', 'Lập trình căn bản', 4, 30, 30);

-- Giáo viên (có giáo viên Trần Thanh Nhạn)
INSERT INTO GIAOVIEN VALUES ('GV01', 'Trần Thanh Nhạn', 1978, 'Cần Thơ');
INSERT INTO GIAOVIEN VALUES ('GV02', 'Lê Hoàng Yến', 1982, 'Vĩnh Long');
INSERT INTO GIAOVIEN VALUES ('GV03', 'Nguyễn Thái Sơn', 1975, 'Hậu Giang');

-- Phân công Giảng dạy
INSERT INTO DAY VALUES ('GV01', 'CT333', 'DI2096A1', 1, '05-06');
INSERT INTO DAY VALUES ('GV01', 'CT222', 'DI2096A1', 2, '05-06');
INSERT INTO DAY VALUES ('GV02', 'CT174', 'DI2096A1', 2, '15-16');
INSERT INTO DAY VALUES ('GV03', 'CT175', 'DI2095A1', 1, '05-06');

-- Học & Điểm (khớp các học kỳ, năm học trong câu hỏi)
INSERT INTO HOC VALUES ('B2001', 'CT222', 2, '05-06', 8.5);
INSERT INTO HOC VALUES ('B2001', 'CT175', 1, '05-06', 7.0);
INSERT INTO HOC VALUES ('B2002', 'CT174', 2, '15-16', 9.0);
INSERT INTO HOC VALUES ('B2003', 'CT333', 1, '05-06', 8.0);
INSERT INTO HOC VALUES ('B2004', 'CT175', 1, '05-06', 6.5);
`,
    sampleQuestions: [
      {
        id: 'ctu-q2',
        question: 'Câu 2: Tìm những sinh viên có học các môn học có 3 tín chỉ.',
        difficulty: 'Dễ',
        hint: 'Kết nối SINHVIEN, HOC, MONHOC với điều kiện TC = 3, sau đó chiếu MASV, hoten.',
        expectedSql: `SELECT DISTINCT SINHVIEN.MASV, SINHVIEN.hoten FROM SINHVIEN JOIN HOC ON SINHVIEN.MASV = HOC.MASV JOIN MONHOC ON HOC.MM = MONHOC.MM WHERE MONHOC.TC = 3`,
        sampleRelationalAlgebra: `π[MASV, hoten](σ[TC = 3](SINHVIEN * HOC * MONHOC))`
      },
      {
        id: 'ctu-q3',
        question: 'Câu 3: Tìm họ tên những sinh viên có học môn có tên là “ngôn ngữ lập trình web” ở học kỳ 2 năm 05-06.',
        difficulty: 'Trung bình',
        hint: 'Kết nối SINHVIEN, HOC, MONHOC với điều kiện tenmon = "ngôn ngữ lập trình web" AND hk = 2 AND nk = "05-06", sau đó chiếu hoten.',
        expectedSql: `SELECT DISTINCT SINHVIEN.hoten FROM SINHVIEN JOIN HOC ON SINHVIEN.MASV = HOC.MASV JOIN MONHOC ON HOC.MM = MONHOC.MM WHERE MONHOC.tenmon = 'ngôn ngữ lập trình web' AND HOC.hk = 2 AND HOC.nk = '05-06'`,
        sampleRelationalAlgebra: `π[hoten](σ[tenmon = 'ngôn ngữ lập trình web' AND hk = 2 AND nk = '05-06'](SINHVIEN * HOC * MONHOC))`
      },
      {
        id: 'ctu-q4',
        question: 'Câu 4: Tìm họ tên những giáo viên có dạy môn có tên là “Oracle”.',
        difficulty: 'Dễ',
        hint: 'Kết nối GIAOVIEN, DAY, MONHOC với điều kiện tenmon = "Oracle", sau đó chiếu hotenGv.',
        expectedSql: `SELECT DISTINCT GIAOVIEN.hotenGv FROM GIAOVIEN JOIN DAY ON GIAOVIEN.MAGV = DAY.MAGV JOIN MONHOC ON DAY.MM = MONHOC.MM WHERE MONHOC.tenmon = 'Oracle'`,
        sampleRelationalAlgebra: `π[hotenGv](σ[tenmon = 'Oracle'](GIAOVIEN * DAY * MONHOC))`
      },
      {
        id: 'ctu-q5',
        question: 'Câu 5: Tìm tên những môn học được giảng dạy bởi giáo viên có tên là “Trần Thanh Nhạn”.',
        difficulty: 'Dễ',
        hint: 'Kết nối MONHOC, DAY, GIAOVIEN với điều kiện hotenGv = "Trần Thanh Nhạn", sau đó chiếu tenmon.',
        expectedSql: `SELECT DISTINCT MONHOC.tenmon FROM MONHOC JOIN DAY ON MONHOC.MM = DAY.MM JOIN GIAOVIEN ON DAY.MAGV = GIAOVIEN.MAGV WHERE GIAOVIEN.hotenGv = 'Trần Thanh Nhạn'`,
        sampleRelationalAlgebra: `π[tenmon](σ[hotenGv = 'Trần Thanh Nhạn'](MONHOC * DAY * GIAOVIEN))`
      },
      {
        id: 'ctu-q6',
        question: 'Câu 6: Tìm tên những môn học mà sinh viên có tên là “Trần Quỳnh Lan” theo học.',
        difficulty: 'Dễ',
        hint: 'Kết nối MONHOC, HOC, SINHVIEN với điều kiện hoten = "Trần Quỳnh Lan", sau đó chiếu tenmon.',
        expectedSql: `SELECT DISTINCT MONHOC.tenmon FROM MONHOC JOIN HOC ON MONHOC.MM = HOC.MM JOIN SINHVIEN ON HOC.MASV = SINHVIEN.MASV WHERE SINHVIEN.hoten = 'Trần Quỳnh Lan'`,
        sampleRelationalAlgebra: `π[tenmon](σ[hoten = 'Trần Quỳnh Lan'](MONHOC * HOC * SINHVIEN))`
      },
      {
        id: 'ctu-q7',
        question: 'Câu 7: Tìm kết quả học tập của sinh viên “Trần Tác Tệ” học môn “Cơ sở dữ liệu” ở học kỳ 2 năm 15-16.',
        difficulty: 'Trung bình',
        hint: 'Kết nối SINHVIEN, HOC, MONHOC với điều kiện hoten = "Trần Tác Tệ" AND tenmon = "Cơ sở dữ liệu" AND hk = 2 AND nk = "15-16", sau đó chiếu hoten, tenmon, diem.',
        expectedSql: `SELECT SINHVIEN.hoten, MONHOC.tenmon, HOC.diem FROM SINHVIEN JOIN HOC ON SINHVIEN.MASV = HOC.MASV JOIN MONHOC ON HOC.MM = MONHOC.MM WHERE SINHVIEN.hoten = 'Trần Tác Tệ' AND MONHOC.tenmon = 'Cơ sở dữ liệu' AND HOC.hk = 2 AND HOC.nk = '15-16'`,
        sampleRelationalAlgebra: `π[hoten, tenmon, diem](σ[hoten = 'Trần Tác Tệ' AND tenmon = 'Cơ sở dữ liệu' AND hk = 2 AND nk = '15-16'](SINHVIEN * HOC * MONHOC))`
      }
    ]
  },
  {
    id: 'ctu-student',
    name: 'Quản lý Sinh viên - Môn học (Cơ bản CTU)',
    description: 'Lược đồ sinh viên, lớp, môn học, kết quả học tập phổ biến trong các bài tập Đại số quan hệ.',
    schemaText: `SINHVIEN (MASV, hoten, namsinh, diachi, SDT, #ML)
LOP (ML, tenlop)
MONHOC (MM, tenmon, TC, LT, TH)
KETQUA (#MASV, #MM, diem)`,
    mockSql: `
CREATE TABLE IF NOT EXISTS LOP (
  ML TEXT PRIMARY KEY,
  tenlop TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS SINHVIEN (
  MASV TEXT PRIMARY KEY,
  hoten TEXT NOT NULL,
  namsinh INTEGER,
  diachi TEXT,
  SDT TEXT,
  ML TEXT,
  FOREIGN KEY (ML) REFERENCES LOP(ML)
);

CREATE TABLE IF NOT EXISTS MONHOC (
  MM TEXT PRIMARY KEY,
  tenmon TEXT NOT NULL,
  TC INTEGER NOT NULL,
  LT INTEGER,
  TH INTEGER
);

CREATE TABLE IF NOT EXISTS KETQUA (
  MASV TEXT,
  MM TEXT,
  diem REAL,
  PRIMARY KEY (MASV, MM),
  FOREIGN KEY (MASV) REFERENCES SINHVIEN(MASV),
  FOREIGN KEY (MM) REFERENCES MONHOC(MM)
);

INSERT INTO LOP VALUES ('DI2096A1', 'Kỹ thuật phần mềm 1');
INSERT INTO LOP VALUES ('DI2096A2', 'Kỹ thuật phần mềm 2');
INSERT INTO LOP VALUES ('DI2095A1', 'Khoa học máy tính');
INSERT INTO LOP VALUES ('DI2097A1', 'Hệ thống thông tin');

INSERT INTO SINHVIEN VALUES ('B2001111', 'Nguyễn Văn An', 2002, 'Cần Thơ', '0912345678', 'DI2096A1');
INSERT INTO SINHVIEN VALUES ('B2002222', 'Trần Thị Mai', 2002, 'Vĩnh Long', '0923456789', 'DI2096A1');
INSERT INTO SINHVIEN VALUES ('B2003333', 'Lê Hoàng Nam', 2001, 'Hậu Giang', '0934567890', 'DI2096A2');
INSERT INTO SINHVIEN VALUES ('B2004444', 'Phạm Minh Đức', 2003, 'Đồng Tháp', '0945678901', 'DI2095A1');
INSERT INTO SINHVIEN VALUES ('B2005555', 'Võ Thảo My', 2002, 'Cần Thơ', '0956789012', 'DI2097A1');

INSERT INTO MONHOC VALUES ('CT101', 'Lập trình căn bản', 4, 30, 30);
INSERT INTO MONHOC VALUES ('CT174', 'Cơ sở dữ liệu', 4, 30, 30);
INSERT INTO MONHOC VALUES ('CT175', 'Hệ điều hành', 3, 30, 15);
INSERT INTO MONHOC VALUES ('CT180', 'Cấu trúc dữ liệu', 4, 30, 30);
INSERT INTO MONHOC VALUES ('CT182', 'Hệ thống thông tin', 3, 30, 15);

INSERT INTO KETQUA VALUES ('B2001111', 'CT101', 8.5);
INSERT INTO KETQUA VALUES ('B2001111', 'CT174', 9.0);
INSERT INTO KETQUA VALUES ('B2001111', 'CT180', 7.5);
INSERT INTO KETQUA VALUES ('B2002222', 'CT174', 8.0);
INSERT INTO KETQUA VALUES ('B2002222', 'CT180', 6.5);
INSERT INTO KETQUA VALUES ('B2003333', 'CT101', 5.0);
INSERT INTO KETQUA VALUES ('B2003333', 'CT174', 7.0);
INSERT INTO KETQUA VALUES ('B2004444', 'CT174', 9.5);
INSERT INTO KETQUA VALUES ('B2004444', 'CT175', 8.5);
INSERT INTO KETQUA VALUES ('B2005555', 'CT182', 9.0);
`,
    sampleQuestions: [
      {
        id: 'q1',
        question: 'Hãy cho biết họ tên và số điện thoại của tất cả các sinh viên ở Cần Thơ.',
        difficulty: 'Dễ',
        hint: 'Dùng phép chọn σ với điều kiện diachi = "Cần Thơ", sau đó chiếu π lấy hoten, SDT.',
        expectedSql: `SELECT hoten, SDT FROM SINHVIEN WHERE diachi = 'Cần Thơ'`,
        sampleRelationalAlgebra: `π[hoten, SDT](σ[diachi='Cần Thơ'](SINHVIEN))`
      },
      {
        id: 'q2',
        question: 'Cho biết họ tên sinh viên và tên lớp mà sinh viên đó đang học.',
        difficulty: 'Dễ',
        hint: 'Kết nối tự nhiên (*) giữa bảng SINHVIEN và LOP, sau đó chiếu lấy hoten, tenlop.',
        expectedSql: `SELECT SINHVIEN.hoten, LOP.tenlop FROM SINHVIEN JOIN LOP ON SINHVIEN.ML = LOP.ML`,
        sampleRelationalAlgebra: `π[hoten, tenlop](SINHVIEN * LOP)`
      },
      {
        id: 'q3',
        question: 'Tìm tên các môn học có số tín chỉ lớn hơn hoặc bằng 4.',
        difficulty: 'Dễ',
        hint: 'Chọn từ bảng MONHOC với điều kiện TC >= 4, sau đó chiếu tenmon.',
        expectedSql: `SELECT tenmon FROM MONHOC WHERE TC >= 4`,
        sampleRelationalAlgebra: `π[tenmon](σ[TC >= 4](MONHOC))`
      },
      {
        id: 'q4',
        question: 'Cho biết họ tên sinh viên và điểm thi môn "Cơ sở dữ liệu" đạt từ 8.0 trở lên.',
        difficulty: 'Trung bình',
        hint: 'Kết hợp 3 bảng SINHVIEN, KETQUA, MONHOC với điều kiện tenmon = "Cơ sở dữ liệu" AND diem >= 8.0.',
        expectedSql: `SELECT SINHVIEN.hoten, KETQUA.diem FROM SINHVIEN JOIN KETQUA ON SINHVIEN.MASV = KETQUA.MASV JOIN MONHOC ON KETQUA.MM = MONHOC.MM WHERE MONHOC.tenmon = 'Cơ sở dữ liệu' AND KETQUA.diem >= 8.0`,
        sampleRelationalAlgebra: `π[hoten, diem](σ[tenmon='Cơ sở dữ liệu' AND diem >= 8.0](SINHVIEN * KETQUA * MONHOC))`
      }
    ]
  },
  {
    id: 'company-projects',
    name: 'Quản lý Đề án Công ty',
    description: 'Lược đồ quan hệ kinh điển gồm Nhân viên, Phòng ban, Đề án và Phân công công việc.',
    schemaText: `NHANVIEN (MANV, honv, tennv, ngaysinh, phai, luong, #MAPB)
PHONGBAN (MAPB, tenpb, #TRUONGPHONG)
DEAN (MADA, tenda, ddiem_da, #MAPB)
PHANCONG (#MANV, #MADA, thoigian)`,
    mockSql: `
CREATE TABLE IF NOT EXISTS PHONGBAN (
  MAPB TEXT PRIMARY KEY,
  tenpb TEXT NOT NULL,
  TRUONGPHONG TEXT
);

CREATE TABLE IF NOT EXISTS NHANVIEN (
  MANV TEXT PRIMARY KEY,
  honv TEXT NOT NULL,
  tennv TEXT NOT NULL,
  ngaysinh TEXT,
  phai TEXT,
  luong REAL,
  MAPB TEXT,
  FOREIGN KEY (MAPB) REFERENCES PHONGBAN(MAPB)
);

CREATE TABLE IF NOT EXISTS DEAN (
  MADA TEXT PRIMARY KEY,
  tenda TEXT NOT NULL,
  ddiem_da TEXT,
  MAPB TEXT,
  FOREIGN KEY (MAPB) REFERENCES PHONGBAN(MAPB)
);

CREATE TABLE IF NOT EXISTS PHANCONG (
  MANV TEXT,
  MADA TEXT,
  thoigian REAL,
  PRIMARY KEY (MANV, MADA),
  FOREIGN KEY (MANV) REFERENCES NHANVIEN(MANV),
  FOREIGN KEY (MADA) REFERENCES DEAN(MADA)
);

INSERT INTO PHONGBAN VALUES ('PB01', 'Nghiên cứu', 'NV01');
INSERT INTO PHONGBAN VALUES ('PB02', 'Điều hành', 'NV02');
INSERT INTO PHONGBAN VALUES ('PB03', 'Kinh doanh', 'NV03');

INSERT INTO NHANVIEN VALUES ('NV01', 'Nguyễn', 'Tùng', '1985-05-12', 'Nam', 30000000, 'PB01');
INSERT INTO NHANVIEN VALUES ('NV02', 'Lê', 'Hoa', '1988-11-20', 'Nữ', 28000000, 'PB02');
INSERT INTO NHANVIEN VALUES ('NV03', 'Trần', 'Bảo', '1992-02-15', 'Nam', 22000000, 'PB03');
INSERT INTO NHANVIEN VALUES ('NV04', 'Phạm', 'Lan', '1995-07-08', 'Nữ', 18000000, 'PB01');
INSERT INTO NHANVIEN VALUES ('NV05', 'Võ', 'Khánh', '1996-09-30', 'Nam', 15000000, 'PB01');

INSERT INTO DEAN VALUES ('DA01', 'Sản phẩm X', 'Hà Nội', 'PB01');
INSERT INTO DEAN VALUES ('DA02', 'Sản phẩm Y', 'Đà Nẵng', 'PB01');
INSERT INTO DEAN VALUES ('DA03', 'Tin học hóa', 'TP HCM', 'PB02');

INSERT INTO PHANCONG VALUES ('NV01', 'DA01', 32.5);
INSERT INTO PHANCONG VALUES ('NV01', 'DA02', 7.5);
INSERT INTO PHANCONG VALUES ('NV04', 'DA01', 20.0);
INSERT INTO PHANCONG VALUES ('NV05', 'DA02', 40.0);
INSERT INTO PHANCONG VALUES ('NV02', 'DA03', 25.0);
`,
    sampleQuestions: [
      {
        id: 'cp1',
        question: 'Cho biết tên và mức lương của những nhân viên nữ.',
        difficulty: 'Dễ',
        hint: 'Chọn phai = "Nữ", sau đó chiếu tennv, luong.',
        expectedSql: `SELECT tennv, luong FROM NHANVIEN WHERE phai = 'Nữ'`,
        sampleRelationalAlgebra: `π[tennv, luong](σ[phai='Nữ'](NHANVIEN))`
      },
      {
        id: 'cp2',
        question: 'Tìm tên các đề án do phòng ban "Nghiên cứu" phụ trách.',
        difficulty: 'Trung bình',
        hint: 'Kết nối DEAN và PHONGBAN với điều kiện tenpb = "Nghiên cứu", chiếu tenda.',
        expectedSql: `SELECT DEAN.tenda FROM DEAN JOIN PHONGBAN ON DEAN.MAPB = PHONGBAN.MAPB WHERE PHONGBAN.tenpb = 'Nghiên cứu'`,
        sampleRelationalAlgebra: `π[tenda](σ[tenpb='Nghiên cứu'](DEAN * PHONGBAN))`
      }
    ]
  }
];
