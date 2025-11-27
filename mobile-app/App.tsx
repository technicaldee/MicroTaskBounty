import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { store } from './src/store';
import TaskFeedScreen from './src/screens/TaskFeedScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import WalletScreen from './src/screens/WalletScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import VerificationScreen from './src/screens/VerificationScreen';
import { blockchainService } from './src/services/blockchain';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TaskStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TaskFeed" component={TaskFeedScreen} options={{ title: 'Tasks' }} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Details' }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Tasks" component={TaskStack} />
      <Tab.Screen name="Verification" component={VerificationScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    // Initialize blockchain service
    blockchainService.initialize().catch(console.error);
  }, []);

  return (
    <Provider store={store}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <MainTabs />
      </NavigationContainer>
    </Provider>
  );
}




