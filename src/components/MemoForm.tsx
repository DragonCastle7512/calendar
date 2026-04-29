import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { RepeatType } from '../types/calendar';
import { SelectionModal } from './SelectionModal';
interface MemoFormProps {
  newTitle: string;
  setNewTitle: (text: string) => void;
  newContent: string;
  setNewContent: (text: string) => void;
  color: string;
  repeat: RepeatType;
  setRepeat: (value: RepeatType) => void;
  onCancel: () => void;
  onSave: () => void;
  editingId: string | null;
}


export const MemoForm = ({
  newTitle,
  setNewTitle,
  newContent,
  setNewContent,
  color,
  repeat,
  setRepeat,
  onCancel,
  onSave,
  editingId
}: MemoFormProps) => {
  const anim = useRef(new Animated.Value(0)).current;
  const [showRepeatModal, setShowRepeatModal] = useState(false);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleCancel = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onCancel());
  };

  const handleSave = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onSave());
  };

  const animatedStyle = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 0],
        }),
      },
    ],
  };

  const getRepeatLabel = () => {
    switch (repeat) {
      case 'weekly': return '매주';
      case 'monthly': return '매월';
      case 'yearly': return '매년';
      default: return '반복 안함';
    }
  };

  return (
    <Animated.View style={[styles.inlineForm, animatedStyle, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.topRow}>
        <TextInput
          style={styles.inlineTitleInput}
          placeholder="제목을 입력하세요"
          placeholderTextColor="#A0A0A0"
          value={newTitle}
          onChangeText={setNewTitle}
          autoFocus
        />
        <TouchableOpacity style={styles.repeatBtn} onPress={() => setShowRepeatModal(true)}>
          <Ionicons name="repeat" size={18} color={repeat !== 'none' ? '#3f6cbe' : '#8A8A8A'} />
          <Text style={[styles.repeatBtnText, repeat !== 'none' && { color: '#3f6cbe', fontWeight: '700' }]}>
            {getRepeatLabel()}
          </Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.inlineBodyInput}
        placeholder="메모 (선택)"
        placeholderTextColor="#C0C0C0"
        multiline
        value={newContent}
        onChangeText={setNewContent}
      />
      <View style={styles.inlineFormActions}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.inlineCancelBtn} onPress={handleCancel}>
          <Text style={styles.inlineCancelBtnText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.inlineSaveBtn, !newTitle.trim() && styles.inlineSaveBtnDisabled]} 
          onPress={handleSave}
          disabled={!newTitle.trim()}
        >
          <Text style={styles.inlineSaveBtnText}>{editingId ? '수정' : '저장'}</Text>
        </TouchableOpacity>
      </View>

      <SelectionModal
        visible={showRepeatModal}
        type="repeat"
        selectedValue={repeat}
        onSelect={setRepeat}
        onClose={() => setShowRepeatModal(false)}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  inlineForm: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inlineTitleInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    paddingVertical: 8,
  },
  inlineBodyInput: {
    fontSize: 14,
    color: '#4A4A4A',
    minHeight: 80,
    maxHeight: 80,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  inlineFormActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
  },
  repeatBtnText: {
    fontSize: 13,
    color: '#8A8A8A',
  },
  inlineCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  inlineCancelBtnText: {
    fontSize: 14,
    color: '#8A8A8A',
    fontWeight: '600',
  },
  inlineSaveBtn: {
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 2,
  },
  inlineSaveBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  inlineSaveBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
