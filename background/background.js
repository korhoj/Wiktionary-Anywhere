const GOOGLE_SPEECH_URI = 'https://www.google.com/speech-api/v1/synthesize',

    DEFAULT_HISTORY_SETTING = {
        enabled: true
    };

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { word, lang } = request, 
        url = `https://${lang}.wiktionary.org/wiki/${word}`;
    
    fetch(url, { 
            method: 'GET',
            credentials: 'omit'
        })
        .then((response) => response.text())
        .then((text) => {
            const document = new DOMParser().parseFromString(text, 'text/html'),
                content = extractMeaning(document, { word, lang });

            sendResponse({ content });

            content && browser.storage.local.get().then((results) => {
                let history = results.history || DEFAULT_HISTORY_SETTING;
        
                history.enabled && saveWord(content)
            });
        })

    return true;
});

function extractMeaning (document, context) {
    //if (!document.querySelector("[data-dobid='hdw']")) { return null; }
    if (!document.querySelector("span[class='mw-page-title-main']")) { return null; }
    
    /*var word = document.querySelector("[data-dobid='hdw']").textContent,
        definitionDiv = document.querySelector("div[data-dobid='dfn']"),
        meaning = "";*/
    /*<span class="mw-page-title-main">injures</span>
    <span class="mw-headline" id="English">English</span>
    <div class="mw-parser-output">
    <span class="mw-headline" id="Verb">Verb</span>*/
    
    var word = document.querySelector("span[class='mw-page-title-main']").textContent,
        definitionDiv = document.querySelector("div[class='mw-parser-output']"),
        meaning = "";
    
    if (definitionDiv) {
        /*definitionDiv.querySelectorAll("span").forEach(function(span){
            meaning = meaning + span.textContent;
            if(!span.querySelector("sup"))
                 meaning = meaning + span.textContent;
        });*/
        
        definitionDiv.querySelectorAll("span").forEach(function(span){
            meaning = meaning + span.textContent;
        });
    }

    meaning = meaning[0].toUpperCase() + meaning.substring(1);

    var audio = document.querySelector("audio[jsname='QInZvb']"),
        source = document.querySelector("audio[jsname='QInZvb'] source"),
        audioSrc = source && source.getAttribute('src');

    if (audioSrc) {
        !audioSrc.includes("http") && (audioSrc = audioSrc.replace("//", "https://"));
    }
    else if (audio) {
        let exactWord = word.replace(/·/g, ''), // We do not want syllable seperator to be present.
            
        queryString = new URLSearchParams({
            text: exactWord, 
            enc: 'mpeg', 
            lang: context.lang, 
            speed: '0.4', 
            client: 'lr-language-tts', 
            use_google_only_voices: 1
        }).toString();

        audioSrc = `${GOOGLE_SPEECH_URI}?${queryString}`;
    }

    return { word: word, meaning: meaning, audioSrc: audioSrc };
};

function saveWord (content) {
    let word = content.word,
        meaning = content.meaning,
      
        storageItem = browser.storage.local.get('definitions');

        storageItem.then((results) => {
            let definitions = results.definitions || {};

            definitions[word] = meaning;
            browser.storage.local.set({
                definitions
            });
        })
}
