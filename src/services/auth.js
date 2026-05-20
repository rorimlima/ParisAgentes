import { supabase } from './supabase';

// SHA-256 via Web Crypto API
export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const SESSION_KEY = 'pd_agent_session';

export function getSavedSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function login(usuario, senha) {
  const parts = usuario.split('.');
  if (parts.length < 2) {
    throw new Error('Use o formato nome.sobrenome');
  }

  const nome = parts[0];
  const sobrenome = parts.slice(1).join('.');
  const senhaHash = await sha256(senha);

  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, sobrenome, departamento, ativo, senha_hash')
    .eq('nome', nome)
    .eq('sobrenome', sobrenome)
    .maybeSingle();

  if (error) {
    throw new Error('Erro na consulta: ' + (error.message || 'desconhecido'));
  }

  if (!data) {
    throw new Error('Usuário "' + usuario + '" não cadastrado');
  }

  if (data.senha_hash !== senhaHash) {
    throw new Error('Senha incorreta');
  }

  const isAtivo = data.ativo === 1 || data.ativo === true || 
                  String(data.ativo) === '1' || String(data.ativo) === 'true';
  if (!isAtivo) {
    throw new Error('Usuário inativo. Contate o administrador.');
  }

  const user = {
    id: data.id,
    usuario: `${data.nome}.${data.sobrenome}`,
    departamento: data.departamento
  };

  saveSession(user);
  return user;
}
