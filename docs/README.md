# GSoC Code Snippets

Real, focused code snippets extracted from generated apps. Each file has an inline explanation of what it proves for the GSoC proposal.

## Files

| File | What It Proves |
|------|---------------|
| [`app-class-registration.ts`](snippets/app-class-registration.ts) | App class is always the first export; `getName()` and `extendConfiguration()` are mandatory |
| [`slash-command-executor.ts`](snippets/slash-command-executor.ts) | Full slash command: arg validation, try/catch, status check, sendMessage vs notifyMessage |
| [`public-api-call.ts`](snippets/public-api-call.ts) | AI prefers free/key-less APIs; correct HTTP call pattern with error handling |
| [`bot-loop-guard.ts`](snippets/bot-loop-guard.ts) | Infinite loop prevention in message listeners — mandatory in every generated app |

## How These Were Generated

These snippets came from a single prompt to the Gemini CLI extension:

```
Create a Rocket.Chat app with a /math command that evaluates mathematical expressions.
```

The AI followed the 6-step workflow:
1. Printed the implementation plan
2. Read `SLASH_COMMANDS.md` + `HTTP.md` + `REVIEW.md`
3. Ran `rc-apps create` to scaffold the template
4. Wrote all code in one pass (no iterations)
5. Ran `tsc --noEmit` — 0 errors
6. Deployed with `rc-apps deploy`
