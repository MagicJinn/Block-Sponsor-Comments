var strings = []
var selectors = []

function EmbeddedURL(str) {
    return chrome.runtime.getURL(str)
}

async function LoadJSON() {
    try {
        const stringsResponse = await fetch(EmbeddedURL("strings.json"));
        const selectorsResponse = await fetch(EmbeddedURL("selectors.json"));

        const stringsData = await stringsResponse.json();
        const selectorsData = await selectorsResponse.json();

        return {
            strings: stringsData,
            selectors: selectorsData,
        };
    } catch (error) {
        console.error("Guhh?? Failed to load JSON files:", error);
        return null;
    }
}

LoadJSON().then(data => {
    if (data) {
        strings.push(...data.strings);
        selectors.push(...data.selectors);
    }
});

function searchAndProcessStrings() {
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



searchAndProcessStrings()

new MutationObserver(searchAndProcessStrings).observe(document.body, {
    childList: true,
    subtree: true
});
// strings.forEach(str => {
//     const elementsWithText = document.querySelectorAll(`:contains("${str}")`);

//     elementsWithText.forEach(element => {
//         // Check if the element contains an HTTP or HTTPS link
//         const links = element.querySelectorAll("a[href^='http://'], a[href^='https://']");

//         if (links.length > 0) {
//             // Perform your action here, such as logging a message
//             console.log(`Found string with ${str} and HTTP/HTTPS link.`);
//             // You can also perform an action on the element, like changing its style
//             element.style.backgroundColor = "yellow";

//         }
//     });
// });