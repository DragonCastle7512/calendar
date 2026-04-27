import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  BackHandler,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MemoEntry, MemosState } from '../types/calendar';
import { getDateKey } from '../utils/date';
import { DraggableMemoItem } from './DraggableMemoItem';
import { MemoForm } from './MemoForm';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_CELL_WIDTH = SCREEN_WIDTH / 7;

interface WidgetModalProps {
  visible: boolean;
  dateStr: string;
  memos: MemoEntry[];
  allMemos: MemosState;
  holiday?: string;
  onClose: () => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (item: MemoEntry) => void;
  onReorder: (from: number, to: number) => void;
  onDateSelect: (date: string) => void;
  itemHeights: React.MutableRefObject<number[]>;
  modalVisible: boolean;
  newTitle: string;
  setNewTitle: (t: string) => void;
  newContent: string;
  setNewContent: (t: string) => void;
  onSave: () => void;
  onCancel: () => void;
  editingId: string | null;
}

export const WidgetModal = ({
  visible,
  dateStr,
  memos,
  allMemos,
  holiday,
  onClose,
  onAdd,
  onDelete,
  onEdit,
  onReorder,
  onDateSelect,
  itemHeights,
  modalVisible,
  newTitle,
  setNewTitle,
  newContent,
  setNewContent,
  onSave,
  onCancel,
  editingId
}: WidgetModalProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const targetDate = new Date(dateStr);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  const daysInMonth = useMemo(() => {
    const lastDate = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: lastDate }, (_, i) => new Date(year, month, i + 1));
  }, [year, month]);

  useEffect(() => {
    if (visible && scrollRef.current) {
      const dayIndex = targetDate.getDate() - 1;
      const scrollX = dayIndex * DAY_CELL_WIDTH - (DAY_CELL_WIDTH * 3);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: Math.max(0, scrollX), animated: true });
      }, 150);
    }
  }, [visible, dateStr]);

  const handleExit = () => {
    BackHandler.exitApp();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleExit}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={handleExit}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          
          <View style={styles.cardContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleExit} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={26} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{year}년 {month + 1}월</Text>
              <TouchableOpacity onPress={onAdd} style={styles.iconBtn}>
                <Ionicons name="pencil" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.scrollWrapper}>
              <ScrollView 
                ref={scrollRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                snapToInterval={DAY_CELL_WIDTH}
                decelerationRate="fast"
              >
                {daysInMonth.map((date, i) => {
                  const dKey = getDateKey(date);
                  const isSelected = dKey === dateStr;
                  const dayMemos = allMemos[dKey] || [];
                  const isSunday = date.getDay() === 0;
                  const isSaturday = date.getDay() === 6;

                  return (
                    <TouchableOpacity 
                      key={i} 
                      style={[styles.dayCell, isSelected && styles.selectedCell]}
                      onPress={() => onDateSelect(dKey)}
                    >
                      <Text style={[
                        styles.dayNum,
                        isSunday && { color: '#E8735A' },
                        isSaturday && { color: '#5A8FE8' },
                        isSelected && styles.selectedDayNum
                      ]}>
                        {date.getDate()}
                      </Text>
                      
                      {/* 메모 요약 (제목이 포함된 Bar 디자인) */}
                      <View style={styles.memoSummaryArea}>
                        {dayMemos.slice(0, 2).map((memo) => (
                          <View 
                            key={memo.id} 
                            style={[styles.summaryBar, { backgroundColor: memo.color || '#C8F0C4' }]} 
                          >
                            <Text style={styles.summaryTitle} numberOfLines={1}>
                              {memo.title}
                            </Text>
                          </View>
                        ))}
                        {dayMemos.length > 2 && (
                          <Text style={styles.summaryMore}>+{dayMemos.length - 2}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {modalVisible && (
              <MemoForm 
                key={editingId || 'new-memo-form'}
                newTitle={newTitle}
                setNewTitle={setNewTitle}
                newContent={newContent}
                setNewContent={setNewContent}
                onCancel={onCancel}
                onSave={onSave}
                editingId={editingId}
              />
            )}

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              <View style={styles.listHeader}>
                <Text style={styles.listDateText}>{month + 1}월 {targetDate.getDate()}일 {holiday && <Text style={styles.holidayLabel}>{holiday}</Text>}</Text>
                <Text style={styles.memoPanelCount}>{memos.length > 0 ? `일정 ${memos.length}개` : '일정 없음'}</Text>
              </View>

              {memos.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="document-text-outline" size={60} color="#F0F0F0" />
                  <Text style={styles.emptyText}>등록된 일정이 없습니다.</Text>
                </View>
              ) : (
                memos.map((item, idx) => (
                  <DraggableMemoItem
                    key={item.id}
                    item={item}
                    index={idx}
                    totalCount={memos.length}
                    itemHeights={itemHeights}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onReorder={onReorder}
                  />
                ))
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#ffffff7c', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  header: {
    height: 60,
    backgroundColor: '#5A9FE8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  scrollWrapper: {
    height: 100, // 텍스트 포함을 위해 높이 약간 확장
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  dayCell: {
    width: DAY_CELL_WIDTH,
    paddingTop: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F8F8F8',
  },
  selectedCell: {
    backgroundColor: '#F0F7FF',
  },
  memoPanelCount: { 
    fontSize: 11, 
    color: '#8A8A8A', 
    marginTop: 2
  },
  dayNum: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedDayNum: {
    fontWeight: '900',
    color: '#000',
    textDecorationLine: 'underline',
  },
  memoSummaryArea: {
    width: '90%',
    gap: 2,
    marginTop: 2,
    alignItems: 'center',
  },
  summaryBar: {
    width: '100%',
    height: 14, // 글자가 들어갈 높이
    borderRadius: 2,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  summaryTitle: {
    fontSize: 8,
    color: '#000',
    fontWeight: '700',
  },
  summaryMore: {
    fontSize: 8,
    color: '#8A8A8A',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listHeader: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    marginBottom: 10,
  },
  listDateText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
  },
  holidayLabel: {
    fontSize: 10,
    color: '#E8735A',
    fontWeight: '600',
    marginTop: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 15,
    color: '#DDD',
    fontSize: 15,
    fontWeight: '600',
  },
});
