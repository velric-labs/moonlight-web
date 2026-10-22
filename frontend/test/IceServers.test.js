/*
 * MoonlightWeb — TNR suite. Copyright (C) 2026 Bruno Martin.
 * GPLv3 — see repository LICENSE.
 */
/*
 * The browser's fallback STUN list, which the UDP probe asks at every launch and
 * guest join. It may lead with an operator's own `stream.<domain>`, and must
 * never name a server under the project's old domain — the same rule as the
 * backend's common/ProjectDomain.h.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultIceServers, isOldProjectDomain, ourStunHost } from '../js/api/IceServers.js';

/** The public servers, in the order the list asks them. */
const PUBLIC = [
    'stun:stun.l.google.com:19302',
    'stun:stun.cloudflare.com:3478',
    'stun:stun.nextcloud.com:443',
    'stun:relay.metered.ca:80',
];

/** Pages that must get the public servers alone. */
const NOT_AN_OPERATOR = [
    'stream.moonlightweb.top',
    'stream.moonlightweb.top.',
    'stream.dev.moonlightweb.top',
    '192.168.1.20',
    'localhost',
    '',
];

/** Pretend the page was served from `hostname`. */
function servedFrom(hostname) {
    vi.stubGlobal('location', { hostname });
}

const urls = () => defaultIceServers().map((s) => s.urls);

describe('IceServers', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('recognises the old project domain exactly as the backend does', () => {
        expect(isOldProjectDomain('moonlightweb.top')).toBe(true);
        expect(isOldProjectDomain('stream.moonlightweb.top')).toBe(true);
        expect(isOldProjectDomain('stream.dev.moonlightweb.top')).toBe(true);
        expect(isOldProjectDomain(' Stream.MoonlightWeb.TOP ')).toBe(true);
        // The trailing dot of a fully qualified name changes nothing.
        expect(isOldProjectDomain('moonlightweb.top.')).toBe(true);
        expect(isOldProjectDomain('stream.moonlightweb.top.')).toBe(true);
        // A name that merely ends like it belongs to somebody else.
        expect(isOldProjectDomain('stream.notmoonlightweb.top')).toBe(false);
        expect(isOldProjectDomain('stream.example.org')).toBe(false);
        expect(isOldProjectDomain('')).toBe(false);
        expect(isOldProjectDomain(undefined)).toBe(false);
    });

    it("names an operator's own introduction server and nothing else", () => {
        servedFrom('stream.example.org');
        expect(ourStunHost()).toBe('stream.example.org');
        for (const host of NOT_AN_OPERATOR) {
            servedFrom(host);
            expect(ourStunHost()).toBe('');
        }
    });

    it("asks an operator's server first, then the public ones", () => {
        servedFrom('stream.example.org');
        expect(urls()).toEqual(['stun:stream.example.org:3478', ...PUBLIC]);
    });

    it('never lists a server under moonlightweb.top, wherever the page came from', () => {
        for (const host of NOT_AN_OPERATOR) {
            servedFrom(host);
            expect(urls()).toEqual(PUBLIC);
        }
    });

    it('falls back to the public servers where there is no location at all', () => {
        vi.stubGlobal('location', undefined);
        expect(ourStunHost()).toBe('');
        expect(urls()).toEqual(PUBLIC);
    });
});
