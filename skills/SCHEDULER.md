# Scheduler Skill

The Scheduler allows your app to run tasks at specific times or on repeating intervals.

## Pattern Overview

- Implement `IPreMessageSent` listener to detect scheduler setup commands
- Use external scheduler (NodeJS `setInterval`, cron libraries, etc.)
- Store scheduled tasks in persistence so they survive restarts
- Execute scheduled callbacks with message sending capability

## Key Interfaces

```typescript
interface Scheduler {
    scheduleTask(id: string, frequency: number, callback: () => Promise<void>): Promise<void>;
    cancelTask(id: string): Promise<void>;
}

// Typically use persistence to track scheduled tasks
enum TaskFrequency {
    ONCE = 'once',
    HOURLY = 'hourly',
    DAILY = 'daily',
    WEEKLY = 'weekly',
}
```

## Pattern 1: Simple Daily Task Scheduler

```typescript
import { RocketChatAssociation, RocketChatAssociationModel } from '@rocket.chat/apps-engine/definition/metadata';

class DailyScheduler {
    private tasks: Map<string, NodeJS.Timeout> = new Map();

    public async scheduleDaily(
        taskId: string,
        hour: number,
        minute: number,
        callback: () => Promise<void>,
        persistence: IPersistence
    ): Promise<void> {
        // Save to persistence
        const globalAssociations = [
            new RocketChatAssociation(RocketChatAssociationModel.MISC, `scheduled-task-${taskId}`),
        ];

        await persistence.update(
            globalAssociations,
            {
                taskId,
                hour,
                minute,
                enabled: true,
                createdAt: new Date().toISOString(),
            },
            true
        );

        // Schedule in memory (will restart on app reload)
        this.scheduleNext(taskId, hour, minute, callback);
    }

    private scheduleNext(
        taskId: string,
        hour: number,
        minute: number,
        callback: () => Promise<void>
    ): void {
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hour, minute, 0, 0);

        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const delay = scheduledTime.getTime() - now.getTime();

        const timeout = setTimeout(async () => {
            try {
                await callback();
            } catch (error) {
                console.error(`Error in scheduled task ${taskId}:`, error);
            }

            // Reschedule for next day
            this.scheduleNext(taskId, hour, minute, callback);
        }, delay);

        this.tasks.set(taskId, timeout);
    }

    public cancelTask(taskId: string): void {
        const timeout = this.tasks.get(taskId);
        if (timeout) {
            clearTimeout(timeout);
            this.tasks.delete(taskId);
        }
    }
}
```

## Pattern 2: Recurring Interval Task

```typescript
class IntervalScheduler {
    private intervals: Map<string, NodeJS.Timeout> = new Map();

    public scheduleInterval(
        taskId: string,
        intervalMs: number,
        callback: () => Promise<void>
    ): void {
        const interval = setInterval(async () => {
            try {
                await callback();
            } catch (error) {
                console.error(`Error in interval task ${taskId}:`, error);
            }
        }, intervalMs);

        this.intervals.set(taskId, interval);
    }

    public cancelTask(taskId: string): void {
        const interval = this.intervals.get(taskId);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(taskId);
        }
    }
}
```

## Pattern 3: Schedule Task via Slash Command

```typescript
class ScheduleSlashCommand implements ISlashCommand {
    public command = 'schedule';
    public i18nDescription = 'Schedule a daily reminder message';
    public i18nParamsExample = 'HH:MM "message text"';
    public providesPreview = false;

    constructor(private scheduler: DailyScheduler) {}

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        const args = context.getArguments();

        if (args.length < 2) {
            await this.sendError(context, modify, 'Usage: /schedule HH:MM "reminder message"');
            return;
        }

        const timeStr = args[0];
        const message = args.slice(1).join(' ');
        const [hour, minute] = timeStr.split(':').map(Number);

        if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            await this.sendError(context, modify, 'Invalid time format. Use HH:MM (e.g., 14:30)');
            return;
        }

        try {
            const taskId = `reminder-${Date.now()}`;
            const room = context.getRoom();

            await this.scheduler.scheduleDaily(
                taskId,
                hour,
                minute,
                async () => {
                    const reminderMsg = modify.getCreator().startMessage()
                        .setRoom(room)
                        .setText(`🔔 **Reminder:** ${message}`);

                    await modify.getCreator().finish(reminderMsg);
                },
                persis
            );

            const confirmMsg = modify.getCreator().startMessage()
                .setRoom(context.getRoom())
                .setText(`✅ Reminder scheduled for ${timeStr} daily`);

            await modify.getCreator().finish(confirmMsg);
        } catch (error) {
            await this.sendError(context, modify, `Error scheduling reminder: ${error.message}`);
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

## Pattern 4: Load Scheduled Tasks on App Start

```typescript
// In your App class
export class MyApp extends App {
    private scheduler: DailyScheduler = new DailyScheduler();

    public async onEnable(isNewInstall: boolean): Promise<boolean> {
        if (!isNewInstall) {
            // Load persisted scheduled tasks on app restart
            await this.loadScheduledTasks();
        }
        return true;
    }

    private async loadScheduledTasks(): Promise<void> {
        const persistence = this.getAccessors().getPersistence();
        const globalAssociations = [
            new RocketChatAssociation(RocketChatAssociationModel.MISC, 'scheduled-task-*'),
        ];

        try {
            const tasks = await persistence.read(globalAssociations);

            for (const task of tasks) {
                const taskData = task as any;
                if (taskData.enabled) {
                    // Reschedule task
                    this.scheduler.scheduleDaily(
                        taskData.taskId,
                        taskData.hour,
                        taskData.minute,
                        async () => {
                            // Execute stored callback
                            console.log(`Executing scheduled task: ${taskData.taskId}`);
                        },
                        persistence
                    );
                }
            }
        } catch (error) {
            console.error('Error loading scheduled tasks:', error);
        }
    }

    public async onDisable(): Promise<void> {
        // Clean up all scheduled tasks when app is disabled
        // Implementation depends on your scheduler
    }
}
```

## Common Implementation Notes

1. **Persistence Across Restarts** - Save task definitions in persistence so they load on app restart
2. **Timezone Handling** - Always be aware of server vs. user timezone when scheduling
3. **Memory Leaks** - Always cancel intervals/timeouts when app disables
4. **Accurate Spacing** - Use `setInterval` for fixed intervals, custom logic for daily at specific time
5. **Error Resilience** - Wrap callback execution in try/catch to prevent task from crashing

## Common Pitfalls

1. **Not saving to persistence** - Tasks get lost on app restart
2. **Memory leaks** - Not clearing intervals causes memory to grow
3. **Timezone issues** - Scheduled times may be off due to timezone mismatch
4. **Blocking operations** - Slow tasks delay subsequent scheduled executions
5. **No error handling** - Errors in scheduled callback break the scheduler

## Validation Checklist

- [ ] Tasks persisted in persistence for restart resilience
- [ ] Scheduled callbacks wrapped in try/catch
- [ ] Intervals/timeouts properly cleared on disable
- [ ] Task IDs are unique
- [ ] Timer logic correctly calculates next execution time
- [ ] Timezone handled consistently
- [ ] No blocking synchronous operations in callbacks
- [ ] Callbacks use proper context (room, user, etc.)
- [ ] Testing includes restart scenarios
