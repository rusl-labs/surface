/**
 * Stable CSS class names for the HTML kit.
 *
 * Namespaced with `surface-` so host styles don't collide:
 * `.surface-field { … }`, `document.querySelector(".surface-field")`.
 */
export const surfaceClass = {
  /** Object body (root or nested). */
  object: "surface-object",
  /** Object properties stack (children of object). */
  objectBody: "surface-object-body",
  /** View/section layout: definition-list chrome. */
  layoutProps: "surface-layout-props",
  /** View/section layout: full-width stacked blocks. */
  layoutStack: "surface-layout-stack",
  /** Body flow: column. */
  directionVertical: "surface-direction-vertical",
  /** Body flow: row (wrap). */
  directionHorizontal: "surface-direction-horizontal",
  /** Display object body as definition list (`dt`/`dd` rows). */
  dl: "surface-dl",
  /** One display property row (dt + dd). */
  prop: "surface-prop",
  /** Stack layout field (label above value, full width). */
  stackItem: "surface-stack-item",
  /** Display property value cell (`dd`). */
  propValue: "surface-prop-value",
  /** View / subject title. */
  title: "surface-title",
  /** Description under a title, section, or field. */
  description: "surface-description",
  /** One bound field chrome wrapper (label + control). */
  field: "surface-field",
  /** Comma-separated scalar array display. */
  scalarList: "surface-scalar-list",
  /**
   * Property mount point under an object — layout only, no field chrome.
   * Avoids double boxes when the child already uses {@link field}.
   */
  slot: "surface-slot",
  /** Optional structured property shell (Add / Remove presence). */
  group: "surface-group",
  /** Header row inside a group (label + remove). */
  groupHeader: "surface-group-header",
  /** Field or chrome label text. */
  label: "surface-label",
  /** Interactive control (input, select, …). */
  control: "surface-control",
  /** Read-only value span in display mode. */
  value: "surface-value",
  /** Annotation section group. */
  section: "surface-section",
  /** Section heading. */
  sectionLabel: "surface-section-label",
  /** Section children stack. */
  sectionBody: "surface-section-body",
  /** Flat heading divider. */
  heading: "surface-heading",
  /** Template prose. */
  template: "surface-template",
  /** Structural block chrome. */
  block: "surface-block",
  /** Structural banner chrome. */
  banner: "surface-banner",
  /** Structural inline span chrome. */
  span: "surface-span",
  /** Label inside block/banner/span chrome. */
  chromeLabel: "surface-chrome-label",
  /** Interpolated text inside block/banner/span chrome. */
  chromeText: "surface-chrome-text",
  /** Array field chrome. */
  array: "surface-array",
  /** Array item list. */
  arrayList: "surface-array-list",
  /** One array item row. */
  arrayItem: "surface-array-item",
  /** Add/remove buttons. */
  button: "surface-button",
  /** Quiet icon-only add/remove (collections). */
  iconButton: "surface-icon-button",
  iconButtonAdd: "surface-icon-button--add",
  iconButtonRemove: "surface-icon-button--remove",
  iconButtonCaption: "surface-icon-button-caption",
  /** Submitting hidden input. */
  hidden: "surface-hidden",
  /** Boolean row. */
  checkbox: "surface-checkbox",
  /** oneOf/anyOf chrome. */
  union: "surface-union",
  /** Branch select. */
  select: "surface-select",
  /** allOf branch stack. */
  allOf: "surface-all-of",
  /** Control failed constraint check (blur / input). */
  invalid: "surface-invalid",
  /** Native validation message under a control. */
  error: "surface-error",
  /** Root input form wrapper. */
  form: "surface-form",
  /** Form-level issues (path `[]`) after failed Save. */
  formErrors: "surface-form-errors",
  /** Reset / Save row. */
  formActions: "surface-form-actions",
  /** Primary action (Save). */
  buttonPrimary: "surface-button-primary",
  /** Media widget chrome (image / video / audio). */
  media: "surface-media",
  /** Full-width hero / title media (card photo). */
  mediaBanner: "surface-media--banner",
  /** Media asset list (one or many). */
  mediaList: "surface-media-list",
  /** One media asset cell. */
  mediaItem: "surface-media-item",
  /** `<img>` in media widget. */
  mediaImage: "surface-media-image",
  /** `<video>` / `<audio>` in media widget. */
  mediaPlayer: "surface-media-player",
  /** Link widget host. */
  linkHost: "surface-link-host",
  /** Anchor from widget:link. */
  link: "surface-link",
  /** Multiple links. */
  linkList: "surface-link-list",
  linkItem: "surface-link-item",
  /** Email widget host. */
  emailHost: "surface-email-host",
  /** mailto: anchor from widget:email. */
  email: "surface-email",
  /** Tel widget host. */
  telHost: "surface-tel-host",
  /** tel: anchor from widget:tel. */
  tel: "surface-tel",
  telRow: "surface-tel-row",
  telInput: "surface-tel-input",
  telCountryHost: "surface-tel-country-host",
  telCountry: "surface-tel-country",
  telMenu: "surface-tel-menu",
  telOption: "surface-tel-option",
  telSearch: "surface-tel-search",
  /** URI widget host. */
  uriHost: "surface-uri-host",
  /** href anchor from format:uri / widget:uri. */
  uri: "surface-uri",
  /** Copy widget row (value + button). */
  copyHost: "surface-copy-host",
  /** Copied / display value in copy widget. */
  copyValue: "surface-copy-value",
  /** Copy-to-clipboard button. */
  copyButton: "surface-copy-button",
  /** Money `$id` control root. */
  money: "surface-money",
  /** Money amount + currency row. */
  moneyRow: "surface-money-row",
  /** Currency symbol chip. */
  moneySymbol: "surface-money-symbol",
  /** Major-unit amount input. */
  moneyAmount: "surface-money-amount",
  /** Currency typeahead (joined money field). */
  moneyCurrencyHost: "surface-money-currency-host",
  moneyCurrency: "surface-money-currency",
  moneyMenu: "surface-money-menu",
  moneyOption: "surface-money-option",
  moneySearch: "surface-money-search",
  /** Display-mode formatted money. */
  moneyDisplay: "surface-money-display",
  /** Table widget (array of objects, display-only). */
  tableWrap: "surface-table-wrap",
  table: "surface-table",
  th: "surface-th",
  td: "surface-td",
  sort: "surface-sort",
} as const;

export type SurfaceClass = (typeof surfaceClass)[keyof typeof surfaceClass];

/** Join class tokens (skips empty). */
export function sx(
  ...parts: ReadonlyArray<string | false | null | undefined>
): string {
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" ");
}
