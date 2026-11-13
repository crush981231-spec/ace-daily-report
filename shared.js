/* Public report viewer. Google authentication is required only for cloud writes. */
export const ROSTER = Object.freeze({
  '남종현': '과장', '김요한': '과장', '김상현': '과장', '김민구': '대리',
  '조병주': '대리', '이재웅': '주임', '이수진': '주임'
});
const OWNER = 'crush981231@gmail.com';
const CORE = ['who', 'when', 'where', 'what', 'how', 'why'];
const $ = id => document.getElementById(id);
const form = $('reportForm');
const submit = form?.querySelector('button[type="submit"]');
// Block writes immediately, including while SDK loading is pending.
if (submit) submit.disabled = true;
const hasAuthor = value => typeof value === 'string' && Object.hasOwn(ROSTER, value);
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function validReportDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2199-12-31') return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function validateCloudDraft(draft) {
  if (!draft || typeof draft !== 'object') throw Error('작성 중 보고서를 불러올 수 없습니다.');
  if (draft.isExample === true) throw Error('예시는 제출할 수 없습니다. 새 보고서 버튼으로 실제 보고서를 작성해 주세요.');
  if (typeof draft.id !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(draft.id)) throw Error('보고서 ID가 올바르지 않습니다. 새 보고서를 작성해 주세요.');
  if (!hasAuthor(draft.author)) throw Error('작성자를 선택해 주세요.');
  if (!validReportDate(draft.date)) throw Error('보고일은 1900~2199년의 올바른 날짜여야 합니다.');
  for (const key of [...CORE, 'outcome']) {
    if (typeof draft[key] !== 'string' || draft[key].length > 1500 || (key !== 'outcome' && !draft[key].trim())) throw Error('육하원칙 여섯 항목은 필수이며 각 항목과 결과는 1,500자 이하여야 합니다.');
  }
  if (typeof draft.text !== 'string' || !draft.text.trim() || draft.text.length > 16000) throw Error('최종 보고 내용은 1~16,000자로 작성해 주세요.');
  return {
    author: draft.author, role: ROSTER[draft.author], date: draft.date,
    ...Object.fromEntries([...CORE, 'outcome', 'text'].map(key => [key, draft[key]]))
  };
}
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, action, className = 'small') {
  const node = el('button', text, className);
  node.type = 'button';
  if (action) node.addEventListener('click', action);
  return node;
}
function field(labelText, control) {
  const wrapper = el('label', labelText, 'ace-field');
  wrapper.append(control);
  return wrapper;
}
function selectAuthor() {
  const node = el('select');
  const all = el('option', '전체 작성자');
  all.value = '';
  node.append(all);
  for (const name of Object.keys(ROSTER)) {
    const option = el('option', `${name} ${ROSTER[name]}`);
    option.value = name;
    node.append(option);
  }
  return node;
}
const style = el('style');
style.textContent = `
.ace-shell{max-width:920px;margin:auto;padding:16px 24px 0}.ace-login,.ace-tabs,.ace-flex{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.ace-login{justify-content:space-between}.ace-tabs{margin-top:14px;border-bottom:1px solid var(--line,#dce8e5);padding-bottom:10px}.ace-tabs button[aria-selected=true]{background:var(--teal,#087f78);border-color:var(--teal,#087f78);color:#fff}.ace-note{font-size:13px;color:var(--muted,#647b78);white-space:pre-wrap;overflow-wrap:anywhere}.ace-cloud{margin:18px 0;padding:17px;border:1px solid var(--line,#dce8e5);border-radius:9px;background:#fff}.ace-cloud h2{margin-bottom:10px}.ace-field{flex:1;min-width:145px;font-size:13px;margin:0}.ace-field select,.ace-field input{margin-top:5px;font-weight:400}.ace-pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0;font:inherit;line-height:1.8}.ace-item{padding:15px 0;border-bottom:1px solid var(--line,#dce8e5)}.ace-item:last-child{border-bottom:0}.ace-item h3{font-size:15px;margin:0}.ace-error{color:#a03535}button:disabled{opacity:.5;cursor:not-allowed}.ace-cloud details{font-size:13px}.ace-cloud dl{display:grid;grid-template-columns:65px 1fr;gap:5px 10px}.ace-cloud dt{font-weight:700}.ace-cloud dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:600px){.ace-shell{padding:14px 17px 0}.ace-cloud{padding:13px}.ace-login{align-items:flex-start}.ace-field{min-width:120px}.ace-flex{align-items:flex-end}}@media print{.ace-shell,.ace-cloud{display:none!important}}
`;
document.head.append(style);
const shell = el('section', undefined, 'ace-shell');
shell.setAttribute('aria-label', '공개 제출내역 / Google 로그인');
const loginBar = el('div', undefined, 'ace-login');
const identity = el('span', '로그인 상태 확인 중', 'ace-note');
const loginActions = el('div', undefined, 'ace-flex');
const loginButton = button('Google 로그인', login);
loginButton.disabled = true;
const logoutButton = button('로그아웃', logout);
logoutButton.hidden = true;
loginActions.append(loginButton, logoutButton);
loginBar.append(identity, loginActions);
const publicNotice = el('p', '제출내역은 로그인 없이 누구나 볼 수 있습니다. 제출·수정은 Google 로그인이 필요합니다.', 'ace-note');
const connectionStatus = el('p', '클라우드 연결 확인 중. 서버 제출은 아직 차단되어 있습니다.', 'ace-note');
connectionStatus.setAttribute('role', 'status');
connectionStatus.setAttribute('aria-live', 'polite');
const tabs = el('div', undefined, 'ace-tabs');
tabs.setAttribute('role', 'tablist');
const writeTab = button('작성', () => switchTab('write'));
const historyTab = button('제출내역', () => switchTab('history'));
for (const tab of [writeTab, historyTab]) tab.setAttribute('role', 'tab');
tabs.append(writeTab, historyTab);
shell.append(loginBar, publicNotice, connectionStatus, tabs);
document.querySelector('header')?.after(shell);
const queryPanel = el('section', undefined, 'ace-cloud');
queryPanel.hidden = true;
queryPanel.setAttribute('aria-label', '공개 제출내역');
queryPanel.append(el('h2', '제출내역'));
const filters = el('div', undefined, 'ace-flex');
const queryDate = el('input');
queryDate.type = 'date';
queryDate.min = '1900-01-01';
queryDate.max = '2199-12-31';
queryDate.value = localToday();
const queryAuthor = selectAuthor();
const searchButton = button('조회 / 새로고침', queryReports);
filters.append(field('보고일 (비우면 전체 날짜)', queryDate), field('작성자', queryAuthor), searchButton);
const queryStatus = el('p', '조회하면 공개 제출내역을 서버에서 가져옵니다.', 'ace-note');
queryStatus.setAttribute('role', 'status');
const results = el('div');
queryPanel.append(filters, queryStatus, results);
if (form) form.after(queryPanel);
else document.querySelector('main')?.append(queryPanel);
const newButton = button('새 보고서', newReport, '');
form?.querySelector('.actions')?.append(newButton);
const cloudDraftNote = el('p', '기기 자동 저장과 서버 제출은 별개입니다. 제출한 보고서는 누구나 볼 수 있습니다.', 'ace-note');
form?.append(cloudDraftNote);
let sdk, auth, db, user = null;
let cloudReady = false, authKnown = false, authBusy = false, submitting = false, querying = false;
let epoch = 0, querySerial = 0, currentTab = 'write';
let reportRows = [];
const submittedIds = new Set();
const ownEmail = u => typeof u?.email === 'string' ? u.email.toLowerCase() : '';
const verifiedGoogle = u => u?.emailVerified === true && Array.isArray(u.providerData) && u.providerData.some(provider => provider.providerId === 'google.com');
const isAdmin = () => user?.emailVerified === true && ownEmail(user) === OWNER;
const canRead = () => cloudReady && !!db;
const canWrite = () => canRead() && authKnown && !!auth && verifiedGoogle(user);
const canModify = record => canWrite() && (record.uid === user.uid || isAdmin());
const sameSession = (version, uid) => epoch === version && authKnown && user?.uid === uid;
function draftApi() {
  const api = window.aceDailyForm;
  if (!api || !['getDraft', 'loadDraft', 'reset'].every(key => typeof api[key] === 'function')) throw Error('양식 연결이 준비되지 않았습니다. 페이지를 새로고침해 주세요.');
  return api;
}
function status(node, text, error = false) {
  node.textContent = text;
  node.classList.toggle('ace-error', error);
}
function message(error) {
  const code = String(error?.code || '').replace(/^(auth|firestore)\//, '');
  const messages = {
    'unauthorized-domain': '이 도메인은 Google 로그인 허용 목록에 없습니다. 관리자에게 도메인 등록을 요청해 주세요.',
    'operation-not-allowed': 'Firebase에서 Google 로그인이 활성화되지 않았습니다.',
    'permission-denied': '서버 권한이 거부되었습니다. 공개 조회 설정 또는 보고서 소유권을 확인해 주세요.',
    'popup-blocked': '로그인 팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 로그인해 주세요.',
    'popup-closed-by-user': '로그인을 취소했습니다.',
    'cancelled-popup-request': '이전 로그인 창이 취소되었습니다. 열린 로그인 창을 확인해 주세요.',
    'network-request-failed': '네트워크에 연결할 수 없습니다. 연결 후 다시 시도해 주세요.',
    'unavailable': '서버에 연결할 수 없습니다. 네트워크 연결 후 다시 시도해 주세요.',
    'failed-precondition': '서버 설정 또는 쿼리 조건을 확인해 주세요.',
    'unauthenticated': '로그인이 만료되었습니다. 다시 로그인해 주세요.',
    'resource-exhausted': '서버 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.'
  };
  if (messages[code]) return messages[code];
  if (code) return `Firebase 오류 (${code.replace(/[^a-z0-9-]/gi, '').slice(0, 60)}). 다시 시도해 주세요.`;
  return error instanceof Error ? error.message : '처리에 실패했습니다. 다시 시도해 주세요.';
}
function updateControls() {
  loginButton.hidden = !!user;
  loginButton.disabled = !auth || authBusy;
  logoutButton.hidden = !user;
  logoutButton.disabled = authBusy;
  // Public browsing is independent of Google auth, including auth errors.
  historyTab.disabled = false;
  searchButton.disabled = !canRead() || querying;
  if (submit) {
    let apiReady = false, saved = false;
    try { saved = submittedIds.has(draftApi().getDraft().id); apiReady = true; } catch (_) { /* public browsing still works */ }
    submit.disabled = !canWrite() || !apiReady || submitting;
    submit.textContent = submitting ? '서버 확인 중…' : saved ? '수정 제출' : '공개 제출';
  }
  // Any Google writer can choose any roster name. Auth events never alter the draft.
  const author = $('author');
  if (author) {
    author.disabled = false;
    for (const option of author.options) option.disabled = false;
  }
  newButton.disabled = submitting;
  writeTab.setAttribute('aria-selected', String(currentTab === 'write'));
  historyTab.setAttribute('aria-selected', String(currentTab === 'history'));
  if (form) form.hidden = currentTab !== 'write';
  queryPanel.hidden = currentTab !== 'history';
  const previousLocalArchive = document.querySelector('.archive');
  if (previousLocalArchive) previousLocalArchive.hidden = currentTab === 'history';
}
function renderResults() {
  results.replaceChildren();
  for (const record of reportRows) results.append(renderReport(record));
  if (!reportRows.length && canRead() && !querying && queryStatus.textContent.startsWith('서버 조회 완료')) results.append(el('p', '조건에 맞는 제출 보고서가 없습니다.', 'empty'));
}
function switchTab(next) {
  currentTab = next;
  updateControls();
  if (next === 'history') void queryReports();
}
async function login() {
  if (!auth || authBusy) return;
  authBusy = true;
  updateControls();
  try {
    const provider = new sdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await sdk.signInWithPopup(auth, provider);
  } catch (error) { status(connectionStatus, message(error), true); }
  finally { authBusy = false; updateControls(); }
}
async function logout() {
  if (!auth || authBusy) return;
  authBusy = true;
  const version = ++epoch;
  authKnown = false;
  submitting = false;
  submittedIds.clear();
  if ($('status')) $('status').textContent = '';
  updateControls();
  renderResults();
  try { await sdk.signOut(auth); }
  catch (error) {
    if (epoch === version) handleAuth(auth.currentUser);
    status(connectionStatus, '로그아웃 실패: ' + message(error), true);
  } finally { authBusy = false; updateControls(); }
}
function handleAuth(nextUser) {
  ++epoch;
  user = nextUser;
  authKnown = true;
  submitting = false;
  submittedIds.clear();
  if ($('status')) $('status').textContent = '';
  cloudDraftNote.textContent = '기기 자동 저장과 서버 제출은 별개입니다. 제출한 보고서는 누구나 볼 수 있습니다.';
  identity.textContent = nextUser ? `${nextUser.displayName || 'Google 사용자'} · ${ownEmail(nextUser)}${isAdmin() ? ' · 관리자' : ''}` : '로그아웃 상태 · 공개 제출내역 조회 가능';
  status(connectionStatus, nextUser ? verifiedGoogle(nextUser) ? 'Google 로그인 완료 · 작성자를 선택해 공개 제출할 수 있습니다.' : '이메일이 확인된 Google 계정으로 로그인해야 제출할 수 있습니다. 공개 조회는 가능합니다.' : '공개 제출내역은 로그인 없이 조회할 수 있습니다. 제출하려면 Google 로그인해 주세요.');
  // Preserve public data, filters, active tab, and in-flight public reads on auth changes.
  renderResults();
  updateControls();
}
function newReport() {
  if (submitting) return;
  try {
    const api = draftApi(), old = api.getDraft();
    if ([...CORE, 'outcome', 'text'].some(key => String(old[key] || '').trim()) && !window.confirm('새 보고서를 작성할까요? 현재 작성 중 내용은 바뀝니다.')) return;
    api.reset();
    if ($('status')) $('status').textContent = '새 보고서입니다. 아직 서버에 제출되지 않았습니다.';
    cloudDraftNote.textContent = '기기 자동 저장과 서버 제출은 별개입니다. 제출한 보고서는 누구나 볼 수 있습니다.';
    updateControls();
    $('who')?.focus();
  } catch (error) { if ($('status')) $('status').textContent = message(error); }
}
async function submitReport(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (submitting) return;
  const output = $('status') || connectionStatus;
  if (!canWrite()) { status(output, '제출하려면 이메일이 확인된 Google 계정으로 로그인해 주세요.', true); return; }
  const version = epoch, actor = user, admin = isAdmin();
  let draft, content;
  try { draft = draftApi().getDraft(); content = validateCloudDraft(draft); }
  catch (error) { status(output, message(error), true); return; }
  submitting = true;
  updateControls();
  status(output, '서버에 공개 제출하고 있습니다. 확인이 끝날 때까지 기다려 주세요.');
  const ref = sdk.doc(db, 'dailyReports', draft.id);
  let committed = false;
  try {
    const expected = await sdk.runTransaction(db, async tx => {
      const existing = await tx.get(ref);
      if (!sameSession(version, actor.uid) || !canWrite()) throw Error('로그인 상태가 변경되었습니다.');
      const previous = existing.exists() ? existing.data() : null;
      if (previous && previous.uid !== actor.uid && !admin) throw Error('다른 사용자의 보고서는 수정할 수 없습니다. 새 보고서를 작성해 주세요.');
      if (previous && (typeof previous.uid !== 'string' || typeof previous.createdAt?.toDate !== 'function')) throw Error('기존 보고서 형식이 올바르지 않아 수정하지 않았습니다.');
      const data = {
        schemaVersion: 1, uid: previous ? previous.uid : actor.uid, ...content,
        createdAt: previous ? previous.createdAt : sdk.serverTimestamp(), updatedAt: sdk.serverTimestamp()
      };
      // Exact schema, no email or local-only metadata. Server rules enforce real UID ownership.
      tx.set(ref, data);
      return { uid: data.uid, ...content };
    });
    committed = true;
    if (!sameSession(version, actor.uid)) return;
    const verified = await sdk.getDocFromServer(ref);
    if (!sameSession(version, actor.uid)) return;
    const saved = verified.exists() ? verified.data() : null;
    if (!saved || saved.schemaVersion !== 1 || typeof saved.createdAt?.toDate !== 'function' || typeof saved.updatedAt?.toDate !== 'function' || !Object.entries(expected).every(([key, value]) => saved[key] === value)) throw Error('서버 재확인 내용이 일치하지 않습니다. 제출내역을 새로 조회해 주세요.');
    submittedIds.add(draft.id);
    status(output, `서버 공개 제출 확인 완료 · ${content.date} ${content.author} · ${timestampText(saved.updatedAt)}`);
    // Do not replace the local draft after asynchronous writes.
    cloudDraftNote.textContent = `최근 서버 확인: ${content.date} ${content.author} · ID ${draft.id}. 이후 변경한 내용은 별도로 제출해야 반영됩니다.`;
    if (currentTab === 'history') void queryReports();
  } catch (error) {
    if (sameSession(version, actor.uid)) status(output, (committed ? '서버 쓰기 응답 후 재확인에 실패했습니다. 같은 ID로 다시 제출하거나 제출내역을 조회해 주세요. ' : '제출 실패 · 작성 중 내용은 유지됩니다. ') + message(error), true);
  } finally {
    if (sameSession(version, actor.uid)) { submitting = false; updateControls(); }
  }
}
function timestampText(value) {
  try { const date = value?.toDate?.(); return date && Number.isFinite(date.getTime()) ? date.toLocaleString('ko-KR') : '시간 확인 불가'; }
  catch (_) { return '시간 확인 불가'; }
}
function timeNumber(value) { try { return value?.toMillis?.() || 0; } catch (_) { return 0; } }
async function queryReports() {
  if (!canRead()) { status(queryStatus, '클라우드 연결이 준비되지 않았습니다. Firebase 설정과 네트워크를 확인해 주세요.', true); return; }
  const serial = ++querySerial, date = queryDate.value, author = queryAuthor.value;
  if ((date && !validReportDate(date)) || (author && !hasAuthor(author))) {
    querying = false; reportRows = []; results.replaceChildren();
    status(queryStatus, '조회 날짜와 작성자를 확인해 주세요.', true); updateControls(); return;
  }
  querying = true;
  reportRows = [];
  results.replaceChildren();
  updateControls();
  status(queryStatus, '서버에서 공개 제출내역 조회 중…');
  try {
    const conditions = [];
    if (date) conditions.push(sdk.where('date', '==', date));
    if (author) conditions.push(sdk.where('author', '==', author));
    const maximum = !date && !author ? 200 : 500;
    if (!date && !author) conditions.push(sdk.orderBy('date', 'desc'));
    conditions.push(sdk.limit(maximum));
    const response = await sdk.getDocsFromServer(sdk.query(sdk.collection(db, 'dailyReports'), ...conditions));
    // Auth changes do not invalidate public responses. Only a newer query does.
    if (serial !== querySerial || !canRead()) return;
    reportRows = response.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    reportRows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || timeNumber(b.updatedAt) - timeNumber(a.updatedAt));
    const note = !date && !author ? '전체 날짜 중 보고일 기준 최신 최대 200건' : '선택한 날짜 / 작성자 조건';
    status(queryStatus, `서버 조회 완료 · ${reportRows.length}건 · ${note}${reportRows.length === maximum ? ' · 한도에 도달했습니다. 날짜나 작성자를 좁혀 주세요.' : ''}`);
  } catch (error) {
    if (serial === querySerial) { reportRows = []; status(queryStatus, '공개 조회 실패 · ' + message(error), true); }
  } finally {
    if (serial === querySerial) { querying = false; renderResults(); updateControls(); }
  }
}
function renderReport(record) {
  const row = el('article', undefined, 'ace-item');
  const head = el('div', undefined, 'row-head');
  head.append(el('h3', `${record.date || ''} · ${record.author || ''} ${hasAuthor(record.author) ? ROSTER[record.author] : ''}`));
  const actions = el('div', undefined, 'row-actions');
  // Rebuilt on auth changes. Public listings never show submitter email or raw UID.
  if (canModify(record)) {
    const version = epoch, uid = user.uid;
    submittedIds.add(record.id);
    actions.append(button('수정', () => {
      if (!sameSession(version, uid) || !canModify(record)) return;
      try {
        const api = draftApi(), old = api.getDraft();
        if ([...CORE, 'outcome', 'text'].some(key => String(old[key] || '').trim()) && !window.confirm('현재 작성 중 내용을 서버 보고서로 바꿀까요?')) return;
        const createdAt = record.createdAt?.toDate?.();
        if (!createdAt || !Number.isFinite(createdAt.getTime())) throw Error('서버 보고서 생성시각을 확인할 수 없습니다.');
        api.loadDraft({
          id: record.id, date: record.date, author: record.author,
          ...Object.fromEntries([...CORE, 'outcome', 'text'].map(key => [key, typeof record[key] === 'string' ? record[key] : ''])),
          manualText: true, isExample: false, createdAt: createdAt.toISOString(), updatedAt: new Date().toISOString()
        });
        switchTab('write');
        if ($('status')) $('status').textContent = '서버 보고서를 불러왔습니다. 변경 후 수정 제출을 눌러 주세요.';
        $('who')?.focus();
      } catch (error) { status(queryStatus, message(error), true); }
    }));
    actions.append(button('삭제', async event => {
      const target = event.currentTarget;
      if (!sameSession(version, uid) || !canModify(record) || target.disabled) return;
      if (!window.confirm(`${record.date} ${record.author} 보고서를 서버에서 삭제할까요? 공개 제출내역에서 제거되며 되돌릴 수 없습니다.`)) return;
      target.disabled = true;
      try {
        await sdk.deleteDoc(sdk.doc(db, 'dailyReports', record.id));
        if (!sameSession(version, uid)) return;
        submittedIds.delete(record.id);
        status(queryStatus, '서버 삭제 완료. 공개 내역을 다시 조회합니다.');
        await queryReports();
      } catch (error) {
        if (sameSession(version, uid)) { target.disabled = false; status(queryStatus, '삭제 실패 · ' + message(error), true); }
      }
    }, 'small danger'));
  }
  head.append(actions);
  const details = el('details');
  details.append(el('summary', '육하원칙 / 결과 보기'));
  const dl = el('dl');
  for (const [key, label] of [['who', '누가'], ['when', '언제'], ['where', '어디서'], ['what', '무엇을'], ['how', '어떻게'], ['why', '왜'], ['outcome', '결과']]) dl.append(el('dt', label), el('dd', record[key] || ''));
  details.append(dl);
  row.append(head, el('p', `최초 제출 ${timestampText(record.createdAt)} · 최종 수정 ${timestampText(record.updatedAt)}`, 'ace-note'), el('div', record.text || '', 'ace-pre'), details);
  return row;
}
if (form && submit) {
  // Capture prevents an accidentally retained local submit listener from claiming cloud success.
  form.addEventListener('submit', submitReport, true);
  form.addEventListener('input', updateControls);
  $('example')?.addEventListener('click', updateControls);
}
updateControls();
async function boot() {
  try {
    const settings = window.ACE_FIREBASE, config = settings?.config;
    if (!config || typeof config !== 'object' || !['apiKey', 'authDomain', 'projectId', 'appId'].every(key => typeof config[key] === 'string' && config[key].trim())) throw Error('Firebase 설정이 없습니다. 관리자가 클라우드 설정을 연결하기 전에는 서버 제출 / 조회할 수 없습니다.');
    if (settings.ownerEmail !== undefined && settings.ownerEmail !== OWNER) throw Error('소유자 설정이 올바르지 않습니다.');
    if (typeof settings.sdkBase !== 'string' || !settings.sdkBase.trim()) throw Error('Firebase SDK 주소 설정이 없습니다.');
    const base = new URL(settings.sdkBase.replace(/\/+$/, '') + '/', window.location.href);
    if ((base.protocol !== 'https:' && base.origin !== window.location.origin) || base.search || base.hash || base.username || base.password) throw Error('Firebase SDK 주소가 올바르지 않습니다.');
    const [appSdk, firestoreSdk] = await Promise.all([
      import(base.href + 'firebase-app.js'), import(base.href + 'firebase-firestore.js')
    ]);
    sdk = { ...firestoreSdk };
    const appName = 'ace-daily-cloud';
    const existing = appSdk.getApps().find(app => app.name === appName);
    if (existing && ['apiKey', 'authDomain', 'projectId', 'appId'].some(key => existing.options[key] !== config[key])) throw Error('다른 Firebase 프로젝트가 연결되어 있습니다. 새로고침해 주세요.');
    const app = existing || appSdk.initializeApp(config, appName);
    db = sdk.getFirestore(app);
    cloudReady = true;
    status(connectionStatus, '클라우드 연결 완료 · 제출내역은 로그인 없이 누구나 조회할 수 있습니다.');
    updateControls();
    if (currentTab === 'history') void queryReports();
    // Google auth SDK failures must never prevent public Firestore reads.
    try {
      const authSdk = await import(base.href + 'firebase-auth.js');
      sdk = { ...sdk, ...authSdk };
      auth = sdk.getAuth(app);
      sdk.onAuthStateChanged(auth, handleAuth, error => {
        ++epoch; user = null; authKnown = false; submitting = false; submittedIds.clear();
        identity.textContent = 'Google 로그인 상태 확인 실패 · 공개 조회 가능';
        if ($('status')) $('status').textContent = '';
        status(connectionStatus, message(error), true);
        renderResults(); updateControls();
      });
      updateControls();
    } catch (error) {
      auth = null; user = null; authKnown = false;
      identity.textContent = 'Google 로그인 연결 실패 · 공개 조회 가능';
      status(connectionStatus, 'Google 로그인 연결 실패 · ' + message(error), true);
      renderResults(); updateControls();
    }
  } catch (error) {
    cloudReady = false;
    identity.textContent = '클라우드 연결 안 됨';
    status(connectionStatus, '클라우드 연결 차단 · ' + message(error), true);
    updateControls();
  }
}
void boot();
