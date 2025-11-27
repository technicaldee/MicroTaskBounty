import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function VerificationScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verification Queue</Text>
        <Text style={styles.subtitle}>
          Review and verify task submissions to earn rewards
        </Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No pending verifications</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});




