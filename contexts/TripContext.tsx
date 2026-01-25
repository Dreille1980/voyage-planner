import { createContext, useContext, useState, ReactNode } from 'react';
import type { Trip } from '../types/api';

interface TripContextType {
  currentTrip: Trip | null;
  setCurrentTrip: (trip: Trip | null) => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);

  return (
    <TripContext.Provider value={{ currentTrip, setCurrentTrip }}>
      {children}
    </TripContext.Provider>
  );
}

export function useCurrentTrip() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useCurrentTrip must be used within a TripProvider');
  }
  return context;
}
