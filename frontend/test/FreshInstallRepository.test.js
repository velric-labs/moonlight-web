/*
 * MoonlightWeb — TNR suite. Copyright (C) 2026 Bruno Martin.
 * GPLv3 — see repository LICENSE.
 */
/*
 * Since 0.4.1 a fresh Linux install registers no package repository: its host,
 * packages.moonlightweb.top, is the project's old domain. Two fresh-install
 * paths could register one — the .deb/.rpm postinst and website/install.sh —
 * and both are shell, so their switches are pinned here as text, the way
 * InternetConsentText.test.js pins the installers' agreement. Existing installs
 * are left alone by both: the postinst only ever added a repository when none
 * was configured, and install.sh reads nothing under /etc unless MW_PACKAGES
 * names a repository.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const read = (path) => readFileSync(join(REPO, path), 'utf8').replace(/\r\n/g, '\n');

const MAKE_PACKAGES = read('backend/packaging/linux/make-packages.sh');
const INSTALL_SH = read('website/install.sh');

/** A shell function's body, from its opening line to its closing brace. */
function shellFunction(src, name) {
    const start = src.indexOf(`\n${name}() {`);
    if (start < 0) throw new Error(`missing ${name}() in website/install.sh`);
    return src.slice(start, src.indexOf('\n}\n', start));
}

describe('fresh Linux installs register no package repository', () => {
    it('the package postinst carries no repository URL and needs one to add it', () => {
        expect(MAKE_PACKAGES).toMatch(/^REPO_URL=$/m);
        expect(MAKE_PACKAGES).toMatch(/^if \[ -n "\$REPO_KEYS" \] && \[ -n "\$REPO_URL" \]/m);
    });

    it('install.sh gives the official build no default repository', () => {
        const assignments = INSTALL_SH.split('\n').filter((line) => /^\s*PACKAGES=/.test(line));
        expect(assignments.length).toBeGreaterThan(0);
        for (const line of assignments) expect(line).not.toMatch(/moonlightweb\.top/);
    });

    it.each(['install_apt', 'install_rpm'])(
        '%s installs the release package before touching anything when there is none',
        (name) => {
            const body = shellFunction(INSTALL_SH, name);
            const branch = body.indexOf('if [ -z "$PACKAGES" ]; then');
            expect(branch).toBeGreaterThan(-1);
            const end = body.indexOf('\n    fi', branch);
            expect(body.slice(branch, end)).toMatch(/install_release_package/);
            // Nothing under /etc is cleaned and no repository file is fetched first.
            for (const later of ['clean_empty', 'fetch_repo_file']) {
                expect(body.indexOf(later)).toBeGreaterThan(end);
            }
        },
    );
});
