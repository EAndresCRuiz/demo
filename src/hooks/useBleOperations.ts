import { useState } from 'react';
import BLEManagerService from '../services/BLEManager';

export const useBleOperations = (deviceId: string) => {
    const [receivedData, setReceivedData] = useState<string>('');
    const [messageToSend, setMessageToSend] = useState<string>('Hola desde la app');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [notifyingCharacteristics, setNotifyingCharacteristics] = useState<Set<string>>(new Set());

    const bleManager = BLEManagerService.getInstance();

    const readCharacteristic = async (serviceUUID: string, characteristicUUID: string) => {
        try {
            setIsLoading(true);
            const data = await bleManager.readStringCharacteristic(deviceId, serviceUUID, characteristicUUID);
            setReceivedData(prev => `${new Date().toLocaleTimeString()} [LECTURA] ${data}\n${prev}`);
            setIsLoading(false);
        } catch (error) {
            console.error('Error al leer característica:', error);
            setIsLoading(false);
            setReceivedData(prev => `${new Date().toLocaleTimeString()} [ERROR] Error al leer: ${error}\n${prev}`);
        }
    };

    const writeCharacteristic = async (serviceUUID: string, characteristicUUID: string) => {
        try {
            setIsLoading(true);
            await bleManager.writeStringCharacteristic(deviceId, serviceUUID, characteristicUUID, messageToSend);
            setReceivedData(prev => `${new Date().toLocaleTimeString()} [ENVIADO] ${messageToSend}\n${prev}`);
            setIsLoading(false);
        } catch (error) {
            console.error('Error al escribir característica:', error);
            setIsLoading(false);
            setReceivedData(prev => `${new Date().toLocaleTimeString()} [ERROR] Error al escribir: ${error}\n${prev}`);
        }
    };

    const startNotifications = async (serviceUUID: string, characteristicUUID: string) => {
        try {
            setIsLoading(true);
            await bleManager.startNotifications(
                deviceId,
                serviceUUID,
                characteristicUUID,
                (value) => {
                    setReceivedData(prev => `${new Date().toLocaleTimeString()} [NOTIFICACIÓN] ${value}\n${prev}`);
                }
            );

            setNotifyingCharacteristics(prev => new Set(prev).add(characteristicUUID));
            setIsLoading(false);
            setReceivedData(prev => `${new Date().toLocaleTimeString()} [INFO] Notificaciones iniciadas para ${characteristicUUID}\n${prev}`);
        } catch (error) {
            console.error('Error al activar notificaciones:', error);
            setIsLoading(false);
            setReceivedData(prev => `${new Date().toLocaleTimeString()} [ERROR] Error al iniciar notificaciones: ${error}\n${prev}`);
        }
    };

    const stopNotifications = async (serviceUUID: string, characteristicUUID: string) => {
        try {
            setIsLoading(true);
            await bleManager.stopNotifications(deviceId, serviceUUID, characteristicUUID);

            const updatedNotifying = new Set(notifyingCharacteristics);
            updatedNotifying.delete(characteristicUUID);
            setNotifyingCharacteristics(updatedNotifying);

            setIsLoading(false);
            setReceivedData(prev => `${new Date().toLocaleTimeString()} [INFO] Notificaciones detenidas para ${characteristicUUID}\n${prev}`);
        } catch (error) {
            console.error('Error al desactivar notificaciones:', error);
            setIsLoading(false);
            setReceivedData(prev => `${new Date().toLocaleTimeString()} [ERROR] Error al detener notificaciones: ${error}\n${prev}`);
        }
    };

    const clearReceivedData = () => {
        setReceivedData('');
    };

    return {
        receivedData,
        messageToSend,
        isLoading,
        notifyingCharacteristics,
        setMessageToSend,
        readCharacteristic,
        writeCharacteristic,
        startNotifications,
        stopNotifications,
        clearReceivedData
    };
};