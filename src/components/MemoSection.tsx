import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FIXED_ANNIVERSARIES, MEMO_COLORS, OFFLINE_HOLIDAYS } from '../constants/calendar';
import { MemoEntry, RepeatType } from '../types/calendar';
import { getLunarHoliday } from '../utils/holiday';
import { DraggableMemoItem } from './DraggableMemoItem';
import { MemoForm } from './MemoForm';

interface MemoSectionProps {
  data: {
    selectedDate: string;
    selectedMemos: MemoEntry[];
    holidays: { [key: string]: string };
  };
  form: {
    visible: boolean;
    title: string;
    content: string;
    color: string;
    repeat: RepeatType;
    editingId: string | null;
  };
  actions: {
    setModalVisible: (v: boolean) => void;
    setNewTitle: (v: string) => void;
    setNewContent: (v: string) => void;
    setRepeat: (v: RepeatType) => void;
    openAddModal: () => void;
    openEditModal: (item: MemoEntry) => void;
    saveMemo: () => void;
    deleteMemo: (id: string) => void;
    reorderMemos: (from: number, to: number) => void;
    updateMemoColor: (id: string, color: string) => void;
  };
  itemHeights: React.MutableRefObject<number[]>;
}

export const MemoSection: React.FC<MemoSectionProps> = ({
  data,
  form,
  actions,
  itemHeights
}) => {
  const { selectedDate, selectedMemos, holidays } = data;
  const { visible, title, content, color, repeat, editingId } = form;
  const { 
    setModalVisible, setNewTitle, setNewContent, setRepeat,
    openAddModal, openEditModal, saveMemo, deleteMemo, reorderMemos, updateMemoColor 
  } = actions;

  const holidayName = (() => {
    const [y, m, d] = selectedDate.split('-');
    const monthDay = `${m}-${d}`;
    return holidays[selectedDate] || getLunarHoliday(new Date(selectedDate)) || OFFLINE_HOLIDAYS[monthDay] || FIXED_ANNIVERSARIES[monthDay];
  })();

  const dateDisplay = (() => {
    const [y, m, d] = selectedDate.split('-');
    return `${parseInt(m)}월 ${parseInt(d)}일`;
  })();

  return (
    <View style={styles.focusMemoArea}>
      <View style={styles.memoPanelHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
            <Text style={styles.memoPanelDate}>{dateDisplay}</Text>
            {holidayName && <Text style={styles.memoPanelHoliday}>{holidayName}</Text>}
          </View>
          <Text style={styles.memoPanelCount}>{selectedMemos.length > 0 ? `일정 ${selectedMemos.length}개` : '일정 없음'}</Text>
        </View>
        {!visible && (
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Ionicons name="add" size={22} color="#8A8A8A" />
          </TouchableOpacity>
        )}
      </View>

      {visible && (
        <MemoForm 
          newTitle={title} 
          setNewTitle={setNewTitle} 
          newContent={content} 
          setNewContent={setNewContent} 
          color={color}
          repeat={repeat}
          setRepeat={setRepeat}
          onCancel={() => setModalVisible(false)} 
          onSave={saveMemo} 
          editingId={editingId} 
        />
      )}

      <ScrollView style={styles.memoList} showsVerticalScrollIndicator={false}>
        {selectedMemos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>+ 버튼으로 일정을 추가하세요</Text>
          </View>
        ) : (
          selectedMemos.map((item, idx) => (
            <DraggableMemoItem
              key={item.id} 
              item={item} 
              index={idx} 
              totalCount={selectedMemos.length} 
              itemHeights={itemHeights}
              onDelete={deleteMemo} 
              onEdit={openEditModal} 
              onReorder={reorderMemos} 
              onUpdateColor={updateMemoColor}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  focusMemoArea: { flex: 1, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0' },
  memoPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 7, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  memoPanelDate: { fontSize: 18, fontWeight: '800', color: '#000000' },
  memoPanelHoliday: { fontSize: 10, fontWeight: '600', color: '#E8735A' },
  memoPanelCount: { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  memoList: { paddingHorizontal: 20, paddingTop: 8 },
  emptyState: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: '#BBBBBB', fontSize: 13 },
});
