(() => {
  const path = window.location.pathname || '/';
  if (path.startsWith('/admin') || path.startsWith('/team')) return;
  if (document.querySelector('agents-chatkit')) return;

  const ORG_ID = '20119587307';
  const PUBLIC_ASSISTANT_ID = '3612000000002124';
  const BIBLE_FINDER_ID = '3612000000002240';
  const entityId = (path === '/bible' || path === '/bible.html') ? BIBLE_FINDER_ID : PUBLIC_ASSISTANT_ID;

  const revealChatKit = (chat) => {
    window.setTimeout(() => {
      chat.style.visibility = '';
      chat.style.opacity = '';
      chat.style.pointerEvents = '';
    }, 650);
  };

  const mountChatKit = () => {
    if (document.querySelector('agents-chatkit')) return;
    const chat = document.createElement('agents-chatkit');
    chat.setAttribute('ziaAgents', JSON.stringify({ orgId: ORG_ID, entityId }));

    // Zoho briefly paints the full panel while restoring its collapsed state.
    // Keep the host hidden during that initialization to avoid page-to-page flash.
    chat.style.visibility = 'hidden';
    chat.style.opacity = '0';
    chat.style.pointerEvents = 'none';
    document.body.appendChild(chat);
    revealChatKit(chat);
  };

  const existing = document.querySelector('script[data-evkerk-zia-chatkit]');
  if (existing) {
    existing.addEventListener('load', mountChatKit, { once: true });
    if (customElements.get('agents-chatkit')) mountChatKit();
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://agents.zoho.eu/resources/addon-chat/assets/js/agents-chat-sdk.js';
  script.async = true;
  script.dataset.evkerkZiaChatkit = '1';
  script.addEventListener('load', mountChatKit, { once: true });
  document.head.appendChild(script);
})();
