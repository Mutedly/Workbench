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
        <div className="row-tight">
          <button className="btn btn-icon btn-ghost" onClick={() => navigate('/')}><IconBack /></button>
          <h2>Create Workbench</h2>
        </div>
      </div>
      <p className="subtle" style={{ marginBottom: 18 }}>
        A Workbench is one job or income source. Each one keeps its own settings, shifts and calculations.
      </p>
      <WorkbenchForm
        initial={defaultValues}
        submitLabel="Create Workbench"
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
