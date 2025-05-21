import BleManager, { Peripheral } from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer'; // Add this import

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export interface BLEDevice extends Peripheral {
  name: string;
  id: string;
  rssi: number;
  serviceUUIDs: any;
  serviceData: any;
}

export interface BLEService {
  uuid: string;
  characteristics?: BLECharacteristic[];
}

export interface BLECharacteristic {
  uuid: string;
  properties: {
    read: boolean;
    write: boolean;
    writeWithoutResponse: boolean;
    notify: boolean;
    indicate: boolean;
  };
  descriptors?: any[];
}

class BLEManagerService {
  private static instance: BLEManagerService;
  private listeners: any[] = [];
  private discoveredDevices: Map<string, BLEDevice> = new Map();
  private deviceUpdateCallbacks: ((devices: BLEDevice[]) => void)[] = [];
  private characteristicUpdateCallbacks: Map<string, ((value: string) => void)[]> = new Map();

  private constructor() {}

  static getInstance(): BLEManagerService {
    if (!BLEManagerService.instance) {
      BLEManagerService.instance = new BLEManagerService();
    }
    return BLEManagerService.instance;
  }
  
  async enableBluetooth(): Promise<boolean> {
    try {
      await BleManager.enableBluetooth();
      console.log('Bluetooth enabled successfully');
      return true;
    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
      return false;
    }
  }
  
  // Modificar el método initialize para intentar habilitar el Bluetooth si está desactivado
  async initialize(): Promise<void> {
    try {
      await BleManager.start({ showAlert: false });
      
      // Verificar si el Bluetooth está activado
      const state = await BleManager.checkState();
      console.log('Bluetooth state:', state);
      
      if (state !== 'on') {
        console.log('Bluetooth is not enabled, attempting to enable...');
        // No lanzar error, solo registrar que el Bluetooth no está habilitado
        // El usuario puede usar el botón para habilitarlo
      }
      
      this.addListeners();
      await this.requestPermissions();
    } catch (error) {
      console.error('BLE initialization failed:', error);
      throw error;
    }
  }

  private async requestPermissions(): Promise<void> {
    if (Platform.OS === 'android') {
      // Verificar la versión de Android
      const apiLevel = Platform.Version;
      
      // Para Android 12+ (API 31+)
      if (apiLevel >= 31) {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
        
        const results = await PermissionsAndroid.requestMultiple(permissions);
        
        // Verificar si todos los permisos fueron concedidos
        const allGranted = Object.values(results).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (!allGranted) {
          throw new Error('Se requieren permisos de Bluetooth y ubicación para esta aplicación');
        }
      } 
      // Para Android 6.0 - 11 (API 23-30)
      else {
        const locationPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de ubicación',
            message: 'Bluetooth requiere permiso de ubicación',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          },
        );
        
        if (locationPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Permiso de ubicación no concedido');
        }
      }
    }
  }

  private addListeners(): void {
    this.listeners = [
      bleManagerEmitter.addListener(
        'BleManagerDiscoverPeripheral',
        this.handleDiscoverPeripheral,
      ),
      bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan),
      bleManagerEmitter.addListener(
        'BleManagerDisconnectPeripheral',
        this.handleDisconnectedPeripheral,
      ),
      bleManagerEmitter.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        this.handleCharacteristicValueUpdate,
      ),
    ];
  }

  



  //=====
  /**
   * Discovers all available services on a BLE device
   * @param deviceId BLE device ID
   * @returns List of available services
   */
  async discoverServices(deviceId: string): Promise<BLEService[]> {
    try {
      console.log("Starting service discovery...");
      console.log("For device ID:", deviceId);
      
      const peripheralInfo = await BleManager.retrieveServices(deviceId);
      console.log('Discovered services:', peripheralInfo);

      /* peripheralInfo.characteristics?.map(ca => {
        console.log("prope!!!!!");
        
        console.log(JSON.stringify(ca.properties));
      }) */
      
      if (peripheralInfo && peripheralInfo.services) {
        // Extract complete service information including characteristics
        return peripheralInfo.services.map(service => {
          // Find characteristics that belong to this service
          const serviceCharacteristics = peripheralInfo.characteristics
            ? peripheralInfo.characteristics.filter(char => char.service === service.uuid)
            : [];
            
          return {
            uuid: service.uuid,
            characteristics: serviceCharacteristics.map(char => ({
              uuid: char.characteristic,
              properties: this.parseCharacteristicProperties(char.properties),
              descriptors: char.descriptors || []
            }))
          };
        });
      }
      return [];
    } catch (error) {
      console.error('Error discovering services:', error);
      throw error;
    }
  }

  /**
   * Parse characteristic properties from the raw properties object
   * @param properties Raw properties object from BLE response
   * @returns Formatted properties object
   */
  private parseCharacteristicProperties(properties: any): BLECharacteristic['properties'] {
    // Check if properties exists
    if (!properties) {
      console.log('Properties is undefined or null');
      return {
        read: false,
        write: false,
        writeWithoutResponse: false,
        notify: false,
        indicate: false
      };
    }
    
    // Handle the case where properties is an object like {"Notify":"Notify","Write":"Write","Read":"Read"}
    if (typeof properties === 'object' && !Array.isArray(properties)) {
      return {
        read: 'Read' in properties,
        write: 'Write' in properties,
        writeWithoutResponse: 'WriteWithoutResponse' in properties,
        notify: 'Notify' in properties,
        indicate: 'Indicate' in properties
      };
    }
    
    // Handle the case where properties is an array (for backward compatibility)
    if (Array.isArray(properties)) {
      return {
        read: properties.includes('Read') || properties.includes('read'),
        write: properties.includes('Write') || properties.includes('write'),
        writeWithoutResponse: 
          properties.includes('WriteWithoutResponse') || 
          properties.includes('writeWithoutResponse'),
        notify: properties.includes('Notify') || properties.includes('notify'),
        indicate: properties.includes('Indicate') || properties.includes('indicate')
      };
    }
    
    // Default case if properties is in an unexpected format
    console.log('Properties is in an unexpected format:', properties);
    return {
      read: false,
      write: false,
      writeWithoutResponse: false,
      notify: false,
      indicate: false
    };
  }

  /**
   * Discovers characteristics of a specific service
   * @param deviceId BLE device ID
   * @param serviceUUID Service UUID
   * @returns List of service characteristics
   */
  async discoverCharacteristics(deviceId: string, serviceUUID: string): Promise<BLECharacteristic[]> {
    try {
      const peripheralInfo = await BleManager.retrieveServices(deviceId);
      
      // Filter characteristics that belong to the specified service
      const serviceCharacteristics = peripheralInfo.characteristics
        ? peripheralInfo.characteristics.filter(char => char.service === serviceUUID)
        : [];
      
      if (serviceCharacteristics.length > 0) {
        return serviceCharacteristics.map(char => ({
          uuid: char.characteristic,
          properties: this.parseCharacteristicProperties(char.properties),
          descriptors: char.descriptors || []
        }));
      }
      return [];
    } catch (error) {
      console.error('Error discovering characteristics:', error);
      throw error;
    }
  }

  /**
   * Busca un servicio específico por su UUID
   * @param deviceId ID del dispositivo BLE
   * @param serviceUUID UUID del servicio a buscar (puede ser parcial)
   * @returns UUID completo del servicio encontrado o null
   */
  async findServiceByUUID(deviceId: string, serviceUUID: string): Promise<string | null> {
    try {
      const peripheralInfo = await BleManager.retrieveServices(deviceId);
      
      // Check if services exist
      if (peripheralInfo && peripheralInfo.services) {
        // Find service that matches the partial UUID
        const service = peripheralInfo.services.find(
          s => s.uuid.toLowerCase().includes(serviceUUID.toLowerCase())
        );
        
        return service ? service.uuid : null;
      }
      return null;
    } catch (error) {
      console.error('Error finding service:', error);
      throw error;
    }
  }

  /**
   * Busca una característica específica por su UUID dentro de un servicio
   * @param deviceId ID del dispositivo BLE
   * @param serviceUUID UUID del servicio
   * @param characteristicUUID UUID de la característica a buscar (puede ser parcial)
   * @returns UUID completo de la característica encontrada o null
   */
  async findCharacteristicByUUID(
    deviceId: string, 
    serviceUUID: string, 
    characteristicUUID: string
  ): Promise<string | null> {
    try {
      const peripheralInfo = await BleManager.retrieveServices(deviceId);
      
      // Filter characteristics that belong to the specified service
      const serviceCharacteristics = peripheralInfo.characteristics
        ? peripheralInfo.characteristics.filter(char => char.service === serviceUUID)
        : [];
      
      // Find characteristic that matches the partial UUID
      const characteristic = serviceCharacteristics.find(
        c => c.characteristic.toLowerCase().includes(characteristicUUID.toLowerCase())
      );
      
      return characteristic ? characteristic.characteristic : null;
    } catch (error) {
      console.error('Error finding characteristic:', error);
      throw error;
    }
  }

  /**
   * Escribe un string en una característica BLE
   * @param deviceId ID del dispositivo BLE
   * @param serviceUUID UUID del servicio
   * @param characteristicUUID UUID de la característica
   * @param data String a enviar
   * @param writeWithResponse Si es true, espera respuesta del dispositivo
   */
  async writeStringCharacteristic(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    data: string,
    writeWithResponse: boolean = true
  ): Promise<void> {
    try {
      // Convert string to bytes array using Buffer
      const bytes = Array.from(Buffer.from(data, 'utf8'));
      
      if (writeWithResponse) {
        await BleManager.write(
          deviceId,
          serviceUUID,
          characteristicUUID,
          bytes,
          bytes.length
        );
      } else {
        await BleManager.writeWithoutResponse(
          deviceId,
          serviceUUID,
          characteristicUUID,
          bytes,
          bytes.length
        );
      }
      
      console.log(`Datos enviados a ${deviceId}: "${data}"`);
    } catch (error) {
      console.error('Error al escribir característica:', error);
      throw error;
    }
  }

  /**
   * Lee un string de una característica BLE
   * @param deviceId ID del dispositivo BLE
   * @param serviceUUID UUID del servicio
   * @param characteristicUUID UUID de la característica
   * @returns String leído de la característica
   */
  async readStringCharacteristic(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string
  ): Promise<string> {
    try {
      const data = await BleManager.read(
        deviceId,
        serviceUUID,
        characteristicUUID
      );
      
      // Convert bytes array to string using Buffer
      const stringData = Buffer.from(data).toString('utf8');
      console.log(`Data received from ${deviceId}: "${stringData}"`);
      return stringData;
    } catch (error) {
      console.error('Error reading characteristic:', error);
      throw error;
    }
  }

  /**
   * Activa las notificaciones para una característica
   * @param deviceId ID del dispositivo BLE
   * @param serviceUUID UUID del servicio
   * @param characteristicUUID UUID de la característica
   * @param callback Función a llamar cuando se reciban datos
   */
  async startNotifications(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    callback: (value: string) => void
  ): Promise<void> {
    try {
      // Crear clave única para esta característica
      const key = `${deviceId}_${serviceUUID}_${characteristicUUID}`;
      
      // Registrar callback
      if (!this.characteristicUpdateCallbacks.has(key)) {
        this.characteristicUpdateCallbacks.set(key, []);
      }
      this.characteristicUpdateCallbacks.get(key)?.push(callback);
      
      // Activar notificaciones
      await BleManager.startNotification(deviceId, serviceUUID, characteristicUUID);
      console.log(`Notificaciones activadas para ${deviceId}, característica: ${characteristicUUID}`);
    } catch (error) {
      console.error('Error al activar notificaciones:', error);
      throw error;
    }
  }

  /**
   * Desactiva las notificaciones para una característica
   * @param deviceId ID del dispositivo BLE
   * @param serviceUUID UUID del servicio
   * @param characteristicUUID UUID de la característica
   */
  async stopNotifications(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string
  ): Promise<void> {
    try {
      await BleManager.stopNotification(deviceId, serviceUUID, characteristicUUID);
      
      // Eliminar callbacks
      const key = `${deviceId}_${serviceUUID}_${characteristicUUID}`;
      this.characteristicUpdateCallbacks.delete(key);
      
      console.log(`Notificaciones desactivadas para ${deviceId}, característica: ${characteristicUUID}`);
    } catch (error) {
      console.error('Error al desactivar notificaciones:', error);
      throw error;
    }
  }

  /**
   * Maneja las actualizaciones de valor de características
   */
  private handleCharacteristicValueUpdate = (data: { 
    peripheral: string; 
    characteristic: string; 
    service: string; 
    value: number[] 
  }) => {
    try {
      const { peripheral, characteristic, service, value } = data;
      
      // Convert bytes array to string using Buffer
      const stringValue = Buffer.from(value).toString('utf8');
      console.log(`Notification received from ${peripheral}: "${stringValue}"`);
      
      // Call registered callbacks
      const key = `${peripheral}_${service}_${characteristic}`;
      const callbacks = this.characteristicUpdateCallbacks.get(key);
      
      if (callbacks) {
        callbacks.forEach(callback => callback(stringValue));
      }
    } catch (error) {
      console.error('Error processing notification:', error);
    }
  };
  //=====

  // Método para registrar callbacks cuando se descubren dispositivos
  registerDeviceUpdateCallback(callback: (devices: BLEDevice[]) => void): void {
    this.deviceUpdateCallbacks.push(callback);
  }

  unregisterDeviceUpdateCallback(callback: (devices: BLEDevice[]) => void): void {
    this.deviceUpdateCallbacks = this.deviceUpdateCallbacks.filter(cb => cb !== callback);
  }

  // Método para obtener los dispositivos descubiertos
  getDiscoveredDevices(): BLEDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  /* private handleDiscoverPeripheral = (peripheral: Peripheral) => {
    // Solo procesar dispositivos con nombre o que sean anunciables
    if (peripheral.name || peripheral.advertising) {
      // Crear un objeto BLEDevice con los datos necesarios
      const device: BLEDevice = {
        ...peripheral,
        name: peripheral.name || 'Unknown Device',
        id: peripheral.id,
        rssi: peripheral.rssi,
      };

      // Almacenar el dispositivo en el mapa usando su ID como clave
      this.discoveredDevices.set(peripheral.id, device);
      
      // Notificar a todos los callbacks registrados
      this.notifyDeviceUpdates();
      
      console.log('Discovered peripheral:', device);
    }
  }; */

  private notifyDeviceUpdates(): void {
    const devices = this.getDiscoveredDevices();
    this.deviceUpdateCallbacks.forEach(callback => callback(devices));
  }

  private handleStopScan = () => {
    console.log('Scan stopped');
  };

  private handleDisconnectedPeripheral = (data: { peripheral: string }) => {
    console.log('Disconnected from ' + data.peripheral);
  };

  // En el método startScan
  async startScan(): Promise<void> {
    try {
      // Detener cualquier escaneo previo
      await BleManager.stopScan().catch(() => {
        // Ignorar errores si no hay un escaneo activo
      });
      
      this.discoveredDevices.clear();
      this.notifyDeviceUpdates();
      
      console.log('Starting BLE scan with improved settings...');
      
      // Escanear sin filtros y con allowDuplicates para maximizar detección
      await BleManager.scan([], 10, true, { scanMode: 2, matchMode: 1, callbackType: 1 })//matchNum: 1, 
      .then(() => {
        console.log('Escaneo iniciado');
      })
      .catch((error) => {
        console.error('Error al iniciar escaneo:', error);
      });;
      console.log('Scan started successfully with high power settings');
      
      // Verificar si hay dispositivos después de 5 segundos
      setTimeout(() => {
        console.log(`Devices found after 5s: ${this.discoveredDevices.size}`);
        this.discoveredDevices.forEach(device => {
          console.log(`- ${device.name || 'Unknown'} (${device.id}): RSSI ${device.rssi}`);
        });
        
        // Si no se encontraron dispositivos, intentar con diferentes opciones
        if (this.discoveredDevices.size === 0) {
          console.log('No devices found, trying with different scan options...');
          // Intentar con allowDuplicates en false y diferentes parámetros
          BleManager.scan([], 15, false, { scanMode: 1 }).catch(error => {
            console.error('Second scan attempt failed:', error);
          });
        }
      }, 5000);
    } catch (error) {
      console.error('Scan failed:', error);
      throw error;
    }
  }

  // Mejorar el manejo de dispositivos descubiertos
  private handleDiscoverPeripheral = (peripheral: Peripheral): void => {
    // Asegurarse de que el dispositivo tenga un ID
    if (!peripheral.id) {
      console.log('Peripheral without ID detected, skipping');
      return;
    }
  
    // Crear un objeto BLEDevice con valores predeterminados si faltan
    const device: BLEDevice = {
      ...peripheral,
      name: peripheral.name || 'Unknown Device',
      id: peripheral.id,
      rssi: peripheral.rssi || -100,
    };
  
    // Guardar o actualizar el dispositivo en el mapa
    this.discoveredDevices.set(peripheral.id, device);
    
    // Notificar a los componentes sobre el nuevo dispositivo
    this.notifyDeviceUpdates();
    
    // Log para depuración
    console.log(`Device discovered: ${device.name} (${device.id}) with RSSI: ${device.serviceUUIDs}`);
  };

  async connectToDevice(deviceId: string): Promise<void> {
    try {
      console.log("va a conectar...");
      
      const resultConnect = await BleManager.connect(deviceId);
      console.log('Connected to device:', deviceId);
      console.log(resultConnect);
      
      await BleManager.retrieveServices(deviceId);
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  async disconnectFromDevice(deviceId: string): Promise<void>{
    try {
      console.log("va a desconectar...");
      
      const resultDisConnect = await BleManager.disconnect(deviceId);
      console.log('Disconnected to device:', deviceId);
      console.log(resultDisConnect);
      
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  async writeCharacteristic(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    data: string,
  ): Promise<void> {
    try {
      const bytes = Array.from(data).map(char => char.charCodeAt(0));
      await BleManager.write(
        deviceId,
        serviceUUID,
        characteristicUUID,
        bytes,
        bytes.length,
      );
    } catch (error) {
      console.error('Write characteristic failed:', error);
      throw error;
    }
  }

  async readCharacteristic(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
  ): Promise<string> {
    try {
      const data = await BleManager.read(
        deviceId,
        serviceUUID,
        characteristicUUID,
      );
      return String.fromCharCode.apply(null, data);
    } catch (error) {
      console.error('Read characteristic failed:', error);
      throw error;
    }
  }

  /* cleanup(): void {
    this.listeners.forEach(listener => listener.remove());
  } */

  
  
  cleanup(): void {
    // Mejorar el método cleanup para asegurar que se liberan todos los recursos
    this.listeners.forEach(subscription => subscription.remove());
    /* this.listeners = [];
    this.deviceUpdateCallbacks = [];
    this.characteristicUpdateCallbacks.clear();
    
    // Detener cualquier escaneo activo
    BleManager.stopScan().catch(() => {}); */
    
    console.log('BleManager cleaned up');
  }
}

export default BLEManagerService;