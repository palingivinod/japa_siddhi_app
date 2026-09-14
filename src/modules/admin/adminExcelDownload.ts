import {
  Alert,
  Linking,
  NativeModules,
  Platform,
  Share,
} from 'react-native';

import ENV from '../../env';
import apiService, {getApiError} from '../../services/apiService';

const {FileDownload} = NativeModules;

/** Download an admin Excel report by type (users, japa, all, …). */
export const downloadAdminExcel = async (type: string, label: string) => {
  const response = await apiService.get('/admin/reports/export', {
    params: {type},
  });
  const file = response.data?.data || {};
  const fileName = String(
    file.fileName || `report-${type}-${Date.now()}.xlsx`,
  );
  const mimeType =
    String(file.mimeType || '') ||
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const base64 = String(file.base64 || '');

  if (base64 && FileDownload?.saveBase64File) {
    const savedUri = await FileDownload.saveBase64File(
      fileName,
      base64,
      mimeType,
    );
    Alert.alert(
      'Excel downloaded',
      `${label}\n${fileName} saved to Downloads.\n\n${savedUri || ''}`,
    );
    return;
  }

  const apiOrigin = String(ENV.API_URL).replace(/\/api\/v1\/?$/, '');
  const url =
    (file.path ? `${apiOrigin}${file.path}` : '') ||
    String(file.url || '') ||
    `${ENV.API_URL}/admin/reports/export?type=${encodeURIComponent(
      type,
    )}&download=1`;

  try {
    await Linking.openURL(url);
    Alert.alert('Excel ready', `${fileName} is opening for download.`);
  } catch {
    await Share.share({
      title: fileName,
      message:
        Platform.OS === 'ios'
          ? `${label}: ${fileName}`
          : `${label} download:\n${url}`,
      url,
    });
  }
};

export const alertExcelError = (err: unknown) => {
  Alert.alert(
    'Export failed',
    getApiError(err, 'Could not generate Excel sheet.'),
  );
};
