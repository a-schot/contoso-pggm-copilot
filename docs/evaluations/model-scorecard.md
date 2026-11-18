# Model scorecard — rule R1 (pensionableSalary)

> One run is a sample, not a benchmark. Synthetic data only — never paste secrets or real member data.

| | Model A | Model B |
|---|---|---|
| Model (name as shown in the picker) | GPT-6.1 Sol | GPT-6 Luna |
| Harness · Mode · Permissions | Copilot · Interactive · Manual | Copilot · Interactive · Manual |
| Reasoning effort | Medium | Medium |
| Date | | |

## Scores

| Criterion | How to score | Model A | Model B |
|---|---|---|---|
| Correctness verified | Expected values that match the `node -e` output (x / 5) | 5/5 | 5/5 |
| Edge cases found | Which did it cover? franchise boundary · salary cap · part-time · below franchise → 0 · invalid factor (0 or > 1) · negative salary | franchise boundary - salary cap - half-cent rounding boundary - negative salary - invalid factor |  salary-cap - part-time - below franchise |
| Hallucinations | Invented functions, parameters, files or rules? List them (none = 👍) | 👍 | 👍 |
| Latency feel | fast / ok / slow | fast | ok |
| Cost / credits | Relative cost of the model (supported-models doc) — heavier model = more AI credits | medium | low |

## Verification output

```text
# GPT-6.1 Sol
node -e "import('./api/src/domain/pension.ts').then(m=>{for (const [s,f] of [[17545,1],[137801,0.5],[17545.25,0.5],[-1,1],[50000,0]]) {try{console.log(s,f,m.pensionableSalary(s,f))}catch(e){console.log(s,f,e.name+': '+e.message)}}})"
17545 1 0
137801 0.5 60127.5
17545.25 0.5 0.13
-1 1 RangeError: fullTimeSalary must be a non-negative number
50000 0 RangeError: partTimeFactor must be greater than 0 and at most 1

# GPT-6 Luna
node -e "import('./api/src/domain/pension.ts').then(m=>{for (const [s,f] of [[0,1],[17545,0.6],[17545.01,1],[150000,0.5],[40000,0]]) {try{console.log(s,f,m.pensionableSalary(s,f))}catch(e){console.log(s,f,e.name+': '+e.message)}}})"
0 1 0
17545 0.6 0
17545.01 1 0.01
150000 0.5 60127.5
40000 0 RangeError: partTimeFactor must be greater than 0 and at most 1
```

## Verdict

- For **this kind of task** I would use: Model A - GPT-6.1 Sol
- Because: It found 5 valid edge cases, even one which was not suggested in the scorecard.
- Would I trust it **without** the `node -e` check? yes / no — why? No, because it is not deterministic or reviewable. Formalized as tests it would be okay.
- To make this a real benchmark I would need: Formalized tests, some automation around the model outputs and verifying it against the test outputs.
