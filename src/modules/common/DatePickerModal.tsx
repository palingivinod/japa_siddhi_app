import React, {useEffect, useState} from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import Colors from '../../theme/colors';

interface Props {
  visible: boolean;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
}

/**
 * iOS reports every wheel movement through onChange, so the picker has to live
 * in a sheet that keeps a draft date and commits only on Done. Android keeps
 * its own calendar dialog. Light theme is forced because the surrounding cards
 * are always light.
 */
const DatePickerModal: React.FC<Props> = ({
  visible,
  value,
  minimumDate,
  maximumDate,
  onCancel,
  onConfirm,
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [visible, value]);

  if (!visible) {
    return null;
  }

  if (Platform.OS !== 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="calendar"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={(event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === 'set' && selected) {
            onConfirm(selected);
            return;
          }
          onCancel();
        }}
      />
    );
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.dismissArea}
          activeOpacity={1}
          onPress={onCancel}
        />
        <View style={styles.sheet}>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} hitSlop={12}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(draft)} hitSlop={12}>
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            themeVariant="light"
            textColor={Colors.sacredBrown}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            style={styles.picker}
            onChange={(_event: DateTimePickerEvent, selected?: Date) => {
              if (selected) {
                setDraft(selected);
              }
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

export default DatePickerModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  dismissArea: {flex: 1},
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  cancel: {fontSize: 16, fontWeight: '600', color: Colors.placeholder},
  done: {fontSize: 16, fontWeight: '800', color: Colors.templeGold},
  picker: {backgroundColor: Colors.white},
});
