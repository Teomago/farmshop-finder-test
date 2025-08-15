/**
 * Checks if a document is expanded (i.e., a non-null object).
 *
 * @template T - The expected type of the expanded document.
 * @param {unknown} doc - The document to check.
 * @returns {doc is T} - Returns `true` if the document is a non-null object; otherwise `false`.
 *
 * @example
 * const doc: any = { id: 1, title: "Example" };
 * if (isExpanded<{ id: number; title: string }>(doc)) {
 *   console.log("Expanded document:", doc.id); // Safe to access `id`
 * }
 */
export const isExpanded = <T>(doc: unknown): doc is T => {
  return typeof doc === 'object' && doc !== null
}
