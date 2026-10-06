import { STAGES, classifyReply, initialState, applyReply, getEnding } from './dialogue.js';
import { createEvents } from './events.js';
import { PEERS, applyEventImpact } from './gameplay.js';

const $ = selector => document.querySelector(selector);
const messages = $('#messages');
const history = $('#chat-history');
const input = $('#free-reply');
const typing = $('#typing');
const result = $('#result');
let state = initialState();
let busy = false;
let session = 0;
let lastReplyAt = Date.now();
let reminders = 0;
let gameMinutes = 0;
let lastSender = null;
let composing = false;
const delays = new Set();
let pendingContinuation = null;
let events;

function scrollToLatest(force = false) {
  if (force || history.scrollHeight - history.scrollTop - history.clientHeight < 220) {
    requestAnimationFrame(() => history.scrollTo({ top: history.scrollHeight, behavior: 'smooth' }));
  }
}

function gameTime() {
  return `${(21 + Math.floor(gameMinutes / 60)) % 24}:${String(gameMinutes % 60).padStart(2, '0')}`;
}

function addMessage(text, sender = 'coach') {
  const shouldFollow = history.scrollHeight - history.scrollTop - history.clientHeight < 220;
  const row = document.createElement('div');
  row.className = `message-row ${sender === 'user' ? 'user-row' : ''} ${sender === 'coach' && lastSender === 'coach' ? 'followup' : ''}`;
  if (sender !== 'user') {
    const avatar = document.createElement('div');
    avatar.className = 'coach-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = PEERS[sender]?.initial || 'し';
    if (PEERS[sender]) avatar.style.background = PEERS[sender].color;
    row.append(avatar);
  }
  const content = document.createElement('div');
  content.className = 'message-content';
  const speaker = document.createElement('span');
  speaker.className = sender !== 'user' ? 'speaker' : 'sr-only';
  speaker.textContent = PEERS[sender]?.name || (sender === 'coach' ? 'しもへい。' : 'あなた');
  const line = document.createElement('div');
  line.className = 'bubble-line';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  // 自由入力をHTMLとして解釈しない。返信・ログは外部に送信しない。
  bubble.textContent = text;
  const meta = document.createElement('span');
  meta.className = 'message-meta';
  if (sender === 'user') {
    const read = document.createElement('span');
    read.textContent = '既読 8';
    meta.append(read, document.createElement('br'));
  }
  meta.append(document.createTextNode(gameTime()));
  line.append(bubble, meta);
  content.append(speaker, line);
  row.append(content);
  messages.append(row);
  lastSender = sender;
  scrollToLatest(shouldFollow);
}

function pause(ms) {
  return new Promise(resolve => {
    const job = { id: 0, resolve };
    job.id = setTimeout(() => { delays.delete(job); resolve(); }, ms);
    delays.add(job);
  });
}

async function coachSays(lines, token) {
  for (const line of lines) {
    if (token !== session) return false;
    typing.hidden = false;
    scrollToLatest();
    await pause(Math.min(1050, 430 + line.length * 9));
    if (token !== session) return false;
    typing.hidden = true;
    addMessage(line);
  }
  return true;
}

function renderStatus() {
  $('#meeting-clock').textContent = gameTime();
  $('#mental-value').textContent = state.mental;
  $('#mental-bar').style.width = `${state.mental}%`;
  $('#mental-bar').style.background = state.mental < 30 ? '#f0a29a' : '#94eaa0';
  $('#trust-value').textContent = `${state.trust}%`;
  $('#trust-bar').style.width = `${state.trust}%`;
  $('#mobile-mental').textContent = state.mental;
  $('#mobile-trust').textContent = `${state.trust}%`;
  $('#mobile-stage').textContent = state.completed ? '会議終了' : STAGES[state.stage].title;
  $('#memo-count').textContent = `${state.resolved.filter(Boolean).length} / ${STAGES.length}`;
  $('#tactic-list').querySelectorAll('li').forEach((li,index) => {
    li.className = state.resolved[index] === true ? 'done' : state.resolved[index] === false ? 'missed' : state.stage === index && !state.completed ? 'active' : '';
    li.setAttribute('aria-label', `${STAGES[index].title}：${state.resolved[index] === true ? '決定' : state.resolved[index] === false ? '要確認' : state.stage === index && !state.completed ? '相談中' : '未相談'}`);
  });
  $('.live-label').textContent = state.completed ? '会議終了' : '会議中';
  events?.render();
}

function renderChoices() {
  const choices = $('#choices');
  choices.replaceChildren();
  if (state.completed) return;
  if (events?.active) { events.renderChoices(choices); return; }
  // 正解が毎回同じ位置にならないようにする。
  const list = [...STAGES[state.stage].choices];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  list.forEach((choice,index) => {
    const button = document.createElement('button');
    button.className = 'choice-button';
    button.type = 'button';
    const number = document.createElement('span');
    number.className = 'choice-number';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = `0${index + 1}`;
    const label = document.createElement('span');
    label.textContent = choice.text;
    button.append(number, label);
    button.addEventListener('click', () => submitReply(choice.text, choice.kind));
    choices.append(button);
  });
}

function setBusy(value) {
  busy = value;
  $('#choices').querySelectorAll('button').forEach(button => { button.disabled = value || state.completed; });
  input.disabled = state.completed;
  $('#send-button').disabled = value || state.completed || !input.value.trim();
  $('#reply-title').textContent = state.completed ? 'おつかれさまでした。' : value ? 'しもへい。が返信中…' : events?.active ? events.title : 'どう返す？';
  $('#reply-hint').textContent = state.completed ? 'もう一度挑戦するなら、やり直す。' : '選択肢でも、あなたの言葉でも。';
  events?.render();
}

function showResult() {
  const ending = getEnding(state);
  result.replaceChildren();
  const eyebrow = document.createElement('span');
  eyebrow.className = 'result-eyebrow';
  eyebrow.textContent = 'MEETING FINISHED';
  const title = document.createElement('h2');
  title.textContent = ending.title;
  const description = document.createElement('p');
  description.textContent = ending.description;
  const score = document.createElement('div');
  score.className = 'result-score';
  for (const [label, value] of [['決定した戦術', `${state.resolved.filter(Boolean).length} / 8`], ['残りメンタル', state.mental], ['納得度', `${state.trust}%`]]) {
    const item = document.createElement('span');
    item.textContent = label;
    const number = document.createElement('strong');
    number.textContent = value;
    item.append(number);
    score.append(item);
  }
  const button = document.createElement('button');
  button.className = 'replay-button';
  button.type = 'button';
  button.textContent = 'もう一度、戦術会議';
  button.addEventListener('click', reset);
  result.append(eyebrow, title, description, score, button);
  events?.addResult(result);
  result.hidden = false;
  result.dataset.ending = ending.id;
  scrollToLatest(true);
}

async function submitReply(raw, selectedKind) {
  if (busy || state.completed) return { ok: false, reason: state.completed ? '会議は終了しています。' : '返信を待っています。' };
  const text = String(raw).trim();
  if (!text || text.length > 500) return { ok: false, reason: '1〜500文字で返信してください。' };
  if (events?.active) {
    input.value = ''; input.style.height = '';
    await events.reply(text);
    return { ok: true, ...stateSnapshot() };
  }
  const token = session;
  const stage = STAGES[state.stage];
  const kind = selectedKind || classifyReply(stage, text);
  const previousStage = state.stage;
  events.onReply(stage, text, kind);
  state = applyReply(state, kind);
  gameMinutes++;
  lastReplyAt = Date.now();
  if (state.stage !== previousStage) reminders = 0;
  addMessage(text, 'user');
  input.value = '';
  input.style.height = '';
  setBusy(true);
  renderStatus();
  scrollToLatest(true);
  const lines = kind === 'specific' ? stage.good : kind === 'question' ? [stage.hint] : kind === 'offtopic' ? ['それは、学習院戦の戦術の話？', 'いま聞いてることに答えてもらえるかな？？'] : state.stage > previousStage ? ['そうじゃなくて、、、', ...stage[kind]] : stage[kind];
  if (!(await coachSays(lines, token))) return { ok: false, reason: '会議をやり直しました。' };
  pendingContinuation = async () => {
  if (state.stage > previousStage) {
    if (kind !== 'specific' && !(await coachSays(['そこは宿題ね。\nいったん次の話します。'], token))) return { ok: false };
    if (!(await coachSays(STAGES[state.stage].opening, token))) return { ok: false };
  } else if (kind !== 'question') {
    if (!(await coachSays([stage.retry], token))) return { ok: false };
  }
  };
  await continueMeeting(token);
  if (token !== session) return { ok: false };
  renderChoices();
  setBusy(false);
  lastReplyAt = Date.now();
  return { ok: true, ...stateSnapshot() };
}

async function continueMeeting(token = session) {
  if (token !== session) return;
  setBusy(true);
  if (state.completed) {
    events.closeAll();
    if (!(await coachSays(getEnding(state).messages, token))) return;
    pendingContinuation = null;
    showResult();
  } else if (await events.startNext()) {
    if (token !== session) return;
  } else if (pendingContinuation) {
    const continuation = pendingContinuation;
    pendingContinuation = null;
    await continuation();
  }
  if (token !== session) return;
  renderStatus(); renderChoices(); setBusy(false); lastReplyAt = Date.now();
}

function reset() {
  session++;
  for (const job of delays) { clearTimeout(job.id); job.resolve(); }
  delays.clear();
  state = initialState();
  pendingContinuation = null;
  events?.reset();
  lastSender = null;
  reminders = 0;
  lastReplyAt = Date.now();
  messages.replaceChildren();
  gameMinutes = 0;
  typing.hidden = true;
  result.hidden = true;
  delete result.dataset.ending;
  input.value = '';
  input.style.height = '';
  STAGES[0].opening.forEach(line => addMessage(line));
  renderStatus();
  renderChoices();
  setBusy(false);
  history.scrollTo({ top: 0, behavior: 'instant' });
}

$('#reply-form').addEventListener('submit', event => { event.preventDefault(); void submitReply(input.value); });
input.addEventListener('compositionstart', () => { composing = true; });
input.addEventListener('compositionend', () => { composing = false; });
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !composing && event.keyCode !== 229) {
    event.preventDefault();
    void submitReply(input.value);
  }
});
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
  $('#send-button').disabled = busy || state.completed || !input.value.trim();
});
$('#restart').addEventListener('click', reset);
document.addEventListener('visibilitychange', () => { lastReplyAt = Date.now(); });

setInterval(async () => {
  if (busy || state.completed || events?.active || document.hidden || reminders >= 2 || Date.now() - lastReplyAt < 45000) return;
  const token = session;
  reminders++;
  gameMinutes++;
  state = { ...state, mental: Math.max(0, state.mental - 6) };
  state.completed = state.mental === 0;
  renderStatus();
  setBusy(true);
  const lines = reminders === 1 ? ['で、どうなった？', '今わかってるところだけでも返してもらえるかな'] : ['忙しいなら忙しいとか言おうね。\nいつ返せるか教えて。'];
  if (!(await coachSays(lines, token))) return;
  if (state.completed) {
    if (!(await coachSays(getEnding(state).messages, token))) return;
    showResult();
  }
  if (token === session) { setBusy(false); lastReplyAt = Date.now(); }
}, 1000);

function stateSnapshot() {
  return { topic: state.completed ? '会議終了' : STAGES[state.stage].title, mental: state.mental, trust: state.trust, decided: state.resolved.filter(Boolean).length, finished: state.completed, choices: state.completed ? [] : events?.active ? events.choiceTexts : STAGES[state.stage].choices.map(choice => choice.text), events: events?.snapshot() };
}

events = createEvents({
  getState: () => state, getToken: () => session, isBusy: () => busy, emit: addMessage,
  say: lines => coachSays(lines, session), pause,
  impact: (mental, trust) => { state = applyEventImpact(state, mental, trust); gameMinutes++; renderStatus(); },
  changed: () => { renderStatus(); renderChoices(); setBusy(busy); lastReplyAt = Date.now(); },
  lock: setBusy, resume: continueMeeting, scroll: () => scrollToLatest(true),
});

// 対応ブラウザーでは画面と同じ返信操作をWebMCP経由で利用できます。
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const specs = [
    { name: 'read_tactics_meeting', description: '現在の戦術会議の状況と返信候補を読む。', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => stateSnapshot() },
    { name: 'send_tactics_reply', description: '現在の戦術会議に自由入力で返信し、監督の返答を待つ。会議内の操作のみで、外部へ送信しない。', inputSchema: { type: 'object', properties: { message: { type: 'string', minLength: 1, maxLength: 500 } }, required: ['message'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: value => {
      if (!value || typeof value.message !== 'string' || !value.message.trim() || value.message.length > 500 || Object.keys(value).some(key => key !== 'message')) throw new Error('messageに1〜500文字の返信を指定してください。');
      return submitReply(value.message);
    } },
    { name: 'submit_tactics_document', description: '戦術メモの6項目を編集して現在の版を提出し、監督の赤入れを待つ。ゲーム内の提出のみで外部へアップロードしない。', inputSchema: { type: 'object', properties: { goal: { type: 'string', maxLength: 240 }, defence: { type: 'string', enum: ['linked', 'cover', 'ball'] }, trigger: { type: 'string', enum: ['backpass', 'touch', 'feeling'] }, transition: { type: 'string', enum: ['cover', 'reverse', 'none'] }, audience: { type: 'string', enum: ['all', 'leaders'] }, deadline: { type: 'string', enum: ['tonight', 'match'] } }, required: ['goal', 'defence', 'trigger', 'transition', 'audience', 'deadline'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async value => {
      await events.submitDraft(value);
      return stateSnapshot();
    } },
  ];
  for (const spec of specs) {
    try { void Promise.resolve(document.modelContext.registerTool(spec, { signal: lifecycle.signal })).catch(() => {}); } catch { /* 通常の画面操作を使う。 */ }
  }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}

reset();
