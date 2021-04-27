import path from 'path';

/**
 * Replace path separators with a `/`
 * @param {string} file
 * @returns {string}
 */
export const toPosix = file => file.split(path.sep).join(path.posix.sep);
