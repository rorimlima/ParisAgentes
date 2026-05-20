import { supabase } from './supabase';

export async function fetchVeiculos() {
  const { data, error } = await supabase
    .from('veiculos_bloqueados')
    .select('id, chassi, placa, modelo_descricao, cor, ano_modelo, razao_social, status_financeiro, status_documentacao, status_final, bloqueado_em, removido_em')
    .is('removido_em', null)
    .order('bloqueado_em', { ascending: false });

  if (error) throw error;
  return data || [];
}

export function searchVeiculos(veiculos, query) {
  if (!query || !query.trim()) return veiculos;
  const q = query.toUpperCase().trim();
  return veiculos.filter(v =>
    (v.placa || '').toUpperCase().includes(q) ||
    (v.chassi || '').toUpperCase().includes(q) ||
    (v.modelo_descricao || '').toUpperCase().includes(q) ||
    (v.razao_social || '').toUpperCase().includes(q)
  );
}

export function getStats(veiculos) {
  const total = veiculos.length;
  const bloqueados = veiculos.filter(v => {
    const s = (v.status_final || '').toLowerCase();
    return s.includes('bloqueio') || s.includes('bloqueado');
  }).length;
  return { total, bloqueados };
}

export function formatStatus(status) {
  if (!status) return { label: 'Bloqueado', icon: '🔒', className: 'blocked' };
  const s = status.toLowerCase();
  if (s.includes('duplo')) return { label: 'Duplo Bloqueio', icon: '🔒🔒', className: 'critical' };
  if (s.includes('total')) return { label: 'Bloqueio Total', icon: '🔒', className: 'critical' };
  if (s.includes('financ')) return { label: 'Financeiro', icon: '💰', className: 'warning' };
  if (s.includes('doc')) return { label: 'Documentação', icon: '📄', className: 'info' };
  return { label: status, icon: '🔒', className: 'blocked' };
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
