MISSION CONTROL

A browser game you play by moving your head in front of your webcam 
In case you dont have webcam, dont worry, you can use keyboard!

# HOW TO RUN:
Open the link in description to play on Github Pages Site.


# GAME PLAY:


GAME START SCREEN:

<img width="391" height="353" alt="mc-start" src="https://github.com/user-attachments/assets/06a866e7-7d9e-4901-9bba-c4d83cd6dd6b" />

USER PLAYS GAME:

<img width="377" height="323" alt="mc-play" src="https://github.com/user-attachments/assets/2d4766f8-f691-4bbc-8d99-9786f2e11b16" />

USER FAILS GAME:

<img width="378" height="362" alt="mc-fail" src="https://github.com/user-attachments/assets/9f55e488-ec58-4b18-8666-361ccfc30a37" />

# How to play
Move your head left / right / up / down in front of the camera.
Dodge the pink/red asteroids falling from the top.
Fly through the yellow orbs to score bonus points.
You have 3 hull points (lives, top right). Game ends at 0.
Score climbs automatically the longer you survive, plus orb bonuses.
Press P to pause/resume.
If the camera is denied, use arrow keys instead.

# WHAT I DID?

In CSS I set the layout, color palette (CSS custom properties), fonts, overlay screens, the reticle/HUD styling
In the HTML body, I determined hidden video, main game canvas, small tracker canvas, overlay screens, HUD, side panel controls
In JavaScript I set the camera setup, motion tracking, game state, physics/collision, rendering, main loop.For asteroids,spawnInterval inside update() controls how fast asteroids start appearing.The 0.35 smoothing factor in sampleMotion() and the dt*8 easing in update() control how snappy or floaty the ship feels.Defined all colors once as CSS variables at the top of css file.
The canvas size is determined by width/height attributes on canvas (both the HTML attribute and the W/H constants near the top of the script).
This runs entirely client-side, at low resolution, so it's cheap enough to do every frame without a GPU or external API.
There's no face/head-detection model involved. Instead it uses frame differencing, a classic and lightweight computer-vision technique.
Every animation frame, the webcam image is drawn (mirrored) onto a small hidden 160×120 canvas.
That frame is compared pixel-by-pixel to the previous frame. Pixels that changed by more than a threshold are flagged as "moved."
The average position (a weighted centroid) of all flagged pixels becomes the tracked point — wherever the biggest change just happened, which in practice is wherever you moved.
That point is smoothed (linear interpolation) to remove jitter, then mapped onto the game canvas as the ship's target position. The ship eases toward that target rather than snapping, so flight feels fluid.



# LIMITATIONS:
Camera access requires a real page load  it won't work inside a restricted preview iframe. 
If your browser blocks it, the game falls back to arrow-key controls automatically.
Tracking is motion-basedit follows whatever moved most, not specifically your hand or face. Busy backgrounds (moving curtains, a second person, changing light) can distract it.
No motion history/prediction so if you hold still, the ship just holds its last known position.
Single-player, single ship, no persistent high scores (nothing is saved between sessions).
