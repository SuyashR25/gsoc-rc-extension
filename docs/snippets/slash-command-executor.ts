// @ts-nocheck — showcase snippet only; @rocket.chat/apps-engine not installed in this docs folder
/**
 * SNIPPET: Slash Command Executor
 *
 * Proves: Full slash command implementation generated in one pass by the AI.
 * Key patterns demonstrated:
 *   - Argument validation before any async work
 *   - try/catch around all HTTP calls (mandatory rule)
 *   - HTTP status code check before reading data
 *   - sendMessage (public, visible to room) vs notifyMessage (private, only sender sees it)
 *   - Uses Math.js public API — no API key required
 */

import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

class MathSlashCommand implements ISlashCommand {
    public command = 'math';
    public i18nParamsExample = 'expression';
    public i18nDescription = 'Evaluate mathematical expressions (Math.js API)';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<void> {
        const expression = context.getArguments().join(' ').trim();

        // ✅ Validate arguments before doing any async work
        if (!expression) {
            return await this.notifyMessage(context, modify, 'Usage: /math 5 * (2 + 3)');
        }

        try {
            // ✅ Free public API — no key, simple expression evaluation endpoint
            const encodedExpr = encodeURIComponent(expression);
            const url = `https://api.mathjs.org/v4/?expr=${encodedExpr}`;
            const response = await http.get(url);

            // ✅ Always check statusCode — never assume HTTP calls succeed
            if (response.statusCode !== 200) {
                return await this.notifyMessage(context, modify, `Invalid expression or API error (Status: ${response.statusCode})`);
            }

            const result = (response.content || response.data || '').toString().trim();
            if (!result) {
                return await this.notifyMessage(context, modify, 'No result returned for this expression.');
            }

            const message = `Math Expression: ${expression}\nResult: ${result}`;

            // ✅ sendMessage = visible to everyone in the room
            await this.sendMessage(context, modify, message);
        } catch (error) {
            // ✅ catch block always present — feeds error back to user, never silently fails
            await this.notifyMessage(context, modify, `Error solving expression: ${error.message}`);
        }
    }

    // Public message — posted into the channel for everyone to see
    private async sendMessage(context: SlashCommandContext, modify: IModify, text: string): Promise<void> {
        const msg = modify.getCreator().startMessage()
            .setSender(context.getSender())
            .setRoom(context.getRoom())
            .setText(text);
        await modify.getCreator().finish(msg);
    }

    // Ephemeral message — only the person who typed the command sees it
    private async notifyMessage(context: SlashCommandContext, modify: IModify, text: string): Promise<void> {
        const notifier = modify.getNotifier();
        const messageBuilder = notifier.getMessageBuilder()
            .setRoom(context.getRoom())
            .setText(text);
        await notifier.notifyUser(context.getSender(), messageBuilder.getMessage());
    }
}
