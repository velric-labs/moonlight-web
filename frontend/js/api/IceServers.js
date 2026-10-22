/*
 * MoonlightWeb — ICE server fallback list.
 * Copyright (C) 2026 Bruno Martin. GPLv3 — see repository LICENSE.
 */

/**
 * The list a PeerConnection starts with when the host has not said otherwise.
 *
 * It is a fallback: every current host sends an `ice-config` message naming
 * the one server it wants used — or an empty list, which is how a LAN session
 * says "none" — and that message replaces this. What is left here is the case
 * where no such message ever arrives, which means a host older than this file,
 * and the UDP probe (UdpProbe.js), which asks before any host has spoken: at
 * every launch and every guest join, on the LAN as on the internet.
 *
 * A STUN binding request tells whoever answers the public address of whoever
 * asked, so this list is the set of third parties that learn a viewer's IP.
 * An operator's own server goes first for the same reason the backend's does:
 * the viewer is already talking to that operator. The public servers stay
 * behind it because a viewer who cannot discover their own address cannot
 * connect at all, and a failed connection is a worse answer than a widely-used
 * third party.
 *
 * Never a server under the project's old domain, moonlightweb.top: the rule
 * the backend follows (backend/src/common/ProjectDomain.h). A page served from
 * there, or from anywhere that is not an operator's `stream.<domain>`, gets
 * the public servers alone.
 *
 * @returns {RTCIceServer[]}
 */
export function defaultIceServers() {
    const servers = [];
    const ours = ourStunHost();
    if (ours) servers.push({ urls: `stun:${ours}:3478` });
    servers.push(
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.nextcloud.com:443' },
        { urls: 'stun:relay.metered.ca:80' },
    );
    return servers;
}

/**
 * moonlightweb.top, or any name under it, written with or without the
 * trailing dot of a fully qualified name — the same test as the backend's
 * mw::projectdomain::isOld().
 *
 * @param {string} host
 * @returns {boolean}
 */
export function isOldProjectDomain(host) {
    const h = String(host || '')
        .trim()
        .toLowerCase()
        .replace(/\.+$/, '');
    return h === 'moonlightweb.top' || h.endsWith('.moonlightweb.top');
}

/**
 * Hostname of the operator's introduction server this page was served from —
 * `stream.<domain>`, which answers STUN on 3478 as well. Empty anywhere else
 * (loopback, a LAN address, no location at all) and under the project's old
 * domain, so the list above starts with the public servers.
 *
 * @returns {string}
 */
export function ourStunHost() {
    try {
        const host = globalThis.location?.hostname || '';
        if (host.startsWith('stream.') && !isOldProjectDomain(host)) return host;
    } catch (_e) {
        /* no location (worker, test harness): no operator to name */
    }
    return '';
}
