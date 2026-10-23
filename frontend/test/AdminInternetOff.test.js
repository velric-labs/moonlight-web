/*
 * MoonlightWeb — TNR suite. Copyright (C) 2026 Bruno Martin.
 * GPLv3 — see repository LICENSE.
 */
/*
 * Internet Access is switched off in this release (backend/src/common/
 * Edition.h). The admin page reads that from the status and says so instead of
 * offering a switch that can only fail, and shows neither address an earlier
 * install may still report: both lead to servers this release no longer uses.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../js/api/BackendClient.js', () => ({
    BackendClient: { getInternetStatus: vi.fn() },
}));
vi.mock('../js/ui/Toast.js', () => ({
    Toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('../js/i18n/i18n.js', async (importOriginal) => ({
    ...(await importOriginal()),
    t: (key) => 'text:' + key,
}));

import { AdminView } from '../js/ui/AdminView.js';
import { BackendClient } from '../js/api/BackendClient.js';

describe('AdminView — Internet Access switched off', () => {
    let view;

    beforeEach(() => {
        document.body.innerHTML = '<div></div>';
        view = new AdminView(document.body.firstElementChild, () => {});
        BackendClient.getInternetStatus.mockReset();
    });

    afterEach(() => view.destroy());

    it('reads the switch-off from the status, and tells LAN-only apart', async () => {
        BackendClient.getInternetStatus.mockResolvedValue({
            internet_access_off: true,
            lan_only: false,
        });
        await view._loadInternetState();
        expect(view._internetOff).toBe(true);
        expect(view._lanOnly).toBe(false);

        BackendClient.getInternetStatus.mockResolvedValue({
            internet_access_off: true,
            lan_only: true,
        });
        await view._loadInternetState();
        expect(view._lanOnly).toBe(true);
    });

    it('keeps the switch for an older server that does not say', async () => {
        BackendClient.getInternetStatus.mockResolvedValue({ internet_access_enabled: false });
        await view._loadInternetState();
        expect(view._internetOff).toBe(false);
    });

    it('says why instead of offering the switch, and shows no address', () => {
        view._internetOff = true;
        view._rendezvousUrl = 'https://stream.moonlightweb.top/abc';
        view._domain = 'abc.moonlightweb.top';
        view.render();

        const section = view.container.querySelector('#admin-section-internet');
        expect(section.querySelector('#chk-internet-enable')).toBeNull();
        expect(section.querySelector('#internet-off-note').textContent).toContain(
            'text:admin.internetOff',
        );
        expect(section.innerHTML).not.toContain('moonlightweb.top');
    });

    it('names LAN-only as the reason on a LAN-only instance', () => {
        view._internetOff = true;
        view._lanOnly = true;
        view.render();
        expect(view.container.querySelector('#internet-off-note').textContent).toContain(
            'text:admin.internetOffLanOnly',
        );
    });
});
