# Slash Commands Skill

Slash commands allow users to interact with your app by typing `/command-name` in Rocket.Chat.

## Pattern Overview

- Implement the `ISlashCommand` interface
- Register in the app's `extendConfiguration()` method
- Execute when user types the command in chat
- Can be in the same file as the App class or in a separate file

## Key Interface Members

```typescript
interface ISlashCommand {
    command: string;              // The command name (without /)
    i18nDescription: string;      // Human-readable description
    i18nParamsExample?: string;   // Example parameters text
    providesPreview?: boolean;    // Whether to show preview
    executor(...): Promise<void>; // Main execution function
}
```

## Pattern 1: Simple Message Response

```typescript
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { IRead, IModify, IHttp, IPersistence } from '@rocket.chat/apps-engine/definition/accessors';

class HelloSlashCommand implements ISlashCommand {
    public command = 'hello';
    public i18nDescription = 'Send a greeting message';
    public i18nParamsExample = 'your-name';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        const [name] = context.getArguments();
        const greetingName = name || 'Friend';

        const message = modify.getCreator().startMessage()
            .setRoom(context.getRoom())
            .setText(`Hello, ${greetingName}! 👋`);

        await modify.getCreator().finish(message);
    }
}
```

## Pattern 2: Command with Error Handling & Parameters

```typescript
class CalculateSlashCommand implements ISlashCommand {
    public command = 'calc';
    public i18nDescription = 'Perform basic math calculation';
    public i18nParamsExample = '5 + 3';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        const args = context.getArguments();

        if (args.length === 0) {
            await this.sendError(context, modify, 'Please provide a math expression (e.g., /calc 5 + 3)');
            return;
        }

        try {
            const expression = args.join(' ');
            // Simple eval with validation (WARNING: eval is dangerous - use in safe contexts only)
            const result = new Function('return ' + expression)();

            const message = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(`**Result:** ${result}`);

            await modify.getCreator().finish(message);
        } catch (error) {
            await this.sendError(context, modify, `Calculation error: ${error.message}`);
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

## Pattern 3: Command with External API Call

```typescript
class WeatherSlashCommand implements ISlashCommand {
    public command = 'weather';
    public i18nDescription = 'Get weather information for a city';
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
            await this.sendError(context, modify, 'Please provide a city name (e.g., /weather London)');
            return;
        }

        try {
            // Example: Using a free weather API
            const url = `https://api.weatherapi.com/v1/current.json?key=YOUR_KEY&q=${encodeURIComponent(city)}`;
            const response = await http.get(url);

            if (response.statusCode !== 200) {
                await this.sendError(context, modify, `Could not fetch weather for: ${city}`);
                return;
            }

            const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            const weatherText = `**${data.location.name}, ${data.location.country}**\nTemperature: ${data.current.temp_c}°C\nCondition: ${data.current.condition.text}`;

            const message = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(weatherText);

            await modify.getCreator().finish(message);
        } catch (error) {
            await this.sendError(context, modify, `Error fetching weather: ${error.message}`);
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

## Registration in App Class

```typescript
protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
    await configuration.slashCommands.provideSlashCommand(new HelloSlashCommand());
    await configuration.slashCommands.provideSlashCommand(new CalculateSlashCommand());
    await configuration.slashCommands.provideSlashCommand(new WeatherSlashCommand());
}
```

## Common Pitfalls

1. **Not extracting arguments correctly** - Always check `context.getArguments()` length before accessing
2. **Missing error handling** - Use try/catch for HTTP calls and external operations
3. **Forgetting to call `.finish()`** - Messages won't be sent without it
4. **Not setting the room** - Always include `.setRoom(context.getRoom())`
5. **Case sensitivity** - Command names are lowercase; parameter matching may need case handling

## Validation Checklist

- [ ] Implements `ISlashCommand` interface correctly
- [ ] `command`, `i18nDescription` defined
- [ ] `executor()` includes all 5 parameters (context, read, modify, http, persis)
- [ ] No direct execution without registration in `extendConfiguration()`
- [ ] Error handling with try/catch for external calls
- [ ] User feedback message sent in all paths (success and error)
- [ ] Room context preserved: `.setRoom(context.getRoom())`
- [ ] Arguments validated before use: check array length
- [ ] Message creation uses builder pattern: `.startMessage()` → `.finish()`
