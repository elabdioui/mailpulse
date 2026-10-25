// Every Gmail DOM assumption lives here. Gmail ships obfuscated class names
// that change from time to time: when tracking stops working, this is the
// file to update.

/** The blue "Envoyer" button of a compose window (new message or reply). */
export const SEND_BUTTON =
  'div[role="button"].aoO, div[role="button"][data-tooltip*="Ctrl-Enter"], div[role="button"][data-tooltip*="Ctrl+Entrée"], div[role="button"][data-tooltip*="⌘Enter"]';

/** The editable message body. */
export const BODY = 'div[g_editable="true"][contenteditable="true"]';

/** Subject field (also present, hidden, on inline replies). */
export const SUBJECT = 'input[name="subjectbox"]';

/** Subject of the open conversation, used as a fallback for replies. */
export const THREAD_SUBJECT = "h2.hP";

/** Recipient chips and the legacy hidden recipient inputs. */
export const RECIPIENT_CHIPS = "[email], [data-hovercard-id*='@']";
export const RECIPIENT_INPUTS = 'input[name="to"], input[name="cc"], input[name="bcc"]';

/** "De" field when the account has several aliases. */
export const FROM_INPUT = 'input[name="from"]';

/** Google account button in the top bar ("Compte Google : Nom (adresse)"). */
export const ACCOUNT_BUTTON = 'a[aria-label*="@"][href*="accounts.google.com"]';
