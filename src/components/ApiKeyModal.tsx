import React, { useState } from 'react';
import { Key, Eye, EyeOff, CheckCircle2, ExternalLink, X } from 'lucide-react';
import { getStoredApiKey, saveApiKey, removeApiKey } from '../lib/gemini';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (apiKey.trim()) {
      saveApiKey(apiKey.trim());
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onKeySaved();
        onClose();
      }, 700);
    } else {
      removeApiKey();
      onKeySaved();
      onClose();
    }
  };

  const handleClear = () => {
    removeApiKey();
    setApiKey('');
    onKeySaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Cấu hình Google Gemini API Key</h3>
            <p className="text-xs text-slate-500">Kích hoạt AI Transpiler, Sinh dữ liệu & Chấm điểm</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
              <span>Chưa có key?</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 font-medium hover:underline inline-flex items-center gap-0.5"
              >
                Lấy miễn phí tại Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div className="rounded-lg bg-blue-50/70 border border-blue-100 p-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold flex items-center gap-1">
              🔒 Quyền riêng tư & Bảo mật Local-first:
            </p>
            <p>
              API Key được lưu trực tiếp trên <strong>trình duyệt của bạn (localStorage)</strong> và chỉ gửi trực tiếp từ client đến máy chủ Google Gemini. Không qua bất kỳ máy chủ trung gian nào.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                Xóa Key đã lưu
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Đã lưu
                  </>
                ) : (
                  'Lưu & Kích hoạt'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
