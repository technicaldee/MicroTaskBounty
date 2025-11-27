import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchBalance, connectWallet } from '../store/slices/walletSlice';

export default function WalletScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { address, balance, connected, loading } = useSelector(
    (state: RootState) => state.wallet
  );

  useEffect(() => {
    if (connected) {
      dispatch(fetchBalance());
    }
  }, [connected, dispatch]);

  const handleConnect = () => {
    // In production, integrate with Valora or WalletConnect
    // For now, show placeholder
    Alert.alert('Wallet Connection', 'Please integrate with Valora or WalletConnect');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {!connected ? (
          <View style={styles.connectSection}>
            <Text style={styles.title}>Connect Wallet</Text>
            <Text style={styles.subtitle}>
              Connect your wallet to start earning from tasks
            </Text>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleConnect}
              disabled={loading}
            >
              <Text style={styles.connectButtonText}>
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>{balance} cUSD</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              <Text style={styles.address}>{address}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending</Text>
              <Text style={styles.amount}>0.00 cUSD</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Verified</Text>
              <Text style={styles.amount}>{balance} cUSD</Text>
            </View>
          </>
        )}
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
  connectSection: {
    alignItems: 'center',
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  balanceCard: {
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
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  address: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  amount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

