# HTTP Skill

The HTTP accessor allows your app to make outbound HTTP requests to external APIs and services.

## Pattern Overview

- Use the `IHttp` accessor to make GET, POST, PUT, DELETE requests
- Handle response status codes and timeouts
- Use Settings for storing API keys and endpoints
- Implement error handling for network failures
- Consider rate limiting and retry logic

## Key HTTP Methods

```typescript
interface IHttp {
    get(url: string, options?: HttpOptions): Promise<IHttpResponse>;
    post(url: string, options?: HttpOptions): Promise<IHttpResponse>;
    put(url: string, options?: HttpOptions): Promise<IHttpResponse>;
    patch(url: string, options?: HttpOptions): Promise<IHttpResponse>;
    delete(url: string, options?: HttpOptions): Promise<IHttpResponse>;
}

interface IHttpResponse {
    statusCode: number;
    headers: Record<string, string>;
    data: any;
    content: string;
}

interface HttpOptions {
    headers?: Record<string, string>;
    data?: Record<string, any> | string;
    params?: Record<string, any>;
    auth?: { username: string; password: string };
    timeout?: number;
}
```

## Pattern 1: Simple GET Request

```typescript
class WeatherSlashCommand implements ISlashCommand {
    public command = 'weather';
    public i18nDescription = 'Get current weather';
    public i18nParamsExample = 'London';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        const [city] = context.getArguments();

        if (!city) {
            await this.sendError(context, modify, 'Please provide a city name');
            return;
        }

        try {
            const response = await http.get(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric`,
                {
                    headers: {
                        'User-Agent': 'RocketChatApp/1.0',
                    },
                }
            );

            if (response.statusCode !== 200) {
                await this.sendError(context, modify, `Failed to fetch weather (${response.statusCode})`);
                return;
            }

            const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            const weatherText = `🌡️ **${data.name}**: ${data.main.temp}°C, ${data.weather[0].description}`;

            const message = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(weatherText);

            await modify.getCreator().finish(message);
        } catch (error) {
            await this.sendError(context, modify, `Error: ${error.message}`);
        }
    }

    private async sendError(context: SlashCommandContext, modify: IModify, text: string): Promise<void> {
        const notifier = modify.getNotifier();
        const messageBuilder = notifier.getMessageBuilder()
            .setRoom(context.getRoom())
            .setText(text);
        await notifier.notifyUser(context.getSender(), messageBuilder.getMessage());
    }
}
```

## Pattern 2: POST Request with JSON Body

```typescript
class CreateTaskSlashCommand implements ISlashCommand {
    public command = 'task';
    public i18nDescription = 'Create a task in external service';
    public i18nParamsExample = 'Task title';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        const args = context.getArguments();
        const title = args.join(' ');

        if (!title) {
            await this.sendError(context, modify, 'Please provide a task title');
            return;
        }

        try {
            const apiKey = process.env.TODO_API_KEY;

            const response = await http.post('https://api.example.com/tasks', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    title,
                    description: `Created from Rocket.Chat by ${context.getSender().name}`,
                    priority: 'medium',
                },
            });

            if (response.statusCode !== 201) {
                await this.sendError(context, modify, `Failed to create task (${response.statusCode})`);
                return;
            }

            const taskData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            const message = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(`✅ Task created: #${taskData.id} - ${taskData.title}`);

            await modify.getCreator().finish(message);
        } catch (error) {
            await this.sendError(context, modify, `Error: ${error.message}`);
        }
    }

    private async sendError(context: SlashCommandContext, modify: IModify, text: string): Promise<void> {
        const notifier = modify.getNotifier();
        const messageBuilder = notifier.getMessageBuilder()
            .setRoom(context.getRoom())
            .setText(text);
        await notifier.notifyUser(context.getSender(), messageBuilder.getMessage());
    }
}
```

## Pattern 3: Request with Authentication & Error Handling

```typescript
class SlackNotificationSlashCommand implements ISlashCommand {
    public command = 'notify';
    public i18nDescription = 'Send notification to Slack';
    public i18nParamsExample = 'message';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        const message = context.getArguments().join(' ');

        if (!message) {
            await this.sendError(context, modify, 'Please provide a message');
            return;
        }

        try {
            const webhookUrl = process.env.SLACK_WEBHOOK_URL;

            const response = await http.post(webhookUrl, {
                data: {
                    text: `📨 From ${context.getSender().name}: ${message}`,
                    username: 'RocketChat Bot',
                    icon_emoji: ':rocket:',
                },
                timeout: 10000, // 10 second timeout
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.statusCode < 200 || response.statusCode >= 300) {
                await this.sendError(context, modify, `Slack notification failed (${response.statusCode})`);
                return;
            }

            const successMsg = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(`✅ Message sent to Slack`);

            await modify.getCreator().finish(successMsg);
        } catch (error) {
            if (error.message.includes('timeout')) {
                await this.sendError(context, modify, 'Slack request timed out');
            } else {
                await this.sendError(context, modify, `Error: ${error.message}`);
            }
        }
    }

    private async sendError(context: SlashCommandContext, modify: IModify, text: string): Promise<void> {
        const notifier = modify.getNotifier();
        const messageBuilder = notifier.getMessageBuilder()
            .setRoom(context.getRoom())
            .setText(text);
        await notifier.notifyUser(context.getSender(), messageBuilder.getMessage());
    }
}
```

## Pattern 4: Retry Logic for Resilient Requests

```typescript
class ResilientHttpClient {
    constructor(private http: IHttp) {}

    public async getWithRetry(
        url: string,
        options: HttpOptions = {},
        maxRetries: number = 3,
        delayMs: number = 1000
    ): Promise<IHttpResponse> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.http.get(url, options);

                // Success if 2xx status code
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    return response;
                }

                // Don't retry 4xx errors (client errors)
                if (response.statusCode >= 400 && response.statusCode < 500) {
                    throw new Error(`Client error: ${response.statusCode}`);
                }

                // Retry on 5xx errors
                if (attempt < maxRetries) {
                    await this.delay(delayMs * attempt); // Exponential backoff
                    continue;
                }

                throw new Error(`Server error after ${maxRetries} attempts: ${response.statusCode}`);
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }

                await this.delay(delayMs * attempt);
            }
        }

        throw new Error('Max retries exceeded');
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

## Pattern 5: Streaming Large Responses

```typescript
class StreamingHttpClient {
    constructor(private http: IHttp) {}

    public async getLargeFile(
        url: string,
        onChunk: (chunk: string) => Promise<void>
    ): Promise<void> {
        try {
            const response = await this.http.get(url, {
                timeout: 30000, // 30 second timeout for large files
                headers: {
                    'Accept-Encoding': 'gzip, deflate',
                },
            });

            if (response.statusCode !== 200) {
                throw new Error(`HTTP ${response.statusCode}`);
            }

            const content = response.content || response.data;
            await onChunk(content);
        } catch (error) {
            console.error('Error fetching large file:', error);
            throw error;
        }
    }
}
```

## Using HTTP with Settings

```typescript
class DynamicApiSlashCommand implements ISlashCommand {
    public command = 'api';
    public i18nDescription = 'Call configured API endpoint';
    public i18nParamsExample = 'param1 param2';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        try {
            // Get API settings from app settings
            const apiEndpoint = await read.getEnvironmentReader().getServerSettings().getApiUrl();
            const apiKey = await read.getEnvironmentReader().getServerSettings().getApiKey();

            const response = await http.get(`${apiEndpoint}/endpoint`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });

            if (response.statusCode !== 200) {
                throw new Error(`API error: ${response.statusCode}`);
            }

            const message = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(`✅ API Response: ${JSON.stringify(response.data)}`);

            await modify.getCreator().finish(message);
        } catch (error) {
            const errorMsg = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(`❌ Error: ${error.message}`);

            await modify.getCreator().finish(errorMsg);
        }
    }
}
```

## Common Pitfalls

1. **Not handling timeouts** - Always set reasonable timeouts
2. **Hardcoded API keys** - Use environment variables or settings
3. **No status code checking** - Always validate response.statusCode
4. **Large response bodies** - Consider streaming for large files
5. **No retry logic** - Implement retries for transient failures
6. **CORS issues** - External APIs may block cross-origin requests
7. **Not parsing responses** - Check if response.data is string vs. object

## Validation Checklist

- [ ] Uses `http.get()`, `http.post()`, etc. correctly
- [ ] Validates `response.statusCode` before processing
- [ ] Proper error handling with try/catch
- [ ] Headers set correctly (User-Agent, Auth, Content-Type)
- [ ] API keys stored in environment variables, not hardcoded
- [ ] Timeout configured for long-running requests
- [ ] Response body correctly parsed (string vs. object)
- [ ] User feedback on success and failure
- [ ] No blocking synchronous network operations
- [ ] Rate limiting considered if needed
