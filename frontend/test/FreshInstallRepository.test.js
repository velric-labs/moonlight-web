/*
 * MoonlightWeb — TNR suite. Copyright (C) 2026 Bruno Martin.
 * GPLv3 — see repository LICENSE.
 */
/*
 * Since 0.4.1 a fresh Linux install registers no package repository: its host,
 * packages.moonlightweb.top, is the project's old domain. Two fresh-install
 * paths could register one — the .deb/.rpm postinst and website/install.sh —
 * and both are shell, so their switches are pinned here as text, the way
 * InternetConsentText.test.js pins the installers' agreement. install.sh reads
 * nothing under /etc unless MW_PACKAGES names a repository. The postinst goes
 * further on every install and upgrade: it takes away a repository on the old
 * host with the key file beside it, leaves one on any other host alone, and the
 * package no longer carries the old key.
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

/** The postinst as make-packages.sh writes it: its heredoc, up to prerm's. */
const POSTINST = MAKE_PACKAGES.slice(
    MAKE_PACKAGES.indexOf(`cat > "$ROOT/postinst.sh" <<'EOF'`),
    MAKE_PACKAGES.indexOf(`cat > "$ROOT/prerm.sh" <<'EOF'`),
);

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

describe('installing 0.4.1 takes away a repository on packages.moonlightweb.top', () => {
    const start = POSTINST.indexOf('\nOLD_REPO_HOST=packages.moonlightweb.top\n');
    const cleanup = POSTINST.slice(start, POSTINST.indexOf('\nREPO_KEYS=', start));

    it('runs on every install and upgrade, before the headless upgrade stops early', () => {
        expect(start).toBeGreaterThan(-1);
        expect(start).toBeLessThan(POSTINST.indexOf('systemctl restart moonlightweb.service'));
        // Not behind the switch that adds a repository, which is off.
        expect(start).toBeLessThan(POSTINST.indexOf('\nREPO_URL='));
    });

    it('removes a repository file only when it names the old host', () => {
        expect(cleanup.split('\n').filter((line) => /\brm -f\b/.test(line))).toHaveLength(3);
        expect(cleanup).toMatch(
            /if grep -qsiF "\$OLD_REPO_HOST" \/etc\/apt\/sources\.list\.d\/moonlightweb\.sources; then\n\s+rm -f \/etc\/apt\/sources\.list\.d\/moonlightweb\.sources \/etc\/apt\/keyrings\/moonlightweb\.gpg\n/,
        );
        expect(cleanup).toMatch(
            /for f in \/etc\/yum\.repos\.d\/moonlightweb\.repo \/etc\/zypp\/repos\.d\/moonlightweb\.repo; do\n\s+if grep -qsiF "\$OLD_REPO_HOST" "\$f"; then\n\s+rm -f "\$f"\n/,
        );
        // The RPM key file goes only with an old .repo; the imported copy is named.
        expect(cleanup).toMatch(
            /if \[ -n "\$old_rpm_repo" \]; then\n\s+rm -f \/etc\/pki\/rpm-gpg\/RPM-GPG-KEY-moonlightweb\n/,
        );
        expect(cleanup).toContain('rpm -e gpg-pubkey-8d42deef-6a6c41e6');
    });

    it('the DEV edition, which never had the repository, skips it', () => {
        expect(MAKE_PACKAGES).toContain(
            String.raw`-e "s|^\( *\)OLD_REPO_HOST=.*|\1OLD_REPO_HOST=|"`,
        );
    });

    it('the package no longer carries the old repository key', () => {
        expect(MAKE_PACKAGES).not.toMatch(/install\b[^\n]*moonlightweb-repo\.(gpg|asc)/);
        expect(MAKE_PACKAGES).not.toMatch(/share\/keys\/moonlightweb\.(gpg|asc)/);
    });
});
