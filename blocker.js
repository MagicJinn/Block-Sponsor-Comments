var strings = new Set(); // Store strings to match
var selectors = [] // Store DOM selectors

var blockSelfPromotion = false
var debugMode = false;
var sponsorString = '';

const GITHUB_STRINGS_URL = "https://raw.githubusercontent.com/MagicJinn/Block-Sponsor-Comments/refs/heads/main/strings.json"

function EmbeddedURL(str) { // Get an embedded URL
    return chrome.runtime.getURL(str)
}

function Flatten(str) {
    if (str == undefined) return ""
    return str.toLowerCase().replace(/\s/g, '')
}

function GetConfigSettings() {
    chrome.storage.local.get(['blockSelfPromotion', 'debugMode', 'sponsorString'], function (result) {
        blockSelfPromotion = result.blockSelfPromotion || false;
        debugMode = result.debugMode || false;
        sponsorString = result.sponsorString || '';
    });
}

async function LoadJSON() { // Fetch the embedded JSON files
    try {
        const [selectorsData] = await Promise.all([ // Get the embedded JSON files
            fetch(EmbeddedURL("selectors.json")).then(response => response.json())
        ]);

        // Fetch the most up to date strings from Github
        const result = await new Promise((resolve) => { // Check local storage for last fetched time
            chrome.storage.local.get(['lastFetched', 'fetchedStrings'], resolve);
        });

        const lastFetchedTime = result.lastFetched ? new Date(result.lastFetched) : null;
        const nowTime = new Date();
        const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

        let stringsData;

        if (result.fetchedStrings) { // Check if fetchedStrings is available
            stringsData = result.fetchedStrings; // Use fetchedStrings from storage
            console.info("Using cached fetchedStrings from storage.");
        } else if (!lastFetchedTime || (nowTime - lastFetchedTime) > sixHours) { // If lastFetched is null or older than 6 hours, fetch new strings
            stringsData = await fetch(GITHUB_STRINGS_URL).then(response => response.json());
            chrome.storage.local.set({ // Store the fetched strings and update last fetched time
                fetchedStrings: stringsData, // Store the new list
                lastFetched: nowTime.toISOString() // Store the current date and time
            });
            console.info("6 hours since last fetch, fetched new strings from Github.");
        } else {
            const secondsAgo = Math.floor((nowTime - lastFetchedTime) / 1000);
            console.info(`No new strings fetched; using cached data. Last fetch was ${secondsAgo} seconds ago.`);
            stringsData = await fetch(EmbeddedURL("strings.json")).then(response => response.json());
        }

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

            if (debugMode) { // Do not remove sponsors when in debug mode, for testing
                if (flattenedText.includes(sponsorString)) {

                    if (selector.Type = "Comment") {
                        contentElement.style.color = 'red';
                    } else if (selector.Type === "Description") {
                        // Does not work for unknown reasons
                        // const sentences = splitKeepDelimiter(foundText, /<\/span>/g);
                        // let newText = sentences.map(sentence => Flatten(sentence).includes(str) ? `<div style="color: red;">${sentence}</div>` : sentence).join("");
                        // contentElement.innerHTML = newText;
                    }
                }
            } else {
                for (const str of strings) { // Loop through each string
                    if (flattenedText.includes(str)) { // If a match is found
                        if (selector.Type === "Comment") {
                            elementsToRemove.push(element); // Simply remove element
                            break; // Break since the element will be removed anyway
                        } else if (selector.Type === "Description") {
                            const sentences = splitKeepDelimiter(foundText, /<\/span>/g);
                            let newText = sentences
                                .filter(sentence => !Flatten(sentence).includes(str)) // Filter for strings that do not contain the sponsor
                                .join("");
                            contentElement.innerHTML = newText;
                        }
                    }
                }
            }
        });
    });

    elementsToRemove.forEach(element => element.remove());
}

function splitKeepDelimiter(input, regex) { // Function to split text while keeping the character"/word at which it is split
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
    if (lastMatch) result.push(lastMatch);

    return result;
}

// Collect debug info for issue reporting
function savePageInfo() {
    const pageURL = window.location.href; // Get the URL of the tab
    const pageTitle = document.title; // Get the title of the tab

    if (pageURL.includes("watch?") && pageURL.includes("youtube")) {
        chrome.storage.local.set({ pageURL: pageURL, pageTitle: pageTitle });
    }
}

if (document.hasFocus()) savePageInfo(); // Call the function to save page info
window.addEventListener('focus', savePageInfo); // Call SavePageInfo every time the tab gains focus

GetConfigSettings()

// Look for changes in the DOM
new MutationObserver(SearchAndDestroySponsors)
    .observe(document.body, { childList: true, subtree: true });