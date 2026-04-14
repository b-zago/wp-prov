const API = "/api";

// ---- Navigation ----

const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");

function switchView(name) {
  navItems.forEach((el) =>
    el.classList.toggle("active", el.dataset.view === name),
  );
  views.forEach((el) =>
    el.classList.toggle("active", el.id === `view-${name}`),
  );
  if (name === "instances") loadInstances();
}

navItems.forEach((el) =>
  el.addEventListener("click", () => {
    if (el.disabled) return;
    switchView(el.dataset.view);
  }),
);

// ---- API status ----

const statusDot = document.getElementById("api-status-dot");
const statusText = document.getElementById("api-status-text");

async function checkApiStatus() {
  try {
    const res = await fetch(`${API}`);
    if (res.ok) {
      statusDot.className = "status-dot ok";
      statusText.textContent = "API online";
    } else {
      throw new Error();
    }
  } catch {
    statusDot.className = "status-dot err";
    statusText.textContent = "API unreachable";
  }
}

// ---- Instances ----

const tbody = document.getElementById("instances-tbody");
const statTotal = document.getElementById("stat-total");
const statHealthy = document.getElementById("stat-healthy");
const statSynced = document.getElementById("stat-synced");
const statDegraded = document.getElementById("stat-degraded");
const statCapacity = document.getElementById("stat-capacity");

// Track current limit state for use across functions
let currentLimit = null;
let currentCount = 0;

function applyLimitState(count, limit) {
  currentCount = count;
  currentLimit = limit;

  const atLimit = limit !== null && count >= limit;
  const deployNavBtn = document.querySelector('.nav-item[data-view="deploy"]');
  const deployBtn = document.getElementById("btn-deploy");

  // Update capacity stat
  if (statCapacity) {
    statCapacity.textContent = limit !== null ? `${count} / ${limit}` : count;
    statCapacity.className =
      "stat-value" +
      (atLimit ? " danger" : count >= limit * 0.8 ? " warn" : "");
  }

  // Disable/enable the Deploy nav button
  if (deployNavBtn) {
    deployNavBtn.disabled = atLimit;
    deployNavBtn.title = atLimit
      ? `Instance limit reached (${limit} max). Delete an instance first.`
      : "";
    deployNavBtn.classList.toggle("disabled", atLimit);
  }

  // Disable/enable the Deploy submit button (if we're on that view)
  if (deployBtn) {
    deployBtn.disabled = atLimit;
  }

  // If currently on deploy view and now at limit, show a banner
  const deployResult = document.getElementById("deploy-result");
  const isDeployViewActive = document
    .getElementById("view-deploy")
    ?.classList.contains("active");

  if (isDeployViewActive && deployResult) {
    if (atLimit) {
      showResult(
        "error",
        `<div class="result-title">Instance limit reached</div><div>You have ${count} of ${limit} allowed instances. Delete one before deploying a new instance.</div>`,
      );
    } else {
      // Clear limit banner if it was showing (don't clear success/other messages)
      if (deployResult.dataset.limitBanner === "true") {
        deployResult.classList.add("hidden");
        deployResult.dataset.limitBanner = "";
      }
    }
  }

  if (isDeployViewActive && deployResult && atLimit) {
    deployResult.dataset.limitBanner = "true";
  }
}

function healthBadge(status) {
  const s = (status || "Unknown").toLowerCase();
  const label = status || "Unknown";
  return `<span class="badge ${s}"><span class="badge-dot"></span>${label}</span>`;
}

function syncBadge(status) {
  const s = (status || "Unknown").toLowerCase().replace(/\s/g, "");
  const label = status || "Unknown";
  return `<span class="badge ${s}"><span class="badge-dot"></span>${label}</span>`;
}

async function loadInstances() {
  tbody.innerHTML =
    '<tr class="placeholder-row"><td colspan="7">Loading...</td></tr>';

  try {
    const res = await fetch(`${API}/instances`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const instances = data.instances || [];
    const limit = data.limit ?? null;

    statTotal.textContent = instances.length;
    statHealthy.textContent = instances.filter(
      (i) => i.healthStatus === "Healthy",
    ).length;
    statSynced.textContent = instances.filter(
      (i) => i.syncStatus === "Synced",
    ).length;
    statDegraded.textContent = instances.filter(
      (i) => i.healthStatus === "Degraded" || i.healthStatus === "Missing",
    ).length;

    applyLimitState(instances.length, limit);

    if (instances.length === 0) {
      tbody.innerHTML =
        '<tr class="placeholder-row"><td colspan="7">No instances deployed yet.</td></tr>';
      return;
    }

    tbody.innerHTML = instances
      .map(
        (inst) => `
      <tr data-name="${inst.releaseName}">
        <td class="name-cell">${inst.releaseName}</td>
        <td>
          ${
            inst.url
              ? `<a href="${inst.url}" target="_blank" rel="noopener" style="color: var(--accent); text-decoration: none;">${inst.url}</a>`
              : '<span style="color:var(--text-dim)">—</span>'
          }
        </td>
        <td class="mono">${inst.namespace || "—"}</td>
        <td class="mono">${inst.sftpPort || "—"}</td>
        <td>${healthBadge(inst.healthStatus)}</td>
        <td>${syncBadge(inst.syncStatus)}</td>
        <td>
          <button class="btn-icon-delete" data-name="${inst.releaseName}" title="Delete instance">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.75 3.5h10.5M5.25 3.5V2.333a.583.583 0 0 1 .583-.583h2.334a.583.583 0 0 1 .583.583V3.5M11.083 3.5l-.583 7.583a.583.583 0 0 1-.583.584H4.083a.583.583 0 0 1-.583-.584L2.917 3.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </td>
      </tr>
    `,
      )
      .join("");

    tbody.querySelectorAll(".btn-icon-delete").forEach((btn) => {
      btn.addEventListener("click", () => openDeleteModal(btn.dataset.name));
    });
  } catch (err) {
    tbody.innerHTML = `<tr class="placeholder-row"><td colspan="7">Failed to load: ${err.message}</td></tr>`;
  }
}

document.getElementById("btn-refresh").addEventListener("click", loadInstances);

// ---- Delete modal ----

const backdrop = document.getElementById("modal-backdrop");
const modalMessage = document.getElementById("modal-message");
const modalConfirm = document.getElementById("modal-confirm");
const modalCancel = document.getElementById("modal-cancel");
let pendingDeleteName = null;

function openDeleteModal(name) {
  pendingDeleteName = name;
  modalMessage.textContent = `Delete "${name}"? This will remove the ArgoCD application and all associated resources. This cannot be undone.`;
  backdrop.classList.remove("hidden");
}

function closeModal() {
  backdrop.classList.add("hidden");
  pendingDeleteName = null;
}

modalCancel.addEventListener("click", closeModal);
backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) closeModal();
});

modalConfirm.addEventListener("click", async () => {
  if (!pendingDeleteName) return;
  const name = pendingDeleteName;
  closeModal();

  try {
    const res = await fetch(`${API}/deploy/${name}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      alert(`Failed to delete: ${err.detail}`);
      return;
    }
    loadInstances();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
});

// ---- Deploy form ----

const form = document.getElementById("deploy-form");
const btnDeploy = document.getElementById("btn-deploy");
const btnDeployLabel = document.getElementById("btn-deploy-label");
const btnDeploySpinner = document.getElementById("btn-deploy-spinner");
const deployResult = document.getElementById("deploy-result");

const REQUIRED_FIELDS = [
  "releaseName",
  "url",
  "title",
  "wpMail",
  "wpUser",
  "wpPassword",
  "dbUser",
  "dbPassword",
  "dbRootPassword",
  "sftpUser",
  "sftpPassword",
];

function setLoading(loading) {
  btnDeploy.disabled =
    loading || (currentLimit !== null && currentCount >= currentLimit);
  btnDeployLabel.textContent = loading ? "Deploying..." : "Deploy";
  btnDeploySpinner.classList.toggle("hidden", !loading);
}

function showResult(type, content) {
  deployResult.className = `deploy-result ${type}`;
  deployResult.innerHTML = content;
  deployResult.classList.remove("hidden");
}

function validateForm(data) {
  let valid = true;
  REQUIRED_FIELDS.forEach((key) => {
    const input = document.getElementById(key);
    if (!data[key] || !data[key].trim()) {
      input.classList.add("error");
      valid = false;
    } else {
      input.classList.remove("error");
    }
  });
  return valid;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Re-check limit on submit as a safeguard
  if (currentLimit !== null && currentCount >= currentLimit) {
    showResult(
      "error",
      `<div class="result-title">Instance limit reached</div><div>You have ${currentCount} of ${currentLimit} allowed instances.</div>`,
    );
    return;
  }

  const data = {};
  REQUIRED_FIELDS.forEach((key) => {
    data[key] = document.getElementById(key).value;
  });

  if (!validateForm(data)) {
    showResult(
      "error",
      '<div class="result-title">Please fill in all required fields.</div>',
    );
    return;
  }

  setLoading(true);
  deployResult.classList.add("hidden");

  try {
    const res = await fetch(`${API}/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const detail = json?.detail || res.statusText;
      showResult(
        "error",
        `<div class="result-title">Deployment failed</div><div>${detail}</div>`,
      );
      return;
    }

    showResult(
      "success",
      `
      <div class="result-title">Instance queued for deployment</div>
      <div class="result-row"><span class="result-key">Release</span><span class="result-val">${json.releaseName}</span></div>
      <div class="result-row"><span class="result-key">Namespace</span><span class="result-val">${json.namespace}</span></div>
      <div class="result-row"><span class="result-key">SFTP port</span><span class="result-val">${json.sftpPort}</span></div>
    `,
    );

    // Refresh instance count so the limit state updates
    loadInstances();

    form.reset();
    REQUIRED_FIELDS.forEach((key) =>
      document.getElementById(key).classList.remove("error"),
    );
  } catch (err) {
    showResult(
      "error",
      `<div class="result-title">Network error</div><div>${err.message}</div>`,
    );
  } finally {
    setLoading(false);
  }
});

// Re-apply limit state when switching to deploy view
document
  .querySelector('.nav-item[data-view="deploy"]')
  ?.addEventListener("click", () => {
    if (currentLimit !== null) {
      applyLimitState(currentCount, currentLimit);
    }
  });

// ---- Init ----

checkApiStatus();
loadInstances();
