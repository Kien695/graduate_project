// src/navigation/AppStack.js
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VehicleListScreen from '../screens/vehicle/VehicleListScreen';
import CreateOrderScreen from '../screens/order/CreateOrderScreen';
import MyOrdersScreen from '../screens/order/MyOrdersScreen';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#12151C' },
        headerTintColor: '#F5F3EE',
      }}
    >
      <Stack.Screen name="VehicleList" component={VehicleListScreen} options={{ title: 'Chọn xe' }} />
      <Stack.Screen name="CreateOrder" component={CreateOrderScreen} options={{ title: 'Đặt xe' }} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: 'Đơn hàng của tôi' }} />
    </Stack.Navigator>
  );
}