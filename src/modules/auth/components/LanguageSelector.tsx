import React, {useEffect, useMemo, useState} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import {useLanguage} from '../../../i18n/LanguageContext';
import Colors from '../../../theme/colors';
import {dismissKeyboardThen} from '../../../utils/keyboard';
import profileApi from '../services/profileApi';
import {
  FALLBACK_LANGUAGES,
  Language,
  findEnglish,
  normalizeLanguage,
} from '../../../constants/languages';

interface Props {
  value: Language | null;
  onChange: (language: Language) => void;
}

const LanguageSelector: React.FC<Props> = ({
  value,
  onChange,
}) => {
  const {t} = useLanguage();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [languages, setLanguages] = useState<Language[]>(
    FALLBACK_LANGUAGES,
  );

  useEffect(() => {
    loadLanguages();
  }, []);

  const applyLanguages = (list: Language[]) => {
    const nextList = list.length > 0 ? list : FALLBACK_LANGUAGES;
    setLanguages(nextList);

    if (!value) {
      onChange(findEnglish(nextList));
    }
  };

  const loadLanguages = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getLanguages();
      const list = Array.isArray(response)
        ? response.map(normalizeLanguage).filter(item => item.name)
        : [];
      applyLanguages(list);
    } catch (error) {
      console.log('Load Languages Error:', error);
      applyLanguages(FALLBACK_LANGUAGES);
    } finally {
      setLoading(false);
    }
  };

  const filteredLanguages = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return languages;
    }

    return languages.filter(
      item =>
        item.name.toLowerCase().includes(keyword) ||
        item.nativeName.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword),
    );
  }, [languages, search]);

  const selectLanguage = (language: Language) => {
    onChange(language);
    setVisible(false);
    setSearch('');
  };

  const selectedLabel =
    value?.nativeName || value?.name || 'English';

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => dismissKeyboardThen(() => setVisible(true))}>
        <Text style={styles.selectedText}>{selectedLabel}</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        visible={visible}
        onRequestClose={() => setVisible(false)}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('selectLanguageTitle')}</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.close}>{t('closeLabel')}</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.search}
            placeholder={t('searchLanguage')}
            placeholderTextColor={Colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={filteredLanguages}
              keyExtractor={(item, index) =>
                item.code || String(item.id) || String(index)
              }
              ListEmptyComponent={
                <Text style={styles.empty}>{t('noLanguagesFound')}</Text>
              }
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => selectLanguage(item)}>
                  <Text style={styles.itemText}>
                    {item.nativeName || item.name}
                  </Text>
                  <Text style={styles.code}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </>
  );
};

export default LanguageSelector;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  close: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },

  selector: {
    height: 55,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    justifyContent: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
  },

  selectedText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },

  search: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    color: Colors.textPrimary,
  },

  item: {
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ECECEC',
  },

  itemText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  code: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },

  empty: {
    marginTop: 24,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 15,
  },
});
