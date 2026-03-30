// @ts-nocheck — showcase snippet only; @rocket.chat/apps-engine not installed in this docs folder
/**
 * SNIPPET: Bot Loop Guard — Infinite Loop Prevention
 *
 * Proves: The AI never generates message listeners without this guard.
 * Without it, an app that sends a message in response to a message will
 * trigger itself again — creating an infinite bot loop that floods the channel.
 *
 * Rule 6 of the workflow mandates this guard be added as part of Step 4
 * (one-shot code writing), not as an afterthought.
 */

import { IMessage, IPostMessageSent } from '@rocket.chat/apps-engine/definition/messages';
import { IAppAccessors, ILogger, IRead, IHttp, IModify, IPersistence } from '@rocket.chat/apps-engine/definition/accessors';

class AutoReplyListener implements IPostMessageSent {

    async executePostMessageSent(
        message: IMessage,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
    ): Promise<void> {

        // ✅ CRITICAL: Guard against bot/app sender — prevents infinite loop
        // Without this check: App sends message → triggers listener → sends message → ...
        if (message.sender.type === 'bot' || message.sender.type === 'app') {
            return;
        }

        // ✅ Also guard against messages the app itself sent (belt-and-suspenders)
        if (!message.text) {
            return;
        }

        // Safe to process — this is a real user message
        if (message.text.toLowerCase().includes('hello')) {
            const builder = modify.getCreator().startMessage()
                .setSender(message.sender)
                .setRoom(message.room)
                .setText('Hello! 👋');
            await modify.getCreator().finish(builder);
        }
    }
}

// Registration in extendConfiguration() — also required:
//
// protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
//     await configuration.messages.providePostMessageSentHandler(new AutoReplyListener());
// }
