# Webhook Skill

Webhooks allow external services to send data to your Rocket.Chat app via HTTP POST requests.

## Pattern Overview

- Implement `IPostExternalWebhookPreSent` to validate incoming webhooks
- Implement `IPostExternalWebhookSent` to process webhook data
- Register webhook endpoints in `extendConfiguration()`
- Handle authentication and validation of webhook requests
- Process data and send messages back to Rocket.Chat

## Key Interfaces

```typescript
interface IPostExternalWebhookPreSent {
    executePreExternalWebhook(context: ExternalWebhookContext): Promise<void>;
}

interface IPostExternalWebhookSent {
    executePostExternalWebhook(context: ExternalWebhookContext): Promise<void>;
}

interface ExternalWebhookContext {
    getHeaders(): Record<string, string>;
    getRequestUrl(): string;
    getRequestContent(): string | object;
    setResponse(response: object): void;
    setStatusCode(code: number): void;
}
```

## Pattern 1: Simple GitHub Webhook Handler

```typescript
import { IPostExternalWebhookSent } from '@rocket.chat/apps-engine/definition/webhooks';
import { ExternalWebhookContext } from '@rocket.chat/apps-engine/definition/webhooks';

class GitHubWebhookHandler implements IPostExternalWebhookSent {
    public async executePostExternalWebhook(context: ExternalWebhookContext): Promise<void> {
        try {
            const headers = context.getHeaders();
            const event = headers['x-github-event'];

            if (!event) {
                context.setStatusCode(400);
                context.setResponse({ error: 'Missing x-github-event header' });
                return;
            }

            const payload = typeof context.getRequestContent() === 'string'
                ? JSON.parse(context.getRequestContent())
                : context.getRequestContent();

            switch (event) {
                case 'push':
                    await this.handlePush(payload, context);
                    break;
                case 'pull_request':
                    await this.handlePullRequest(payload, context);
                    break;
                default:
                    context.setStatusCode(200);
                    context.setResponse({ message: 'Event received but not handled' });
            }

            context.setStatusCode(200);
            context.setResponse({ success: true });
        } catch (error) {
            context.setStatusCode(500);
            context.setResponse({ error: error.message });
        }
    }

    private async handlePush(payload: any, context: ExternalWebhookContext): Promise<void> {
        const repo = payload.repository.name;
        const branch = payload.ref.split('/').pop();
        const commits = payload.commits.length;

        const message = `📤 **${repo}**: ${commits} commit(s) pushed to ${branch}`;
        console.log(message);
        // Send to room here
    }

    private async handlePullRequest(payload: any, context: ExternalWebhookContext): Promise<void> {
        const action = payload.action;
        const pr = payload.pull_request;

        const message = `🔀 **PR ${action}**: ${pr.title} by ${pr.user.login}`;
        console.log(message);
        // Send to room here
    }
}
```

## Pattern 2: Webhook with Authentication

```typescript
import { crypto } from '@rocket.chat/apps-engine/definition/crypto';

class SecureWebhookHandler implements IPostExternalWebhookSent {
    private webhookSecret = process.env.WEBHOOK_SECRET || 'default-secret';

    public async executePostExternalWebhook(context: ExternalWebhookContext): Promise<void> {
        try {
            const headers = context.getHeaders();
            const signature = headers['x-signature'];
            const body = context.getRequestContent();

            // Verify signature
            if (!this.verifySignature(body, signature)) {
                context.setStatusCode(401);
                context.setResponse({ error: 'Unauthorized' });
                return;
            }

            const payload = typeof body === 'string' ? JSON.parse(body) : body;

            console.log('Authenticated webhook received:', payload);

            context.setStatusCode(200);
            context.setResponse({ success: true });
        } catch (error) {
            context.setStatusCode(500);
            context.setResponse({ error: error.message });
        }
    }

    private verifySignature(body: any, signature: string): boolean {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        // In real implementation, use HMAC-SHA256
        // const expectedSignature = crypto.createHmac('sha256', this.webhookSecret)
        //     .update(bodyStr)
        //     .digest('hex');
        // return signature === expectedSignature;

        // Simplified comparison
        return signature === 'expected-signature';
    }
}
```

## Pattern 3: Send Webhook Data to Chat Room

```typescript
class RoomNotificationWebhookHandler implements IPostExternalWebhookSent {
    constructor(
        private roomId: string,
        private modify: IModify
    ) {}

    public async executePostExternalWebhook(context: ExternalWebhookContext): Promise<void> {
        try {
            const payload = typeof context.getRequestContent() === 'string'
                ? JSON.parse(context.getRequestContent())
                : context.getRequestContent();

            const message = modify.getCreator().startMessage()
                .setRoom({ id: this.roomId } as any)
                .setText(`📨 **Webhook Notification**:\n${JSON.stringify(payload, null, 2)}`);

            await modify.getCreator().finish(message);

            context.setStatusCode(200);
            context.setResponse({ success: true, posted: true });
        } catch (error) {
            context.setStatusCode(500);
            context.setResponse({ error: error.message });
        }
    }
}
```

## Pattern 4: Transform Webhook Data Before Sending

```typescript
class DataTransformWebhookHandler implements IPostExternalWebhookSent {
    public async executePostExternalWebhook(
        context: ExternalWebhookContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        try {
            const payload = typeof context.getRequestContent() === 'string'
                ? JSON.parse(context.getRequestContent())
                : context.getRequestContent();

            // Transform payload
            const transformed = this.transformPayload(payload);

            // Get room from persistence or settings
            const rooms = await read.getRoomReader().getAll();
            const notificationRoom = rooms[0]; // Use first room or stored preference

            const message = modify.getCreator().startMessage()
                .setRoom(notificationRoom)
                .setText(transformed);

            await modify.getCreator().finish(message);

            context.setStatusCode(200);
            context.setResponse({ success: true });
        } catch (error) {
            context.setStatusCode(500);
            context.setResponse({ error: error.message });
        }
    }

    private transformPayload(payload: any): string {
        // Custom transformation logic
        if (payload.alert) {
            return `🚨 **Alert**: ${payload.alert.title}\n${payload.alert.message}`;
        }

        if (payload.notification) {
            return `📢 **Notification**: ${payload.notification.text}`;
        }

        return `**Webhook Data**: ${JSON.stringify(payload)}`;
    }
}
```

## Registration in App Class

```typescript
protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
    // Register webhook handlers
    const webhooks = configuration.webhooks;

    webhooks.registerExternalWebhook({
        name: 'github-webhook',
        executePostExternalWebhookSent: [new GitHubWebhookHandler()],
    });

    webhooks.registerExternalWebhook({
        name: 'secure-webhook',
        executePostExternalWebhookSent: [new SecureWebhookHandler()],
    });

    webhooks.registerExternalWebhook({
        name: 'notification-webhook',
        executePostExternalWebhookSent: [new RoomNotificationWebhookHandler(this.roomId, modify)],
    });
}
```

## Accessing Webhooks

Once registered, webhooks are available at:
```
POST http://your-rocket-chat-server/api/v1/webhooks/incoming/webhook-name?token=WEBHOOK_TOKEN
```

The `WEBHOOK_TOKEN` is provided by Rocket.Chat after registration.

## Common Webhook Sources

- GitHub (`x-github-event` header)
- GitLab (`X-Gitlab-Event` header)
- Slack events
- Stripe webhooks
- AlertManager
- Custom HTTP services

## Common Pitfalls

1. **Missing header validation** - Always validate event type headers
2. **Not verifying signatures** - Anyone could send malicious webhooks
3. **Large payloads hanging** - Webhook handlers should not block
4. **No error response** - Always return proper HTTP status codes
5. **Room hardcoded** - Use settings or persistence for dynamic room selection

## Validation Checklist

- [ ] Implements `IPostExternalWebhookSent` correctly
- [ ] Handler validates incoming headers
- [ ] Request body correctly parsed (string vs. object)
- [ ] Webhook handler registered in `extendConfiguration()`
- [ ] Proper HTTP status codes returned
- [ ] Error handling with try/catch
- [ ] Response always set with `context.setResponse()`
- [ ] Rate limiting considered if needed
- [ ] Signature verification implemented (for secure webhooks)
- [ ] Sensitive configuration in environment variables
