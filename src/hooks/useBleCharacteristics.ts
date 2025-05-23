import { useState } from 'react';
import BLEManagerService, { BLECharacteristic } from '../services/BLEManager';

export const useBleCharacteristics = (deviceId: string) => {
    const [characteristics, setCharacteristics] = useState<BLECharacteristic[]>([]);
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const bleManager = BLEManagerService.getInstance();

    const selectService = async (serviceUUID: string) => {
        try {
            setSelectedService(serviceUUID);
            setIsLoading(true);
            const discoveredCharacteristics = await bleManager.discoverCharacteristics(deviceId, serviceUUID);
            setCharacteristics(discoveredCharacteristics);
            setIsLoading(false);
            return discoveredCharacteristics;
        } catch (error) {
            console.error('Error al descubrir características:', error);
            setIsLoading(false);
            throw error;
        }
    };

    return {
        characteristics,
        selectedService,
        isLoading,
        selectService,
        setSelectedService
    };
};