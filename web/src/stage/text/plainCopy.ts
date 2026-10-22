/**
 * Visible copy rules: no em or en dashes and no decorative separator dots. Server and model
 * text is cleaned at display time. A dash between two words (" - ", spaced) becomes a comma;
 * an unspaced one (a range such as 3-4) becomes a plain hyphen. Separator dots become commas.
 */
export function plainCopy(text: string): string {
  return text
    .replace(/\s+[–—]\s+|\s*[–—]\s+|\s+[–—]\s*/g, ", ")
    .replace(/[–—]/g, "-")
    .replace(/\s*[·•∙]\s*/g, ", ");
}
