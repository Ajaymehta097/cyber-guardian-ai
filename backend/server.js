require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { createClient } = require('@supabase/supabase-js');
const { scan } = require('./scanner');
const { register, login, saveScanHistory, getScanHistory, verifyToken } = require('./auth');

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const corsOptions = {
  origin: ['http://localhost:3000', 'https://cyber-guardian-ai-alpha.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// ═══════════════════════════════════
// GOOGLE PASSPORT STRATEGY
// ═══════════════════════════════════
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://cyber-guardian-ai.onrender.com/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const avatar = profile.photos[0]?.value;

    // User already exist karta hai?
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    // Nahi karta toh banao
    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert([{ name, email, avatar, provider: 'google', password: null }])
        .select()
        .single();
      user = newUser;
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const { data: user } = await supabase.from('users').select('*').eq('id', id).single();
  done(null, user);
});

// ═══════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════
function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Please login first!' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token!' });
  req.user = user;
  next();
}

// ═══════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Please fill all fields!' });
  try {
    const result = await register(name, email, password);
    res.cookie('token', result.token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'none',
      secure: true
});
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error:  'Email and password are required!' });
  try {
    const result = await login(email, password);
    res.cookie('token', result.token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  req.logout(() => {});
  res.json({ message: 'Logout successful!' });
});

app.get('/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ═══════════════════════════════════
// GOOGLE AUTH ROUTES
// ═══════════════════════════════════
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: 'https://cyber-guardian-ai-alpha.vercel.app' }),
  async (req, res) => {
    try {
      const user = req.user;
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,        // 🔥 required for HTTPS
        sameSite: 'none',    // 🔥 required for cross-domain
        maxAge: 7 * 24 * 60 * 60 * 1000
});
      res.redirect('https://cyber-guardian-ai-alpha.vercel.app');
    } catch (err) {
      res.redirect('https://cyber-guardian-ai-alpha.vercel.app');
    }
  }
);

// ═══════════════════════════════════
// SCAN ROUTE
// ═══════════════════════════════════
app.post('/scan', authMiddleware, async (req, res) => {
  const { input, type } = req.body;
  if (!input || !type)
    return res.status(400).json({ error: 'Input and type are required!' });
  try {
    const result = await scan(input, type);
    await saveScanHistory(req.user.id, input, type, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════
// HISTORY ROUTE
// ═══════════════════════════════════
app.get('/history', authMiddleware, async (req, res) => {
  try {
    const history = await getScanHistory(req.user.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => {
  console.log('✅ Cyber Guardian API running on http://localhost:5000');
});