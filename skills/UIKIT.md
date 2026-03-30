# UIKit Skill

UIKit allows your app to create interactive modals, forms, and buttons for user interaction.

## Pattern Overview

- Use `IUIKitInteractionHandler` for handling modal submissions
- Create modals with `UiKitModalBuilder`
- Handle button clicks and form inputs
- Trigger modals from slash commands or message actions

## Key Interfaces

```typescript
interface IUIKitInteractionHandler {
    blockId: string;
    actionId: string;
    executePreAction(context: UIKitPreActionContext): Promise<void>;
    executeAction(context: UIKitActionContext): Promise<IUIKitResponse>;
}

interface UIKitModalBuilder {
    addSection(builder: (block) => void): this;
    addInput(builder: (block) => void): this;
    addButton(builder: (block) => void): this;
    // ... more methods
}
```

## Pattern 1: Simple Form Modal

```typescript
import {
    IUIKitInteractionHandler,
    UIKitActionContext,
    UIKitPreActionContext,
    IUIKitResponse,
} from '@rocket.chat/apps-engine/definition/uikit';
import { TextObjectType, BlockBuilder, ContextualBar } from '@rocket.chat/ui-kit';

class FeedbackModalHandler implements IUIKitInteractionHandler {
    public blockId = 'feedback_modal';
    public actionId = 'submit_feedback';

    public async executePreAction(context: UIKitPreActionContext): Promise<void> {
        // Called before action is executed
    }

    public async executeAction(context: UIKitActionContext): Promise<IUIKitResponse> {
        const data = context.getInteractionData();

        // Get form data
        const feedback = data.view?.state?.feedback?.value || '';
        const rating = data.view?.state?.rating?.value || '5';

        // Save feedback (e.g., to persistence or external API)
        console.log(`Feedback: ${feedback}, Rating: ${rating}`);

        // Return success response
        return {
            success: true,
        };
    }
}

class FeedbackSlashCommand implements ISlashCommand {
    public command = 'feedback';
    public i18nDescription = 'Submit feedback about the app';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        const builder = new ContextualBar();

        builder
            .addDivider()
            .addSection((section) => {
                section.setText(
                    new BlockBuilder()
                        .addMarkdownObject('*Feedback Form*')
                        .getObject()
                );
            })
            .addInput((input) => {
                input
                    .setBlockId('feedback_modal')
                    .setLabel('Your Feedback')
                    .setElement((elem) => {
                        elem
                            .setActionId('feedback')
                            .setMultiline(true)
                            .setPlaceholder('Tell us what you think...');
                    });
            })
            .addInput((input) => {
                input
                    .setBlockId('feedback_modal')
                    .setLabel('Rating (1-5)')
                    .setElement((elem) => {
                        elem
                            .setActionId('rating')
                            .setInitialValue('5');
                    });
            })
            .addButton((button) => {
                button
                    .setText('Submit Feedback')
                    .setActionId('submit_feedback')
                    .setStyle('primary');
            });

        await modify.getUiController().openContextualBar(builder, { triggerId: context.getTriggerId() });
    }
}
```

## Pattern 2: Confirmation Modal with Multiple Actions

```typescript
class ConfirmationModalHandler implements IUIKitInteractionHandler {
    public blockId = 'confirmation_modal';
    public actionId = 'handle_confirmation';

    public async executeAction(context: UIKitActionContext): Promise<IUIKitResponse> {
        const data = context.getInteractionData();
        const action = data.actions?.[0]?.actionId;

        if (action === 'confirm') {
            console.log('User confirmed action');
            return this.handleConfirmation(context);
        } else if (action === 'cancel') {
            console.log('User cancelled action');
            return this.handleCancel(context);
        }

        return { success: false };
    }

    private async handleConfirmation(context: UIKitActionContext): Promise<IUIKitResponse> {
        // Here you would perform the actual operation
        return { success: true };
    }

    private async handleCancel(context: UIKitActionContext): Promise<IUIKitResponse> {
        return { success: true };
    }

    public async executePreAction(context: UIKitPreActionContext): Promise<void> {
        // Called before confirmation
    }
}

// Trigger confirmation modal from slash command
class DeleteSlashCommand implements ISlashCommand {
    public command = 'delete';
    public i18nDescription = 'Delete item (requires confirmation)';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        const builder = new ContextualBar();

        builder
            .addSection((section) => {
                section.setText(
                    new BlockBuilder()
                        .addMarkdownObject('*⚠️ Confirm Deletion*')
                        .getObject()
                );
            })
            .addSection((section) => {
                section.setText('Are you sure you want to delete this item? This cannot be undone.');
            })
            .addActions((actions) => {
                actions
                    .addButton((button) => {
                        button
                            .setText('Confirm')
                            .setActionId('confirm')
                            .setStyle('danger');
                    })
                    .addButton((button) => {
                        button
                            .setText('Cancel')
                            .setActionId('cancel')
                            .setStyle('default');
                    });
            });

        await modify.getUiController().openContextualBar(builder, { triggerId: context.getTriggerId() });
    }
}
```

## Pattern 3: Interactive List with Buttons

```typescript
class ListModalHandler implements IUIKitInteractionHandler {
    public blockId = 'list_modal';
    public actionId = 'select_item';

    public async executeAction(context: UIKitActionContext): Promise<IUIKitResponse> {
        const data = context.getInteractionData();
        const selectedId = data.actions?.[0]?.value;

        console.log(`Item selected: ${selectedId}`);

        return { success: true };
    }

    public async executePreAction(context: UIKitPreActionContext): Promise<void> {
        // Pre-action handling
    }
}

// Display list with action buttons
class ListSlashCommand implements ISlashCommand {
    public command = 'list';
    public i18nDescription = 'Show interactive list of items';
    public providesPreview = false;

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void> {
        const items = ['Item 1', 'Item 2', 'Item 3'];

        const builder = new ContextualBar();

        builder.addSection((section) => {
            section.setText(
                new BlockBuilder()
                    .addMarkdownObject('*Available Items*')
                    .getObject()
            );
        });

        for (const item of items) {
            builder
                .addSection((section) => {
                    section.setText(item);
                })
                .addActions((actions) => {
                    actions.addButton((button) => {
                        button
                            .setText('Select')
                            .setActionId('select_item')
                            .setValue(item);
                    });
                });
        }

        await modify.getUiController().openContextualBar(builder, { triggerId: context.getTriggerId() });
    }
}
```

## Registration in App Class

```typescript
protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
    // Register slash commands
    await configuration.slashCommands.provideSlashCommand(new FeedbackSlashCommand());
    await configuration.slashCommands.provideSlashCommand(new DeleteSlashCommand());
    await configuration.slashCommands.provideSlashCommand(new ListSlashCommand());

    // Register UI handlers
    const uikit = configuration.ui.getUiKitInteractionHandler();
    uikit.registerBlockHandler(new FeedbackModalHandler());
    uikit.registerBlockHandler(new ConfirmationModalHandler());
    uikit.registerBlockHandler(new ListModalHandler());
}
```

## Common Block Types

- **Section** - Display text with optional image/button
- **Input** - Text/select input field
- **Actions** - Container for buttons
- **Divider** - Visual separator
- **Context** - Small informational text
- **Image** - Display image

## Common Pitfalls

1. **Missing triggerId** - UIKit modals require `triggerId` from slash command context
2. **Unhandled interactions** - Not registering handlers causes modal actions to fail
3. **No response handling** - Returning wrong response type causes modal to stay open
4. **Missing blockId/actionId** - These must match between builder and handler
5. **Large modals** - Too many sections cause performance issues

## Validation Checklist

- [ ] Implements `IUIKitInteractionHandler` correctly
- [ ] `blockId` and `actionId` defined and match handlers
- [ ] Modals use valid `ContextualBar` builder
- [ ] `executeAction()` and `executePreAction()` implemented
- [ ] All buttons/inputs have unique `actionId`
- [ ] Handlers registered in `extendConfiguration()`
- [ ] Proper response returned from action handler
- [ ] Modal triggered with valid `triggerId`
- [ ] Form data correctly extracted from `context.getInteractionData()`
- [ ] User feedback on successful action (message or confirmation)
