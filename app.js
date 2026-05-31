const STORAGE_KEY = "ai-job-fortunes-v2";
const OLD_STORAGE_KEY = "ai-job-fortunes-v1";
const TTL_MS = 60 * 60 * 1000;
const MAX_SHARE_LENGTH = 16000;

const SAMPLE_FORTUNES = [
  {
    id: "sample-animal",
    title: "どうぶつお仕事占い",
    nickname: "見本",
    sample: true,
    questions: [
      "みんなをまとめるのがすき？",
      "新しいあそびを考えるのがすき？",
      "こまっている人を手伝いたい？",
      "何かを作るのがすき？"
    ],
    results: [
      { typeName: "ライオンタイプ", description: "前に立って、みんなを元気にできるタイプ。", jobs: "先生、店長、キャプテン" },
      { typeName: "きつねタイプ", description: "ひらめきが多く、新しいことを考えるのが得意。", jobs: "発明家、デザイナー、ゲーム作家" },
      { typeName: "いぬタイプ", description: "人の気持ちに気づいて、やさしく助けられるタイプ。", jobs: "看護師、保育士、カウンセラー" },
      { typeName: "ビーバータイプ", description: "手を動かして、形にするのが得意なタイプ。", jobs: "大工、料理人、エンジニア" }
    ]
  },
  {
    id: "sample-space",
    title: "うちゅうチーム占い",
    nickname: "見本",
    sample: true,
    questions: [
      "チームの作戦を考えるのがすき？",
      "見たことがないものを見つけたい？",
      "友達がこまったら声をかける？",
      "道具やロボットを作ってみたい？"
    ],
    results: [
      { typeName: "船長タイプ", description: "みんなの進む道を決めるのが得意。", jobs: "パイロット、監督、プロジェクトリーダー" },
      { typeName: "探検家タイプ", description: "知らないことを調べるのが得意。", jobs: "研究者、記者、宇宙飛行士" },
      { typeName: "サポートタイプ", description: "チームが安心できるように動けるタイプ。", jobs: "医師、整備士、相談員" },
      { typeName: "メカニックタイプ", description: "しくみを考えて直したり作ったりできるタイプ。", jobs: "エンジニア、整備士、プログラマー" }
    ]
  },
  {
    id: "sample-magic",
    title: "まほう学校占い",
    nickname: "見本",
    sample: true,
    questions: [
      "みんなの前で発表するのがすき？",
      "ふしぎなアイデアを考えるのがすき？",
      "友達のいいところを見つけられる？",
      "こつこつ練習するのがすき？"
    ],
    results: [
      { typeName: "光のまほうタイプ", description: "明るい声で、まわりをひっぱれるタイプ。", jobs: "アナウンサー、先生、リーダー" },
      { typeName: "ひらめきまほうタイプ", description: "おもしろい考えを出すのが得意。", jobs: "作家、漫画家、企画する人" },
      { typeName: "いやしまほうタイプ", description: "人を安心させる力があるタイプ。", jobs: "保育士、看護師、福祉の仕事" },
      { typeName: "ものづくりまほうタイプ", description: "練習して、すてきな作品を作れるタイプ。", jobs: "職人、パティシエ、建築士" }
    ]
  }
];

const state = {
  fortunes: [],
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
  typeWrap.textContent = "";

  for (let index = 0; index < 4; index += 1) {
    const card = el("div", "type-card");
    card.appendChild(el("h3", "", `タイプ ${index + 1}`));
    card.appendChild(makeInput("タイプ名", `typeName${index}`, "リーダータイプ", 20));
    card.appendChild(makeTextarea("どんなタイプ？", `description${index}`, "みんなをひっぱるのが得意。", 80));
    card.appendChild(makeInput("向いている仕事", `jobs${index}`, "先生、店長、キャプテン", 40));
    card.appendChild(makeInput("このタイプのしつもん", `question${index}`, "みんなをまとめるのがすき？", 60));
    typeWrap.appendChild(card);
  }
}

function makeInput(text, id, placeholder, maxLength) {
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
    saveFormFortune();
  });

  $("#previewBtn").addEventListener("click", previewFortune);
  $("#importBtn").addEventListener("click", importShareCode);
  $("#clearAllBtn").addEventListener("click", clearAll);
  $("#copyBtn").addEventListener("click", copyShareCode);
  $("#cancelEditBtn").addEventListener("click", resetForm);
}

function setTab(tab) {
  $("#createPanel").classList.toggle("active", tab === "create");
  $("#playPanel").classList.toggle("active", tab === "play");
  $("#quizPanel").classList.remove("active");
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
}

function readForm() {
  const now = Date.now();
  const editingId = $("#editingId").value;
  const questions = [];
  const results = [];

  for (let index = 0; index < 4; index += 1) {
    questions.push(clean($(`#question${index}`).value));
    results.push({
      typeName: clean($(`#typeName${index}`).value),
      description: clean($(`#description${index}`).value),
      jobs: clean($(`#jobs${index}`).value),
    });
  }

  return {
    id: editingId || `local-${now}-${Math.random().toString(16).slice(2)}`,
    title: clean($("#title").value),
    nickname: clean($("#nickname").value) || "ななし",
    createdAt: now,
    expiresAt: now + TTL_MS,
    questions,
    results,
    scoring: "typePoints",
    source: "local",
  };
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function validateFortune(fortune) {
  if (!fortune.title) return "タイトルを入れてね";
  if (fortune.questions.some((question) => !question)) return "しつもんを4こ入れてね";
  if (fortune.results.some((result) => !result.typeName)) return "タイプ名を4つ入れてね";
  return "";
}

function saveFormFortune() {
  const fortune = readForm();
  const error = validateFortune(fortune);
  if (error) {
    showToast(error);
    return;
  }

  const editIndex = state.fortunes.findIndex((item) => item.id === fortune.id && item.source === "local");
  if (editIndex >= 0) {
    state.fortunes[editIndex] = fortune;
    showToast("なおしたよ");
  } else {
    state.fortunes.unshift(fortune);
    showToast("今日の占いに入れたよ");
  }

  saveFortunes();
  resetForm(false);
  renderAll();
  setTab("play");
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

function editFortune(id) {
  const fortune = state.fortunes.find((item) => item.id === id && item.source === "local");
  if (!fortune) return;

  $("#editingId").value = fortune.id;
  $("#title").value = fortune.title;
  $("#nickname").value = fortune.nickname === "ななし" ? "" : fortune.nickname;
  fortune.results.forEach((result, index) => {
    $(`#typeName${index}`).value = result.typeName || "";
    $(`#description${index}`).value = result.description || "";
    $(`#jobs${index}`).value = result.jobs || "";
    $(`#question${index}`).value = fortune.questions[index] || "";
  });
  $("#saveBtn").textContent = "なおして入れる";
  $("#cancelEditBtn").hidden = false;
  setTab("create");
  showToast("なおせるよ");
}

function resetForm(clearValues = true) {
  if (clearValues) $("#fortuneForm").reset();
  $("#editingId").value = "";
  $("#saveBtn").textContent = "今日の占いに入れる";
  $("#cancelEditBtn").hidden = true;
}

function startQuiz(fortune, isPreview = false) {
  state.quiz = {
    fortune,
    isPreview,
    index: 0,
    scores: [0, 0, 0, 0],
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
  card.appendChild(el("div", "quiz-count", `しつもん ${quiz.index + 1} / ${quiz.fortune.questions.length}`));
  card.appendChild(el("div", "quiz-question", quiz.fortune.questions[quiz.index]));

  const row = el("div", "answer-row");
  const yes = el("button", "answer-btn yes", "はい");
  const no = el("button", "answer-btn no", "いいえ");
  yes.type = "button";
  no.type = "button";
  yes.addEventListener("click", () => answerQuestion(true));
  no.addEventListener("click", () => answerQuestion(false));
  row.append(yes, no);
  card.appendChild(row);
  panel.appendChild(card);
}

function answerQuestion(isYes) {
  if (isYes) {
    const resultIndex = state.quiz.index % 4;
    state.quiz.scores[resultIndex] += 1;
  }
  state.quiz.index += 1;
  renderQuiz();
}

function renderResult() {
  const panel = $("#quizPanel");
  panel.textContent = "";
  const quiz = state.quiz;
  const result = quiz.fortune.results[getWinningIndex(quiz.scores)];

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

function getWinningIndex(scores) {
  let best = 0;
  for (let index = 1; index < scores.length; index += 1) {
    if (scores[index] > scores[best]) best = index;
  }
  return best;
}

function renderAll() {
  pruneExpired();
  $("#totalCount").textContent = `${state.fortunes.length}こ`;
  renderSampleList();
  renderFortuneList();
}

function renderSampleList() {
  const list = $("#sampleList");
  list.textContent = "";
  SAMPLE_FORTUNES.forEach((fortune) => {
    list.appendChild(createFortuneCard(fortune, "見本", false));
  });
}

function renderFortuneList() {
  const list = $("#fortuneList");
  list.textContent = "";

  if (!state.fortunes.length) {
    list.appendChild(el("div", "empty", "作った占いはここに出るよ"));
    return;
  }

  state.fortunes.forEach((fortune) => {
    list.appendChild(createFortuneCard(fortune, `あと${minutesLeft(fortune.expiresAt)}分`, true));
  });
}

function createFortuneCard(fortune, metaRight, canChange) {
  const card = el("article", `fortune-card${fortune.sample ? " sample-card" : ""}`);
  const info = el("div");
  info.appendChild(el("p", "fortune-title", fortune.title));
  info.appendChild(el("p", "fortune-meta", `${fortune.nickname}  ${metaRight}`));

  const actions = el("div", "mini-actions");
  const play = el("button", "mini-btn play-btn", "やってみる");
  play.type = "button";
  play.addEventListener("click", () => startQuiz(fortune));
  actions.appendChild(play);

  if (canChange) {
    const share = el("button", "mini-btn", "見せる");
    share.type = "button";
    share.addEventListener("click", () => showShare(fortune));
    actions.appendChild(share);

    if (fortune.source === "local") {
      const edit = el("button", "mini-btn", "なおす");
      edit.type = "button";
      edit.addEventListener("click", () => editFortune(fortune.id));
      actions.appendChild(edit);
    }

    const remove = el("button", "mini-btn danger-mini", "消す");
    remove.type = "button";
    remove.addEventListener("click", () => removeFortune(fortune.id));
    actions.appendChild(remove);
  }

  card.append(info, actions);
  return card;
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
  sessionStorage.removeItem(OLD_STORAGE_KEY);
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
  resetForm();
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
    source: "shared",
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
    fortune.source = "shared";
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
  if (!Array.isArray(fortune.questions) || fortune.questions.length !== 4) return "コードを読みこめないよ";
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
