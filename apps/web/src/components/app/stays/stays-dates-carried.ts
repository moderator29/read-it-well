/** The current search's other parameters, for the row's hidden fields. */
export function carriedParams(href: string, type: string | undefined): [string, string][] {
  const query = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
  const pairs = [...new URLSearchParams(query).entries()].filter(
    ([name]) => name !== "in" && name !== "out" && name !== "guests",
  );
  if (type) pairs.push(["type", type]);
  return pairs;
}
