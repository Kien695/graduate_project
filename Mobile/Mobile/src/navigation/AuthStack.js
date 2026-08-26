// src/navigation/AuthStack.js
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterCustomerScreen from '../screens/auth/RegisterCustomerScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RegisterCustomer" component={RegisterCustomerScreen} />
    </Stack.Navigator>
  );
}
