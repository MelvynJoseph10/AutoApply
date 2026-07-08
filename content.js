// This script only ever reads chrome.storage.local (on-device) and writes
// values into the page's own form fields via the DOM. It makes no network
// requests, sends no data anywhere, and has no host_permissions used for
// fetching — only for running on the page you're viewing.

(() => {
  let profile = null;
  let badge = null;
  let activeField = null;

  chrome.storage.local.get(['profile'], (result) => {
    profile = result.profile || null;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.profile) {
      profile = changes.profile.newValue;
    }
  });

  const GENERIC_RULES = [
    { key: 'fullName', words: ['fullname', 'full name', 'yourname', 'name'], exclude: ['first', 'last', 'company', 'user', 'file'] },
    { key: 'firstName', words: ['firstname', 'first name', 'fname', 'givenname'] },
    { key: 'lastName', words: ['lastname', 'last name', 'lname', 'surname', 'familyname'] },
    { key: 'email', words: ['email', 'e-mail'] },
    { key: 'phone', words: ['phone', 'mobile', 'tel', 'contact number'] },
    { key: 'city', words: ['city', 'town'] },
    { key: 'province', words: ['province', 'state', 'territory'] },
    { key: 'streetAddress', words: ['address line 1', 'street address', 'address1', 'street'] },
    { key: 'addressLine2', words: ['address line 2', 'address2', 'apt', 'suite', 'unit'] },
    { key: 'postalCode', words: ['postal code', 'zip code', 'zip', 'postcode'] },
    { key: 'country', words: ['country', 'nation'] },
    { key: 'linkedin', words: ['linkedin'] },
    { key: 'portfolio', words: ['portfolio', 'github', 'website', 'personal site'] },
    { key: 'education', words: ['education', 'academic background', 'qualifications'] },
    { key: 'skills', words: ['skills', 'skillset', 'technologies', 'tech stack'] },
    { key: 'certs', words: ['certification', 'certificate', 'license'] },
    { key: 'experience', words: ['experience', 'work history', 'employment', 'cover letter', 'about you', 'summary', 'tell us'] },
  ];

  // Fields that belong to ONE repeated job-experience block.
  const EXPERIENCE_RULES = [
    { key: 'jobTitle', words: ['job title', 'position title', 'role title', 'title'] },
    { key: 'company', words: ['company name', 'company', 'employer', 'organization'] },
    { key: 'jobDesc', words: ['role description', 'job description', 'responsibilities', 'duties', 'description'] },
    { key: 'startDate', words: ['from date', 'start date', 'from'] },
    { key: 'endDate', words: ['to date', 'end date', 'to'] },
    { key: 'jobLocation', words: ['location', 'city'] },
  ];

  // Fields that belong to ONE repeated education block.
  const EDUCATION_RULES = [
    { key: 'gradYear', words: ['graduation year', 'grad year', 'year of graduation'] },
    { key: 'degree', words: ['degree', 'major', 'field of study', 'qualification'] },
    { key: 'school', words: ['school name', 'college name', 'university name', 'institution', 'alma mater', 'school', 'college', 'university'] },
    { key: 'eduLocation', words: ['location', 'city'] },
    { key: 'eduDates', words: ['from date', 'start date', 'to date', 'end date', 'from', 'to', 'dates'] },
  ];

  function isFillable(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
    if (el.tagName === 'INPUT') return ['text', 'email', 'tel', 'url', 'month', 'date', ''].includes(el.type);
    return false;
  }

  // Catches labels that sit visually next to a field but aren't linked via
  // <label for="..."> or wrapping (common in date-picker/dropdown widgets).
  // Stops at the first ancestor level that has any preceding-sibling text,
  // so it doesn't bleed into an unrelated adjacent field's label.
  function getNearbyLabelText(el) {
    let node = el;
    for (let level = 0; level < 3 && node; level++) {
      const parent = node.parentElement;
      if (!parent) break;
      const texts = [];
      for (const child of parent.children) {
        if (child === node) break;
        const t = child.textContent && child.textContent.trim();
        if (t && t.length < 60) texts.push(t);
      }
      if (texts.length) return texts.join(' ');
      node = parent;
    }
    return '';
  }

  function fieldSignature(el) {
    const parts = [
      el.name, el.id, el.placeholder,
      el.getAttribute('aria-label'),
      el.autocomplete,
    ];
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) parts.push(lbl.textContent);
    }
    const parentLabel = el.closest('label');
    if (parentLabel) parts.push(parentLabel.textContent);
    parts.push(getNearbyLabelText(el));
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  function wordMatches(sig, w) {
    if (w.length <= 3 && !w.includes(' ')) {
      return new RegExp(`\\b${w}\\b`).test(sig);
    }
    return sig.includes(w);
  }

  function matchRules(sig, rules) {
    for (const rule of rules) {
      if (rule.exclude && rule.exclude.some(w => wordMatches(sig, w))) continue;
      if (rule.words.some(w => wordMatches(sig, w))) return rule.key;
    }
    return null;
  }

  // Keeps scanning backward past headings that don't look like a real
  // section title (e.g. a field's own label rendered as an h4), instead of
  // giving up at the first heading it happens to hit.
  function findSectionContext(el) {
    let node = el;
    let steps = 0;
    while (node && steps < 500) {
      let sib = node.previousElementSibling;
      while (sib) {
        steps++;
        const candidates = [];
        if (/^(H1|H2|H3|H4|H5|LEGEND)$/i.test(sib.tagName)) candidates.push(sib);
        if (sib.querySelectorAll) {
          const found = sib.querySelectorAll('h1,h2,h3,h4,h5,legend');
          for (let i = found.length - 1; i >= 0; i--) candidates.push(found[i]);
        }
        for (const h of candidates) {
          const text = h.textContent;
          if (/experience|employment|job history|position/i.test(text)) return 'experience';
          if (/education|academic background/i.test(text)) return 'education';
        }
        sib = sib.previousElementSibling;
      }
      node = node.parentElement;
    }
    return null;
  }

  // Determines the field's type (jobTitle/company/etc, or a generic key)
  // WITHOUT deciding which repeated entry it belongs to yet.
  function classifyField(el) {
    const sig = fieldSignature(el);
    if (!sig) return null;
    const section = findSectionContext(el);

    if (section === 'experience') {
      const key = matchRules(sig, EXPERIENCE_RULES);
      if (key) return { key, scope: 'experience' };
    }
    if (section === 'education') {
      const key = matchRules(sig, EDUCATION_RULES);
      if (key) return { key, scope: 'education' };
    }
    const key = matchRules(sig, GENERIC_RULES);
    if (key) return { key, scope: 'generic' };
    return null;
  }

  // Works out WHICH repeated entry (1st job, 2nd job, ...) this field
  // belongs to by counting how many other fields matching the exact same
  // (scope, key) appear earlier in the document. This works even when the
  // page doesn't number its sections ("Employment History" repeated with
  // no "1"/"2" labels) — it just counts occurrences in DOM order.
  function getGroupIndex(el, scope, key) {
    const all = document.querySelectorAll('input, textarea, select');
    let index = 0;
    for (const cand of all) {
      if (cand === el) break;
      if (!isFillable(cand)) continue;
      const m = classifyField(cand);
      if (m && m.scope === scope && m.key === key) index++;
    }
    return index;
  }

  function bestMatch(el) {
    const classified = classifyField(el);
    if (!classified) return null;
    if (classified.scope === 'generic') return { ...classified, index: 0 };
    const index = getGroupIndex(el, classified.scope, classified.key);
    return { ...classified, index };
  }

  const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

  function toMonthYear(raw) {
    if (!raw) return '';
    const s = raw.trim();
    const m = s.match(/([A-Za-z]{3,})\s+(\d{4})/);
    if (m) {
      const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
      if (mon) return `${mon}/${m[2]}`;
    }
    const yOnly = s.match(/^(\d{4})$/);
    if (yOnly) return yOnly[1];
    return s;
  }

  function splitDates(datesStr) {
    if (!datesStr) return { start: '', end: '' };
    const parts = datesStr.split(/[-–]/).map(p => p.trim());
    const start = parts[0] || '';
    let end = parts[1] || '';
    if (/present|current/i.test(end)) end = '';
    return { start: toMonthYear(start), end: toMonthYear(end) };
  }

  function bulletize(text) {
    if (!text) return text;
    return text
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (/^[•\-*]\s/.test(trimmed)) return trimmed;
        return `• ${trimmed}`;
      })
      .join('\n');
  }

  function valueFor(match) {
    if (!profile) return '';
    const { key, index, scope } = match;

    if (scope === 'experience') {
      const job = (profile.experience || [])[index];
      if (!job) return '';
      switch (key) {
        case 'jobTitle': return job.title || '';
        case 'company': return job.company || '';
        case 'jobDesc': return bulletize(job.desc || '');
        case 'jobLocation': return job.location || '';
        case 'startDate': return splitDates(job.dates).start;
        case 'endDate': return splitDates(job.dates).end;
        default: return '';
      }
    }

    if (scope === 'education') {
      const edu = (profile.education || [])[index];
      if (!edu) return '';
      switch (key) {
        case 'degree': return edu.degree || '';
        case 'school': return edu.school || '';
        case 'eduLocation': return edu.location || '';
        case 'gradYear': return edu.dates || '';
        case 'eduDates': return edu.dates || '';
        default: return '';
      }
    }

    switch (key) {
      case 'fullName': return profile.fullName || '';
      case 'firstName': return (profile.fullName || '').split(' ')[0] || '';
      case 'lastName': return (profile.fullName || '').split(' ').slice(1).join(' ') || '';
      case 'email': return profile.email || '';
      case 'phone': return profile.phone || '';
      case 'city': return profile.city || '';
      case 'province': return profile.province || '';
      case 'streetAddress': return profile.streetAddress || '';
      case 'addressLine2': return profile.addressLine2 || '';
      case 'postalCode': return profile.postalCode || '';
      case 'country': return profile.country || '';
      case 'linkedin': return profile.linkedin || '';
      case 'portfolio': return profile.portfolio || '';
      case 'education': return formatEducation(profile.education || []);
      case 'skills': return profile.skills || '';
      case 'certs': return profile.certs || '';
      case 'experience': return formatExperience(profile.experience || []);
      default: return '';
    }
  }

  function formatExperience(list) {
    return list.map(e =>
      `${e.title}${e.company ? ' — ' + e.company : ''}${e.dates ? ' (' + e.dates + ')' : ''}\n${bulletize(e.desc || '')}`
    ).join('\n\n');
  }

  function formatEducation(list) {
    return list.map(e =>
      `${e.degree}${e.school ? ' — ' + e.school : ''}${e.dates ? ' (' + e.dates + ')' : ''}${e.location ? ', ' + e.location : ''}`
    ).join('\n');
  }

  function removeUI() {
    if (badge) badge.remove();
    badge = null;
  }

  function toInputValue(raw, type) {
    if (!raw) return raw;
    const my = raw.match(/^(\d{2})\/(\d{4})$/);
    if (my) {
      const [, mm, yyyy] = my;
      if (type === 'month') return `${yyyy}-${mm}`;
      if (type === 'date') return `${yyyy}-${mm}-01`;
    }
    const yOnly = raw.match(/^(\d{4})$/);
    if (yOnly) {
      if (type === 'month') return `${yOnly[1]}-01`;
      if (type === 'date') return `${yOnly[1]}-01-01`;
    }
    return raw;
  }

  function fillField(el, value) {
    const finalValue = (el.type === 'month' || el.type === 'date') ? toInputValue(value, el.type) : value;
    const setter = Object.getOwnPropertyDescriptor(el.__proto__, 'value')?.set;
    if (setter) setter.call(el, finalValue); else el.value = finalValue;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillSelect(el, value) {
    if (!value) return;
    const target = value.trim().toLowerCase();
    for (const opt of el.options) {
      const optText = opt.textContent.trim().toLowerCase();
      if (optText === target || optText.startsWith(target) || target.startsWith(optText)) {
        el.value = opt.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }
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
      if (el.tagName === 'SELECT') {
        fillSelect(el, value);
      } else {
        fillField(el, value);
      }
      removeUI();
    });

    document.body.appendChild(badge);
  }

  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (isFillable(el)) showBadge(el);
  });

  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (document.activeElement !== activeField) removeUI();
    }, 150);
  });

  window.addEventListener('scroll', removeUI, true);
  window.addEventListener('resize', removeUI);
})();
