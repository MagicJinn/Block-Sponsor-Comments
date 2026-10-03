var strings = new Set(); // Store strings to match
var selectors = [] // Store DOM selectors

var blockSelfPromotion = false
var debugMode = false;
var sponsorString = '';

var isTestMode = typeof globalThis !== "undefined" && globalThis.__BSC_TEST_MODE__;

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
        LoadJSON().then(data => {
            if (data) {
                data.strings.forEach(str => strings.add(Flatten(str)));
                selectors.push(...data.selectors);
            }
        });
    });
}

async function LoadJSON() { // Fetch the embedded JSON files
    try {
        const [selectorsData] = await Promise.all([ // Get the selectors.json file
            fetch(EmbeddedURL("selectors.json")).then(response => response.json())
        ]);

        const result = await new Promise((resolve) => { // Check local storage for last fetched time
            chrome.storage.local.get(['lastFetched', 'fetchedStrings'], resolve);
        });

        // Calculate whether 6 hours have passed since last fetch
        const lastFetchedTime = result.lastFetched ? new Date(result.lastFetched) : null;
        const nowTime = new Date();
        const sixHours = 6 * // 6 hours in milliseconds
            60 * // minutes
            60 * // seconds 
            1000; // miliseconds
        const lastFetchSixHoursAgo = (nowTime - lastFetchedTime) > sixHours;

        let stringsData;

        if (!lastFetchedTime || // If lastFetched is null
            lastFetchSixHoursAgo) { // If lastFetched is older than 6 hours
            stringsData = await fetch(GITHUB_STRINGS_URL).then(response => response.json());
            if (stringsData == null) {
                console.error("Failed to fetch new strings from Github.");
                return;
            }
            chrome.storage.local.set({ // Store the fetched strings and update last fetched time
                fetchedStrings: stringsData, // Store the new list
                lastFetched: nowTime.toISOString() // Store the current date and time
            });
            console.info("6 hours since last fetch, fetched new strings from Github.");
        } else if (result.fetchedStrings) { // If fetchedStrings is not null and less than 6 hours ago
            stringsData = result.fetchedStrings; // Use fetchedStrings from storage
            console.info(`Using cached fetchedStrings from storage.\nLast fetch was ${Math.floor((nowTime - lastFetchedTime) / 1000)} seconds ago.`);
        } else {
            stringsData = await fetch(EmbeddedURL("strings.json")).then(response => response.json());
            console.info("Using embedded strings.json file.");
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

function loadSponsorData(stringList, selectorList) {
    strings.clear();
    selectors.length = 0;
    selectorList.forEach((entry) => selectors.push(entry));
    stringList.forEach((str) => strings.add(Flatten(str)));
}

if (!isTestMode) {
    LoadJSON().then(data => {
        if (data) {
            data.strings.forEach(str => strings.add(Flatten(str)));
            selectors.push(...data.selectors);
        }
    });
}

function sponsorFlatMatches(flatText, sponsorFlat, rawFragment) {
    if (sponsorFlat.length === 0) return false;
    if (flatText.includes(sponsorFlat)) return true;

    // Match distinctive brand stems from domain-style sponsor strings (e.g. brilliant.org).
    const dotIndex = sponsorFlat.indexOf(".");
    if (dotIndex > 0) {
        const stem = sponsorFlat.slice(0, dotIndex);
        if (stem.length >= 8 && /^[a-z]+$/.test(stem)) {
            const stemPattern = new RegExp(`\\b${stem}\\b`, "i");
            if (stemPattern.test(rawFragment)) return true;
        }
    }

    return false;
}

function descriptionFragmentHasSponsor(fragment, stringsSet) {
    const flat = Flatten(fragment);
    for (const str of stringsSet) {
        if (sponsorFlatMatches(flat, str, fragment)) return true;
    }
    return false;
}

function splitDescriptionSegments(html) {
    const segments = [];
    const spanPattern = /<span\b[^>]*>[\s\S]*?<\/span>/g;
    let lastIndex = 0;
    let match;

    while ((match = spanPattern.exec(html)) !== null) {
        if (match.index > lastIndex) {
            segments.push(html.slice(lastIndex, match.index));
        }
        segments.push(match[0]);
        lastIndex = spanPattern.lastIndex;
    }

    if (lastIndex < html.length) {
        segments.push(html.slice(lastIndex));
    }

    return segments.length > 0 ? segments : [html];
}

function filterDescriptionSpan(spanHtml, stringsSet) {
    if (!descriptionFragmentHasSponsor(spanHtml, stringsSet)) return spanHtml;

    const spanMatch = spanHtml.match(/^(<span\b[^>]*>)([\s\S]*)<\/span>$/);
    if (!spanMatch) {
        return "";
    }

    const inner = spanMatch[2];
    const paragraphs = inner.split(/\n\n+/);
    if (paragraphs.length <= 1) {
        return "";
    }

    const kept = paragraphs.filter((paragraph) => !descriptionFragmentHasSponsor(paragraph, stringsSet));
    if (kept.length === 0) {
        return "";
    }
    if (kept.length === paragraphs.length) {
        return spanHtml;
    }

    return spanMatch[1] + kept.join("\n\n") + "</span>";
}

function filterDescriptionHtml(html, stringsSet) {
    return splitDescriptionSegments(html)
        .map((segment) => {
            if (/^<span\b/i.test(segment)) {
                return filterDescriptionSpan(segment, stringsSet);
            }
            if (descriptionFragmentHasSponsor(segment, stringsSet)) {
                return "";
            }
            return segment;
        })
        .filter((segment) => segment !== "")
        .join("");
}

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
                    if (selector.Type == "Comment") {
                        contentElement.style.color = 'red';
                    } else if (selector.Type == "Description") {
                        // Does not work for unknown reasons
                        contentElement.style.color = 'red';
                    }
                }
            } else {
                if (selector.Type == "Comment") {
                    for (const str of strings) {
                        if (flattenedText.includes(str)) {
                            elementsToRemove.push(element);
                            console.log("Detected sponsor: ", str);
                            break;
                        }
                    }
                } else if (selector.Type == "Description") {
                    if (!descriptionFragmentHasSponsor(flattenedText, strings)) {
                        return;
                    }
                    const newText = filterDescriptionHtml(foundText, strings);
                    if (newText !== foundText) {
                        contentElement.innerHTML = newText;
                        console.log("Filtered sponsor text from description");
                    }
                }
            }
        });
    });

    elementsToRemove.forEach(element => element.remove());
}

function splitKeepDelimiter(input, regex) { // Function to split text while keeping the character/word at which it is split
    const matches = input.match(regex);
    if (!matches) return null;

    const parts = input.split(regex);
    const result = [];

    parts.forEach((part, index) => {
        if (index > 0) {
            result.push(matches[index - 1]);
        }
        result.push(part);
    });

    return result;
}

// Collect debug info for issue reporting
function savePageInfo() {
    const pageURL = window.location.href; // Get the URL of the tab
    const pageTitle = document.title; // Get the title of the tab

    if (pageURL.includes("watch?") && pageURL.includes("youtube")) {
        chrome.storage.local.set({
            pageURL: pageURL,
            pageTitle: pageTitle
        });
    }
}

if (!isTestMode) {
    if (document.hasFocus()) savePageInfo(); // Call the function to save page info
    window.addEventListener('focus', savePageInfo); // Call SavePageInfo every time the tab gains focus

    GetConfigSettings(); // <-- Restore this call!

    // Look for changes in the DOM
    // new MutationObserver(SearchAndDestroySponsors)
    //     .observe(document.body, {
    //         childList: true,
    //         subtree: true
    //     });
    // Retired the MutationObserver due to it not triggering consistently

    setInterval(SearchAndDestroySponsors, 100); // Call the function every 100 ms
} else {
    globalThis.__BSC_BLOCKER__ = {
        loadSponsorData,
        SearchAndDestroySponsors,
        filterDescriptionHtml,
    };
}