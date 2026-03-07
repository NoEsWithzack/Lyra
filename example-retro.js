/**
 * Lyra Plugin — Retro Theme
 * ─────────────────────────
 * This is a fully-commented example showing every feature of the Lyra plugin API.
 *
 * Drop any .js file into the plugins/ directory next to server.js and it will
 * be auto-loaded when Lyra starts. Restart the server to pick up new plugins.
 *
 * Plugin API contract:
 *   name        {string}  Required. Display name shown in dashboard.
 *   version     {string}  Required. Semver string.
 *   author      {string}  Optional. Your name / handle.
 *   description {string}  Optional. Short description.
 *   themes      {Array}   Optional. List of theme objects (see below).
 *   sources     {Array}   Optional. Stub for custom data sources (Phase 3).
 *
 * Theme object:
 *   id        {string}  Required. Unique slug (no spaces). Used as CSS class "t-<id>".
 *   label     {string}  Required. Button label shown in dashboard.
 *   css       {string}  Required. Full CSS for the theme. Use ".t-<id>" as root selector.
 *   obsWidth  {number}  Optional. Recommended OBS browser source width (default: 460).
 *   obsHeight {number}  Optional. Recommended OBS browser source height (default: 120).
 *
 * Source object (Phase 3 — register for future use):
 *   id    {string}  Required.
 *   label {string}  Required.
 */

module.exports = {
    name:        'Retro Theme Pack',
    version:     '1.0.0',
    author:      'Your Name',
    description: 'CRT-scanline and pixel-art inspired widget themes.',

    themes: [
        {
            id:        'retro',
            label:     'Retro',
            obsWidth:  480,
            obsHeight: 130,
            css: `
                /* ── Retro / CRT theme ─────────────────────────────────────── */
                .t-retro #widget {
                    background: #0a0a0a;
                    border: 2px solid #39ff14;
                    border-radius: 4px;
                    padding: 14px 18px;
                    box-shadow: 0 0 20px rgba(57,255,20,0.3), inset 0 0 60px rgba(0,0,0,0.5);
                    position: relative;
                    overflow: hidden;
                }
                /* Scanline overlay */
                .t-retro #widget::before {
                    content: "";
                    position: absolute; inset: 0;
                    background: repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 2px,
                        rgba(0,0,0,0.15) 2px,
                        rgba(0,0,0,0.15) 4px
                    );
                    pointer-events: none; z-index: 10;
                }
                .t-retro #art-container { display: none !important; }
                .t-retro #info {
                    background: transparent;
                    border: none;
                    box-shadow: none;
                    backdrop-filter: none;
                    padding: 0;
                }
                .t-retro #track {
                    font-family: 'Courier New', monospace !important;
                    font-size: 14px; font-weight: 700;
                    color: #39ff14;
                    text-shadow: 0 0 8px rgba(57,255,20,0.8);
                    letter-spacing: 1px;
                }
                .t-retro #artist {
                    font-family: 'Courier New', monospace !important;
                    font-size: 11px;
                    color: rgba(57,255,20,0.6);
                    margin-top: 4px;
                }
                .t-retro #bar-bg {
                    background: rgba(57,255,20,0.15);
                    height: 4px; border-radius: 0;
                }
                .t-retro #bar-fill {
                    background: #39ff14;
                    box-shadow: 0 0 6px rgba(57,255,20,0.9);
                    border-radius: 0;
                }
                .t-retro #times {
                    font-family: 'Courier New', monospace !important;
                    color: rgba(57,255,20,0.5);
                    font-size: 10px;
                }
            `,
        },
    ],

    // Sources stub — register custom data sources here (Phase 3 feature).
    // When implemented, these will appear in the Player Source dropdown.
    sources: [
        // {
        //     id:    'last-fm',
        //     label: 'Last.fm Scrobbles',
        // },
    ],
};
