/**
 * LENDAS Shared Logger
 * Centralized browser logging with environment-aware verbosity.
 */

'use strict';

const Logger = (() => {
    const LEVELS = {
        silent: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4
    };

    function normalizeLevel(level) {
        if (typeof level !== 'string') {
            return null;
        }

        const normalized = level.trim().toLowerCase();
        return Object.prototype.hasOwnProperty.call(LEVELS, normalized) ? normalized : null;
    }

    function resolveLevel() {
        const explicitLevel =
            normalizeLevel(document.documentElement?.dataset?.logLevel) ||
            normalizeLevel(window.__LENDAS_LOG_LEVEL__);

        if (explicitLevel) {
            return explicitLevel;
        }

        try {
            const storedLevel = normalizeLevel(window.localStorage?.getItem('lendas:log-level'));
            if (storedLevel) {
                return storedLevel;
            }
        } catch (_error) {
            // Ignore storage access errors and fall back to hostname heuristics.
        }

        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'debug';
        }

        return 'warn';
    }

    const currentLevel = resolveLevel();

    function shouldLog(level) {
        return LEVELS[level] <= LEVELS[currentLevel];
    }

    function emit(level, method, args) {
        const browserConsole = globalThis['console'];

        if (!shouldLog(level) || !browserConsole) {
            return;
        }

        const consoleMethod =
            typeof browserConsole[method] === 'function'
                ? browserConsole[method].bind(browserConsole)
                : browserConsole.log.bind(browserConsole);
        consoleMethod(...args);
    }

    function buildScopedLogger(scope) {
        const prefix = scope ? [`[${scope}]`] : [];

        const withScope = (args) => {
            if (prefix.length === 0) {
                return args;
            }
            return [...prefix, ...args];
        };

        return {
            error(...args) {
                emit('error', 'error', withScope(args));
            },
            warn(...args) {
                emit('warn', 'warn', withScope(args));
            },
            info(...args) {
                emit('info', 'info', withScope(args));
            },
            debug(...args) {
                emit('debug', 'debug', withScope(args));
            },
            log(...args) {
                emit('debug', 'log', withScope(args));
            }
        };
    }

    return {
        level: currentLevel,
        error(...args) {
            emit('error', 'error', args);
        },
        warn(...args) {
            emit('warn', 'warn', args);
        },
        info(...args) {
            emit('info', 'info', args);
        },
        debug(...args) {
            emit('debug', 'debug', args);
        },
        log(...args) {
            emit('debug', 'log', args);
        },
        scope(scope) {
            return buildScopedLogger(scope);
        }
    };
})();

window.Logger = Logger;

