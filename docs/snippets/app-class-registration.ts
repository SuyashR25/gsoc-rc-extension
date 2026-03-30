/**
 * SNIPPET: App Class Registration
 *
 * Proves: The App class is always the FIRST exported class in the file.
 * This is a hard requirement of the RC Apps Engine — if any other export
 * appears before it, the deploy fails with "App must contain a getName function".
 *
 * The AI enforces this rule as part of Step 4 (one-shot code writing).
 */

import {
    IAppAccessors,
    IConfigurationExtend,
    ILogger,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';

// ✅ App class is first — required by RC Apps Engine
export class MathSolverApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    // ✅ getName() is mandatory — identifies the app in the marketplace
    public getName(): string {
        return 'Math Expression Solver';
    }

    // ✅ All features registered here in one place
    protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        await configuration.slashCommands.provideSlashCommand(new MathSlashCommand());
    }
}

// Feature classes come AFTER the App class
class MathSlashCommand { /* ... see slash-command-executor.ts */ }
