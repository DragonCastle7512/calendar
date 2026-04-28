import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  fontSizeIndex: number;
  alignment: 'top' | 'center';
  onSave: (fontSizeIndex: number, alignment: 'top' | 'center') => void;
}

export const SettingsModal = ({
  visible,
  onClose,
  fontSizeIndex: initialFontSize,
  alignment: initialAlignment,
  onSave,
}: SettingsModalProps) => {
  const [localFontSize, setLocalFontSize] = useState(initialFontSize);
  const [localAlignment, setLocalAlignment] = useState(initialAlignment);

  useEffect(() => {
    if (visible) {
      setLocalFontSize(initialFontSize);
      setLocalAlignment(initialAlignment);
    }
  }, [visible, initialFontSize, initialAlignment]);

  const handleBack = () => {
    BackHandler.exitApp();
  };

  const handleSave = () => {
    onSave(localFontSize, localAlignment);
    BackHandler.exitApp();
  };

  const fontSizes = [
    { label: '작게', index: 0 },
    { label: '보통', index: 1 },
    { label: '크게', index: 2 },
  ];

  const alignments = [
    { label: '상단', value: 'top' as const },
    { label: '중앙', value: 'center' as const },
  ];

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={handleBack}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={handleBack}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          
          <View style={styles.cardContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={26} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>설정</Text>
              <TouchableOpacity onPress={handleSave} style={styles.iconBtn}>
                <Ionicons name="checkmark-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.settingsLabel}>위젯 글자 크기</Text>
              <View style={styles.optionRow}>
                {fontSizes.map((size) => (
                  <TouchableOpacity
                    key={size.index}
                    style={[
                      styles.optionBtn,
                      localFontSize === size.index && styles.optionBtnActive
                    ]}
                    onPress={() => setLocalFontSize(size.index)}
                  >
                    <Text style={[
                      styles.optionBtnText,
                      localFontSize === size.index && styles.optionBtnTextActive
                    ]}>
                      {size.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.settingsLabel}>위젯 일정 배치</Text>
              <View style={styles.optionRow}>
                {alignments.map((align) => (
                  <TouchableOpacity
                    key={align.value}
                    style={[
                      styles.optionBtn,
                      localAlignment === align.value && styles.optionBtnActive
                    ]}
                    onPress={() => setLocalAlignment(align.value)}
                  >
                    <Text style={[
                      styles.optionBtnText,
                      localAlignment === align.value && styles.optionBtnTextActive
                    ]}>
                      {align.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContainer: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
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
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  settingsLabel: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#444', 
    marginBottom: 12 
  },
  optionRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 24 
  },
  optionBtn: { 
    flex: 1, 
    height: 44, 
    backgroundColor: '#F8F9FA', 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: '#EEE' 
  },
  optionBtnActive: { 
    backgroundColor: '#5A9FE8', 
    borderColor: '#5A9FE8' 
  },
  optionBtnText: { 
    fontSize: 13, 
    color: '#666', 
    fontWeight: '700' 
  },
  optionBtnTextActive: { 
    color: '#FFF' 
  },
  settingsFooter: { 
    borderTopWidth: 1, 
    borderTopColor: '#F0F0F0', 
    paddingTop: 20, 
    alignItems: 'center' 
  },
  settingsInfo: { 
    fontSize: 12, 
    color: '#999', 
    marginBottom: 20,
    textAlign: 'center'
  },
  footerBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  cancelBtn: { 
    flex: 1,
    height: 50, 
    backgroundColor: '#F1F1F1', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cancelBtnText: { 
    color: '#666', 
    fontSize: 15, 
    fontWeight: '700' 
  },
  saveBtn: { 
    flex: 2,
    height: 50, 
    backgroundColor: '#333', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  saveBtnText: { 
    color: '#FFF', 
    fontSize: 15, 
    fontWeight: '700' 
  },
});
