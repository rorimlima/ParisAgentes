const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL = 'https://jjjvieragarzplulikbv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqanZpZXJhZ2FyenBsdWxpa2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzYyMzAsImV4cCI6MjA5NDY1MjIzMH0.y5cdFZuk9GiFVGSaSQcoIpT0CaGdNoJsbmSFePb0OWc';

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function diagnose() {
  console.log('=== DIAGNOSTICO DETALHADO PARIS DAKAR ===\n');
  
  // 1. Buscar todos usuarios com senha_hash
  const res = await httpsGet(
    SUPABASE_URL + '/rest/v1/colaboradores?select=id,nome,sobrenome,ativo,senha_hash,departamento',
    {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    }
  );
  
  console.log('=== TODOS OS COLABORADORES ===');
  res.body.forEach(u => {
    console.log('ID:', u.id, '| Usuario:', u.nome + '.' + u.sobrenome, '| Ativo:', u.ativo);
    console.log('  senha_hash:', u.senha_hash ? u.senha_hash.substring(0,30) + '...' : 'NULL/VAZIO');
    console.log('  departamento:', u.departamento);
    console.log('');
  });

  // 2. Gerar hashes para senhas comuns de teste
  const senhasTeste = ['2026', '123456', 'paris', 'dakar', '1234', 'admin'];
  console.log('=== HASHES DE SENHAS COMUNS ===');
  senhasTeste.forEach(s => {
    const hash = crypto.createHash('sha256').update(s).digest('hex');
    console.log('sha256(' + s + ') = ' + hash);
  });
  
  // 3. Verificar estrutura veiculos_bloqueados
  const res2 = await httpsGet(
    SUPABASE_URL + '/rest/v1/veiculos_bloqueados?select=*&limit=3',
    {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    }
  );
  console.log('\n=== ESTRUTURA veiculos_bloqueados ===');
  if (res2.body && res2.body.length > 0) {
    console.log('Colunas:', Object.keys(res2.body[0]).join(', '));
    console.log('Exemplo de registro:', JSON.stringify(res2.body[0], null, 2));
  } else {
    console.log('Nenhum registro encontrado ou acesso negado:', res2.status, res2.body);
  }
  
  // 4. Verificar policies RLS
  const res3 = await httpsGet(
    SUPABASE_URL + '/rest/v1/veiculos_bloqueados?select=count',
    {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'count=exact',
    }
  );
  console.log('\n=== CONTAGEM veiculos_bloqueados ===');
  console.log('Status:', res3.status);
  console.log('Resultado:', JSON.stringify(res3.body));
}

diagnose().catch(err => console.error('ERRO:', err.message));
