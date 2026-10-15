# Quadratic Lab: Web-Based AI Math Differentiator

A web app that takes one core maths topic, **solving quadratic equations**, and uses an AI model to adapt it into three difficulty levels, each with its own problems, hints and explanations.

| Level | Learner | What the AI produces |
|---|---|---|
| 1 Foundation | Needs support | `a = 1` factorable equation, numbered steps, direct hints |
| 2 Standard | Grade level | `a` up to 3, method-naming hints, concise worked solution |
| 3 Advanced | Ready for a challenge | Real-world word problem to model, question-only hints, solution that interprets roots |

## Features
- Level toggle that regenerates the problem and changes how the AI talks
- Three progressive hints, answer checking with AI feedback, and a full worked solution
- **Maths verified in code:** the AI proposes coefficients `a, b, c`; the server solves the equation itself and rejects any problem whose roots are not exact. The AI never decides what is correct.
- API key stays on the server. If the backend or key is unavailable, the page falls back to built-in example problems.

## Structure
```
index.html        front end (HTML/CSS/JS, no build step)
api/generate.js   Vercel serverless function: prompts, maths checks, AI calls
REPORT.md         1-page report on the prompts and differentiation
```

## Run and deploy (Vercel)
1. Push this folder to a public GitHub repository.
2. Import the repo at vercel.com (framework preset: Other).
3. In Project Settings, Environment Variables, add `ANTHROPIC_API_KEY`. Optionally add `MODEL` to override the default model.
4. Deploy. The live URL is your submission link.

Local test: `npm i -g vercel`, then `vercel dev` in this folder with the key in a `.env` file.

Without a key, the app still runs in offline mode using the built-in examples (this is also what you see on GitHub Pages, which cannot run the serverless function).

## Testing mathematical correctness
- Generated problems: validated by `solve()` in `api/generate.js` (integer coefficients, non-negative discriminant, perfect-square discriminant, up to 3 retries).
- Answer checks: compared numerically with the computed roots, so feedback never depends on the model's arithmetic.
- Offline examples: roots checked by hand: `x² - 5x + 6` gives 2, 3; `2x² - 7x + 3` gives 1/2, 3; `x² + 3x - 40` gives 5, -8.
