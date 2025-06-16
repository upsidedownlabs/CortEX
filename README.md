# 🧘‍♀️ CortEX – Real-Time Neurofeedback Meditation Platform

## 📝 Project Overview

**CortEX** is a cutting-edge, real-time web application designed to empower users through neurofeedback during meditation. Built using **Next.js** and **TypeScript**, the platform integrates **EEG** and **ECG** biopotential signals via **Bluetooth Low Energy (BLE)** to deliver a personalized, data-driven meditation experience.

---

## 🔌 Hardware Requirement

To use CortEX effectively, you'll need:

### 🧠 [NPG Lite (Neuro PlayGround Lite)](https://www.crowdsupply.com/upside-down-labs/neuro-playground-lite)
A BLE-enabled biopotential signal board designed for:

- ✅ EEG (Electroencephalogram)
- ✅ ECG (Electrocardiogram)
- ✅ EMG (Electromyogram)
- ✅ EOG (Electrooculogram)

> 💡 CortEX uses the [NPG Lite’s BLE stream](https://github.com/upsidedownlabs/Chords-Arduino-Firmware/blob/main/NPG-LITE-BLE/NPG-LITE-BLE.ino) for real-time brain and heart activity visualization.


## 🔑 Core Features

### 1. Real-Time EEG & ECG Visualization
- **EEG waveforms:** Channels display Delta, Theta, Alpha, Beta, Gamma brainwaves signals.
- **ECG line graphs:** Clean, real-time ECG plots to extract heart metrics.
- **Rendering:** Uses WebGL for performance and Recharts for intuitive graphing.

### 2. Mental & Physical State Classification

#### EEG-Based States
- **Relaxed:** High Alpha, moderate Theta.
- **Focused:** High Beta and Gamma.
- **Drowsy:** Dominance of Delta/Theta.
- **Meditative:** Balanced Alpha and Theta with suppressed Beta.

#### ECG-Based Physical States
- **HRV Metrics:**
  - **BPM** (*Beats Per Minute*): Heart rate over time.
  - **SDNN** (*Standard Deviation of NN intervals*): General variability (resilience).
  - **RMSSD** (*Root Mean Square of Successive Differences*): Short-term parasympathetic activity.
  - **pNN50** (*Percentage of successive NN intervals differing by >50 ms*): % of adjacent NN intervals differing >50ms.
  - **High HRV → Relaxed**, **Low HRV → Stress/Fatigue**.

### 3. Session Management & Analytics
- Start, pause, and end meditation sessions.
- Automatically logs:
  - Session duration
  - Time in each mental state
  - Average EEG band power
  - Heart rate trends & HRV indicators
- **Summary dashboard**:
  - Radar/pie charts for brainwave distribution
  - State classification timeline
  - Focus and relaxation scores

### 4. Left/Right Hemisphere Symmetry
- Tracks brain symmetry for cognitive balance:
  - Separate EEG band power for left vs. right (e.g., F3 vs. F4)
  - Visual meters and difference plots

### 5. Dynamic Feedback
- Real-time UI adjustments (e.g., color shift, waveform smoothness)
- Breathing circle animation synced with heart rate
- Motivational quotes between sessions

---

## ⚙️ Technical Architecture

### 💡 Signal Processing Pipeline
Handled in **Web Workers** to ensure real-time performance:
- EEG/ECG filtering (bandpass, notch)
- FFT
- Band power integration
- HRV computation (SDNN, RMSSD, pNN50)

### 🧠 Mental State Detection Algorithm
- FFT on sliding EEG windows
- Band power extraction
- Normalization & ratio calculation
- Rule-based or ML-based classification

### ❤️ ECG Analysis Flow

- Detect **R-peaks** using threshold and derivative methods
- Calculate **RR intervals** (time between successive heartbeats)
- Derive the following **HRV (Heart Rate Variability)** metrics:

  - **BPM** (*Beats Per Minute*): Average heart rate over time
  - **SDNN** (*Standard Deviation of NN intervals*): Reflects overall variability and resilience
  - **RMSSD** (*Root Mean Square of Successive Differences*): Measures short-term vagal (parasympathetic) activity
  - **pNN50** (*Percentage of successive NN intervals differing by >50 ms*): Indicator of parasympathetic nervous system strength


## 💻 Code Structure


## 🎨 UI/UX Highlights

- **Tailwind CSS** for styling  
- Light/Dark modes for comfort  
- Responsive animations for feedback  
- Radar plots, progress bars, symmetry meters for clarity

---

## 📦 Technologies Used

- **Frontend:** Next.js, React, TypeScript  
- **Visualization:** WebGL (webgl-plot), Recharts  
- **Data Streaming:** Web Bluetooth API (BLE)  
- **Performance:** Web Workers  
- **Styling:** Tailwind CSS  

---

## 🧩 Credits

Built with great tools and libraries:

- Next.js, React, TypeScript  
- Tailwind CSS, Framer Motion, Lucide React  
- Radix UI components (`accordion`, `dialog`, `popover`, etc.)  
- Recharts, webgl-plot for visualization  
- Embla Carousel for UI interactions  
- ESLint, PostCSS, and DefinitelyTyped type definitions

Thanks to all the amazing communities!

---

## 🧠 Summary Comparison Table

| Feature                        | Traditional Apps         | 🧘 CortEX                                         |
|-------------------------------|--------------------------|-------------------------------------------------|
| EEG/ECG Integration           | ❌ Uses timers/audio      | ✅ Real EEG/ECG via BLE                          |
| Real-Time Feedback           | ❌ Post-session only      | ✅ Live state updates, synced animations         |
| HRV Metrics                  | ❌ BPM at best            | ✅ Full: BPM, SDNN, RMSSD, pNN50                 |
| Open-source Extensibility    | ❌ Closed-source          | ✅ Developer-friendly, research-ready            |
| Custom Signal Processing     | ❌ Black-box/no processing| ✅ Built-in FFT, filters, classifiers            |
| Hemisphere Tracking          | ❌ Not available          | ✅ Symmetry-based brain analysis                 |

---

## 🌈 Why It Matters

- 🎯 **Precision**: Quantify your progress, not just guess it.
- 🧘 **Effectiveness**: Optimize your meditation with evidence.
- 🧪 **Science-backed**: Built on peer-reviewed methods.
- 🔍 **Transparency**: Know how everything works.
- 🛠️ **Flexibility**: Ideal for tinkerers, researchers, and biohackers.

---

## 📽️ YouTube Demo

Coming soon!


## 📝 Author

💫 Built with love, neurons, and a sprinkle of curiosity by [Ritika Mishra](https://github.com/Ritika8081) – decoding mindfulness, brainwave and heartwave.

## 🤝 Contributing

Thank you for your interest in contributing — your support helps shape the CortEX. 🙌

<!-- Custom Contributors List -->
<table>
  <tr>
   <td align="center">
      <a href="https://github.com/Amanmahe">
        <img src="https://avatars.githubusercontent.com/u/98646204?v=4" width="80px;" alt="Aman Maheswari"/><br />
        <sub><b>Aman Maheswari</b></sub>
      </a>
    </td>
  <td align="center">
      <a href="https://github.com/lorforlinux">
        <img src="https://avatars.githubusercontent.com/u/20015794?v=4" width="80px;" alt="Deepak Khatri"/><br />
        <sub><b>Deepak Khatri</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/akadeepesh">
        <img src="https://avatars.githubusercontent.com/u/100466756?v=4" width="80px;" alt="Deepesh Kumar"/><br />
        <sub><b>Deepesh Kumar</b></sub>
      </a>
    </td>
    <td align="center">
    <a href="https://github.com/CIumsy">
    <img src="https://avatars.githubusercontent.com/u/76506050?v=4" width="80px;" alt="Krishnanshu Mittal"/><br />
    <sub><b>Krishnanshu Mittal</b></sub>
    </a>
    </td>
     <td align="center">
      <a href="https://github.com/Ritika8081">
        <img src="https://avatars.githubusercontent.com/u/103934960?v=4" width="80px;" alt="Ritika Mishra"/><br />
        <sub><b>Ritika Mishra</b></sub>
      </a>
    </td>
  </tr>
</table>

At CortEX, we celebrate collaboration, curiosity, and creativity.

Whether you're a neuroscientist, developer, designer, or simply someone deeply fascinated by the mind and inner states — there's a place for you here. Let's build meaningful, mindful experiences together.

---

## 📝 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.
