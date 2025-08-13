# Rhythm Game

A ballet-themed rhythm game prototype built with HTML, CSS, and vanilla JavaScript.

## Launching the Game

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

For a production build and preview:

```bash
npm run build
npm run preview
```

## Controls

Notes fall through four lanes that correspond to the following keys:

- **D** – left lane
- **F** – left‑center lane
- **J** – right‑center lane
- **K** – right lane

## Current Features

- Four-lane note highway with smooth falling note animation.
- Real-time scoring that displays overall hit rate.
- Visual feedback for hits and misses, including lane flashes and timing messages (e.g., "Poised!", "Balanced!", "Wavering!", "Lapse!").
- Responsive design that fills the browser window.

## Development Guidelines

- Use clear, descriptive variable and function names.
- Keep functions small and focused; comment any non-obvious logic.
- Test changes in a browser before committing.
- Write descriptive commit messages that explain the intent of the change.

## Lane Offsets

Each lane receives a unique class name (`lane-0` to `lane-3`). To nudge notes or hit indicators horizontally, adjust the `--note-offset` and `--indicator-offset` variables for each lane in `src/styles.css`:

```css
.lane-0 .note { --note-offset: 0px; }
.lane-0 .hit-indicator { --indicator-offset: 0px; }
```

Increase or decrease these pixel values to fine-tune alignment.

## Roadmap

Planned enhancements include:

- Integrating music tracks with synchronized note charts.
- Adding difficulty levels and custom song support.
- Expanding visual effects and animations.
- Introducing a main menu and pause functionality.
- Improving mobile/touch support.

## Licensing & Attribution

This project is released under the [MIT License](LICENSE).

The game currently uses no external assets or libraries. If you add third-party assets or libraries, list them here with their respective licenses and attribution requirements.
