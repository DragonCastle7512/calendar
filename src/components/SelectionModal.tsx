import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MEMO_COLORS } from '../constants/calendar';
import { RepeatType } from '../types/calendar';

interface SelectionModalProps {
  visible: boolean;
  type: 'color' | 'repeat';
  selectedValue: string;
  onSelect: (value: any) => void;
  onClose: () => void;
}

export const SelectionModal = ({ visible, type, selectedValue, onSelect, onClose }: SelectionModalProps) => {
  const repeatOptions: { label: string; value: RepeatType }[] = [
    { label: '반복 안함', value: 'none' },
    { label: '매주 반복', value: 'weekly' },
    { label: '매월 반복', value: 'monthly' },
    { label: '매년 반복', value: 'yearly' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{type === 'color' ? '색상 선택' : '반복 설정'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {type === 'color' ? (
            <ScrollView contentContainerStyle={styles.colorGrid} showsVerticalScrollIndicator={false}>
              {MEMO_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    color === 'transparent' && { 
                      borderWidth: 1, 
                      borderColor: '#EEE', 
                      elevation: 0, 
                      shadowOpacity: 0,
                      backgroundColor: '#FAFAFA' 
                    },
                    selectedValue === color && styles.selectedCircle,
                  ]}
                  onPress={() => {
                    onSelect(color);
                    onClose();
                  }}
                >
                  {color === 'transparent' && (
                    <Ionicons name="ban-outline" size={35} color="#CCC" style={{ position: 'absolute' }} />
                  )}
                  {selectedValue === color && <Ionicons name="checkmark" size={20} color={color === 'transparent' ? '#888' : '#555'} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.optionList}>
              {repeatOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    selectedValue === option.value && styles.selectedOption,
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    selectedValue === option.value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                  {selectedValue === option.value && <Ionicons name="checkmark" size={20} color="#3f6cbe" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    height: 330
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedCircle: {
    borderWidth: 3,
    borderColor: '#555',
  },
  optionList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  selectedOption: {
    backgroundColor: '#EBF2FF',
  },
  optionText: {
    fontSize: 16,
    color: '#444',
  },
  selectedOptionText: {
    color: '#3f6cbe',
    fontWeight: '700',
  },
});
