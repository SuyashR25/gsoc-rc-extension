# Persistence Skill

Persistence allows your app to save and retrieve data across restarts using Rocket.Chat's built-in persistence layer.

## Pattern Overview

- Use the `IPersistence` accessor to store/retrieve data
- Data is keyed by `RocketChatAssociationModel` records
- Supports storing for users, rooms, channels, or globally
- Data persists across app restarts

## Key API Members

```typescript
interface IPersistence {
    create(associations: RocketChatAssociation[], data: object): Promise<string>;
    read(associations: RocketChatAssociation[], key?: string): Promise<object[]>;
    update(associations: RocketChatAssociation[], data: object, upsert?: boolean): Promise<void>;
    remove(associations: RocketChatAssociation[]): Promise<void>;
}

enum RocketChatAssociationModel {
    DIRECT_MESSAGE = 'direct-messages',
    ROOM = 'rooms',
    USER = 'users',
    SUBSCRIPTION = 'subscriptions',
}
```

## Pattern 1: Store Data Globally

```typescript
import { RocketChatAssociationModel, RocketChatAssociation } from '@rocket.chat/apps-engine/definition/metadata';

// Store global counter
async function incrementGlobalCounter(persis: IPersistence): Promise<void> {
    const globalAssociations = [
        new RocketChatAssociation(RocketChatAssociationModel.MISC, 'global-counter'),
    ];

    // Read existing value
    const existing = await persis.read(globalAssociations);
    const counter = existing.length > 0 ? (existing[0] as any).value + 1 : 1;

    // Update or create
    await persis.update(globalAssociations, { value: counter }, true);
}

// Read global counter
async function getGlobalCounter(persis: IPersistence): Promise<number> {
    const globalAssociations = [
        new RocketChatAssociation(RocketChatAssociationModel.MISC, 'global-counter'),
    ];

    const existing = await persis.read(globalAssociations);
    return existing.length > 0 ? (existing[0] as any).value : 0;
}
```

## Pattern 2: Store User-Specific Data

```typescript
// Store user preferences
async function saveUserPreferences(
    userId: string,
    preferences: { theme: string; language: string },
    persis: IPersistence
): Promise<void> {
    const userAssociations = [
        new RocketChatAssociation(RocketChatAssociationModel.USER, userId),
    ];

    await persis.update(userAssociations, { preferences }, true);
}

// Retrieve user preferences
async function getUserPreferences(userId: string, persis: IPersistence): Promise<any> {
    const userAssociations = [
        new RocketChatAssociation(RocketChatAssociationModel.USER, userId),
    ];

    const data = await persis.read(userAssociations);
    return data.length > 0 ? (data[0] as any).preferences : null;
}
```

## Pattern 3: Store Room-Specific Data

```typescript
// Store room settings
async function saveRoomSettings(
    roomId: string,
    settings: { notificationsEnabled: boolean; messageLimit: number },
    persis: IPersistence
): Promise<void> {
    const roomAssociations = [
        new RocketChatAssociation(RocketChatAssociationModel.ROOM, roomId),
    ];

    await persis.update(roomAssociations, { settings }, true);
}

// Retrieve room settings
async function getRoomSettings(roomId: string, persis: IPersistence): Promise<any> {
    const roomAssociations = [
        new RocketChatAssociation(RocketChatAssociationModel.ROOM, roomId),
    ];

    const data = await persis.read(roomAssociations);
    return data.length > 0 ? (data[0] as any).settings : null;
}
```

## Pattern 4: Remove Data

```typescript
// Clear user data
async function clearUserData(userId: string, persis: IPersistence): Promise<void> {
    const userAssociations = [
        new RocketChatAssociation(RocketChatAssociationModel.USER, userId),
    ];

    await persis.remove(userAssociations);
}

// Clear room data
async function clearRoomData(roomId: string, persis: IPersistence): Promise<void> {
    const roomAssociations = [
        new RocketChatAssociation(RocketChatAssociationModel.ROOM, roomId),
    ];

    await persis.remove(roomAssociations);
}
```

## Pattern 5: Store Complex Objects (with Keys)

```typescript
// Store multiple records for a user
async function saveUserTasks(
    userId: string,
    tasks: Array<{ id: string; title: string; completed: boolean }>,
    persis: IPersistence
): Promise<void> {
    const userAssociations = [
        new RocketChatAssociation(RocketChatAssociationModel.USER, userId),
    ];

    for (const task of tasks) {
        await persis.update(
            [...userAssociations, new RocketChatAssociation(RocketChatAssociationModel.MISC, `task-${task.id}`)],
            task,
            true
        );
    }
}

// Retrieve all user tasks
async function getUserTasks(userId: string, persis: IPersistence): Promise<any[]> {
    const userAssociations = [
        new RocketChatAssociation(RocketChatAssociationModel.USER, userId),
    ];

    const tasks = await persis.read(userAssociations);
    return tasks;
}
```

## Usage in Slash Commands

```typescript
class SaveDataSlashCommand implements ISlashCommand {
    public command = 'savedata';
    public i18nDescription = 'Save user preference';
    public i18nParamsExample = 'key value';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        const args = context.getArguments();

        if (args.length < 2) {
            await this.sendError(context, modify, 'Usage: /savedata key value');
            return;
        }

        const [key, value] = args;
        const userId = context.getSender().id;

        try {
            const userAssociations = [
                new RocketChatAssociation(RocketChatAssociationModel.USER, userId),
            ];

            await persis.update(userAssociations, { [key]: value }, true);

            const message = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(`✅ Saved ${key} = ${value}`);

            await modify.getCreator().finish(message);
        } catch (error) {
            await this.sendError(context, modify, `Error saving data: ${error.message}`);
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

## Common Pitfalls

1. **Not using associations correctly** - Always create proper association objects
2. **Forgetting to set `upsert: true`** - Use when you want to create if not exists
3. **Not checking if data exists** - Verify `read()` results before accessing properties
4. **Storing sensitive data** - Be cautious with passwords or API keys in persistence
5. **Large objects** - Persistence has size limits; monitor data volume

## Validation Checklist

- [ ] Using `IPersistence` accessor correctly
- [ ] Creating `RocketChatAssociation` objects with valid models
- [ ] Reading data before assuming it exists
- [ ] Using `upsert: true` when needing create-or-update behavior
- [ ] Handling `null` or empty results from `read()`
- [ ] Not storing sensitive data without encryption
- [ ] Data structure is JSON serializable
- [ ] Removing data when no longer needed to prevent bloat
