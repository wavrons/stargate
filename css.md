/* Default / Taipei (Rio as fallback) */

/* 1. Taipei - Brutalist Tech */
[data-theme="taipei"] {
  --primary-cta: #999999;
  --bg-surface: #121212;
  --accent: #00FFCC;
  --text-main: #FFFFFF;
  --radius: 0px;
  --font-main: 'JetBrains Mono', monospace;
}

/* 2. Rio de Janeiro - Organic Growth */
[data-theme="rio"] {
  --primary-cta: #61BB46;
  --bg-surface: #F0FFF0;
  --accent: #FFD700;
  --text-main: #1B3022;
  --radius: 24px;
  --font-main: 'Quicksand', sans-serif;
}

/* 3. Los Angeles - Cinematic Retro */
[data-theme="la"] {
  --primary-cta: #FDBD2C;
  --bg-surface: #3D2B1F;
  --accent: #87CEEB;
  --text-main: #F8F8F8;
  --radius: 12px;
  --font-main: 'Bebas Neue', sans-serif;
}

/* 4. Amsterdam - Modern Heritage */
[data-theme="amsterdam"] {
  --primary-cta: #F58220;
  --bg-surface: #FAF9F6;
  --accent: #003366;
  --text-main: #222222;
  --radius: 8px;
  --font-main: 'Playfair Display', serif;
}

/* 5. Tokyo - Precise Editorial */
[data-theme="tokyo"] {
  --primary-cta: #333333; /* Ink */
  --bg-surface: #FFFFFF; /* Paper */
  --accent: #E03A3E; /* Tokyo Red used as supplementary */
  --text-main: #1A1A1A;
  --radius: 4px;
  --font-main: 'Space Grotesk', sans-serif;
}

/* 6. Seoul - Cyber-Pop */
[data-theme="seoul"] {
  --primary-cta: #963D97;
  --bg-surface: #0B0114;
  --accent: #F06292;
  --text-main: #FFFFFF;
  --radius: 16px 4px 16px 4px; /* Asymmetric Glitch */
  --font-main: 'Syne', sans-serif;
}

/* 7. Santorini - Fluid/Coastal */
[data-theme="santorini"] {
  --primary-cta: #009DDC;
  --bg-surface: #FFFFFF;
  --accent: #E2E8F0;
  --text-main: #2C3E50;
  --radius: 100px; /* Pill Shape */
  --font-main: 'Cormorant Garamond', serif;
}

/* 8. Arjeplog - The Hidden Forest (Premium Dark) */
[data-theme="arjeplog"] {
  --primary-cta: #F0EEE9; /* Cloud Dancer */
  --bg-surface: #1B3022; /* Forest Green */
  --accent: #A5F2F3; /* Ice Blue */
  --text-main: #FFFFFF;
  --radius: 2px;
  --font-main: 'Sora', sans-serif;
}

/* --- BASE STYLES --- */

body {
  background-color: var(--bg-surface);
  color: var(--text-main);
  font-family: var(--font-main);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 0;
  padding: 2rem;
}

.button {
  background-color: var(--primary-cta);
  border-radius: var(--radius);
  color: var(--bg-surface); /* Automatically contrasts with the button color */
  padding: 1rem 2rem;
  border: none;
  font-weight: bold;
  cursor: pointer;
  display: inline-block;
}

.card {
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05); /* Subtle overlay */
}

/* Utility Classes to apply these variables */
body {
  background-color: var(--bg-surface);
  color: var(--text-main);
  font-family: var(--font-family);
  transition: all 0.4s ease-in-out; /* Smooth transition between cities */
}

.button-primary {
  background-color: var(--primary-cta);
  border-radius: var(--radius);
  color: var(--bg-surface); /* Contrast color */
  padding: 12px 24px;
  border: none;
}

.accent-text {
  color: var(--accent);
}

// Example: Switching to Tokyo
document.body.setAttribute('data-theme', 'tokyo');

// Example: Switching to the hidden Arjeplog
document.body.setAttribute('data-theme', 'arjeplog');