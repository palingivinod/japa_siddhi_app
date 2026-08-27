import Colors from './colors';

export const isFormError = (text: string) =>
  /required|failed|could not|invalid|unable|enter a|tap the|must/i.test(text);

export const formMessageColor = (text: string) =>
  isFormError(text) ? Colors.error : Colors.success;
