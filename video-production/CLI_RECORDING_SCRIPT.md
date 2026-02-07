# FundTracer Video Ad - CLI Recording Script
# Duration: 2 minutes (120 seconds)
# Resolution: 1080x1920 (9:16 vertical)
# Terminal: Dark theme, Linux

## PRE-RECORDING SETUP

### Terminal Configuration (Linux)
1. Install terminal: `sudo apt install kitty` or use your preferred terminal
2. Font: Install JetBrains Mono: `sudo apt install fonts-jetbrains-mono`
3. Terminal settings:
   - Background: #171717 (near black)
   - Text: #888888 (medium grey)
   - Accent: #60a5fa (subtle blue)
   - Font size: 16-18pt (for video readability)
   - Window size: 60x25 (approximate for 1080p vertical)

### Environment Setup
```bash
# Clear terminal history for clean look
clear

# Set prompt to minimal
export PS1="$ "

# Disable any terminal notifications/sounds
```

---

## SCENE 1: THE HOOK (0:00-0:10)

### Visual:
- Clear terminal
- Fade from black

### Commands:
NONE - Just text animation in post-production

### What to show:
- Empty terminal window
- Dark background #171717

---

## SCENE 2: THE PROBLEM (0:10-0:25)

### Commands to type:
```
$ echo "Traditional analysis tools are too slow..."
```

Wait 1 second, then type:
```
$ echo "Manual spreadsheet review takes hours"
```

Wait 1 second, then type:
```
$ echo "Sybil attacks cost projects millions"
```

### Pacing:
- Type slowly (deliberate keystrokes)
- Let each line sit for 2-3 seconds
- Total: 15 seconds

---

## SCENE 3: THE REVEAL (0:25-0:35)

### Commands:
```
$ fundtracer
```

### Expected output:
- FundTracer banner appears
- "Blockchain Wallet Forensics & Analysis Tool"
- Provider status widget
- Quick start menu

### Recording notes:
- Wait for full banner animation (if any)
- Let dashboard display for 3 seconds
- Keep cursor blinking at bottom

---

## SCENE 4: SYBIL DETECTION (0:35-0:55)

### Commands to type:
```
$ fundtracer compare 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 0x8ba1f109551bD432803012645Hac136c82C3e72c 0xdAC17F958D2ee523a2206206994597C13D831ec7
```

### Alternative (if you want real addresses):
```
$ fundtracer compare --file test-addresses.txt
```

### What happens:
1. Command typed
2. Analysis runs (spinner shows)
3. Results appear showing:
   - "150 wallets analyzed"
   - "3 clusters detected"
   - Risk distribution table
   - Flagged clusters

### Recording notes:
- Let the full analysis complete (don't cut early)
- Wait for final "Analysis complete" message
- Let results sit on screen for 2 seconds

---

## SCENE 5: SPEED COMPARISON (0:55-1:15)

### Split screen recording technique:
Record this in TWO separate clips:

#### Clip A: Traditional tool (left side)
```
$ echo "Analyzing with single API key..."
$ sleep 5
$ echo "Still loading... (2:34 elapsed)"
$ sleep 3
$ echo "Complete but slow"
```

#### Clip B: FundTracer (right side)
```
$ fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --depth 3
```

### Recording notes:
- Record each side separately
- In CapCut, place side by side
- Speed up Clip A to show slowness
- Keep Clip B at normal speed (showing it's fast)
- Add "20x Faster" text overlay

---

## SCENE 6: MULTI-CHAIN (1:15-1:30)

### Commands (type each, wait 2 seconds between):
```
$ fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --chain ethereum
```

Wait for output, then:
```
$ fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --chain linea
```

Wait, then:
```
$ fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --chain arbitrum
```

### Visual effect:
- Show quick cuts between each chain
- Each shows different chain name in output
- Keeps same address (shows consistency)

---

## SCENE 7: PROFESSIONAL UI (1:30-1:45)

### Showcase features in order:

1. **History:**
```
$ fundtracer
# Select "History" from menu
# Scroll through history list
```

2. **Favorites:**
```
# Select "Favorites" from menu
# Show favorites list
```

3. **Watch Mode:**
```
# Select "Watch Mode"
# Enter address
# Select chain
# Show countdown timer
# Let it run for 5 seconds
# Press Ctrl+C to exit
```

### Recording notes:
- Quick cuts between each feature (2-3 seconds each)
- Show [Back] buttons being used
- Demonstrate smooth navigation

---

## SCENE 8: CALL TO ACTION (1:45-2:00)

### Final commands:
```
$ clear
$ echo "FundTracer"
$ echo "Built for professionals"
$ echo "github.com/Deji-Tech/fundtracer"
```

### Visual:
- Clean terminal
- Text centered
- FundTracer logo/banner at top (if possible)

---

## POST-RECORDING CHECKLIST

- [ ] All 8 scenes recorded separately
- [ ] No typos or errors in terminal
- [ ] Consistent terminal size throughout
- [ ] Font is readable at 1080p
- [ ] Dark background maintained
- [ ] Cursor visible and blinking
- [ ] No personal info visible
- [ ] Commands execute successfully

## CAPCUT IMPORT ORDER

1. Scene 1 (0:00-0:10)
2. Scene 2 (0:10-0:25)
3. Scene 3 (0:25-0:35)
4. Scene 4 (0:35-0:55)
5. Scene 5 Clip A (0:55-1:15)
6. Scene 5 Clip B (0:55-1:15) - side by side
7. Scene 6 (1:15-1:30)
8. Scene 7 (1:30-1:45)
9. Scene 8 (1:45-2:00)

## TECHNICAL SPECS FOR RECORDING

- **Resolution:** 1920x1080 (we'll crop to 1080x1920 in CapCut)
- **Frame rate:** 30fps
- **Format:** MP4
- **Codec:** H.264
- **Audio:** None (add music in post)

## TIPS FOR CLEAN RECORDING

1. **Practice first:** Run through all commands once before recording
2. **Type slowly:** For video, slower typing looks more deliberate
3. **Pause between commands:** Give viewer time to read
4. **No mouse:** Use keyboard only (looks more professional)
5. **Clean desktop:** Hide desktop icons, close other apps
6. **Good lighting:** If recording yourself, but for screen only - just ensure terminal is crisp

---

Ready to record? Start with Scene 1 and work through each scene!
