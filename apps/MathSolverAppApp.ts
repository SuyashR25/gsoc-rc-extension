import {
    IAppAccessors,
    IConfigurationExtend,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

export class MathSolverAppApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public getName(): string {
        return 'math-solver-app';
    }

    protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        await configuration.slashCommands.provideSlashCommand(new MathSlashCommand());
    }
}

class MathSlashCommand implements ISlashCommand {
    public command = 'math';
    public i18nDescription = 'Evaluate a mathematical expression using mathjs.org';
    public i18nParamsExample = '5 * (2 + 3)';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<void> {
        const args = context.getArguments();
        const expression = args.join(' ');

        if (!expression) {
            await this.sendError(context, modify, 'Please provide a math expression (e.g., `/math 5 + 3`)');
            return;
        }

        try {
            const url = 'https://api.mathjs.org/v1/?expr=' + encodeURIComponent(expression);
            const response = await http.get(url);

            if (response.statusCode !== 200) {
                await this.sendError(context, modify, 'Math API error: ' + (response.content || response.statusCode));
                return;
            }

            const result = response.content;

            const message = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText('**Math Expression:** `' + expression + '`\\n**Result:** `' + result + '` ');

            await modify.getCreator().finish(message);
        } catch (error) {
            await this.sendError(context, modify, 'Error evaluating expression: ' + error.message);
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
