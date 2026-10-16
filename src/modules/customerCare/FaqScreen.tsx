import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {useLanguage} from '../../i18n/LanguageContext';
import {TranslationKey} from '../../i18n';
import apiService, {getApiError} from '../../services/apiService';
import Colors from '../../theme/colors';
import ApiErrorPanel from '../common/ApiErrorPanel';
import ScreenLayout from '../common/ScreenLayout';

const FAQ_BY_ENGLISH: Record<
  string,
  {question: TranslationKey; answer: TranslationKey}
> = {
  'How does Japa work?': {
    question: 'faqHowJapaWorksQ',
    answer: 'faqHowJapaWorksA',
  },
  'How are Japa counts protected?': {
    question: 'faqCountsProtectedQ',
    answer: 'faqCountsProtectedA',
  },
  'How do I donate Annadanam?': {
    question: 'faqDonateAnnadanamQ',
    answer: 'faqDonateAnnadanamA',
  },
  'How do I track my order?': {
    question: 'faqTrackOrderQ',
    answer: 'faqTrackOrderA',
  },
  'How do I change language?': {
    question: 'faqChangeLanguageQ',
    answer: 'faqChangeLanguageA',
  },
};

const normalizeFaqQuestion = (raw: string) =>
  String(raw || '')
    .replace(/\bSmart Japa\b/gi, 'Japa')
    .replace(/\bSmart\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const FaqScreen = () => {
  const {t, tt} = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiService
      .get('/customer-care/faq')
      .then(response => setItems(response.data.data ?? []))
      .catch(err => {
        setRawError(err);
        setError(getApiError(err, t('couldNotLoadFaq')));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenLayout title={t('faq')} showBack tab="Profile">
      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}
      {error ? (
        <ApiErrorPanel error={error} rawError={rawError} onRetry={load} />
      ) : null}
      {items.map(item => {
        const englishQ = normalizeFaqQuestion(String(item.question || ''));
        const mapped = FAQ_BY_ENGLISH[englishQ];
        const questionText = mapped
          ? t(mapped.question)
          : tt(englishQ) || englishQ;
        const rawAnswer = String(item.answer || '')
          .replace(/\bSmart Japa\b/gi, 'Japa')
          .replace(/\bSmart\b/gi, '')
          .replace(/or voice chant /gi, '')
          .replace(/or voice /gi, '')
          .replace(/voice chant/gi, 'tap');
        const answerText = mapped ? t(mapped.answer) : tt(rawAnswer) || rawAnswer;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => setOpen(open === item.id ? null : item.id)}>
            <View style={styles.row}>
              <Text style={styles.q}>{questionText}</Text>
              <Text style={styles.plus}>{open === item.id ? '−' : '+'}</Text>
            </View>
            {open === item.id ? <Text style={styles.a}>{answerText}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </ScreenLayout>
  );
};

export default FaqScreen;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  q: {flex: 1, fontWeight: '800', color: Colors.sacredBrown},
  plus: {fontSize: 22, color: Colors.templeGold, fontWeight: '800'},
  a: {marginTop: 10, color: Colors.textSecondary, lineHeight: 20},
});
