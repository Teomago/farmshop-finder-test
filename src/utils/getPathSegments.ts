/**
 * Splits a URL pathname into segments, removing leading/trailing slashes.
 * @param {string} pathname - The URL pathname to split (e.g. "/foo/bar/")
 * @returns {string[]} Array of path segments without slashes. Empty array for root path.
 * @example
 * getPathSegments("/foo/bar/") // returns ["foo", "bar"]
 * getPathSegments("/") // returns []
 */
export const getPathSegments = (pathname: string) => {
  // Remove leading and trailing slashes, then split them
  const segments = pathname.replace(/^\/|\/$/g, '').split('/')

  // handle empty string case (root path ("/"))
  if (getPathSegments.length === 1 && segments[0] === '') {
    return []
  }
  return segments
}
