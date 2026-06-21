# Vibe Coding Manual: Low-Usage Codex Workflow

This manual is for building and maintaining this app with Codex while spending as little usage as possible.

The main idea: do not ask Codex to “figure everything out” unless you truly need that. Give Codex a small job, a clear boundary, and a clear validation step.

## The World-Class Workflow

Use this loop for almost everything:

1. Describe the exact change or problem.
2. Tell Codex to inspect the minimum files first.
3. Ask Codex to explain the likely fix before editing if you are unsure.
4. Approve the fix.
5. Run the narrowest check.
6. Only deploy after the local version looks correct.

In plain English:

- First, understand the smallest area of the app involved.
- Then change only that area.
- Then test only that thing.
- Then publish.

## What To Put In AGENTS.md

`AGENTS.md` is the project rulebook. Codex reads it as standing instructions when working in this folder.

Good things to bake into `AGENTS.md`:

- Use low usage.
- Treat requests as targeted patches.
- Inspect the minimum necessary files.
- Do not scan unrelated folders.
- Do not refactor unless asked.
- Do not add dependencies unless approved.
- Run narrow validation only.
- Explain steps in beginner-friendly language.

This is better than typing those rules every time.

## What To Put In Skills

Skills are reusable specialist workflows. They are useful when a task has the same steps every time.

Good skill ideas:

- `bug-fix`: for diagnosing and fixing a specific broken behavior.
- `add-feature`: for adding one small user-facing feature.
- `deploy-check`: for checking local changes before publishing.
- `ui-polish`: for improving one screen without changing app logic.

Do not make a skill for every tiny preference. Put general behavior in `AGENTS.md`; put repeatable workflows in Skills.

Simple rule:

- `AGENTS.md` = how Codex should behave all the time.
- Skill = a specific recipe Codex should follow for one type of task.

## Your Default Prompt

Use this for most app changes:

```text
Use low usage.

Goal:
[Say the one thing I want changed.]

Context:
[Say what I see now and what I want instead.]

Scope:
Treat this as a targeted patch.
Inspect only the minimum files needed.
Do not refactor.
Do not change unrelated styling, config, or dependencies.

Workflow:
First tell me the likely files and smallest fix.
Do not edit until I approve.

Validation:
Run only the narrowest relevant check.
If validation is expensive, recommend the command instead of running it.
Explain everything in beginner-friendly language.
```

## Fast Prompt For Small Changes

Use this when the change is obvious:

```text
Use low usage. Make the smallest patch for this:

[Describe the change.]

Do not refactor or touch unrelated files.
Run only the narrowest relevant validation.
Explain the result simply.
```

## Bug Fix Prompt

```text
Use low usage.

Bug:
[What is broken?]

Expected:
[What should happen?]

Actual:
[What happens instead?]

Scope:
Find the smallest likely cause.
Inspect only the files directly related to this behavior first.
Do not edit yet.

Output:
Tell me:
1. likely cause
2. likely files involved
3. smallest proposed fix
4. cheapest validation step
```

After Codex answers, say:

```text
Make that fix only. Keep it minimal.
```

## Feature Prompt

```text
Use low usage.

Feature:
[What should the user be able to do?]

Acceptance criteria:
- [What must be true when it works?]
- [Another must-have, if any.]

Scope:
Add only this feature.
Follow existing app patterns.
Do not redesign the page unless required.
Do not add dependencies unless you ask me first.

Validation:
Run the narrowest relevant check or recommend it if expensive.
```

Acceptance criteria means the simple checklist that proves the feature works.

## UI Polish Prompt

```text
Use low usage.

Polish this specific screen/element:
[Name the screen or element.]

Change:
[What should look better?]

Rules:
Do not change app logic.
Do not rename files.
Do not refactor.
Keep the existing design style.

Validation:
Open or run only what is needed to visually confirm the screen.
```

## Deployment Prompt

Do not deploy after every tiny change automatically. First check locally when possible.

Use this:

```text
Use low usage.

Prepare this change for deployment.

First:
Check the smallest relevant validation command.

Then:
If it passes, tell me exactly what will be deployed.

Do not deploy/publish until I explicitly say:
"Deploy it."
```

Then, when ready:

```text
Deploy it. Use the existing deployment process. Do not change config unless deployment fails and you explain why.
```

## Should You Deploy Every Time?

Usually, no.

Better workflow:

1. Make the change.
2. Preview locally if possible.
3. Run a narrow check.
4. Deploy when the change is worth sharing or testing in the real hosted app.

Deploying after every change can waste time because deployment usually includes extra steps: packaging the app, sending it to the hosting service, waiting for the host to rebuild it, then checking the live version.

Good times to deploy:

- A visible user-facing feature is done.
- A bug fix needs to be tested in the real hosted environment.
- You finished a batch of small related changes.
- You need someone else to review the live version.

Bad times to deploy:

- After every color tweak.
- After every text change while still experimenting.
- Before checking whether the app works locally.

## Best Practices

Keep requests small. One bug or one feature at a time is cheapest.

Use screenshots or exact error messages. This saves Codex from guessing.

Say what not to touch. Example: “Do not change styling” or “Do not touch deployment config.”

Ask for investigation first when uncertain. This prevents Codex from editing the wrong thing.

Batch tiny changes. Instead of five separate prompts for five button text edits, list them together.

Avoid “check everything.” That is expensive. Say “check only the files related to login” or “check only the deployment error.”

Use local preview before deployment. Publishing should be the final step, not the default way to inspect every small change.

## The Best Setup For You

Use three layers:

1. `AGENTS.md` for permanent behavior rules.
2. A few Skills for repeatable workflows.
3. Short prompts for the specific task.

Recommended Skills:

- `bug-fix`
- `add-feature`
- `deploy-check`
- `ui-polish`

Recommended `AGENTS.md` rule:

```text
Before broad investigation, full builds, full test suites, dependency audits, major refactors, or deployment, warn me and ask for confirmation.
```

That one rule protects your usage.

## The One-Sentence Command

When in doubt, start with:

```text
Use low usage. Treat this as a targeted patch. Inspect the minimum files first, tell me the smallest fix, and do not edit until I approve.
```

