import { useState, useEffect } from 'react';
import BLEManagerService, { BLEService } from '../services/BLEManager';

export const useDeviceConnection = (deviceId: string, onDisconnect: () => void) => {
    const [deviceInfo, setDeviceInfo] = useState<{ name: string, rssi: number | null }>({
        name: 'Desconocido',
        rssi: null
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [services, setServices] = useState<BLEService[]>([]);
    const [notifyingCharacteristics, setNotifyingCharacteristics] = useState<Set<string>>(new Set());

    const bleManager = BLEManagerService.getInstance();

    useEffect(() => {
        const getDeviceInfo = async () => {
            try {
                const devices = await bleManager.connectToDevice(deviceId);
                discoverServices();
            } catch (error) {
                console.error('Error al obtener información del dispositivo:', error);
            }
        };

        getDeviceInfo();

        return () => {
            cleanupConnection();
        };
    }, []);

    const discoverServices = async () => {
        try {
            setIsLoading(true);
            const discoveredServices = await bleManager.discoverServices(deviceId);
            setServices(discoveredServices);
            setIsLoading(false);
            return discoveredServices;
        } catch (error) {
            console.error('Error al descubrir servicios:', error);
            setIsLoading(false);
            throw error;
        }
    };

    const cleanupConnection = async () => {
        try {
            // Detener todas las notificaciones activas
            for (const charUuid of notifyingCharacteristics) {
                await bleManager.stopNotifications(deviceId, '', charUuid);
            }

            // Desconectar del dispositivo
            await bleManager.disconnectFromDevice(deviceId);

            // Limpiar otros recursos
            bleManager.cleanup();
        } catch (error) {
            console.error('Error durante la limpieza:', error);
        }
    };

    const disconnect = async () => {
        try {
            setIsLoading(true);
            await cleanupConnection();
            setIsLoading(false);
            onDisconnect();
        } catch (error) {
            console.error('Error al desconectar:', error);
            setIsLoading(false);
        }
    };

    return {
        deviceInfo,
        isLoading,
        disconnect,
        services
    };
};