let speakingBox = null
let currentSpeech = null
let speechState = "stopped"

let ttsInterval = null
let ttsDuration = 0
let ttsStart = 0
let ttsElapsed = 0

let karaokeTimer = null
let holdTimer = null
let longPressTriggered = false

const HOLD_TIME = 600

const inputText = document.getElementById("inputText")
const outputText = document.getElementById("outputText")

const inputLang = document.getElementById("inputLang")
const outputLang = document.getElementById("outputLang")

const flagInput = document.getElementById("flagInput")
const flagOutput = document.getElementById("flagOutput")

let timer = null

/* FLAG MAP */

const flags = {
    ar: "sa",
    nl: "nl",
    en: "us",
    fil: "ph",
    fr: "fr",
    de: "de",
    he: "il",
    hi: "in",
    id: "id",
    it: "it",
    ja: "jp",
    ko: "kr",
    es: "es",
    th: "th",
    vi: "vn",
    zh: "cn"
}

/* ============================= */
/* AI GENERATOR */
/* ============================= */

async function askAI(prompt, systemPrompt) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": "Bearer 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",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ]
        })
    })
    const data = await response.json()
    return data.choices[0].message.content
}

/* ============================= */
/* FLAG UPDATE */
/* ============================= */

function updateFlags() {
    flagInput.src = `https://flagcdn.com/${flags[inputLang.value]}.svg`
    flagOutput.src = `https://flagcdn.com/${flags[outputLang.value]}.svg`
}

inputLang.addEventListener("change", updateFlags)
outputLang.addEventListener("change", updateFlags)

/* ============================= */
/* TRANSLATE ENGINE */
/* ============================= */

async function translate() {
    const text = inputText.innerText.trim()
    if (!text) {
        outputText.innerHTML = ""
        return
    }
    outputText.innerHTML = "Translating..."
    const MAX = 450
    const chunks = []
    for (let i = 0; i < text.length; i += MAX) {
        chunks.push(text.substring(i, i + MAX))
    }
    let result = ""
    try {
        for (const part of chunks) {
            const url =
                "https://api.mymemory.translated.net/get?q=" +
                encodeURIComponent(part) +
                "&langpair=" +
                inputLang.value + "|" + outputLang.value
            const res = await fetch(url)
            const data = await res.json()
            if (!data.responseData) {
                throw "limit"
            }
            result += data.responseData.translatedText
        }
        outputText.innerHTML = result
    } catch {
        outputText.innerHTML =
            `⚠ Translation limit reached.<br><br>
        You may try again tomorrow.<br><br>
        Meanwhile the original text is copied here so you can still use the speech feature.<br><br>
        ------------------------------<br>
        ${text}`
    }
}

/* ============================= */
/* AUTO TRANSLATE */
/* ============================= */

inputText.addEventListener("input", () => {
    document.getElementById("charCount").innerText =
        "Character: " + inputText.innerText.length
    clearTimeout(timer)
    timer = setTimeout(() => {
        translate()
    }, 3000)
})

/* ============================= */
/* TRANSLATE BUTTON */
/* ============================= */

document.getElementById("translateBtn").onclick = translate

/* ============================= */
/* REVERSE LANGUAGE */
/* ============================= */

document.getElementById("reverseBtn").onclick = () => {
    let a = inputLang.value
    inputLang.value = outputLang.value
    outputLang.value = a
    let t = inputText.innerText
    inputText.innerText = outputText.innerText
    outputText.innerText = t
    updateFlags()
}

/* ============================= */
/* TEXT TO SPEECH */
/* ============================= */

function speak(text, lang, source) {
    const btn = source === "input"
        ? document.querySelector("#speakInput i")
        : document.querySelector("#speakOutput i")
    if (!text) return
    /* STOP OTHER BOX */
    if (speakingBox && speakingBox !== source) {
        speechSynthesis.cancel()
        speechState = "stopped"
    }
    /* PAUSE */
    if (
        speechSynthesis.speaking &&
        speechState === "playing" &&
        speakingBox === source
    ) {
        speechSynthesis.pause()
        speechState = "paused"
        clearInterval(ttsInterval)
        btn.className = "fa fa-play"
        updateSpeakerTooltip()
        return
    }
    /* RESUME */
    if (speechState === "paused" && speakingBox === source) {
        speechSynthesis.resume()
        speechState = "playing"
        btn.className = "fa fa-pause"
        updateSpeakerTooltip()
        // lanjutkan timer lama
        ttsStart = Date.now() - (ttsElapsed * 1000)
        startTTSProgress(text)
        return
    }
    /* START NEW */
    speechSynthesis.cancel()
    currentSpeech = new SpeechSynthesisUtterance(text)
    currentSpeech.lang = lang
    speakingBox = source
    speechState = "playing"
    btn.className = "fa fa-pause"
    updateSpeakerTooltip()
    currentSpeech.onend = () => {
        speechState = "stopped"
        speakingBox = null
        document.querySelector("#speakInput i").className = "fa fa-volume-up"
        document.querySelector("#speakOutput i").className = "fa fa-volume-up"
        clearInterval(ttsInterval)
        document.getElementById("ttsFill").style.width = "100%"
    }
    /* KARAOKE HIGHLIGHT */
    if (source === "output") {
        karaokeBoundary(currentSpeech, outputText.innerText)
    }
    if (source === "input") {
        karaokeBoundary(currentSpeech, inputText.innerText)
    }
    speechSynthesis.speak(currentSpeech)
    startTTSProgress(text)
}

/* ============================= */
/* STOP SPEECH */
/* ============================= */

function stopSpeech() {
    speechSynthesis.cancel()
    speechState = "stopped"
    speakingBox = null
    document.querySelector("#speakInput i").className = "fa fa-volume-up"
    document.querySelector("#speakOutput i").className = "fa fa-volume-up"
    clearInterval(ttsInterval)
    document.getElementById("ttsFill").style.width = "0%"
    document.getElementById("ttsTime").innerText = "0:00 / 0:00"
    clearInterval(karaokeTimer)
}

/* ============================= */
/* SPEAKER TOOLTIP */
/* ============================= */

function updateSpeakerTooltip() {
    const inputBtn = document.getElementById("speakInput")
    const outputBtn = document.getElementById("speakOutput")
    if (speechState === "playing" || speechState === "paused") {
        inputBtn.title = "Press and hold to stop"
        outputBtn.title = "Press and hold to stop"
    }
    else {
        inputBtn.title = ""
        outputBtn.title = ""
    }
}

/* ============================= */
/* SPEAKER BUTTON EVENTS */
/* ============================= */

document.getElementById("speakInput").onclick = () => {
    if (longPressTriggered) {
        longPressTriggered = false
        return
    }
    speak(inputText.innerText, inputLang.value, "input")
}

document.getElementById("speakOutput").onclick = () => {

    if (longPressTriggered) {
        longPressTriggered = false
        return
    }
    speak(outputText.innerText, outputLang.value, "output")
}

/* ============================= */
/* COPY BUTTON */
/* ============================= */

document.getElementById("copyInput").onclick = () => {
    navigator.clipboard.writeText(inputText.innerText)
}

document.getElementById("copyOutput").onclick = () => {
    navigator.clipboard.writeText(outputText.innerText)
}

/* ============================= */
/* THEME SWITCH */
/* ============================= */

document.getElementById("themeBtn").onclick = () => {
    document.body.classList.toggle("light")
}

/* ============================= */
/* SHARE */
/* ============================= */

function shareMsg() {
    return encodeURIComponent(
        "Translate languages free with Silverhawk Translator 🦅 https://tts.silverhawk.web.id"
    )
}

function shareWA() {
    window.open("https://wa.me/?text=" + shareMsg())
}

function shareTG() {
    window.open("https://t.me/share/url?url=https://tts.silverhawk.web.id&text=" + shareMsg())
}

function shareFB() {
    window.open("https://facebook.com/sharer/sharer.php?u=https://tts.silverhawk.web.id")
}

/* ============================= */
/* DONATION COPY */
/* ============================= */

function copyGopay() {
    navigator.clipboard.writeText("+6285158822803")
    alert("GoPay number copied")
}

function copyDana() {
    navigator.clipboard.writeText("+6285159922358")
    alert("Dana number copied")
}

/* ============================= */
/* SPEECH RECOGNITION */
/* ============================= */

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition

if (SpeechRecognition) {
    const recognition = new SpeechRecognition()
    recognition.onresult = function (e) {
        inputText.innerText = e.results[0][0].transcript
        translate()
    }
    document.getElementById("mic").onclick = () => {
        recognition.start()
    }
}

/* ============================= */
/* LANGUAGE SHORTCUT */
/* ============================= */

function setLang(code) {
    outputLang.value = code
    updateFlags()
    translate()
}

outputLang.value = "de"
updateFlags()

/* ============================= */
/* AI PROMPT GENERATOR */
/* ============================= */

document.getElementById("generatePrompt").onclick = async function () {
    const prompt = document.getElementById("promptInput").value.trim()
    const mode = document.getElementById("templateSelect").value
    if (!prompt) return
    inputText.value = "AI is thinking..."

    try {
        let systemPrompt = ""
        if (mode === "story")
            systemPrompt = "Write a short simple English story."
        else if (mode === "grammar")
            systemPrompt = "Fix grammar and rewrite the sentence correctly."
        else if (mode === "simplify")
            systemPrompt = "Rewrite the sentence using simple English."
        else if (mode === "bilingual")
            systemPrompt = "Create a bilingual dialogue English and Indonesian."
        else
            systemPrompt = "Generate a natural English conversation."
        const result = await askAI(prompt, systemPrompt)
        inputText.innerText = result
        document.getElementById("charCount").innerText =
            "Character: " + result.length
        translate()
    }
    catch {
        inputText.value = "AI generation error"
    }
}

/* ============================= */
/* AUTO TEXT MENU */
/* ============================= */

const autoTextBtn = document.getElementById("autoTextBtn")
const autoTextMenu = document.getElementById("autoTextMenu")

autoTextBtn.onclick = () => {
    autoTextMenu.classList.toggle("show")
    if (autoTextMenu.classList.contains("show")) {
        resetAutoMenuTimer()
    }
}

autoTextMenu.addEventListener("input", resetAutoMenuTimer)
autoTextMenu.addEventListener("click", resetAutoMenuTimer)
let autoMenuTimer = null

function resetAutoMenuTimer() {
    clearTimeout(autoMenuTimer)
    autoMenuTimer = setTimeout(() => {
        autoTextMenu.style.transition = "opacity 1s"
        autoTextMenu.style.opacity = "0.05"
        setTimeout(() => {
            autoTextMenu.classList.remove("show")
            autoTextMenu.style.opacity = ""
        }, 1000)
    }, 13000)
}

/* ============================= */
/* AUTO TRANSLATE TRIGGER */
/* ============================= */

function triggerAutoTranslate() {
    document.getElementById("charCount").innerText =
        "Character: " + inputText.value.length
    clearTimeout(timer)
    timer = setTimeout(() => {
        translate()
    }, 3000)
}

/* ============================= */
/* LONG PRESS STOP */
/* ============================= */

function enableLongPress(buttonId) {
    const btn = document.getElementById(buttonId)
    btn.addEventListener("mousedown", () => {
        longPressTriggered = false
        holdTimer = setTimeout(() => {
            longPressTriggered = true
            stopSpeech()
        }, HOLD_TIME)
    })
    btn.addEventListener("mouseup", () => {
        clearTimeout(holdTimer)
    })
    btn.addEventListener("mouseleave", () => {
        clearTimeout(holdTimer)
    })
}

enableLongPress("speakInput")
enableLongPress("speakOutput")

/* ============================= */
/* TTS PROGRESS */
/* ============================= */

function estimateSpeechDuration(text) {
    const words = text.trim().split(/\s+/).length
    const rate = currentSpeech?.rate || 1
    const wordsPerMinute = 150 * rate
    return (words / wordsPerMinute) * 60
}

function startTTSProgress(text) {
    const timeBox = document.getElementById("ttsTime")
    const fill = document.getElementById("ttsFill")
    ttsDuration = estimateSpeechDuration(text)
    ttsStart = Date.now()
    clearInterval(ttsInterval)

    ttsInterval = setInterval(() => {
        const elapsed = (Date.now() - ttsStart) / 1000
        ttsElapsed = elapsed
        const percent = Math.min(elapsed / ttsDuration, 1)
        fill.style.width = (percent * 100) + "%"
        const format = (s) => {
            const m = Math.floor(s / 60)
            const sec = Math.floor(s % 60)
            return m + ":" + String(sec).padStart(2, "0")
        }
        timeBox.innerText =
            format(elapsed) + " / " + format(ttsDuration)
        if (percent >= 1) clearInterval(ttsInterval)
    }, 200)
}

/* ============================= */
/* KARAOKE HIGHLIGHT */
/* ============================= */

function karaokeBoundary(utterance, output) {
    const outBox = document.getElementById("outputText")
    const words = output.split(/(\s+)/) // simpan spasi & newline
    utterance.onboundary = function (event) {
        if (event.name !== "word") return
        const index = event.charIndex
        let charCount = 0
        let currentWord = 0
        for (let i = 0; i < words.length; i++) {
            charCount += words[i].length
            if (charCount > index) {
                currentWord = i
                break
            }
        }
        outBox.innerHTML = words.map((w, i) =>
            i === currentWord
                ? `<span class="wordActive">${w}</span>`
                : w
        ).join("")
    }
}

/* ============================= */
/* CLEANUP */
/* ============================= */

window.addEventListener("beforeunload", () => {
    speechSynthesis.cancel()
})

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        stopSpeech()
    }
})

inputText.addEventListener("paste", function (e) {
    e.preventDefault()
    const text = (e.clipboardData || window.clipboardData)
        .getData("text")
    document.execCommand("insertText", false, text)
})

let templates = {}

async function loadTemplates() {
    try {
        const res = await fetch("input.tpl")
        const text = await res.text()
        const sections = text.split(/\[(.*?)\]/)
        for (let i = 1; i < sections.length; i += 2) {
            const key = sections[i].trim()
            const value = sections[i + 1].trim()
            templates[key] = value
        }
        console.log("Templates loaded:", templates)
        // aktifkan template select setelah load selesai
        initTemplateSelector()
    } catch (e) {
        console.error("Template load error", e)
    }
}

loadTemplates()

function initTemplateSelector() {
    const selector = document.getElementById("templateSelect")
    selector.onchange = function () {
        const val = this.value
        if (!templates[val]) return
        inputText.innerText = templates[val]
        document.getElementById("charCount").innerText =
            "Character: " + inputText.innerText.length
        translate()
    }
}

/* ============================= */
/* BASIC DEVTOOLS PROTECTION */
/* ============================= */

/* Disable Right Click */

document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});


/* Disable Key Shortcuts */

document.addEventListener("keydown", function (e) {
    if (e.keyCode == 123) { // F12
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && e.shiftKey && e.keyCode == 73) { // Ctrl+Shift+I
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && e.shiftKey && e.keyCode == 74) { // Ctrl+Shift+J
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && e.keyCode == 85) { // Ctrl+U
        e.preventDefault();
        return false;
    }
});

/* ============================= */
/* DEVTOOLS DETECTOR */
/* ============================= */

(function () {
    function detectDevTools() {
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        if (widthThreshold || heightThreshold) {
            document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:20%'>DevTools detected</h1>";
        }
    }
    setInterval(detectDevTools, 1000);
})();

setInterval(function () {
    debugger;
}, 100);
