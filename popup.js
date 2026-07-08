// All data lives in chrome.storage.local — this API never leaves the device
// and is never synced to any Google account or server. No network calls
// of any kind happen anywhere in this extension.

const form = document.getElementById('profileForm');
const expList = document.getElementById('expList');
const addExpBtn = document.getElementById('addExp');
const eduList = document.getElementById('eduList');
const addEduBtn = document.getElementById('addEdu');
const certList = document.getElementById('certList');
const addCertBtn = document.getElementById('addCert');
const savedMsg = document.getElementById('savedMsg');

function makeCertEntry(data = {}) {
  const div = document.createElement('div');
  div.className = 'exp-entry';
  div.innerHTML = `
    <button type="button" class="remove-exp" title="Remove">✕</button>
    <input type="text" class="cert-name" placeholder="Certification name (e.g. AWS Certified Solutions Architect – Associate)" value="${escapeAttr(data.name || '')}">
  `;
  div.querySelector('.remove-exp').addEventListener('click', () => div.remove());
  return div;
}

addCertBtn.addEventListener('click', () => {
  certList.appendChild(makeCertEntry());
});

// Firefox (and Chrome) close the toolbar popup the instant it loses focus —
// which happens the moment a native file picker opens. That breaks Import
// (and can interrupt Export). Detect whether we're running as a small
// popup vs. a full tab, and steer Import/Export through a full tab so the
// file dialog can't kill the page underneath it.
const isPopup = window.innerWidth < 500;

document.getElementById('openTabBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  window.close();
});

if (isPopup) {
  document.getElementById('openTabBtn').style.display = 'block';
} else {
  document.getElementById('openTabBtn').style.display = 'none';
}

function makeEduEntry(data = {}) {
  const div = document.createElement('div');
  div.className = 'exp-entry';
  div.innerHTML = `
    <button type="button" class="remove-exp" title="Remove">✕</button>
    <input type="text" class="edu-degree" placeholder="Degree / program (e.g. B.Sc. Computer Science)" value="${escapeAttr(data.degree || '')}">
    <input type="text" class="edu-school" placeholder="School / institution" value="${escapeAttr(data.school || '')}">
    <input type="text" class="edu-dates" placeholder="2024 - 2025" value="${escapeAttr(data.dates || '')}">
    <input type="text" class="edu-location" placeholder="City, Province/State" value="${escapeAttr(data.location || '')}">
  `;
  div.querySelector('.remove-exp').addEventListener('click', () => div.remove());
  return div;
}

addEduBtn.addEventListener('click', () => {
  eduList.appendChild(makeEduEntry());
});

function makeExpEntry(data = {}) {
  const div = document.createElement('div');
  div.className = 'exp-entry';
  div.innerHTML = `
    <button type="button" class="remove-exp" title="Remove">✕</button>
    <input type="text" class="exp-title" placeholder="Job title" value="${escapeAttr(data.title || '')}">
    <input type="text" class="exp-company" placeholder="Company" value="${escapeAttr(data.company || '')}">
    <input type="text" class="exp-location" placeholder="Location (e.g. Vancouver, BC / Remote)" value="${escapeAttr(data.location || '')}">
    <input type="text" class="exp-dates" placeholder="Oct 2025 - Present" value="${escapeAttr(data.dates || '')}">
    <textarea class="exp-desc" rows="3" placeholder="Bullet points / description">${escapeHtml(data.desc || '')}</textarea>
  `;
  div.querySelector('.remove-exp').addEventListener('click', () => div.remove());
  return div;
}

function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }
function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

addExpBtn.addEventListener('click', () => {
  expList.appendChild(makeExpEntry());
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector(`.panel[data-panel="${btn.dataset.tab}"]`).classList.add('active');
  });
});

function loadProfile() {
  chrome.storage.local.get(['profile'], (result) => {
    const profile = result.profile || {};
    for (const [key, val] of Object.entries(profile)) {
      if (key === 'experience' || key === 'education' || key === 'certs') continue;
      const field = form.elements[key];
      if (field) field.value = val;
    }
    expList.innerHTML = '';
    (profile.experience || []).forEach(exp => expList.appendChild(makeExpEntry(exp)));
    if (!profile.experience || profile.experience.length === 0) {
      expList.appendChild(makeExpEntry());
    }
    eduList.innerHTML = '';
    (profile.education || []).forEach(edu => eduList.appendChild(makeEduEntry(edu)));
    if (!profile.education || profile.education.length === 0) {
      eduList.appendChild(makeEduEntry());
    }
    certList.innerHTML = '';
    let certs = profile.certs;
    if (typeof certs === 'string') {
      // legacy format: convert a one-per-line blob into entries
      certs = certs.split('\n').map(line => line.trim()).filter(Boolean).map(name => ({ name }));
    }
    (certs || []).forEach(cert => certList.appendChild(makeCertEntry(cert)));
    if (!certs || certs.length === 0) {
      certList.appendChild(makeCertEntry());
    }
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const profile = {
    fullName: form.fullName.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    city: form.city.value.trim(),
    province: form.province.value.trim(),
    streetAddress: form.streetAddress.value.trim(),
    addressLine2: form.addressLine2.value.trim(),
    postalCode: form.postalCode.value.trim(),
    country: form.country.value.trim(),
    linkedin: form.linkedin.value.trim(),
    portfolio: form.portfolio.value.trim(),
    certs: Array.from(certList.querySelectorAll('.exp-entry')).map(div => ({
      name: div.querySelector('.cert-name').value.trim(),
    })).filter(c => c.name),
    skills: form.skills.value.trim(),
    education: Array.from(eduList.querySelectorAll('.exp-entry')).map(div => ({
      degree: div.querySelector('.edu-degree').value.trim(),
      school: div.querySelector('.edu-school').value.trim(),
      dates: div.querySelector('.edu-dates').value.trim(),
      location: div.querySelector('.edu-location').value.trim(),
    })).filter(edu => edu.degree || edu.school),
    experience: Array.from(expList.querySelectorAll('.exp-entry')).map(div => ({
      title: div.querySelector('.exp-title').value.trim(),
      company: div.querySelector('.exp-company').value.trim(),
      location: div.querySelector('.exp-location').value.trim(),
      dates: div.querySelector('.exp-dates').value.trim(),
      desc: div.querySelector('.exp-desc').value.trim(),
    })).filter(exp => exp.title || exp.company || exp.desc)
  };

  chrome.storage.local.set({ profile }, () => {
    savedMsg.textContent = 'Saved ✓';
    savedMsg.classList.add('show');
    setTimeout(() => savedMsg.classList.remove('show'), 1500);
  });
});

document.getElementById('exportBtn').addEventListener('click', () => {
  if (isPopup) {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    window.close();
    return;
  }
  chrome.storage.local.get(['profile'], (result) => {
    const blob = new Blob([JSON.stringify(result.profile || {}, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'autofill-profile-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });
});

document.getElementById('importBtn').addEventListener('click', () => {
  if (isPopup) {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    window.close();
    return;
  }
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const profile = JSON.parse(reader.result);
      chrome.storage.local.set({ profile }, loadProfile);
    } catch (err) {
      alert('That file does not look like a valid backup.');
    }
  };
  reader.readAsText(file);
});

document.getElementById('wipeBtn').addEventListener('click', () => {
  if (confirm('Erase all saved autofill data from this browser? This cannot be undone.')) {
    chrome.storage.local.remove(['profile'], loadProfile);
  }
});

loadProfile();
