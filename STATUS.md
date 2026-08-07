# STATUS

Aktueller Stand des Projekts. Kein Code, keine Doku — nur das, was sich ändert:
Deploy-Stand, offene Punkte, getroffene Entscheidungen.

Gedacht als Kontextdatei: Claude liest sie mit, ich pflege sie bei größeren
Änderungen nach. Stabile Dinge (Stack, Schema, Stil) gehören nicht hierher,
sondern in die Projektanweisungen.

**Letzte Aktualisierung: 2026-08-07**

---

## Stand

Live-Deploy ist aktuell, `main` und `origin/main` sind gleich.
Letzter Commit `7d74bfa` — Stream-Quellen belegt, SOTD-Links verifiziert,
Mood-Filter repariert.

| | |
|---|---|
| SOTD-Einträge | 31 |
| Labels | 11 |
| Jahre | 1992–2025 |
| Neuester Eintrag | 2026-05-31 · „If Only" — Liem |
| Radio-Stationen | 18 spielbar + 5 Link-Karten |

---

## Offene Punkte

- [ ] **SOTD-Lücke seit 31.05.** — über zehn Wochen ohne Eintrag
- [ ] **`/now` veraltet** — `NOW_UPDATED` in `src/pages/now.astro` steht auf
      `2026-04-01`. Inhalte „Lernend: Strudel" und „Nächstes Ziel: Mittelmeer"
      gegenprüfen
- [ ] **README ist noch das Astro-Starter-Template** — nichts über dieses Projekt
- [ ] **Journal leer** — beide Einträge sind Platzhalter auf `draft: true`
- [ ] **`src/_archive/PENDING_PATCHES.txt`** sagt selbst, dass sie gelöscht werden kann
- [ ] **`src/content/sotd/2026-05-27.md`** steht auf `draft: true` — bewusst
      zurückgehalten oder beim Aufräumen übersehen? Einzige Lücke im Mai

---

## Radio-Streams

Bekannt tot, bereits auf Link-Karten umgestellt — kein Handlungsbedarf:
**Fnoob**, **The Lot Radio** (HLS, Player kann kein HLS), **Radio Juicy**,
**Dub Ninja**.

⚠️ `.error-msg` („Stream nicht erreichbar") steht in **jeder** Stationskarte im
Markup und ist per CSS versteckt. Im HTML-Quelltext sichtbar heißt **nicht**,
dass der Stream tot ist. Nur im Browser prüfen.

Prüfroutine bei echten Ausfällen:
Station-Website → DevTools → Network → Media → aktuelle URL kopieren.

---

## Notizen

**2026-08-07 — „Seite ist veraltet" war ein ungepushter Commit.**
`7d74bfa` lag committed, aber ungepusht auf `main`. Der Netlify-Build stammte
noch aus einer Zeit mit nur vier SOTD-Einträgen, deshalb war der ganze Mai nicht
live. Ein `git push` hat es behoben.
→ Bei „Seite ist veraltet" zuerst `git status -sb` prüfen.
