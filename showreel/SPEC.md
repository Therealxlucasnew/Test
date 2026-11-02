# SPEC: "Say it, see it"

GOAL:    the viewer remembers that you describe something to Claude and it comes back as motion. They want to try it.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    40 s x 30 = 1200 frames. No music bed (no music source reachable here), so the voice is the clock.
         Visual beats sit on a 120 BPM grid: 15 frames per beat, a bar every 60 frames.

LOOK:    flat colour fields, one per beat, hard edges, no gradients, no grain.
         orange #FF5A1F · ink #141414 · bone #EEE8DC · electric blue #2340FF.
         Each scene's ground is one of these; the type on it is ink or bone.
         Accent = orange, used as a ground or as one highlighted element on a non-orange ground.
         Display: Archivo Black, 220-520 px for hero words, tracking -4%. Secondary: Montserrat 700, 44-64 px, tracking -1%.
         Medium: printed poster type that moves. No shadows except the 3D extrusion layers in DEPTH.
OBJECTS: a written brief (a line of type struck through), a wave (a line that becomes motion), a bar chart
         with one orange bar, a real globe from Natural Earth 110m land, a plane marker on a great-circle arc,
         an extruded 3D word, RGB-split glitch slices, a film strip with a frame counter.
MOTION:  enter expo.out / power4.out 0.35-0.6 s; camera + colour floods power2.inOut 0.4-0.6 s;
         exits and zoom-throughs power3.in, 40-50% shorter than entrances; springs only on scale/position
         (back.out(1.6) for slams). Letters 1 frame apart (0.033 s), words 0.08 s apart.
         Render-time motion blur on the root.

SHOTS (voice line → picture; the key word lands on its picture):
  S1  0.0-4.2   orange. Giant ink "WORD" already on screen at frame 0. On "move" its letters scatter and
                re-land as "MOVE". The O swells past the frame (object becomes world) → ink.       whoosh, impact
  S2  4.2-8.6   ink. Bone type writes "make it pop" letter by letter, an orange strike draws through it,
                then "by friday?" slams below. The strike line sweeps right and floods orange.    key ticks, whoosh
  S3  8.6-12.6  orange. "I'm Claude" per letter. A straight ink line draws, then bends into a running
                wave ("the line" → "the motion"). The wave flattens to a baseline → blue.          pop
  S4  12.6-15.8 blue. "TYPE" slams on the beat in 4 layouts (huge, stacked, rolled, outlined). The
                letters drop into bars → bone.                                                     click per slam
  S5  15.8-19.2 bone. Bars grow on the beat, one orange bar tallest, a line draws over them, a counter
                counts to 128 (illustrative). The last point becomes a pin → globe.                pop
  S6  19.2-22.4 ink. Real globe turns, an orange great-circle arc draws, the plane flies it; the camera
                pushes in on the landing point → blue.                                             whoosh-cinematic
  S7  22.4-25.6 blue. "DEPTH" extruded 28 layers, swings in 3D, then flies at the camera past the frame → ink.  whoosh
  S8  25.6-28.0 ink. "GLITCH" tears into RGB slices on seeded steps, ground flickers orange/blue on 4 frames.   glitch
  S9  28.0-32.4 6 tiles slam in on beats, each a motif from S3-S8 still moving; they collapse into the
                orange tile, which fills the frame.                                                riser → impact (once)
  S10 32.4-36.0 orange. A film strip of the earlier frames runs past while a frame counter ticks to 1200;
                the strip stops on one frame. Words: "describe → build".                          soft whoosh
  S11 36.0-40.0 bone. "Claude" types in huge in ink, an orange underline draws, CTA "Describe your video →"
                lands and holds 2 s.                                                               impact-bass-1 on the wordmark

BANNED:  dark void with small floating things; glow, bloom, particles; purple/blue gradients, glass cards;
         cream paper + serif + mono labels; everything fading and sliding up; titles drifting after they land;
         corner labels, HUD as decoration; three cards in a row; the logo docked in a corner;
         a drawn Claude logo (the wordmark is type only); the screen repeating the voice line word for word.
QA:      0.0 (thumbnail is a full orange frame with WORD), 2.4 (MOVE landed), 6.5 (strike through brief),
         10.5 (wave running), 13.5 (TYPE layout), 17.8 (chart with orange bar), 21.0 (globe + arc),
         23.8 (DEPTH in 3D), 26.6 (glitch), 30.0 (six tiles), 34.0 (film strip + counter), 39.0 (end card).
