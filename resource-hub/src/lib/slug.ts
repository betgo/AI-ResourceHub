const COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]+/g;
const EDGE_DASHES_REGEX = /^-+|-+$/g;
const MULTIPLE_DASHES_REGEX = /-+/g;

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(COMBINING_MARKS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(NON_ALPHANUMERIC_REGEX, "-")
    .replace(MULTIPLE_DASHES_REGEX, "-")
    .replace(EDGE_DASHES_REGEX, "");
}
