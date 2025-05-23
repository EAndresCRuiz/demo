import { useNavigation } from '@react-navigation/native';
import { MainScreenNavigationProp } from '../types/navigation';

export const useDeviceConnector = (deviceId: string) => {
  const navigation = useNavigation<MainScreenNavigationProp>();
  
  const handleDisconnect = () => {
    // Volver a la pantalla principal al desconectar
    if (navigation.canGoBack()) {
        navigation.goBack();
    } else {
        navigation.navigate('Main');
    }
  };
  
  return {
    deviceId,
    handleDisconnect
  };
};