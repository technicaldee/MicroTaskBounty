import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Task } from '../store/slices/taskSlice';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const bountyAmount = parseFloat(task.bountyAmount) / 1e18; // Convert from wei
  const deadlineDate = new Date(Number(task.deadline) * 1000);
  const timeRemaining = deadlineDate.getTime() - Date.now();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

  return (
    <View style={styles.card}>
      <Text style={styles.description} numberOfLines={2}>
        {task.description}
      </Text>
      
      <View style={styles.row}>
        <View style={styles.bounty}>
          <Text style={styles.bountyAmount}>{bountyAmount.toFixed(2)} cUSD</Text>
        </View>
        
        <View style={styles.deadline}>
          <Text style={styles.deadlineText}>
            {hoursRemaining > 0 ? `${hoursRemaining}h left` : 'Expired'}
          </Text>
        </View>
      </View>

      {task.distance !== undefined && (
        <Text style={styles.distance}>{task.distance.toFixed(0)}m away</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bounty: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bountyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  deadline: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deadlineText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
  },
  distance: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
});




