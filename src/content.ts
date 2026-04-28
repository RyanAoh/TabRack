// Content script to handle scroll capture and restoration

const getScrollPercentage = () => {
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  return scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
};

// Report scroll position when leaving page or hiding visibility
const reportScroll = () => {
  chrome.runtime.sendMessage({
    action: 'UPDATE_SCROLL_IF_SAVED',
    url: window.location.href,
    scrollPercentage: getScrollPercentage()
  }).catch(() => {}); // ignore errors if background is inactive
};

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    reportScroll();
  }
});
window.addEventListener('pagehide', reportScroll);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_SCROLL') {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
    sendResponse({ scrollPercentage });
  }

  if (message.action === 'RESTORE_SCROLL') {
    const { percentage } = message;
    setTimeout(() => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({
        top: (percentage / 100) * scrollHeight,
        behavior: 'smooth'
      });
    }, 500); // Give some time for content to load
  }
});
