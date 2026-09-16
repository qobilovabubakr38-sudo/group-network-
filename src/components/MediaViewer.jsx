import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

export default function MediaViewer({ item, onClose }) {
  if (!item) return null;

  const isVideo = item.mime_type?.startsWith('video/') || item.file_url?.match(/\.(mp4|webm|mov)$/i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      {/* Header bar */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <a
          href={item.file_url}
          download={item.file_name || 'download'}
          target="_blank"
          rel="noreferrer"
          className="p-2.5 bg-family-surface/80 hover:bg-family-surface text-family-text-primary rounded-full border border-white/10 transition flex items-center justify-center"
          title="Yuklab olish"
        >
          <Download size={18} />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 bg-family-surface/80 hover:bg-rose-500/80 text-family-text-primary rounded-full border border-white/10 transition flex items-center justify-center"
          title="Yopish"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl max-h-[85vh] flex flex-col items-center justify-center">
        {isVideo ? (
          <video
            src={item.file_url}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] rounded-xl shadow-2xl border border-family-gold/20"
          />
        ) : (
          <img
            src={item.file_url}
            alt={item.file_name || 'Rasm'}
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-family-gold/20"
          />
        )}

        {item.file_name && (
          <div className="text-center text-xs text-family-text-secondary mt-3 font-mono">
            {item.file_name} {item.file_size ? `(${Math.round(item.file_size / 1024)} KB)` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
