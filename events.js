import { PEERS, PHONE_ROUNDS, DM_OPTIONS, createSession, nextEvent, shouldReceiveJunior, shouldReceiveAoi, reviewDocument } from './gameplay.js?v=0.4.5';

const $ = selector => document.querySelector(selector);
const fieldKeys = ['goal', 'defence', 'trigger', 'transition', 'audience', 'deadline'];
const fieldNames = { goal: '勝ち筋', defence: '守備の役割', trigger: 'プレスの合図', transition: '外された・詰まった時', audience: '共有する相手', deadline: '担当と期限' };

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function peerIcon(peer) {
  const info = PEERS[peer];
  const icon = node('span', `peer-avatar ${peer}-avatar${info.avatar ? ' photo-avatar' : ''}`, info.avatar ? undefined : info.initial);
  icon.style.background = info.color;
  if (info.avatar) {
    const image = node('img'); image.src = info.avatar; image.alt = `${info.name}のアイコン`;
    image.width = 38; image.height = 38; icon.append(image);
  }
  return icon;
}

export function createEvents(api) {
  let game = createSession();
  let currentPeer = 'vice';
  let phoneMode = 'idle';
  let phoneRound = 0;
  let phoneBusy = false;
  let callSeconds = 0;
  let phoneTimer = null;
  let audio = null;
  let sound = true;
  let eventBusy = false;

  function soundNote(frequencies = [720, 960]) {
    if (!sound || document.hidden) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio ||= new Audio();
      void audio.resume().catch(() => {});
      frequencies.forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime + index * .14;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.055, start + .01);
        gain.gain.exponentialRampToValueAtTime(.001, start + .12);
        oscillator.connect(gain); gain.connect(audio.destination);
        oscillator.start(start); oscillator.stop(start + .14);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* 音が許可されない環境でもゲームは進む。 */ }
  }

  function closeAll() {
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    clearInterval(phoneTimer); phoneTimer = null;
    $('#notifications').replaceChildren();
  }

  function notify(peer, text) {
    const toast = node('div', 'chat-notification');
    const open = node('button', 'notification-open');
    const icon = peerIcon(peer);
    const body = node('span', 'notification-body');
    body.append(node('strong', '', `${PEERS[peer].name} · 個別チャット`), node('span', '', text));
    open.append(icon, body);
    open.addEventListener('click', () => { toast.remove(); openPeer(peer); });
    const dismiss = node('button', 'notification-dismiss', '×');
    dismiss.setAttribute('aria-label', '通知を閉じる');
    dismiss.addEventListener('click', () => toast.remove());
    toast.append(open, dismiss); toast.dataset.peer = peer;
    // 新着は毎回画面上端の同じ位置に表示する。未読と履歴は game に残す。
    $('#notifications').replaceChildren(toast);
    soundNote();
  }

  function receive(peer, text, notification = true) {
    game.chats[peer].push({ sender: peer, text });
    if ($('#dm-dialog').open && currentPeer === peer) renderDM();
    else game.unread[peer]++;
    if (notification) notify(peer, text);
    render();
  }

  function render() {
    $('#document-submit').disabled = api.isBusy() || eventBusy || api.getState().completed;
    for (const peer of ['junior', 'aoi']) {
      document.querySelectorAll(`[data-peer="${peer}"]`).forEach(button => { button.hidden = !game.seen.includes(`${peer}-dm`); });
    }
    if (currentPeer === 'aoi') $('#dm-choices').querySelectorAll('button').forEach(button => { button.disabled = api.isBusy() || eventBusy || api.getState().completed; });
    let total = 0;
    for (const peer of Object.keys(PEERS)) {
      total += game.unread[peer];
      const count = $(`#${peer}-unread`);
      count.textContent = game.unread[peer]; count.hidden = !game.unread[peer];
      const last = game.chats[peer].at(-1);
      $(`#${peer}-preview`).textContent = last?.text || '個別チャット';
      const tabCount = $(`[data-unread="${peer}"]`);
      tabCount.textContent = game.unread[peer] || '';
    }
    $('#inbox-count').textContent = total; $('#inbox-count').hidden = !total;
    $('#header-chats').setAttribute('aria-label', total ? `トーク一覧を開く（未読${total}件）` : 'トーク一覧を開く');
    $('#document-version').textContent = game.document.version ? `v${game.document.version}${game.document.approved ? ' ✓' : ' 要修正'}` : '未提出';
    $('#document-button').classList.toggle('attention', game.active?.includes('document') || false);
    $('#task-banner').hidden = !game.active;
    const descriptions = {
      phone: ['監督から着信。文字だけでは伝わらなかった。', '着信画面を開く'],
      document: ['監督「戦術、１枚にまとめて送って。」', '戦術メモを開く'],
      incident: ['急な前提変更。さっきの戦術、このままでいい？', '映像メモを確認'],
      'final-document': ['監督「その修正、メモにも入ってる？ 最新版送って。」', '最新版を編集'],
    };
    if (game.active) {
      $('#task-text').textContent = descriptions[game.active][0];
      $('#task-action').textContent = descriptions[game.active][1];
    }
  }

  function openPeer(peer) {
    if (api.getState().completed || game.seen.includes('aoi-ending') || $('#phone-dialog').open) return;
    if (['junior', 'aoi'].includes(peer) && !game.seen.includes(`${peer}-dm`)) return;
    currentPeer = peer; game.unread[peer] = 0;
    $('#notifications').querySelectorAll(`[data-peer="${peer}"]`).forEach(item => item.remove());
    $('#dm-title').textContent = PEERS[peer].name;
    const avatar = $('#dm-avatar'); avatar.replaceChildren(); avatar.hidden = !PEERS[peer].avatar;
    if (PEERS[peer].avatar) avatar.append(peerIcon(peer));
    document.querySelectorAll('.dm-tabs [data-peer]').forEach(button => button.classList.toggle('selected', button.dataset.peer === peer));
    renderDM(); render();
    if (!$('#dm-dialog').open) $('#dm-dialog').showModal();
  }

  function renderDM() {
    const history = $('#dm-history'); history.replaceChildren();
    const log = game.chats[currentPeer];
    if (!log.length) history.append(node('p', 'dm-empty', 'こっちで手伝えることあったら言って！'));
    for (const message of log) {
      const item = node('div', `dm-message ${message.sender === 'user' ? 'dm-user' : ''}`, message.text);
      history.append(item);
    }
    const choices = $('#dm-choices'); choices.replaceChildren();
    const canReply = currentPeer === 'junior' ? game.seen.includes('junior-dm') && !game.dmReplies['junior-replied'] : currentPeer !== 'aoi' || (game.seen.includes('aoi-dm') && !game.seen.includes('aoi-ending'));
    choices.hidden = !canReply;
    if (canReply) DM_OPTIONS[currentPeer].forEach((text, index) => {
      const button = node('button', '', text); button.type = 'button';
      if (currentPeer === 'aoi') button.disabled = api.isBusy() || eventBusy || api.getState().completed;
      button.addEventListener('click', () => replyPeer(currentPeer, index)); choices.append(button);
    });
    history.scrollTop = history.scrollHeight;
  }

  async function replyPeer(peer, index) {
    if (api.getState().completed || game.seen.includes('aoi-ending')) return;
    if (peer === 'aoi') {
      const key = `aoi:${index}`;
      if (api.isBusy() || eventBusy || !game.seen.includes('aoi-dm') || game.dmReplies[key] || game.seen.includes('aoi-ending')) return;
      game.chats[peer].push({ sender: 'user', text: DM_OPTIONS[peer][index] });
      game.dmReplies[key] = true; game.unread[peer] = 0;
      renderDM(); api.changed();
      if (index === 2) await finishWithAoi();
      return;
    }
    if (peer === 'junior') {
      if (!game.seen.includes('junior-dm') || game.dmReplies['junior-replied']) return;
      game.chats[peer].push({ sender: 'user', text: DM_OPTIONS[peer][index] });
      game.dmReplies['junior-replied'] = true;
      game.unread[peer] = 0; renderDM(); api.changed();
      return;
    }
    game.chats[peer].push({ sender: 'user', text: DM_OPTIONS[peer][index] });
    const key = `${peer}:${index}`;
    if (game.dmReplies[key]) {
      receive(peer, 'さっき送った内容でいこう！ まずは監督に返してみて。', false);
      renderDM(); return;
    }
    game.dmReplies[key] = true;
    if (peer === 'vice') {
      if (index === 0) {
        game.helpUsed = true; api.impact(4, 2);
        receive(peer, 'FWは外へ誘導、MFが中央、DFが裏。いま確認してる！\n「全員で守る」より、誰がどこ守るかで説明した方がよさそう。', false);
      } else if (index === 1) {
        game.helpUsed = true;
        if (!game.draft.goal) game.draft.goal = '中央の前進を止め、奪ったらサイドへ運んで攻める。';
        receive(peer, 'たたき台、戦術メモに入れた！\n守備の分担と、合図と、外された時の約束は見直してから送ってね。', false);
        fillForm();
      } else if (index === 2) {
        game.shared = true; api.impact(2, 2);
        receive(peer, '全員に共有しておく！\n最後の戦術メモも「全員」にして。次の練習で役割と動きを確認するね。', false);
      } else if (index === 3) {
        const count = api.getState().resolved.filter(Boolean).length;
        receive(peer, `今の決定事項は${count}項目。\n${game.seen.includes('incident') ? game.incident.documentFix.label + 'も忘れずに。' : '口頭で話したことと、メモの内容をそろえよう。'}`, false);
      } else if (index === 5) {
        receive(peer, '当日ぶっつけは怖いから、今夜メモを共有しておこう！', false);
      } else receive(peer, '了解！ 詰まったら頼って。ひとりで抱え込まなくて大丈夫。', false);
    } else if (peer === 'analyst') {
      if (index === 0) {
        game.helpUsed = true;
        receive(peer, game.seen.includes('incident') ? game.incident.hint : '架空の映像メモ：中央へ前進する場面に注目。\nFWが外へ誘導した時、MFがパスを切れるかを見てみよう。', false);
      } else if (index === 1) {
        receive(peer, '監督にも共有する！\n見たことと、そこから考えた仮説は分けて話そう。', false);
        api.emit(game.seen.includes('incident') ? game.incident.hint : '映像の想定メモです。中央の前進を止めて外へ誘導する案、どうでしょうか。', 'analyst');
      } else receive(peer, '「たぶん」で押すと、なんで？って聞かれるやつ…。根拠は確認しようね。', false);
    }
    game.unread[peer] = 0; renderDM(); api.changed();
  }

  async function finishWithAoi() {
    const token = api.getToken();
    game.seen.push('aoi-ending'); game.helpUsed = true; game.active = null;
    eventBusy = true; api.lock(true); closeAll(); api.scroll();
    const adjustments = {
      press: 'プレスの合図は、バックパスだけじゃなく大きいトラップも入れましょう。',
      cover: 'MFが足りない時間は、FWを１人下げて中央を埋めましょう。',
      outlet: 'サイドが詰まったらDFに戻して、逆サイドへ展開しましょう。',
    };
    for (const text of [
      '戦術ちょっと考えてみました。',
      '中央を閉めて、奪ったらサイドから。FWが外へ誘導、MFが中央、DFが裏をカバーする形でどうですか？',
      adjustments[game.incident.id],
      'PCとロスト時の役割もメモにまとめて、今夜全員に共有。次の練習で確認しましょう！',
    ]) {
      await api.pause(Math.min(2500, Math.max(1200, 900 + text.length * 25)));
      if (token !== api.getToken()) return;
      api.emit(text, 'aoi'); api.scroll();
    }
    api.finishAoi(); eventBusy = false; await api.resume(token);
  }

  function fillForm() {
    for (const key of fieldKeys) $(`#draft-${key}`).value = game.draft[key];
    $('#draft-version').textContent = `次の提出：v${game.document.version + 1}`;
    $('#draft-status').textContent = game.active === 'final-document' ? '修正を反映して再提出' : '下書き';
    const feedback = $('#document-feedback'); feedback.replaceChildren();
    const issues = game.document.reviews.at(-1)?.issues || [];
    feedback.hidden = !issues.length;
    if (issues.length) {
      feedback.append(node('strong', '', 'しもへい。の赤入れ'));
      issues.forEach(issue => feedback.append(node('p', '', issue)));
    } else if (game.active === 'final-document') {
      feedback.hidden = false;
      feedback.append(node('strong', '', 'さっきの前提変更'), node('p', '', game.incident.documentFix.label));
    }
  }

  function saveForm() { for (const key of fieldKeys) game.draft[key] = $(`#draft-${key}`).value; }
  function openDocument() {
    if (api.getState().completed || game.seen.includes('aoi-ending') || $('#phone-dialog').open) return;
    if ($('#dm-dialog').open) $('#dm-dialog').close();
    fillForm();
    if (!$('#document-dialog').open) $('#document-dialog').showModal();
  }

  function draftFromConversation() {
    const answers = game.answers;
    game.draft.goal = answers.overview || game.draft.goal || '中央の前進を止め、奪ったらサイドへ運んで攻める。';
    if (game.seen.includes('incident') && game.incidentAccepted) game.draft[game.incident.documentFix.key] = game.incident.documentFix.value;
    fillForm();
    $('#draft-status').textContent = '会話の内容を反映しました';
  }

  function attachment(record) {
    const row = node('div', 'message-row user-row');
    const card = node('button', 'attachment-card'); card.type = 'button';
    card.append(node('span', 'file-icon', 'DOCX'));
    const description = node('span', 'file-description');
    description.append(node('strong', '', `学習院戦_戦術メモ_v${record.version}.docx`), node('span', '', record.issues.length ? 'Word文書 · 送信済み · 修正あり' : 'Word文書 · 送信済み · 確認済み'));
    card.append(description); card.addEventListener('click', () => openAttachment(record));
    row.append(card); $('#messages').append(row); api.scroll();
  }

  function openAttachment(record) {
    if (game.seen.includes('aoi-ending')) return;
    $('#attachment-title').textContent = `学習院戦_戦術メモ_v${record.version}.docx`;
    const content = $('#attachment-content'); content.replaceChildren();
    for (const key of fieldKeys) {
      const value = key === 'goal' ? record.draft[key] : [...$(`#draft-${key}`).options].find(option => option.value === record.draft[key])?.textContent;
      content.append(node('h3', '', fieldNames[key]), node('p', '', value || '未記入'));
    }
    if (record.issues.length) {
      const comments = node('div', 'document-feedback'); comments.append(node('strong', '', 'しもへい。の赤入れ'));
      record.issues.forEach(issue => comments.append(node('p', '', issue))); content.append(comments);
    }
    $('#attachment-dialog').showModal();
  }

  async function submitDocument() {
    if (api.isBusy() || eventBusy || api.getState().completed || game.active === 'phone' || game.active === 'incident') return;
    const token = api.getToken(); const current = game;
    if ($('#document-dialog').open) saveForm();
    const final = game.active === 'final-document';
    const issues = reviewDocument(game.draft, final ? game.incident : null);
    const record = { version: ++game.document.version, draft: { ...game.draft }, issues };
    game.document.attempts++; game.document.approved = !issues.length; game.document.reviews.push(record);
    if ($('#document-dialog').open) $('#document-dialog').close();
    attachment(record); eventBusy = true; api.lock(true); api.impact(issues.length ? -8 : -2, issues.length ? -5 : 5);
    if (issues.length) {
      await api.say(['I reject.', ...issues.slice(0, 2), '直した版を送って。ファイル名だけ最終版にしても中身は変わらないので。']);
      if (token !== api.getToken() || current !== game) return;
      if (api.getState().completed) { game.active = null; eventBusy = false; await api.resume(token); return; }
      if (!game.active) game.active = final ? 'final-document' : 'document';
      eventBusy = false; api.lock(false); api.changed();
    } else {
      if (final) game.document.final = true;
      game.shared = game.draft.audience === 'all';
      if (!game.seen.includes('document')) game.seen.push('document');
      await api.say([
        `v${record.version}見た。`,
        ...(final ? [
          'あい。さっきの変更も入ってるね。',
          '俺はみんなから見たらただのゴミカスオジだけど',
          '一応社会人としてコンサルを生業にしている以上は、成果を出すことにこだわりたいのね。',
          'そのために何ができるか考えています。',
          'これを全員に共有して、役割確認してね。',
        ] : ['よいと思います。\nじゃあ、その約束で実際どう動くかの話に戻ろう。']),
      ]);
      if (token !== api.getToken() || current !== game) return;
      game.active = null; eventBusy = false; api.lock(false); await api.resume(token);
    }
    render();
  }

  function stopPhoneTimer() { clearInterval(phoneTimer); phoneTimer = null; }
  function openPhone() {
    if (game.active !== 'phone') return;
    if (!$('#phone-dialog').open) $('#phone-dialog').showModal();
  }

  function incomingCall() {
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    phoneMode = 'incoming'; phoneBusy = false; game.phone = '着信中'; callSeconds = 0;
    $('#phone-label').textContent = '音声通話の着信'; $('#phone-subtitle').textContent = '学習院戦の戦術について';
    $('#phone-subtitles').replaceChildren(); $('#phone-incoming').hidden = false; $('#phone-choices').hidden = true; $('#phone-free').hidden = true;
    openPhone(); soundNote([640, 800, 640, 800]);
    const token = api.getToken();
    phoneTimer = setInterval(() => {
      if (token !== api.getToken()) { stopPhoneTimer(); return; }
      if (document.hidden) return;
      callSeconds++;
      if (phoneMode === 'incoming') {
        $('#phone-subtitle').textContent = `呼び出し中… ${Math.max(0, 25 - callSeconds)}秒`;
        if (callSeconds % 3 === 0) soundNote([640, 800, 640, 800]);
        if (callSeconds >= 25) void declinePhone(true);
      } else $('#phone-label').textContent = `通話中 00:${String(callSeconds).padStart(2, '0')}`;
    }, 1000);
  }

  function renderPhoneRound() {
    $('#phone-subtitles').replaceChildren(node('span', 'phone-round', `確認 ${phoneRound + 1} / 2`), node('p', '', PHONE_ROUNDS[phoneRound].text));
    const choices = $('#phone-choices'); choices.replaceChildren(); choices.hidden = false;
    PHONE_ROUNDS[phoneRound].choices.forEach(choice => {
      const button = node('button', '', choice.text); button.type = 'button';
      button.addEventListener('click', () => answerPhoneReply(choice.text, choice.good)); choices.append(button);
    });
    $('#phone-free').hidden = false; $('#phone-reply').value = '';
  }

  function answerPhone() {
    if (phoneMode !== 'incoming' || game.active !== 'phone') return;
    phoneMode = 'talking'; phoneRound = 0; callSeconds = 0; game.phone = '応答'; game.callAnswers = 0;
    $('#phone-label').textContent = '通話中 00:00'; $('#phone-subtitle').textContent = 'しもへい。が話しています'; $('#phone-incoming').hidden = true;
    renderPhoneRound(); render();
  }

  function callRecord(text) {
    const record = node('div', 'timeline-event'); record.append(node('span', '', '☎'), node('strong', '', text));
    $('#messages').append(record); api.scroll();
  }

  async function declinePhone(missed = false) {
    if (phoneMode !== 'incoming' || game.active !== 'phone') return;
    const token = api.getToken(); phoneMode = 'done'; game.phone = missed ? '不在着信' : '折り返し'; stopPhoneTimer();
    $('#phone-dialog').close(); eventBusy = true; api.lock(true); api.impact(-5, -7);
    callRecord(missed ? 'しもへい。から不在着信' : 'しもへい。への通話をあとで折り返す');
    await api.say([missed ? '今電話したんだけど。' : 'あい、今は無理ってことね。', '文字でいいので、結論と理由を分けて送ってもらえるかな？？']);
    if (token !== api.getToken()) return;
    game.active = null; eventBusy = false; api.lock(false); await api.resume(token);
  }

  async function answerPhoneReply(text, selectedGood) {
    if (phoneBusy || phoneMode !== 'talking' || !text.trim() || text.length > 500) return;
    const token = api.getToken(); phoneBusy = true;
    const good = selectedGood ?? true;
    if (good) game.callAnswers++;
    $('#phone-choices').querySelectorAll('button').forEach(button => { button.disabled = true; });
    $('#phone-send').disabled = true;
    $('#phone-subtitles').append(node('p', 'phone-your-answer', `あなた「${text}」`));
    await api.pause(1200);
    if (token !== api.getToken()) return;
    const response = good ? 'うん、その順番で話してもらえるとわかる。' : 'そうじゃなくて、、、\n前提が省かれていきなり答えを言われても理解できない！';
    $('#phone-subtitles').append(node('p', 'phone-response', response));
    await api.pause(Math.min(2500, Math.max(1800, 1000 + response.length * 25)));
    if (token !== api.getToken()) return;
    phoneRound++;
    if (phoneRound < PHONE_ROUNDS.length) { phoneBusy = false; $('#phone-send').disabled = false; renderPhoneRound(); return; }
    phoneMode = 'done'; stopPhoneTimer(); $('#phone-dialog').close(); $('#phone-send').disabled = false;
    callRecord(`音声通話が終了しました · ${game.callAnswers} / 2 確認`);
    api.impact(game.callAnswers === 2 ? -3 : -10, game.callAnswers === 2 ? 7 : -7);
    eventBusy = true; api.lock(true);
    await api.say([game.callAnswers === 2 ? '電話ありがとう。\n口頭で言えたことを、メモにも残してね。' : 'まぁ、まだ整理が必要そうだね。\n何がわからないかの仮説はもとうよ。']);
    if (token !== api.getToken()) return;
    game.active = null; eventBusy = false; phoneBusy = false; api.lock(false); await api.resume(token);
  }

  async function answerIncident(text, good) {
    if (eventBusy || game.active !== 'incident') return;
    const token = api.getToken(); eventBusy = true; api.lock(true);
    const specific = good ?? true;
    api.emit(text, 'user'); api.impact(specific ? -3 : -9, specific ? 5 : -6);
    if (specific) game.incidentAccepted = true;
    await api.say(specific ? ['なるほど。それならよいと思います。', 'その変更、メモにも入れてね。\n口頭と資料で違うのが一番困るから。'] : ['それ、修正案になってる？？', game.incident.hint, 'この変更は、最終版のメモにも入れてください。']);
    if (token !== api.getToken()) return;
    game.active = null; eventBusy = false; api.lock(false); await api.resume(token);
  }

  function inviteAoi() {
    if (!shouldReceiveAoi(api.getState(), game)) return;
    game.seen.push('aoi-dm'); receive('aoi', '麻辣湯食べに行かない？');
  }

  async function startNext() {
    if (game.active) return true;
    if (shouldReceiveJunior(api.getState(), game)) {
      const token = api.getToken();
      game.seen.push('junior-dm');
      receive('junior', '明日の部活前少し話せますか？');
      await api.pause(1200);
      if (token !== api.getToken()) return true;
      receive('junior', '部活辞めたいです、、');
      api.impact(-10, 0);
      if (api.getState().completed) { await api.resume(api.getToken()); return true; }
    }
    const type = nextEvent(api.getState(), game);
    if (!type) { inviteAoi(); return false; }
    const token = api.getToken();
    game.seen.push(type); game.active = type; render();
    if (type === 'phone') {
      await api.say(['文字だと伝わらんので、電話してもいい？', 'いや、もうかけてます。']);
      if (token !== api.getToken()) return true;
      await api.pause(1500);
      if (token !== api.getToken()) return true;
      incomingCall();
    } else if (type === 'document') {
      await api.say(['それ、１枚にまとめて送って。', '守る場所、プレスの合図、外されたとき、共有する相手。\n今の案が全員に伝わるように。']);
      if (token !== api.getToken()) return true;
      receive('vice', 'メモ頼まれた？ たたき台なら作れるよ！');
    } else if (type === 'incident') {
      receive('analyst', game.incident.teaser);
      await api.say(game.incident.messages);
      if (token !== api.getToken()) return true;
    } else {
      receive('vice', '最後の版、全員に送ってほしい！\n最初の案から変わったところも確認するね。');
      await api.say(['最新版、送って。', 'さっき話した変更、最初のメモには入ってないよね？']);
      if (token !== api.getToken()) return true;
    }
    inviteAoi();
    return true;
  }

  function choiceTexts() {
    if (game.active === 'phone') return phoneMode === 'talking' ? PHONE_ROUNDS[phoneRound].choices.map(choice => choice.text) : ['応答する', 'あとで折り返す', '着信画面を開く'];
    if (game.active === 'incident') return game.incident.choices.map(choice => choice.text);
    return ['戦術メモを開いてまとめる', '副将に下書きを頼む', 'とりあえず今の版を提出する'];
  }

  async function reply(text, fromChoice = false) {
    if (eventBusy || api.isBusy()) return;
    if (game.active === 'phone') {
      if (phoneMode === 'talking') {
        const candidate = fromChoice ? PHONE_ROUNDS[phoneRound].choices.find(choice => choice.text === text) : null;
        await answerPhoneReply(text, candidate?.good);
      }
      else if (!fromChoice || /応答|出ます|出る/.test(text)) answerPhone();
      else if (/折り返|あとで|出ない/.test(text)) await declinePhone();
      else openPhone();
    } else if (game.active === 'incident') {
      const candidate = fromChoice ? game.incident.choices.find(choice => choice.text === text) : null;
      await answerIncident(text, candidate?.good);
    } else if (!fromChoice) openDocument();
    else if (/副将|下書き.*頼/.test(text)) { openPeer('vice'); }
    else if (/提出/.test(text)) await submitDocument();
    else openDocument();
  }

  function renderChoices(container) {
    choiceTexts().forEach((text, index) => {
      const button = node('button', 'choice-button'); button.type = 'button';
      const number = node('span', 'choice-number', `0${index + 1}`); number.setAttribute('aria-hidden', 'true');
      button.append(number, node('span', '', text)); button.addEventListener('click', () => reply(text, true)); container.append(button);
    });
  }

  document.querySelectorAll('[data-peer]').forEach(button => button.addEventListener('click', () => openPeer(button.dataset.peer)));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.close === 'document-dialog') saveForm();
    $(`#${button.dataset.close}`).close(); api.changed();
  }));
  $('#document-dialog').addEventListener('cancel', saveForm);
  $('#document-form').addEventListener('submit', event => { event.preventDefault(); void submitDocument(); });
  $('#document-button').addEventListener('click', openDocument);
  $('#draft-fill').addEventListener('click', draftFromConversation);
  $('#attachment-edit').addEventListener('click', () => { $('#attachment-dialog').close(); openDocument(); });
  $('#inbox-button').addEventListener('click', () => openPeer(Object.keys(PEERS).find(peer => game.unread[peer]) || currentPeer));
  $('#task-action').addEventListener('click', () => { if (game.active === 'phone') openPhone(); else if (game.active === 'incident') openPeer('analyst'); else openDocument(); });
  $('#phone-answer').addEventListener('click', answerPhone);
  $('#phone-decline').addEventListener('click', () => declinePhone());
  $('#phone-dialog').addEventListener('cancel', event => { event.preventDefault(); if (phoneMode === 'incoming') void declinePhone(); });
  $('#phone-send').addEventListener('click', () => answerPhoneReply($('#phone-reply').value));
  $('#phone-reply').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); void answerPhoneReply($('#phone-reply').value); } });
  $('#phone-sound').addEventListener('click', () => { sound = false; updateSound(); });
  function updateSound() {
    $('#sound-button').setAttribute('aria-pressed', String(sound));
    $('#sound-button').setAttribute('aria-label', sound ? '通知音をオフにする' : '通知音をオンにする');
    $('#sound-button').querySelector('span').textContent = sound ? '通知音 ON' : '通知音 OFF';
  }
  $('#sound-button').addEventListener('click', () => { sound = !sound; updateSound(); if (sound) soundNote(); });

  return {
    get active() { return game.active; },
    get title() { return game.active === 'phone' ? '監督から着信。どうする？' : game.active === 'incident' ? '前提が変わった。どう対応する？' : '戦術メモの提出を求められた。'; },
    get choiceTexts() { return choiceTexts(); }, render, renderChoices, reply, startNext, closeAll,
    reset() {
      closeAll(); game = createSession(); currentPeer = 'vice'; phoneMode = 'idle'; phoneBusy = false; eventBusy = false; phoneRound = 0;
      $('#phone-send').disabled = false; render();
    },
    onReply(stage, text, kind) {
      if (kind === 'specific') game.answers[stage.id] = text;
      if (kind === 'dodge' && !game.seen.includes('oops')) {
        game.seen.push('oops');
        api.emit('まぁ任せます。');
        const cancelled = node('div', 'message-cancelled', 'しもへい。がメッセージの送信を取り消しました');
        const last = $('#messages').lastElementChild; if (last) last.replaceWith(cancelled);
        api.emit('あ、任せるとは言ったけど、考えなくていいとは言ってないので。');
      }
    },
    addResult(container) {
      const summary = node('p', 'event-summary', `通話：${game.phone} · メモ：v${game.document.version}まで提出 · 幹部との協力：${game.helpUsed ? 'あり' : 'なし'}${game.document.final ? '\n変更を反映した最終版まで共有できた。' : ''}`);
      container.append(summary);
      if (game.seen.includes('aoi-ending')) container.append(node('p', 'event-summary', 'Aoi Kobayashiの助けで、しもへい。が全面賛成。会議はご機嫌のまま終了した。'));
    },
    async submitDraft(value) {
      const allowed = { defence: ['linked', 'cover', 'ball'], trigger: ['backpass', 'touch', 'feeling'], transition: ['cover', 'reverse', 'none'], audience: ['all', 'leaders'], deadline: ['tonight', 'match'] };
      if (!value || typeof value !== 'object' || typeof value.goal !== 'string' || value.goal.length > 240 || Object.keys(value).length !== 6 || Object.entries(allowed).some(([key, list]) => !list.includes(value[key]))) throw new Error('戦術メモの6項目を正しい形式で指定してください。');
      if (api.isBusy() || eventBusy || api.getState().completed || (game.active && !game.active.includes('document'))) throw new Error('いまは資料を提出できません。現在のイベントを終えてください。');
      game.draft = { ...value }; fillForm(); await submitDocument();
    },
    snapshot() { return { active: game.active, phone: game.phone, documentVersion: game.document.version, documentApproved: game.document.approved, finalDocument: game.document.final, draft: { ...game.draft }, unread: { ...game.unread }, incident: game.seen.includes('incident') ? game.incident.name : null, juniorReceived: game.seen.includes('junior-dm'), juniorReplied: Boolean(game.dmReplies['junior-replied']), aoiReceived: game.seen.includes('aoi-dm'), aoiEnding: game.seen.includes('aoi-ending') }; },
  };
}
