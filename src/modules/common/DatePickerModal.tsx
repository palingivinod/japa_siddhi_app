import React, {useEffect, useMemo, useState} from 'react';
import {
  Keyboard,
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
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
}

/**
 * iOS reports every wheel movement through onChange, so the picker has to live
 * in a sheet that keeps a draft date and commits only on Done. Android keeps
 * its own calendar / clock dialog. Light theme is forced because the
 * surrounding cards are always light.
 */
/** Android calendar defaults to 1900 when no minimum is set. */
const earliestSelectableDate = (): Date => {
  const date = new Date(0);
  date.setFullYear(1, 0, 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const DatePickerModal: React.FC<Props> = ({
  visible,
  value,
  mode = 'date',
  minimumDate,
  maximumDate,
  onCancel,
  onConfirm,
}) => {
  const [draft, setDraft] = useState(value);
  const resolvedMinimum = useMemo(
    () =>
      minimumDate ?? (mode === 'date' ? earliestSelectableDate() : undefined),
    [minimumDate, mode],
  );

  useEffect(() => {
    if (visible) {
      // Keyboard + native date dialog together can crash on many Android devices.
      Keyboard.dismiss();
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
        mode={mode}
        display={mode === 'date' ? 'calendar' : 'default'}
        minimumDate={resolvedMinimum}
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
            mode={mode}
            display="spinner"
            themeVariant="light"
            textColor={Colors.sacredBrown}
            minimumDate={resolvedMinimum}
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
