import { useEffect, useState } from 'react';
import BLEManagerService, { BLEService } from '../services/BLEManager';

export const useBleServices = (deviceId: string, isConnected: boolean) => {
  const [services, setServices] = useState<BLEService[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const bleManager = BLEManagerService.getInstance();

  useEffect(() => {
    const discover = async () => {
      if (!deviceId || !isConnected) return;

      setIsDiscovering(true);
      setError(null);

      try {
        const discoveredServices = await bleManager.discoverServices(deviceId);
        setServices(discoveredServices);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsDiscovering(false);
      }
    };

    discover();
  }, [deviceId, isConnected]);

  return { services, isDiscovering, error };
};
