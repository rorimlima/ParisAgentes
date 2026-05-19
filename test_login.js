const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jjjvieragarzplulikbv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqanZpZXJhZ2FyenBsdWxpa2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzYyMzAsImV4cCI6MjA5NDY1MjIzMH0.y5cdFZuk9GiFVGSaSQcoIpT0CaGdNoJsbmSFePb0OWc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLogin() {
  const nome = 'agente';
  const sobrenome = 'teste';
  const senhaHash = '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab'; // SHA-256 of '2026'

  console.log('Testing login for:', nome, sobrenome);
  
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, sobrenome, departamento, ativo')
    .eq('nome', nome)
    .eq('sobrenome', sobrenome)
    .eq('senha_hash', senhaHash)
    .eq('ativo', 1)
    .maybeSingle();

  console.log('Result Data:', data);
  console.log('Result Error:', error);
}

testLogin();
