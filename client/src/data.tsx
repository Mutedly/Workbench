import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Workbench } from './types';

interface DataState {
  workbenches: Workbench[];
  loading: boolean;
  refresh: () => Promise<void>;
  upsert: (wb: Workbench) => void;
  remove: (id: number) => void;
}

const DataContext = createContext<DataState>(null as unknown as DataState);

export function DataProvider({ children }: { children: ReactNode }) {
  const [workbenches, setWorkbenches] = useState<Workbench[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await api.listWorkbenches();
    setWorkbenches(list);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const upsert = (wb: Workbench) =>
    setWorkbenches((prev) => {
      const idx = prev.findIndex((w) => w.id === wb.id);
      if (idx === -1) return [...prev, wb];
      const copy = [...prev];
      copy[idx] = wb;
      return copy;
    });
  const remove = (id: number) => setWorkbenches((prev) => prev.filter((w) => w.id !== id));

  return (
    <DataContext.Provider value={{ workbenches, loading, refresh, upsert, remove }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
