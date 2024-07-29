document.addEventListener('DOMContentLoaded', function () {
    const selfPromotionCheckbox = document.getElementById('self-promotion');
    const showIssueFormButton = document.getElementById('show-issue-form');
    const submitIssueButton = document.getElementById('submit-issue');
    const issueForm = document.getElementById('issue-form');
    const currentTitleInput = document.getElementById('current-title');
    const currentUrlInput = document.getElementById('current-url');
    const extraNotesTextarea = document.getElementById('extra-notes');

    // Load saved setting
    chrome.storage.local.get(['blockSelfPromotion'], function (result) {
        selfPromotionCheckbox.checked = result.blockSelfPromotion || false;
    });

    // Save setting when checkbox is clicked
    selfPromotionCheckbox.addEventListener('change', function () {
        chrome.storage.local.set({ blockSelfPromotion: this.checked }, function () {
        });
    });

    showIssueFormButton.addEventListener('click', () => {
        issueForm.style.display = issueForm.style.display === 'none' ? 'block' : 'none';
        GetPageContext((pageTitle, pageURL) => {
            currentTitleInput.value = pageTitle.replace(" - YouTube", "")
            currentUrlInput.value = pageURL.replace("www.", "")
        })
    });

    // Function to get page context from chrome.storage.local
    function GetPageContext(callback) {
        chrome.storage.local.get(["pageURL", "pageTitle"], function (result) {
            const pageTitle = result.pageTitle || ''; // Default to empty string if not found
            const pageURL = result.pageURL || ''; // Default to empty string if not found
            callback(pageTitle, pageURL);
        });
    }

    // Event listener for the submit issue button
    submitIssueButton.addEventListener('click', function () {
        GetPageContext((pageTitle, pageURL) => {
            const notes = extraNotesTextarea.value;

            // Create the GitHub issue URL with query parameters
            const issueUrl = `https://github.com/MagicJinn/Block-Sponsor-Comments/issues/new?title=New+sponsor+at:+${encodeURIComponent(pageTitle)}&body=${encodeURIComponent(`URL: ${pageURL}\n\nNotes:\n${notes}`)}`;

            // Open the new issue URL in a new tab
            window.open(issueUrl, '_blank');
        });
    });

});