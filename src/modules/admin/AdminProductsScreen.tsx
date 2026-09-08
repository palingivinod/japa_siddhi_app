import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../../theme/colors';
import AdminScreenLayout from './AdminScreenLayout';
import {ADMIN_PRODUCTS, AdminProduct} from './adminData';

const AdminProductsScreen = () => {
  const [products, setProducts] = useState<AdminProduct[]>(ADMIN_PRODUCTS);

  const toggleStock = (id: string) => {
    setProducts(current =>
      current.map(item => {
        if (item.id !== id) {
          return item;
        }
        return {...item, stock: item.stock > 0 ? 0 : 5};
      }),
    );
  };

  return (
    <AdminScreenLayout title="Product Management" tab="AdminDashboard" showBack>
      <Text style={styles.heading}>Product Management</Text>
      <Text style={styles.sub}>Manage spiritual products and stock.</Text>

      {products.map(item => {
        const inStock = item.stock > 0;
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                ₹{item.price} • {item.stock}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, inStock ? styles.pillOn : styles.pillOff]}
              onPress={() => toggleStock(item.id)}>
              <Text
                style={[
                  styles.pillText,
                  inStock ? styles.pillTextOn : styles.pillTextOff,
                ]}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </Text>
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
  copy: {flex: 1},
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
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillOn: {borderColor: Colors.leafGreen},
  pillOff: {borderColor: Colors.error},
  pillText: {fontWeight: '800', fontSize: 13},
  pillTextOn: {color: Colors.leafGreen},
  pillTextOff: {color: Colors.error},
});
