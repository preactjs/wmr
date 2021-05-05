import path from 'path';

/**
 * Wrapper for improved intellisense completion
 * @type {typeof import("wmr").defineConfig}
 */
export const defineConfig = config => config;

/**
 * Normalize a file path across OSes.
 * @param {string} file
 * @returns {string}
 */
export const normalizePath = file => file.split(path.win32.sep).join(path.posix.sep);
