var strings = [] // Store strings to match
var selectors = [] // Store DOM selectors

function EmbeddedURL(str) { // Get an embedded URL
    return chrome.runtime.getURL(str)
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
        strings.push(...data.strings);
        selectors.push(...data.selectors);
    }
});

function SearchAndDestroySponsors() {
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector.Selector);
        elements.forEach(element => {
            const commentText = (element.querySelector("#content-text") || element).textContent.toLowerCase().replace(/\s/g, '');
            strings.forEach(str => {
                if (commentText.includes(str.toLowerCase().replace(/\s/g, ''))) {
                    element.remove();
                }
            });
        });
    });
}

SearchAndDestroySponsors()

new MutationObserver(SearchAndDestroySponsors).observe(document.body, {
    childList: true,
    subtree: true
});