const inputText = document.getElementById("inputText")
const outputText = document.getElementById("outputText")

const inputLang = document.getElementById("inputLang")
const outputLang = document.getElementById("outputLang")

const flagInput = document.getElementById("flagInput")
const flagOutput = document.getElementById("flagOutput")

let timer = null

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

function updateFlags() {
    flagInput.src = `https://flagcdn.com/${flags[inputLang.value]}.svg`
    flagOutput.src = `https://flagcdn.com/${flags[outputLang.value]}.svg`
}

inputLang.addEventListener("change", updateFlags)
outputLang.addEventListener("change", updateFlags)

async function translate() {
    if (inputText.value.trim() === "") {
        outputText.value = ""
        return
    }
    const MAX = 450
    const text = inputText.value
    // pecah teks menjadi beberapa bagian
    const chunks = []
    for (let i = 0; i < text.length; i += MAX) {
        chunks.push(text.substring(i, i + MAX))
    }
    outputText.value = "Translating..."
    let result = ""
    for (const part of chunks) {
        const url =
            "https://api.mymemory.translated.net/get?q=" +
            encodeURIComponent(part) +
            "&langpair=" +
            inputLang.value +
            "|" +
            outputLang.value
        const res = await fetch(url)
        const data = await res.json()
        result += data.responseData.translatedText + " "
    }
    outputText.value = result.trim()
    outputText.scrollTop = 0
}

inputText.addEventListener("input", () => {
    document.getElementById("charCount").innerText =
        "Character: " + inputText.value.length
    clearTimeout(timer)
    timer = setTimeout(() => {
        translate()
    }, 3000)
})

document.getElementById("translateBtn").onclick = translate

document.getElementById("reverseBtn").onclick = () => {
    let a = inputLang.value
    inputLang.value = outputLang.value
    outputLang.value = a
    let t = inputText.value
    inputText.value = outputText.value
    outputText.value = t
    updateFlags()
}

function speak(text, lang) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    speechSynthesis.speak(utterance)
}

document.getElementById("speakInput").onclick = () => {
    speak(inputText.value, inputLang.value)
}

document.getElementById("speakOutput").onclick = () => {
    speak(outputText.value, outputLang.value)
}

document.getElementById("copyInput").onclick = () => {
    navigator.clipboard.writeText(inputText.value)
}

document.getElementById("copyOutput").onclick = () => {
    navigator.clipboard.writeText(outputText.value)
}

function saveHistory(i, o) {
    let li = document.createElement("li")
    li.innerText = i + " → " + o
    history.appendChild(li)
}

document.getElementById("themeBtn").onclick = () => {
    document.body.classList.toggle("light")
}

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
    window.open("https://facebook.com/intent/tweet?text=" + shareMsg())
}

function copyGopay() {
    navigator.clipboard.writeText("+6285158822803")
    alert("GoPay number copied")
}

function copyDana() {
    navigator.clipboard.writeText("+6285159922358")
    alert("Dana number copied")
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

if (SpeechRecognition) {
    const recognition = new SpeechRecognition()
    recognition.onresult = function (e) {
        inputText.value = e.results[0][0].transcript
        translate()
    }
    document.getElementById("mic").onclick = () => {
        recognition.start()
    }
}

updateFlags()

function setLang(code) {
    outputLang.value = code
    updateFlags()
    translate()
}

outputLang.value = "de"
updateFlags()

const templates = {
    hotel:
        "Guest: Good evening. I have a reservation.\nReceptionist: Welcome. May I have your name please?\nGuest: My name is John Smith.\nReceptionist: Thank you Mr Smith. Here is your room key.",
    airport:
        "Passenger: Good morning. I want to check in.\nStaff: May I see your passport?\nPassenger: Here you go.\nStaff: Thank you. Your gate is A12.",
    restaurant:
        "Customer: Hello, a table for two please.\nWaiter: Sure, please follow me.\nCustomer: Can we see the menu?\nWaiter: Of course.",
    shopping:
        "Customer: Excuse me, how much is this?\nShopkeeper: It is twenty dollars.\nCustomer: Can I get a discount?\nShopkeeper: I can give ten percent."
}

document.getElementById("templateSelect").onchange = function () {
    const val = this.value
    if (templates[val]) {
        inputText.value = templates[val]
        triggerAutoTranslate()
    }
}

document.getElementById("generatePrompt").onclick = async function () {
    const prompt = document.getElementById("promptInput").value.trim()
    const mode = document.getElementById("templateSelect").value
    if (!prompt) return
    inputText.value = "AI is thinking..."
    try {
        let systemPrompt = ""
        if (mode === "story") {
            systemPrompt = "Write a short simple English story."
        } else if (mode === "grammar") {
            systemPrompt = "Fix grammar and rewrite the sentence correctly."
        } else if (mode === "simplify") {
            systemPrompt = "Rewrite the sentence using simple English."
        } else if (mode === "bilingual") {
            systemPrompt = "Create a bilingual dialogue English and Indonesian."
        } else {
            systemPrompt = "Generate a natural English conversation."
        }
        const result = await askAI(prompt, systemPrompt)
        inputText.value = result
        document.getElementById("charCount").innerText =
            "Character: " + result.length
        translate()
    } catch (err) {
        inputText.value = "AI generation error"
    }
}

document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

document.onkeydown = function (e) {
    if (e.keyCode == 123) { // F12
        return false;
    }
    if (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) {
        return false;
    }
    if (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) {
        return false;
    }
    if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) {
        return false;
    }
}

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

function triggerAutoTranslate() {
    document.getElementById("charCount").innerText =
        "Character: " + inputText.value.length
    clearTimeout(timer)
    timer = setTimeout(() => {
        translate()
    }, 3000)
}