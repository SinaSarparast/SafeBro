
var tabToHost = {};
var hostToIP = {};
var seccheck = {};

function processUrl(tabId, url) {
    // Get the host part of the URL. 
    
    console.log("process Url : "+url);
    var host = /^(?:ht|f)tps?:\/\/([^/]+)/.exec(url);
    console.log("process host : "+host);

    // Map tabId to host
    tabToHost[tabId] = host ? host=host[1] : '';


    if (host && !hostToIP[host]) { // Known host, unknown IP
        hostToIP[host] = 'N/A';    // Set N/A, to prevent multiple requests

        // Get IP from a host-to-IP web service
        var x = new XMLHttpRequest();
        x.open('GET', 'https://dns.google.com/resolve?name='+host);
        x.onload = function() {
            var result = JSON.parse(x.responseText);
            console.log(result);
            var i = result['Answer'].length
            hostToIP[host] = result['Answer'][i-1].data;
            console.log("host To IP : "+hostToIP[host]);
            setPopupInfo(tabId);
         };
         x.send();

        var y = new XMLHttpRequest();
        var params = {
                        "client": {
                          "clientId":      "yourcompanyname",
                          "clientVersion": "1.5.2"
                        },
                        "threatInfo": {
                          "threatTypes":      ["MALWARE", "SOCIAL_ENGINEERING"],
                          "platformTypes":    ["WINDOWS"],
                          "threatEntryTypes": ["URL"],
                          "threatEntries": [
                            {"url": host}
                          ]
                        }
                    };
        var APIKEY = 'youshouldsignupandgetyourownapikey';
        var APPVER = '1.5.2';
        var PVER = '3.1';
        y.open('POST', 'https://safebrowsing.googleapis.com/v4/threatMatches:find?key='+APIKEY,true);

        y.setRequestHeader("Content-type", "application/json");
        y.onreadystatechange = function() {
            if (y.readyState == 4) {
                console.log('here is response');
                console.log(y);
                seccheck[host] = y.responseText;
            }
        }
         y.send(JSON.stringify(params));
         
    }

    // Set popup info, with currently (un)known information
    setPopupInfo(tabId);
}

function setPopupInfo(tabId) { // Notify all popups
    chrome.extension.getViews({type:'popup'}).forEach(function(global) {
        global.notify(tabId);
    });
}

// Remove entry from tabToIp when the tab is closed.
chrome.tabs.onRemoved.addListener(function(tabId) {
    delete tabToHost[tabId];
});
// Add entries: Using method 1 ( `onUpdated` )
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'loading' && changeInfo.url) {
        processUrl(tabId, tab.url); // or changeInfo.url, does not matter
    }
});

// Init: Get all windows and tabs, to fetch info for current hosts
chrome.windows.getAll({populate: true}, function(windows) {

    windows.forEach(function(win) {
        if (win.type == 'normal' && win.tabs) {
            for (var i=0; i<win.tabs.length; i++) {
                processUrl(win.tabs[i].id, win.tabs[i].url);
            }
        }
    });
});
