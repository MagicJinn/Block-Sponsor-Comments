var strings = new Set(); // Store strings to match
var selectors = [] // Store DOM selectors

var blockSelfPromotion = false

function EmbeddedURL(str) { // Get an embedded URL
    return chrome.runtime.getURL(str)
}

function Flatten(str) {
    if (str == undefined) return ""
    return str.toLowerCase().replace(/\s/g, '')
}

function GetConfigSettings() {
    chrome.storage.local.get(['blockSelfPromotion'], function (result) {
        blockSelfPromotion = result.blockSelfPromotion || false;
    });
}

async function LoadJSON() { // Fetch the embedded JSON files
    try {
        const [stringsData, selectorsData] = await Promise.all([
            fetch(EmbeddedURL("strings.json")).then(response => response.json()),
            fetch(EmbeddedURL("selectors.json")).then(response => response.json())
        ]);

        const returnStringsData = [
            ...stringsData.Sponsors,
            // Add self promotion strings if setting enabled
            ...(blockSelfPromotion ? stringsData.SelfPromotion : [])
        ];

        return {
            strings: returnStringsData,
            selectors: selectorsData,
        };
    } catch (error) {
        console.error("Guhh?? Failed to load JSON files:", error);
        return null;
    }
}

LoadJSON().then(data => {
    if (data) {
        data.strings.forEach(str => strings.add(Flatten(str)));
        selectors.push(...data.selectors);
    }
});


function SearchAndDestroySponsors() {
    let elementsToRemove = [];

    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector.Selector);

        elements.forEach(element => {
            const contentElement = element.querySelector("#content-text") || element;
            const foundText = contentElement.innerHTML;
            const flattenedText = Flatten(foundText);

            for (const str of strings) {
                if (flattenedText.includes(str)) {
                    if (selector.Type === "Comment") {
                        elementsToRemove.push(element);
                        break;
                    } else if (selector.Type === "Description") {
                        const sentences = splitKeepDelimiter(foundText, /<\/span>/g);

                        let newText = sentences
                            .filter(sentence => !Flatten(sentence).includes(str))
                            .join("");
                        contentElement.innerHTML = newText;
                    }
                }
            }
        });
    });

    elementsToRemove.forEach(element => element.remove());
}

function splitKeepDelimiter(input, regex) {
    const parts = input.split(regex);
    const result = [];

    parts.forEach((part, index) => {
        if (index > 0) {
            const match = input.match(regex)[index - 1];
            result.push(match);
        }
        result.push(part);
    });

    // Append the last delimiter if it exists
    const lastMatch = input.match(regex)[input.match(regex).length - 1];
    if (lastMatch) {
        result.push(lastMatch);
    }

    return result;
}

// Collect debug info for issue reporting
function savePageInfo() {
    const pageURL = window.location.href; // Get the URL of the tab
    const pageTitle = document.title; // Get the title of the tab

    chrome.storage.local.set({ pageURL: pageURL, pageTitle: pageTitle });
}

// Call the function to save page info
savePageInfo();
GetConfigSettings()

// Look for changes in the DOM
new MutationObserver(SearchAndDestroySponsors)
    .observe(document.body, { childList: true, subtree: true });