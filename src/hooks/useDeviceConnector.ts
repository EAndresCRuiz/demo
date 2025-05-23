import { useNavigation } from '@react-navigation/native';
import { MainScreenNavigationProp } from '../types/navigation';

export const useDeviceConnector = (deviceId: string) => {
  const navigation = useNavigation<MainScreenNavigationProp>();
  
  const handleDisconnect = () => {
    // Volver a la pantalla principal al desconectar
    navigation.goBack();
  };
  
  return {
    deviceId,
    handleDisconnect
  };
};