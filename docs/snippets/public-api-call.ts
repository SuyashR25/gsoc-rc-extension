// @ts-nocheck — showcase snippet only; @rocket.chat/apps-engine not installed in this docs folder
/**
 * SNIPPET: Public API Call Pattern
 *
 * Proves: The AI prefers free, key-less public APIs over paid alternatives.
 * This is enforced in Step 4 of the workflow — if a free API exists for the
 * requested feature, it is used without asking the user for an API key.
 *
 * Examples of free APIs used by this generator:
 *   - Math expressions → Math.js API (no key)
 *   - Stock prices     → Yahoo Finance (no key)
 *   - Crypto prices    → Coinbase public API (no key)
 *   - Weather          → wttr.in (no key)
 *   - Tech news        → Hacker News Firebase API (no key)
 */

import { IHttp } from '@rocket.chat/apps-engine/definition/accessors';

// Pattern: always wrap in try/catch, always check statusCode
async function evaluateExpression(http: IHttp, expression: string): Promise<string> {
    // ✅ Math.js expression endpoint — stable, free, no API key
    const encodedExpr = encodeURIComponent(expression);
    const url = `https://api.mathjs.org/v4/?expr=${encodedExpr}`;

    try {
        const response = await http.get(url);

        // ✅ Check status before reading data
        if (response.statusCode !== 200 || !response.data) {
            throw new Error(`Unexpected status: ${response.statusCode}`);
        }

        const result = (response.content || response.data || '').toString().trim();
        if (!result) {
            throw new Error('Empty result received from API');
        }

        return `${expression} = ${result}`;
    } catch (err) {
        throw new Error(`Failed to evaluate expression (${expression}): ${err.message}`);
    }
}

// Alternative free APIs the AI selects from depending on the use case:

// Math solver (no key):
// GET https://api.mathjs.org/v4/?expr=2*(7-3)

// Crypto (Coinbase public endpoint — no key):
// GET https://api.coinbase.com/v2/prices/BTC-USD/spot

// Weather (wttr.in — no key, JSON format):
// GET https://wttr.in/London?format=j1

// Hacker News top stories:
// GET https://hacker-news.firebaseio.com/v0/topstories.json
