/*
 * MoonlightWeb — browser-based Sunshine/GameStream client.
 * Copyright (C) 2026 Bruno Martin <brunoocto@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <https://www.gnu.org/licenses/>.
 */

#pragma once

#include <QString>
#include <QtGlobal>

/**
 * The project's original service domain, and the one thing that follows from
 * it in this release.
 *
 * Control of moonlightweb.top is no longer certain (v0.4.1). Nothing that can
 * be done elsewhere is asked of a server under it any more: STUN goes to public
 * servers instead. The rendezvous still runs there until it moves to a new
 * domain; that is decided where its URL is built (RendezvousClient), not here.
 *
 * An operator who set MW_DOMAIN to a domain of their own keeps their own STUN
 * server first, exactly as before: they are the operator the consent text
 * names, and their server learns nothing a public one would not.
 */
namespace mw::projectdomain {

/// moonlightweb.top, or any name under it — written with or without the
/// trailing dot of a fully qualified name ("stream.moonlightweb.top.").
inline bool isOld(const QString& domain)
{
    QString d = domain.trimmed().toLower();
    while (d.endsWith(QLatin1Char('.')))
        d.chop(1);
    return d == QLatin1String("moonlightweb.top") || d.endsWith(QLatin1String(".moonlightweb.top"));
}

/// The host a STUN or TURN URL names, in any form the settings may hold:
/// "stun:host:3478", "turn:host:3478?transport=udp", "host:3478", "host" or
/// "stun:[2001:db8::1]:3478".
inline QString stunUrlHost(const QString& url)
{
    QString s = url.trimmed();
    const int colon = s.indexOf(QLatin1Char(':'));
    if (colon > 0) {
        const QString scheme = s.left(colon).toLower();
        if (scheme == QLatin1String("stun") || scheme == QLatin1String("stuns") ||
            scheme == QLatin1String("turn") || scheme == QLatin1String("turns"))
            s.remove(0, colon + 1);
    }
    while (s.startsWith(QLatin1Char('/')))
        s.remove(0, 1);
    const int query = s.indexOf(QLatin1Char('?'));
    if (query >= 0) s.truncate(query);
    if (s.startsWith(QLatin1Char('['))) {
        const int close = s.indexOf(QLatin1Char(']'));
        return close > 0 ? s.mid(1, close - 1) : s.mid(1);
    }
    const int port = s.lastIndexOf(QLatin1Char(':'));
    if (port >= 0) s.truncate(port);
    return s;
}

/// "stream.<MW_DOMAIN>" when MW_DOMAIN names an operator's own domain; empty
/// when it is unset or names the project's old domain.
inline QString operatorStunHost()
{
    const QString domain = QString::fromUtf8(qgetenv("MW_DOMAIN")).trimmed();
    if (domain.isEmpty() || isOld(domain)) return {};
    return QStringLiteral("stream.") + domain;
}

/// The STUN URL a session gets when the settings name none: the operator's own
/// server when there is one, a public one otherwise.
inline QString defaultStunUrl()
{
    const QString own = operatorStunHost();
    return own.isEmpty() ? QStringLiteral("stun:stun.cloudflare.com:3478")
                         : QStringLiteral("stun:") + own + QStringLiteral(":3478");
}

} // namespace mw::projectdomain
