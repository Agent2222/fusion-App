/**
 * After `ensureMyLinkedArtistProfile`, push join-flow name from session draft into
 * the linked artist locales once, when canister locales are still empty; then clear the draft.
 */
import { getMyArtistRecord, updateMyArtistLocalesJson } from './database.js';
import { localeBlock } from './memberProfileForm.js';
import { getProfileSetupDraft, clearProfileSetupDraft } from './profileSetupDraft.js';

/**
 * @param {unknown} localesState
 * @returns {boolean}
 */
function localesNameDataEmpty(localesState) {
  const L =
    localesState && typeof localesState === 'object' && !Array.isArray(localesState)
      ? /** @type {Record<string, unknown>} */ (localesState)
      : {};
  for (const code of ['en', 'ja']) {
    const block = localeBlock(L, code);
    const fn = String(block.firstName ?? '').trim();
    const ln = String(block.lastName ?? '').trim();
    const nm = String(block.name ?? '').trim();
    if (fn || ln || nm) return false;
  }
  return true;
}

/**
 * Idempotent: no-op if draft has no full name, no record, or locales already have name data.
 * @returns {Promise<void>}
 */
export async function maybeSeedLocalesFromProfileSetupDraftIfEmpty() {
  const draft = getProfileSetupDraft();
  const fullName = String(draft.fullName ?? '').trim();
  if (!fullName) return;

  const rec = await getMyArtistRecord();
  if (!rec || typeof rec !== 'object') return;

  const ljRaw = rec.locales_json ?? rec.localesJson;
  const json = typeof ljRaw === 'string' ? ljRaw : '';
  /** @type {Record<string, unknown>} */
  let localesState;
  try {
    localesState = json ? JSON.parse(json) : { en: {}, ja: {} };
  } catch {
    localesState = { en: {}, ja: {} };
  }
  if (!localesState || typeof localesState !== 'object')
    localesState = { en: {}, ja: {} };

  if (!localesNameDataEmpty(localesState)) return;

  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const draftFirst = nameParts[0] || '';
  const draftLast = nameParts.slice(1).join(' ');
  for (const code of ['en', 'ja']) {
    const block = localeBlock(localesState, code);
    const firstName = String(block.firstName ?? '').trim();
    const lastName = String(block.lastName ?? '').trim();
    if (!firstName && draftFirst) block.firstName = draftFirst;
    if (!lastName && draftLast) block.lastName = draftLast;
    const displayName = String(block.name ?? '').trim();
    if (!displayName && (block.firstName || block.lastName)) {
      block.name =
        `${String(block.firstName || '').trim()} ${String(block.lastName || '').trim()}`.trim();
    }
    localesState[code] = block;
  }

  await updateMyArtistLocalesJson(JSON.stringify(localesState));
  clearProfileSetupDraft();
}
