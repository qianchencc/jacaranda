# Jacaranda Days

An interactive miniature of a fictional Sydney street corner during jacaranda season. The English editorial interface surrounds a cream three-storey house, one intricate wraparound veranda with a thin charcoal canopy, four individually composed jacarandas, a violet bench, a small bookshop and warm street lamps.

## Reusable creation skill

The Chinese-language [Craft Interactive Miniatures skill](skills/craft-interactive-miniatures/SKILL.md) distils the Jacaranda project's composition, modelling, lighting, object interactions, coherent wind and petal lifecycle, and verification methods. It includes the failed approaches and their corrections, links to the existing evidence, and a reusable scene brief. Read the main skill first, then load the relevant references as needed.

The skill is stored in this repository; it does not imply installation into a personal skills directory. Its case notes distinguish verified geometry and interaction behaviour from browser GPU appearance and frame rate, which remain outside the saved evidence.

## Run

Serve `dist/` with a static HTTP server. There is no build step, package installation, API key, account integration, CDN or remote font dependency. JavaScript modules require HTTP; do not open the HTML directly through a `file:` URL.

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000/ in a browser with WebGL 2 support. The Sites hosting manifest preserves the deployment configuration and project identity.

## Explore

- Drag to orbit; scroll or pinch to zoom. Canvas keyboard controls: arrow keys rotate, plus/minus zoom, and Home restores the overview.
- Click the **purple bench** or **Under the jacaranda** to approach the seat and open an original harbour postcard. Turn it over, write a note, then download a PNG containing the illustration and note. Line breaks and Chinese text are supported. Nothing is sent to a server.
- Click either **framed cover**, the **magazine rack**, or **Stories from the street** to open the corner journal. Its two stories use the same covers as the physical objects. Page with the arrows or keyboard; the detail link returns to the bench or veranda.
- Click the **bookshop entrance** or **The door is open** to open and close its two hinged doors. Behind them is a real recessed alcove with bookshelves and interior light. The interior light and exterior spill respond to the door opening and time of day.
- Choose **Overview**, **By the bench** or **The veranda** for eased camera compositions. Opening the journal shifts the desktop composition to make room for its paper panel.
- Choose **Daylight**, **Golden hour** or **After dark**, or use the continuous time slider. Discrete transitions take 2.3 seconds. **Let the evening unfold** runs a roughly 30-second passage from daylight to night with a slow orbit; it can be interrupted at any moment.
- The toolbar controls slow orbit, the breeze and petals together, zoom, reset and fullscreen. **Sound off/on** enables a quiet, locally synthesized ambient rustle only after an explicit click; it is not a field recording.
- Reduced-motion preferences pause tree motion and falling petals by default and shorten transitions. Mobile overview framing uses a separately measured silhouette fit so the trees and street block remain between the title and controls.

## Design and implementation

The house uses a continuous rounded corner, a calm upper facade, a single detailed middle-storey veranda and a bookshop threshold. Four independently seeded branch structures create a low foreground and high background. Flower cups grow along fine, curved twigs in irregular overlapping sprays, with an exclusion volume that keeps the facade and entry readable. All model geometry is procedural; no scene is represented by a flat image.

`dist/index.html` and `dist/style.css` implement the responsive magazine interface. `main.js` coordinates lights, cameras, animation, raycasting, postcards and journal panels. `architecture.js` creates the house and its interactive objects, `vegetation.js` creates the tree skeletons and instanced flower cups, `street.js` creates the paving, bench, bicycle and lamps, and `ambient.js` synthesizes the optional sound.

The initial composition is after dark. Warm local lighting is balanced with a cool ambient fill. Branches, attached flowers, fern leaves and their shadows now share a continuous wind field: tree bases stay anchored, trunks respond slowly, and the exposed outer branches flex more strongly with a different delay on each tree. The GPU deformation has matching CPU sampling for actual blossom release points.

Falling flowers begin at those moving blossom points, inherit branch motion, and approach the same wind velocity through drag. A gust loosens neighbouring sprays; petals are not spawned in empty foreground air. The previous reflected flight corridors have been removed. Descending flowers stop on the first roof, cornice, veranda canopy, deck, step or street surface they meet, while solid wall, chimney and parapet contacts remove inward velocity. A tilted flower is supported by its current geometry as it settles, then persists in a bounded deposit mesh without a scale jump. Existing nonuniform accumulation follows canopy catchment and sheltered edges on the roof, with smaller traces on the awning and veranda. The entrance and curved balcony remain legible.

The petal pool has a capacity of 400 on desktop and 280 on phones; live occupancy varies with gusts and actual flight duration. A short deterministic physics warmup fills the initial scene. The breeze control pauses both the attached foliage and its detached flowers. Lighting can still change while motion is paused. Wind shadows refresh at a bounded cadence—5 times per second on desktop and about 3 on phones—while the vertex deformation and falling motion update each animation frame.

Three.js r170, OrbitControls and BufferGeometryUtils are vendored in `dist/vendor/`; the MIT licence is included. Locally hosted URW Base35 typeface notices are in `dist/assets/FONT-LICENSE.txt`.

## Wind and accumulation correction (revision 4)

The roof feedback exposed two real faults in revision 3: the attached trees were static, and artificial flight corridors prevented flowers from ever reaching the building. Revision 4 connects branch deformation, release, wind transport, first contact and resting deposits. Roof distribution was adjusted after the first offline image: heavier irregular pockets below the overhangs and against sheltered parapet edges now leave a quieter middle. The sloping awning receives smaller, broken patches.

`docs/verification-wind.json` contains the new evidence. The desktop and phone configurations each passed 10 lifecycle checks over 60 simulated seconds, including source attachment, roof/awning/ground landing, wall separation, supported deposits, stable pause/resume and close-view size. Both runs had no retained facade penetrations or nonfinite particle coordinates. The existing application passed 33 integration checks and 3 renderer-failure checks. Separate geometry verification checked 886 surface samples against actual mesh intersections and 11 solid-contact cases. Root anchoring, moving blossom anchors, normal transforms and 18 standard/depth/distance shader-source variants were also checked.

The two inspection images (`docs/preview-wind-calm.png` and `docs/preview-wind-gust.png`) use the same elevated camera at 17⅓ and 19⅓ simulated seconds. They bake the exact production wind deformation and petal transforms into Blender CPU geometry, with source hashes and per-surface counts recorded in `docs/wind-visual-evidence.json`. These are offline geometry/contact inspections, not browser screenshots. Blender's light transport and tone mapping differ from the live Three.js renderer. GPU animation smoothness and shader driver compilation remain unverified because WebGL is disabled in the available browser environment.

## Verification of revision 2

Browser checks covered the desktop interface, postcard front/back, an actual bilingual-note PNG download, both journal pages, optional sound toggling and 390 × 844 / 360 × 640 iframe viewport layouts. Captured interface screenshots are in `docs/preview-postcard.jpg` and `docs/preview-mobile-interfaces.jpg`.

The real application module, Three.js geometry, camera, raycaster, OrbitControls and generated canvas textures passed **31 focused integration checks** with a mocked DOM, renderer and clock. A separate renderer-failure run passed **3 fallback checks**. The records are in `docs/verification-main.json` and `docs/verification-fallback.json`.

The checks led to corrections for right-click activation, selecting objects through the back wall, pausing the evening during its initial transition, preserving a slider's requested value when interrupting playback, clock rounding, long postcard notes and portrait framing. Front-facing door, journal covers and bench remain selectable; dragging and multi-touch gestures do not activate them. Door reversal, interrupted camera transitions, journal projection shifts and modal focus restoration were checked.

Offline CPU renders of the exported geometry were inspected for tree silhouette, building proportions, entrance visibility and the open alcove. An analytical projection of 1,847,198 model vertices identified the original mobile clipping. The corrected default camera distances are 81 at 390 × 844 and 430 × 932, and 106 at 360 × 640, with corresponding orbit distance limits of 101 and 126.

### Previous falling-petal refinement (revision3, superseded)

The larger drift was inspected at a deterministic six-second state using its actual animated instance transforms. At the desktop overview, the median projected petal extent is 7.94 px and the foreground median is 12.28 px, before depth occlusion. The entry, bench and veranda remain readable in the offline geometry view. `docs/preview-petal-drift.png` is that Blender CPU model check; `docs/petal-projection-evidence.json` records the source hash, simulation parameters and projected bounds. The focused motion, pause, collision-corridor and close-up size checks are in `docs/verification-petals.json`. This image is not a browser screenshot or a live-rendering performance result.

### Verification boundary

The available cloud browser explicitly reported `GL_RENDERER = Disabled` and could not create a WebGL context. **Live GPU appearance, frame rate and visual smoothness were not verified in that environment.** Offline Blender lighting is an approximation, and the integration renderer is mocked; neither is a substitute for GPU validation. The browser screenshots document the actual HTML interface and postcard, not a functioning GPU scene. The site explains unavailable graphics clearly while keeping the journal and postcard usable.

## Original postcard artwork

`dist/assets/harbour-postcard.png` was generated on 2026-11-11 with the built-in image-generation tool from the text below. No reference image, retrieved photograph or third-party artwork was used as an image input. The 1536 × 1024 RGB PNG was copied unchanged into the site. It is used only for the postcard interaction and does not replace the 3D model.

> Use case: illustration-story. Asset type: original landscape postcard artwork used inside a quiet editorial website interaction, aspect ratio 3:2. A tranquil Sydney Harbour at blue hour, viewed across broad reflective water. On the far shore, the recognizable Sydney Opera House shells glow warm cream and soft amber; the Sydney Harbour Bridge forms its graceful arch to the right and behind, with a restrained strand of tiny golden lights. Soft peach and lavender clouds linger over a pale violet-blue evening sky. Silvery lilac water with delicate broken peach reflections, slow calm ripples, spacious and airy. A few naturally curved jacaranda branches with small airy purple flower sprays lightly enter from the upper right and lower left foreground, framing but not hiding the Opera House or bridge. Painterly editorial illustration with fine gouache and watercolor softness, elegant natural forms, subtle brush texture, creamy lilac / dusty peach / warm ivory palette, luminous but restrained, dreamlike and intimate, strong sense of depth and stillness. High quality polished artwork. Full bleed image only: no text, no lettering, no border, no frame, no page mockup, no UI, no watermark. Keep building forms recognizable and correctly proportioned, do not turn the city into a fantasy palace, do not add people, fireworks, neon glow, or oversized flowers.

The short journal stories and bookshop name are original fictional editorial content; they make no claim about a specific real historic property.
