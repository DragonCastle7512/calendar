export interface MemoEntry {
  id: string;
  title: string;
  content: string;
  color: string;
}

export interface MemosState {
  [date: string]: MemoEntry[];
}
