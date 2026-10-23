/*
 * MoonlightWeb — TNR suite. Copyright (C) 2026 Bruno Martin.
 * GPLv3 — see repository LICENSE.
 */
/*
 * Since 0.4.1 Internet Access is switched off for everyone: the only servers it
 * has ever had run under moonlightweb.top, which the project no longer
 * controls. The server refuses it whatever it is sent (backend/src/common/
 * Edition.h, under Qt Test); the three installers stop offering it, and they
 * are Pascal, shell and a property list, so their switches are pinned here as
 * text, the way FreshInstallRepository.test.js pins the Linux packages'.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const read = (path) => readFileSync(join(REPO, path), 'utf8').replace(/\r\n/g, '\n');

const EDITION = read('backend/src/common/Edition.cpp');
const ISS = read('backend/installer/moonlightweb.iss');
const INSTALL_SH = read('website/install.sh');
const MAC_SECTIONS = read('backend/installer/macos/plugins/InstallerSections.plist');

/** From `start` up to the first line that is exactly `end`, after it. */
function block(src, start, end) {
    const from = src.indexOf(start);
    if (from < 0) throw new Error(`missing ${start}`);
    return src.slice(from, src.indexOf(`\n${end}\n`, from));
}

describe('Internet Access is switched off in this release', () => {
    it('the server starts with the switch-off on', () => {
        expect(EDITION).toMatch(/^bool g_internetAccessOff = true;$/m);
    });

    it('the Windows installer skips its Internet page, fresh install or update', () => {
        expect(ISS).toMatch(/^#define InternetAccessOff 1$/m);
        const skip = block(ISS, 'function ShouldSkipPage(PageID: Integer): Boolean;', 'end;');
        const guarded = skip.slice(skip.indexOf('#if InternetAccessOff'), skip.indexOf('#endif'));
        expect(guarded).toMatch(/PageID = InternetPage\.ID/);
        expect(guarded).toMatch(/Result := True;/);
        // Before the update-only early exit, so a fresh install skips it too.
        expect(skip.indexOf('#if InternetAccessOff')).toBeLessThan(
            skip.indexOf('if not UpdateMode then Exit;'),
        );
    });

    it('the Windows installer waits for no Internet link at the end', () => {
        const resolve = block(ISS, 'procedure ResolveAdminUrl();', 'end;');
        const head = resolve.slice(0, resolve.indexOf('if WizardSilent then Exit;'));
        expect(head).toMatch(/#if InternetAccessOff\n[\s\S]*?\n {2}Exit;\n#endif/);
    });

    it('install.sh asks nothing and advertises no --enable-internet', () => {
        expect(INSTALL_SH).toMatch(/^INTERNET_ACCESS_OFF=1$/m);
        const ask = block(INSTALL_SH, 'ask_internet() {', '}');
        expect(ask.split('\n')[1].trim()).toBe('[ "$INTERNET_ACCESS_OFF" = 1 ] && return 0');
        const hint = block(INSTALL_SH, 'cli_hint() {', '}');
        const line = hint.split('\n').find((l) => l.includes('--enable-internet'));
        expect(line).toMatch(/^\s*\[ "\$INTERNET_ACCESS_OFF" = 1 \] \|\| printf/);
    });

    it('the macOS installer leaves its Internet pane out', () => {
        const order = block(MAC_SECTIONS, '<key>SectionOrder</key>', '</dict>');
        expect(order).not.toMatch(/<string>MoonlightWebInstaller\.bundle<\/string>/);
        expect(order).toMatch(/<string>PackageSelection<\/string>\s*<string>Install<\/string>/);
    });
});
