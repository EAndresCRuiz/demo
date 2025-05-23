/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainScreen from './src/screens/MainScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import BleDeviceConnector from './src/components/BleDeviceConnector';
import { RootStackParamList, DeviceConnectorRouteProp } from './src/types/navigation';
import { useDeviceConnector } from './src/hooks/useDeviceConnector';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Habilitar screens para mejorar el rendimiento de la navegación
enableScreens();

// Create a typed stack navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Main"
            component={MainScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="DeviceConnector"
            component={DeviceConnectorScreen}
            options={{
              title: 'BLE Device',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

// DeviceConnectorScreen component with proper typing
interface DeviceConnectorScreenProps {
  route: DeviceConnectorRouteProp;
  navigation: NativeStackNavigationProp<RootStackParamList, 'DeviceConnector'>;
}

const DeviceConnectorScreen: React.FC<DeviceConnectorScreenProps> = ({ route }) => {
  const { deviceId, handleDisconnect } = useDeviceConnector(route.params.deviceId);
  
  return (
    <BleDeviceConnector 
      deviceId={deviceId} 
      onDisconnect={handleDisconnect} 
    />
  );
};

export default App;
