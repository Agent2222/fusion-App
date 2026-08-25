/**
 * Studio "Manage Invites" — pill-based modal for viewing and managing broadcast credits.
 * Color-coded pills by credit count: 0=red, 1=amber, 2=blue, 3+=green.
 */
import { getAccountsForStudio, staffListBroadcastCreditsStudio, staffBatchSetBroadcastCreditsForStudio } from '../../utils/database.js';
import { openStudioModal } from '../../utils/studioModal.js';

const CREDIT_COLORS = {
  0: { cls: 'studio-invite-pill--credits-0', label: '0 credits' },
  1: { cls: 'studio-invite-pill--credits-1', label: '1 credit' },
  2: { cls: 'studio-invite-pill--credits-2', label: '2 credits' },
  3: { cls: 'studio-invite-pill--credits-3', label: '3+ credits' },
};

function creditTierClass(balance) {
  if (balance <= 0) return CREDIT_COLORS[0].cls;
  if (balance === 1) return CREDIT_COLORS[1].cls;
  if (balance === 2) return CREDIT_COLORS[2].cls;
  return CREDIT_COLORS[3].cls;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function displayName(account) {
  const en = account?.locales?.en;
  if (en && typeof en === 'object' && en.name != null && String(en.name).trim()) {
    return String(en.name).trim();
  }
  return String(account?.slug || account?.id || account?.principal || '').trim() || '\u2014';
}

/**
 * @param {Array<{principal: string, name: string, balance: number}>} users
 * @param {Set<string>} selected
 * @param {string} filter
 * @param {string} search
 */
function renderPills(users, selected, filter, search) {
  const searchLower = search.toLowerCase();
  return users
    .filter((u) => {
      if (filter === '0' && u.balance !== 0) return false;
      if (filter === '1' && u.balance !== 1) return false;
      if (filter === '2' && u.balance !== 2) return false;
      if (filter === '3+' && u.balance < 3) return false;
      if (searchLower && !u.name.toLowerCase().includes(searchLower) && !u.principal.toLowerCase().includes(searchLower)) return false;
      return true;
    })
    .map((u) => {
      const isSelected = selected.has(u.principal);
      const tierCls = creditTierClass(u.balance);
      return `<button type="button" class="studio-invite-pill ${tierCls}${isSelected ? ' studio-invite-pill--selected' : ''}" data-principal="${escapeHtml(u.principal)}">
        <span class="studio-invite-pill__name">${escapeHtml(u.name)}</span>
        <span class="studio-invite-pill__badge">${u.balance}</span>
      </button>`;
    })
    .join('');
}

export async function openManageInvitesModal() {
  const [accounts, creditRows] = await Promise.all([
    getAccountsForStudio(),
    staffListBroadcastCreditsStudio(),
  ]);

  const creditMap = new Map(creditRows.map(([p, b]) => [p, b]));

  const users = accounts.map((acc) => {
    const principal = String(acc.principal || '').trim();
    return {
      principal,
      name: displayName(acc),
      balance: creditMap.get(principal) || 0,
    };
  });

  users.sort((a, b) => a.balance - b.balance || a.name.localeCompare(b.name));

  const selected = new Set();
  let currentFilter = 'all';
  let currentSearch = '';

  const html = `
    <div class="studio-manage-invites">
      <div class="studio-manage-invites__toolbar">
        <input type="search" class="studio-input studio-manage-invites__search" placeholder="Search by name or principal\u2026" autocomplete="off" data-mi-search />
        <select class="studio-input studio-manage-invites__filter" data-mi-filter>
          <option value="all">All users</option>
          <option value="0">0 credits</option>
          <option value="1">1 credit</option>
          <option value="2">2 credits</option>
          <option value="3+">3+ credits</option>
        </select>
        <button type="button" class="studio-btn-secondary studio-manage-invites__select-all" data-mi-select-all>Select all visible</button>
        <button type="button" class="studio-btn-secondary studio-manage-invites__clear" data-mi-clear-selection>Clear</button>
      </div>
      <div class="studio-manage-invites__pills" data-mi-pills>
        ${renderPills(users, selected, currentFilter, currentSearch)}
      </div>
      <div class="studio-manage-invites__actions">
        <div class="studio-manage-invites__summary" data-mi-summary>0 users selected</div>
        <div class="studio-manage-invites__controls">
          <label class="studio-manage-invites__set-label">
            Set credits to:
            <input type="number" class="studio-input studio-manage-invites__set-input" min="0" max="10" value="1" data-mi-set-value />
          </label>
          <button type="button" class="studio-btn-primary studio-manage-invites__apply" data-mi-apply>Apply to selected</button>
          <button type="button" class="studio-btn-secondary studio-manage-invites__inc" data-mi-inc>+1 credit</button>
          <button type="button" class="studio-btn-secondary studio-manage-invites__dec" data-mi-dec>\u22121 credit</button>
        </div>
      </div>
    </div>
  `;

  const { close, root } = openStudioModal(html, {
    title: 'Manage Broadcast Credits',
    wide: true,
  });

  const pillsContainer = root.querySelector('[data-mi-pills]');
  const summaryEl = root.querySelector('[data-mi-summary]');

  function repaint() {
    if (pillsContainer) {
      pillsContainer.innerHTML = renderPills(users, selected, currentFilter, currentSearch);
    }
    updateSummary();
  }

  function updateSummary() {
    if (!summaryEl) return;
    const count = selected.size;
    if (count === 0) {
      summaryEl.textContent = '0 users selected';
      return;
    }
    const selectedUsers = users.filter((u) => selected.has(u.principal));
    const balances = selectedUsers.map((u) => u.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const range = min === max ? `${min} credits` : `${min}\u2013${max} credits`;
    summaryEl.textContent = `${count} user${count > 1 ? 's' : ''} selected \u2014 current range: ${range}`;
  }

  if (pillsContainer) {
    pillsContainer.addEventListener('click', (e) => {
      const pill = /** @type {HTMLElement} */ (e.target).closest('[data-principal]');
      if (!pill) return;
      const p = pill.getAttribute('data-principal');
      if (!p) return;
      if (selected.has(p)) selected.delete(p); else selected.add(p);
      pill.classList.toggle('studio-invite-pill--selected');
      updateSummary();
    });
  }

  const searchInput = root.querySelector('[data-mi-search]');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentSearch = /** @type {HTMLInputElement} */ (searchInput).value;
      repaint();
    });
  }

  const filterSelect = root.querySelector('[data-mi-filter]');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      currentFilter = /** @type {HTMLSelectElement} */ (filterSelect).value;
      repaint();
    });
  }

  root.querySelector('[data-mi-select-all]')?.addEventListener('click', () => {
    const searchLower = currentSearch.toLowerCase();
    users.forEach((u) => {
      let show = true;
      if (currentFilter === '0' && u.balance !== 0) show = false;
      if (currentFilter === '1' && u.balance !== 1) show = false;
      if (currentFilter === '2' && u.balance !== 2) show = false;
      if (currentFilter === '3+' && u.balance < 3) show = false;
      if (searchLower && !u.name.toLowerCase().includes(searchLower) && !u.principal.toLowerCase().includes(searchLower)) show = false;
      if (show) selected.add(u.principal);
    });
    repaint();
  });

  root.querySelector('[data-mi-clear-selection]')?.addEventListener('click', () => {
    selected.clear();
    repaint();
  });

  async function applyCredits(calcBalance) {
    if (selected.size === 0) return;
    const entries = [];
    for (const u of users) {
      if (!selected.has(u.principal)) continue;
      const newBal = calcBalance(u.balance);
      if (newBal !== u.balance) {
        entries.push([u.principal, newBal]);
      }
    }
    if (entries.length === 0) return;
    const batchSize = 100;
    for (let i = 0; i < entries.length; i += batchSize) {
      await staffBatchSetBroadcastCreditsForStudio(entries.slice(i, i + batchSize));
    }
    for (const [p, b] of entries) {
      const u = users.find((x) => x.principal === p);
      if (u) u.balance = b;
    }
    users.sort((a, b) => a.balance - b.balance || a.name.localeCompare(b.name));
    repaint();
  }

  root.querySelector('[data-mi-apply]')?.addEventListener('click', () => {
    const setVal = Math.max(0, Math.min(10, Number(root.querySelector('[data-mi-set-value]')?.value) || 0));
    void applyCredits(() => setVal);
  });

  root.querySelector('[data-mi-inc]')?.addEventListener('click', () => {
    void applyCredits((bal) => Math.min(10, bal + 1));
  });

  root.querySelector('[data-mi-dec]')?.addEventListener('click', () => {
    void applyCredits((bal) => Math.max(0, bal - 1));
  });
}
