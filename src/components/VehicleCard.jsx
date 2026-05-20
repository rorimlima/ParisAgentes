import { formatStatus, formatDate } from '../services/vehicles';
import './VehicleCard.css';

export default function VehicleCard({ vehicle }) {
  const v = vehicle;
  const status = formatStatus(v.status_final);

  return (
    <div className={`vehicle-card ${status.className}`}>
      <div className="vc-header">
        <span className="vc-placa">{v.placa || 'N/A'}</span>
        <span className={`vc-status ${status.className}`}>
          {status.icon} {status.label}
        </span>
      </div>
      <div className="vc-body">
        <div className="vc-row">
          <span className="vc-label">Modelo</span>
          <span className="vc-value">{v.modelo_descricao || '—'}</span>
        </div>
        <div className="vc-row">
          <span className="vc-label">Chassi</span>
          <span className="vc-value mono">{v.chassi || '—'}</span>
        </div>
        {v.cor && (
          <div className="vc-row">
            <span className="vc-label">Cor</span>
            <span className="vc-value">{v.cor}</span>
          </div>
        )}
        {v.ano_modelo && (
          <div className="vc-row">
            <span className="vc-label">Ano</span>
            <span className="vc-value">{v.ano_modelo}</span>
          </div>
        )}
      </div>
    </div>
  );
}
