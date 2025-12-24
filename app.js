/* ============================================================
   POMPR-FUN v1.0 — Application Logic
   Clean, readable, fully-commented build
   ============================================================ */


/* ============================================================
   GLOBAL STATE
   ============================================================ */

const PFState = {
    scene: "",
    character: "",
    action: "",
    background: "",
    pattern: {
        type: "",
        hex: "",
        scale: 40,
        recent: []
    },
    editorLocked: true,
    csvData: {
        scenes: [],
        characters: [],
        actions: [],
        backgrounds: []
    }
};


/* ============================================================
   UTILITY HELPERS
   ============================================================ */

/**
 * Returns true if a string matches HEX format (#RRGGBB)
 */
function isValidHex(hex) {
    return /^#[0-9A-F]{6}$/i.test(hex);
}

/**
 * Capitalizes the first letter of a string
 */
function cap(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Shuffles an array — used by Randomix
 */
function shuffle(arr) {
    let a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Detect whether a scene describes a physical location
function isLocationalScene(sceneText) {
  if (!sceneText) return false;

  const locationalKeywords = [
    "airport",
    "cafe",
    "beach",
    "corridor",
    "street",
    "room",
    "office",
    "classroom",
    "gate",
    "counter",
    "shoreline",
    "hallway",
    "station",
    "market",
    "alley",
    "platform",
    "terminal"
  ];

  return locationalKeywords.some(keyword =>
    sceneText.toLowerCase().includes(keyword)
  );
}

/* ============================================================
   CSV LOADER
   Loads CSV files from /csv/*.csv and populates dropdowns
   ============================================================ */

/**
 * Loads a CSV file from a path and returns its parsed rows.
 * Expected CSV format: name,desc
 */
async function loadCSV(path) {
    const response = await fetch(path);
    const text = await response.text();

    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {   // skip header
        const [name, desc] = lines[i].split(",");
        if (name) {
            rows.push({ name: name.trim(), desc: (desc || "").trim() });
        }
    }

    return rows;
}

/**
 * Populates a <select> with CSV rows
 */
function populateDropdown(elementId, rows, placeholder) {
    const el = document.getElementById(elementId);
    el.innerHTML = `<option value="">-- ${placeholder} --</option>`;

    rows.forEach(row => {
        const opt = document.createElement("option");
        opt.value = row.name;
        opt.textContent = row.name;
        el.appendChild(opt);
    });
}

/**
 * Master CSV loader (called on page load)
 */
async function loadAllCSVs() {
    PFState.csvData.scenes      = await loadCSV("csv/scenes.csv");
    PFState.csvData.characters  = await loadCSV("csv/characters.csv");
    PFState.csvData.actions     = await loadCSV("csv/actions.csv");
    PFState.csvData.backgrounds = await loadCSV("csv/backgrounds.csv");

    populateDropdown("scene-select",     PFState.csvData.scenes,      "Select a Scene");
    populateDropdown("character-select", PFState.csvData.characters,  "Select a Character");
    populateDropdown("action-select",    PFState.csvData.actions,     "Select an Action");
    populateDropdown("background-select",PFState.csvData.backgrounds, "Select a Background");
}
/* ============================================================
   UI ELEMENT REFERENCES
   ============================================================ */

const el = {
    scene:          document.getElementById("scene-select"),
    character:      document.getElementById("character-select"),
    action:         document.getElementById("action-select"),
    background:     document.getElementById("background-select"),

    patternPanel:   document.getElementById("panel-pattern"),
    patternType:    document.getElementById("pattern-type"),
    patternHex:     document.getElementById("pattern-color"),
    patternScale:   document.getElementById("pattern-scale"),
    patternRecent:  document.getElementById("pattern-recent"),

    editPrompt:     document.getElementById("edit-prompt"),
    compiledOutput: document.getElementById("compiled-output"),

    unlockEditor:   document.getElementById("unlock-editor"),
    newPrompt:      document.getElementById("new-prompt"),

    compileBtn:     document.getElementById("compile-prompt"),
    randomixBtn:    document.getElementById("randomix")
};


/* ============================================================
   DROPDOWN EVENT LISTENERS
   ============================================================ */

el.scene.addEventListener("change", e => {
    PFState.scene = e.target.value;
    refreshEditor();
});

el.character.addEventListener("change", e => {
    PFState.character = e.target.value;
    refreshEditor();
});

el.action.addEventListener("change", e => {
    PFState.action = e.target.value;
    refreshEditor();
});

el.background.addEventListener("change", e => {
    PFState.background = e.target.value;
    handleBackgroundChange();
    refreshEditor();
});


/* ============================================================
   BACKGROUND LOGIC (PATTERN ENABLE/DISABLE)
   ============================================================ */

/**
 * Called whenever background dropdown changes.
 * Determines whether pattern module is available.
 */
function handleBackgroundChange() {

    const bg = PFState.background.toLowerCase();

    const chromaModes = ["blue chroma", "green chroma", "white screen", "white chroma"];
    const isChroma = chromaModes.some(mode => bg.includes(mode));

    if (isChroma) {
        disablePatternPanel();
    } else {
        enablePatternPanel();
    }
}

function disablePatternPanel() {
    el.patternPanel.classList.add("disabled");
    el.patternPanel.classList.remove("active");
}

function enablePatternPanel() {
    el.patternPanel.classList.add("active");
    el.patternPanel.classList.remove("disabled");
}


/* ============================================================
   EDITOR LOCK / UNLOCK BEHAVIOR
   ============================================================ */

/**
 * Editor starts locked. User must press Unlock to edit manually.
 */
el.unlockEditor.addEventListener("click", () => {
    PFState.editorLocked = !PFState.editorLocked;

    if (PFState.editorLocked) {
        el.unlockEditor.textContent = "Unlock Editor";
        el.editPrompt.setAttribute("readonly", true);
        el.editPrompt.style.opacity = 0.6;
        refreshEditor(); // restore canonical text if re-locking
    } else {
        el.unlockEditor.textContent = "Lock Editor";
        el.editPrompt.removeAttribute("readonly");
        el.editPrompt.style.opacity = 1;
    }
});


/**
 * Clears all selections and resets UI.
 */
el.newPrompt.addEventListener("click", () => {
    PFState.scene = "";
    PFState.character = "";
    PFState.action = "";
    PFState.background = "";

    el.scene.value = "";
    el.character.value = "";
    el.action.value = "";
    el.background.value = "";

    PFState.pattern = { type: "", hex: "", scale: 40, recent: [] };
    el.patternType.value = "";
    el.patternHex.value = "";
    el.patternScale.value = 40;
    el.patternRecent.innerHTML = "";

    PFState.editorLocked = true;
    el.unlockEditor.textContent = "Unlock Editor";
    el.editPrompt.setAttribute("readonly", true);
    el.editPrompt.style.opacity = 0.6;

    el.editPrompt.value = "";
    el.compiledOutput.value = "";
});
/* ============================================================
   PATTERN MODULE — EVENT LISTENERS + STATE SYNC
   ============================================================ */

/* -----------------------------
   PATTERN TYPE
------------------------------*/

el.patternType.addEventListener("change", e => {
    PFState.pattern.type = e.target.value;
    refreshEditor();
});


/* -----------------------------
   HEX COLOR INPUT
------------------------------*/

el.patternHex.addEventListener("input", e => {
    const val = e.target.value.toUpperCase();

    // Ensure leading #
    let hex = val.startsWith("#") ? val : "#" + val;

    // Update visual field
    el.patternHex.value = hex;

    if (isValidHex(hex)) {
        el.patternHex.classList.remove("invalid");
        PFState.pattern.hex = hex;

        storeRecentColor(hex);
        renderRecentColors();
        refreshEditor();
    } else {
        el.patternHex.classList.add("invalid");
    }
});


/* -----------------------------
   STORE RECENT COLORS (max 5)
------------------------------*/

function storeRecentColor(hex) {
    if (!isValidHex(hex)) return;

    // Remove duplicates
    PFState.pattern.recent = PFState.pattern.recent.filter(c => c !== hex);

    // Add newest to front
    PFState.pattern.recent.unshift(hex);

    // Limit to 5
    if (PFState.pattern.recent.length > 5) {
        PFState.pattern.recent.pop();
    }
}


/* -----------------------------
   RENDER RECENT COLOR SWATCHES
------------------------------*/

function renderRecentColors() {
    el.patternRecent.innerHTML = "";

    PFState.pattern.recent.forEach(color => {
        const swatch = document.createElement("div");
        swatch.className = "pattern-color-swatch";
        swatch.style.background = color;

        swatch.addEventListener("click", () => {
            el.patternHex.value = color;
            PFState.pattern.hex = color;

            // re-order so selected moves to top
            storeRecentColor(color);
            renderRecentColors();
            refreshEditor();
        });

        el.patternRecent.appendChild(swatch);
    });
}


/* -----------------------------
   SCALE SLIDER
------------------------------*/

el.patternScale.addEventListener("input", e => {
    const val = parseInt(e.target.value, 10);
    PFState.pattern.scale = val;
    refreshEditor();
});


/* ============================================================
   PATTERN SCALE → PHRASE MAPPING (for compiler)
   ============================================================ */

/**
 * Converts numeric scale (0–100) into phrase:
 * tiny, small, medium, large, very large
 */
function mapScaleToPhrase(scale) {
    if (scale <= 20)  return "tiny";
    if (scale <= 40)  return "small";
    if (scale <= 60)  return "medium";
    if (scale <= 80)  return "large";
    return "very large";
}
/* ============================================================
   EDITOR REFRESH (CORE LOGIC)
   Builds the editable prompt string based on current state
   ============================================================ */

function refreshEditor() {
    if (!PFState.editorLocked) return; 
    // When unlocked, user controls editor text manually.

    let parts = [];

    /* -----------------------------
       SCENE
    ------------------------------*/
    if (PFState.scene) {
        parts.push(PFState.scene);
    }

    /* -----------------------------
       CHARACTER
    ------------------------------*/
    if (PFState.character) {
        parts.push(PFState.character);
    }

    /* -----------------------------
       ACTION
    ------------------------------*/
    if (PFState.action) {
        parts.push(PFState.action);
    }

    /* -----------------------------
       BACKGROUND — includes chroma logic
    ------------------------------*/

    let backgroundPhrase = "";
    const bg = PFState.background.toLowerCase();

    if (bg.includes("chroma")) {
        // Force-safe chroma phrasing
        if (bg.includes("blue"))  backgroundPhrase = "against a seamless blue chroma field";
        if (bg.includes("green")) backgroundPhrase = "against a seamless green chroma field";
        if (bg.includes("white")) backgroundPhrase = "against a seamless white screen background";
    } 
    else if (PFState.background) {
        backgroundPhrase = PFState.background;
    }

    if (backgroundPhrase) {
        parts.push(backgroundPhrase);
    }

    /* -----------------------------
       PATTERN BACKGROUND (enabled only if not chroma)
    ------------------------------*/

    const bgIsChroma = (
        bg.includes("blue chroma") ||
        bg.includes("green chroma") ||
        bg.includes("white chroma") ||
        bg.includes("white screen")
    );

    if (!bgIsChroma && PFState.pattern.type) {

        let scalePhrase = mapScaleToPhrase(PFState.pattern.scale);
        let finalColor = PFState.pattern.hex || "";

        let patternPhrase = "";

        if (finalColor && isValidHex(finalColor)) {
            patternPhrase = `against a ${scalePhrase} ${PFState.pattern.type} pattern in ${finalColor}`;
        } else {
            patternPhrase = `against a ${scalePhrase} ${PFState.pattern.type} pattern`;
        }

        parts.push(patternPhrase);
    }

    /* -----------------------------
       ASSEMBLE EDITABLE PROMPT
    ------------------------------*/

    let finalText = parts.join(", ") + ".";

    // If empty, clear gracefully
    if (finalText === ".") finalText = "";

    el.editPrompt.value = finalText;
}
/* ============================================================
   RANDOMIX — FUN RANDOMIZER ENGINE
   ============================================================ */

/**
 * Picks a random element from an array.
 */
function pickRandom(arr) {
    if (!arr || arr.length === 0) return "";
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Picks a random HEX color.
 */
function randomHex() {
    const hex = "#" + Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
        .toUpperCase();
    return hex;
}

/**
 * Picks a random pattern scale (0–100).
 */
function randomScale() {
    return Math.floor(Math.random() * 101);
}


/**
 * Determines whether a background is a chroma type.
 */
function isChromaBackground(bgName) {
    if (!bgName) return false;
    const bg = bgName.toLowerCase();
    return (
        bg.includes("chroma") ||
        bg.includes("white screen")
    );
}


/* ============================================================
   MAIN RANDOMIX HANDLER
   ============================================================ */

el.randomixBtn.addEventListener("click", () => {
    // Random scene, character, action
    PFState.scene     = pickRandom(PFState.csvData.scenes)?.name || "";
    PFState.character = pickRandom(PFState.csvData.characters)?.name || "";
    PFState.action    = pickRandom(PFState.csvData.actions)?.name || "";

    // Update dropdown UI
    el.scene.value     = PFState.scene;
    el.character.value = PFState.character;
    el.action.value    = PFState.action;

    // ------------------------------------------------------------
    // Background & Pattern Randomix (FUN Rules Applied)
    // ------------------------------------------------------------

    // Default reset
    PFState.background = "";
    el.background.value = "";

    PFState.pattern.type = "";
    PFState.pattern.hex = "";
    PFState.pattern.scale = 40;

    el.patternType.value = "";
    el.patternHex.value = "";
    el.patternScale.value = 40;
    el.patternRecent.innerHTML = "";

    disablePatternPanel();

    const sceneIsLocational =
        PFState.scene && isLocationalScene(PFState.scene);

    // RULE 2: If scene is locational, suppress background & pattern
    if (!sceneIsLocational) {

        // Background allowed (~55–60%)
        if (Math.random() < 0.58) {
            PFState.background =
                pickRandom(PFState.csvData.backgrounds)?.name || "";
            el.background.value = PFState.background;

            const chroma = isChromaBackground(PFState.background);

            // RULE 1: Pattern only allowed if background exists AND is not chroma
            if (!chroma && Math.random() < 0.28) {

                const patternTypes = [
                    "houndstooth", "diagonal stripe", "dot", "grid",
                    "chevron", "leopard", "wavy stripe",
                    "windowpane plaid", "tartan plaid",
                    "buffalo plaid", "madras plaid", "glen plaid"
                ];

                PFState.pattern.type = pickRandom(patternTypes) || "";
                el.patternType.value = PFState.pattern.type;

                PFState.pattern.hex = randomHex();
                el.patternHex.value = PFState.pattern.hex;

                PFState.pattern.scale = randomScale();
                el.patternScale.value = PFState.pattern.scale;

                storeRecentColor(PFState.pattern.hex);
                renderRecentColors();

                enablePatternPanel();
            }
        }
    }

    // Refresh editor with new randomized state
    refreshEditor();
});
/* ============================================================
   COMPILER — BUILDS THE FINAL OUTPUT PROMPT
   ============================================================ */

function compileFinalPrompt() {
    let parts = [];

    /* -----------------------------
       SCENE
    ------------------------------*/
    if (PFState.scene) {
        parts.push(PFState.scene);
    }

    /* -----------------------------
       CHARACTER
    ------------------------------*/
    if (PFState.character) {
        parts.push(PFState.character);
    }

    /* -----------------------------
       ACTION
    ------------------------------*/
    if (PFState.action) {
        parts.push(PFState.action);
    }


    /* =======================================================
       BACKGROUND (INCLUDES CHROMA → PATTERN LOCKOUT)
       ======================================================= */

    let bgPhrase = "";
    const bg = PFState.background.toLowerCase();

    const chromaModes = {
        "blue":  "against a seamless blue chroma field",
        "green": "against a seamless green chroma field",
        "white": "against a seamless white screen background"
    };

    if (bg.includes("chroma") || bg.includes("white screen")) {

        if (bg.includes("blue"))  bgPhrase = chromaModes.blue;
        if (bg.includes("green")) bgPhrase = chromaModes.green;
        if (bg.includes("white")) bgPhrase = chromaModes.white;

    } else if (PFState.background) {
        bgPhrase = PFState.background;
    }

    if (bgPhrase) {
        parts.push(bgPhrase);
    }


    /* =======================================================
       PATTERN BACKGROUND (ONLY IF NOT CHROMA)
       ======================================================= */

    const isChromaBG =
        bg.includes("chroma") || bg.includes("white screen");

    if (!isChromaBG && PFState.pattern.type) {

        let scalePhrase = mapScaleToPhrase(PFState.pattern.scale);
        let hexColor = PFState.pattern.hex;

        let patternPhrase = "";

        if (hexColor && isValidHex(hexColor)) {
            patternPhrase =
                `against a ${scalePhrase} ${PFState.pattern.type} pattern in ${hexColor}`;
        } else {
            patternPhrase =
                `against a ${scalePhrase} ${PFState.pattern.type} pattern`;
        }

        parts.push(patternPhrase);
    }


    /* =======================================================
       ASSEMBLE
       ======================================================= */

    let finalText = parts.join(", ") + ".";

    // Fix accidental anomalies:
    finalText = finalText.replace(/\s+,/g, ",");
    finalText = finalText.replace(/,,+/g, ",");
    finalText = finalText.replace(/\.\.+/g, ".");
    finalText = finalText.trim();

    // If the result is only a period, empty it.
    if (finalText === ".") finalText = "";

    // Output
    el.compiledOutput.value = finalText;

    return finalText;
}

/* ============================================================
   COMPILE BUTTON LISTENER
   ============================================================ */

el.compileBtn.addEventListener("click", () => {

    const editPromptEl = document.getElementById("edit-prompt");

    // If Edit Prompt is UNLOCKED, respect the edited text
    if (editPromptEl && !editPromptEl.hasAttribute("readonly")) {
        const editedText = editPromptEl.value.trim();

        if (!editedText) {
            alert("Edit Prompt is empty.");
            return;
        }

        el.compiledOutput.value = editedText;
        return;
    }

    // If Edit Prompt is LOCKED, use normal compile behavior
    compileFinalPrompt();
});


// ============================================================
// COPY COMPILED PROMPT TO CLIPBOARD
// ============================================================

const copyBtn = document.getElementById("copyBtn");
const compiledOutput = document.getElementById("compiled-output");

if (copyBtn && compiledOutput) {
    copyBtn.addEventListener("click", () => {
        if (!compiledOutput.value.trim()) {
            alert("Nothing to copy yet. Compile a prompt first.");
            return;
        }

        navigator.clipboard.writeText(compiledOutput.value)
            .then(() => {
                copyBtn.textContent = "Copied!";
                setTimeout(() => {
                    copyBtn.textContent = "Copy Prompt";
                }, 1200);
            })
            .catch(err => {
                console.error("Clipboard copy failed:", err);
                alert("Copy failed. Please select and copy manually.");
            });
    });
}

/* ============================================================
   EDITOR ↔ STATE ↔ COMPILER BRIDGE
   Ensures correct behavior whether editor is locked or unlocked
   ============================================================ */

/**
 * LISTEN FOR MANUAL EDITS
 * Only allowed when editor is unlocked.
 */
el.editPrompt.addEventListener("input", () => {
    if (!PFState.editorLocked) {
        // User is editing manually — preserve their custom text.
        // No automatic overrides occur here.
        return;
    }
    // If editor were locked (it shouldn't be editable), do nothing.
});


/* ============================================================
   FORCE-SYNC WHEN LOCKING EDITOR
   ============================================================ */

el.unlockEditor.addEventListener("click", () => {
    // Note: The click handler for unlockEditor already toggles lock state in Part 2.
    // This block here executes AFTER that logic and refreshes if needed.

    setTimeout(() => {
        if (PFState.editorLocked) {
            // User just re-locked the editor: regenerate canonical wording.
            refreshEditor();
        }
    }, 10);
});


/* ============================================================
   STATE CHANGE HANDLER (for future expansions)
   ============================================================ */

/**
 * Central place to handle any chain reactions caused by UI changes.
 * Currently refreshes editor, but allows room for future modules.
 */
function propagateState() {
    // When editor is locked, refreshing editor keeps everything canonical.
    refreshEditor();

    // Future hooks may sit here:
    // - auto-tooltip updates
    // - validation warnings
    // - preview rendering
}


/* ============================================================
   REGENERATE COMPILED OUTPUT WHEN STATES CHANGE
   (ONLY when editor is locked)
   ============================================================ */

/**
 * If user hasn't unlocked the editor, the compiled output should
 * always reflect current state.
 */
function autoUpdateCompiled() {
    if (PFState.editorLocked) {
        compileFinalPrompt();
    }
}
/* ============================================================
   INITIALIZATION — FIRE ON PAGE LOAD
   Loads CSVs, sets initial UI states, prepares app for use.
   ============================================================ */

async function initializePOMPRFun() {

    /* -----------------------------
       1) LOAD CSV FILES
    ------------------------------*/
    await loadAllCSVs();


    /* -----------------------------
       2) PREPARE UI DEFAULTS
    ------------------------------*/

    // Editor starts locked and read-only
    PFState.editorLocked = true;
    el.editPrompt.setAttribute("readonly", true);
    el.editPrompt.style.opacity = 0.6;

    // Clear text fields
    el.editPrompt.value = "";
    el.compiledOutput.value = "";

    // Clear pattern UI
    PFState.pattern = { type: "", hex: "", scale: 40, recent: [] };
    el.patternType.value = "";
    el.patternHex.value = "";
    el.patternScale.value = 40;
    el.patternRecent.innerHTML = "";

    // Pattern panel starts neutral/inactive until a background is chosen
    el.patternPanel.classList.remove("active", "disabled");


    /* -----------------------------
       3) INITIAL EDITOR REFRESH
    ------------------------------*/

    // No prompt built yet, but ensures clean beginning state
    refreshEditor();


    /* -----------------------------
       4) INITIAL COMPILE
    ------------------------------*/

    // Empty for now, but ensures consistent initial state
    compileFinalPrompt();


    /* -----------------------------
       5) STARTUP CONFIRMATION (optional)
    ------------------------------*/

    console.log("%cPOMPR-FUN v1.0 initialized successfully.",
        "color:#6eb6ff; font-size:14px;");
}


/* ============================================================
   LAUNCH APP ON PAGE LOAD
   ============================================================ */

// Run initialization after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    initializePOMPRFun();
});
/* ============================================================
   FINAL SAFETY + FALLBACK SYSTEMS
   Ensures app stability even if unexpected states occur.
   ============================================================ */

/**
 * Ensures no undefined or null values are allowed into editor/compiler.
 * Returns empty string instead of invalid values.
 */
function safe(str) {
    return (str === undefined || str === null) ? "" : String(str);
}

/**
 * Ensures any UI updates that rely on dropdowns
 * do not break if CSVs are incomplete or missing.
 */
function safeDropdownValue(el) {
    return el && el.value ? el.value : "";
}


/* ============================================================
   AUTO-CLEANER FOR PHRASES (FUTURE PRO COMPATIBILITY)
   Removes accidental spacing/punctuation issues globally.
   ============================================================ */

function cleanPhrase(str) {
    if (!str) return "";

    return str
        .replace(/\s+,/g, ",")
        .replace(/,,+/g, ",")
        .replace(/\s+/g, " ")
        .replace(/\.\.+/g, ".")
        .trim();
}


/* ============================================================
   EXPORT HOOK (FUTURE POMPR-PRO COMPATIBILITY)
   Not used in FUN v1.0, but safe to exist.
   Allows PRO to import/export JSON scene structures.
   ============================================================ */

function exportPOMPRFunState() {
    return JSON.stringify({
        scene: PFState.scene,
        character: PFState.character,
        action: PFState.action,
        background: PFState.background,
        pattern: {
            type: PFState.pattern.type,
            hex: PFState.pattern.hex,
            scale: PFState.pattern.scale
        },
        editorLocked: PFState.editorLocked,
        editContent: el.editPrompt.value,
        compiled: el.compiledOutput.value
    }, null, 2);
}

// For debugging: window.exportPOMPRFunState = exportPOMPRFunState;


/* ============================================================
   CATCH-ALL EVENT SYNC (optional future behavior)
   Triggers auto-compile whenever UI fields lose focus.
   ============================================================ */

document.addEventListener("change", () => {
    autoUpdateCompiled();
});

document.addEventListener("input", () => {
    autoUpdateCompiled();
});


/* ============================================================
   FINAL LOG
   ============================================================ */

console.log("%cPOMPR-FUN v1.0 JavaScript fully loaded.",
    "color:#8fe4ff; font-size:14px; font-weight:bold;");
