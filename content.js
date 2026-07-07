// This script only ever reads chrome.storage.local (on-device) and writes
// values into the page's own form fields via the DOM. It makes no network
// requests, sends no data anywhere, and has no host_permissions used for
// fetching — only for running on the page you're viewing.

(() => {
  let profile = null;
  let badge = null;
  let menu = null;
  let activeField = null;

  chrome.storage.local.get(['profile'], (result) => {
    profile = result.profile || null;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.profile) {
      profile = changes.profile.newValue;
    }
  });

  const FIELD_RULES = [
    { key: 'fullName', words: ['fullname', 'full name', 'yourname', 'name'] , exclude: ['first', 'last', 'company', 'user', 'file']},
    { key: 'firstName', words: ['firstname', 'first name', 'fname', 'givenname'] },
    { key: 'lastName', words: ['lastname', 'last name', 'lname', 'surname', 'familyname'] },
    { key: 'email', words: ['email', 'e-mail'] },
    { key: 'phone', words: ['phone', 'mobile', 'tel', 'contact number'] },
    { key: 'city', words: ['city', 'town'] },
    { key: 'country', words: ['country', 'nation'] },
    { key: 'linkedin', words: ['linkedin'] },
    { key: 'portfolio', words: ['portfolio', 'github', 'website', 'personal site'] },
    { key: 'education', words: ['education', 'degree', 'university', 'school'] },
    { key: 'skills', words: ['skills', 'skillset', 'technologies', 'tech stack'] },
    { key: 'certs', words: ['certification', 'certificate', 'license'] },
    { key: 'experience', words: ['experience', 'work history', 'employment', 'cover letter', 'about you', 'summary', 'tell us'] },
  ];

  function fieldSignature(el) {
    const parts = [
      el.name, el.id, el.placeholder,
      el.getAttribute('aria-label'),
      el.autocomplete,
    ];
    // include associated <label>
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) parts.push(lbl.textContent);
    }
    const parentLabel = el.closest('label');
    if (parentLabel) parts.push(parentLabel.textContent);
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  function bestMatch(el) {
    const sig = fieldSignature(el);
    if (!sig) return null;
    let best = null;
    for (const rule of FIELD_RULES) {
      if (rule.exclude && rule.exclude.some(w => sig.includes(w))) continue;
      if (rule.words.some(w => sig.includes(w))) {
        best = rule.key;
        break;
      }
    }
    return best;
  }

  function valueFor(key) {
    if (!profile) return '';
    switch (key) {
      case 'fullName': return profile.fullName || '';
      case 'firstName': return (profile.fullName || '').split(' ')[0] || '';
      case 'lastName': return (profile.fullName || '').split(' ').slice(1).join(' ') || '';
      case 'email': return profile.email || '';
      case 'phone': return profile.phone || '';
      case 'city': return profile.city || '';
      case 'country': return profile.country || '';
      case 'linkedin': return profile.linkedin || '';
      case 'portfolio': return profile.portfolio || '';
      case 'education': return profile.education || '';
      case 'skills': return profile.skills || '';
      case 'certs': return profile.certs || '';
      case 'experience': return formatExperience(profile.experience || []);
      default: return '';
    }
  }

  function formatExperience(list) {
    return list.map(e =>
      `${e.title}${e.company ? ' — ' + e.company : ''}${e.dates ? ' (' + e.dates + ')' : ''}\n${e.desc || ''}`
    ).join('\n\n');
  }

  function removeUI() {
    if (badge) badge.remove();
    if (menu) menu.remove();
    badge = null; menu = null;
  }

  function fillField(el, value) {
    const setter = Object.getOwnPropertyDescriptor(el.__proto__, 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function showBadge(el) {
    if (!profile) return;
    const match = bestMatch(el);
    if (!match) return;
    const value = valueFor(match);
    if (!value) return;

    removeUI();
    activeField = el;

    const rect = el.getBoundingClientRect();
    badge = document.createElement('div');
    badge.className = 'jaf-badge';
    badge.textContent = '⚡';
    badge.title = 'Fill from saved profile';
    badge.style.top = `${window.scrollY + rect.top + rect.height / 2 - 11}px`;
    badge.style.left = `${window.scrollX + rect.right - 26}px`;

    badge.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fillField(el, value);
      removeUI();
    });

    document.body.appendChild(badge);
  }

  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el.tagName === 'INPUT' && ['text', 'email', 'tel', 'url', ''].includes(el.type) ||
        el.tagName === 'TEXTAREA') {
      showBadge(el);
    }
  });

  document.addEventListener('focusout', (e) => {
    setTimeout(() => {
      if (document.activeElement !== activeField) removeUI();
    }, 150);
  });

  window.addEventListener('scroll', removeUI, true);
  window.addEventListener('resize', removeUI);
})();
