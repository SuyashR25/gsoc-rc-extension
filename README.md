# rc-apps-generator — GSoC Work Showcase

> **Project:** AI-Assisted Rocket.Chat App Generator using Gemini CLI + MCP tools  
> **Proposal Goal:** Build an agentic workflow that lets developers describe a Rocket.Chat app in plain English and get a fully scaffolded, deployed app — zero boilerplate, zero guesswork.

---

## What This Project Does

This repository is a **Gemini CLI extension** that turns a natural language description into a working Rocket.Chat App Engine app in one pass:

1. The AI reads your request and outputs an **implementation plan**
2. It reads the relevant **skill docs** (`/skills/*.md`) for the features needed
3. It scaffolds the app using **`rc-apps create`** CLI (no manual setup)
4. It writes **all app code in one shot**, using free public APIs where possible
5. It runs **`tsc --noEmit`** to eliminate errors before deploying
6. It deploys with **`rc-apps deploy`** and guards against infinite bot loops

---

## Demo: Math Solver Bot (AI-Generated)

This submission includes a real generated math-solver app flow. One prompt produced it:

```
Create a Rocket.Chat app with a /math command that evaluates mathematical expressions.
```

**What got generated:**
- `/math 12+(6*5)/12` → evaluates expression using Math.js public API
- Error handling for invalid expressions and failed requests
- `sendMessage` (public) + `notifyMessage` (ephemeral/private) pattern
- Full TypeScript app ready to deploy

### Generated App — Key Snippet

```typescript
// MathSolverApp.ts — App class is always the FIRST exported class
export class MathSolverApp extends App {
    public getName(): string {
        return 'Math Expression Solver';
    }

    protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        await configuration.slashCommands.provideSlashCommand(new MathSlashCommand());
    }
}

class MathSlashCommand implements ISlashCommand {
    public command = 'math';

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp): Promise<void> {
        const expression = context.getArguments().join(' ').trim();
        if (!expression) {
            return await this.notifyMessage(context, modify, 'Usage: /math 5 * (2 + 3)');
        }
        try {
            const encodedExpr = encodeURIComponent(expression);
            const url = `https://api.mathjs.org/v4/?expr=${encodedExpr}`;
            const response = await http.get(url);
            if (response.statusCode !== 200) {
                return await this.notifyMessage(context, modify, `Invalid expression: ${expression}`);
            }
            await this.sendMessage(context, modify, `Math Expression: ${expression}\nResult: ${response.content || response.data}`);
        } catch (err) {
            await this.notifyMessage(context, modify, `Error: ${err.message}`);
        }
    }
}
```

---

## Screenshots (Current GSoC Evidence)

All screenshots below are from `docs/gsoc/screenshots/` and use the exact filenames currently present in this submission.

### 1. Prompt + Implementation Plan
**File:** `plan_hitl.png`  
**Shows:** User prompt (`/rc-create ...`) followed by the generated implementation plan (app name, features, required skills, API, output file).

![Prompt and implementation plan](docs/gsoc/screenshots/plan_hitl.png)

### 2. Skill Docs Read Before Coding
**File:** `prompt_reading.png`  
**Shows:** The agent loading required skill docs (`SLASH_COMMANDS.md`, `MESSAGE_LISTENERS.md`, `REVIEW.md`) before implementation.

![Skill files read before implementation](docs/gsoc/screenshots/prompt_reading.png)

### 3. App Scaffolding Stage
**File:** `scaffholding.png`  
**Shows:** `rc-apps create` scaffolding the app and reading generated metadata (`app.json`) to continue flow.

![rc-apps create scaffold output](docs/gsoc/screenshots/scaffholding.png)

### 4. Dependency Install + TypeScript Validation
**File:** `packages.png`  
**Shows:** Package installation and TypeScript validation flow (`npx tsc --noEmit`) during pre-deploy checks.

![Dependencies and TypeScript checks](docs/gsoc/screenshots/packages.png)

### 5. Install/Validate + Pre-Deploy Updates
**File:** `validate.png`  
**Shows:** `install_and_validate_rc_app` success and follow-up deployment preparation updates.

![Install and validate rc app](docs/gsoc/screenshots/validate.png)

### 6. Deployment Command Success
**File:** `deploy.png`  
**Shows:** `deploy_rc_app` execution with successful packaging/upload stages and deployment logs.

![Deploy command success output](docs/gsoc/screenshots/deploy.png)

### 7. Final Deployment Summary
**File:** `done.png`  
**Shows:** Final generated summary confirming app creation/deployment and the available slash command.

![Final deployment summary output](docs/gsoc/screenshots/done.png)

### 8. Skill Query via MCP Tooling
**File:** `mcp_1.png`  
**Shows:** `query_rc_docs` MCP usage to fetch `SLASH_COMMANDS.md` guidance used by the workflow.

![MCP skill query output](docs/gsoc/screenshots/mcp_1.png)

### 9. Rocket.Chat Runtime Proof (Math Solver Bot)
**File:** `rc-bot.png`  
**Shows:** Bot responses inside Rocket.Chat for math expressions, including examples like `4+5` and `12+(6*5)/12`.

![Math solver bot responses in Rocket.Chat](docs/gsoc/screenshots/rc-bot.png)

---

## Repository Structure

```
.
├── GEMINI.md                  ← AI workflow and generation constraints
├── MASTER.md                  ← Master orchestration and execution policy
├── gemini-extension.json      ← Extension wiring for this project
├── README.md                  ← Mentor-facing GSoC showcase (this file)
├── apps/
│   ├── MathSolverAppApp.ts    ← Generated Rocket.Chat app source
│   ├── app.json               ← App metadata
│   ├── package-lock.json      ← Locked dependency versions
│   ├── package.json           ← App package/dependency metadata
│   ├── tsconfig.json          ← TypeScript configuration
│   └── README.md              ← App-specific usage and testing notes
├── skills/
│   ├── SLASH_COMMANDS.md      ← /command patterns
│   ├── UIKIT.md               ← Modal form patterns
│   ├── PERSISTENCE.md         ← Data storage patterns
│   ├── WEBHOOK.md             ← Incoming webhook handlers
│   ├── HTTP.md                ← External API call patterns
│   ├── SETTINGS.md            ← App config / settings patterns
│   ├── MESSAGE_LISTENERS.md   ← Event listener patterns
│   ├── SCHEDULER.md           ← Scheduled task patterns
│   └── REVIEW.md              ← Pre-deploy checklist
├── docs/
│   └── gsoc/
│       ├── screenshots/       ← Terminal + RocketChat evidence screenshots
│       ├── snippets/          ← Focused code evidence snippets
│       │   ├── app-class-registration.ts
│       │   ├── slash-command-executor.ts
│       │   ├── public-api-call.ts
│       │   └── bot-loop-guard.ts
│       └── README.md          ← Snippet index and generation context
└── .gitignore                 ← Submission-safe ignore rules
```

---

## How The Skill System Works

Each skill file is a standalone playbook. The AI reads only what is needed:

| User Says | Skill Loaded |
|-----------|-------------|
| "command" / "type /something" | `SLASH_COMMANDS.md` |
| "form" / "input" / "modal" | `UIKIT.md` |
| "remember" / "save" / "store" | `PERSISTENCE.md` |
| "receive from outside" / "webhook" | `WEBHOOK.md` |
| "call API" / "external service" | `HTTP.md` + `SETTINGS.md` |
| "when someone joins" / "event" | `MESSAGE_LISTENERS.md` |
| "scheduled" / "every day" | `SCHEDULER.md` |

---

## Code Snippets

Focused evidence snippets in [`docs/gsoc/snippets/`](docs/gsoc/snippets/):

### 1. App Class Registration
[`app-class-registration.ts`](docs/gsoc/snippets/app-class-registration.ts) — **Proves:** The App class is always the first exported class in the file. This is a hard requirement of the RC Apps Engine — if any other export appears before it, the deploy fails with "App must contain a getName function". The AI enforces this rule.

### 2. Slash Command Executor (Full Pattern)
[`slash-command-executor.ts`](docs/gsoc/snippets/slash-command-executor.ts) — **Proves:** Complete slash command implementation generated in one pass by the AI. Demonstrates:
- Argument validation before async work
- Try/catch around all HTTP calls (mandatory rule)
- HTTP status code check before reading data
- `sendMessage` (public) vs `notifyMessage` (private) pattern

### 3. Public API Call Pattern
[`public-api-call.ts`](docs/gsoc/snippets/public-api-call.ts) — **Proves:** The AI prefers free, key-less public APIs over paid alternatives. For the math solver, it uses the Math.js public API without credentials, while still supporting the same error-handling pattern for other free APIs.

### 4. Bot Loop Guard (Infinite Loop Prevention)
[`bot-loop-guard.ts`](docs/gsoc/snippets/bot-loop-guard.ts) — **Proves:** The AI never generates message listeners without this guard. Without it, an app that sends a message in response to a message will trigger itself again — creating an infinite bot loop that floods the channel. This guard is added as part of the workflow, not as an afterthought.

---

## Pre-Push Checklist (GSoC Submission)

- [x] `plan_hitl.png`: Prompt and implementation plan
- [x] `prompt_reading.png`: Skill docs loaded before coding
- [x] `scaffholding.png`: App scaffolding flow
- [x] `packages.png`: Install and TypeScript validation stage
- [x] `validate.png`: Install/validate tool success
- [x] `deploy.png`: Deployment command success logs
- [x] `done.png`: Final deployment summary
- [x] `mcp_1.png`: MCP docs query evidence
- [x] `rc-bot.png`: Rocket.Chat runtime bot responses
- [x] Snippet files present in `docs/gsoc/snippets/`
- [x] At least 1 complete app under `apps/`
- [ ] No secrets, tokens, or `.env` credentials committed
