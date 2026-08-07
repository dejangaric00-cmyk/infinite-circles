# Bestandsaufnahme — 2026-08-08

Stand: `main` @ `7f320b3`, Änderungspaket D uncommitted, Build läuft durch.
Gelesen: alle Dateien unter `src/` außer `_archive/`.

Reihenfolge nach Wirkung, nicht nach Aufwand.

> **Stand der Umsetzung:** A1–A5, B1–B5 und C1–C3 sind erledigt.
> Offen bleibt Abschnitt D — Inhalt, den nur du schreiben kannst.
> `npx tsc --noEmit` ist sauber, `astro build` baut 39 Seiten.

---

## A · Fehler

### A1 — MiniPlayer beendet die Wiedergabe, die er bedienen soll
`src/components/MiniPlayer.astro:260`

```js
if (!target) { window.location.href = '/radio'; return; }
```

`window.location.href` ist ein Volllade-Navigationsschritt. Das Modul wird neu
ausgewertet, `utils/player.ts` bekommt ein neues `new Audio()`, der Stream
bricht ab. Genau das, was A–C verhindern sollten — und es passiert auf jeder
Seite außer `/radio`, also überall dort, wo der Knopf überhaupt sichtbar ist.

Behebung: `navigate()` aus `astro:transitions/client`, dann bleibt der
ClientRouter im Spiel und das Audio-Element steht.

### A2 — XSS in der Archive-History
`src/components/ArchiveRadio.astro:552`

```js
arHistItems.innerHTML = history.map((x: any) => `
  <div class="ar-history-item" data-id="${x.id}" data-title="${x.title}" ...>
```

`title`, `artist` und `id` stammen aus archive.org-Metadaten, sind also fremd
befüllt, und landen ungefiltert in Attributwerten. Ein `"` im Titel bricht aus
dem Attribut aus. Die LikeSidebar rendert dieselben Daten bereits bewusst über
`textContent` und trägt sogar den Kommentar *„XSS-safe DOM rendering (no
innerHTML with user data)"* — die History ist die Stelle, die davon nichts
mitbekommen hat.

Behebung: gleicher `createElement`/`textContent`-Weg wie in der LikeSidebar.

### A3 — Pfeiltasten scrollen nicht mehr
`src/components/KeyboardController.astro:361–372`

`ArrowUp`, `ArrowDown` und `Space` rufen unbedingt `preventDefault()`. Der
Handler hängt am `document` und ist über das BaseLayout auf jeder Seite aktiv.
Auf `/about`, `/journal` oder einem langen SOTD-Eintrag lässt sich damit
weder mit den Pfeiltasten noch mit der Leertaste scrollen — auf einer Seite,
die zum Lesen gedacht ist.

`isTyping()` deckt außerdem Buttons nicht ab: liegt der Fokus auf einem
`<button>`, löst Leertaste gleichzeitig den Button und den Player aus.

Behebung: `preventDefault()` nur, wenn tatsächlich etwas läuft
(`getState().source !== null`), und `isTyping()` um `button`/`a`/`[role]`
erweitern. Alternativ die Lautstärke auf `+`/`-` legen und die Pfeiltasten
freigeben.

### A4 — Underground-Karte hängt im Ladezustand
`src/components/UndergroundStations.astro:~725`

```js
setCardState(card, s.playing ? 'playing' : 'loading');
```

Pausiert man einen Underground-Sender — über MiniPlayer, Leertaste oder
Medientaste — bleibt `s.source === 'underground'` und `s.playing === false`.
Die Karte zeigt dann dauerhaft „loading", obwohl nichts mehr geladen wird.
Es fehlt ein dritter Zustand `paused`.

### A5 — Endlosschleife bei toten Archive-Links
`src/components/ArchiveRadio.astro:665`

```js
onError: () => { setStatus('Error — skipping'); setTimeout(() => void rpNext(), 1500); },
```

Kein Zähler. Liefert archive.org eine Charge, in der die meisten Items keine
abspielbare Datei haben, springt der Player alle 1,5 s weiter, bis der Nutzer
eingreift. Ein Abbruch nach etwa fünf Fehlversuchen in Folge mit sichtbarer
Meldung wäre ehrlicher.

Nebenbei: `rpNext()` rechnet `(rpIdx + 1) % rpTracks.length`. Bei leerer Liste
ist das `NaN`, und `playDoc(undefined)` wirft. `getFallback()` verhindert das
heute — der Schutz hängt aber an einer Nebenwirkung, nicht an einer Prüfung.

---

## B · Optimierung

### B1 — Zwei dauerhafte rAF-Schleifen, eine davon ohne Bremse
`src/components/SomaPlayer.astro:419–447`

Der Visualizer läuft ununterbrochen, auch wenn nichts spielt (er zeichnet dann
48 Balken auf Ruhehöhe). Er kennt weder `prefers-reduced-motion` noch
`visibilitychange` — beides hat `CircleCanvas.astro` bereits sauber gelöst.
Auf `/radio` laufen damit zwei Schleifen dauerhaft, eine davon im
Hintergrundtab weiter.

Dazu, pro Frame:

```js
const accent = getAccent();   // getComputedStyle(document.documentElement)
```

60 Style-Abfragen pro Sekunde für einen Wert, der sich nur beim Themenwechsel
ändert. Einmal lesen, bei `ic_dark`-Umschaltung und `matchMedia`-`change`
neu lesen.

### B2 — CircleCanvas ignoriert die Pixeldichte
`src/components/CircleCanvas.astro:34`

```js
W = bgCanvas.width = window.innerWidth;
```

Ohne `devicePixelRatio` rendert der Hintergrund auf einem Retina-Display mit
halber Auflösung — 0,7 px starke Ringe werden dabei sichtbar weich. Der
SomaPlayer-Visualizer macht es eine Datei weiter bereits richtig. Bei DPR 2
vervierfacht sich allerdings die Füllfläche; wenn das zu teuer wird, ist
`Math.min(devicePixelRatio, 2)` der übliche Kompromiss.

### B3 — MediaSession pollt rund um die Uhr
`src/components/MediaSessionController.astro:78`

```js
setInterval(() => { if (getState().playing) syncPosition(); }, 5000);
```

Läuft ab dem ersten Seitenaufruf für immer, auch wenn nie etwas abgespielt
wird. Das Intervall gehört in die `subscribe`-Rückmeldung: starten, wenn
`playing` und `duration` endlich sind, sonst stoppen. Das Muster steht schon
fertig im SomaPlayer (`npInterval`).

### B4 — 120 Zeilen Konfiguration pro Navigation neu gebaut
`src/components/ArchiveRadio.astro:368–491`

`GENRE_QUERIES` und `GENRE_LABELS` sind unveränderliche Tabellen, stehen aber
im `onPage`-Rumpf und werden bei jedem Seitenwechsel neu angelegt. Gehören ins
Modul-Scope oder — sauberer — nach `src/utils/archive.ts`, wo die übrige
Archive-Logik schon liegt. Das schrumpft auch den Setup-Block auf eine Länge,
die man am Stück lesen kann.

### B5 — Kleinigkeiten mit kurzer Laufzeit

| Ort | Befund |
|---|---|
| `KeyboardController.astro:326` | `volToastTimer` wird beim Teardown nicht gelöscht — ein hängender Timeout schreibt in verworfene Knoten. |
| `utils/archive.ts:115–117` | `any[]` in einem `strict`-tsconfig. Ein schmales `ArchiveFile`-Interface reicht. |
| `utils/reveal.ts` | Wird nirgends importiert. Der Kommentar erklärt eine Annahme über Astro, die mit der Content-Layer-API nicht mehr stimmt — Scripts *können* geteilt importiert werden, `lifecycle.ts` beweist es. Entweder benutzen oder löschen. |
| `pages/radio/index.astro` | Keine `schema`-Prop. Als einzige Seite mit Audio-Angebot wäre ein `RadioChannel`- oder `WebPage`-Knoten hier am ehesten begründet. Bisher hat nur `sotd/[slug]` ein Schema. |
| `BaseLayout.astro:129–134` | `/journal` fehlt in der Navigation. Die Seite existiert und wird von der Startseite verlinkt, ist über die Leiste aber nicht erreichbar. |

---

## C · Lesbarkeit und Zugänglichkeit

### C1 — Schriftgrößen unter der Lesbarkeitsgrenze
`.way-label` 8 px, `.way-meta` 9 px, `.ar-history-meta` 8 px, Navigationslinks
10 px und auf Mobil 9 px. In Kombination mit `--text-dim`
(`rgba(10,26,46,0.42)` auf hellem Glas) liegt der Kontrast deutlich unter
4,5:1. Das ist als Stilmittel gewollt, trifft aber genau die Stellen, die
Information tragen — Datum, Genre, Interpret.

Vorschlag ohne Umbau des Designsystems: Untergrenze 10 px, und `--text-dim`
für Fließinformation durch `--text-mid` ersetzen. Die Dekoration darf dim
bleiben.

### C2 — Kein Fokusring auf den Radio-Bedienelementen
`:focus-visible` ist auf `.way`, `.station-btn`-Slider und wenige weitere
Elemente gesetzt, fehlt aber auf `.ar-genre-btn`, `.rpwb`, `.play-btn` der
Underground-Karten und den MiniPlayer-Knöpfen. Wer per Tastatur bedient,
sieht auf `/radio` nicht, wo er steht. Eine globale Regel im BaseLayout
(`:where(button, a, [tabindex]):focus-visible`) erledigt das an einer Stelle.

### C3 — Ringe hinter Textseiten
Offener Punkt 4 aus deiner Liste. Die Deckkraft steht global auf 0.7. Statt
eines einzelnen Werts wäre eine Abstufung ehrlicher: voll auf `/` und
`/radio`, gedämpft auf Lesestrecken. Umsetzbar über ein Attribut am `<body>`
oder eine Prop am BaseLayout, ohne die Komponente anzufassen.

---

## D · Inhalt

Nicht Code, aber das, was ein Besucher zuerst sieht.

- **Song of the Day endet am 2026-05-31.** Heute ist der 2026-08-08. Die
  Startseitenkarte, `/now` und der RSS-Feed zeigen alle einen Eintrag, den
  `relativeDayLabel` mit „vor 2 Monaten" beschriftet. Bei einem Format, das
  „of the Day" heißt, ist das die auffälligste Baustelle der Seite.
- **`/now` steht auf `NOW_UPDATED = '2026-04-01'`** — „zuletzt aktualisiert vor
  4 Monaten". Eine Now-Page, die das über sich selbst schreibt, widerlegt ihren
  Zweck.
- **Beide Journal-Einträge sind `draft: true`** und enthalten Platzhaltertext
  („Hier steht der eigentliche Text des Eintrags."). Deshalb der Fallback
  „Notizen." auf der Startseite. `/journal` selbst ist damit eine leere Seite,
  die trotzdem im Sitemap steht.
- **Startseiten-Untertitel** „Musikjournal, Radio, Texte. Aus Hannover." —
  dein offener Punkt 3. Solange das Journal leer ist, verspricht die Aufzählung
  zwei Dinge, die es noch nicht gibt.

---

## Reihenfolge, wenn du wenig Zeit hast

1. A1 — ein Einzeiler, und der Bug widerspricht dem Zweck des ganzen Umbaus.
2. A3 — betrifft jede Seite und jeden Besucher, nicht nur den Player.
3. A2 — klein, und die Absicht steht schon zwei Dateien weiter ausformuliert.
4. D — SOTD nachziehen, dann `/now`, dann die Journal-Drafts.
5. B1 und B3 — zwei Stellen, an denen Strom verbraucht wird, ohne dass etwas
   passiert.

A4, A5, B2, B4 und C sind Pflegearbeit ohne Termin.
