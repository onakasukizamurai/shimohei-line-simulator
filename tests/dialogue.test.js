import test from 'node:test';
import assert from 'node:assert/strict';
import { OPENING_REJECTION, OPENING_CHOICES, STAGES, classifyReply, initialState, isOpeningRejection, replyChoices, applyReply, getEnding } from '../dialogue.js';

test('最初だけ指定順の3択を表示し、どれを選んでもリジェクト後は戦術の3択に戻る', () => {
  const choices = replyChoices(initialState());
  assert.deepEqual(choices.map(choice => choice.text), ['今幹部で話し合ってるところです！', '気持ちで勝ちます', '１年生を入れようと思っています']);
  assert.deepEqual(choices, OPENING_CHOICES);
  for (const choice of choices) {
    const rejected = applyReply(initialState(), choice.kind);
    assert.equal(rejected.stage, 0, choice.text);
    assert.equal(isOpeningRejection(rejected), false, choice.text);
    assert.deepEqual(replyChoices(rejected), STAGES[0].choices, choice.text);
    const nextStage = applyReply(rejected, 'specific');
    assert.deepEqual(replyChoices(nextStage), STAGES[1].choices, choice.text);
  }
});

test('やり直すと最初の3択が戻り、終了した会議では返信候補を表示しない', () => {
  const rejected = applyReply(initialState(), 'vague');
  assert.notDeepEqual(replyChoices(rejected), OPENING_CHOICES);
  assert.deepEqual(replyChoices(initialState()), OPENING_CHOICES);
  assert.deepEqual(replyChoices({ ...rejected, completed: true }), []);
});

test('一度目は返信の種類に関わらずリジェクトし、話題と試行回数を進めない', () => {
  assert.deepEqual(OPENING_REJECTION, ['I reject.', 'リジェクトされた理由は自分で考えて。']);
  for (const kind of ['specific', 'vague', 'dodge', 'offtopic', 'question']) {
    const start = initialState();
    assert.equal(isOpeningRejection(start), true, kind);
    const state = applyReply(start, kind);
    assert.equal(state.openingRejected, true, kind);
    assert.equal(isOpeningRejection(state), false, kind);
    assert.equal(state.stage, 0, kind);
    assert.equal(state.attempts, 0, kind);
    assert.equal(state.turns, 1, kind);
    assert.deepEqual(state.resolved, [], kind);
    assert.equal(state.mental, 94, kind);
    assert.equal(state.trust, 17, kind);
    assert.equal(state.completed, false, kind);
    assert.equal(start.openingRejected, false, kind);
    assert.equal(start.turns, 0, kind);
  }
});

test('必須リジェクトの減点も下限に収まり、やり直すと一度目の判定が戻る', () => {
  const exhausted = applyReply({ ...initialState(), mental: 4, trust: 2 }, 'question');
  assert.equal(exhausted.mental, 0);
  assert.equal(exhausted.trust, 0);
  assert.equal(exhausted.completed, true);
  assert.equal(exhausted.openingRejected, true);
  const reset = initialState();
  assert.equal(reset.openingRejected, false);
  assert.equal(isOpeningRejection(reset), true);
  assert.equal(applyReply(reset, 'specific').stage, 0);
});

test('最初のリジェクト後は具体的な返信で全話題を完了し、納得エンドになる', () => {
  let state = applyReply(initialState(), 'specific');
  for (const stage of STAGES) {
    const reply = stage.choices.find(choice => choice.kind === 'specific').text;
    assert.equal(classifyReply(stage, reply), 'specific', stage.id);
    assert.equal(state.stage, STAGES.indexOf(stage), stage.id);
    state = applyReply(state, 'specific');
    assert.equal(state.stage, STAGES.indexOf(stage) + 1, stage.id);
    assert.equal(isOpeningRejection(state), false, stage.id);
  }
  assert.equal(state.completed, true);
  assert.equal(state.resolved.filter(Boolean).length, 8);
  assert.equal(getEnding(state).id, 'approved');
  assert.equal(getEnding(state).messages.at(-1), '末長く頼むよアミーゴ！！');
  assert.equal(state.trust, 100);
  assert.equal(state.turns, 9);
});

test('必須リジェクト後の曖昧な返信は2回で宿題として次の話題へ進む', () => {
  let state = applyReply(applyReply(initialState(), 'vague'), 'vague');
  assert.equal(state.stage, 0);
  assert.equal(state.attempts, 1);
  state = applyReply(state, 'vague');
  assert.equal(state.stage, 1);
  assert.equal(state.resolved[0], false);
  assert.equal(state.mental, 70);
});

test('精神論を続けるとメンタルが0で止まり、数値は範囲を超えない', () => {
  let state = initialState();
  while (!state.completed) state = applyReply(state, 'dodge');
  assert.equal(state.mental, 0);
  assert.equal(getEnding(state).id, 'exhausted');
  assert.ok(state.trust >= 0);
  assert.equal(state.turns, 6);
  assert.throws(() => applyReply(state, 'specific'));
});

test('自由入力で否定・質問・無関係な話・精神論を区別する', () => {
  assert.equal(classifyReply(STAGES[0], '中央は閉めません。サイドからも攻撃しません。'), 'vague');
  assert.equal(classifyReply(STAGES[0], '中央は閉めない。サイドからも攻めないです。'), 'vague');
  assert.equal(classifyReply(STAGES[0], 'どうすればいいか教えてください。'), 'question');
  assert.equal(classifyReply(STAGES[0], '明日の天気は晴れかな？'), 'offtopic');
  assert.equal(classifyReply(STAGES[0], '気持ちで勝ちます！！'), 'dodge');
  assert.equal(classifyReply(STAGES[0], 'はい'), 'vague');
  assert.equal(classifyReply(STAGES[7], '幹部がメモを全員に共有し、次の練習で役割を合わせます。'), 'specific');
  assert.equal(classifyReply(STAGES[7], '副将がメモを全員に共有し、次の練習で役割を合わせます。'), 'specific');
  assert.throws(() => classifyReply(STAGES[0], '   '));
  assert.throws(() => classifyReply(STAGES[0], 'あ'.repeat(501)));
});

test('必須リジェクト後の質問はスコアと話題を変えず、未決事項が残れば宿題エンドになる', () => {
  const start = applyReply(initialState(), 'question');
  const question = applyReply(start, 'question');
  assert.equal(question.trust, start.trust);
  assert.equal(question.mental, start.mental);
  assert.equal(question.stage, start.stage);
  assert.equal(question.attempts, 0);
  assert.equal(question.turns, start.turns + 1);
  const state = { ...start, stage: 8, mental: 30, trust: 40, resolved: [true, false, true, false, true, false, true, false], completed: true };
  assert.equal(getEnding(state).id, 'homework');
  assert.equal(start.resolved.length, 0);
});

test('Aoiの助けを選んだときだけ、決定事項が少なくても隠しエンドになる', () => {
  const unfinished = { ...initialState(), stage: 5, mental: 60, trust: 100, resolved: [true, false, true, false, true], completed: true };
  assert.equal(getEnding(unfinished).id, 'homework');
  const assisted = { ...unfinished, specialEnding: 'aoi' };
  const ending = getEnding(assisted);
  assert.equal(ending.id, 'aoi');
  assert.match(ending.description, /Aoi Kobayashi/);
  assert.ok(ending.messages.some(message => message.includes('全面的に賛成')));
  assert.equal(ending.messages.at(-1), '末長く頼むよアミーゴ！！');
  assert.deepEqual(assisted.resolved, unfinished.resolved);
  assert.equal(unfinished.specialEnding, null);
});

test('やり直すとAoiの隠しエンドを引き継がず、通常の会議に戻る', () => {
  const endingState = { ...initialState(), mental: 80, trust: 100, completed: true, specialEnding: 'aoi' };
  assert.equal(getEnding(endingState).id, 'aoi');
  const reset = initialState();
  assert.equal(reset.specialEnding, null);
  assert.equal(reset.completed, false);
  assert.equal(getEnding(reset).id, 'homework');
  assert.equal(applyReply(reset, 'specific').completed, false);
});
