# 👂 Hearing Range Explorer

**[Try it live](https://angelahope.github.io/hearing-range-explorer/)**

A browser app that tests the range of pitches you can hear and shows *where* in your inner ear each pitch is sensed.

- **Explore:** slide from 20 Hz to 20,000 Hz and watch a marker move along a drawing of the cochlea to the spot that responds to that pitch
- **Test yourself:** 15 tones from 125 Hz to 18,000 Hz; answer "heard" or "not heard" and get a chart of your hearing range
- **Understand the result:** why the top of the range drops with age and noise, and why your speakers might be the limit, not your ears

No installs, no data sent anywhere. Everything runs in your browser.

## The biology

The cochlea is a fluid-filled tube coiled about two and a half times, like a snail shell. Running along it is the basilar membrane, which is stiff and narrow at the entrance (base) and wide and floppy at the tip (apex). Each spot along it vibrates most at one particular pitch, so:

- **high pitches** peak near the **base**
- **low pitches** travel all the way to the **apex**

This mapping of pitch to place is called **tonotopy**. Hair cells at each spot turn the vibration into nerve signals. Because the base handles every sound before it travels further in, its hair cells wear out first, which is why we lose high frequencies as we age (presbycusis).

## The computer science

| Problem | How it's solved |
|---|---|
| Making a tone | Web Audio API `OscillatorNode` (sine wave) through a `GainNode` |
| Avoiding clicks | The gain ramps up and down over 50–80 ms instead of switching instantly |
| A slider that covers 20–20,000 Hz | Logarithmic mapping, `f = 20 × 1000^(v/1000)`, because we hear pitch on a log scale (each octave doubles the frequency) |
| Placing a pitch on the cochlea | The spiral is an Archimedean spiral `r = r₀ + kθ`; a pitch's log position (0 = 20 Hz, 1 = 20 kHz) sets the angle θ along it |
| The results chart | SVG drawn with plain JavaScript on a log-scaled axis |

The pitch-to-place mapping here is a simplified logarithmic one. The real cochlea follows the Greenwood function, which is close to logarithmic over most of its length.

## Run it locally

It's three files (`index.html`, `style.css`, `app.js`), so just open `index.html` in a browser.

## Publish it with GitHub Pages

In this repository: **Settings → Pages → Branch: main → / (root) → Save**. After a minute it's live at `https://angelahope.github.io/hearing-range-explorer/`.

## Ideas for next steps

- Test each ear separately using stereo panning
- Measure the quietest volume heard at each pitch, to draw a real audiogram
- Add the Greenwood function for a more accurate pitch-to-place map

*This is a learning tool, not a medical hearing test.*

## Author

Angela ([@angelahope](https://github.com/angelahope)), BSc Computer Science, University of Pretoria
