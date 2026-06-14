import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useData } from '../data';
import WorkbenchForm, { defaultValues } from '../components/WorkbenchForm';
import { IconBack } from '../components/Icons';

export default function CreateWorkbench() {
  const navigate = useNavigate();
  const { upsert } = useData();

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-head">
        <div className="row-tight" style={{ alignItems: 'center' }}>
          <button className="btn btn-icon" onClick={() => navigate('/')} aria-label="Back"><IconBack /></button>
          <div>
            <div className="eyebrow">New workbench</div>
            <h2 style={{ fontSize: 26 }}>Create Workbench</h2>
          </div>
        </div>
      </div>
      <p className="subtle" style={{ marginBottom: 20, maxWidth: 560 }}>
        A Workbench is one job or income source. Each one keeps its own settings, shifts and calculations —
        completely independent from the others.
      </p>
      <WorkbenchForm
        initial={defaultValues}
        submitLabel="Create Workbench"
        successMessage="Workbench created"
        onCancel={() => navigate('/')}
        onSubmit={async (values) => {
          const wb = await api.createWorkbench(values);
          upsert(wb);
          navigate(`/workbench/${wb.id}/calendar`);
        }}
      />
    </div>
  );
}
