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

const AdminProductsScreen = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStock, setNewStock] = useState('0');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/admin/products');
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setProducts(
        rows.map((row: any) => ({
          id: String(row.id),
          name: String(row.name || ''),
          price: 0,
          stock: Number(row.stock || 0),
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
      <Text style={styles.sub}>Manage spiritual products and stock.</Text>

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

      {loading ? <ActivityIndicator color={Colors.templeGold} /> : null}

      {!loading && products.length === 0 ? (
        <Text style={styles.empty}>No products yet. Add one above.</Text>
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
  },
  sub: {
    marginTop: 6,
    marginBottom: 16,
    color: Colors.textSecondary,
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
    height: 48,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    marginBottom: 12,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  empty: {
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {flex: 1, paddingRight: 8},
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.sacredBrown,
  },
  meta: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  pillOn: {borderColor: Colors.leafGreen},
  pillOff: {borderColor: Colors.error},
  pillText: {fontWeight: '800', fontSize: 12},
  pillTextOn: {color: Colors.leafGreen},
  pillTextOff: {color: Colors.error},
  deleteBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  deleteText: {
    color: Colors.error,
    fontWeight: '800',
    fontSize: 12,
  },
});
