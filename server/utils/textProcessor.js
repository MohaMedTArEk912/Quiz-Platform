/**
 * Splits a large string into safe chunks to respect API token limits.
 * @param {string} text - The massive input text.
 * @param {number} maxChunkSize - Characters per chunk (Default 12000 ~= 3000 tokens).
 * @returns {string[]} Array of text chunks.
 */
export const chunkText = (text, maxChunkSize = 12000) => {
  if (!text) return [];

  const chunks = [];
  let currentChunk = "";

  // Split by paragraphs to avoid cutting words in half
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length < maxChunkSize) {
      currentChunk += paragraph + "\n";
    } else {
      chunks.push(currentChunk);
      currentChunk = paragraph + "\n";
    }
  }

  // Push the final remnant
  if (currentChunk) chunks.push(currentChunk);

  return chunks;
};
