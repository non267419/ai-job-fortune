const STORAGE_KEY = "ai-job-fortunes-v1";
const TTL_MS = 60 * 60 * 1000;
const MAX_SHARE_LENGTH = 12000;

const state = {
  fortunes: [],
  currentTab: "create",
  quiz: null,
};

const $ = (selector) => document.querySelector(selector);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function init() {
  buildInputs();
  loadFortunes();
  bindEvents();
  renderAll();
  setInterval(() => {
    pruneExpired();
    renderAll();
  }, 60 * 1000);
}

function buildInputs() {
  const typeWrap = $("#typeInputs");
  const questionWrap = $("#questionInputs");

  for (let index = 0; index < 4; index += 1) {
    const card = el("div", "type-card");
    card.appendChild(el("h3", "", `タイプ ${index + 1}`));
    card.appendChild(makeLabel("タイプ名", `typeName${index}`, "リーダータイプ", 20));
    card.appendChild(makeTextarea("どんなタイプ？", `description${index}`, "みんなをひっぱるのが得意。", 80));
    card.appendChild(makeLabel("向いている仕事", `jobs${index}`, "先生、店長、キャプテン", 40));
    typeWrap.appendChild(card);
  }

  for (let index = 0; index < 5; index += 1) {
    questionWrap.appendChild(makeLabel(`しつもん ${index + 1}`, `question${index}`, "人を手伝うのがすき？", 60));
  }
}

function makeLabel(text, id, placeholder, maxLength) {
  const label = el("label");
  label.appendChild(el("span", "", text));
  const input = el("input");
  input.id = id;
  input.maxLength = maxLength;
  input.placeholder = placeholder;
  label.appendChild(input);
  return label;
}

function makeTextarea(text, id, placeholder, maxLength) {
  const label = el("label");
  label.appendChild(el("span", "", text));
  const textarea = el("textarea");
  textarea.id = id;
  textarea.rows = 2;
  textarea.maxLength = maxLength;
  textarea.placeholder = placeholder;
  label.appendChild(textarea);
  return label;
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  $("#fortuneForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addFortune();
  });

  $("#previewBtn").addEventListener("click", previewFortune);
  $("#importBtn").addEventListener("click", importShareCode);
  $("#clearAllBtn").addEventListener("click", clearAll);
  $("#copyBtn").addEventListener("click", copyShareCode);
}

function setTab(tab) {
  state.currentTab = tab;
  $("#createPanel").classList.toggle("active", tab === "create");
  $("#playPanel").classList.toggle("active", tab === "play");
  $("#quizPanel").classList.remove("active");
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
}

function readForm() {
  const title = clean($("#title").value);
  const nickname = clean($("#nickname").value) || "ななし";
  const questions = [];
  const results = [];

  for (let index = 0; index < 5; index += 1) {
    questions.push(clean($(`#question${index}`).value));
  }

  for (let index = 0; index < 4; index += 1) {
    results.push({
      typeName: clean($(`#typeName${index}`).value),
      description: clean($(`#description${index}`).value),
      jobs: clean($(`#jobs${index}`).value),
    });
  }

  return {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    nickname,
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_MS,
    questions,
    results,
  };
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function validateFortune(fortune) {
  if (!fortune.title) return "タイトルを入れてね";
  if (fortune.questions.some((question) => !question)) return "質問を5こ入れてね";
  if (fortune.results.some((result) => !result.typeName)) return "タイプ名を4つ入れてね";
  return "";
}

function addFortune() {
  const fortune = readForm();
  const error = validateFortune(fortune);
  if (error) {
    showToast(error);
    return;
  }

  state.fortunes.unshift(fortune);
  saveFortunes();
  renderAll();
  setTab("play");
  showToast("今日の占いに入れたよ");
}

function previewFortune() {
  const fortune = readForm();
  const error = validateFortune(fortune);
  if (error) {
    showToast(error);
    return;
  }

  startQuiz(fortune, true);
}

function startQuiz(fortune, isPreview = false) {
  state.quiz = {
    fortune,
    isPreview,
    index: 0,
    score: 0,
  };
  $("#createPanel").classList.remove("active");
  $("#playPanel").classList.remove("active");
  $("#quizPanel").classList.add("active");
  renderQuiz();
}

function renderQuiz() {
  const panel = $("#quizPanel");
  panel.textContent = "";

  const quiz = state.quiz;
  if (!quiz) return;

  if (quiz.index >= quiz.fortune.questions.length) {
    renderResult();
    return;
  }

  const card = el("div", "quiz-card");
  card.appendChild(el("div", "quiz-count", `しつもん ${quiz.index + 1} / 5`));
  card.appendChild(el("div", "quiz-question", quiz.fortune.questions[quiz.index]));

  const row = el("div", "answer-row");
  const yes = el("button", "answer-btn yes", "はい");
  const no = el("button", "answer-btn no", "いいえ");
  yes.type = "button";
  no.type = "button";
  yes.addEventListener("click", () => answerQuestion(1));
  no.addEventListener("click", () => answerQuestion(0));
  row.append(yes, no);
  card.appendChild(row);
  panel.appendChild(card);
}

function answerQuestion(point) {
  state.quiz.score += point;
  state.quiz.index += 1;
  renderQuiz();
}

function renderResult() {
  const panel = $("#quizPanel");
  panel.textContent = "";
  const quiz = state.quiz;
  const result = getResult(quiz.fortune.results, quiz.score);

  const card = el("div", "result-card");
  card.appendChild(el("h2", "", "結果"));
  card.appendChild(el("div", "result-type", result.typeName));
  card.appendChild(el("p", "", result.description || "すてきなところがたくさんあるタイプ。"));
  card.appendChild(el("p", "", `向いている仕事: ${result.jobs || "いろいろな仕事"}`));

  const actions = el("div", "actions");
  const again = el("button", "secondary-btn", "もう一回");
  const back = el("button", "primary-btn", quiz.isPreview ? "作るにもどる" : "遊ぶにもどる");
  again.type = "button";
  back.type = "button";
  again.addEventListener("click", () => startQuiz(quiz.fortune, quiz.isPreview));
  back.addEventListener("click", () => setTab(quiz.isPreview ? "create" : "play"));
  actions.append(again, back);
  card.appendChild(actions);
  panel.appendChild(card);
}

function getResult(results, score) {
  if (score <= 1) return results[0];
  if (score === 2) return results[1];
  if (score <= 4) return results[2];
  return results[3];
}

function renderAll() {
  pruneExpired();
  $("#totalCount").textContent = `${state.fortunes.length}こ`;
  renderFortuneList();
}

function renderFortuneList() {
  const list = $("#fortuneList");
  list.textContent = "";

  if (!state.fortunes.length) {
    list.appendChild(el("div", "empty", "まだ占いがないよ"));
    return;
  }

  state.fortunes.forEach((fortune) => {
    const card = el("article", "fortune-card");
    const info = el("div");
    info.appendChild(el("p", "fortune-title", fortune.title));
    info.appendChild(el("p", "fortune-meta", `${fortune.nickname}  あと${minutesLeft(fortune.expiresAt)}分`));

    const actions = el("div", "mini-actions");
    const play = el("button", "mini-btn play-btn", "やってみる");
    const share = el("button", "mini-btn", "見せる");
    const remove = el("button", "mini-btn", "消す");
    play.type = "button";
    share.type = "button";
    remove.type = "button";
    play.addEventListener("click", () => startQuiz(fortune));
    share.addEventListener("click", () => showShare(fortune));
    remove.addEventListener("click", () => removeFortune(fortune.id));
    actions.append(play, share, remove);

    card.append(info, actions);
    list.appendChild(card);
  });
}

function minutesLeft(expiresAt) {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 60000));
}

function loadFortunes() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    state.fortunes = raw ? JSON.parse(raw) : [];
  } catch {
    state.fortunes = [];
  }
  pruneExpired();
}

function saveFortunes() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.fortunes));
}

function pruneExpired() {
  const now = Date.now();
  const next = state.fortunes.filter((fortune) => Number(fortune.expiresAt) > now);
  if (next.length !== state.fortunes.length) {
    state.fortunes = next;
    saveFortunes();
  }
}

function removeFortune(id) {
  state.fortunes = state.fortunes.filter((fortune) => fortune.id !== id);
  saveFortunes();
  renderAll();
}

function clearAll() {
  state.fortunes = [];
  saveFortunes();
  renderAll();
  showToast("ぜんぶ消したよ");
}

function showShare(fortune) {
  $("#shareCode").value = encodeShare(fortune);
  $("#shareDialog").showModal();
}

function encodeShare(fortune) {
  const payload = {
    ...fortune,
    id: `shared-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeShare(code) {
  const binary = atob(code);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function importShareCode() {
  const code = clean($("#shareInput").value);
  if (!code) {
    showToast("共有コードを入れてね");
    return;
  }
  if (code.length > MAX_SHARE_LENGTH) {
    showToast("コードが長すぎるよ");
    return;
  }

  try {
    const fortune = decodeShare(code);
    const error = validateImportedFortune(fortune);
    if (error) {
      showToast(error);
      return;
    }
    fortune.id = `imported-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    state.fortunes.unshift(fortune);
    saveFortunes();
    $("#shareInput").value = "";
    renderAll();
    showToast("読みこんだよ");
  } catch {
    showToast("コードを読みこめないよ");
  }
}

function validateImportedFortune(fortune) {
  if (!fortune || typeof fortune !== "object") return "コードを読みこめないよ";
  if (Number(fortune.expiresAt) <= Date.now()) return "この占いは時間がすぎたよ";
  if (!Array.isArray(fortune.questions) || fortune.questions.length !== 5) return "コードを読みこめないよ";
  if (!Array.isArray(fortune.results) || fortune.results.length !== 4) return "コードを読みこめないよ";
  return validateFortune(fortune);
}

async function copyShareCode() {
  const code = $("#shareCode").value;
  try {
    await navigator.clipboard.writeText(code);
    showToast("コピーしたよ");
  } catch {
    $("#shareCode").select();
    showToast("コードを選んだよ");
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

init();
