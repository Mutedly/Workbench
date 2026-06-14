import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useData } from '../data';
import { useWorkbench } from './WorkbenchLayout';
import WorkbenchForm, { type WbValues } from '../components/WorkbenchForm';

export default function Settings() {
  const { workbench, saveWorkbench } = useWorkbench();
  const { remove } = useData();
  const navigate = useNavigate();

  const initial: WbValues = {
    name: workbench.name,
    salary_mode: workbench.salary_mode,
    default_rate: workbench.default_rate,
    monthly_salary: workbench.monthly_salary,
    monthly_contract_hours: workbench.monthly_contract_hours,
    overtime_enabled: workbench.overtime_enabled,
    overtime_daily_threshold: workbench.overtime_daily_threshold,
    overtime_multiplier: workbench.overtime_multiplier,
    weekend_multiplier: workbench.weekend_multiplier,
    holiday_multiplier: workbench.holiday_multiplier,
    night_multiplier: workbench.night_multiplier,
    vacation_days_total: workbench.vacation_days_total,
    sick_days_total: workbench.sick_days_total,
    monthly_hour_target: workbench.monthly_hour_target,
    tax_rate: workbench.tax_rate,
    tax_model: workbench.tax_model,
    credit_points: workbench.credit_points,
    travel_per_day: workbench.travel_per_day,
    travel_taxable: workbench.travel_taxable,
    currency: workbench.currency,
    color: workbench.color,
    notes: workbench.notes,
  };

  const deleteWb = async () => {
    if (!confirm(`Delete "${workbench.name}" and all its shifts? This cannot be undone.`)) return;
    await api.deleteWorkbench(workbench.id);
    remove(workbench.id);
    navigate('/');
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-head">
        <h2>Settings · {workbench.name}</h2>
      </div>
      <WorkbenchForm
        initial={initial}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await saveWorkbench(values);
        }}
      />

      <div className="card card-pad" style={{ marginTop: 20, borderColor: 'var(--danger)' }}>
        <h3 style={{ color: 'var(--danger)' }}>Danger zone</h3>
        <p className="subtle" style={{ margin: '8px 0 14px' }}>
          Permanently delete this workbench and every shift inside it.
        </p>
        <button className="btn btn-danger" onClick={deleteWb}>Delete workbench</button>
      </div>
    </div>
  );
}
