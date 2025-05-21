import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, Dimensions, ScrollView } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-charts-wrapper';
import BLEManagerService, { BLEDevice } from '../services/BLEManager';
import { processColor } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainScreenNavigationProp } from '../types/navigation';

const MainScreen = () => {
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [rssiHistory, setRssiHistory] = useState<Map<string, number[]>>(new Map());
  
  // Use the typed navigation prop
  const navigation = useNavigation<MainScreenNavigationProp>();
  
  // Colores para las gráficas
  const chartColors = {
    primary: processColor('#3498db'),
    secondary: processColor('#2ecc71'),
    tertiary: processColor('#e74c3c'),
    background: processColor('#f8f9fa'),
    text: processColor('#2c3e50'),
    grid: processColor('#dfe6e9'),
    strongSignal: processColor('#27ae60'),
    mediumSignal: processColor('#f39c12'),
    weakSignal: processColor('#e74c3c')
  };
  
  // Datos para la gráfica de línea (RSSI a lo largo del tiempo)
  const [lineChartData, setLineChartData] = useState({
    dataSets: [{
      values: [{ y: 0 }],
      label: 'RSSI',
      config: {
        color: chartColors.primary,
        drawCircles: true,
        circleColor: chartColors.primary,
        circleRadius: 3,
        drawValues: false,
        lineWidth: 2,
        drawCubicIntensity: 0.3,
        drawCubic: true,
        drawHighlightIndicators: false,
        fillColor: chartColors.primary,
        fillAlpha: 45,
        drawFilled: true,
        valueTextSize: 10
      }
    }],
    config: {
      borderColor: processColor('#e1e1e1'),
      borderWidth: 1
    }
  });
  
  // Datos para la gráfica de barras (comparación de dispositivos)
  const [barChartData, setBarChartData] = useState({
    dataSets: [{
      values: [{ y: 0 }],
      label: 'Intensidad de señal',
      config: {
        colors: [chartColors.primary],
        drawValues: true,
        valueTextSize: 10,
        valueTextColor: processColor('#000000'),
        valueFormatter: '#.0',
        barShadowColor: processColor('#cccccc'),
        highlightAlpha: 90
      }
    }],
    config: {
      barWidth: 0.7,
    }
  });
  
  // Datos para la gráfica circular (calidad de señal)
  const [pieChartData, setPieChartData] = useState({
    dataSets: [{
      values: [
        { value: 0, label: 'Fuerte' },
        { value: 0, label: 'Media' },
        { value: 0, label: 'Débil' }
      ],
      label: 'Calidad de señal',
      config: {
        colors: [
          chartColors.strongSignal,
          chartColors.mediumSignal,
          chartColors.weakSignal
        ],
        valueTextSize: 12,
        valueTextColor: processColor('#000000'),
        sliceSpace: 3,
        selectionShift: 8
      }
    }],
    config: {
      centerText: 'Calidad',
      centerTextRadiusPercent: 100,
      holeRadius: 40,
      holeColor: processColor('#f0f0f0'),
      transparentCircleRadius: 45,
      transparentCircleColor: processColor('#f0f0f088'),
      animateY: 1000,
      animateX: 1000
    }
  });

  useEffect(() => {
    const bleManager = BLEManagerService.getInstance();
    
    // Inicializar BLE
    bleManager.initialize().catch(error => {
      console.error('Failed to initialize BLE:', error);
    });
    
    // Registrar callback para actualizaciones de dispositivos
    const handleDevicesUpdate = (updatedDevices: BLEDevice[]) => {
      setDevices([...updatedDevices]);
      
      // Actualizar historial de RSSI para cada dispositivo
      const newRssiHistory = new Map(rssiHistory);
      
      updatedDevices.forEach(device => {
        const deviceHistory = newRssiHistory.get(device.id) || [];
        // Limitar el historial a los últimos 10 valores
        if (deviceHistory.length >= 10) {
          deviceHistory.shift();
        }
        deviceHistory.push(device.rssi);
        newRssiHistory.set(device.id, deviceHistory);
      });
      
      setRssiHistory(newRssiHistory);
      
      // Actualizar datos de la gráfica de línea
      if (selectedDevice && newRssiHistory.has(selectedDevice)) {
        const deviceHistory = newRssiHistory.get(selectedDevice) || [];
        const values = deviceHistory.map((rssi, index) => ({ x: index, y: rssi }));
        
        setLineChartData({
          dataSets: [{
            values,
            label: 'RSSI',
            config: lineChartData.dataSets[0].config
          }],
          config: lineChartData.config
        });
      } else if (updatedDevices.length > 0) {
        // Si no hay dispositivo seleccionado, mostrar el primero
        const firstDevice = updatedDevices[0];
        const deviceHistory = newRssiHistory.get(firstDevice.id) || [];
        const values = deviceHistory.map((rssi, index) => ({ x: index, y: rssi }));
        
        setLineChartData({
          dataSets: [{
            values,
            label: 'RSSI',
            config: lineChartData.dataSets[0].config
          }],
          config: lineChartData.config
        });
        
        if (!selectedDevice) {
          setSelectedDevice(firstDevice.id);
        }
      }
      
      // Actualizar datos de la gráfica de barras
      if (updatedDevices.length > 0) {
        const barValues = updatedDevices.map(device => ({
          y: Math.abs(device.rssi), // Valor absoluto para mejor visualización
          marker: device.name || 'Unknown'
        }));
        
        // Generar colores basados en la intensidad de la señal
        const barColors = updatedDevices.map(device => {
          const rssi = Math.abs(device.rssi);
          if (rssi < 60) return chartColors.strongSignal;
          if (rssi < 80) return chartColors.mediumSignal;
          return chartColors.weakSignal;
        });
        
        setBarChartData({
          dataSets: [{
            values: barValues,
            label: 'Intensidad de señal',
            config: {
              ...barChartData.dataSets[0].config,
              colors: barColors
            }
          }],
          config: barChartData.config
        });
      }
      
      // Actualizar datos de la gráfica circular
      if (updatedDevices.length > 0) {
        // Clasificar dispositivos por intensidad de señal
        let strongSignal = 0;
        let mediumSignal = 0;
        let weakSignal = 0;
        
        updatedDevices.forEach(device => {
          const rssi = Math.abs(device.rssi);
          if (rssi < 60) strongSignal++;
          else if (rssi < 80) mediumSignal++;
          else weakSignal++;
        });
        
        setPieChartData({
          dataSets: [{
            values: [
              { value: strongSignal, label: 'Fuerte' },
              { value: mediumSignal, label: 'Media' },
              { value: weakSignal, label: 'Débil' }
            ],
            label: 'Calidad de señal',
            config: pieChartData.dataSets[0].config
          }],
          config: pieChartData.config
        });
      }
    };
    
    bleManager.registerDeviceUpdateCallback(handleDevicesUpdate);
    
    return () => {
      bleManager.unregisterDeviceUpdateCallback(handleDevicesUpdate);
      bleManager.cleanup();
    };
  }, [rssiHistory, selectedDevice]);

  const startScan = async () => {
    try {
      setIsScanning(true);
      setDevices([]); // Limpiar dispositivos anteriores para evitar confusiones
      
      const bleManager = BLEManagerService.getInstance();
      console.log('Iniciando escaneo desde UI...');
      await bleManager.startScan();
      
      // Detener el escaneo después de 20 segundos
      setTimeout(() => {
        setIsScanning(false);
        console.log('Escaneo completado, dispositivos encontrados:', devices.length);
      }, 20000);
    } catch (error) {
      console.error('Scan failed:', error);
      setIsScanning(false);
    }
  };

  const renderDevice = ({ item }: { item: BLEDevice }) => (
    <TouchableOpacity
      style={[
        styles.deviceItem, 
        selectedDevice === item.id && styles.selectedDevice
      ]}
      onPress={() => {
        setSelectedDevice(item.id);
        connectToDevice(item);
      }}>
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
        <View style={[
          styles.signalIndicator,
          Math.abs(item.rssi) < 60 ? styles.strongSignal :
          Math.abs(item.rssi) < 80 ? styles.mediumSignal :
          styles.weakSignal
        ]} />
      </View>
      <Text style={styles.deviceInfo}>RSSI: {item.rssi} dBm</Text>
      <Text style={styles.deviceInfo}>ID: {item.id.substring(0, 10)}...</Text>
    </TouchableOpacity>
  );

  /* const connectToDevice = async (deviceId: string) => {
    try {
      const bleManager = BLEManagerService.getInstance();
      await bleManager.connectToDevice(deviceId);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  }; */
  const connectToDevice = (device: BLEDevice) => {
    console.log("device");
    console.log(device);
    
    
    // Now TypeScript knows that this navigation route exists and what parameters it needs
    navigation.navigate('DeviceConnector', { deviceId: device.id });
  };

  const enableBluetooth = async () => {
    try {
      const bleManager = BLEManagerService.getInstance();
      const success = await bleManager.enableBluetooth();
      
      if (success) {
        // Reinicializar el BLE Manager
        await bleManager.initialize();
      }
    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>BLE Scanner</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button]}//, isScanning && styles.buttonScanning
            onPress={startScan}
            disabled={isScanning}>
            <Text style={styles.buttonText}>
              {isScanning ? 'Escaneando...' : 'Escanear Dispositivos'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={enableBluetooth}>
            <Text style={styles.buttonText}>Activar Bluetooth</Text>
          </TouchableOpacity>
        </View>
        
        {/* Panel de estadísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{devices.length}</Text>
            <Text style={styles.statLabel}>Dispositivos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {devices.length > 0 ? Math.min(...devices.map(d => Math.abs(d.rssi))) : '-'}
            </Text>
            <Text style={styles.statLabel}>Mejor señal</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {selectedDevice ? devices.find(d => d.id === selectedDevice)?.name?.substring(0, 6) || 'N/A' : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Seleccionado</Text>
          </View>
        </View>
        
        {/* Gráfica de línea - RSSI a lo largo del tiempo */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Evolución de RSSI</Text>
          <LineChart
            style={styles.chart}
            data={lineChartData}
            xAxis={{
              enabled: true,
              drawLabels: true,
              position: 'BOTTOM',
              textColor: chartColors.text,
              textSize: 10,
              gridColor: chartColors.grid,
              gridLineWidth: 1,
              axisLineColor: chartColors.text,
              axisLineWidth: 1,
              granularity: 1,
              granularityEnabled: true,
              valueFormatter: 'Tiempo'
            }}
            yAxis={{
              left: {
                enabled: true,
                drawLabels: true,
                textColor: chartColors.text,
                textSize: 10,
                gridColor: chartColors.grid,
                gridLineWidth: 1,
                axisLineColor: chartColors.text,
                axisLineWidth: 1,
                limitLines: [
                  {
                    limit: -70,
                    lineColor: processColor('#f39c12'),
                    lineWidth: 1,
                    label: 'Buena señal'
                  },
                  {
                    limit: -90,
                    lineColor: processColor('#e74c3c'),
                    lineWidth: 1,
                    label: 'Señal débil'
                  }
                ]
              },
              right: {
                enabled: false
              }
            }}
            chartDescription={{ text: '' }}
            legend={{ enabled: true, textSize: 12, textColor: chartColors.text, form: 'CIRCLE', formSize: 12 }}
            marker={{
              enabled: true,
              markerColor: processColor('#ffffff'),
              textColor: processColor('#000000')
            }}
            animation={{
              durationX: 1000,
              durationY: 1000,
              easingX: 'EaseInOutQuart',
              easingY: 'EaseInOutQuart'
            }}
            drawGridBackground={false}
            borderColor={processColor('#e1e1e1')}
            borderWidth={1}
            drawBorders={true}
            autoScaleMinMaxEnabled={true}
            touchEnabled={true}
            dragEnabled={true}
            scaleEnabled={true}
            scaleXEnabled={true}
            scaleYEnabled={true}
            pinchZoom={true}
            doubleTapToZoomEnabled={true}
            highlightPerTapEnabled={true}
            highlightPerDragEnabled={false}
            visibleRange={{
              x: { min: 0, max: 10 }
            }}
          />
        </View>
        
        {/* Gráfica de barras - Comparación de dispositivos */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Comparación de Intensidad</Text>
          <BarChart
            style={styles.chart}
            data={barChartData}
            xAxis={{
              valueFormatter: devices.map(d => d.name || 'Unknown'),
              position: 'BOTTOM',
              granularityEnabled: true,
              granularity: 1,
              labelRotationAngle: 45,
              textSize: 10,
              textColor: chartColors.text,
              gridColor: chartColors.grid,
              gridLineWidth: 1,
              axisLineColor: chartColors.text,
              axisLineWidth: 1
            }}
            yAxis={{
              left: {
                axisMinimum: 0,
                axisMaximum: 100,
                textColor: chartColors.text,
                textSize: 10,
                gridColor: chartColors.grid,
                gridLineWidth: 1,
                axisLineColor: chartColors.text,
                axisLineWidth: 1,
                valueFormatter: 'dBm'
              },
              right: {
                enabled: false
              }
            }}
            chartDescription={{ text: '' }}
            legend={{ enabled: true, textSize: 12, textColor: chartColors.text, form: 'SQUARE', formSize: 12 }}
            animation={{
              durationX: 1500,
              durationY: 1500,
              easingX: 'EaseInOutQuart',
              easingY: 'EaseInOutQuart'
            }}
            drawGridBackground={false}
            drawBorders={true}
            borderColor={processColor('#e1e1e1')}
            borderWidth={1}
            touchEnabled={true}
            dragEnabled={true}
            scaleEnabled={true}
            scaleXEnabled={true}
            scaleYEnabled={true}
            pinchZoom={true}
            doubleTapToZoomEnabled={true}
            highlightPerTapEnabled={true}
            highlightPerDragEnabled={false}
          />
        </View>
        
        {/* Gráfica circular - Calidad de señal */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Distribución de Calidad</Text>
          <PieChart
            style={styles.chart}
            data={pieChartData}
            chartDescription={{ text: '' }}
            legend={{
              enabled: true,
              textSize: 12,
              textColor: chartColors.text,
              form: 'CIRCLE',
              formSize: 12,
              xEntrySpace: 10,
              yEntrySpace: 5,
              wordWrapEnabled: true
            }}
            drawEntryLabels={true}
            usePercentValues={true}
            entryLabelColor={processColor('#000000')}
            entryLabelTextSize={12}
            styledCenterText={{
              text: 'Calidad',
              color: chartColors.text,
              size: 14
            }}
            centerTextRadiusPercent={100}
            holeRadius={40}
            holeColor={processColor('#f0f0f0')}
            transparentCircleRadius={45}
            transparentCircleColor={processColor('#f0f0f088')}
            maxAngle={360}
            animation={{
              durationX: 1500,
              durationY: 1500,
              easingX: 'EaseInOutQuart',
              easingY: 'EaseInOutQuart'
            }}
          />
        </View>
        
        <Text style={styles.sectionTitle}>Dispositivos Descubiertos</Text>
        {devices.length === 0 && !isScanning ? (
          <Text style={styles.noDevices}>No se encontraron dispositivos. Intenta escanear de nuevo.</Text>
        ) : (

          
          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={item => item.id}
            style={styles.list}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 16,
    color: '#2c3e50',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  chartContainer: {
    height: 300,
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  chart: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2c3e50',
    marginHorizontal: 16,
  },
  list: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  deviceItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
  },
  selectedDevice: {
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  deviceInfo: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  signalIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  strongSignal: {
    backgroundColor: '#27ae60',
  },
  mediumSignal: {
    backgroundColor: '#f39c12',
    opacity: 0.8,
    //animation: 'pulse 1.5s infinite',
  },
  scanningIndicator: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  scanningText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  scanningSubText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  weakSignal: {
    backgroundColor: '#e74c3c',
  },
  noDevices: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginTop: 20,
    marginBottom: 20,
    fontSize: 16,
  },
  
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
});

export default MainScreen;