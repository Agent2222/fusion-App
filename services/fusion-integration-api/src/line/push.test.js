import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    LINE_PUSH_MAX_CHARS,
    assertLinePushText,
    isLinePushRoom,
    normalizeLinePushRoom,
    resolveBoundGroupId,
} from './push.js';

describe('resolveBoundGroupId', () => {
    const binding = { programId: 'p1', groupGeneralId: 'Cgen', groupAnnounceId: 'Cann' };

    it('reads general and announce rooms', () => {
        assert.equal(resolveBoundGroupId(binding, 'general'), 'Cgen');
        assert.equal(resolveBoundGroupId(binding, 'announce'), 'Cann');
        assert.equal(resolveBoundGroupId(binding, 'announcements'), 'Cann');
    });

    it('rejects an unbound room', () => {
        assert.equal(resolveBoundGroupId({ programId: 'p1', groupGeneralId: '', groupAnnounceId: '' }, 'general'), '');
        assert.equal(resolveBoundGroupId(binding, 'unknown'), '');
    });
});

describe('assertLinePushText', () => {
    it('requires non-empty trimmed text', () => {
        assert.throws(() => assertLinePushText(''), /text required/);
        assert.throws(() => assertLinePushText('   '), /text required/);
        assert.equal(assertLinePushText('  hello  '), 'hello');
    });

    it('rejects over-long text', () => {
        assert.throws(() => assertLinePushText('x'.repeat(LINE_PUSH_MAX_CHARS + 1)), /exceeds/);
    });
});

describe('normalizeLinePushRoom', () => {
    it('normalizes room keys', () => {
        assert.equal(normalizeLinePushRoom('general'), 'general');
        assert.equal(normalizeLinePushRoom('announce'), 'announce');
        assert.equal(isLinePushRoom('announcements'), true);
        assert.equal(normalizeLinePushRoom('other'), '');
    });
});
