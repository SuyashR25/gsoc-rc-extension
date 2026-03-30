# Message Listeners Skill

Message listeners allow your app to react to events like messages being sent, users joining, etc.

## Pattern Overview

- Implement event interfaces like `IPostMessageSent`, `IPreMessageSent`, etc.
- Register in `extendConfiguration()`
- **CRITICAL**: Always check sender type to prevent infinite loops
- Access message, room, user context through parameters

## Key Event Handlers

```typescript
interface IPostMessageSent {
    executePostMessageSent(
        message: IMessage,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void>;
}

interface IPostRoomUserJoined {
    executePostRoomUserJoined(
        message: IMessage,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void>;
}

interface IPreMessageSent {
    executePreMessageSent(
        message: IMessage,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void | IMessage>;
}
```

## Pattern 1: Simple Message Listener with Loop Prevention

```typescript
import { IPostMessageSent } from '@rocket.chat/apps-engine/definition/messages';
import { IMessage } from '@rocket.chat/apps-engine/definition/messages';

class MessageLogger implements IPostMessageSent {
    public async executePostMessageSent(
        message: IMessage,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        // MANDATORY: Prevent infinite loops
        if (message.sender.type === 'bot' || message.sender.type === 'app') {
            return;
        }

        // Log message to console (or send to external service)
        console.log(`Message from ${message.sender.name}: ${message.text}`);
    }
}
```

## Pattern 2: Auto-Response to Keywords

```typescript
class KeywordResponder implements IPostMessageSent {
    private keywords = ['hello', 'hi', 'hey'];

    public async executePostMessageSent(
        message: IMessage,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        if (message.sender.type === 'bot' || message.sender.type === 'app') {
            return;
        }

        const messageText = message.text?.toLowerCase() || '';

        // Check if message contains keyword
        if (this.keywords.some(keyword => messageText.includes(keyword))) {
            const responseMessage = modify.getCreator().startMessage()
                .setRoom(message.room)
                .setText(`👋 Hello ${message.sender.name}! How can I help?`);

            await modify.getCreator().finish(responseMessage);
        }
    }
}
```

## Pattern 3: User Join Notification

```typescript
class WelcomeNewUser implements IPostRoomUserJoined {
    public async executePostRoomUserJoined(
        message: IMessage,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        // message.text contains user join notification
        const newUserName = message.text?.match(/\*\*(.*?)\*\*/)?.[1] || 'New member';

        const welcomeMessage = modify.getCreator().startMessage()
            .setRoom(message.room)
            .setText(`🎉 Welcome to the room, ${newUserName}! Feel free to introduce yourself.`);

        await modify.getCreator().finish(welcomeMessage);
    }
}
```

## Pattern 4: Count Messages Per Room

```typescript
import { RocketChatAssociation, RocketChatAssociationModel } from '@rocket.chat/apps-engine/definition/metadata';

class MessageCounter implements IPostMessageSent {
    public async executePostMessageSent(
        message: IMessage,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        if (message.sender.type === 'bot' || message.sender.type === 'app') {
            return;
        }

        const roomId = message.room.id;
        const roomAssociations = [
            new RocketChatAssociation(RocketChatAssociationModel.ROOM, roomId),
        ];

        try {
            const existing = await persistence.read(roomAssociations);
            const count = existing.length > 0 ? (existing[0] as any).messageCount + 1 : 1;

            await persistence.update(roomAssociations, { messageCount: count }, true);
        } catch (error) {
            console.error('Error updating message count:', error);
        }
    }
}
```

## Pattern 5: Message Filtering (Pre-Send)

```typescript
class ProfanityFilter implements IPreMessageSent {
    private bannedWords = ['badword1', 'badword2'];

    public async executePreMessageSent(
        message: IMessage,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void | IMessage> {
        let text = message.text || '';

        // Replace banned words
        for (const word of this.bannedWords) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            text = text.replace(regex, '*'.repeat(word.length));
        }

        // Return modified message
        if (text !== message.text) {
            message.text = text;
        }

        return message;
    }
}
```

## Registration in App Class

```typescript
protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
    configuration.messages.registerPostMessageSent([
        new MessageLogger(),
        new KeywordResponder(),
        new MessageCounter(),
    ]);

    configuration.rooms.registerPostRoomUserJoined([
        new WelcomeNewUser(),
    ]);

    configuration.messages.registerPreMessageSent([
        new ProfanityFilter(),
    ]);
}
```

## Message Sender Types

```typescript
enum MessageSenderType {
    USER = 'user',
    BOT = 'bot',
    APP = 'app',
    WEBHOOK = 'webhook',
}

// Always check: if (message.sender.type === 'bot' || message.sender.type === 'app') return;
```

## Common Pitfalls

1. **CRITICAL: Infinite loops** - Not checking sender type leads to app responding to itself forever
2. **Unhandled errors** - Errors in listeners crash silently; use try/catch
3. **Slow operations blocking** - Don't do heavy work in listeners; use async appropriately
4. **Message text not checked** - Message.text can be null/undefined
5. **Room context missing** - Always use `message.room` not derived room

## Validation Checklist

- [ ] Implements correct interface (`IPostMessageSent`, `IPreMessageSent`, `IPostRoomUserJoined`)
- [ ] **CRITICAL**: Checks `message.sender.type` to prevent infinite loops
- [ ] Error handling with try/catch
- [ ] Registered in `extendConfiguration()`
- [ ] Message.text validated before use (null/undefined check)
- [ ] Room context preserved: uses `message.room` correctly
- [ ] No heavy synchronous operations blocking event handler
- [ ] Returns `Promise<void>` or `Promise<IMessage>` appropriately
- [ ] Uses persistence or http correctly if needed
