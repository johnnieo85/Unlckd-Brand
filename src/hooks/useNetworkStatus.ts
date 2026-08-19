import { useState, useEffect } from 'react';
import { networkStatus, NetworkConnectionState } from '../services/offline/networkStatus';

export interface UseNetworkStatusReturn {
  isOnline: boolean;
  state: NetworkConnectionState;
  checkConnectivity: () => Promise<boolean>;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState<boolean>(networkStatus.getIsOnline());
  const [state, setState] = useState<NetworkConnectionState>(networkStatus.getState());

  useEffect(() => {
    const unsubscribe = networkStatus.subscribe((online, connState) => {
      setIsOnline(online);
      setState(connState);
    });

    return unsubscribe;
  }, []);

  return {
    isOnline,
    state,
    checkConnectivity: () => networkStatus.verifyConnectivity()
  };
}
