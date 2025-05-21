import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, TextInput, FlatList, TouchableOpacity, ScrollView, Platform } from 'react-native';
import BLEManagerService, { BLEDevice, BLEService, BLECharacteristic } from '../services/BLEManager';

interface Props {
  deviceId: string;
  onDisconnect: () => void;
}

const BleDeviceConnector: React.FC<Props> = ({ deviceId, onDisconnect }) => {
  const [services, setServices] = useState<BLEService[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [characteristics, setCharacteristics] = useState<BLECharacteristic[]>([]);
  const [receivedData, setReceivedData] = useState<string>('');
  const [messageToSend, setMessageToSend] = useState<string>('Hola desde la app');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notifyingCharacteristics, setNotifyingCharacteristics] = useState<Set<string>>(new Set());
  const [deviceInfo, setDeviceInfo] = useState<{name: string, rssi: number | null}>({name: 'Desconocido', rssi: null});
  
  const bleManager = BLEManagerService.getInstance();
  
  useEffect(() => {
    // Obtener información básica del dispositivo
    const getDeviceInfo = async () => {
      try {
        const devices = await bleManager.connectToDevice(deviceId)
        //getDiscoveredDevices();
        console.log("devices ");
        console.log(devices);
        
        /* devices.map(device => {
            bleManager.discoverServices(device.id)
            .then(res => {
                console.log("estory en then");
                console.log(res);
                
                
            })
            .catch(err => {
                console.log("hubo error");
                console.log(err);
                
                
            })
        }) */
        
        /* const device = devices.find(d => {

            if(d.id === deviceId){
                console.log("ENCONTRADOOOO");
                console.log(d);
                
                
                return d;
            }
      }); */
        /* console.log("devices log");
        console.log(device); */
        
        
        /* if (device) {
          setDeviceInfo({
            name: device.name || 'Dispositivo sin nombre',
            rssi: device.rssi || null
          });
        } */
          discoverServices();
      } catch (error) {
        console.error('Error al obtener información del dispositivo:', error);
      }
    };

    
    getDeviceInfo();
    
    
    return () => {
        console.log("VA A LIMPIAR!!!");
        
      // Limpiar al desmontar - desconectar y detener notificaciones
      cleanupConnection();
    };
  }, []);
  
  const cleanupConnection = async () => {
    try {
      // Detener todas las notificaciones activas
      for (const charUuid of notifyingCharacteristics) {
        if (selectedService) {
          await bleManager.stopNotifications(deviceId, selectedService, charUuid);
        }
      }
      
      // Desconectar del dispositivo
      await bleManager.disconnectFromDevice(deviceId);
      
      // Limpiar otros recursos
      bleManager.cleanup();
    } catch (error) {
      console.error('Error durante la limpieza:', error);
    }
  };
  
  const discoverServices = async () => {
    try {
        
      setIsLoading(true);
      const discoveredServices = await bleManager.discoverServices(deviceId);
      
      
      setServices(discoveredServices);
      setIsLoading(false);
    } catch (error) {
      console.error('Error al descubrir servicios:', error);
      setIsLoading(false);
    }
  };
  
  const selectService = async (serviceUUID: string) => {
    try {
      setSelectedService(serviceUUID);
      setIsLoading(true);
      const discoveredCharacteristics = await bleManager.discoverCharacteristics(deviceId, serviceUUID);
      setCharacteristics(discoveredCharacteristics);
      setIsLoading(false);
    } catch (error) {
      console.error('Error al descubrir características:', error);
      setIsLoading(false);
    }
  };
  
  const readCharacteristic = async (serviceUUID: string, characteristicUUID: string) => {
    try {
      setIsLoading(true);
      const data = await bleManager.readStringCharacteristic(deviceId, serviceUUID, characteristicUUID);
      
      
      // Update the state with the received data - this is where the fix is needed
      setReceivedData(prev => {
        
        
        return `${new Date().toLocaleTimeString()} [LECTURA] ${data}\n${prev}`
      });
      
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
      
      // Actualizar el conjunto de características con notificaciones activas
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
      
      // Actualizar el conjunto de características con notificaciones activas
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
  
  const disconnect = async () => {
    try {
      setIsLoading(true);
      await cleanupConnection();
      setIsLoading(false);
      // Llamar al callback de desconexión para volver a la pantalla anterior
      onDisconnect();
    } catch (error) {
      console.error('Error al desconectar:', error);
      setIsLoading(false);
    }
  };
  
  const clearReceivedData = () => {
    setReceivedData('');
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.deviceInfo}>
          <Text style={styles.title}>{deviceInfo.name}</Text>
          <Text style={styles.deviceId}>ID: {deviceId.substring(0, 10)}...</Text>
          {deviceInfo.rssi && <Text style={styles.rssi}>RSSI: {deviceInfo.rssi} dBm</Text>}
        </View>
        <TouchableOpacity 
          style={styles.disconnectButton} 
          onPress={disconnect}
        >
          <Text style={styles.disconnectButtonText}>Desconectar</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Procesando...</Text>
        </View>
      )}
      
      <Text style={styles.sectionTitle}>Servicios:</Text>
      <FlatList
        style={styles.scrollView}
        data={services}
        keyExtractor={(item) => item.uuid}
        renderItem={({item: service}) => (
          <TouchableOpacity 
            style={[
              styles.item, 
              selectedService === service.uuid && styles.selectedItem
            ]}
            onPress={() => selectService(service.uuid)}
          >
            <Text style={styles.itemTitle}>Servicio</Text>
            <Text style={styles.uuid}>{service.uuid}</Text>
            <Text style={styles.isPrimary}>
              {'Secundario'}
            </Text>
          </TouchableOpacity>
        )}
      />
      
      {selectedService && (
        <>
          <Text style={styles.sectionTitle}>Características:</Text>
          <FlatList
            style={styles.scrollView}
            data={characteristics}
            keyExtractor={(item) => item.uuid}
            renderItem={({item: characteristic}) => (
              <View style={styles.characteristicItem}>
                <Text style={styles.itemTitle}>Característica</Text>
                <Text style={styles.uuid}>{characteristic.uuid}</Text>
                <View style={styles.propertiesContainer}>
                  {Object.entries(characteristic.properties).map(([key, value]) => 
                    value && (
                      <Text key={key} style={styles.propertyTag}>
                        {key}
                      </Text>
                    )
                  )}
                </View>
                <View style={styles.buttonRow}>
                  {characteristic.properties.read && (
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => readCharacteristic(selectedService, characteristic.uuid)}
                    >
                      <Text style={styles.actionButtonText}>Leer</Text>
                    </TouchableOpacity>
                  )}
                  
                  {characteristic.properties.write && (
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => writeCharacteristic(selectedService, characteristic.uuid)}
                    >
                      <Text style={styles.actionButtonText}>Escribir</Text>
                    </TouchableOpacity>
                  )}
                  
                  {characteristic.properties.notify && (
                    notifyingCharacteristics.has(characteristic.uuid) ? (
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.stopButton]}
                        onPress={() => stopNotifications(selectedService, characteristic.uuid)}
                      >
                        <Text style={styles.actionButtonText}>Detener Notif.</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.notifyButton]}
                        onPress={() => startNotifications(selectedService, characteristic.uuid)}
                      >
                        <Text style={styles.actionButtonText}>Iniciar Notif.</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>
            )}
          />
        </>
      )}
      
      <View style={styles.messageContainer}>
        <Text style={styles.sectionTitle}>Mensaje a enviar:</Text>
        <TextInput
          style={styles.input}
          value={messageToSend}
          onChangeText={setMessageToSend}
          placeholder="Escribe un mensaje para enviar"
        />
      </View>
      
      <View style={styles.dataContainer}>
        <View style={styles.dataHeader}>
          <Text style={styles.sectionTitle}>Datos recibidos:</Text>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearReceivedData}
          >
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.dataView}>
          <Text selectable={true} style={styles.dataText}>{receivedData || "No hay datos"}</Text>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  deviceInfo: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  rssi: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  disconnectButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 10,
    color: '#0000ff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  scrollView: {
    maxHeight: 150,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedItem: {
    backgroundColor: '#e6f7ff',
    borderLeftWidth: 4,
    borderLeftColor: '#1890ff',
  },
  itemTitle: {
    fontWeight: 'bold',
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  uuid: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  isPrimary: {
    fontSize: 12,
    color: '#888',
  },
  characteristicItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  propertiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 8,
  },
  propertyTag: {
    fontSize: 10,
    backgroundColor: '#e6f7ff',
    color: '#1890ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#007aff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  notifyButton: {
    backgroundColor: '#34c759',
  },
  stopButton: {
    backgroundColor: '#ff9500',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
  },
  dataContainer: {
    marginTop: 16,
    flex: 1,
  },
  dataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#8e8e93',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
  },
  dataView: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 8,
    backgroundColor: '#fff',
    flex: 1,
    borderRadius: 8,
    maxHeight: 150, // Ensure there's a maximum height
  },
  dataText: {
    color: '#333', // Dark gray text color for better readability
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Using monospace font for better readability of logs
  },
  messageContainer: {
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    backgroundColor: 'white',
    color: 'black'
  },
});

export default BleDeviceConnector;