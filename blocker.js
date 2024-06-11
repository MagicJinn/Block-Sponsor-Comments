var strings = new Set(); // Store strings to match
var selectors = [] // Store DOM selectors

const checkAgainEvery = 2.5 // seconds

function EmbeddedURL(str) { // Get an embedded URL
    return chrome.runtime.getURL(str)
}

function Flatten(str) {
    return str.toLowerCase().replace(/\s/g, '')
}

async function LoadJSON() { // Fetch the embedded JSON files
    try {
        const [stringsData, selectorsData] = await Promise.all([
            fetch(EmbeddedURL("strings.json")).then(response => response.json()),
            fetch(EmbeddedURL("selectors.json")).then(response => response.json())
        ]);

        return {
            strings: stringsData,
            selectors: selectorsData,
        };
    } catch (error) {
        console.error("Guhh?? Failed to load JSON files:", error);
        return null;
    }
}

LoadJSON().then(data => { // Save the loaded JSON data into the variables
    if (data) {
        data.strings.forEach(str => {
            strings.add(Flatten(str));
        });
        selectors.push(...data.selectors);
    }
});

function SearchAndDestroySponsors() {
    let elementsToRemove = []
    selectors.forEach(selector => { // Loop through each selector to find sponsors
        const elements = document.querySelectorAll(selector.Selector);
        elements.forEach(element => { // Loop through the elements the selector found
            const foundText = Flatten( // Check whether it's a comment or description
                (element.querySelector("#content-text") || element).textContent
            );
            for (const str of strings) { // Loop through all the strings and search for them in foundText
                if (foundText.includes(str /* str is flattened elsewhere */ )) {
                    elementsToRemove.push(element)
                    break; // Break out of the loop when the first string is matched
                }
            };
        });
    });

    // Remove elements outside the loop to avoid modifying the DOM during iteration
    elementsToRemove.forEach(element => element.remove());
}

SearchAndDestroySponsors()

// Look for changes in the DOM
new MutationObserver(SearchAndDestroySponsors).observe(document.body, { childList: true, subtree: true });

// Maybemaybe
setInterval(SearchAndDestroySponsors, checkAgainEvery * 1000); // Check every x seconds
