import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, Loader2 } from 'lucide-react';
import { api } from '../utils/api';

export default function AudioRecorder({ onSend, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioElementRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Mikrofon ruxsati berilmadi:', err);
      alert('Mikrofondan foydalanishga ruxsat berilmadi.');
      if (onCancel) onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    clearInterval(timerRef.current);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    if (onCancel) onCancel();
  };

  const togglePlayPreview = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    try {
      setIsUploading(true);
      const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const res = await api.uploadFile(file);

      await onSend({
        file_url: res.url,
        file_name: res.fileName,
        mime_type: res.mimeType,
        file_size: res.fileSize,
        duration: recordingTime,
      });

      cancelRecording();
    } catch (err) {
      console.error('Ovozli xabarni yuborishda xatolik:', err);
      alert('Ovozli xabarni yuborib bo‘lmadi.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Auto-start on mount if not yet recording
  React.useEffect(() => {
    startRecording();
    return () => {
      clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 bg-family-card border border-family-gold/30 rounded-2xl px-4 py-2.5 shadow-gold-sm animate-fade-in w-full">
      {isRecording ? (
        <>
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-rose-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </div>

          <span className="text-xs font-mono font-semibold text-rose-400">
            {formatTime(recordingTime)}
          </span>

          <span className="text-xs text-family-text-secondary flex-1 truncate">
            Ovoz yozilmoqda...
          </span>

          <button
            type="button"
            onClick={cancelRecording}
            className="p-1.5 text-family-text-muted hover:text-rose-400 transition"
            title="Bekor qilish"
          >
            <Trash2 size={18} />
          </button>

          <button
            type="button"
            onClick={stopRecording}
            className="p-1.5 bg-family-gold/20 hover:bg-family-gold/30 text-family-gold rounded-full transition"
            title="Yozishni to‘xtatish"
          >
            <Square size={16} />
          </button>
        </>
      ) : (
        <>
          <audio
            ref={audioElementRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <button
            type="button"
            onClick={togglePlayPreview}
            className="p-2 bg-family-gold/20 hover:bg-family-gold/30 text-family-gold rounded-full transition"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>

          <div className="flex-1">
            <div className="text-xs text-family-gold font-medium">Ovozli xabar</div>
            <div className="text-[11px] text-family-text-secondary font-mono">{formatTime(recordingTime)}</div>
          </div>

          <button
            type="button"
            onClick={cancelRecording}
            className="p-1.5 text-family-text-muted hover:text-rose-400 transition"
            title="O‘chirish"
          >
            <Trash2 size={18} />
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isUploading}
            className="px-3 py-1.5 gold-btn rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Send size={14} />
                <span>Yuborish</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
