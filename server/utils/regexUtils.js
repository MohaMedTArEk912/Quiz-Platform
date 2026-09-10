/**
 * Utility functions for regular expression handling and ReDoS prevention
 */

/**
 * Escapes regex special characters to prevent Regular Expression Denial of Service (ReDoS)
 * and trims query to a safe maximum length.
 * @param {string} str Input string
 * @param {number} maxLength Maximum allowed length
 * @returns {string} Escaped string safe for RegExp
 */
export const escapeRegex = (str, maxLength = 60) => {
  if (!str || typeof str !== 'string') return '';
  const trimmed = str.trim().slice(0, maxLength);
  return trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default escapeRegex;
