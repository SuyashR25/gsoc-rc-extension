# Review Skill

Code review checklist to validate generated Rocket.Chat apps before deployment.

## Pre-Deployment Validation Checklist

### Core App Structure

- [ ] App class extends `App`
- [ ] App class is the **first exported class** in the file
- [ ] `public getName(): string` method implemented and returns correct app name
- [ ] `extendConfiguration()` method implemented and marked as `protected async`
- [ ] Constructor signature: `constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors)`
- [ ] All dependencies properly imported from `@rocket.chat/apps-engine`

### app.json Configuration

- [ ] `app.json` exists in root directory
- [ ] `name` field matches app class `getName()` return value
- [ ] `version` is semantic (e.g., `1.0.0`)
- [ ] `requiredApiVersion` is valid and accessible (e.g., `^1.35.0`)
- [ ] `author` field populated
- [ ] `description` field populated
- [ ] `classFile` points to correct file
- [ ] `className` matches exported App class name

Sample valid app.json:
```json
{
    "id": "my-app-id",
    "name": "My App",
    "nameSlug": "my-app",
    "author": "Your Name",
    "version": "1.0.0",
    "description": "Description of what the app does",
    "requiredApiVersion": "^1.35.0",
    "classFile": "MyApp.ts",
    "className": "MyApp"
}
```

### Slash Commands (if implemented)

- [ ] Implements `ISlashCommand` interface
- [ ] `command` property defined (lowercase, no spaces)
- [ ] `i18nDescription` provided
- [ ] `executor()` method has all 5 parameters: `context, read, modify, http, persis`
- [ ] Registered in `extendConfiguration()` with `configuration.slashCommands.provideSlashCommand()`
- [ ] `context.getArguments()` validated before use (check length)
- [ ] Error feedback sent to user (via notifier or message)
- [ ] Success feedback sent to user
- [ ] Room context preserved: `.setRoom(context.getRoom())`
- [ ] Sender context preserved: `.setSender(context.getSender())`
- [ ] Try/catch error handling present
- [ ] Message builder uses pattern: `.startMessage()` → `.finish()`

### Message Listeners (if implemented)

- [ ] Implements correct interface (`IPostMessageSent`, `IPreMessageSent`, `IPostRoomUserJoined`, etc.)
- [ ] **CRITICAL**: Checks sender type to prevent infinite loops:
  ```typescript
  if (message.sender.type === 'bot' || message.sender.type === 'app') return;
  ```
- [ ] Registered in `extendConfiguration()` with `configuration.messages.register*()`
- [ ] Error handling with try/catch
- [ ] No blocking synchronous operations
- [ ] `message.text` checked for null/undefined before use
- [ ] Room context accessed via `message.room`

### Persistence (if implemented)

- [ ] Imports `IPersistence` accessor
- [ ] Uses `RocketChatAssociation` and `RocketChatAssociationModel` correctly
- [ ] Creates proper associations (ROOM, USER, MISC, etc.)
- [ ] `read()` results checked for null/empty before accessing
- [ ] `update()` called with `upsert: true` when needed
- [ ] `remove()` called when data no longer needed
- [ ] No sensitive data (passwords, keys) stored unencrypted
- [ ] Data structure is JSON serializable

### HTTP Requests (if implemented)

- [ ] Imports `IHttp` accessor
- [ ] Uses `http.get()`, `http.post()`, etc. correctly
- [ ] **Always** validates `response.statusCode` before processing
- [ ] Error handling with try/catch for network failures
- [ ] Headers properly set:
  - User-Agent header included
  - Content-Type for POST/PUT requests
  - Authorization headers for secured APIs
- [ ] API keys/secrets stored in environment variables, NOT hardcoded
- [ ] Response body correctly parsed:
  ```typescript
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  ```
- [ ] Timeout configured for long-running requests
- [ ] URL parameters properly encoded: `encodeURIComponent()`

### Settings (if implemented)

- [ ] Settings defined in `extendConfiguration()`
- [ ] All settings have unique IDs
- [ ] All settings have default values (`packageValue`)
- [ ] Sensitive settings use `SettingType.PASSWORD`
- [ ] Settings properly awaited when reading:
  ```typescript
  const value = await read.getSettingReader().getValueById('setting_id');
  ```
- [ ] i18nLabel and i18nDescription provided for all settings
- [ ] Select/multi-select settings have valid options array
- [ ] No hardcoded configuration values; use settings instead

### Webhooks (if implemented)

- [ ] Implements `IPostExternalWebhookSent` (or Pre variant)
- [ ] Registered in `extendConfiguration()` with `configuration.webhooks.registerExternalWebhook()`
- [ ] Handler validates incoming headers
- [ ] Request body correctly parsed (string vs. object)
- [ ] Error handling with try/catch
- [ ] Proper HTTP status codes returned via `context.setStatusCode()`
- [ ] Response always set via `context.setResponse()`
- [ ] Signature verification implemented for secure webhooks
- [ ] Sensitive configuration in environment variables

### Scheduler (if implemented)

- [ ] Scheduled tasks persisted in persistence
- [ ] Callbacks wrapped in try/catch error handling
- [ ] Intervals/timeouts properly cleared on app disable
- [ ] Task IDs are unique
- [ ] No blocking synchronous operations in callbacks
- [ ] Timezone handling is consistent and documented

### UIKit (if implemented)

- [ ] Implements `IUIKitInteractionHandler`
- [ ] `blockId` and `actionId` defined and match handlers
- [ ] Modal uses valid `ContextualBar` builder
- [ ] `executeAction()` and `executePreAction()` implemented
- [ ] All buttons/inputs have unique `actionId`
- [ ] Handlers registered in `extendConfiguration()`
- [ ] Proper response returned from action handler
- [ ] Modal triggered with valid `triggerId` from slash command context
- [ ] Form data correctly extracted: `context.getInteractionData()`
- [ ] User feedback on successful action

### TypeScript & Code Quality

- [ ] No `any` type used without explicit reason (use proper types)
- [ ] No `console.log()` in production code (use logger instead)
- [ ] No commented-out code blocks
- [ ] Import statements properly organized
- [ ] File uses Unix line endings (LF, not CRLF)
- [ ] No syntax errors: `npx tsc --noEmit` passes
- [ ] Linting passes: `npx tslint -p .` (if tslint.json exists)
- [ ] No unused imports
- [ ] No unused variables
- [ ] Consistent naming conventions (camelCase for methods, PascalCase for classes)

### Logging & Debugging

- [ ] Uses `logger.info()`, `logger.warn()`, `logger.error()` (not `console.log`)
- [ ] No sensitive information logged (API keys, tokens, passwords)
- [ ] Error messages are user-friendly
- [ ] Debug logging can be enabled/disabled via settings

### Deployment Readiness

- [ ] `package.json` exists with correct name and version
- [ ] `npm install` runs without errors
- [ ] `npm run build` (or equivalent) succeeds without errors
- [ ] All dependencies listed in `package.json`
- [ ] No devDependencies needed at runtime
- [ ] `.env` file created with required environment variables if needed
- [ ] `rc-apps deploy` command ready to run
- [ ] All file paths use forward slashes (Unix style) even on Windows

### Security Checks

- [ ] No credentials hardcoded in code
- [ ] No SQL injection vulnerabilities (if using database)
- [ ] No command injection vulnerabilities in shell commands
- [ ] No CSRF issues in webhooks (signature verification present)
- [ ] No rate limiting issues for public endpoints
- [ ] Sensitive HTTP responses marked private (not logged)
- [ ] User input validated before use in queries/commands
- [ ] No eval() or dangerous string evaluation

### Tests (if applicable)

- [ ] Test suite exists or explicitly excluded
- [ ] `npm test` passes (if applicable)
- [ ] Unit tests cover critical paths
- [ ] Integration tests verify external API calls (with mocking)
- [ ] Error cases are tested

## Manual Testing Checklist

Before deploying to production:

- [ ] App successfully deploys to test instance: `rc-apps deploy`
- [ ] Slash commands execute and respond correctly
- [ ] Messages are sent to correct room with correct formatting
- [ ] Settings are readable via admin UI
- [ ] Webhooks receive and process external requests
- [ ] HTTP calls to external APIs work and handle errors gracefully
- [ ] Persistence data survives app reload
- [ ] UIKit modals open and submit correctly
- [ ] Error messages are displayed to users
- [ ] No infinite loops detected (message listeners)
- [ ] App disables cleanly without errors

## Post-Review Sign-Off

- [ ] Code review completed by developer
- [ ] No critical issues remain
- [ ] All items checked above
- [ ] Ready for deployment

**Reviewer**: ________________
**Date**: ________________
**Version**: ________________

## Review Comments

```
[Use this space to document any findings or notes during review]
```
