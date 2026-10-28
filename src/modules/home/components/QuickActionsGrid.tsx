import React from 'react';
import {
  StyleSheet,
  View,
  Text,
} from 'react-native';

import QuickActionCard from './QuickActionCard';
import {HomeQuickAction} from '../types/home';

interface Props {
  actions?: HomeQuickAction[];
  onPress: (route: string) => void;
}

const QuickActionsGrid: React.FC<Props> = ({
  actions = [],
  onPress,
}) => {
  if (actions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No Services Available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {actions.map(item => (
        <QuickActionCard
          key={item.id}
          item={item}
          onPress={onPress}
        />
      ))}
    </View>
  );
};

export default QuickActionsGrid;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },

  emptyContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});