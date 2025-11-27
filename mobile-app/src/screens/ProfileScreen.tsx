import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchReputation } from '../store/slices/userSlice';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { address } = useSelector((state: RootState) => state.wallet);
  const { reputation, tasksCompleted, tasksRejected, totalEarnings } = useSelector(
    (state: RootState) => state.user
  );

  useEffect(() => {
    if (address) {
      dispatch(fetchReputation(address));
    }
  }, [address, dispatch]);

  const successRate =
    tasksCompleted + tasksRejected > 0
      ? ((tasksCompleted / (tasksCompleted + tasksRejected)) * 100).toFixed(1)
      : '0';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.reputationCard}>
          <Text style={styles.reputationLabel}>Reputation Score</Text>
          <Text style={styles.reputationValue}>{reputation}</Text>
          <View style={styles.reputationBar}>
            <View style={[styles.reputationFill, { width: `${reputation}%` }]} />
          </View>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{tasksCompleted}</Text>
            <Text style={styles.statLabel}>Tasks Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{successRate}%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalEarnings}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.address}>{address || 'Not connected'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  reputationCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reputationLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  reputationValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  reputationBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  reputationFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  address: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});

