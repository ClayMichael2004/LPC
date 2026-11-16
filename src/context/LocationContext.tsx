import React, { createContext, useContext, useState } from 'react';
import { DeliveryInfo } from '../types';

interface LocationContextType {
  locationName: string;
  fullAddress: string;
  deliveryInfo: DeliveryInfo;
  setLocationName: (name: string, address?: string) => void;
  updateDeliveryInfo: (info: Partial<DeliveryInfo>) => void;
}

const defaultDeliveryInfo: DeliveryInfo = {
  addressName: 'LBDA HQ',
  landmark: 'East Kisumu',
  estateBuilding: '',
  deliveryInstructions: '',
  phone: '712 345 678',
  saveAddress: true,
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locationName, setLocationNameState] = useState('LBDA HQ');
  const [fullAddress, setFullAddress] = useState('LBDA HQ, East Kisumu, Kisumu, Kisumu C...');
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>(defaultDeliveryInfo);

  const setLocationName = (name: string, address?: string) => {
    setLocationNameState(name);
    if (address) {
      setFullAddress(address);
    }
  };

  const updateDeliveryInfo = (info: Partial<DeliveryInfo>) => {
    setDeliveryInfo((prev) => ({
      ...prev,
      ...info,
    }));
  };

  return (
    <LocationContext.Provider
      value={{
        locationName,
        fullAddress,
        deliveryInfo,
        setLocationName,
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
