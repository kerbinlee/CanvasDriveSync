chrome.browserAction.onClicked.addListener(function(activeTab)
{
    var newURL = "chrome-extension://kmmbkhoapiigiabkkfbifgjnfnkkgdda/popup.html";
    chrome.tabs.create({ url: newURL });
});
