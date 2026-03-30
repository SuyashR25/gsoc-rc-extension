# Settings Skill

App Settings allow users to configure your app's behavior through the Rocket.Chat admin UI without code changes.

## Pattern Overview

- Define setting schema in `extendConfiguration()`
- Use `IRead` accessor to retrieve settings
- Store configuration like API keys, webhooks, thresholds
- Support multiple setting types: string, number, boolean, select, password

## Key Setting Types

```typescript
enum SettingType {
    STRING = 'string',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    SELECT = 'select',
    TEXTAREA = 'textarea',
    PASSWORD = 'password',
    MULTI_SELECT = 'multiselect',
}

interface ISetting {
    id: string;
    type: SettingType;
    packageValue?: any;
    required?: boolean;
    public?: boolean;
    i18nLabel?: string;
    i18nDescription?: string;
    value?: any;
}
```

## Pattern 1: Simple String & Boolean Settings

```typescript
protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
    await configuration.settings.provideSetting({
        id: 'api_endpoint',
        type: SettingType.STRING,
        packageValue: 'https://api.example.com',
        required: true,
        i18nLabel: 'API Endpoint',
        i18nDescription: 'The base URL for the external API',
        public: false,
    });

    await configuration.settings.provideSetting({
        id: 'enable_notifications',
        type: SettingType.BOOLEAN,
        packageValue: true,
        i18nLabel: 'Enable Notifications',
        i18nDescription: 'Send notifications about API events',
        public: true,
    });

    await configuration.settings.provideSetting({
        id: 'api_timeout',
        type: SettingType.NUMBER,
        packageValue: 5000,
        i18nLabel: 'API Timeout (ms)',
        i18nDescription: 'Maximum time to wait for API response',
        public: false,
    });
}
```

## Pattern 2: Password Settings for API Keys

```typescript
protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
    await configuration.settings.provideSetting({
        id: 'github_token',
        type: SettingType.PASSWORD,
        packageValue: '',
        required: true,
        i18nLabel: 'GitHub API Token',
        i18nDescription: 'Personal access token for GitHub API (keep secret)',
        public: false,
    });

    await configuration.settings.provideSetting({
        id: 'slack_webhook',
        type: SettingType.PASSWORD,
        packageValue: '',
        i18nLabel: 'Slack Webhook URL',
        i18nDescription: 'Incoming webhook URL for Slack notifications',
        public: false,
    });
}
```

## Pattern 3: Select Settings

```typescript
protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
    await configuration.settings.provideSetting({
        id: 'log_level',
        type: SettingType.SELECT,
        packageValue: 'info',
        i18nLabel: 'Log Level',
        i18nDescription: 'Default logging level for the app',
        required: true,
        public: false,
        values: [
            { key: 'debug', i18nLabel: 'Debug' },
            { key: 'info', i18nLabel: 'Info' },
            { key: 'warn', i18nLabel: 'Warning' },
            { key: 'error', i18nLabel: 'Error' },
        ],
    });

    await configuration.settings.provideSetting({
        id: 'notification_channel',
        type: SettingType.SELECT,
        packageValue: 'general',
        i18nLabel: 'Default Notification Channel',
        i18nDescription: 'Channel where notifications will be posted',
        public: true,
        values: [
            { key: 'general', i18nLabel: 'General' },
            { key: 'alerts', i18nLabel: 'Alerts' },
            { key: 'notifications', i18nLabel: 'Notifications' },
        ],
    });
}
```

## Pattern 4: Reading Settings in Code

```typescript
class SettingsAwareSlashCommand implements ISlashCommand {
    public command = 'config';
    public i18nDescription = 'Show current configuration';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        try {
            const settings = read.getSettingReader();

            // Read settings
            const apiEndpoint = await settings.getValueById('api_endpoint');
            const enableNotifications = await settings.getValueById('enable_notifications');
            const apiTimeout = await settings.getValueById('api_timeout');
            const logLevel = await settings.getValueById('log_level');

            const configText = `
⚙️ **Current Configuration**:
- API Endpoint: ${apiEndpoint}
- Notifications Enabled: ${enableNotifications ? '✅' : '❌'}
- API Timeout: ${apiTimeout}ms
- Log Level: ${logLevel}
            `.trim();

            const message = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(configText);

            await modify.getCreator().finish(message);
        } catch (error) {
            const errorMsg = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(`❌ Error reading settings: ${error.message}`);

            await modify.getCreator().finish(errorMsg);
        }
    }
}
```

## Pattern 5: Using Settings in HTTP Requests

```typescript
class ApiSlashCommand implements ISlashCommand {
    public command = 'fetch';
    public i18nDescription = 'Fetch data from configured API';
    public i18nParamsExample = 'endpoint';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        const [endpoint] = context.getArguments();

        if (!endpoint) {
            await this.sendError(context, modify, 'Please provide an endpoint');
            return;
        }

        try {
            const settings = read.getSettingReader();

            // Get dynamic settings
            const apiBase = await settings.getValueById('api_endpoint');
            const apiKey = await settings.getValueById('github_token');
            const timeout = await settings.getValueById('api_timeout');

            const url = `${apiBase}/${endpoint}`;

            const response = await http.get(url, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'User-Agent': 'RocketChatApp/1.0',
                },
                timeout: timeout || 5000,
            });

            if (response.statusCode !== 200) {
                await this.sendError(context, modify, `API error: ${response.statusCode}`);
                return;
            }

            const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            const message = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(`\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);

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

## Pattern 6: Textarea for Long Configuration

```typescript
protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
    await configuration.settings.provideSetting({
        id: 'custom_rules',
        type: SettingType.TEXTAREA,
        packageValue: '# No custom rules',
        i18nLabel: 'Custom Rules (JSON)',
        i18nDescription: 'Define custom validation rules as JSON array',
        public: false,
    });

    await configuration.settings.provideSetting({
        id: 'welcome_message',
        type: SettingType.TEXTAREA,
        packageValue: 'Welcome to our Rocket.Chat instance!',
        i18nLabel: 'Welcome Message',
        i18nDescription: 'Message shown to new users',
        public: true,
    });
}
```

## Pattern 7: Multi-Select Settings

```typescript
protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
    await configuration.settings.provideSetting({
        id: 'enabled_features',
        type: SettingType.MULTI_SELECT,
        packageValue: ['feature_a', 'feature_b'],
        i18nLabel: 'Enabled Features',
        i18nDescription: 'Select which features to enable',
        public: true,
        values: [
            { key: 'feature_a', i18nLabel: 'Feature A' },
            { key: 'feature_b', i18nLabel: 'Feature B' },
            { key: 'feature_c', i18nLabel: 'Feature C' },
            { key: 'feature_d', i18nLabel: 'Feature D' },
        ],
    });
}

// Read multi-select setting
const features = await read.getSettingReader().getValueById('enabled_features');
// Returns array: ['feature_a', 'feature_b']
```

## Setting Best Practices

1. **Default Values** - Always provide sensible defaults with `packageValue`
2. **Validation** - Validate settings on app startup
3. **Secrets** - Use PASSWORD type for API keys, never log them
4. **Documentation** - Detailed `i18nDescription` helps users configure correctly
5. **Groups** - Organize related settings with descriptive IDs

## Common Pitfalls

1. **No default values** - Settings without defaults cause errors
2. **Hardcoded secrets** - Use PASSWORD settings instead of environment variables in code
3. **Not validating** - Invalid settings cause runtime errors; validate on startup
4. **Case sensitivity** - Setting IDs are case-sensitive
5. **Async context** - Always await `getValueById()`, never call synchronously

## Validation Checklist

- [ ] All settings have unique IDs
- [ ] Settings defined in `extendConfiguration()`
- [ ] Default values (`packageValue`) provided for all settings
- [ ] Correct `SettingType` used for each setting
- [ ] Password/sensitive settings marked with `PASSWORD` type
- [ ] i18nLabel and i18nDescription provided
- [ ] Settings properly awaited when reading: `await getValueById()`
- [ ] Select/multi-select have valid options list
- [ ] No hardcoded values in code; use settings instead
- [ ] Admin UI clearly displays setting purpose
