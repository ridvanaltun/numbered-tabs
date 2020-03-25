/* Add listeners for tabs */

const tabs = chrome.tabs;
let open = true;
const prefixes = [...Array(9).keys()].map(num => `${num + 1}. `);

tabs.onCreated.addListener(function(tab) {
  updateAllTabs();
});
tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  updateAllTabs();
});
tabs.onMoved.addListener(function(tabId, moveInfo) {
  updateAllTabs();
});
tabs.onDetached.addListener(function(tabId, detachInfo) {
  updateAllTabs();
});
tabs.onAttached.addListener(function(tabId, attachInfo) {
  updateAllTabs();
});
tabs.onRemoved.addListener(function(tabId, removeInfo) {
  updateAllTabs();
});

/**
 * Add numeric prefix to tab title (i.e. '4. Facebook - Login')
 * according to tab's position relative to other tabs. If the
 * prefix already exists, update it to make sure it's accurate.
 * @param {Tab} tab - a [Chrome API Tab object](https://developer.chrome.com/extensions/tabs#type-Tab)
 * @param {Tab[]} allTabs - all the other tabs (including tabs in different windows)
 */

function updateTab(tab, allTabs) {
  const { id, index, url, title, windowId } = tab;

  if (prevent(url)) {
    return;
  }

  // get the number of tabs in this tab's window
  const numTabs =
    Math.max(...allTabs.filter(t => t.windowId == windowId).map(t => t.index)) +
    1;

  /* logic for redoing title with numeric prefix */
  const prefixRegEx = /^[0-9-]+. /g;
  const num = index + 1;
  let newPrefix =
    num <= 8 ? `${num}. ` : num >= 9 && num === numTabs ? "9. " : "";

  const hasPrefix = prefixRegEx.exec(title);
  if (hasPrefix && hasPrefix[0] && hasPrefix[0] === newPrefix) {
    return; // title is already correctly prefixed
  } else if (hasPrefix) {
    // title has incorrect prefix (tab moved)
    newPrefix += title.split(prefixRegEx)[1];
  } else {
    // title has no prefix (new tab)
    newPrefix += title;
  }

  try {
    const script = { code: `document.title = '${newPrefix}'` };
    chrome.tabs.executeScript(id, script);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Get all the Tabs (from all windows)
 * @param {function} cb - callback function with input `Tab[]`
 */
function getAllTabs(cb) {
  chrome.tabs.query({}, cb);
}

/**
 * Update all the tabs.
 */
function updateAllTabs() {
  if (open) {
    const cb = tabs => tabs.forEach(tab => updateTab(tab, tabs));
    getAllTabs(cb);
  } else {
    const cb = tabs => tabs.forEach(tab => revertTitle(tab));
    getAllTabs(cb);
  }
}

function revertTitle({ id, url, title }) {
  if (prevent(url)) {
    return;
  }
  const titlePrefix = title.substring(0, 3);
  if (prefixes.includes(titlePrefix)) {
    try {
      const newTitle = title.substring(3);
      const script = { code: `document.title = '${newTitle}'` };
      chrome.tabs.executeScript(id, script);
    } catch (e) {
      console.error(e);
    }
  }
}

function prevent(url) {
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
    // not allowed to modify browser settings pages
    return true;
  }
  return false;
}

function handleIcon() {
  if (open) {
    chrome.browserAction.setIcon({ path: "./images/active.png" });
  } else {
    chrome.browserAction.setIcon({ path: "./images/passive.png" });
  }
}

/**
 * Detect Alt+X
 */
chrome.commands.onCommand.addListener(command => {
  if (command === "toggle_title") {
    open = !open;
    updateAllTabs();
    handleIcon();
  }
});

/**
 * Call when ext on clicked
 */
chrome.browserAction.onClicked.addListener(tab => {
  open = !open;
  updateAllTabs();
  handleIcon();
});

updateAllTabs(); // update all tabs on initialization
handleIcon(); // update icon on initialization
