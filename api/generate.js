// Vercel serverless function: POST /api/generate
// The API key lives in the ANTHROPIC_API_KEY environment variable, never in the browser.

const MODEL = process.env.MODEL || 'claude-haiku-5-5';

// ---- System prompts: the only thing that changes between levels ----
const COMMON =
  'You are a maths tutor inside a web app about solving quadratic equations. ' +
  'Write plain text only: use x², √, ×, and fractions like 3/2. No markdown, no LaTeX. ' +
  'The verified roots are supplied by the app; never contradict them.';

const LEVELS = {
  1: {
    name: 'Foundation',
    problem:
      'Create a quadratic with a = 1 and small integer roots between -6 and 6 (roots not both zero). ' +
      'Write the problem as one friendly sentence plus the equation, e.g. "Solve x² - 5x + 6 = 0."',
    tutor:
      'Audience: a learner who needs support. Use short sentences, everyday words, and one idea per step. ' +
      'Break the work into numbered steps and name each step ("Step 1: find two numbers..."). ' +
      'Hints are direct and may state the next step outright. Be encouraging.',
  },
  2: {
    name: 'Standard',
    problem:
      'Create a quadratic with a between 1 and 3, integer b and c, and rational roots. ' +
      'State it as a plain equation to solve, e.g. "Solve 2x² - 7x + 3 = 0."',
    tutor:
      'Audience: a learner working at grade level. Use correct vocabulary (factor, discriminant, root). ' +
      'Hints name the method to try (factoring or the quadratic formula) but leave the calculation to the learner. ' +
      'Worked solutions show the key steps concisely.',
  },
  3: {
    name: 'Advanced',
    problem:
      'Create a real-world word problem (area, projectile, revenue, or similar) that the learner must first model ' +
      'as a quadratic and then solve. Do NOT state the equation in the text. The model must give integers a, b, c ' +
      'and rational roots, and at least one root should make physical sense in the context.',
    tutor:
      'Audience: a learner ready for a challenge. Hints are guiding questions only ("What quantity should x represent?"), ' +
      'never the answer. Worked solutions cover three phases: define the variable, build the equation, solve and ' +
      'interpret each root (say which roots are rejected and why). Invite the learner to generalise.',
  },
};

// ---- Deterministic maths: the model never decides what is correct ----
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
function frac(n, d) {
  const g = gcd(n, d) || 1;
  n /= g; d /= g;
  if (d < 0) { n = -n; d = -d; }
  return d === 1 ? String(n) : `${n}/${d}`;
}
function solve(a, b, c) {
  if (![a, b, c].every(Number.isInteger) || a === 0) return null;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  if (!Number.isInteger(s)) return null;
  return [...new Set([frac(-b - s, 2 * a), frac(-b + s, 2 * a)])];
}
const toNum = (r) => { const [p, q] = r.split('/'); return q ? +p / +q : +p; };
function numbersIn(text) {
  const cleaned = text.replace(/x\s*\^?\s*[²2]/gi, '');
  return (cleaned.match(/-?\s?\d+(?:\.\d+)?(?:\/\d+)?/g) || []).map((t) => toNum(t.replace(/\s/g, '')));
}
function verdict(answer, roots) {
  const want = roots.map(toNum);
  const got = numbersIn(answer);
  const hit = want.filter((w) => got.some((g) => Math.abs(g - w) < 1e-6));
  return hit.length === want.length ? 'full' : hit.length ? 'partial' : 'wrong';
}
function equation(a, b, c) {
  const t = (k, s) => (k === 0 ? '' : `${k < 0 ? ' - ' : ' + '}${Math.abs(k) === 1 && s ? '' : Math.abs(k)}${s}`);
  return `${a === 1 ? '' : a === -1 ? '-' : a}x²${t(b, 'x')}${t(c, '')} = 0`;
}

// ---- Model call ----
async function ask(system, user, maxTokens = 600) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!r.ok) throw new Error('upstream ' + r.status);
  const d = await r.json();
  return d.content.map((b) => b.text || '').join('').trim();
}

const context = (p) =>
  `Problem shown to the learner: ${p.text}\nEquation: ${p.equation}\nVerified roots: ${p.roots.join(', ')}`;

async function makeProblem(level) {
  const L = LEVELS[level];
  const system = `${COMMON}\nTask: write ONE new ${L.name}-level problem. ${L.problem}\n` +
    'Reply with JSON only: {"text": string, "a": integer, "b": integer, "c": integer}. The equation is ax² + bx + c = 0.';
  for (let i = 0; i < 3; i++) {                       // retry until the maths checks out
    try {
      const raw = (await ask(system, 'Generate a problem. Vary the numbers each time.', 400)).replace(/```json|```/g, '');
      const { text, a, b, c } = JSON.parse(raw);
      const roots = solve(a, b, c);
      if (text && roots) return { text, roots, equation: equation(a, b, c) };
    } catch (e) { /* try again */ }
  }
  throw new Error('could not generate a valid problem');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'no key configured' });
  try {
    const { mode, level, problem, n, answer } = req.body || {};
    const L = LEVELS[level];
    if (!L) return res.status(400).json({ error: 'bad level' });

    if (mode === 'problem') return res.json(await makeProblem(level));

    if (!problem || !Array.isArray(problem.roots)) return res.status(400).json({ error: 'missing problem' });
    const system = `${COMMON}\n${L.tutor}`;

    if (mode === 'hint') {
      const text = await ask(system,
        `${context(problem)}\nGive hint ${n} of 3. Hint 1 is the gentlest nudge, hint 3 the strongest, ` +
        'but never state the final roots. Maximum 3 sentences.', 250);
      return res.json({ text });
    }
    if (mode === 'check') {
      const v = verdict(String(answer || '').slice(0, 200), problem.roots);
      const text = await ask(system,
        `${context(problem)}\nLearner's answer: "${answer}"\nThe app has checked it: ${v} ` +
        '(full = all roots found, partial = some roots, wrong = none). ' +
        'Give feedback in 2-4 sentences at your level. If partial or wrong, say what to re-check without giving the answer. ' +
        'If a root does not make sense in the context, say so.', 300);
      return res.json({ verdict: v, text });
    }
    if (mode === 'explain') {
      const text = await ask(system, `${context(problem)}\nWrite the worked solution, following your level's style.`, 700);
      return res.json({ text });
    }
    return res.status(400).json({ error: 'bad mode' });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
};
