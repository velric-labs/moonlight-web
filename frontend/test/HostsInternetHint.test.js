/*
 * MoonlightWeb — TNR suite. Copyright (C) 2026 Bruno Martin.
 * GPLv3 — see repository LICENSE.
 */
/*
 * The hosts page's hint for a machine whose Internet access is off points at
 * the switch on the admin page. While Internet Access is switched off in this
 * release (backend/src/common/Edition.h) that switch is gone, so the hint is
 * not shown at all.
 */
import { describe, it, expect } from 'vitest';
import { MoonlightApp } from '../js/app.js';

describe('Hosts page — the Internet access hint', () => {
    it('points at the admin switch while Internet access is merely off', () => {
        const banner = MoonlightApp._buildAddressHintBanner(
            { internetActive: false, internetOff: false },
            '',
        );
        expect(banner).not.toBeNull();
    });

    it('says nothing while Internet Access is switched off', () => {
        const banner = MoonlightApp._buildAddressHintBanner(
            { internetActive: false, internetOff: true },
            '',
        );
        expect(banner).toBeNull();
    });
});
