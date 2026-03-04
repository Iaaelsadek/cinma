
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDkyODgsImV4cCI6MjA4NjQ4NTI4OH0.QCYzJaWo0mmFQwZjwaNjIJR1jR4wOb4CbqTKxTAaO2w";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkRLS() {
    console.log("Checking if link_checks is publicly readable with ANON key...");
    const { data, error, count } = await supabase
        .from('link_checks')
        .select('id', { count: 'exact', head: true });
    
    if (error) {
        console.log("Publicly readable? NO. Error:", error.message);
    } else {
        console.log("Publicly readable? YES. Total rows visible:", count);
    }
}

checkRLS();
