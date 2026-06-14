import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useData } from '../data';
import type { Shift, ShiftDraft, Workbench } from '../types';

interface WbState {
  workbench: Workbench;
  shifts: Shift[];
  addShift: (draft: ShiftDraft) => Promise<Shift>;
  addShifts: (drafts: ShiftDraft[]) => Promise<Shift[]>;
  editShift: (id: number, draft: ShiftDraft) => Promise<Shift>;
  removeShift: (id: number) => Promise<void>;
  saveWorkbench: (data: Partial<Workbench>) => Promise<Workbench>;
}

const WbContext = createContext<WbState>(null as unknown as WbState);
export function useWorkbench() {
  return useContext(WbContext);
}

export default function WorkbenchLayout() {
  const { id } = useParams();
  const wbId = Number(id);
  const navigate = useNavigate();
  const { workbenches, upsert } = useData();
  const [workbench, setWorkbench] = useState<Workbench | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getWorkbench(wbId), api.listShifts(wbId)])
      .then(([wb, sh]) => {
        if (cancelled) return;
        setWorkbench(wb);
        setShifts(sh);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [wbId]);

  if (loading) return <div className="spinner" />;
  if (error || !workbench)
    return (
      <div className="empty">
        <div className="big">🔍</div>
        <p>{error || 'Workbench not found'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Back to dashboard</button>
      </div>
    );

  const addShift = async (draft: ShiftDraft) => {
    const s = await api.createShift(wbId, draft);
    setShifts((p) => [s, ...p]);
    return s;
  };
  const addShifts = async (drafts: ShiftDraft[]) => {
    const created = await api.createShifts(wbId, drafts);
    setShifts((p) => [...created, ...p]);
    return created;
  };
  const editShift = async (sid: number, draft: ShiftDraft) => {
    const s = await api.updateShift(wbId, sid, draft);
    setShifts((p) => p.map((x) => (x.id === sid ? s : x)));
    return s;
  };
  const removeShift = async (sid: number) => {
    await api.deleteShift(wbId, sid);
    setShifts((p) => p.filter((x) => x.id !== sid));
  };
  const saveWorkbench = async (data: Partial<Workbench>) => {
    const wb = await api.updateWorkbench(wbId, data);
    setWorkbench(wb);
    upsert(wb);
    return wb;
  };

  void workbenches;

  return (
    <WbContext.Provider
      value={{ workbench, shifts, addShift, addShifts, editShift, removeShift, saveWorkbench }}
    >
      <Outlet />
    </WbContext.Provider>
  );
}
