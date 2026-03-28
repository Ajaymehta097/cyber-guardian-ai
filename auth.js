require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ═══════════════════════════════════
// REGISTER
// ═══════════════════════════════════
async function register(name, email, password) {
  // Check karo email already exist karta hai?
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    throw new Error('Email is already registered!');
  }

  // Password hash karo
  const hashedPassword = await bcrypt.hash(password, 10);

  // User banao
  const { data: user, error } = await supabase
    .from('users')
    .insert([{ name, email, password: hashedPassword, provider: 'email' }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // JWT token banao
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { user: { id: user.id, name: user.name, email: user.email }, token };
}

// ═══════════════════════════════════
// LOGIN
// ═══════════════════════════════════
async function login(email, password) {
  // User dhundo
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user || error) {
    throw new Error('Invalid email or password!');
  }

  // Password check karo
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid email or password!');
  }

  // JWT token banao
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { user: { id: user.id, name: user.name, email: user.email }, token };
}

// ═══════════════════════════════════
// SAVE SCAN HISTORY
// ═══════════════════════════════════
async function saveScanHistory(userId, input, type, result) {
  const { error } = await supabase
    .from('scan_history')
    .insert([{
      user_id: userId,
      input,
      type,
      final_verdict: result.final_verdict,
      final_score: result.final_score,
      consensus: result.consensus,
      intent: result.intent,
      impersonating: result.impersonating,
      simple_explanation: result.simple_explanation,
      action_advised: result.action_advised,
      psychological_tricks: result.psychological_tricks,
      gsb_safe: result.gsb?.safe,
      vt_score: result.vt?.score,
      groq_score: result.groq_score,
    }]);

  if (error) throw new Error(error.message);
  return true;
}

// ═══════════════════════════════════
// GET SCAN HISTORY
// ═══════════════════════════════════
async function getScanHistory(userId) {
  const { data, error } = await supabase
    .from('scan_history')
    .select('*')
    .eq('user_id', userId)
    .order('scanned_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data;
}

// ═══════════════════════════════════
// VERIFY TOKEN
// ═══════════════════════════════════
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { register, login, saveScanHistory, getScanHistory, verifyToken };