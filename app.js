const STORAGE_KEY = "ai-fortunes-v3";
const OLD_STORAGE_KEYS = ["ai-job-fortunes-v1", "ai-job-fortunes-v2"];
const TTL_MS = 60 * 60 * 1000;
const MAX_SHARE_LENGTH = 22000;
const TYPE_COUNT = 4;
const QUESTIONS_PER_TYPE = 2;

const SAMPLE_FORTUNES = [
  {
    id: "sample-animal",
    title: "どうぶつタイプ占い",
    nickname: "見本",
    sample: true,
    questions: makeQuestions([
      ["みんなをまとめるのがすき？", "先に手をあげることが多い？"],
      ["新しいあそびを考えるのがすき？", "ふしぎなことを調べたくなる？"],
      ["こまっている人を手伝いたい？", "友達の気持ちに気づきやすい？"],
      ["何かを作るのがすき？", "こつこつ仕上げるのがすき？"]
    ]),
    results: [
      { typeName: "ライオンタイプ", description: "前に立って、みんなを元気にできるタイプ。", recommendations: "リーダー、司会、チームのまとめ役" },
      { typeName: "きつねタイプ", description: "ひらめきが多く、新しいことを考えるのが得意。", recommendations: "発明、デザイン、ゲーム作り" },
      { typeName: "いぬタイプ", description: "人の気持ちに気づいて、やさしく助けられるタイプ。", recommendations: "相談、サポート、見守り役" },
      { typeName: "ビーバータイプ", description: "手を動かして、形にするのが得意なタイプ。", recommendations: "工作、料理、プログラミング" }
    ]
  },
  {
    id: "sample-space",
    title: "うちゅうチーム占い",
    nickname: "見本",
    sample: true,
    questions: makeQuestions([
      ["チームの作戦を考えるのがすき？", "みんなに声をかけることが多い？"],
      ["見たことがないものを見つけたい？", "なぜ？と考えることが多い？"],
      ["友達がこまったら声をかける？", "チームの空気をよくしたい？"],
      ["道具やロボットを作ってみたい？", "こわれたものを直してみたい？"]
    ]),
    results: [
      { typeName: "船長タイプ", description: "進む道を決めて、チームを動かせるタイプ。", recommendations: "作戦係、発表係、リーダー役" },
      { typeName: "探検家タイプ", description: "知らないことを見つけて調べるのが得意。", recommendations: "研究、取材、アイデア出し" },
      { typeName: "サポートタイプ", description: "チームが安心できるように動けるタイプ。", recommendations: "応援、手伝い、相談係" },
      { typeName: "メカニックタイプ", description: "しくみを考えて、作ったり直したりできるタイプ。", recommendations: "工作、機械、パソコン活動" }
    ]
  },
  {
    id: "sample-magic",
    title: "まほう学校占い",
    nickname: "見本",
    sample: true,
    questions: makeQuestions([
      ["みんなの前で発表するのがすき？", "大きな声であいさつできる？"],
      ["ふしぎなアイデアを考えるのがすき？", "ちがうやり方をためしたくなる？"],
      ["友達のいいところを見つけられる？", "だれかをはげましたくなる？"],
      ["こつこつ練習するのがすき？", "作品を最後まで作りたい？"]
    ]),
    results: [
      { typeName: "光のまほうタイプ", description: "明るい声で、まわりをひっぱれるタイプ。", recommendations: "発表、案内、イベント係" },
      { typeName: "ひらめきまほうタイプ", description: "おもしろい考えを出すのが得意。", recommendations: "物語、絵、企画" },
      { typeName: "いやしまほうタイプ", description: "人を安心させる力があるタイプ。", recommendations: "聞き役、手伝い、やさしい係" },
      { typeName: "ものづくりまほうタイプ", description: "練習して、すてきな作品を作れるタイプ。", recommendations: "工作、料理、ものづくり" }
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

function makeQuestions(groups) {
  return groups.flatMap((group, typeIndex) =>
    group.map((text) => ({ text, typeIndex }))
  );
}

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

  for (let index = 0; index < TYPE_COUNT; index += 1) {
    const card = el("div", `type-card type-card-${index}`);
    card.appendChild(el("h3", "", `タイプ ${index + 1}`));
    card.appendChild(makeInput("タイプ名", `typeName${index}`, "リーダータイプ", 20));
    card.appendChild(makeTextarea("どんなタイプ？", `description${index}`, "みんなをひっぱるのが得意。", 80));
    card.appendChild(makeInput("おすすめ", `recommendations${index}`, "遊び、係、活動など", 40));

    const questionBox = el("div", "type-questions");
    questionBox.appendChild(makeInput("しつもん 1", `question${index}-0`, "みんなをまとめるのがすき？", 60));
    questionBox.appendChild(makeInput("しつもん 2", `question${index}-1`, "前に出て話すのがすき？", 60));
    card.appendChild(questionBox);
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
  const questionGroups = [];
  const results = [];

  for (let index = 0; index < TYPE_COUNT; index += 1) {
    questionGroups.push([
      clean($(`#question${index}-0`).value),
      clean($(`#question${index}-1`).value),
    ]);
    results.push({
      typeName: clean($(`#typeName${index}`).value),
      description: clean($(`#description${index}`).value),
      recommendations: clean($(`#recommendations${index}`).value),
    });
  }

  return {
    id: editingId || `local-${now}-${Math.random().toString(16).slice(2)}`,
    title: clean($("#title").value),
    nickname: clean($("#nickname").value) || "ななし",
    createdAt: now,
    expiresAt: now + TTL_MS,
    questions: makeQuestions(questionGroups),
    results,
    scoring: "typePoints",
    source: "local",
  };
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeFortune(fortune) {
  const normalized = { ...fortune };
  normalized.questions = (fortune.questions || []).map((question, index) => {
    if (typeof question === "string") {
      return { text: question, typeIndex: index % TYPE_COUNT };
    }
    return {
      text: clean(question.text),
      typeIndex: Number.isInteger(question.typeIndex) ? question.typeIndex : index % TYPE_COUNT,
    };
  });
  normalized.results = (fortune.results || []).map((result) => ({
    typeName: clean(result.typeName),
    description: clean(result.description),
    recommendations: clean(result.recommendations || result.jobs),
  }));
  return normalized;
}

function validateFortune(fortune) {
  if (!fortune.title) return "タイトルを入れてね";
  if (!Array.isArray(fortune.questions) || fortune.questions.length !== TYPE_COUNT * QUESTIONS_PER_TYPE) {
    return "しつもんを8こ入れてね";
  }
  if (fortune.questions.some((question) => !question.text)) return "しつもんを8こ入れてね";
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
  const normalized = normalizeFortune(fortune);

  $("#editingId").value = normalized.id;
  $("#title").value = normalized.title;
  $("#nickname").value = normalized.nickname === "ななし" ? "" : normalized.nickname;
  normalized.results.forEach((result, index) => {
    $(`#typeName${index}`).value = result.typeName || "";
    $(`#description${index}`).value = result.description || "";
    $(`#recommendations${index}`).value = result.recommendations || "";
  });
  for (let typeIndex = 0; typeIndex < TYPE_COUNT; typeIndex += 1) {
    const questions = normalized.questions.filter((question) => question.typeIndex === typeIndex);
    $(`#question${typeIndex}-0`).value = questions[0]?.text || "";
    $(`#question${typeIndex}-1`).value = questions[1]?.text || "";
  }
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
  const normalized = normalizeFortune(fortune);
  state.quiz = {
    fortune: normalized,
    isPreview,
    index: 0,
    scores: Array(TYPE_COUNT).fill(0),
    totalYes: 0,
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

  const question = quiz.fortune.questions[quiz.index];
  const card = el("div", "quiz-card");
  card.appendChild(el("div", "quiz-count", `しつもん ${quiz.index + 1} / ${quiz.fortune.questions.length}`));
  card.appendChild(el("div", "quiz-question", question.text));

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
  const question = state.quiz.fortune.questions[state.quiz.index];
  if (isYes) {
    state.quiz.scores[question.typeIndex] += 1;
    state.quiz.totalYes += 1;
  }
  state.quiz.index += 1;
  renderQuiz();
}

function renderResult() {
  const panel = $("#quizPanel");
  panel.textContent = "";
  const quiz = state.quiz;
  const winningIndex = getWinningIndex(quiz.scores);
  const result = quiz.fortune.results[winningIndex];

  const card = el("div", `result-card result-color-${winningIndex}`);
  const visual = el("div", "result-visual");
  visual.appendChild(el("div", "result-mark", String(winningIndex + 1)));
  const headline = el("div");
  headline.appendChild(el("h2", "", "結果"));
  headline.appendChild(el("div", "result-type", result.typeName));
  visual.appendChild(headline);
  card.appendChild(visual);

  card.appendChild(el("p", "result-description", result.description || "すてきなところがたくさんあるタイプ。"));
  card.appendChild(el("p", "result-recommend", `おすすめ: ${result.recommendations || "いろいろなこと"}`));
  card.appendChild(el("div", "total-score", `合計 ${quiz.totalYes}点 / ${quiz.fortune.questions.length}点`));
  card.appendChild(renderScoreBars(quiz));

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

function renderScoreBars(quiz) {
  const wrap = el("div", "score-board");
  quiz.fortune.results.forEach((result, index) => {
    const row = el("div", "score-row");
    const label = el("div", "score-label", result.typeName || `タイプ${index + 1}`);
    const track = el("div", "score-track");
    const bar = el("div", `score-fill score-fill-${index}`);
    bar.style.width = `${(quiz.scores[index] / QUESTIONS_PER_TYPE) * 100}%`;
    track.appendChild(bar);
    const count = el("div", "score-count", `${quiz.scores[index]}点`);
    row.append(label, track, count);
    wrap.appendChild(row);
  });
  return wrap;
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
    state.fortunes = raw ? JSON.parse(raw).map(normalizeFortune) : [];
  } catch {
    state.fortunes = [];
  }
  OLD_STORAGE_KEYS.forEach((key) => sessionStorage.removeItem(key));
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
  $("#shareCode").value = encodeShare(normalizeFortune(fortune));
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
    const fortune = normalizeFortune(decodeShare(code));
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
