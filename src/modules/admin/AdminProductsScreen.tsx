import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import Colors from '../../theme/colors';
import PrimaryButton from '../common/PrimaryButton';
import apiService, {getApiError} from '../../services/apiService';
import AdminScreenLayout from './AdminScreenLayout';
import {AdminProduct} from './adminData';

type SevaOffering = {
  key: string;
  name: string;
  inStock: boolean;
};

const AdminProductsScreen = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [sevaOfferings, setSevaOfferings] = useState<SevaOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStock, setNewStock] = useState('0');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, sevaRes] = await Promise.all([
        apiService.get('/admin/products'),
        apiService.get('/admin/seva-offerings-stock').catch(() => null),
      ]);
      const rows = Array.isArray(productsRes.data?.data)
        ? productsRes.data.data
        : [];
      setProducts(
        rows.map((row: any) => ({
          id: String(row.id),
          name: String(row.name || ''),
          price: 0,
          stock: Number(row.stock || 0),
        })),
      );
      const sevaRows = Array.isArray(sevaRes?.data?.data)
        ? sevaRes.data.data
        : [];
      setSevaOfferings(
        sevaRows.map((row: any) => ({
          key: String(row.key || ''),
          name: String(row.name || row.key || ''),
          inStock: row.inStock !== false,
        })),
      );
    } catch (err) {
      setProducts([]);
      Alert.alert('Products', getApiError(err, 'Could not load products.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleSevaStock = async (item: SevaOffering) => {
    const nextInStock = !item.inStock;
    setBusyId(item.key);
    try {
      await apiService.put(`/admin/seva-offerings-stock/${item.key}`, {
        inStock: nextInStock,
      });
      setSevaOfferings(current =>
        current.map(row =>
          row.key === item.key ? {...row, inStock: nextInStock} : row,
        ),
      );
    } catch (err) {
      Alert.alert(
        'Seva stock',
        getApiError(err, 'Could not update seva offering stock.'),
      );
    } finally {
      setBusyId('');
    }
  };

  const toggleStock = async (item: AdminProduct) => {
    const nextStock = item.stock > 0 ? 0 : 5;
    setBusyId(item.id);
    try {
      await apiService.put(`/admin/products/${item.id}`, {stock: nextStock});
      setProducts(current =>
        current.map(row =>
          row.id === item.id ? {...row, stock: nextStock} : row,
        ),
      );
    } catch (err) {
      Alert.alert('Products', getApiError(err, 'Could not update stock.'));
    } finally {
      setBusyId('');
    }
  };

  const addProduct = async () => {
    const name = newName.trim();
    if (!name) {
      Alert.alert('Required', 'Enter a product name.');
      return;
    }
    setSaving(true);
    try {
      await apiService.post('/admin/products', {
        name,
        stock: Math.max(0, Number(newStock) || 0),
      });
      setNewName('');
      setNewStock('0');
      setShowAdd(false);
      await load();
    } catch (err) {
      Alert.alert('Products', getApiError(err, 'Could not add product.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = (item: AdminProduct) => {
    Alert.alert('Delete product', `Remove ${item.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(item.id);
          try {
            await apiService.delete(`/admin/products/${item.id}`);
            setProducts(current => current.filter(row => row.id !== item.id));
          } catch (err) {
            Alert.alert(
              'Products',
              getApiError(err, 'Could not delete product.'),
            );
          } finally {
            setBusyId('');
          }
        },
      },
    ]);
  };

  return (
    <AdminScreenLayout title="Product Management" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Product Management</Text>
      <Text style={styles.sub}>
        Manage seva offering stock and other spiritual products.
      </Text>

      <Text style={styles.section}>Seva offerings stock</Text>
      <Text style={styles.hint}>
        Mark Baanalingam, Ramakoti Books, Homa Bhasma, and Bhirava Pendant Out of
        Stock. Users still see the tab title with “Out of Stock” under it; tap
        shows a popup and does not open the form.
      </Text>

      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}

      {sevaOfferings.map(item => {
        const inStock = item.inStock;
        return (
          <View key={item.key} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              <Text
                style={[
                  styles.meta,
                  inStock ? styles.metaOn : styles.metaOff,
                ]}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, inStock ? styles.pillOn : styles.pillOff]}
              onPress={() => toggleSevaStock(item)}
              disabled={busyId === item.key}>
              <Text
                style={[
                  styles.pillText,
                  inStock ? styles.pillTextOn : styles.pillTextOff,
                ]}>
                {busyId === item.key
                  ? '...'
                  : inStock
                    ? 'Mark Out of Stock'
                    : 'Mark In Stock'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={styles.gap} />
      <Text style={styles.section}>Other products</Text>

      <PrimaryButton
        title={showAdd ? 'CANCEL' : 'ADD PRODUCT'}
        onPress={() => setShowAdd(current => !current)}
      />
      <View style={styles.gap} />

      {showAdd ? (
        <View style={styles.addCard}>
          <Text style={styles.label}>Product name</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Enter product name"
            placeholderTextColor={Colors.placeholder}
          />
          <Text style={styles.label}>Stock</Text>
          <TextInput
            style={styles.input}
            value={newStock}
            onChangeText={setNewStock}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.placeholder}
          />
          <PrimaryButton
            title={saving ? 'ADDING...' : 'SAVE PRODUCT'}
            onPress={addProduct}
            disabled={saving}
          />
        </View>
      ) : null}

      {!loading && products.length === 0 ? (
        <Text style={styles.empty}>No other products yet. Add one above.</Text>
      ) : null}

      {products.map(item => {
        const inStock = item.stock > 0;
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.stock} in stock</Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, inStock ? styles.pillOn : styles.pillOff]}
              onPress={() => toggleStock(item)}
              disabled={busyId === item.id}>
              <Text
                style={[
                  styles.pillText,
                  inStock ? styles.pillTextOn : styles.pillTextOff,
                ]}>
                {busyId === item.id
                  ? '...'
                  : inStock
                    ? 'In Stock'
                    : 'Out of Stock'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteProduct(item)}
              disabled={busyId === item.id}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.deleteText}>DELETE</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </AdminScreenLayout>
  );
};

export default AdminProductsScreen;

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.sacredBrown,
    marginBottom: 6,
  },
  sub: {
    color: Colors.textSecondary,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    color: Colors.leafGreen,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 4,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  gap: {height: 12},
  addCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  label: {
    color: Colors.leafGreen,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: Colors.sacredBrown,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copy: {flex: 1},
  name: {
    color: Colors.sacredBrown,
    fontWeight: '800',
    fontSize: 15,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  metaOn: {color: Colors.leafGreen},
  metaOff: {color: '#B45309'},
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  pillOn: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.leafGreen,
  },
  pillOff: {
    backgroundColor: '#FCE7F3',
    borderColor: '#DB2777',
  },
  pillText: {fontWeight: '700', fontSize: 12},
  pillTextOn: {color: Colors.leafGreen},
  pillTextOff: {color: '#BE185D'},
  deleteBtn: {paddingHorizontal: 4},
  deleteText: {color: '#DC2626', fontWeight: '700', fontSize: 12},
  empty: {
    color: Colors.textSecondary,
    marginBottom: 12,
    fontSize: 13,
  },
});
