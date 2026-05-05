import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { ITEM_HEIGHT } from '../constants/calendar';
import { MemoEntry } from '../types/calendar';
import { SelectionModal } from './SelectionModal';

interface DraggableMemoItemProps {
  item: MemoEntry;
  index: number;
  totalCount: number;
  itemHeights: React.MutableRefObject<number[]>;
  onDelete: (id: string) => void;
  onEdit: (item: MemoEntry) => void;
  onReorder: (from: number, to: number) => void;
  onUpdateColor: (id: string, color: string) => void;
}

export const DraggableMemoItem = ({ item, index, totalCount, itemHeights, onDelete, onEdit, onReorder, onUpdateColor }: DraggableMemoItemProps) => {
  const dragY = useRef(new Animated.Value(0)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current; // 등장 및 퇴장 애니메이션
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);

  // 등장 애니메이션
  useEffect(() => {
    Animated.spring(entranceAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  // 삭제 애니메이션 후 처리
  const handleDelete = () => {
    setIsExiting(true);
    Animated.timing(entranceAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDelete(item.id);
    });
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: dragY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.BEGAN || event.nativeEvent.state === State.ACTIVE) {
      setIsDragging(true);
    } else if (event.nativeEvent.state === State.END) {
      const { translationY } = event.nativeEvent;
      
      let targetIndex = index;
      let accumulatedHeight = 0;

      if (translationY > 0) {
        for (let i = index + 1; i < totalCount; i++) {
          const h = itemHeights.current[i] || ITEM_HEIGHT;
          if (translationY > accumulatedHeight + h / 2) {
            targetIndex = i;
            accumulatedHeight += h;
          } else break;
        }
      } else {
        const absY = Math.abs(translationY);
        for (let i = index - 1; i >= 0; i--) {
          const h = itemHeights.current[i] || ITEM_HEIGHT;
          if (absY > accumulatedHeight + h / 2) {
            targetIndex = i;
            accumulatedHeight += h;
          } else break;
        }
      }

      if (targetIndex !== index) {
        onReorder(index, targetIndex);
      }
      
      setIsDragging(false);
      Animated.spring(dragY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 10,
      }).start();
    } else if (
      event.nativeEvent.state === State.CANCELLED || 
      event.nativeEvent.state === State.FAILED ||
      event.nativeEvent.state === State.UNDETERMINED
    ) {
      setIsDragging(false);
      Animated.spring(dragY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const animatedStyle = {
    opacity: entranceAnim,
    transform: [
      { translateY: dragY },
      { scale: entranceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }) 
      },
      { translateY: entranceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        })
      }
    ],
  };

  return (
    <Animated.View
      onLayout={(e) => {
        if (!isExiting && itemHeights?.current) {
          itemHeights.current[index] = e.nativeEvent.layout.height;
        }
      }}
      style={[
        styles.memoRow,
        { borderLeftColor: item.color || '#C8F0C4' },
        animatedStyle,
        {
          zIndex: isDragging ? 100 : 1,
          backgroundColor: isDragging ? '#FDFDFD' : '#FFFFFF',
          elevation: isDragging ? 12 : 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: isDragging ? 6 : 0 },
          shadowOpacity: isDragging ? 0.3 : 0,
          shadowRadius: 8,
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.memoRowPressable}
        onPress={() => onEdit(item)}
        activeOpacity={0.6}
      >
        <View style={styles.memoRowIndex}>
          <Text style={styles.memoRowNum}>{String(index + 1).padStart(2, '0')}</Text>
          <TouchableOpacity 
            style={[
              styles.colorPickerBtn, 
              { backgroundColor: item.color },
              item.color === 'transparent' && { 
                elevation: 0, 
                shadowOpacity: 0, 
                backgroundColor: '#FAFAFA' 
              }
            ]} 
            onPress={() => setShowColorModal(true)}
          >
            <Ionicons name="color-palette-outline" size={14} color="#555" />
          </TouchableOpacity>
        </View>
        <View style={styles.memoRowContent}>
          <View style={styles.memoRowHeader}>
            <Text style={styles.memoRowTitle}>{item.title}</Text>
            {item.repeat && item.repeat !== 'none' && (
              <Ionicons name="repeat" size={12} color="#8A8A8A" style={styles.repeatIcon} />
            )}
          </View>
          {item.content ? <Text style={styles.memoRowBody}>{item.content}</Text> : null}
        </View>
      </TouchableOpacity>

      <View style={styles.memoRowActions}>
        <TouchableOpacity onPress={handleDelete} style={styles.rowActionBtn}>
          <Ionicons name="trash-outline" size={16} color="#E8735A" />
        </TouchableOpacity>
        
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetY={[-2, 2]}
        >
          <Animated.View style={styles.dragHandle}>
            <Ionicons name="reorder-two-outline" size={26} color={isDragging ? "#3f6cbe" : "#CCCCCC"} />
          </Animated.View>
        </PanGestureHandler>
      </View>

      <SelectionModal
        visible={showColorModal}
        type="color"
        selectedValue={item.color}
        onSelect={(val) => onUpdateColor(item.id, val)}
        onClose={() => setShowColorModal(false)}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  memoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    borderLeftWidth: 3,
    paddingLeft: 14,
  },
  memoRowPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  memoRowIndex: {
    marginRight: 14,
    paddingTop: 1,
    alignItems: 'center',
    width: 26,
  },
  memoRowNum: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '700',
    marginBottom: 4,
  },
  colorPickerBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  memoRowContent: { flex: 1 },
  memoRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  repeatIcon: {
    marginTop: 1,
  },
  memoRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.2,
  },
  memoRowBody: {
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
    lineHeight: 18,
  },
  memoRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  rowActionBtn: {
    padding: 6,
  },
  dragHandle: {
    padding: 6,
    marginLeft: 4,
  },
});
