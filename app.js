/******************************************
 * DATA STRUCTURES & STATE
 ******************************************/

const QUEST_TYPES = {
  LOCATION: "location",
  JOURNAL: "journal",
  PHOTO: "photo",
  FINAL: "final",
};

// master quest list
const quests = [
  {
    id: "q1",
    title: "📚 Find the Library",
    description:
      "Go to the library, find where to borrow books or study, and scan the code or enter the QuestRouX code.",
    location: "Library",
    type: QUEST_TYPES.LOCATION,
    reward: 40,
    code: "LIB123",
    prerequisites: { minXp: 0, requiredQuests: [] },
  },
  {
    id: "q2",
    title: "🧑‍💻 Book a Study Room",
    description:
      "Learn how to book a study room. Visit the study area and either scan the code or ask where the code is posted.",
    location: "Study Rooms",
    type: QUEST_TYPES.LOCATION,
    reward: 40,
    code: "STUDY456",
    prerequisites: { minXp: 0, requiredQuests: [] },
  },
  {
    id: "q3",
    title: "🏥 Meet Your Advisor",
    description:
      "Schedule a meeting with your academic advisor, attend it, and write a short reflection about how it went.",
    location: "Advisor Meeting",
    type: QUEST_TYPES.JOURNAL,
    reward: 60,
    prerequisites: { minXp: 0, requiredQuests: [] },
  },
  {
    id: "q4",
    title: "☕ Discover Your Favorite Spot",
    description:
      "Explore the café or another cozy spot on campus. Take a photo of the place or a selfie that captures how it feels.",
    location: "Café / Lounge",
    type: QUEST_TYPES.PHOTO,
    reward: 50,
    prerequisites: { minXp: 20, requiredQuests: [] },
  },
  {
    id: "q5",
    title: "📌 Visit Student Services",
    description:
      "Visit student services and find out at least one way they can support you. Scan or enter the code at the location.",
    location: "Student Services",
    type: QUEST_TYPES.LOCATION,
    reward: 60,
    code: "SERV789",
    prerequisites: { minXp: 40, requiredQuests: ["q1"] },
  },
  {
    id: "q6",
    title: "⭐ Yearbook Entry: Mark Your Arrival",
    description:
      "Final quest. When you feel ready, write a short yearbook-style reflection, add a caption, and upload a selfie in a meaningful campus spot.",
    location: "Anywhere on Campus",
    type: QUEST_TYPES.FINAL,
    reward: 80,
    prerequisites: { minXp: 120, requiredQuests: ["q3", "q4"] },
  },
];

const STORAGE_KEY = "questrouxState";

const defaultState = {
  xp: 0,
  completedQuests: [], // quest ids
  trackedQuestId: null,
  journals: [], // { id, questId, text, createdAt }
  memories: [], // { id, questId, caption, imageData, createdAt, isYearbook }
  friends: [], // { id, name, createdAt }
  activityLog: [], // string messages
};

let state = loadState();

/******************************************
 * DOM ELEMENTS
 ******************************************/

const views = {
  questsView: document.getElementById("questsView"),
  mapView: document.getElementById("mapView"),
  journalView: document.getElementById("journalView"),
  memoriesView: document.getElementById("memoriesView"),
  socialView: document.getElementById("socialView"),
  rewardsView: document.getElementById("rewardsView"),
};

const tabButtons = document.querySelectorAll(".tab-button");

const trackedQuestContainer = document.getElementById("trackedQuestContainer");
const trackedQuestCard = document.getElementById("trackedQuestCard");

const availableQuestList = document.getElementById("availableQuestList");
const completedQuestList = document.getElementById("completedQuestList");
const lockedQuestList = document.getElementById("lockedQuestList");

const gpsStatus = document.getElementById("gpsStatus");
const mapLocationList = document.getElementById("mapLocationList");

const journalList = document.getElementById("journalList");
const memoriesGrid = document.getElementById("memoriesGrid");

const friendNameInput = document.getElementById("friendName");
const sendFriendRequestBtn = document.getElementById("sendFriendRequestBtn");
const friendList = document.getElementById("friendList");

const progressPercent = document.getElementById("progressPercent");
const xpFill = document.getElementById("xpFill");
const xpLabel = document.getElementById("xpLabel");
const badgeList = document.getElementById("badgeList");
const activityList = document.getElementById("activityLog");

// Quest detail overlay
const questDetailView = document.getElementById("questDetailView");
const closeDetailBtn = document.getElementById("closeDetail");
const detailTitle = document.getElementById("detailTitle");
const detailDescription = document.getElementById("detailDescription");
const detailType = document.getElementById("detailType");
const detailLocation = document.getElementById("detailLocation");
const detailReward = document.getElementById("detailReward");
const detailStatus = document.getElementById("detailStatus");
const detailHint = document.getElementById("detailHint");
const questDynamicContent = document.getElementById("questDynamicContent");
const trackQuestBtn = document.getElementById("trackQuestBtn");
const completeQuestBtn = document.getElementById("completeQuestBtn");

// QR overlay
const qrOverlay = document.getElementById("qrOverlay");

// AI helper
const aiHelperButton = document.getElementById("aiHelperButton");
const aiHelperPanel = document.getElementById("aiHelperPanel");
const aiHelperBody = document.getElementById("aiHelperBody");
const closeAiHelper = document.getElementById("closeAiHelper");

// Toasts
const toastContainer = document.getElementById("toastContainer");

// Splash
const splashScreen = document.getElementById("splashScreen");

/******************************************
 * STATE PERSISTENCE
 ******************************************/

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  } catch (e) {
    console.error("Error loading state", e);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/******************************************
 * UTILS
 ******************************************/

function showToast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function logActivity(message) {
  state.activityLog.push(message);
  if (state.activityLog.length > 50) {
    state.activityLog.shift();
  }
}

function isQuestCompleted(id) {
  return state.completedQuests.includes(id);
}

function getQuestById(id) {
  return quests.find((q) => q.id === id) || null;
}

function getQuestStatus(quest) {
  if (isQuestCompleted(quest.id)) return "Completed";
  if (isQuestLocked(quest)) return "Locked";
  return "Available";
}

function isQuestLocked(quest) {
  const { minXp = 0, requiredQuests = [] } = quest.prerequisites || {};
  if (state.xp < minXp) return true;
  for (const qid of requiredQuests) {
    if (!state.completedQuests.includes(qid)) return true;
  }
  return false;
}

/******************************************
 * VIEW SWITCHING
 ******************************************/

function switchView(viewId) {
  Object.entries(views).forEach(([id, el]) => {
    el.classList.toggle("active", id === viewId);
  });
  tabButtons.forEach((btn) =>
    btn.classList.toggle(
      "active",
      btn.dataset.view === viewId
    )
  );
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    switchView(view);
    if (view === "mapView") getUserLocation(); // update GPS when visiting map
  });
});

/******************************************
 * QUEST RENDERING (CATEGORIES + TRACKING)
 ******************************************/

function renderQuests() {
  const available = [];
  const completed = [];
  const locked = [];

  quests.forEach((q) => {
    if (isQuestCompleted(q.id)) {
      completed.push(q);
    } else if (isQuestLocked(q)) {
      locked.push(q);
    } else {
      available.push(q);
    }
  });

  // tracked quest
  const trackedQuest =
    state.trackedQuestId && getQuestById(state.trackedQuestId);
  if (trackedQuest && !isQuestCompleted(trackedQuest.id)) {
    trackedQuestContainer.classList.remove("hidden");
    trackedQuestCard.innerHTML = renderQuestCardHtml(trackedQuest, true);
    attachQuestCardHandlers(trackedQuestCard, trackedQuest);
  } else {
    trackedQuestContainer.classList.add("hidden");
    trackedQuestCard.innerHTML = "";
    if (trackedQuest && isQuestCompleted(trackedQuest.id)) {
      state.trackedQuestId = null;
      saveState();
    }
  }

  availableQuestList.innerHTML = "";
  available.forEach((q) => {
    const card = document.createElement("article");
    card.className = "card";
    const isTracked = state.trackedQuestId === q.id;
    card.innerHTML = renderQuestCardHtml(q, isTracked);
    availableQuestList.appendChild(card);
    attachQuestCardHandlers(card, q);
  });

  completedQuestList.innerHTML = "";
  completed.forEach((q) => {
    const card = document.createElement("article");
    card.className = "card";
    card.style.opacity = "0.7";
    card.innerHTML = renderQuestCardHtml(q, false);
    completedQuestList.appendChild(card);
    attachQuestCardHandlers(card, q);
  });

  lockedQuestList.innerHTML = "";
  locked.forEach((q) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = renderLockedQuestCardHtml(q);
    lockedQuestList.appendChild(card);
  });
}

function renderQuestCardHtml(q, isTracked) {
  const status = getQuestStatus(q);
  const statusClass =
    status === "Completed" ? "completed" : status === "Locked" ? "locked" : "";
  const trackedTag = isTracked ? `<span class="tag tracked">📍 Tracked</span>` : "";
  let typeLabel = "";
  if (q.type === QUEST_TYPES.LOCATION) typeLabel = "Location quest";
  else if (q.type === QUEST_TYPES.JOURNAL) typeLabel = "Journal quest";
  else if (q.type === QUEST_TYPES.PHOTO) typeLabel = "Photo quest";
  else if (q.type === QUEST_TYPES.FINAL) typeLabel = "Final yearbook quest";

  return `
    <div class="card-header">
      <div>
        <div class="card-title">${q.title}</div>
        <div class="card-location">${q.location}</div>
      </div>
      <div>
        <span class="tag ${statusClass}">${status}</span>
        ${trackedTag}
      </div>
    </div>
    <div>
      <small>${q.description}</small>
    </div>
    <div class="card-footer">
      <span class="tag">Reward: ${q.reward} XP</span>
      <span class="tag">${typeLabel}</span>
      <button class="primary-btn" data-quest-id="${q.id}">Open</button>
    </div>
  `;
}

function renderLockedQuestCardHtml(q) {
  const { minXp = 0, requiredQuests = [] } = q.prerequisites || {};
  const reqTitles = requiredQuests
    .map((id) => getQuestById(id)?.title || id)
    .join(", ");

  let reqText = "";
  if (minXp > 0) reqText += `Requires at least ${minXp} XP. `;
  if (requiredQuests.length > 0)
    reqText += `Complete: ${reqTitles || "some quests"} first.`;

  return `
    <div class="card-header">
      <div>
        <div class="card-title">${q.title}</div>
        <div class="card-location">${q.location}</div>
      </div>
      <span class="tag locked">Locked</span>
    </div>
    <div>
      <small>${reqText}</small>
    </div>
  `;
}

function attachQuestCardHandlers(container, quest) {
  const btn = container.querySelector("button[data-quest-id]");
  if (!btn) return;
  btn.addEventListener("click", () => openQuestDetail(quest.id));
}

/******************************************
 * QUEST DETAIL & COMPLETION LOGIC
 ******************************************/

let currentQuest = null;

function openQuestDetail(questId) {
  const q = getQuestById(questId);
  if (!q) return;
  currentQuest = q;

  detailTitle.textContent = q.title;
  detailDescription.textContent = q.description;
  detailLocation.textContent = q.location;
  detailReward.textContent = q.reward;
  detailType.textContent = q.type;
  detailStatus.textContent = getQuestStatus(q);

  detailHint.textContent =
    q.type === QUEST_TYPES.LOCATION
      ? "AI Tip: In a full version, this quest would use real GPS and QR codes posted at the location."
      : q.type === QUEST_TYPES.JOURNAL
      ? "AI Tip: Journaling helps you process new experiences and remember important information."
      : q.type === QUEST_TYPES.PHOTO
      ? "AI Tip: Capturing spaces you like can help you feel more at home on campus."
      : "AI Tip: The yearbook quest marks a milestone moment in your journey at Roux.";

  // dynamic content based on quest type
  questDynamicContent.innerHTML = "";
  if (isQuestLocked(q)) {
    questDynamicContent.innerHTML =
      "<p><em>This quest is locked. Complete the prerequisites first.</em></p>";
    completeQuestBtn.disabled = true;
  } else if (isQuestCompleted(q.id)) {
    questDynamicContent.innerHTML =
      "<p><em>This quest is already completed.</em></p>";
    completeQuestBtn.disabled = true;
  } else {
    completeQuestBtn.disabled = false;
    renderQuestTypeInputs(q);
  }

  // track/untrack button label
  if (isQuestCompleted(q.id) || isQuestLocked(q)) {
    trackQuestBtn.disabled = true;
    trackQuestBtn.textContent = "Cannot track";
  } else {
    trackQuestBtn.disabled = false;
    trackQuestBtn.textContent =
      state.trackedQuestId === q.id ? "Untrack quest" : "Track this quest";
  }

  questDetailView.classList.remove("hidden");
}

function closeQuestDetail() {
  questDetailView.classList.add("hidden");
  currentQuest = null;
}

closeDetailBtn.addEventListener("click", closeQuestDetail);

function renderQuestTypeInputs(q) {
  if (q.type === QUEST_TYPES.LOCATION) {
    questDynamicContent.innerHTML = `
      <p><strong>Complete this quest by:</strong></p>
      <ul>
        <li>Scanning the QR code at the location (simulated here), or</li>
        <li>Typing the QuestRouX code printed at the location.</li>
      </ul>
      <label>Enter code:</label>
      <input id="locationCodeInput" type="text" placeholder="e.g., LIB123" />
      <div style="margin-top:8px; display:flex; gap:8px;">
        <button id="simulateQrBtn" class="secondary-btn">Simulate QR Scan</button>
        <button id="submitCodeBtn" class="primary-btn">Submit code</button>
      </div>
    `;

    const simulateQrBtn = document.getElementById("simulateQrBtn");
    const submitCodeBtn = document.getElementById("submitCodeBtn");
    const codeInput = document.getElementById("locationCodeInput");

    simulateQrBtn.addEventListener("click", () => {
      simulateQrScan(() => {
        completeQuestWithXP(q);
      });
    });

    submitCodeBtn.addEventListener("click", () => {
      const entered = (codeInput.value || "").trim().toUpperCase();
      if (!entered) {
        showToast("Please enter a code.");
        return;
      }
      if (q.code && entered === q.code.toUpperCase()) {
        completeQuestWithXP(q);
      } else {
        showToast("That code doesn't match this quest.");
      }
    });
  } else if (q.type === QUEST_TYPES.JOURNAL) {
    questDynamicContent.innerHTML = `
      <label for="journalText"><strong>Journal about this experience:</strong></label>
      <textarea id="journalText" rows="4" placeholder="Write a few sentences about what happened, how you felt, or what you learned."></textarea>
    `;
  } else if (q.type === QUEST_TYPES.PHOTO || q.type === QUEST_TYPES.FINAL) {
    const extra = q.type === QUEST_TYPES.FINAL
      ? `<p><em>This will become your yearbook-style highlight.</em></p>`
      : "";
    questDynamicContent.innerHTML = `
      ${extra}
      <label for="photoCaption"><strong>Caption</strong></label>
      <input id="photoCaption" type="text" placeholder="Give this memory a short title" />
      <label for="photoFile"><strong>Upload a photo</strong></label>
      <input id="photoFile" type="file" accept="image/*" />
      ${
        q.type === QUEST_TYPES.FINAL
          ? `<label for="yearbookText"><strong>Yearbook reflection</strong></label>
             <textarea id="yearbookText" rows="3" placeholder="Write a short reflection for your future self."></textarea>`
          : ""
      }
    `;
  }
}

// track/untrack
trackQuestBtn.addEventListener("click", () => {
  if (!currentQuest) return;
  if (isQuestLocked(currentQuest) || isQuestCompleted(currentQuest.id)) return;

  if (state.trackedQuestId === currentQuest.id) {
    state.trackedQuestId = null;
    showToast("Stopped tracking quest.");
  } else {
    state.trackedQuestId = currentQuest.id;
    showToast("Now tracking this quest.");
  }
  saveState();
  renderQuests();
});

// complete quest (delegates by type)
completeQuestBtn.addEventListener("click", () => {
  if (!currentQuest) return;
  if (isQuestLocked(currentQuest) || isQuestCompleted(currentQuest.id)) return;

  if (currentQuest.type === QUEST_TYPES.JOURNAL) {
    const textEl = document.getElementById("journalText");
    const text = (textEl?.value || "").trim();
    if (!text) {
      showToast("Please write a short journal entry first.");
      return;
    }
    addJournalEntry(currentQuest, text);
    completeQuestWithXP(currentQuest);
  } else if (
    currentQuest.type === QUEST_TYPES.PHOTO ||
    currentQuest.type === QUEST_TYPES.FINAL
  ) {
    const captionEl = document.getElementById("photoCaption");
    const fileEl = document.getElementById("photoFile");
    const yearbookEl =
      currentQuest.type === QUEST_TYPES.FINAL
        ? document.getElementById("yearbookText")
        : null;

    const caption = (captionEl?.value || "").trim();
    const file = fileEl?.files?.[0];

    if (!file) {
      showToast("Please choose a photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result;
      const yearbookText = yearbookEl ? yearbookEl.value.trim() : "";
      addMemoryEntry(currentQuest, caption, imageData, yearbookText);
      completeQuestWithXP(currentQuest);
    };
    reader.readAsDataURL(file);
  } else if (currentQuest.type === QUEST_TYPES.LOCATION) {
    // normally handled via code or QR
    showToast("Use the QR or code options to complete this quest.");
  } else {
    completeQuestWithXP(currentQuest);
  }
});

function completeQuestWithXP(q) {
  if (!isQuestCompleted(q.id)) {
    state.completedQuests.push(q.id);
    state.xp += q.reward;
    logActivity(`Completed quest: ${q.title} (+${q.reward} XP)`);
    showToast(`Quest completed: ${q.title}`);
  }
  if (state.trackedQuestId === q.id) {
    state.trackedQuestId = null;
  }
  saveState();
  renderQuests();
  renderRewards();
  renderJournal();
  renderMemories();
  renderMap();
  closeQuestDetail();
}

/******************************************
 * QR SIMULATION
 ******************************************/

function simulateQrScan(onSuccess) {
  qrOverlay.classList.remove("hidden");
  setTimeout(() => {
    qrOverlay.classList.add("hidden");
    showToast("QR scanned successfully (simulated).");
    if (typeof onSuccess === "function") onSuccess();
  }, 1500);
}

/******************************************
 * GPS & MAP
 ******************************************/

function getUserLocation(callback) {
  if (!navigator.geolocation) {
    gpsStatus.textContent = "GPS not supported on this device.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      gpsStatus.textContent = `Your location: ${lat.toFixed(
        5
      )}, ${lon.toFixed(5)}`;
      if (callback) callback(lat, lon);
    },
    (err) => {
      gpsStatus.textContent = "Could not read GPS: " + err.message;
    }
  );
}

function renderMap() {
  mapLocationList.innerHTML = "";
  const locations = [...new Set(quests.map((q) => q.location))];

  const trackedQuest =
    state.trackedQuestId && getQuestById(state.trackedQuestId);
  const trackedLocation = trackedQuest?.location || null;

  locations.forEach((loc) => {
    const related = quests.filter((q) => q.location === loc);
    const hasTracked = trackedLocation === loc;
    const visited = related.some((q) => isQuestCompleted(q.id));

    const card = document.createElement("article");
    card.className = "card";
    if (hasTracked) {
      card.classList.add("tracked-location");
      card.style.border = "2px solid #ffcc00";
      card.style.boxShadow = "0 0 10px rgba(255,204,0,0.5)";
    }

    const relatedTypes = related
      .map((q) =>
        q.type === QUEST_TYPES.LOCATION
          ? "📍"
          : q.type === QUEST_TYPES.JOURNAL
          ? "📝"
          : q.type === QUEST_TYPES.PHOTO
          ? "📸"
          : "⭐"
      )
      .join(" ");

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">${loc}</div>
        <span class="tag ${visited ? "completed" : ""}">
          ${visited ? "Visited" : "Not visited"}
        </span>
      </div>
      <p><small>Quests here: ${relatedTypes || "None"}</small></p>
      <div class="card-footer">
        <button class="primary-btn" data-loc="${loc}">View related quests</button>
      </div>
    `;

    card
      .querySelector("button[data-loc]")
      .addEventListener("click", () => openLocationQuests(loc));

    mapLocationList.appendChild(card);
  });
}

function openLocationQuests(locationName) {
  // switch to quests tab and highlight related quests conceptually
  switchView("questsView");
  const relatedIds = quests
    .filter((q) => q.location === locationName)
    .map((q) => q.id);
  if (relatedIds.length > 0) {
    const q = getQuestById(relatedIds[0]);
    if (q) openQuestDetail(q.id);
  }
}

/******************************************
 * JOURNAL & MEMORIES
 ******************************************/

function addJournalEntry(quest, text) {
  const item = {
    id: `j_${Date.now()}`,
    questId: quest.id,
    text,
    createdAt: new Date().toISOString(),
  };
  state.journals.push(item);
  logActivity(`Added journal entry for: ${quest.title}`);
  saveState();
}

function addMemoryEntry(quest, caption, imageData, yearbookText) {
  const item = {
    id: `m_${Date.now()}`,
    questId: quest.id,
    caption: caption || quest.title,
    imageData,
    createdAt: new Date().toISOString(),
    isYearbook: quest.type === QUEST_TYPES.FINAL,
    yearbookText: yearbookText || "",
  };
  state.memories.push(item);
  logActivity(
    `Captured a memory for: ${quest.title}${
      item.isYearbook ? " (Yearbook entry)" : ""
    }`
  );
  saveState();
}

function renderJournal() {
  journalList.innerHTML = "";
  if (state.journals.length === 0) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML =
      "<p><em>No journal entries yet. Complete a journal quest to see it here.</em></p>";
    journalList.appendChild(card);
    return;
  }

  state.journals
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((entry) => {
      const q = getQuestById(entry.questId);
      const card = document.createElement("article");
      card.className = "card";
      const date = new Date(entry.createdAt).toLocaleString();
      const title = q?.title || "Unknown quest";

      card.innerHTML = `
        <div class="card-header">
          <div>
            <div class="card-title">${title}</div>
            <div class="card-location">Journal entry</div>
          </div>
          <span class="tag">📝</span>
        </div>
        <p><small>${date}</small></p>
        <p>${entry.text}</p>
      `;
      journalList.appendChild(card);
    });
}

function renderMemories() {
  memoriesGrid.innerHTML = "";
  if (state.memories.length === 0) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML =
      "<p><em>No photo memories yet. Complete a photo quest to see them here.</em></p>";
    memoriesGrid.appendChild(card);
    return;
  }

  state.memories
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((mem) => {
      const q = getQuestById(mem.questId);
      const date = new Date(mem.createdAt).toLocaleDateString();
      const title = q?.title || "Quest memory";

      const card = document.createElement("div");
      card.className = "memory-card";
      if (mem.isYearbook) card.classList.add("memory-yearbook");

      card.innerHTML = `
        <img src="${mem.imageData}" alt="Memory image" />
        <div class="memory-body">
          <div class="memory-caption">${mem.caption || title}</div>
          <div class="memory-meta">
            ${mem.isYearbook ? "⭐ Yearbook entry · " : ""}${title} · ${date}
          </div>
          ${
            mem.yearbookText
              ? `<p style="margin-top:4px; font-size:0.75rem;">${mem.yearbookText}</p>`
              : ""
          }
        </div>
      `;
      memoriesGrid.appendChild(card);
    });
}

/******************************************
 * SOCIAL (DEMO)
 ******************************************/

sendFriendRequestBtn.addEventListener("click", () => {
  const name = (friendNameInput.value || "").trim();
  if (!name) {
    showToast("Enter a name first.");
    return;
  }
  const friend = {
    id: `f_${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
  };
  state.friends.push(friend);
  saveState();
  friendNameInput.value = "";
  showToast(`Friend request sent to ${name} 🎉`);
  renderFriends();
});

function renderFriends() {
  friendList.innerHTML = "";
  if (state.friends.length === 0) {
    friendList.innerHTML =
      "<li><em>No friend requests sent yet. Try adding someone!</em></li>";
  } else {
    state.friends
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .forEach((f) => {
        const li = document.createElement("li");
        li.textContent = `${f.name} – Explorer`;
        friendList.appendChild(li);
      });
  }

  // sample static friends
  const staticFriends = ["Alex (Level 2 Explorer)", "Priya (New to campus)"];
  staticFriends.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    friendList.appendChild(li);
  });
}

/******************************************
 * REWARDS & PROGRESS
 ******************************************/

function renderRewards() {
  const completedCount = state.completedQuests.length;
  const total = quests.length;
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  progressPercent.textContent = `Campus exploration: ${percent}% (${completedCount}/${total} quests)`;

  const xpPct = Math.min(100, Math.round((state.xp / 200) * 100));
  xpFill.style.width = xpPct + "%";
  xpLabel.textContent = `${state.xp} XP / 200 XP`;

  badgeList.innerHTML = "";
  quests.forEach((q) => {
    if (isQuestCompleted(q.id)) {
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent =
        q.type === QUEST_TYPES.FINAL
          ? "Yearbook Milestone"
          : `${q.title.split(" ")[0]} Badge`;
      badgeList.appendChild(span);
    }
  });

  activityList.innerHTML = "";
  state.activityLog
    .slice(-6)
    .slice()
    .reverse()
    .forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = entry;
      activityList.appendChild(li);
    });
}

/******************************************
 * AI HELPER (FLOATING ! BUTTON)
 ******************************************/

function getAiSuggestionText() {
  const available = quests.filter(
    (q) => !isQuestCompleted(q.id) && !isQuestLocked(q)
  );
  if (available.length === 0) {
    return "You’ve completed all available quests! Nice work. You could revise your journal entries or show your memories to a friend.";
  }

  const locationDone = quests.filter(
    (q) => q.type === QUEST_TYPES.LOCATION && isQuestCompleted(q.id)
  ).length;
  const journalDone = quests.filter(
    (q) => q.type === QUEST_TYPES.JOURNAL && isQuestCompleted(q.id)
  ).length;
  const photoDone = quests.filter(
    (q) => q.type === QUEST_TYPES.PHOTO && isQuestCompleted(q.id)
  ).length;

  // if mostly location quests: recommend journal or photo
  let recommended = available[0];
  if (locationDone > journalDone && locationDone > photoDone) {
    const journalOrPhoto = available.find(
      (q) =>
        q.type === QUEST_TYPES.JOURNAL || q.type === QUEST_TYPES.PHOTO
    );
    if (journalOrPhoto) recommended = journalOrPhoto;
  } else if (state.xp >= 120) {
    const finalQuest = available.find((q) => q.type === QUEST_TYPES.FINAL);
    if (finalQuest) recommended = finalQuest;
  }

  const typeText =
    recommended.type === QUEST_TYPES.LOCATION
      ? "location quest to help you explore the campus physically."
      : recommended.type === QUEST_TYPES.JOURNAL
      ? "journal quest to help you reflect on your experience."
      : recommended.type === QUEST_TYPES.PHOTO
      ? "photo quest to capture a memorable spot."
      : "final yearbook quest to mark a milestone in your journey.";

  return `
    Based on what you've completed so far, I recommend:<br><br>
    <strong>${recommended.title}</strong><br>
    This is a ${typeText}<br><br>
    <em>Tap the quest in the Quests tab to start. In a future version, this helper could adapt in real-time as you move around campus.</em>
  `;
}

aiHelperButton.addEventListener("click", () => {
  aiHelperPanel.classList.toggle("hidden");
  aiHelperBody.innerHTML = getAiSuggestionText();
});

closeAiHelper.addEventListener("click", () => {
  aiHelperPanel.classList.add("hidden");
});

/******************************************
 * INIT
 ******************************************/

function init() {
  // splash auto-hide (CSS anim handles opacity; JS ensures pointer-events)
  setTimeout(() => {
    if (splashScreen) splashScreen.style.display = "none";
  }, 2300);

  renderQuests();
  renderMap();
  renderJournal();
  renderMemories();
  renderFriends();
  renderRewards();
  getUserLocation();
}

init();
