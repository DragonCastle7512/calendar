import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface MemoFormProps {
  newTitle: string;
  setNewTitle: (text: string) => void;
  newContent: string;
  setNewContent: (text: string) => void;
  onCancel: () => void;
  onSave: () => void;
  editingId: string | null;
}

export const MemoForm = ({
  newTitle,
  setNewTitle,
  newContent,
  setNewContent,
  onCancel,
  onSave,
  editingId
}: MemoFormProps) => {
  const anim = useRef(new Animated.Value(0)).current;

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

  return (
    <Animated.View style={[styles.inlineForm, animatedStyle]}>
      <TextInput
        style={styles.inlineTitleInput}
        placeholder="제목을 입력하세요"
        placeholderTextColor="#A0A0A0"
        value={newTitle}
        onChangeText={setNewTitle}
        autoFocus
      />
      <TextInput
        style={styles.inlineBodyInput}
        placeholder="메모 (선택)"
        placeholderTextColor="#C0C0C0"
        multiline
        value={newContent}
        onChangeText={setNewContent}
      />
      <View style={styles.inlineFormActions}>
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  inlineForm: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  inlineTitleInput: {
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
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
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
