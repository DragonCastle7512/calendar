export type RepeatType = 'none' | 'weekly' | 'monthly' | 'yearly';

export interface MemoEntry {
  id: string;
  title: string;
  content: string;
  color: string;
  repeat?: RepeatType;
  repeatGroupId?: string;
}

export interface MemosState {
  [date: string]: MemoEntry[];
}
