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
            currentTitleInput.value = pageTitle
            currentUrlInput.value = pageURL
        })
    });

    // Function to get page context from chrome.storage.local
    function GetPageContext(callback) {
        chrome.storage.local.get(["pageURL", "pageTitle"], function (result) {
            const pageTitle = result.pageTitle || ''; // Default to empty string if not found
            const pageURL = result.pageURL || ''; // Default to empty string if not found
            callback(pageTitle.replace("www.", ""), pageURL.replace(" - YouTube", ""));
        });
    }

    // Event listener for the submit issue button
    submitIssueButton.addEventListener('click', function () {
        const ISSUE_TITLE_PREFIX = 'New sponsor at: ';
        const GITHUB_REPO_URL = 'https://github.com/MagicJinn/Block-Sponsor-Comments/issues/new';
        const LABEL = 'new sponsor';

        // Prepare the issue title and body
        const issueTitle = `${ISSUE_TITLE_PREFIX}${currentTitleInput.value}`;
        let issueBody = `URL: ${currentUrlInput.value}`;
        const notes = extraNotesTextarea.value.trim();

        // Only add notes to the body if there are any
        if (notes) {
            issueBody += `\n\nNotes:\n${notes}`;
        }

        // Create the GitHub issue URL with query parameters, including the label
        const issueUrl = `${GITHUB_REPO_URL}?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;

        // Open the new issue URL in a new tab
        chrome.tabs.create({ url: issueUrl });
    });
});