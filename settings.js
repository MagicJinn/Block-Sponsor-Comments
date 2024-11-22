document.addEventListener('DOMContentLoaded', function () {
    const selfPromotionCheckbox = document.getElementById('self-promotion');
    const showIssueFormButton = document.getElementById('show-issue-form');
    const submitIssueButton = document.getElementById('submit-issue');
    const issueForm = document.getElementById('issue-form');
    const currentTitleInput = document.getElementById('current-title');
    const currentUrlInput = document.getElementById('current-url');
    const extraNotesTextarea = document.getElementById('extra-notes');
    const debugModeCheckbox = document.getElementById('debug-mode');
    const sponsorStringInput = document.getElementById('sponsor-string');
    const sponsorStringContainer = document.getElementById('sponsor-string-container');

    // Load saved settings
    chrome.storage.local.get(['blockSelfPromotion', 'debugMode', 'sponsorString'], function (result) {
        selfPromotionCheckbox.checked = result.blockSelfPromotion || false;
        debugModeCheckbox.checked = result.debugMode || false;

        // Initialize sponsorString safely
        const savedSponsorString = result.sponsorString || ''; // Default to empty string if undefined

        // Show or hide the sponsor string input based on debug mode
        if (result.debugMode) {
            sponsorStringInput.value = savedSponsorString; // Load sponsor string
            sponsorStringContainer.style.display = 'block'; // Show container
        } else {
            sponsorStringInput.value = ''; // Clear input if debug mode is disabled
            sponsorStringContainer.style.display = 'none'; // Hide input
        }
    });

    // Save settings when checkboxes are clicked
    selfPromotionCheckbox.addEventListener('change', function () {
        chrome.storage.local.set({ blockSelfPromotion: this.checked }, function () { });
    });

    debugModeCheckbox.addEventListener('change', function () {
        chrome.storage.local.set({ debugMode: this.checked }, function () { });

        // Show or hide the sponsor string input based on debug mode
        if (this.checked) {
            document.getElementById('sponsor-string-container').style.display = 'block'; // Show container
            // Load the sponsor string if debug mode is enabled
            chrome.storage.local.get(['sponsorString'], function (result) {
                const savedSponsorString = result.sponsorString || ''; // Default to empty string if undefined
                sponsorStringInput.value = savedSponsorString; // Set the value safely
            });
        } else {
            sponsorStringInput.value = ''; // Clear input if debug mode is disabled
            document.getElementById('sponsor-string-container').style.display = 'none'; // Hide container
        }
    });

    // Save sponsor string when it changes
    sponsorStringInput.addEventListener('change', function () {
        chrome.storage.local.set({ sponsorString: this.value }, function () { });
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
            const pageTitle = result.pageTitle.replace(" - YouTube", "") || ''; // Default to empty string if not found
            const pageURL = result.pageURL.replace("www.", "") || ''; // Default to empty string if not found
            callback(pageTitle, pageURL);
        });
    }

    // Event listener for the submit issue button
    submitIssueButton.addEventListener('click', function () {
        const ISSUE_TITLE_PREFIX = 'New sponsor: ';
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