require('dotenv').config();
const Groq = require('groq-sdk');
const https = require('https');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const VT_KEY = process.env.VIRUSTOTAL_API_KEY;
const GSB_KEY = process.env.GOOGLE_SAFE_BROWSING_KEY;

// ═══════════════════════════════════
// HELPER
// ═══════════════════════════════════
function httpsRequest(options, body = null) {
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    if (body) req.write(body);
    req.end();
  });
}

// ═══════════════════════════════════
// LAYER 1: Google Safe Browsing
// (URL ke liye hi kaam karta hai)
// ═══════════════════════════════════
async function checkGSB(url) {
  const body = JSON.stringify({
    client: { clientId: 'cyber-guardian', clientVersion: '1.0.0' },
    threatInfo: {
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url }]
    }
  });

  const json = await httpsRequest({
    hostname: 'safebrowsing.googleapis.com',
    path: `/v4/threatMatches:find?key=${GSB_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);

  if (!json) return { safe: true, threats: [], score: 0, source: 'GSB' };

  if (json.matches && json.matches.length > 0) {
    return { safe: false, threats: json.matches.map(m => m.threatType), score: 100, source: 'GSB' };
  }
  return { safe: true, threats: [], score: 0, source: 'GSB' };
}

// SMS ke liye GSB — URL extract karke check karo
async function checkGSBforSMS(smsText) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = smsText.match(urlRegex);

  if (!urls || urls.length === 0) {
    return { safe: true, threats: [], score: 0, source: 'GSB', note: 'No URL in SMS' };
  }

  // Saare URLs check karo
  const results = await Promise.all(urls.map(u => checkGSB(u)));
  const dangerous = results.find(r => !r.safe);
  if (dangerous) return dangerous;
  return { safe: true, threats: [], score: 0, source: 'GSB' };
}

// ═══════════════════════════════════
// LAYER 2: VirusTotal
// ═══════════════════════════════════
async function checkVT(url) {
  const encoded = Buffer.from(url).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Step 1: Pehle GET karo
  let json = await httpsRequest({
    hostname: 'www.virustotal.com',
    path: `/api/v3/urls/${encoded}`,
    method: 'GET',
    headers: { 'x-apikey': VT_KEY }
  });

  let stats = json?.data?.attributes?.last_analysis_stats;

  // Step 2: Agar nahi mila toh submit karo
  if (!stats) {
    console.log('     VT:  ⏳ URL unknown, submitting for scan...');
    
    const body = `url=${encodeURIComponent(url)}`;
    await new Promise((resolve) => {
      const req = https.request({
        hostname: 'www.virustotal.com',
        path: '/api/v3/urls',
        method: 'POST',
        headers: {
          'x-apikey': VT_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      });
      req.on('error', resolve);
      req.write(body);
      req.end();
    });

    // Step 3: 15 second wait karo
    console.log('     VT:  ⏳ Waiting 15s for scan to complete...');
    await new Promise(r => setTimeout(r, 15000));

    // Step 4: Ab dobara GET karo
    json = await httpsRequest({
      hostname: 'www.virustotal.com',
      path: `/api/v3/urls/${encoded}`,
      method: 'GET',
      headers: { 'x-apikey': VT_KEY }
    });

    stats = json?.data?.attributes?.last_analysis_stats;
  }

  if (!stats) return { available: false, score: 0, source: 'VT', note: 'Not available' };

  const total = (stats.malicious || 0) + (stats.harmless || 0) + (stats.suspicious || 0);
  const score = total > 0 ? Math.round(((stats.malicious || 0) / total) * 100) : 0;

  return {
    available: true,
    malicious: stats.malicious || 0,
    suspicious: stats.suspicious || 0,
    harmless: stats.harmless || 0,
    score,
    source: 'VT'
  };
}

async function checkVTforSMS(smsText) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = smsText.match(urlRegex);

  if (!urls || urls.length === 0) {
    return { available: false, score: 0, source: 'VT', note: 'No URL in SMS' };
  }

  const results = await Promise.all(urls.map(u => checkVT(u)));
  // Sabse dangerous URL ka result return karo
  return results.sort((a, b) => b.score - a.score)[0];
}

// ═══════════════════════════════════
// LAYER 3: Groq AI
// ═══════════════════════════════════
async function checkGroq(input, type, gsbResult, vtResult) {
  const gsbContext = gsbResult?.safe === false
    ? `Google Safe Browsing: THREAT DETECTED — ${gsbResult.threats.join(', ')}`
    : `Google Safe Browsing: Clean`;

  const vtContext = vtResult?.available
    ? `VirusTotal: ${vtResult.malicious} malicious, ${vtResult.suspicious} suspicious, ${vtResult.harmless} harmless engines`
    : `VirusTotal: ${vtResult?.note || 'Not available'}`;

  const inputLine = type === 'url'
    ? `Analyze this URL: ${input}`
    : `Analyze this SMS message: "${input}"`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `You are an expert cybersecurity analyst for India. 

${inputLine}

Security scan results:
- ${gsbContext}
- ${vtContext}

IMPORTANT: If the message is clearly a legitimate OTP or transaction alert from a known bank with no suspicious links, mark it as Safe even if it mentions a bank name. Mentioning a bank name alone is NOT impersonation.
Check for:
1. INTENT - steal credentials / steal money / spread malware / collect info / legitimate
2. PSYCHOLOGICAL TRICKS - urgency / fear / greed / authority impersonation / too-good-to-be-true / none
3. TECHNICAL RED FLAGS - suspicious TLD, HTTP, hyphens, misspelled brands, suspicious numbers
4. BRAND IMPERSONATION - SBI, HDFC, Paytm, Google, Amazon, TRAI, RBI, etc.

Respond EXACT JSON only, no extra text:
{
  "scam_score": <0-100>,
  "risk_level": "<Safe / Warning / Danger>",
  "intent": "<what this is trying to do>",
  "psychological_tricks": ["trick1"],
  "technical_red_flags": ["flag1"],
  "impersonating": "<brand or none>",
  "simple_explanation": "<1 sentence for non-technical user>",
  "red_flags": ["flag1", "flag2"],
  "action_advised": "<what user should do>"
}`
    }],
    temperature: 0.2,
  });

  const text = response.choices[0].message.content;
  const clean = text.replace(/```json|```/g, '').trim();
  const result = JSON.parse(clean);
  return { ...result, source: 'Groq' };
}

// ═══════════════════════════════════
// CONSENSUS ENGINE
// Teenon ka result milao
// ═══════════════════════════════════
function getConsensus(gsbResult, vtResult, groqResult) {

  // GSB ne threat detect kiya? → Hamesha Danger
  if (!gsbResult.safe) {
    return {
      final_score: 100,
      final_verdict: 'Danger',
      consensus: '🚨 GSB ne real threat detect kiya'
    };
  }

  const groqScore = groqResult.scam_score;
  const groqVerdict = groqResult.risk_level;
  const vtMalicious = vtResult?.malicious || 0;
  const vtSuspicious = vtResult?.suspicious || 0;
  const vtAvailable = vtResult?.available || false;

  // ── Weighted Score Calculate karo ──
  let weightedScore = 0;
  let totalWeight = 0;

  // Groq = 50% weight (sabse smart)
  weightedScore += groqScore * 0.5;
  totalWeight += 0.5;

  // VT = 35% weight (real antivirus data)
  if (vtAvailable) {
    const vtScore = vtMalicious > 0
      ? Math.min(100, vtMalicious * 10 + vtSuspicious * 5)
      : vtSuspicious > 0 ? 20 : 0;
    weightedScore += vtScore * 0.35;
    totalWeight += 0.35;
  }

  // GSB = 15% weight (already checked above, add 0 score)
  weightedScore += 0 * 0.15;
  totalWeight += 0.15;

  const final_score = Math.round(weightedScore / totalWeight);

  // ── Final Verdict ──
  let final_verdict, consensus;

  // Groq strongly says Danger (score >= 80) → Danger
  if (groqScore >= 80) {
    final_verdict = 'Danger';
    consensus = `AI strongly flagged as dangerous (score: ${groqScore})`;
  }
  // VT malicious engines found → Danger
  else if (vtMalicious >= 3) {
    final_verdict = 'Danger';
    consensus = `${vtMalicious} antivirus engines ne malicious flag kiya`;
  }
  // Groq Warning + VT suspicious → Warning
  else if (groqScore >= 50 || vtSuspicious > 0 || vtMalicious > 0) {
    final_verdict = 'Warning';
    consensus = `Mixed signals — sावधान rahein`;
  }
  // Sab safe
  else {
    final_verdict = 'Safe';
    consensus = `Teenon sources agree: SAFE ✅`;
  }

  return { final_score, final_verdict, consensus };
}

// ═══════════════════════════════════
// MAIN SCANNER
// ═══════════════════════════════════
async function scan(input, type = 'url') {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`🔍 Scanning ${type.toUpperCase()}: ${input.substring(0, 60)}`);
  console.log('═'.repeat(55));

  console.log('  → Layer 1: Google Safe Browsing...');
  console.log('  → Layer 2: VirusTotal...');

  const [gsbResult, vtResult] = await Promise.all([
    type === 'url' ? checkGSB(input) : checkGSBforSMS(input),
    type === 'url' ? checkVT(input) : checkVTforSMS(input),
  ]);

  console.log(`     GSB: ${gsbResult.safe ? '✅ Clean' : '🚨 THREAT: ' + gsbResult.threats?.join(', ')}`);
  console.log(`     VT:  ${vtResult.available ? `${vtResult.malicious} malicious, ${vtResult.suspicious} suspicious` : '⚠️ ' + (vtResult.note || 'Not available')}`);

  console.log('  → Layer 3: Groq AI Analysis...');
  const groqResult = await checkGroq(input, type, gsbResult, vtResult);

  const { final_score, final_verdict, consensus } = getConsensus(gsbResult, vtResult, groqResult);

  const emoji = final_verdict === 'Safe' ? '✅' : final_verdict === 'Warning' ? '⚠️' : '🚨';

  console.log(`\n${emoji} FINAL VERDICT: ${final_verdict}`);
  console.log(`📊 Consensus Score : ${final_score}/100`);
  console.log(`🤝 Consensus       : ${consensus}`);
  console.log(`🎯 Intent          : ${groqResult.intent}`);
  console.log(`🧠 Tricks          : ${groqResult.psychological_tricks?.join(', ')}`);
  console.log(`🏦 Impersonating   : ${groqResult.impersonating}`);
  console.log(`💬 Explanation     : ${groqResult.simple_explanation}`);
  console.log(`✅ Action          : ${groqResult.action_advised}`);
  console.log(`\n📡 Source Breakdown:`);
  console.log(`   GSB   : ${gsbResult.safe ? 'Safe (0)' : 'Danger (100)'}`);
  console.log(`   VT    : ${vtResult.available ? `Score ${vtResult.score} | ${vtResult.malicious} malicious` : 'Not available'}`);
  console.log(`   Groq  : ${groqResult.risk_level} (${groqResult.scam_score})`);

  return {
    final_verdict,
    final_score,
    consensus,
    intent: groqResult.intent,
    psychological_tricks: groqResult.psychological_tricks,
    impersonating: groqResult.impersonating,
    simple_explanation: groqResult.simple_explanation,
    action_advised: groqResult.action_advised,
    gsb: gsbResult,
    vt: vtResult,
    groq_score: groqResult.scam_score,
  };
}

// ═══════════════════════════════════
// TEST
// ═══════════════════════════════════
async function main() {
  // URL Tests
  await scan('https://www.google.com', 'url');
  await scan('http://sbi-bank-login-verify-account.tk', 'url');
  await scan('https://www.amazon.com', 'url');

  // SMS Tests
  await scan('URGENT: Your SBI account will be blocked in 30 minutes! Update KYC: http://sbi-kyc.tk', 'sms');
  await scan('Your OTP for SBI NetBanking is 847291. Valid for 10 minutes. Do not share.', 'sms');
}

module.exports = { scan };