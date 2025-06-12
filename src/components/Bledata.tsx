'use client';

import { useState, useRef, useEffect, useCallback } from 'react';


const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const DATA_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const CONTROL_CHAR_UUID = '0000ff01-0000-1000-8000-00805f9b34fb';

const SINGLE_SAMPLE_LEN = 7;
const BLOCK_COUNT = 10;
const NEW_PACKET_LEN = SINGLE_SAMPLE_LEN * BLOCK_COUNT;

export function useBleStream(datastreamCallback?: (data: number[]) => void) {

  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const controlRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const dataRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  let samplesReceived = 0;


  const processSample = useCallback((dataView: DataView) => {
    if (dataView.byteLength !== SINGLE_SAMPLE_LEN) return;

    datastreamCallback?.([
      dataView.getUint8(0),      // counter
      dataView.getInt16(1, false), // raw0 (EEG 1)
      dataView.getInt16(3, false), // raw1 (EEG 2)
      dataView.getInt16(5, false)  // raw2 (ECG)
    ]);

  }, [datastreamCallback]);

  const handleNotification = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;
    const value = target.value;

    if (value.byteLength === NEW_PACKET_LEN) {
      for (let i = 0; i < NEW_PACKET_LEN; i += SINGLE_SAMPLE_LEN) {
        const sampleBuffer = value.buffer.slice(i, i + SINGLE_SAMPLE_LEN);
        const sampleDataView = new DataView(sampleBuffer);
        processSample(sampleDataView);
        samplesReceived++;

      }
    } else if (value.byteLength === SINGLE_SAMPLE_LEN) {
      processSample(new DataView(value.buffer));
      samplesReceived++;

    }
  };

  const connect = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'NPG' }],
        optionalServices: [SERVICE_UUID],
      });
      deviceRef.current = device;
      const server = await device.gatt!.connect();
      const svc = await server.getPrimaryService(SERVICE_UUID);
      controlRef.current = await svc.getCharacteristic(CONTROL_CHAR_UUID);
      dataRef.current = await svc.getCharacteristic(DATA_CHAR_UUID);
      setConnected(true);
      setInterval(() => {
      
        if (samplesReceived === 0) {
          disconnect();
          window.location.reload();
        }
        samplesReceived = 0;
      }, 1000);
      // Automatically send START command after successful connection
      await start();
    } catch (error) {
   
    }
  };

  const start = async () => {
    if (!controlRef.current || !dataRef.current) return;
    try {
      await controlRef.current.writeValue(new TextEncoder().encode('START'));
      await dataRef.current.startNotifications();
      dataRef.current.addEventListener('characteristicvaluechanged', handleNotification);
      setStreaming(true);
    } catch (error) {
      console.error("Failed to start:", error);
    }
  };

  // Stop notifications and streaming
  const stop = async () => {
    dataRef.current?.removeEventListener('characteristicvaluechanged', handleNotification);

    try {
      if (dataRef.current?.service.device.gatt?.connected) {
        await dataRef.current.stopNotifications();
      }
    } catch (err) {
      console.warn('stopNotifications failed:', err);
    }

    try {
      if (controlRef.current?.service.device.gatt?.connected) {
        await controlRef.current.writeValue(new TextEncoder().encode('STOP'));
      }
    } catch (err) {
      console.warn('write STOP failed:', err);
    }

    setStreaming(false);
  };

  // Disconnect and clean up everything
  const disconnect = async () => {
    if (streaming && deviceRef.current?.gatt?.connected) {
      await stop();
      deviceRef.current.gatt.disconnect();
    }

    // State update triggers clearCanvas via effect
    setStreaming(false);
    setConnected(false);
    window.location.reload();

  };

  // Handle unexpected disconnections
  useEffect(() => {
    const device = deviceRef.current;
    const onDisconnect = () => {
      console.warn('Device unexpectedly disconnected.');
      setConnected(false);
      setStreaming(false);
    };

    device?.addEventListener('gattserverdisconnected', onDisconnect);
    return () => {
      device?.removeEventListener('gattserverdisconnected', onDisconnect);
      disconnect();
    };
  }, []);

  return {
    connected,
    streaming,
    connect,
    start,
    stop,
    disconnect,

  };

}