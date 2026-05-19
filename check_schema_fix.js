const fetch = require('node-fetch');

const SUPABASE_URL = 'https://jjjvieragarzplulikbv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqanZpZXJhZ2FyenBsdWxpa2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzYyMzAsImV4cCI6MjA5NDY1MjIzMH0.y5cdFZuk9GiFVGSaSQcoIpT0CaGdNoJsbmSFePb0OWc';

async function checkSchema() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`);
  const json = await res.json();
  const colab = json.definitions ? json.definitions.colaboradores : json.components.schemas.colaboradores;
  console.log("Schema of colaboradores:");
  console.dir(colab.properties);
}
checkSchema();
