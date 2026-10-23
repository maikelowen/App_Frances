'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Formatos que entiende Whisper, por orden de preferencia (Safari/iPhone solo graba audio/mp4).
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
const EXTENSIONS = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/ogg': 'ogg' };
const MAX_RECORDING_MS = 15000;
const MIN_AUDIO_BYTES = 2000;

// Graba con el micrófono y transcribe con Whisper (/api/transcribe).
// Pulsar una vez empieza, pulsar otra vez termina (o se corta solo a los 15 s).
// status: 'idle' | 'recording' | 'transcribing'
export function useRecorder({ onResult, onError }) {
  const [status, setStatus] = useState('idle');
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  // Guardamos los callbacks en una ref para usar siempre la versión más reciente.
  const callbacks = useRef({ onResult, onError });
  callbacks.current = { onResult, onError };

  const stop = useCallback(() => {
    clearTimeout(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      callbacks.current.onError?.("Tu navegador no permite grabar audio (necesita HTTPS).");
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      callbacks.current.onError?.("Necesito permiso para usar el micrófono.");
      return;
    }

    const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
      const blob = new Blob(chunks, { type });

      if (blob.size < MIN_AUDIO_BYTES) {
        setStatus('idle');
        callbacks.current.onError?.("No se oyó nada. Pulsa, habla y vuelve a pulsar para terminar.");
        return;
      }

      setStatus('transcribing');
      try {
        const formData = new FormData();
        formData.append('file', new File([blob], `audio.${EXTENSIONS[type] ?? 'webm'}`, { type }));
        const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) callbacks.current.onError?.(data.error || "No se pudo procesar el audio.");
        else if (!data.text) callbacks.current.onError?.("No se entendió nada. Habla un poco más alto y cerca del micrófono.");
        else callbacks.current.onResult?.(data);
      } catch {
        callbacks.current.onError?.("No se pudo enviar el audio. Revisa tu conexión.");
      } finally {
        setStatus('idle');
      }
    };

    recorderRef.current = recorder;
    recorder.start();
    setStatus('recording');
    timerRef.current = setTimeout(stop, MAX_RECORDING_MS);
  }, [stop]);

  const toggle = useCallback(() => {
    if (status === 'recording') stop();
    else if (status === 'idle') start();
  }, [status, start, stop]);

  // Si el componente desaparece a mitad de grabación, soltamos el micrófono.
  useEffect(() => () => {
    clearTimeout(timerRef.current);
    const r = recorderRef.current;
    if (r?.state === 'recording') {
      r.onstop = null;
      r.stop();
      r.stream.getTracks().forEach((t) => t.stop());
    }
  }, []);

  return { status, toggle };
}
