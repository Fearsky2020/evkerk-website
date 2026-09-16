(() => {
  const path = window.location.pathname || '/';
  if (path.startsWith('/admin') || path.startsWith('/team')) return;
  if (document.querySelector('agents-chatkit')) return;

  const mountChatKit = () => {
    if (document.querySelector('agents-chatkit')) return;
    const chat = document.createElement('agents-chatkit');
    chat.setAttribute('ziaAgents', JSON.stringify({
      orgId: '20119587307',
      entityId: '3612000000002124',
    }));
    document.body.appendChild(chat);
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
