/**
 * Resolves a language name (as typed into a "Languages" section entry, see
 * components/editor/EntryForm.tsx's showTags/titleLabel handling for that
 * kind) to a circular flag SVG under public/flags/language/ — copied
 * verbatim from the `circle-flags` package's flags/language/ set. Those
 * files are keyed by ISO 639-1 (a few 639-3) codes; react-pdf's SVG parser
 * drops the <mask> each one uses for its circular clip (see SKIP_ELEMENTS in
 * @react-pdf/svg), so the circle here comes from the template's own
 * borderRadius on the <Image>, not from the SVG file itself — the artwork
 * underneath is a plain filled square, which clips cleanly either way.
 */
const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: "en",
  "english (uk)": "en-gb",
  "british english": "en-gb",
  "english (us)": "en-us",
  "american english": "en-us",
  spanish: "es",
  castilian: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  "portuguese (brazil)": "pt-br",
  "brazilian portuguese": "pt-br",
  russian: "ru",
  chinese: "zh",
  mandarin: "zh",
  "mandarin chinese": "zh",
  cantonese: "zh",
  japanese: "ja",
  korean: "ko",
  arabic: "ar",
  hindi: "hi",
  bengali: "bn",
  bangla: "bn",
  urdu: "ur",
  turkish: "tr",
  vietnamese: "vi",
  thai: "th",
  indonesian: "id",
  malay: "ms",
  dutch: "nl",
  flemish: "nl",
  swedish: "sv",
  norwegian: "no",
  danish: "da",
  finnish: "fi",
  polish: "pl",
  czech: "cs",
  slovak: "sk",
  slovenian: "sl",
  greek: "el",
  hebrew: "he",
  ukrainian: "uk",
  romanian: "ro",
  hungarian: "hu",
  bulgarian: "bg",
  croatian: "hr",
  serbian: "sr",
  bosnian: "bs",
  persian: "fa",
  farsi: "fa",
  dari: "fa",
  pashto: "ps",
  swahili: "sw",
  filipino: "fil",
  tagalog: "tl",
  punjabi: "pa",
  tamil: "ta",
  telugu: "te",
  marathi: "mr",
  gujarati: "gu",
  kannada: "kn",
  malayalam: "ml",
  nepali: "ne",
  sinhala: "si",
  sinhalese: "si",
  burmese: "my",
  myanmar: "my",
  khmer: "km",
  lao: "lo",
  mongolian: "mn",
  amharic: "am",
  somali: "so",
  zulu: "zu",
  xhosa: "xh",
  afrikaans: "af",
  icelandic: "is",
  estonian: "et",
  latvian: "lv",
  lithuanian: "lt",
  albanian: "sq",
  armenian: "hy",
  georgian: "ka",
  azerbaijani: "az",
  kazakh: "kk",
  uzbek: "uz",
  catalan: "ca",
  basque: "eu",
  galician: "gl",
  welsh: "cy",
  irish: "ga",
  "irish gaelic": "ga",
  scots: "gd",
  "scottish gaelic": "gd",
  maltese: "mt",
  yiddish: "yi",
  haitian: "ht",
  "haitian creole": "ht",
  esperanto: "eo",
  latin: "la",
  luxembourgish: "lb",
  samoan: "sm",
  maori: "mi",
  hawaiian: "haw",
  hausa: "ha",
  yoruba: "yo",
  igbo: "ig",
};

/** circle-flags' catch-all flag for anything it doesn't have a specific
 *  design for — used here for a language name we can't map. */
const FALLBACK_FLAG_CODE = "xx";

function flagSrcForCode(code: string): string {
  return `/flags/language/${code}.svg`;
}

/** Resolves a language entry's display name to a circular flag image path.
 *  Always returns a usable src — falls back to a generic flag rather than
 *  omitting the icon when a name isn't in the table. */
export function resolveLanguageFlagSrc(languageName: string): string {
  const key = languageName.trim().toLowerCase();
  const code = LANGUAGE_NAME_TO_CODE[key];
  return flagSrcForCode(code ?? FALLBACK_FLAG_CODE);
}
