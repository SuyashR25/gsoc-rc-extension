# RC Apps Generator - Master Orchestration Guide

This is the primary context file for the Rocket.Chat Apps Generator. It orchestrates the skill-based app development workflow.

## Intent Translation Matrix

When a user describes what they want to build, translate to the correct RC feature using this matrix:

| User Says | RC Feature | Skill File |
|-----------|-----------|------------|
| "command" / "type /..." | Slash Command | SLASH_COMMANDS.md |
| "form" / "input" / "collect data" / "modal" | UIKit Modal | UIKIT.md |
| "remember" / "save" / "store" / "persist" | Persistence | PERSISTENCE.md |
| "receive from outside" / "webhook" | Webhook | WEBHOOK.md |
| "send to outside" / "call API" / "external service" | HTTP + Settings | HTTP.md + SETTINGS.md |
| "when someone joins" / "event" / "trigger on" | Message Listeners | MESSAGE_LISTENERS.md |
| "scheduled" / "every day" / "recurring" / "timer" | Scheduler | SCHEDULER.md |
| "configure" / "settings" / "options" / "API key" | Settings | SETTINGS.md |

## Workflow Overview

### Step 1 — Plan (OUTPUT FIRST, before any code)

Output this plan block before touching any file:

```
## Implementation Plan
- App name: <name>
- Features: <list>
- Skills needed: <skill files>
- External API: <public API URL if applicable, or "none">
- Files to create/edit: <list>
```

**🛑 CRITICAL:** After printing the plan, STOP and ASK the user for approval. Do NOT proceed to Step 2 until the user approves the plan.

### Step 2 — Read Docs (MANDATORY before coding)

1. **Parse user input** — Use Intent Translation Matrix to map request → skill files
2. **Read all identified skill files + REVIEW.md in parallel** before writing any code
3. Ask ≤2 clarifying questions only if the request is genuinely ambiguous

### Step 3 — Scaffold via `rc-apps create` CLI

**CRITICAL: Always use absolute path `D:/RocketChat/apps/<app-name>` for ALL file operations!**

```bash
rc-apps create --name "<app-name>" --author "Author" --description "..." --homepage "https://example.com" --support "https://example.com"
```

- **Use `rc-apps create` CLI** — do NOT use `scaffold_rc_app` MCP tool
- App is created at: `D:/RocketChat/apps/<app-name>\`
- After scaffolding, read `app.json` and `<AppName>.ts` to understand the generated structure

### Step 4 — Write All Code in One Pass

- **Prefer public/free APIs** when the feature calls an external service:
  - Weather → `https://wttr.in/?format=j1` (no key)
  - Stocks/Crypto → `https://query1.finance.yahoo.com/` or `https://api.coinbase.com/v2/prices/`
  - Jokes → `https://official-joke-api.appspot.com/random_joke`
  - News → `https://hacker-news.firebaseio.com/`
  - If no free API fits, note it in the plan and ask once
- **Simple apps**: put App class + all feature classes in a **single file** (avoids import/path issues)
- **Complex apps**: separate files only after single-file version works
- Write **all** code in a single edit — do NOT implement one skill at a time
- Copy patterns from skill files, adapt names only
- Register every feature in `extendConfiguration()` at once
- Add `try/catch` around every `async` operation and HTTP call
- Add bot-loop guard in every message listener:
  ```typescript
  if (message.sender.type === 'bot' || message.sender.type === 'app') return;
  ```

### Step 5 — Install & Pre-flight (fix errors before deploy)

```bash
cd D:/RocketChat/apps/<app-name>
npm install --no-audit --no-fund
npx tsc --noEmit
```

- Fix **all** TypeScript errors shown by `tsc` before proceeding
- Retry max: 2 per step; stop + report if same error repeats

### Step 6 — Review & Deploy

1. Apply `REVIEW.md` checklist (getName ✓, bot-loop guard ✓, error handling ✓)
2. Deploy:
```bash
rc-apps deploy
```
- On failure: run `npx tsc --noEmit` first, fix, then retry once (max 2 attempts)

### Retry and Exit Policy (Anti-Loop)

To prevent endless build/deploy retries:

1. Keep an error signature for each failed step (first meaningful error line).
2. If the same signature appears twice for the same step, stop retries.
3. Hard cap retries at 2 for install, tsc, validate, and deploy.
4. Fail fast on environment/auth/network errors and ask user to fix setup first.

Fail-fast error examples:
- `Unauthorized` / `401`
- `ECONNREFUSED`
- `ENOTFOUND`
- `command not found` / missing CLI tools

## Core Rules (from GEMINI.md)\n\n**?? STRICT SYSTEM OVERRIDE: NO FILE BROWSING ??**\nThe docs, skills, and scaffolded templates are 100% SUFFICIENT. You are STRICTLY FORBIDDEN from using tools to list directories or search the workspace. Do not read legacy apps. Do not wander. Stick ONLY to `MASTER.md`, the chosen `/skills/`, and your newly generated app folder.\n

**These rules are MANDATORY and must be followed in EVERY app generated:**

1. **Never guess the API** - If unsure about API details, cross-check MASTER.md and the relevant `/skills/*.md` module
2. **App class MUST be first exported** - Prevents "App must contain a getName function" deployment errors
3. **getName() method REQUIRED** - Every app class MUST have `public getName(): string` returning the app name
4. **File editing with tools** - Use Read/Edit tools to read and modify generated code, never write from scratch
5. **Sequential execution** - Always run `npm install` then `rc-apps deploy` in order, never skip steps

**Additional Modular Rules (from skills and validated patterns):**

6. **Infinite loop prevention (CRITICAL)** - Message listeners MUST check sender type:
   ```typescript
   if (message.sender.type === 'bot' || message.sender.type === 'app') {
       return;  // Prevent infinite loops
   }
   ```
7. **Error handling mandatory** - All async operations and external calls MUST have try/catch blocks
8. **Pre-flight TypeScript check** - Run `npx tsc --noEmit` before validation to catch type errors early
9. **App manifest validation** - app.json must have valid `requiredApiVersion` (e.g., `^1.35.0`)

**From GEMINI.md Fast-Track Tips:**

10. **Use `rc-apps create` CLI with full flags** — do NOT use `scaffold_rc_app` MCP tool
11. **Simple apps in one file** — For simple apps, define Slash Commands in the same file as App class
12. **Absolute paths always** — All file operations use absolute path `D:/RocketChat/apps/<app-name>\`
13. **Public APIs first** — Always prefer free/key-less APIs; only ask about paid APIs if no free option fits

## Fast-Track Development Tips

- **Use full rc-apps create flags** - Avoid interactive prompts:
  ```bash
  rc-apps create --name "app-name" --author "Your Name" --description "..." --homepage "..." --support "..."
  ```

- **Put simple code together** - For simple apps, define Slash Commands in the same file as App class

- **Use shell for file writes** - Faster than multiple Edit calls for creating new files

- **Pre-flight check** - Run `npx tsc --noEmit` before deploying to catch errors early

## Skill Files Directory

All skill files are in `/skills/` directory:

```
skills/
├── SLASH_COMMANDS.md       # /command patterns
├── PERSISTENCE.md          # Data storage patterns
├── MESSAGE_LISTENERS.md    # Event handlers (IPostMessageSent, etc.)
├── SCHEDULER.md            # Scheduled tasks and timers
├── UIKIT.md               # Modal forms and interactive UI
├── WEBHOOK.md             # Incoming webhook handlers
├── HTTP.md                # External API calls + retry logic
├── SETTINGS.md            # App configuration settings
└── REVIEW.md              # Pre-deployment code review checklist
```

## Implementation Pattern: Scaffold → Read → Modify

**⚠️ CRITICAL RULE: Always use absolute path `D:/RocketChat/apps/<app-name>\` for ALL operations!**

Gemini must **IGNORE where the CLI is opened from** and **ALWAYS create apps in the specified directory** (`D:/RocketChat/apps`), regardless of the current working directory.

Example:
- ❌ If user opens CLI from `C:\Users\Me\`, don't create app there
- ✅ Create app in `D:/RocketChat/apps/<app-name>\` (absolute path)

This is the **core development approach** - never write code from scratch:

```
1. SCAFFOLD (RC Apps Engine creates baseline)
   ├── app.json (manifest)
   ├── App.ts (main class with getName())
   ├── package.json (dependencies)
   └── tsconfig.json (TypeScript config)

2. READ (Understand the generated structure)
   ├── Read app.json format
   ├── Read App class structure
   ├── Identify extendConfiguration() method
   └── Note: App class already first + has getName()

3. MODIFY (Layer features on top)
   ├── Read /skills/SLASH_COMMANDS.md
   ├── Copy Pattern 1 slash command code
   ├── Paste into generated App.ts
   ├── Register in extendConfiguration()
   ├── Follow validation checklist
   └── (Repeat for each skill)
```

**Example**: Building "slash command hello app"

```bash
Step 1: Output plan (App: hello-app, Skills: SLASH_COMMANDS.md)
Step 2: Read /skills/SLASH_COMMANDS.md + REVIEW.md
Step 3: rc-apps create --name "hello-app" ... → creates hello-app/
Step 4: Write HelloApp.ts (App class + HelloSlashCommand in one file)
Step 5: npm install && npx tsc --noEmit → fix errors
Step 6: rc-apps deploy
```

## Skill Integration Workflow

When implementing a feature from a skill file:

1. **Read the skill file** (e.g., `/skills/HTTP.md`)
2. **Choose appropriate pattern** (Pattern 1: simple GET, Pattern 2: POST, etc.)
3. **Copy the pattern code** into your generated app
4. **Adapt names to match your app** (e.g., `MySlashCommand` instead of `WeatherSlashCommand`)
5. **Register in `extendConfiguration()`** - all skills have registration examples
6. **Follow the validation checklist** from the skill file

**Key Rule**: Each skill file is self-contained — read ALL needed skill files first, then implement ALL features together in one pass.

## Common Pitfalls to Avoid (from historical issues)

**These mistakes have caused deployment failures before:**

1. ❌ **App class not first exported**
   - ✅ SOLUTION: Ensure App class is the FIRST `export class` in file, before all other classes

2. ❌ **Missing getName() method**
   - ✅ SOLUTION: Every app MUST have `public getName(): string { return 'app-name'; }`

3. ❌ **Infinite loops in message handlers**
   - ✅ SOLUTION: Always check `if (message.sender.type === 'bot' || message.sender.type === 'app') return;`

4. ❌ **Missing error handling**
   - ✅ SOLUTION: Wrap all async operations and external calls in try/catch blocks

5. ❌ **Not validating HTTP responses**
   - ✅ SOLUTION: Always check `response.statusCode` before processing data

6. ❌ **Using relative paths instead of absolute**
   - ✅ SOLUTION: Always use D:/RocketChat/apps/<app-name>\ (full absolute path)

7. ❌ **Creating apps in random directories**
   - ✅ SOLUTION: Use `execute_command` with `rc-apps create` and set directory to `D:/RocketChat/apps`

8. ❌ **Skipping npm install or reordering deploy steps**
   - ✅ SOLUTION: ALWAYS: npm install → tsc check → validate → review → deploy (in this exact order)

9. ❌ **TypeScript type mismatches**
   - ✅ SOLUTION: Run `npx tsc --noEmit` before calling validate_rc_app to catch errors early

10. ❌ **Not testing the app after generation**
    - ✅ SOLUTION: Apply REVIEW.md checklist before deployment


## MCP Tools and Their Purpose

| Tool | Purpose | When to Use |
|------|---------|-----------|
| `execute_command` | `rc-apps create`, `npm install`, `rc-apps deploy` | All shell commands |
| `query_rc_docs` | Read skill files (`SLASH_COMMANDS.md`, etc.) | MUST BE USED in Step 2 to read the skills |
| `validate_rc_app` | TypeScript + lint checks | MUST BE USED after `npm install` |
| `test_rc_app` | Run test suite | If tests exist |

### Explicit MCP Server Usage

You **MUST** use the provided Model Context Protocol (MCP) server tools (`rc-tools`) to perform the actions in the workflow. 
* Do not use native OS text search tools or directory listings.
* Use `query_rc_docs` to read the exact skill files identified in your plan.
* Use `execute_command` with the `rc-apps` cli.
* Use `validate_rc_app` to do pre-flight TS checks.

## Example Workflow

**User**: "I want to build a Slack integration app that posts messages to a room when alerts are triggered."

**Translation**:
- "Slack integration" → Webhook (receive data from Slack)
- "posts messages to a room" → Messaging (send messages to Rocket.Chat)
- "configure which room" → Settings (select destination room)

**Skills needed**:
1. WEBHOOK.md - Handle Slack webhook payloads
2. SLASH_COMMANDS.md - Optional /configure command for setup
3. SETTINGS.md - Store destination room ID

**Implementation**:
1. Scaffold app
2. Implement webhook handler (pattern from WEBHOOK.md)
3. Implement settings for room selection (pattern from SETTINGS.md)
4. Test webhook reception
5. Review with REVIEW.md checklist
6. Deploy

## Validation and Error Handling

- **Always check response status codes** - Don't assume HTTP calls succeed
- **Validate user input** - Check `context.getArguments()` length before accessing
- **Prevent infinite loops** - In message listeners: `if (message.sender.type === 'bot' || message.sender.type === 'app') return;`
- **Handle errors gracefully** - Provide user feedback via messages or notifications
- **Log important events** - Use logger.info/warn/error for debugging

## References

- **Primary Docs**: `MASTER.md` + `/skills/*.md`
- **Deprecated**: `/docs/rc-reference.md` — do NOT use
- **Example Apps**: `StockBotApp.ts`, `StockSlashCommand.ts` in root directory

## Summary

This modular, skill-based approach allows:
- ✅ Clear feature-to-skill mapping
- ✅ Step-by-step implementation with proven patterns
- ✅ Reduced cognitive load on AI (all code written in one shot from skill patterns)
- ✅ Easier validation and error checking
- ✅ Scalable addition of new features to the framework

Ask questions → Select skills → Implement patterns → Review → Deploy






