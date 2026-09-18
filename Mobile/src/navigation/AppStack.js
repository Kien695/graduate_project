import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/home/HomeScreen";
import VehicleListScreen from "../screens/vehicle/VehicleListScreen";
import VehicleDetailScreen from "../screens/vehicle/VehicleDetailScreen";
import OrderConfirmScreen from "../screens/order/OrderConfirmScreen";
import MyOrdersScreen from "../screens/order/MyOrdersScreen";
import ContractListScreen from "../screens/contract/ContractListScreen";
import ContractDetailScreen from "../screens/contract/ContractDetailScreen";
import InspectionStatusScreen from "../screens/inspection/InspectionStatusScreen";
import AccountScreen from "../screens/account/AccountScreen";
import NotificationListScreen from "../screens/notification/NotificationListScreen";
import NotificationDetailScreen from "../screens/notification/NotificationDetailScreen";
import { useTheme } from "../hooks/useTheme";

const Stack = createNativeStackNavigator();

export default function AppStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VehicleList"
        component={VehicleListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VehicleDetail"
        component={VehicleDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderConfirm"
        component={OrderConfirmScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ContractList"
        component={ContractListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ContractDetail"
        component={ContractDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InspectionStatus"
        component={InspectionStatusScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationList"
        component={NotificationListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
