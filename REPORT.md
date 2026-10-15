# Quadratic Lab: Report on AI Prompts and Differentiation

**Course:** Educational Technology & AI | **Topic 8:** AI for Differentiated Learning

## Concept
The app teaches one core task, solving quadratic equations, at three levels: Foundation, Standard and Advanced. The learner picks a level; the AI generates a fresh problem and then tutors in a style matched to that level.

## How the prompts work
Every request uses the same **common system prompt** (role, plain-text output, "never contradict the verified roots") plus a **level block** that changes the learner profile. Only the level block differs, so the differentiation is easy to inspect and compare.

| | Foundation | Standard | Advanced |
|---|---|---|---|
| **Problem prompt** | `a = 1`, small integer roots, one friendly sentence plus equation | `a` 1 to 3, rational roots, plain equation | Real-world word problem; equation not stated, learner must model it |
| **Tutor prompt** | Short sentences, one idea per step, named steps, encouraging | Correct vocabulary (factor, discriminant), concise | Reflective, invites generalising |
| **Hints** | Direct; may state the next step | Names the method, leaves the calculation | Guiding questions only |
| **Worked solution** | Numbered, fully scaffolded steps | Key steps only | Define, model, solve, interpret (rejects invalid roots) |

Differentiation therefore changes four things: **context** (abstract to real-world), **scaffolding** (steps given to steps discovered), **hint style** (telling to asking) and **language** (simple to technical).

## Prompt design choices
1. **Structured output for problems.** The model returns JSON `{text, a, b, c}`, which the server can verify.
2. **Maths checked in code, not by the model.** The server solves `ax² + bx + c = 0`, rejects invalid or non-exact problems and retries up to three times. Verified roots are then passed into every hint, check and explanation prompt as ground truth.
3. **Deterministic answer checking.** The learner's answer is compared numerically with the true roots (full, partial or wrong). The AI only words the feedback, so it cannot wrongly mark an answer.
4. **Graduated hints.** Each request says "hint n of 3" and forbids stating the final roots, so support increases gradually.
5. **Safe fallback.** If the AI is unavailable, built-in problems with the same three-level structure keep the app usable.

## Evidence of differentiation
For the same topic, a Foundation learner sees "Solve x² - 5x + 6 = 0" and is told which two numbers to look for. A Standard learner sees "Solve 2x² - 7x + 3 = 0" and is told to try grouping or the formula. An Advanced learner sees a garden-area word problem, must define x and build the equation, and must explain why a negative root is rejected.

## Limitations
Hints and explanations are AI-written, so wording quality can vary even though the maths is verified. Future work: adaptive level suggestions from learner performance, and more topics.
