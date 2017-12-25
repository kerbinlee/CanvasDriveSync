chrome.browserAction.onClicked.addListener(function(activeTab) {
    var newURL = 'chrome-extension://' + chrome.runtime.id + '/popup.html';
    chrome.tabs.create({ url: newURL });
});
