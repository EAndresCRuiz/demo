import { useState, useEffect } from 'react';
import BLEManagerService, { BLEService } from '../services/BLEManager';

export const useDeviceConnection = (deviceId: string, onDisconnect: () => void) => {
    const [deviceInfo, setDeviceInfo] = useState<{ name: string, rssi: number | null }>({
        name: 'Desconocido',
        rssi: null
    });
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [notifyingCharacteristics, setNotifyingCharacteristics] = useState<Set<string>>(new Set());

    const bleManager = BLEManagerService.getInstance();

    useEffect(() => {
        let isMounted = true;

        const connect = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const connectedDevice = await bleManager.connectToDevice(deviceId);

                if (!isMounted) return;

                setIsConnected(true);
            } catch (err) {
                if (isMounted) {
                    setError(err as Error);
                    setIsConnected(false);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        connect();

        return () => {
            isMounted = false;
            bleManager.disconnectFromDevice(deviceId);
            if (onDisconnect) onDisconnect();
        };
    }, [deviceId]);

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
        isConnected,
        isLoading,
        error,
        disconnect,
    };
};