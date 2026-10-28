# Timer Studio

Timer Studio is a free browser-based **SRT generator** for countdown timers, stopwatches, and numerical counters. It creates precisely timed, plain-text subtitle files for CapCut Desktop and other video editors without uploading data or generating video.

<p align="center">
  <a href="https://www.linkedin.com/in/bilalabdulhadii/"><img src="https://img.shields.io/badge/Chat-Let's%20chat-darkseagreen?labelColor=gray&style=flat" alt="Chat" /></a>
  <a href="https://www.buymeacoffee.com/bilalabdulhadii"><img src="https://img.shields.io/badge/Donate%20$-Buy%20me%20a%20coffee-darkkhaki?labelColor=gray&style=flat" alt="Donate $" /></a>
  <a href="https://github.com/bilalabdulhadii"><img src="https://img.shields.io/badge/Coding-Work%20Together-cornflowerblue?labelColor=gray&style=flat" alt="Coding" /></a>
</p>

<p align="center">
  <a href="#introduction">Introduction</a> •
  <a href="#features">Features</a> •
  <a href="#technologies-used">Technologies</a> •
  <a href="#how-to-run">How to Run</a> •
  <a href="#email-me">Email Me</a> •
  <a href="#about-me">About Me</a> •
  <a href="#support">Support</a>
</p>

---

## Introduction

Timer Studio creates UTF-8 SRT subtitle sequences entirely in the browser. Choose Countdown, Stopwatch, or Counter, configure the sequence, review its timeline length and caption count, then select **Export SRT**. The generated file can be imported through CapCut Desktop's Local Captions feature and styled inside the video editor.

Live application: [timer.bilalabdulhadi.com](https://timer.bilalabdulhadi.com)

Source repository: [github.com/bilalabdulhadii/react-timer-studio](https://github.com/bilalabdulhadii/react-timer-studio)

---

## Features

- Generate countdown SRT files that count backward to zero
- Generate stopwatch SRT files that count upward from zero
- Generate ascending or descending numerical counter sequences
- Configure hours, minutes, seconds, start delay, final-value behavior, and second visibility
- Configure counter endpoints, step, whole-second interval, number padding, delay, and final hold
- Apply built-in duration presets from 1 to 120 minutes
- Keep timer formatting stable as `MM:SS` or `HH:MM:SS`
- Merge adjacent captions when minute-only values are identical
- Stop stepped counters before unreachable endpoints without overshooting
- Review exact SRT timeline length and generated caption count before export
- Generate and validate SRT files in a Web Worker with genuine progress reporting
- Follow a clear four-stage export workflow with a minimum three-second presentation
- Download descriptive automatic filenames with no filename setup required
- Import plain-text UTF-8 output into CapCut Desktop and other SRT-compatible editors
- Keep all sequence generation local to the browser with no backend or account

---

## Tech Stack

- **React**
- **Vite**
- **JavaScript**
- **HTML5 and CSS3**
- **Lucide React**
- **Web Workers and Blob downloads**
- **Vitest and ESLint**

---

## Technologies Used

<a><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg" width="40" height="40" alt="React"/></a>
<a><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" width="40" height="40" alt="JavaScript"/></a>
<a><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original-wordmark.svg" width="40" height="40" alt="HTML5"/></a>
<a><img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original-wordmark.svg" width="40" height="40" alt="CSS3"/></a>

---

## Email me

If you liked using Timer Studio, or it has helped you in any way, I'd like you email me at <b><a href="bilalabdulhadi88@gmail.com">bilalabdulhadi88@gmail.com</a></b> about anything you'd want to say about this software. I'd really appreciate it!

---

## About me

#Crafting Unique Digital Experiences.

#Let's keep it simple and effective.

---

## Support

<p><a href="https://www.buymeacoffee.com/bilalabdulhadii"> <img align="left" src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" height="50" width="210" alt="https://www.buymeacoffee.com/bilalabdulhadii" /></a></p><br><br>

---

> WebSite [@bilalabdulhadi.com](https://bilalabdulhadi.com/) &nbsp;&middot;&nbsp;
> GitHub [@bilalabdulhadii](https://github.com/bilalabdulhadii) &nbsp;&middot;&nbsp;
> Linkedin [@bilalabdulhadii](https://www.linkedin.com/in/bilalabdulhadii/)

---

## How to Run

```bash
# Clone the repository
git clone https://github.com/bilalabdulhadii/react-timer-studio.git

# Navigate to the project directory
cd react-timer-studio

# Install dependencies
npm install

# Run the development server
npm run dev
```

To create and verify the production build:

```bash
npm run build
npm test
npm run lint
```
