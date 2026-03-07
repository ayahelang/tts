const inputText = document.getElementById("inputText")
const outputText = document.getElementById("outputText")

const inputLang = document.getElementById("inputLang")
const outputLang = document.getElementById("outputLang")

const flagInput = document.getElementById("flagInput")
const flagOutput = document.getElementById("flagOutput")

// FLAGS
const flags = {
    id: "id",
    en: "us",
    fr: "fr",
    zh: "cn",
    de: "de"
}

// UPDATE FLAG
function updateFlags() {
    flagInput.src = `https://flagcdn.com/${flags[inputLang.value]}.svg`
    flagOutput.src = `https://flagcdn.com/${flags[outputLang.value]}.svg`
}

inputLang.addEventListener("change", updateFlags)
outputLang.addEventListener("change", updateFlags)

// AUTO TRANSLATE
inputText.addEventListener("input", translate)

function translate() {

    if (inputText.value.trim() === "") {
        outputText.value = ""
        return
    }

    fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            q: inputText.value,
            source: inputLang.value,
            target: outputLang.value,
            format: "text"
        })
    })
        .then(res => res.json())
        .then(data => {
            outputText.value = data.translatedText
        })
}

// TEXT TO SPEECH
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

// COPY
document.getElementById("copyInput").onclick = () => {
    navigator.clipboard.writeText(inputText.value)
}

document.getElementById("copyOutput").onclick = () => {
    navigator.clipboard.writeText(outputText.value)
}