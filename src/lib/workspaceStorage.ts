import { PracticeQuestion } from '../types';
import { PRESET_SCHEMAS } from './schemaParser';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  schemaText: string;
  mockSql: string;
  questions: PracticeQuestion[];
  currentExpression?: string;
}

const STORAGE_KEY_WORKSPACES = 'csdl_workspaces_v2';
const STORAGE_KEY_ACTIVE_ID = 'csdl_active_workspace_id_v2';

/**
 * Khởi tạo danh sách Workspace ban đầu từ các Preset nếu bộ nhớ trống
 */
function createInitialWorkspaces(): Workspace[] {
  return PRESET_SCHEMAS.map((preset, idx) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    createdAt: Date.now() - (PRESET_SCHEMAS.length - idx) * 1000,
    updatedAt: Date.now() - (PRESET_SCHEMAS.length - idx) * 1000,
    schemaText: preset.schemaText,
    mockSql: preset.mockSql,
    questions: preset.sampleQuestions || [],
    currentExpression: preset.sampleQuestions?.[0]?.sampleRelationalAlgebra || ''
  }));
}

/**
 * Tải toàn bộ danh sách không gian làm việc từ localStorage
 */
export function getAllWorkspaces(): Workspace[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return createInitialWorkspaces();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORKSPACES);
    if (!raw) {
      const initial = createInitialWorkspaces();
      localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Đảm bảo preset số 1 mới nhất (Thư viện 9 bảng) luôn có mặt nếu người dùng chưa có
      const libraryPreset = PRESET_SCHEMAS[0];
      const hasLibrary = parsed.some(w => w.id === libraryPreset.id);
      if (!hasLibrary) {
        const libraryWs: Workspace = {
          id: libraryPreset.id,
          name: libraryPreset.name,
          description: libraryPreset.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          schemaText: libraryPreset.schemaText,
          mockSql: libraryPreset.mockSql,
          questions: libraryPreset.sampleQuestions || [],
          currentExpression: libraryPreset.sampleQuestions?.[0]?.sampleRelationalAlgebra || ''
        };
        parsed.unshift(libraryWs);
        localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(parsed));
      }
      return parsed;
    }
    const initial = createInitialWorkspaces();
    localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(initial));
    return initial;
  } catch (err) {
    console.error('Lỗi đọc workspaces từ localStorage:', err);
    return createInitialWorkspaces();
  }
}

/**
 * Lấy ID của không gian đang hoạt động gần nhất
 */
export function getActiveWorkspaceId(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return PRESET_SCHEMAS[0].id;
  }

  const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
  if (stored) return stored;

  const all = getAllWorkspaces();
  const defaultId = all[0]?.id || PRESET_SCHEMAS[0].id;
  localStorage.setItem(STORAGE_KEY_ACTIVE_ID, defaultId);
  return defaultId;
}

/**
 * Đặt không gian làm việc đang hoạt động
 */
export function setActiveWorkspaceId(id: string): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  }
}

/**
 * Lấy chi tiết Workspace đang hoạt động
 */
export function getActiveWorkspace(): Workspace {
  const all = getAllWorkspaces();
  const activeId = getActiveWorkspaceId();
  const found = all.find(w => w.id === activeId);
  return found || all[0];
}

/**
 * Lưu / Cập nhật một Workspace vào localStorage
 */
export function saveWorkspace(ws: Workspace): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

  const all = getAllWorkspaces();
  const existingIdx = all.findIndex(w => w.id === ws.id);
  const updatedWs = { ...ws, updatedAt: Date.now() };

  if (existingIdx >= 0) {
    all[existingIdx] = updatedWs;
  } else {
    all.unshift(updatedWs);
  }

  localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(all));
}

/**
 * Tạo một Không gian làm việc mới hoàn toàn
 */
export function createNewWorkspace(name: string, description = ''): Workspace {
  const newWs: Workspace = {
    id: `ws-${Date.now()}`,
    name: name.trim() || 'Không gian bài tập mới',
    description: description.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    schemaText: '',
    mockSql: '',
    questions: [],
    currentExpression: ''
  };

  saveWorkspace(newWs);
  setActiveWorkspaceId(newWs.id);
  return newWs;
}

/**
 * Nhân bản không gian hiện tại (Save as new workspace / Fork)
 */
export function duplicateWorkspace(id: string, newName?: string): Workspace | null {
  const all = getAllWorkspaces();
  const source = all.find(w => w.id === id);
  if (!source) return null;

  const duplicated: Workspace = {
    ...source,
    id: `ws-${Date.now()}`,
    name: newName?.trim() || `${source.name} (Bản sao)`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  saveWorkspace(duplicated);
  setActiveWorkspaceId(duplicated.id);
  return duplicated;
}

/**
 * Xóa một Workspace
 */
export function deleteWorkspace(id: string): { remainingWorkspaces: Workspace[]; newActiveId: string } {
  let all = getAllWorkspaces();
  all = all.filter(w => w.id !== id);

  if (all.length === 0) {
    all = createInitialWorkspaces();
  }

  localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(all));

  let currentActiveId = getActiveWorkspaceId();
  if (currentActiveId === id) {
    currentActiveId = all[0].id;
    setActiveWorkspaceId(currentActiveId);
  }

  return { remainingWorkspaces: all, newActiveId: currentActiveId };
}

/**
 * Xuất dữ liệu Không gian làm việc ra tệp .csdl (JSON) để tải về máy
 */
export function exportWorkspaceToFile(ws: Workspace): void {
  const exportPayload = {
    app: 'CSDL Relational Algebra Helper',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    workspace: ws
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Chuẩn hóa tên file an toàn
  const safeName = ws.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName || 'workspace'}.csdl`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Nhập dữ liệu Không gian làm việc từ tệp .csdl / .json người dùng tải lên
 */
export async function importWorkspaceFromFile(file: File): Promise<Workspace> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Tệp không đúng định dạng JSON/CSDL hợp lệ.');
  }

  const rawWs = parsed.workspace || parsed;
  if (!rawWs.name && !rawWs.schemaText) {
    throw new Error('Nội dung tệp không chứa dữ liệu không gian CSDL hợp lệ.');
  }

  const imported: Workspace = {
    id: `imported-${Date.now()}`,
    name: rawWs.name ? `${rawWs.name} (Đã nhập)` : 'Không gian vừa nhập',
    description: rawWs.description || `Nhập từ tệp ${file.name}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    schemaText: rawWs.schemaText || '',
    mockSql: rawWs.mockSql || '',
    questions: Array.isArray(rawWs.questions) ? rawWs.questions : [],
    currentExpression: rawWs.currentExpression || ''
  };

  saveWorkspace(imported);
  setActiveWorkspaceId(imported.id);
  return imported;
}
