// App.js
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}
