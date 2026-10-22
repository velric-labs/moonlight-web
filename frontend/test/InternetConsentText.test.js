/*
 * MoonlightWeb — TNR suite. Copyright (C) 2026 Bruno Martin.
 * GPLv3 — see repository LICENSE.
 */
/*
 * The Internet-access agreement is shown on five surfaces built from five
 * different toolchains — an Inno Setup script, an Objective-C installer pane, a
 * POSIX shell one-liner, the server's own command line and this catalogue — so
 * it cannot live in one module the way PrivacyNotice.js does for the statistics
 * notice. It is copied by hand instead, and it has already drifted: for months
 * the wizard promised a DNS record the installer no longer created, the admin
 * toggle described the introduction server in the future tense after the line
 * had shipped, and the command line went on saying so for longer still.
 *
 * What is recorded as consent is the text that was on screen, so a surface that
 * drifts records an agreement to something else. These tests pin the three
 * relations that make the copies one text: the installer and the wizard say the
 * same words; the wizard and the admin toggle — which open differently, one
 * describing a capability and the other the act of enabling it — end on the same
 * sentences, the ones that name who learns what; and the command line records
 * the wizard's English words.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const LANGS = ['en', 'fr', 'zh'];

const ISS = readFileSync(join(REPO, 'backend', 'installer', 'moonlightweb.iss'), 'utf8');
const MAIN = readFileSync(join(REPO, 'backend', 'src', 'main.cpp'), 'utf8');

function locale(lang) {
    return JSON.parse(readFileSync(join(REPO, 'frontend', 'locales', `${lang}.json`), 'utf8'));
}

// One CustomMessages line, minus its "<lang>.<key>=" prefix. Inno writes them
// one per line, so the value ends at the newline.
function customMessage(lang, key) {
    const line = ISS.split(/\r?\n/).find((l) => l.startsWith(`${lang}.${key}=`));
    if (!line) throw new Error(`missing CustomMessage ${lang}.${key}`);
    return line.slice(`${lang}.${key}=`.length);
}

// kCliInternetConsent, the agreement `--enable-internet` prints and records:
// adjacent C string literals, joined the way the compiler joins them. The text
// holds no escape sequence, so there is nothing to undo.
function cliConsent() {
    const m = MAIN.match(/kCliInternetConsent =([\s\S]*?");/);
    if (!m) throw new Error('missing kCliInternetConsent in backend/src/main.cpp');
    return [...m[1].matchAll(/"([^"]*)"/g)].map((s) => s[1]).join('');
}

// Longest suffix two strings have in common, trimmed to start on a word.
function commonSuffix(a, b) {
    let n = 0;
    while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n += 1;
    return a.slice(a.length - n);
}

describe('Internet consent text', () => {
    it.each(LANGS)('installer and setup wizard say the same thing (%s)', (lang) => {
        // %n is Inno's line break; the catalogue runs the same sentences on.
        const fromIss = customMessage(lang, 'InternetPageBody').replace(/%n%n|%n/g, ' ');
        expect(locale(lang).setup.internetBody).toBe(fromIss);
    });

    it.each(LANGS)('setup and admin end on the same disclosure (%s)', (lang) => {
        const l = locale(lang);
        const shared = commonSuffix(l.setup.internetBody, l.admin.internetInfo1);
        // The tail has to be the disclosure itself, not just a shared full stop.
        expect(shared).toContain('STUN');
        expect(shared).toContain('80/443');
        expect(shared.length).toBeGreaterThan(120);
    });

    it('the command line records what the wizard says (en)', () => {
        // `--enable-internet --yes` prints this and records it as the consent,
        // and the Linux one-liner hands its Yes over to it. English only, like
        // the rest of the command line.
        expect(cliConsent()).toBe(locale('en').setup.internetBody);
    });

    it.each(LANGS)('no surface still promises a retired mechanism (%s)', (lang) => {
        const l = locale(lang);
        for (const text of [
            l.setup.internetBody,
            l.admin.internetInfo1,
            customMessage(lang, 'InternetPageBody'),
        ]) {
            // The DNS record and the per-instance certificate are gone from
            // every client, so no surface may still promise them.
            expect(text).not.toMatch(/future update|future mise à jour|未来的更新/);
            expect(text).not.toMatch(/PowerDNS/);
        }
    });

    it('both installer buttons are translated everywhere', () => {
        for (const lang of LANGS) {
            expect(customMessage(lang, 'InternetBtnSkip')).toBeTruthy();
            expect(customMessage(lang, 'InternetBtnAccept')).toBeTruthy();
            expect(locale(lang).setup.internetSkip).toBeTruthy();
            expect(locale(lang).setup.internetAccept).toBeTruthy();
        }
    });
});
