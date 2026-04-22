import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
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

interface DraggableMemoItemProps {
  item: MemoEntry;
  index: number;
  totalCount: number;
  itemHeights: React.MutableRefObject<number[]>;
  onDelete: (id: string) => void;
  onEdit: (item: MemoEntry) => void;
  onReorder: (from: number, to: number) => void;
}

export const DraggableMemoItem = ({ item, index, totalCount, itemHeights, onDelete, onEdit, onReorder }: DraggableMemoItemProps) => {
  const dragY = useRef(new Animated.Value(0)).current;
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <Animated.View
      onLayout={(e) => {
        itemHeights.current[index] = e.nativeEvent.layout.height;
      }}
      style={[
        styles.memoRow,
        { borderLeftColor: item.color || '#C8F0C4' },
        {
          transform: [{ translateY: dragY }],
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
        </View>
        <View style={styles.memoRowContent}>
          <Text style={styles.memoRowTitle}>{item.title}</Text>
          {item.content ? <Text style={styles.memoRowBody}>{item.content}</Text> : null}
        </View>
      </TouchableOpacity>

      <View style={styles.memoRowActions}>
        <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.rowActionBtn}>
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
  },
  memoRowNum: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '700',
  },
  memoRowContent: { flex: 1 },
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
