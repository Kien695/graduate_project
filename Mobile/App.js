// App.js
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import ThemedStatusBar from './src/components/common/ThemedStatusBar';

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemedStatusBar />
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}
