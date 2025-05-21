import { NavigationProp, RouteProp } from '@react-navigation/native';

// Define the parameter list for each screen
export type RootStackParamList = {
  Main: undefined;
  DeviceConnector: { deviceId: string };
  // Add other screens here as needed
};

// Create a type for the navigation prop
export type MainScreenNavigationProp = NavigationProp<RootStackParamList, 'Main'>;

// Create a type for the route prop
export type DeviceConnectorRouteProp = RouteProp<RootStackParamList, 'DeviceConnector'>;