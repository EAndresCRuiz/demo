/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainScreen from './src/screens/MainScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import BleDeviceConnector from './src/components/BleDeviceConnector';
import { RootStackParamList } from './src/types/navigation';

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

// Update the DeviceConnectorScreen to use the typed route
const DeviceConnectorScreen = ({ route, navigation }) => {
  const { deviceId } = route.params;
  
  const handleDisconnect = () => {
    // Volver a la pantalla principal al desconectar
    navigation.goBack();
  };
  
  return (
    <BleDeviceConnector 
      deviceId={deviceId} 
      onDisconnect={handleDisconnect} 
    />
  );
};

export default App;
