import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeliveryInfo } from '../types';

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

interface LocationContextType {
  locationName: string;
  fullAddress: string;
  coordinates: MapCoordinates;
  deliveryInfo: DeliveryInfo;
  setLocationName: (name: string, address?: string, coords?: MapCoordinates) => void;
  setPinnedLocation: (name: string, address: string, coords?: MapCoordinates) => void;
  updateDeliveryInfo: (info: Partial<DeliveryInfo>) => void;
}

const LOCATION_STORAGE_KEY = '@lpc_saved_location_v1';

// Default center: Little Polo Cafe delivery zone in Kisumu
const DEFAULT_COORDS: MapCoordinates = {
  latitude: -0.0917,
  longitude: 34.768,
};

const defaultDeliveryInfo: DeliveryInfo = {
  addressName: 'LBDA HQ',
  landmark: 'LBDA HQ, East Kisumu, Kisumu County',
  estateBuilding: '',
  deliveryInstructions: '',
  phone: '712 345 678',
  saveAddress: true,
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locationName, setLocationNameState] = useState('LBDA HQ');
  const [fullAddress, setFullAddress] = useState('LBDA HQ, East Kisumu, Kisumu County');
  const [coordinates, setCoordinates] = useState<MapCoordinates>(DEFAULT_COORDS);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>(defaultDeliveryInfo);

  // Hydrate saved location on startup
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw);
        if (parsed.locationName) setLocationNameState(parsed.locationName);
        if (parsed.fullAddress) setFullAddress(parsed.fullAddress);
        if (parsed.coordinates) setCoordinates(parsed.coordinates);
        if (parsed.deliveryInfo) {
          setDeliveryInfo((prev) => ({ ...prev, ...parsed.deliveryInfo }));
        }
      } catch {
        // Ignore storage read error
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persistState = async (
    nextName: string,
    nextAddress: string,
    nextCoords: MapCoordinates,
    nextInfo: DeliveryInfo
  ) => {
    try {
      await AsyncStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify({
          locationName: nextName,
          fullAddress: nextAddress,
          coordinates: nextCoords,
          deliveryInfo: nextInfo,
        })
      );
    } catch {
      // Ignore storage write error
    }
  };

  const setPinnedLocation = (
    name: string,
    address?: string,
    coords?: MapCoordinates
  ) => {
    const resolvedAddress = address || name;
    const resolvedCoords = coords || coordinates;

    setLocationNameState(name);
    setFullAddress(resolvedAddress);
    if (coords) {
      setCoordinates(coords);
    }

    setDeliveryInfo((prev) => {
      const updated: DeliveryInfo = {
        ...prev,
        addressName: name,
        landmark: resolvedAddress,
      };
      persistState(name, resolvedAddress, resolvedCoords, updated);
      return updated;
    });
  };

  const updateDeliveryInfo = (info: Partial<DeliveryInfo>) => {
    setDeliveryInfo((prev) => {
      const updated = {
        ...prev,
        ...info,
      };
      persistState(locationName, fullAddress, coordinates, updated);
      return updated;
    });
  };

  return (
    <LocationContext.Provider
      value={{
        locationName,
        fullAddress,
        coordinates,
        deliveryInfo,
        setLocationName: setPinnedLocation,
        setPinnedLocation,
        updateDeliveryInfo,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
