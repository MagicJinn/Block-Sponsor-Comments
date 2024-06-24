var strings = new Set(); // Store strings to match
var selectors = [] // Store DOM selectors

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
            const foundText = (element.querySelector("#content-text") || element).innerHTML;
            const flattenedText = Flatten(foundText)

            for (const str of strings) { // Loop through all the strings and search for them in foundText
                if (flattenedText.includes(str /* str is flattened elsewhere */)) {
                    if (selector.Type == "Comment") {
                        elementsToRemove.push(element)
                        break; // Break out of the loop when the first string is matched, since the comment is then deleted
                    }
                    else if (selector.Type == "Description") {
                        const sentences = foundText.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s/g); // split lines with complex regex shi
                        let newText = ""

                        for (let i = 0; i < sentences.length; i++) {
                            let sentence = sentences[i]
                            let flattenedSentence = Flatten(sentence)
                            if (!flattenedSentence.includes(str)) { // If the sentence does NOT include a sponsor, add it to the newText
                                newText += sentence +
                                    (Math.floor(Math.random() * 1000) === 0 ? ' 😘' : ''); // Easter egg, 😘
                            }
                        }

                        (element.querySelector("#content-text") || element).innerHTML = newText;
                    }
                }
            };
        });
    });

    // Remove elements outside the loop to avoid modifying the DOM during iteration
    elementsToRemove.forEach(element => element.remove());
}

SearchAndDestroySponsors() // Run initially

// Look for changes in the DOM
new MutationObserver(SearchAndDestroySponsors)
    .observe(document.body, { childList: true, subtree: true });