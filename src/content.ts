// Content script to handle scroll capture and restoration
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
