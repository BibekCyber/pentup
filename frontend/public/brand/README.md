# AI Pentest — logo assets

The mark is the **Terminal Shield**: a shield (assurance) housing a `>` prompt +
cursor (the pentest). Ember accent `#F57214`.

- `terminal-shield-{dark,light}.svg` — the wired logo. `dark` = light shield, for dark
  surfaces; `light` = ink shield, for light surfaces. Ember prompt is fixed in both.
- `{hex-core,target-lock,prompt,caret-a,sentinel}-{dark,light}.svg` — the five other
  directions, both themes.
- `favicon-tile.svg` — ember tile + dark shield (used for the app favicons).
- `lockup-{dark,light}.svg` — the "AI Pentest" wordmark lockup (mark + text).
- `png/` — PNG exports of the Terminal Shield (16–512, both themes) and the tile
  (16/32/96/180/512).

All SVGs are plain, editable vectors (each path is separate). Regenerate PNGs with
`python3 _gen.py`. The same mark is live in Figma (editable): see the brand file.

## brand-sheet.{svg,png}

One-file brand sheet for review — header lockup, all six marks on dark + light
grounds, wordmark lockups, in-context mockups (rail / favicon sizes / report
masthead), and colour + type foundations. `brand-sheet.svg` is self-contained
(Inter + JetBrains Mono embedded) and editable; `brand-sheet.png` is 2520x2775 for
sharing. Regenerate with `python3 _sheet.py`.
