/**
 * Tier limits mirrored from the live service (anonymous tier):
 * `clip.php` returns maxFilesCount = 2 and maxFileSize = 5 (MB).
 * Registered users get 5 x 10 MB, Pro is unlimited.
 */
export const MAX_FILES = 2;
export const MAX_SIZE_MB = 5;
export const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
