﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useRef, useCallback } from 'react';
import type { RecognizeStatus } from '../utils/contentRecognizer';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface UseRecognizerReturn<T> {
  show: boolean;
  setShow: (show: boolean) => void;
  status: RecognizeStatus;
  items: T[];
  progress: number;
  error: string;
  fileRef: React.RefObject<HTMLInputElement | null>;
  recognizeText: (text: string, recognizeFn: (text: string) => Promise<T[]>) => Promise<void>;
  recognizeFile: (files: FileList | null, recognizeFn: (file: File, onProgress?: (p: number) => void) => Promise<T[]>) => Promise<void>;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  updateItem: (index: number, updates: Partial<T>) => void;
  removeItem: (index: number) => void;
  reset: () => void;
}

export function useRecognizer<T>(): UseRecognizerReturn<T> {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<RecognizeStatus>('idle');
  const [items, setItems] = useState<T[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const recognizeText = useCallback(async (text: string, recognizeFn: (text: string) => Promise<T[]>) => {
    if (!text.trim()) return;
    setStatus('recognizing');
    setError('');
    try {
      const result = await recognizeFn(text);
      setItems(result);
      setStatus('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '文本解析失败');
      setStatus('error');
    }
  }, []);

  const recognizeFile = useCallback(async (files: FileList | null, recognizeFn: (file: File, onProgress?: (p: number) => void) => Promise<T[]>) => {
    if (!files || files.length === 0) return;
    setStatus('loading');
    setError('');
    setItems([]);
    const allItems: T[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > MAX_FILE_SIZE) {
          setError(`文件 ${files[i].name} 超过50MB限制`);
          setStatus('error');
          return;
        }
      }
      for (let i = 0; i < files.length; i++) {
        const result = await recognizeFn(files[i], (p) => setProgress(p));
        allItems.push(...result);
      }
      setItems(allItems);
      setStatus('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '文件识别失败');
      setStatus('error');
    }
  }, []);

  const updateItem = useCallback((index: number, updates: Partial<T>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setShow(false);
    setItems([]);
    setStatus('idle');
    setProgress(0);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  return {
    show, setShow, status, items, progress, error, fileRef,
    recognizeText, recognizeFile, setItems, updateItem, removeItem, reset,
  };
}
