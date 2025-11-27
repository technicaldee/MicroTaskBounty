import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import { RootState, AppDispatch } from '../store';
import { claimTask } from '../store/slices/taskSlice';
import { blockchainService } from '../services/blockchain';

export default function TaskDetailScreen() {
  const route = useRoute();
  const dispatch = useDispatch<AppDispatch>();
  const { taskId } = route.params as { taskId: number };
  const { claimedTasks, activeTasks } = useSelector((state: RootState) => state.tasks);
  const { address } = useSelector((state: RootState) => state.wallet);
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      const taskManager = blockchainService.getTaskManager();
      const taskData = await taskManager.getTask(taskId);
      setTask({
        id: Number(taskData.id),
        description: taskData.description,
        bountyAmount: taskData.bountyAmount.toString(),
        deadline: Number(taskData.deadline),
        category: taskData.category,
        status: taskData.status,
      });
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!address) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    if (activeTasks.length >= 3) {
      Alert.alert('Error', 'You can only have 3 active tasks at a time');
      return;
    }

    try {
      await dispatch(claimTask(taskId)).unwrap();
      Alert.alert('Success', 'Task claimed successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to claim task');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.container}>
        <Text>Task not found</Text>
      </View>
    );
  }

  const isClaimed = claimedTasks.includes(taskId);
  const deadlineDate = new Date(task.deadline * 1000);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{task.description}</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>Bounty</Text>
          <Text style={styles.value}>{task.bountyAmount} cUSD</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Deadline</Text>
          <Text style={styles.value}>{deadlineDate.toLocaleString()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>Category {task.category}</Text>
        </View>

        {!isClaimed && (
          <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
            <Text style={styles.claimButtonText}>Claim Task</Text>
          </TouchableOpacity>
        )}

        {isClaimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedText}>Task Claimed</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
  },
  claimButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  claimedBadge: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  claimedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});




