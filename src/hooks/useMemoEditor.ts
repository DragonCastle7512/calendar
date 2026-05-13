import { useState } from "react";
import { MEMO_COLORS } from "../constants/calendar";
import { MemoEntry, RepeatType } from "../types/calendar";

/* 메모 상세보기 상태관리 훅 */
export const useMemoEditor = (saveMemo: Function, widgetSelectedDate: string | null, selectedDate: string | null) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(MEMO_COLORS[0]);
  const [repeat, setRepeat] = useState<RepeatType>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moveTargetDate, setMoveTargetDate] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingId(null); setNewTitle(''); setNewContent(''); setSelectedColor(MEMO_COLORS[0]); setRepeat('none'); setMoveTargetDate(null); setModalVisible(true);
  };
  const openEditModal = (item: MemoEntry) => {
    setEditingId(item.id); setNewTitle(item.title); setNewContent(item.content); setSelectedColor(item.color); setRepeat(item.repeat || 'none'); setMoveTargetDate(null); setModalVisible(true);
  };

  const handleSaveMemo = async () => {
    const originalTarget = widgetSelectedDate || selectedDate;
    const finalTarget = moveTargetDate || originalTarget;
    
    if (finalTarget && originalTarget) {
      await saveMemo(finalTarget, editingId, { title: newTitle, content: newContent, color: selectedColor, repeat }, originalTarget);
      setModalVisible(false);
      setMoveTargetDate(null);
    }
  };

  return {
    modalVisible,
    setModalVisible,
    newTitle,
    setNewTitle,
    newContent,
    setNewContent,
    selectedColor,
    repeat,
    setRepeat,
    editingId,
    moveTargetDate,
    setMoveTargetDate,
    openAddModal,
    openEditModal,
    handleSaveMemo
  };
}