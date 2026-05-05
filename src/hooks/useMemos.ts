import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { MEMO_STORAGE_KEY } from '../constants/calendar';
import { MemoEntry, MemosState, RepeatType } from '../types/calendar';
import { getDateKey } from '../utils/date';

export const useMemos = (onUpdate?: (latestMemos: MemosState) => void) => {
  const [memos, setMemos] = useState<MemosState>({});

  const loadMemos = useCallback(async () => {
    try {
      const savedMemos = await AsyncStorage.getItem(MEMO_STORAGE_KEY);
      if (savedMemos) {
        const parsed = JSON.parse(savedMemos);
        setMemos(parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load memos', e);
    }
    return {};
  }, []);

  const saveMemosToStorage = useCallback(async (updated: MemosState) => {
    setMemos(updated);
    await AsyncStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(updated));
    if (onUpdate) onUpdate(updated);
  }, [onUpdate]);

  const updateMemoColor = useCallback(async (target: string, id: string, color: string) => {
    const updated = { ...memos };
    const currentMemo = updated[target]?.find(m => m.id === id);
    const groupId = currentMemo?.repeatGroupId;

    if (groupId) {
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].map(m => 
          m.repeatGroupId === groupId ? { ...m, color } : m
        );
      });
    } else if (updated[target]) {
      updated[target] = updated[target].map(m => m.id === id ? { ...m, color } : m);
    }
    
    await saveMemosToStorage(updated);
  }, [memos, saveMemosToStorage]);

  const saveMemo = useCallback(async (
    target: string, 
    editingId: string | null, 
    memoData: { title: string; content: string; color: string; repeat: RepeatType }
  ) => {
    const { title, content, color, repeat } = memoData;
    if (!title.trim() || !target) return;
    const updated = { ...memos };
    
    if (editingId) {
      const currentMemo = updated[target]?.find(m => m.id === editingId);
      const oldRepeat = currentMemo?.repeat || 'none';
      const oldGroupId = currentMemo?.repeatGroupId;

      if (oldRepeat !== 'none' && oldGroupId && repeat === 'none') {
        Object.keys(updated).forEach(date => {
          updated[date] = updated[date].filter(m => m.repeatGroupId !== oldGroupId || (date === target && m.id === editingId));
          if (updated[date].length === 0) delete updated[date];
        });
      }

      if (oldRepeat === 'none' && repeat !== 'none') {
        const repeatGroupId = `group_${Date.now()}`;
        const startDate = new Date(target);
        const limit = repeat === 'weekly' ? 104 : repeat === 'monthly' ? 24 : 10;
        
        for (let i = 0; i < limit; i++) {
          const d = new Date(startDate);
          if (repeat === 'weekly') d.setDate(startDate.getDate() + i * 7);
          else if (repeat === 'monthly') d.setMonth(startDate.getMonth() + i);
          else if (repeat === 'yearly') d.setFullYear(startDate.getFullYear() + i);
          
          const dKey = getDateKey(d);
          if (i === 0) {
            updated[target] = (updated[target] || []).map(m => 
              m.id === editingId ? { ...m, title, content, color, repeat, repeatGroupId } : m
            );
          } else {
            const newMemo: MemoEntry = { 
              id: `${Date.now()}_${i}`, 
              title, 
              content, 
              color, 
              repeat, 
              repeatGroupId 
            };
            updated[dKey] = [...(updated[dKey] || []), newMemo];
          }
        }
      } else if (oldRepeat !== 'none' && repeat !== 'none' && oldGroupId) {
        Object.keys(updated).forEach(date => {
          updated[date] = updated[date].map(m => 
            m.repeatGroupId === oldGroupId ? { ...m, title, content, color, repeat } : m
          );
        });
      } else {
        updated[target] = (updated[target] || []).map(m => 
          m.id === editingId ? { ...m, title, content, color, repeat } : m
        );
      }
    } else {
      const repeatGroupId = repeat !== 'none' ? `group_${Date.now()}` : undefined;
      
      if (repeat === 'none') {
        updated[target] = [...(updated[target] || []), { id: Date.now().toString(), title, content, color, repeat: 'none' }];
      } else {
        const startDate = new Date(target);
        const limit = repeat === 'weekly' ? 104 : repeat === 'monthly' ? 24 : 10;
        for (let i = 0; i < limit; i++) {
          const d = new Date(startDate);
          if (repeat === 'weekly') d.setDate(startDate.getDate() + i * 7);
          else if (repeat === 'monthly') d.setMonth(startDate.getMonth() + i);
          else if (repeat === 'yearly') d.setFullYear(startDate.getFullYear() + i);
          
          const dKey = getDateKey(d);
          const newMemo: MemoEntry = { 
            id: `${Date.now()}_${i}`, 
            title, 
            content, 
            color, 
            repeat, 
            repeatGroupId 
          };
          updated[dKey] = [...(updated[dKey] || []), newMemo];
        }
      }
    }
    await saveMemosToStorage(updated);
  }, [memos, saveMemosToStorage]);

  const deleteMemo = useCallback(async (target: string, id: string) => {
    if (!target) return;
    const updated = { ...memos };
    const memoToDelete = updated[target]?.find(m => m.id === id);
    
    if (memoToDelete?.repeatGroupId) {
      const groupId = memoToDelete.repeatGroupId;
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].filter(m => m.repeatGroupId !== groupId);
        if (updated[date].length === 0) delete updated[date];
      });
    } else if (updated[target]) {
      updated[target] = updated[target].filter(m => m.id !== id);
      if (updated[target].length === 0) delete updated[target];
    }
    
    await saveMemosToStorage(updated);
  }, [memos, saveMemosToStorage]);

  const reorderMemos = useCallback(async (target: string, from: number, to: number) => {
    if (!target || from === to) return;
    const dateMemos = [...(memos[target] || [])];
    const [movedItem] = dateMemos.splice(from, 1);
    dateMemos.splice(to, 0, movedItem);
    const updated = { ...memos, [target]: dateMemos };
    await saveMemosToStorage(updated);
  }, [memos, saveMemosToStorage]);

  return {
    memos,
    loadMemos,
    saveMemo,
    deleteMemo,
    updateMemoColor,
    reorderMemos,
    setMemos,
  };
};
