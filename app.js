// ============================================================
// 晓梦生小手机 - 核心逻辑
// ============================================================
const qs = (s, el) => (el || document).querySelector(s)
const qsa = (s, el) => Array.from((el || document).querySelectorAll(s))
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v) }catch(e){ return d } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) },
  raw(k){ return localStorage.getItem(k) },
  rawSet(k, v){ localStorage.setItem(k, v) },
  rawDel(k){ localStorage.removeItem(k) }
}
const uid = p => (p||'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6)
const now = () => Date.now()
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))

// ============ 应用注册表 ============
const APPS = [
  { id:'wechat',    name:'微信',    icon:'微', cls:'icon-wechat',    tpl:'tpl-wechat',   dock:true },
  { id:'music',     name:'网易云音乐',icon:'音', cls:'icon-music',     tpl:'tpl-music',    dock:true },
  { id:'tavern',    name:'线下',    icon:'下', cls:'icon-tavern',    tpl:'tpl-tavern',   dock:true },
  { id:'settings',  name:'设置',    icon:'设', cls:'icon-settings',  tpl:'tpl-settings', dock:true },
  { id:'character', name:'角色设定',icon:'角', cls:'icon-character', tpl:'tpl-character' },
  { id:'worldbook', name:'世界书',  icon:'书', cls:'icon-worldbook', tpl:'tpl-worldbook' },
  { id:'style',     name:'文风',    icon:'风', cls:'icon-style',     tpl:'tpl-style' },
  { id:'couple',    name:'情侣空间',icon:'情', cls:'icon-couple',    tpl:'tpl-couple' },
  { id:'checkphone',name:'查看手机',icon:'查', cls:'icon-checkphone',tpl:'tpl-checkphone' },
  { id:'reading',   name:'共读',    icon:'读', cls:'icon-reading',   tpl:'tpl-reading' },
  { id:'shop',      name:'商城',    icon:'商', cls:'icon-shop',      tpl:'tpl-shop' },
  { id:'forum',     name:'论坛',    icon:'坛', cls:'icon-forum',     tpl:'tpl-forum' },
  { id:'photos',    name:'相册',    icon:'照', cls:'icon-photos',    tpl:null, placeholder:true },
  { id:'notes',     name:'便签',    icon:'签', cls:'icon-notes',     tpl:null, placeholder:true },
  { id:'clock',     name:'时钟',    icon:'钟', cls:'icon-clock',     tpl:null, placeholder:true },
  { id:'phone',     name:'电话',    icon:'话', cls:'icon-phone',     tpl:null, placeholder:true },
  { id:'mail',      name:'邮件',    icon:'邮', cls:'icon-mail',      tpl:null, placeholder:true },
  { id:'camera',    name:'相机',    icon:'拍', cls:'icon-camera',    tpl:null, placeholder:true },
]
const appById = id => APPS.find(a => a.id === id)
let appStack = []

// ============ 核心数据层 ============
function getProfiles(){ return store.get('profiles', []) }
function setProfiles(v){ store.set('profiles', v) }
function getActiveProfile(){ return store.raw('activeProfile') }
function setActiveProfile(id){ store.rawSet('activeProfile', id) }

function getCharacters(){ return store.get('characters', []) }
function setCharacters(v){ store.set('characters', dedupById(v)) }
function getActiveChar(){ return store.raw('activeChar') }
function setActiveChar(id){ store.rawSet('activeChar', id) }
function getChar(id){ return getCharacters().find(c => c.id === id) }
function getCharByName(name){ return getCharacters().find(c => c.name === name) }

function dedupById(arr){
  const seen = new Set(); return (arr||[]).filter(x => { if(!x || !x.id || seen.has(x.id)) return false; seen.add(x.id); return true })
}

function getWorldbooks(){ return store.get('worldbooks', []) }
function setWorldbooks(v){ store.set('worldbooks', v) }

function getStyles(){ return store.get('styles', []) }
function setStyles(v){ store.set('styles', v) }

function getChats(){ return store.get('chats', []) }
function setChats(v){ store.set('chats', v) }
function getMsgs(chatId){ return store.get('msg_' + chatId, []) }
function setMsgs(chatId, v){ store.set('msg_' + chatId, v) }

function getMoments(){ return store.get('moments', []) }
function setMoments(v){ store.set('moments', v) }
function getFavorites(){ return store.get('favorites', []) }
function setFavorites(v){ store.set('favorites', v) }
function getStickers(){ return store.get('stickers', []) }
function setStickers(v){ store.set('stickers', v) }

function getDiary(){ return store.get('coupleDiary', []) }
function setDiary(v){ store.set('coupleDiary', v) }
function getTasks(){ return store.get('coupleTasks', []) }
function setTasks(v){ store.set('coupleTasks', v) }
function getPoints(){ return store.get('couplePoints', 0) }
function setPoints(v){ store.set('couplePoints', v) }

// 互通记忆
function memory(key){ return store.get('memory_' + key, null) }
function memorySet(key, v){ store.set('memory_' + key, v) }

// 当前角色上下文（用于各模块互通）
function currentChar(){ return getChar(getActiveChar()) || getCharacters()[0] || null }
function currentProfile(){ return getProfiles().find(p => p.id === getActiveProfile()) || getProfiles()[0] || null }

// 角色 AI 上下文组装（含防串味）
function buildCharContext(char){
  if(!char) return ''
  const wbs = getWorldbooks().filter(w => (char.worldbooks||[]).includes(w.id) || (char.residentWorldbooks||[]).includes(w.id))
  const resident = wbs.filter(w => (char.residentWorldbooks||[]).includes(w.id))
  const others = getCharacters().filter(c => c.id !== char.id)
  const guard = char.guard || {}
  const parts = []
  parts.push(`【你正在扮演】${char.name}`)
  if(char.persona) parts.push(`【人设】${char.persona}`)
  if(guard.speechStyle) parts.push(`【口吻】${guard.speechStyle}`)
  if(guard.forbiddenTopics && guard.forbiddenTopics.length) parts.push(`【绝对禁止提及】${guard.forbiddenTopics.join('、')}`)
  if(guard.negativePrompts) parts.push(`【注意避免】${guard.negativePrompts}`)
  if(resident.length) parts.push(`【常驻世界书】${resident.map(w => w.content).join('\n')}`)
  if(others.length) parts.push(`【防串味】你只是 ${char.name}，与以下角色无关联，不要模仿或带入他们：${others.map(o => o.name).join('、')}`)
  return parts.join('\n')
}

// ============ 状态栏 ============
function updateClock(){
  const t = new Date()
  qs('#statusTime').textContent = String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0')
}

// ============ 主屏幕 ============
function renderHome(){
  const dock = APPS.filter(a => a.dock)
  const grid = APPS.filter(a => !a.dock)
  const pages = [[],[]]
  grid.forEach((a,i) => pages[Math.floor(i/12) % 2].push(a))
  qs('#dockApps').innerHTML = dock.map(iconHTML).join('')
  qs('#appGridPage0').innerHTML = pages[0].map(iconHTML).join('')
  qs('#appGridPage1').innerHTML = pages[1].map(iconHTML).join('')
  qsa('.app-icon').forEach(el => el.addEventListener('click', () => openApp(el.dataset.app)))
}
function iconHTML(a){
  return `<button class="app-icon" data-app="${a.id}"><div class="icon ${a.cls}"><span>${a.icon}</span></div><span class="name">${esc(a.name)}</span></button>`
}
function bindPageIndicator(){
  const pages = qs('#appPages')
  const dots = qsa('#pageIndicator .dot')
  pages.addEventListener('scroll', () => {
    const idx = Math.round(pages.scrollLeft / pages.clientWidth)
    dots.forEach((d,i) => d.classList.toggle('active', i === idx))
  })
}

// ============ 导航 ============
function openApp(id){
  const app = appById(id)
  if(!app) return
  if(app.placeholder){ toast(`「${app.name}」开发中`); return }
  appStack = [id]
  mountApp(id)
}
function pushApp(id){
  if(SUBPAGES[id]){ renderSubPage(id); appStack.push(id); return }
  const app = appById(id)
  if(!app) return
  appStack.push(id)
  mountApp(id)
}
function mountApp(id){
  const app = appById(id)
  const container = qs('#appContainer')
  container.innerHTML = ''
  container.appendChild(document.getElementById(app.tpl).content.cloneNode(true))
  container.classList.add('open')
  renderApp(id)
}
function closeApp(){
  qs('#appContainer').classList.remove('open')
  setTimeout(() => { qs('#appContainer').innerHTML = '' }, 340)
  appStack = []
}
function goBack(){
  if(appStack.length > 1){ appStack.pop(); const id = appStack[appStack.length-1]; if(SUBPAGES[id]) renderSubPage(id); else mountApp(id) }
  else closeApp()
}
function renderApp(id){
  switch(id){
    case 'wechat': renderWechat(); break
    case 'settings': renderSettings(); break
    case 'character': renderCharacter(); break
    case 'worldbook': renderWorldbook(); break
    case 'style': renderStyle(); break
    case 'music': renderMusic(); break
    case 'couple': renderCouple(); break
    case 'checkphone': renderCheckPhone(); break
    case 'shop': renderShop(); break
    case 'tavern': renderTavern(); break
    case 'reading': renderReading(); break
    case 'forum': renderForum(); break
  }
  bindHeader(id)
}
function bindHeader(id){
  qsa('[data-action]').forEach(btn => {
    const action = btn.dataset.action
    btn.onclick = () => {
      if(action === 'back') goBack()
      else headerAction(id, action)
    }
  })
}
function headerAction(id, action){
  if(id === 'wechat' && action === 'add'){ showModal({title:'添加', body:addMenuBody(), actions:[{label:'关闭', cls:'btn btn-block'}]}) }
  if(id === 'character' && action === 'add'){ charForm(null) }
  if(id === 'worldbook' && action === 'add'){ wbForm(null) }
  if(id === 'style' && action === 'add'){ styleForm(null) }
  if(id === 'music' && action === 'search'){ showModal({title:'联网搜索', body:`<div class="field"><input id="searchQuery" placeholder="输入歌名/歌手"></div>`, actions:[{label:'搜索', cls:'btn btn-block', onOk(){ const qv = qs('#searchQuery').value.trim(); if(qv){ musicSearch(qv) } }}]}) }
  if(id === 'shop' && action === 'add'){ qs('#shopFileInput') && qs('#shopFileInput').click() }
  if(id === 'reading' && action === 'add'){ showModal({title:'添加', body:readingAddBody(), actions:[{label:'关闭', cls:'btn btn-block'}]}) }
  if(id === 'forum' && action === 'ask'){ askQuestion() }
  if(id === 'checkphone'){}
}

// ============ 微信 ============
function ensureChats(){
  const chars = getCharacters()
  if(getChats().length === 0){
    const chats = chars.map(c => ({
      id: c.id, type:'single', name:c.name, avatar:(c.name||'?')[0], color:'icon-character', unread:0,
      last:'开始聊天吧', time: now()
    }))
    if(chars.length >= 2){
      chats.push({ id:'group_friends', type:'group', name:'好友群', avatar:'群', color:'icon-style', unread:0, last:'欢迎来到群聊', time:now(), members: chars.map(c => c.id) })
    }
    setChats(chats)
  } else {
    const chats = getChats()
    chars.forEach(c => { if(!chats.find(ch => ch.id === c.id)) chats.push({ id:c.id, type:'single', name:c.name, avatar:(c.name||'?')[0], color:'icon-character', unread:0, last:'开始聊天吧', time:now() }) })
    setChats(chats)
  }
}

function renderWechat(){
  ensureChats()
  qsa('.wechat-tabs .tab').forEach(tab => {
    tab.onclick = () => {
      qsa('.wechat-tabs .tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      qsa('.tab-panel').forEach(p => p.classList.remove('active'))
      qs('#panel-' + tab.dataset.tab).classList.add('active')
      if(tab.dataset.tab === 'me') renderMePanel()
    }
  })
  renderChatsPanel()
  renderContactsPanel()
  renderDiscoverPanel()
  renderMePanel()
}

function renderChatsPanel(){
  const el = qs('#panel-chats')
  const chats = getChats()
  el.innerHTML = chats.map(c => {
    const msgs = getMsgs(c.id)
    const last = msgs[msgs.length-1]
    const lastText = last ? (last.type === 'text' ? last.text : '[特殊消息]') : c.last
    return `<div class="chat-row" data-chat="${c.id}">
      <div class="avatar ${c.color}">${esc(c.avatar)}</div>
      <div class="chat-info">
        <div class="chat-name-row"><span class="chat-name">${esc(c.name)}</span><span class="chat-time">${timeAgo(c.time)}</span></div>
        <div class="chat-last">${esc(lastText||'')}</div>
      </div>
      ${c.unread ? `<div class="unread">${c.unread}</div>` : ''}
    </div>`
  }).join('') || '<div class="empty">暂无会话</div>'
  qsa('.chat-row', el).forEach(r => r.onclick = () => openChatDetail(r.dataset.chat))
}

function renderContactsPanel(){
  const el = qs('#panel-contacts')
  const chars = getCharacters()
  const group = getChats().filter(c => c.type === 'group')
  let html = `<div class="contact-add" id="addContactBtn"><div class="avatar">+</div><div style="flex:1;font-size:15px">添加新的 char 人设</div></div>`
  html += group.map(g => `<div class="chat-row" data-chat="${g.id}"><div class="avatar ${g.color}">${esc(g.avatar)}</div><div class="chat-info"><span class="chat-name">${esc(g.name)}</span></div></div>`).join('')
  html += `<div class="contact-letter">角色</div>`
  html += chars.map(c => `<div class="chat-row" data-chat="${c.id}"><div class="avatar icon-character">${esc((c.name||'?')[0])}</div><div class="chat-info"><span class="chat-name">${esc(c.name)}</span></div></div>`).join('')
  el.innerHTML = html
  const addBtn = qs('#addContactBtn')
  if(addBtn) addBtn.onclick = () => charForm(null)
  qsa('.chat-row', el).forEach(r => r.onclick = () => openChatDetail(r.dataset.chat))
}

function renderDiscoverPanel(){
  const el = qs('#panel-discover')
  el.innerHTML = `
    <div class="section-title">发现</div>
    <div class="list-group">
      <div class="list-item" data-nav="moments"><div class="item-icon icon-couple">朋</div><div class="item-body"><div class="item-title">朋友圈</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="favorites"><div class="item-icon icon-style">藏</div><div class="item-body"><div class="item-title">收藏</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="stickers"><div class="item-icon icon-photos">表</div><div class="item-body"><div class="item-title">表情包</div></div><span class="chevron">›</span></div>
    </div>
    <div class="section-title">小程序</div>
    <div class="list-group">
      <div class="list-item" data-nav="mini-music"><div class="item-icon icon-music">音</div><div class="item-body"><div class="item-title">网易云音乐</div><div class="item-sub">听歌、共听</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="mini-couple"><div class="item-icon icon-couple">情</div><div class="item-body"><div class="item-title">情侣空间</div><div class="item-sub">日记、任务、道具</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="mini-tavern"><div class="item-icon icon-tavern">馆</div><div class="item-body"><div class="item-title">酒馆</div><div class="item-sub">线下模式</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="mini-shop"><div class="item-icon icon-shop">商</div><div class="item-body"><div class="item-title">商城</div><div class="item-sub">导入商品</div></div><span class="chevron">›</span></div>
    </div>
  `
  qsa('[data-nav]', el).forEach(item => item.onclick = () => {
    const nav = item.dataset.nav
    if(nav === 'moments') pushApp('moments')
    else if(nav === 'favorites') pushApp('favorites')
    else if(nav === 'stickers') pushApp('stickers')
    else if(nav === 'mini-music') openApp('music')
    else if(nav === 'mini-couple') openApp('couple')
    else if(nav === 'mini-tavern') openApp('tavern')
    else if(nav === 'mini-shop') openApp('shop')
  })
}

function renderMePanel(){
  const el = qs('#panel-me')
  const p = currentProfile() || {}
  el.innerHTML = `
    <div class="list-item" id="meProfileEdit">
      <div class="avatar icon-character" style="width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:22px">${esc((p.name||'晓')[0])}</div>
      <div class="item-body"><div class="item-title" style="font-size:17px">${esc(p.name||'晓梦生')}</div><div class="item-sub">微信号：${esc(p.wechatId||'xm-sheng')}</div></div>
      <span class="chevron">›</span>
    </div>
    <div class="list-group" style="margin-top:14px">
      <div class="list-item" data-me="favorites"><div class="item-body"><div class="item-title">收藏</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-me="moments"><div class="item-body"><div class="item-title">朋友圈</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-me="settings"><div class="item-body"><div class="item-title">设置</div></div><span class="chevron">›</span></div>
    </div>
  `
  const edit = qs('#meProfileEdit')
  if(edit) edit.onclick = () => editProfile()
  qsa('[data-me]', el).forEach(item => item.onclick = () => {
    const m = item.dataset.me
    if(m === 'favorites') pushApp('favorites')
    else if(m === 'moments') pushApp('moments')
    else if(m === 'settings') openApp('settings')
  })
}

function editProfile(){
  const p = currentProfile() || {}
  showModal({
    title:'编辑资料',
    body:`
      <div class="field"><label>名称</label><input id="epName" value="${esc(p.name||'')}"></div>
      <div class="field"><label>微信号</label><input id="epWx" value="${esc(p.wechatId||'')}"></div>
      <div class="field"><label>个性签名</label><input id="epSign" value="${esc(p.sign||'')}"></div>
    `,
    actions:[
      {label:'取消', cls:'btn btn-secondary'},
      {label:'保存', cls:'btn', onOk(){
        const profiles = getProfiles()
        const idx = profiles.findIndex(x => x.id === (p.id))
        const obj = { ...p, name: qs('#epName').value.trim(), wechatId: qs('#epWx').value.trim(), sign: qs('#epSign').value.trim() }
        if(idx >= 0){ profiles[idx] = obj; setProfiles(profiles) }
        else { profiles.push({ ...obj, id: uid('p') }); setProfiles(profiles); setActiveProfile(obj.id) }
        renderMePanel()
        closeModal()
      }}
    ]
  })
}

// ============ 聊天详情 ============
let activeChatId = null
function openChatDetail(chatId){
  activeChatId = chatId
  const chat = getChats().find(c => c.id === chatId) || { name:'联系人', avatar:'?', color:'icon-character' }
  const container = qs('#appContainer')
  container.innerHTML = ''
  container.appendChild(document.getElementById('tpl-chat-detail').content.cloneNode(true))
  qs('#chatDetailName').textContent = chat.name
  const char = getCharByName(chat.name)
  const readNoReply = char && char.readNoReply
  qs('#chatDetailSub').textContent = readNoReply ? '在线 · 已读不回' : '在线'
  // 角色心声状态栏
  if(char && char.mind){ qs('#chatMindBar').classList.add('show'); qs('#chatMindBar').textContent = char.mind }
  appStack.push('chat-detail')
  renderChatDetail()
}
function renderChatDetail(){
  const chatId = activeChatId
  const chat = getChats().find(c => c.id === chatId) || { name:'联系人', avatar:'?' }
  const char = getCharByName(chat.name)
  const msgs = getMsgs(chatId)
  const list = qs('#detailMessageList')
  list.innerHTML = msgs.map(m => renderMessage(m, char)).join('')
  list.scrollTop = list.scrollHeight
  bindMessageTools()
  // 输入
  const input = qs('#detailChatInput')
  input.onkeydown = e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendDetailMessage() } }
  qsa('[data-action]').forEach(btn => {
    if(btn.dataset.action === 'voice'){ btn.onmousedown = e => { e.preventDefault(); sendVoice() }; btn.ontouchstart = e => { e.preventDefault(); sendVoice() } }
    if(btn.dataset.action === 'emoji') btn.onclick = () => toggleStickerPanel()
    if(btn.dataset.action === 'plus') btn.onclick = () => toggleActionPanel()
    if(btn.dataset.action === 'more') btn.onclick = () => showChatSettings(chatId)
    if(btn.dataset.action === 'back') btn.onclick = () => goBack()
  })
}
function renderMessage(m, char){
  const cls = m.sender === 'me' ? 'me' : 'char'
  const avatar = m.sender === 'me' ? '' : (char ? (char.name||'?')[0] : '?')
  // 无需气泡包裹的独立卡片类型
  if(m.type === 'image' || m.type === 'sticker'){
    return `<div class="msg ${cls}" data-msg="${m.id}"><div class="avatar-s">${esc(avatar)}</div><img class="standalone-img" src="${m.dataUrl}"></div>`
  }
  if(m.type === 'redpacket'){
    return `<div class="msg ${cls}" data-msg="${m.id}"><div class="avatar-s">${esc(avatar)}</div><div class="redpacket-card"><div class="rp-icon">开</div><div class="rp-body"><div class="rp-title">${esc(m.text||'恭喜发财，大吉大利')}</div><div class="rp-sub">微信红包</div></div></div></div>`
  }
  if(m.type === 'transfer'){
    return `<div class="msg ${cls}" data-msg="${m.id}"><div class="avatar-s">${esc(avatar)}</div><div class="transfer-card"><div class="tc-left"><div class="tc-amount">¥${esc(m.text||'0.00')}</div><div class="tc-label">微信转账</div></div><div class="tc-right">已收款</div></div></div>`
  }
  if(m.type === 'call'){
    const isVideo = m.text && m.text.includes('视频')
    return `<div class="msg ${cls}" data-msg="${m.id}"><div class="avatar-s">${esc(avatar)}</div><div class="call-card"><span class="call-icon">${isVideo?'视':'话'}</span> ${esc(m.text)}</div></div>`
  }
  if(m.type === 'location'){
    return `<div class="msg ${cls}" data-msg="${m.id}"><div class="avatar-s">${esc(avatar)}</div><div class="location-card"><div class="loc-name">${esc(m.text||'位置')}</div><div class="loc-sub">位置信息</div></div></div>`
  }
  if(m.type === 'audio' || m.type === 'voice'){
    const dur = m.duration || 5
    return `<div class="msg ${cls}" data-msg="${m.id}"><div class="avatar-s">${esc(avatar)}</div><div class="voice-bubble ${cls}"><span class="voice-icon">♫</span><span class="voice-bars"><i></i><i></i><i></i></span><span class="voice-dur">${dur}″</span></div></div>`
  }
  if(m.type === 'system'){
    return `<div class="msg center"><div class="sys-msg">${esc(m.text)}</div></div>`
  }
  // 普通文本
  let body = esc(m.text)
  if(m.type === 'file') body = `<div class="file-card">文件 · ${esc(m.text)}</div>`
  return `<div class="msg ${cls}" data-msg="${m.id}"><div class="avatar-s">${esc(avatar)}</div><div class="bubble">${body}</div></div>`
}
function bindMessageTools(){
  qsa('[data-msg]', qs('#detailMessageList')).forEach(el => {
    const id = el.dataset.msg
    let pressTimer = null, startX = 0, startY = 0
    const start = (x, y) => { startX = x; startY = y; pressTimer = setTimeout(() => showMsgMenu(id, x, y), 480) }
    const cancel = () => { clearTimeout(pressTimer) }
    el.addEventListener('touchstart', e => start(e.touches[0].clientX, e.touches[0].clientY), {passive:true})
    el.addEventListener('touchend', cancel)
    el.addEventListener('touchmove', cancel)
    el.addEventListener('mousedown', e => start(e.clientX, e.clientY))
    el.addEventListener('mouseup', cancel)
    el.addEventListener('mouseleave', cancel)
    el.addEventListener('contextmenu', e => { e.preventDefault(); showMsgMenu(id, e.clientX, e.clientY) })
  })
}
function showMsgMenu(id, x, y){
  const msgs = getMsgs(activeChatId)
  const m = msgs.find(mm => mm.id === id)
  if(!m) return
  const items = []
  if(m.sender === 'me'){ items.push({label:'撤回', fn:() => recallMessage(id)}); items.push({label:'修改', fn:() => editMessage(id)}) }
  items.push({label:'收藏', fn:() => favoriteMessage(id)})
  if(m.sender === 'char') items.push({label:'重回', fn:() => regenerateMessage(id)})
  items.push({label:'删除', fn:() => recallMessage(id)})
  closeMsgMenu()
  const menu = document.createElement('div')
  menu.className = 'msg-menu'; menu.id = 'msgMenu'
  menu.style.left = Math.min(x, window.innerWidth - 120) + 'px'
  menu.style.top = Math.min(y, window.innerHeight - items.length*40 - 20) + 'px'
  menu.innerHTML = items.map(it => `<button>${it.label}</button>`).join('')
  items.forEach((it,i) => menu.children[i].onclick = () => { it.fn(); closeMsgMenu() })
  document.body.appendChild(menu)
  setTimeout(() => document.addEventListener('click', closeMsgMenu, {once:true}), 10)
}
function closeMsgMenu(){ const m = qs('#msgMenu'); if(m) m.remove() }

function addMsg(chatId, msg){
  const msgs = getMsgs(chatId)
  msgs.push({ id: uid('m'), ...msg, time: now() })
  setMsgs(chatId, msgs)
  const chats = getChats()
  const chat = chats.find(c => c.id === chatId)
  if(chat){ chat.time = now(); chat.last = msg.type === 'text' ? msg.text : '[特殊消息]'; setChats(chats) }
  renderChatDetail()
}

function sendDetailMessage(){
  const input = qs('#detailChatInput')
  const text = input.value.trim()
  if(!text) return
  input.value = ''
  addMsg(activeChatId, { sender:'me', type:'text', text })
  const chat = getChats().find(c => c.id === activeChatId)
  const char = chat ? getCharByName(chat.name) : null
  if(chat && chat.type === 'group'){ groupReply(chat) }
  else { setTimeout(() => charReply(chat, char), 700) }
}

function charReply(chat, char){
  // 显示输入中
  const list = qs('#detailMessageList')
  list.insertAdjacentHTML('beforeend', `<div class="msg char typing" id="typingMsg"><div class="avatar-s">${esc((char?.name||'?')[0])}</div><div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`)
  list.scrollTop = list.scrollHeight
  const ctx = char ? buildCharContext(char) : ''
  const replies = char ? [
    `我在听，你说。`,
    `${char.name}稍微停了一下，才回复你：「嗯，这件事我记得。」`,
    `「继续，我想知道更多。」`,
    `${char.name}没有立刻回答，像在斟酌用词。`
  ] : ['我在。']
  setTimeout(() => {
    const typing = qs('#typingMsg')
    if(typing) typing.remove()
    addMsg(activeChatId, { sender:'char', type:'text', text: replies[Math.floor(Math.random()*replies.length)], _ctx: ctx })
  }, 900)
}
function groupReply(chat){
  const members = chat.members || []
  const speaker = getChar(members[Math.floor(Math.random()*members.length)]) || getCharacters()[0]
  const list = qs('#detailMessageList')
  list.insertAdjacentHTML('beforeend', `<div class="msg char typing" id="typingMsg"><div class="avatar-s">${esc((speaker?.name||'?')[0])}</div><div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`)
  list.scrollTop = list.scrollHeight
  setTimeout(() => {
    const typing = qs('#typingMsg')
    if(typing) typing.remove()
    addMsg(activeChatId, { sender:'char', type:'text', text:`${speaker?.name||''}：大家都在呢。`, _speaker: speaker?.name })
  }, 900)
}

function recallMessage(id){
  const msgs = getMsgs(activeChatId).filter(m => m.id !== id)
  setMsgs(activeChatId, msgs)
  renderChatDetail()
}
function editMessage(id){
  const msgs = getMsgs(activeChatId)
  const m = msgs.find(x => x.id === id)
  if(!m) return
  const nt = prompt('修改消息内容：', m.text || '')
  if(nt === null) return
  m.text = nt.trim(); m.type = 'text'
  setMsgs(activeChatId, msgs)
  renderChatDetail()
}
function favoriteMessage(id){
  const msgs = getMsgs(activeChatId)
  const m = msgs.find(x => x.id === id)
  if(!m) return
  const favs = getFavorites()
  favs.unshift({ id: uid('f'), source: activeChatId, text: m.text || '[图片/语音]', time: now() })
  setFavorites(favs)
  toast('已收藏')
}
function regenerateMessage(id){
  const msgs = getMsgs(activeChatId)
  const m = msgs.find(x => x.id === id)
  if(!m) return
  const chat = getChats().find(c => c.id === activeChatId)
  const char = chat ? getCharByName(chat.name) : null
  const alts = char ? [`${char.name}换了个说法：「其实我一直在想这件事。」`, `「让我重新说，」${char.name}低声道。`, `${char.name}沉默了一瞬，重新组织语言。`] : ['重新组织了一下。']
  m.text = alts[Math.floor(Math.random()*alts.length)]
  setMsgs(activeChatId, msgs)
  renderChatDetail()
}

function sendVoice(){
  // 模拟微信「按住说话」—— 长按出现录音浮层，松开发送语音气泡
  const overlay = document.createElement('div')
  overlay.className = 'voice-recording'; overlay.id = 'voiceRec'
  overlay.innerHTML = `<div class="rec-mic">♫</div><div class="rec-tip">松开 发送</div>`
  document.body.appendChild(overlay)
  const start = Date.now()
  const release = () => {
    const dur = Math.max(1, Math.round((Date.now() - start) / 1000))
    const el = qs('#voiceRec'); if(el) el.remove()
    addMsg(activeChatId, { sender:'me', type:'voice', duration: dur, text:'' })
    document.removeEventListener('touchend', release)
    document.removeEventListener('mouseup', release)
  }
  document.addEventListener('touchend', release)
  document.addEventListener('mouseup', release)
}

// ============ 语音/视频通话悬浮层 ============
let callTimer = null
function showCallOverlay(type){
  const chat = getChats().find(c => c.id === activeChatId)
  const char = chat ? getCharByName(chat.name) : null
  const isVideo = type === 'video'
  const ov = document.createElement('div')
  ov.className = 'call-overlay'; ov.id = 'callOverlay'
  ov.innerHTML = `
    <div class="call-bg ${isVideo ? 'video-bg' : 'voice-bg'}">
      ${isVideo ? `<img class="call-avatar" src="${char?.avatar || 'wallpaper.jpg'}">` : `<div class="call-avatar-ring"><div class="call-avatar-inner">${esc((char?.name||'?')[0])}</div></div>`}
      <div class="call-name">${esc(char?.name||'联系人')}</div>
      <div class="call-status" id="callStatus">正在呼叫...</div>
      <div class="call-timer" id="callTimer" style="display:none">00:00</div>
    </div>
    <div class="call-controls">
      <button class="call-btn" data-call="mute"><span>静音</span></button>
      ${isVideo ? '<button class="call-btn" data-call="cam"><span>切换</span></button>' : ''}
      <button class="call-btn hangup" data-call="hangup"><span>挂断</span></button>
    </div>
  `
  document.body.appendChild(ov)
  qsa('[data-call]', ov).forEach(b => b.onclick = () => {
    if(b.dataset.call === 'hangup') endCall()
    else toast(b.dataset.call === 'mute' ? '已静音' : '已切换摄像头')
  })
  // 模拟接通
  setTimeout(() => {
    const status = qs('#callStatus')
    if(!status) return
    status.textContent = isVideo ? '视频通话中' : '语音通话中'
    qs('#callTimer').style.display = 'block'
    let sec = 0
    callTimer = setInterval(() => { sec++; const t = qs('#callTimer'); if(t) t.textContent = String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(sec%60).padStart(2,'0') }, 1000)
    // 对话模拟
    setTimeout(() => {
      const msgs = getMsgs(activeChatId)
      msgs.push({ id: uid('m'), sender:'char', type:'call', text: isVideo ? '视频通话 · 已接通，聊得很开心' : '语音通话 · 已接通，聊得很开心', time: now() })
      setMsgs(activeChatId, msgs)
    }, 1500)
  }, 1800)
}
function endCall(){
  if(callTimer){ clearInterval(callTimer); callTimer = null }
  const ov = qs('#callOverlay'); if(ov) ov.remove()
}

// ============ 角色心声悬浮卡 ============
function showMindCard(){
  const chat = getChats().find(c => c.id === activeChatId)
  const char = chat ? getCharByName(chat.name) : null
  closeMindCard()
  if(!char){ toast('请先配置角色'); return }
  const mind = char.mind || `${char.name} 此刻安静地看着屏幕，似乎在等你先说点什么。`
  const mood = char.mood || '平静'
  const status = char.status || (char.readNoReply ? '已读不回' : '在线')
  const inner = char.innerMonologue || mind.slice(0, 100) || `${char.name} 在心里想了很多，却没有立刻说出口。`
  const ov = document.createElement('div')
  ov.className = 'mind-card'; ov.id = 'mindCard'
  ov.innerHTML = `
    <div class="mind-head"><span class="mind-name">${esc(char.name)} 的心声</span><button class="mind-close">×</button></div>
    <div class="mind-tags"><span class="mind-chip">心情 ${esc(mood)}</span><span class="mind-chip">状态 ${esc(status)}</span></div>
    <div class="mind-text">${esc(inner)}</div>
  `
  document.body.appendChild(ov)
  qs('.mind-close', ov).onclick = closeMindCard
}
function closeMindCard(){ const m = qs('#mindCard'); if(m) m.remove() }
function toggleStickerPanel(){
  const panel = qs('#chatActionPanel')
  if(panel.style.display === 'grid'){ panel.style.display = 'none'; return }
  panel.style.display = 'grid'
  const stickers = getStickers()
  panel.innerHTML = stickers.length ? stickers.map(s => `<button class="action-item" data-src="${esc(s.link)}"><img src="${esc(s.link)}" style="width:54px;height:54px;border-radius:10px;object-fit:cover"><span>${esc(s.note)}</span></button>`).join('') : '<div style="grid-column:1/-1;text-align:center;color:var(--muted);font-size:12px">暂无表情包，请在设置/发现页导入</div>'
  qsa('.action-item[data-src]', panel).forEach(b => b.onclick = () => { addMsg(activeChatId, { sender:'me', type:'sticker', dataUrl: b.dataset.src, text:'' }); panel.style.display = 'none' })
}
function toggleActionPanel(){
  const panel = qs('#chatActionPanel')
  if(panel.style.display === 'grid'){ panel.style.display = 'none'; return }
  panel.style.display = 'grid'
  panel.innerHTML = `
    <button class="action-item" data-a="photo"><div class="ai" style="background:linear-gradient(160deg,#5e6a76,#39414a)">图</div><span>照片</span></button>
    <button class="action-item" data-a="transfer"><div class="ai" style="background:linear-gradient(160deg,#e8a23d,#8a5a12)">转</div><span>转账</span></button>
    <button class="action-item" data-a="redpacket"><div class="ai" style="background:linear-gradient(160deg,#d44a3f,#7c2a22)">包</div><span>红包</span></button>
    <button class="action-item" data-a="location"><div class="ai" style="background:linear-gradient(160deg,#7fae8f,#4d7058)">位</div><span>位置</span></button>
    <button class="action-item" data-a="voicecall"><div class="ai" style="background:linear-gradient(160deg,#8b95a3,#4d565f)">语</div><span>语音通话</span></button>
    <button class="action-item" data-a="videocall"><div class="ai" style="background:linear-gradient(160deg,#9aa1ab,#5b626b)">视</div><span>视频通话</span></button>
    <button class="action-item" data-a="sticker"><div class="ai" style="background:linear-gradient(160deg,#b0a89a,#6b6458)">表</div><span>表情包</span></button>
    <button class="action-item" data-a="mind"><div class="ai" style="background:linear-gradient(160deg,#8a7460,#4c4136)">心</div><span>角色心声</span></button>
  `
  qsa('.action-item[data-a]', panel).forEach(b => b.onclick = () => handleChatAction(b.dataset.a, panel))
}
function handleChatAction(a, panel){
  const chat = getChats().find(c => c.id === activeChatId)
  const char = chat ? getCharByName(chat.name) : null
  panel.style.display = 'none'
  if(a === 'photo'){ pickImage(dataUrl => addMsg(activeChatId, { sender:'me', type:'image', dataUrl, text:'' })) }
  else if(a === 'transfer'){ const amt = prompt('转账金额：', '88.88'); if(amt !== null){ addMsg(activeChatId, { sender:'me', type:'transfer', text: Number(amt||0).toFixed(2) }); setTimeout(() => addMsg(activeChatId, { sender:'char', type:'system', text:'对方已收款' }), 800) } }
  else if(a === 'redpacket'){ const amt = prompt('红包金额：', '66'); if(amt !== null){ addMsg(activeChatId, { sender:'me', type:'redpacket', text: (amt||'66') + '元' }); setTimeout(() => addMsg(activeChatId, { sender:'char', type:'system', text:'对方已领取你的红包' }), 900) } }
  else if(a === 'location'){ addMsg(activeChatId, { sender:'me', type:'location', text:'会展中心 · 2号门' }) }
  else if(a === 'voicecall'){ showCallOverlay('voice') }
  else if(a === 'videocall'){ showCallOverlay('video') }
  else if(a === 'sticker'){ toggleStickerPanel() }
  else if(a === 'mind'){ showMindCard() }
}
function pickImage(cb){
  const inp = document.createElement('input')
  inp.type = 'file'; inp.accept = 'image/*'
  inp.onchange = () => { const f = inp.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(f) }
  inp.click()
}

function showChatSettings(chatId){
  const chat = getChats().find(c => c.id === chatId)
  const char = chat ? getCharByName(chat.name) : null
  const wbs = getWorldbooks()
  const selected = char ? (char.worldbooks || []) : []
  const body = char ? `
    <div class="field"><label>角色备注</label><textarea id="csNote" rows="2">${esc(char.note||'')}</textarea></div>
    <div class="field"><label>角色心声（状态栏显示）</label><input id="csMind" value="${esc(char.mind||'')}"></div>
    <div class="field"><label>挂载世界书（多选）</label><div id="csWb"></div></div>
    <div class="field"><label><span class="switch" style="vertical-align:middle"><input type="checkbox" id="csReadNoReply" ${char.readNoReply?'checked':''}><span class="slider"></span></span> 开启已读不回</label></div>
    <div class="field"><label><span class="switch" style="vertical-align:middle"><input type="checkbox" id="csTimeSense" ${char.timeSense?'checked':''}><span class="slider"></span></span> 时间感知</label></div>
    <button class="btn btn-block btn-secondary" id="csSummarize">生成角色内容向量总结</button>
    <div class="field" style="margin-top:10px"><label>向量总结</label><div class="hint" id="csSummary">${esc(char.summary||'点击生成')}</div></div>
  ` : `<div class="empty">群聊设置</div>`
  showModal({
    title: (char ? char.name : chat.name) + ' 设置',
    body,
    actions:[
      {label:'关闭', cls:'btn btn-secondary'},
      {label:'保存', cls:'btn', onOk(){
        if(!char) { closeModal(); return }
        char.note = qs('#csNote').value.trim()
        char.mind = qs('#csMind').value.trim()
        char.readNoReply = qs('#csReadNoReply').checked
        char.timeSense = qs('#csTimeSense').checked
        char.worldbooks = qsa('#csWb input:checked').map(i => i.value)
        setCharacters(getCharacters())
        renderChatDetail()
        closeModal()
      }}
    ]
  })
  // 世界书多选
  const wbBox = qs('#csWb')
  if(wbBox){
    wbBox.innerHTML = wbs.length ? wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0"><input type="checkbox" value="${w.id}" ${selected.includes(w.id)?'checked':''}><span style="font-size:13px">${esc(w.name)}${w.resident?' (常驻)':''}</span></div>`).join('') : '<div class="hint">暂无世界书，请先导入</div>'
  }
  const sumBtn = qs('#csSummarize')
  if(sumBtn) sumBtn.onclick = () => {
    if(!char){ return }
    char.summary = `角色「${char.name}」：${char.persona||''}。${char.mind? '心声：'+char.mind : ''}${char.readNoReply?' · 已读不回':''}${char.timeSense?' · 时间感知':''}`
    setCharacters(getCharacters())
    qs('#csSummary').textContent = char.summary
  }
}

// ============ 朋友圈 / 收藏 / 表情包（子页面） ============
const SUBPAGES = { moments: '朋友圈', favorites: '收藏', stickers: '表情包' }
function renderSubPage(key){
  const container = qs('#appContainer')
  container.innerHTML = ''
  container.innerHTML = `<div class="app-screen"><header class="app-header"><button class="header-btn back" data-action="back"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><h1 class="header-title">${SUBPAGES[key]}</h1><span class="header-spacer"></span></header><div class="app-body" id="subBody"></div></div>`
  qs('[data-action="back"]').onclick = () => goBack()
  const body = qs('#subBody')
  if(key === 'moments') renderMoments(body)
  else if(key === 'favorites') renderFavorites(body)
  else if(key === 'stickers') renderStickerManage(body)
}
function renderMoments(body){
  const moments = getMoments()
  body.innerHTML = `<div class="field"><textarea id="momentText" rows="2" placeholder="这一刻想分享什么"></textarea><div style="margin-top:8px"><button class="btn btn-block" id="postMomentBtn">发表</button></div></div>` + moments.map(m => `
    <div class="moment-item">
      <div class="m-head"><div class="m-avatar icon-character">${esc((m.author||'我')[0])}</div><div><div class="m-name">${esc(m.author||'我')}</div><div class="m-time">${timeAgo(m.time)}</div></div></div>
      <div class="m-text">${esc(m.text)}</div>
      ${m.image ? `<img class="m-img" src="${m.image}">` : ''}
      <div class="m-actions"><span>赞 ${m.likes?.length||0}</span><span>评论 ${m.comments?.length||0}</span></div>
    </div>
  `).join('')
  qs('#postMomentBtn').onclick = () => {
    const text = qs('#momentText').value.trim()
    if(!text){ toast('请输入内容'); return }
    const p = currentProfile() || {}
    const moments = getMoments()
    moments.unshift({ id: uid('mm'), author: p.name || '我', text, time: now(), likes:[], comments:[] })
    setMoments(moments)
    renderMoments(body)
  }
}
function renderFavorites(body){
  const favs = getFavorites()
  body.innerHTML = favs.length ? favs.map(f => `<div class="list-item"><div class="item-body"><div class="item-title" style="font-size:14px">${esc(f.text)}</div><div class="item-sub">${timeAgo(f.time)}</div></div></div>`).join('') : '<div class="empty">暂无收藏</div>'
}
function renderStickerManage(body){
  body.innerHTML = `
    <div class="card">
      <div class="field"><label>图床链接</label><input id="stLink" placeholder="https://.../表情.png"></div>
      <div class="field"><label>中文说明（必须含汉字，解释表情含义）</label><input id="stNote" placeholder="例如：这是一个眨眼卖萌的表情"></div>
      <button class="btn btn-block" id="addStBtn">导入表情包</button>
    </div>
    <div id="stList"></div>
  `
  qs('#addStBtn').onclick = () => {
    const link = qs('#stLink').value.trim()
    const note = qs('#stNote').value.trim()
    if(!link || !note){ toast('请填写链接和说明'); return }
    if(!/[\u4e00-\u9fa5]/.test(note)){ toast('说明文字必须包含汉字'); return }
    const st = getStickers()
    st.unshift({ link, note })
    setStickers(st)
    qs('#stLink').value = ''; qs('#stNote').value = ''
    renderStickerList(qs('#stList'))
  }
  renderStickerList(qs('#stList'))
}
function renderStickerList(el){
  const st = getStickers()
  el.innerHTML = st.length ? `<div class="item-grid" style="grid-template-columns:repeat(3,1fr)">` + st.map(s => `<div class="sweet-item"><img src="${esc(s.link)}" style="width:100%;height:60px;object-fit:cover;border-radius:8px"><div class="si-name" style="font-size:10px">${esc(s.note)}</div></div>`).join('') + `</div>` : '<div class="empty">暂无表情包</div>'
}

// ============ 设置 ============
function getSettings(){ return store.get('settings', { fontSize:15, fontUrl:'', apiUrl:'', apiKey:'', modelName:'', notify:false }) }
function saveSettings(s){ store.set('settings', s) }

function renderSettings(){
  const body = qs('#settingsBody')
  const s = getSettings()
  const profiles = getProfiles()
  const ap = getActiveProfile()
  body.innerHTML = `
    <div class="section-title">用户配置（多套）</div>
    <div class="list-group">${profiles.map(p => `<div class="list-item" data-profile="${p.id}"><div class="item-body"><div class="item-title">${esc(p.name||'未命名')}${p.id===ap?' (当前)':''}</div><div class="item-sub">${esc(p.persona||'')}</div></div><span class="chevron">›</span></div>`).join('')}</div>
    <button class="btn btn-block" id="addProfileBtn">+ 新建用户配置</button>

    <div class="section-title">外观</div>
    <div class="card">
      <div class="field"><label>系统字体 URL（上传后应用全屏字体）</label><input type="url" id="setFontUrl" value="${esc(s.fontUrl||'')}" placeholder="https://.../font.woff2 或 font.ttf"></div>
      <div class="field"><label>或本地字体文件</label><input type="file" id="setFontFile" accept=".ttf,.otf,.woff,.woff2"></div>
      <div class="field"><label>字体大小：<span id="fsVal">${s.fontSize}px</span></label><input type="range" id="setFontSize" min="12" max="22" value="${s.fontSize}"></div>
      <div class="field"><label>自定义壁纸</label><input type="file" id="setWallpaper" accept="image/*"></div>
      <button class="btn btn-block" id="applyFontBtn">应用外观</button>
    </div>

    <div class="section-title">AI API</div>
    <div class="card">
      <div class="field"><label>API 地址</label><input id="setApiUrl" value="${esc(s.apiUrl)}" placeholder="https://api.example.com"></div>
      <div class="field"><label>API 密钥</label><input id="setApiKey" value="${esc(s.apiKey)}" placeholder="密钥"></div>
      <div class="field"><label>模型名称</label><input id="setModelName" value="${esc(s.modelName)}" placeholder="gpt-xx"></div>
      <button class="btn btn-block" id="saveApiBtn">保存 API</button>
    </div>

    <div class="section-title">通用</div>
    <div class="card">
      <div class="list-group" style="border:1px solid var(--hairline)">
        <div class="list-item"><div class="item-body"><div class="item-title">前端通知</div></div><label class="switch"><input type="checkbox" id="setNotify" ${s.notify?'checked':''}><span class="slider"></span></label></div>
      </div>
      <button class="btn btn-secondary btn-block" id="exportBackupBtn">导出备份</button>
      <div class="field" style="margin-top:10px"><label>导入备份</label><input type="file" id="importBackupInput" accept="application/json"></div>
    </div>
  `
  qs('#setFontSize').oninput = e => { qs('#fsVal').textContent = e.target.value + 'px' }
  qs('#applyFontBtn').onclick = () => { s.fontSize = qs('#setFontSize').value; s.fontUrl = qs('#setFontUrl').value.trim(); saveSettings(s); applyFontToDoc(); toast('已应用') }
  qs('#setFontFile').onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { s.fontUrl = r.result; saveSettings(s); applyFontToDoc(); toast('字体已加载') }; r.readAsDataURL(f) }
  qs('#saveApiBtn').onclick = () => { s.apiUrl = qs('#setApiUrl').value.trim(); s.apiKey = qs('#setApiKey').value.trim(); s.modelName = qs('#setModelName').value.trim(); saveSettings(s); toast('API 已保存') }
  qs('#setWallpaper').onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { store.rawSet('wallpaper_custom', r.result); applyWallpaper(); toast('壁纸已保存') }; r.readAsDataURL(f) }
  qs('#setNotify').onchange = e => { s.notify = e.target.checked; saveSettings(s) }
  qs('#exportBackupBtn').onclick = exportBackup
  qs('#importBackupInput').onchange = e => importBackup(e.target.files[0])
  qs('#addProfileBtn').onclick = () => profileForm(null)
  qsa('[data-profile]', body).forEach(item => item.onclick = () => profileForm(item.dataset.profile))
}

function applyFontToDoc(){
  const s = getSettings()
  document.documentElement.style.fontSize = s.fontSize + 'px'
  if(s.fontUrl){
    try{
      const ff = new FontFace('SystemUI', `url(${s.fontUrl})`)
      ff.load().then(f => { document.fonts.add(f); document.documentElement.style.fontFamily = "'SystemUI', -apple-system, 'PingFang SC', sans-serif" }).catch(() => {})
    }catch(e){}
  }
}
function applyWallpaper(){
  const custom = store.raw('wallpaper_custom')
  const veil = qs('.wallpaper-veil')
  if(veil && custom){ veil.style.backgroundImage = `url(${custom})` }
}
function profileForm(id){
  const p = id ? getProfiles().find(x => x.id === id) : null
  showModal({
    title: p ? '编辑用户配置' : '新建用户配置',
    body:`
      <div class="field"><label>名称</label><input id="pfName" value="${esc(p?.name||'')}"></div>
      <div class="field"><label>人设（性格/口吻/背景）</label><textarea id="pfPersona" rows="4">${esc(p?.persona||'')}</textarea></div>
    `,
    actions:[
      {label:'取消', cls:'btn btn-secondary'},
      {label:'保存', cls:'btn', onOk(){
        const name = qs('#pfName').value.trim()
        if(!name){ toast('请输入名称'); return }
        const profiles = getProfiles()
        if(p){ p.name = name; p.persona = qs('#pfPersona').value.trim() }
        else { const np = { id: uid('p'), name, persona: qs('#pfPersona').value.trim() }; profiles.push(np); setActiveProfile(np.id) }
        setProfiles(profiles)
        renderSettings()
        closeModal()
      }}
    ]
  })
}
function exportBackup(){
  const data = { settings: getSettings(), profiles: getProfiles(), characters: getCharacters(), worldbooks: getWorldbooks(), styles: getStyles(), chats: getChats(), moments: getMoments(), favorites: getFavorites(), diary: getDiary(), tasks: getTasks(), points: getPoints() }
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'xiaomeng_backup.json'; a.click()
}
function importBackup(file){
  if(!file) return
  const r = new FileReader()
  r.onload = () => { try{
    const d = JSON.parse(r.result)
    if(d.settings) saveSettings(d.settings)
    if(d.profiles) setProfiles(d.profiles)
    if(d.characters) setCharacters(d.characters)
    if(d.worldbooks) setWorldbooks(d.worldbooks)
    if(d.styles) setStyles(d.styles)
    if(d.chats) setChats(d.chats)
    if(d.moments) setMoments(d.moments)
    if(d.favorites) setFavorites(d.favorites)
    if(d.diary) setDiary(d.diary)
    if(d.tasks) setTasks(d.tasks)
    if(d.points != null) setPoints(d.points)
    toast('备份导入成功'); renderSettings()
  }catch(e){ toast('导入失败') } }
  r.readAsText(file)
}

// ============ 角色设定 ============
function renderCharacter(){
  const body = qs('#characterBody')
  const chars = getCharacters()
  const ac = getActiveChar()
  body.innerHTML = chars.map(c => {
    const wbs = getWorldbooks()
    const wbCount = (c.worldbooks||[]).length + (c.residentWorldbooks||[]).length
    return `<div class="char-card-big ${c.id===ac?'active':''}">
      ${c.id===ac ? '<div class="cc-badge">使用中</div>' : ''}
      <div class="cc-head">
        <div class="cc-avatar icon-character">${esc((c.name||'?')[0])}</div>
        <div>
          <div class="cc-name">${esc(c.name)}</div>
          <div class="cc-tags">${esc((c.tags||[]).join('、')||'无标签')} · 挂载 ${wbCount} 本世界书</div>
        </div>
      </div>
      <div class="cc-persona">${esc(c.persona||'未填写人设')}</div>
      <div class="cc-actions">
        <button class="btn btn-sm" data-use="${c.id}">设为当前</button>
        <button class="btn btn-sm btn-secondary" data-edit="${c.id}">编辑</button>
        <button class="btn btn-sm btn-ghost" data-del="${c.id}">删除</button>
      </div>
    </div>`
  }).join('') || '<div class="empty">暂无角色，点右上角 + 新建</div>'
  qsa('[data-use]', body).forEach(b => b.onclick = () => { setActiveChar(b.dataset.use); renderCharacter() })
  qsa('[data-edit]', body).forEach(b => b.onclick = () => charForm(b.dataset.edit))
  qsa('[data-del]', body).forEach(b => b.onclick = () => { if(confirm('删除该角色？')){ setCharacters(getCharacters().filter(c => c.id !== b.dataset.del)); renderCharacter() } })
}

function charForm(id){
  const c = id ? getChar(id) : null
  const wbs = getWorldbooks()
  const styles = getStyles()
  const onlineStyles = styles.filter(s => s.mode === 'online' || !s.mode)
  const offlineStyles = styles.filter(s => s.mode === 'offline')
  showModal({
    title: c ? '编辑角色' : '新建角色',
    body: `
      <div class="field"><label>角色名</label><input id="cfName" value="${esc(c?.name||'')}"></div>
      <div class="field"><label>角色头像（用于视频通话等）</label><input type="file" id="cfAvatar" accept="image/*"><div class="hint" id="cfAvatarHint">${c?.avatar ? '已设置头像' : '未设置，将使用默认'}</div></div>
      <div class="field"><label>人设（性格/背景/经历）</label><textarea id="cfPersona" rows="4">${esc(c?.persona||'')}</textarea></div>
      <div class="field"><label>标签（顿号分隔）</label><input id="cfTags" value="${esc((c?.tags||[]).join('、'))}"></div>
      <div class="field"><label>角色心声（状态栏）</label><input id="cfMind" value="${esc(c?.mind||'')}"></div>
      <div class="field"><label>心情（心声卡显示）</label><input id="cfMood" value="${esc(c?.mood||'')}" placeholder="例如：平静 / 期待 / 想你"></div>
      <div class="field"><label>状态</label><input id="cfStatus" value="${esc(c?.status||'')}" placeholder="例如：在线 / 刚醒 / 在想你"></div>
      <div class="field"><label>内心独白（约100字）</label><textarea id="cfInner" rows="3" placeholder="ta 此刻在心里想的事...">${esc(c?.innerMonologue||'')}</textarea></div>
      <div class="guard-box">
        <div class="guard-title">防串味 / 防人设混淆机制</div>
        <div class="field"><label>说话口吻</label><input id="cfSpeech" value="${esc(c?.guard?.speechStyle||'')}" placeholder="例如：温柔克制、短句、留白"></div>
        <div class="field"><label>绝对禁止提及（顿号分隔）</label><input id="cfForbidden" value="${esc((c?.guard?.forbiddenTopics||[]).join('、'))}" placeholder="其他角色名、无关设定"></div>
        <div class="field"><label>注意避免（负面提示）</label><textarea id="cfNegative" rows="2">${esc(c?.guard?.negativePrompts||'')}</textarea></div>
      </div>
      <div class="field"><label>挂载世界书（多选）</label><div id="cfWb"></div></div>
      <div class="field"><label>常驻世界书（始终生效）</label><div id="cfWbResident"></div></div>
      <div class="field"><label>线上文风</label><select id="cfOnlineStyle">${onlineStyles.map(s => `<option value="${s.id}" ${(c?.onlineStyle===s.id)?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>线下文风</label><select id="cfOfflineStyle">${offlineStyles.map(s => `<option value="${s.id}" ${(c?.offlineStyle===s.id)?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
    `,
    actions:[
      {label:'取消', cls:'btn btn-secondary'},
      {label:'保存', cls:'btn', onOk(){
        const name = qs('#cfName').value.trim()
        if(!name){ toast('请输入角色名'); return }
        const data = {
          name,
          persona: qs('#cfPersona').value.trim(),
          tags: qs('#cfTags').value.split('、').map(t=>t.trim()).filter(Boolean),
          mind: qs('#cfMind').value.trim(),
          mood: qs('#cfMood').value.trim(),
          status: qs('#cfStatus').value.trim(),
          innerMonologue: qs('#cfInner').value.trim(),
          avatar: window.__charAvatar || c?.avatar || null,
          guard: {
            speechStyle: qs('#cfSpeech').value.trim(),
            forbiddenTopics: qs('#cfForbidden').value.split('、').map(t=>t.trim()).filter(Boolean),
            negativePrompts: qs('#cfNegative').value.trim()
          },
          worldbooks: qsa('#cfWb input:checked').map(i => i.value),
          residentWorldbooks: qsa('#cfWbResident input:checked').map(i => i.value),
          onlineStyle: qs('#cfOnlineStyle').value,
          offlineStyle: qs('#cfOfflineStyle').value,
          readNoReply: c?.readNoReply || false,
          timeSense: c?.timeSense || true,
        }
        const chars = getCharacters()
        if(c){ Object.assign(c, data) } else { data.id = uid('char'); chars.push(data); setActiveChar(data.id) }
        setCharacters(chars)
        renderCharacter()
        closeModal()
      }}
    ]
  })
  const wbBox = qs('#cfWb'), wbResident = qs('#cfWbResident')
  const wbOpts = wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><input type="checkbox" value="${w.id}" ${(c?.worldbooks||[]).includes(w.id)?'checked':''}><span style="font-size:13px">${esc(w.name)}</span></div>`).join('')
  const wbROpts = wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><input type="checkbox" value="${w.id}" ${(c?.residentWorldbooks||[]).includes(w.id)?'checked':''}><span style="font-size:13px">${esc(w.name)}</span></div>`).join('')
  if(wbBox) wbBox.innerHTML = wbOpts || '<div class="hint">暂无世界书</div>'
  if(wbResident) wbResident.innerHTML = wbROpts || '<div class="hint">暂无世界书</div>'
  // 头像上传（存到临时变量，保存时写入）
  let avatarData = c?.avatar || null
  const avatarInput = qs('#cfAvatar')
  if(avatarInput) avatarInput.onchange = e => {
    const f = e.target.files[0]; if(!f) return
    const r = new FileReader()
    r.onload = () => { avatarData = r.result; const h = qs('#cfAvatarHint'); if(h) h.textContent = '已选择新头像' }
    r.readAsDataURL(f)
  }
  // 保存时把 avatar 写入 —— 通过覆盖 save 按钮 onOk 较复杂，改在 data 组装处读 avatarData
  window.__charAvatar = avatarData
}

// ============ 世界书 ============
function renderWorldbook(){
  const body = qs('#worldbookBody')
  const wbs = getWorldbooks()
  body.innerHTML = `
    <div class="card">
      <h3>导入世界书</h3>
      <div class="field"><label>导入文件（txt / docx / json / md）</label><input type="file" id="wbFile" accept=".txt,.docx,.json,.md,.mdx"></div>
      <div class="field"><label>或粘贴文本</label><textarea id="wbPaste" rows="4" placeholder="直接粘贴世界书内容..."></textarea></div>
      <div class="field"><label>名称</label><input id="wbName" placeholder="世界书名称"></div>
      <button class="btn btn-block" id="wbAddBtn">添加世界书</button>
    </div>
    <div class="section-title">我的世界书</div>
    <div id="wbList"></div>
  `
  qs('#wbAddBtn').onclick = addWorldbook
  qs('#wbFile').onchange = e => {
    const f = e.target.files[0]
    if(!f) return
    const r = new FileReader()
    r.onload = () => { qs('#wbPaste').value = r.result; if(!qs('#wbName').value) qs('#wbName').value = f.name.replace(/\.[^.]+$/,'') }
    r.readAsText(f)
  }
  renderWbList(qs('#wbList'))
}
function addWorldbook(){
  const name = qs('#wbName').value.trim()
  const content = qs('#wbPaste').value.trim()
  if(!name || !content){ toast('请填写名称和内容'); return }
  const wbs = getWorldbooks()
  wbs.push({ id: uid('wb'), name, content, resident:false, priority: wbs.length+1, source:'import', createdAt: now() })
  setWorldbooks(wbs)
  qs('#wbName').value = ''; qs('#wbPaste').value = ''
  renderWbList(qs('#wbList'))
  toast('世界书已添加')
}
function wbForm(id){
  const w = getWorldbooks().find(x => x.id === id)
  if(!w) return
  showModal({
    title:'编辑世界书',
    body:`<div class="field"><label>名称</label><input id="ewName" value="${esc(w.name)}"></div><div class="field"><label>内容</label><textarea id="ewContent" rows="6">${esc(w.content)}</textarea></div>`,
    actions:[{label:'取消', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){ w.name = qs('#ewName').value.trim(); w.content = qs('#ewContent').value.trim(); setWorldbooks(getWorldbooks()); renderWorldbook(); closeModal() }}]
  })
}
function renderWbList(el){
  const wbs = getWorldbooks()
  el.innerHTML = wbs.map(w => `
    <div class="wb-item">
      <div class="wb-top"><div class="wb-name">${esc(w.name)}</div><label class="switch" title="是否常驻"><input type="checkbox" data-resident="${w.id}" ${w.resident?'checked':''}><span class="slider"></span></label></div>
      <div class="wb-content">${esc(w.content)}</div>
      <div class="wb-meta">
        <span>${w.resident ? '常驻' : '非驻留'}</span>
        <span>优先级 ${w.priority}</span>
        <span>${esc(w.source||'import')}</span>
      </div>
      <div class="wb-actions">
        <button class="btn btn-sm btn-secondary" data-edit="${w.id}">编辑</button>
        <button class="btn btn-sm" data-up="${w.id}">优先级 ↑</button>
        <button class="btn btn-sm btn-ghost" data-del="${w.id}">删除</button>
      </div>
    </div>
  `).join('') || '<div class="empty">暂无世界书，请导入</div>'
  qsa('[data-resident]', el).forEach(i => i.onchange = () => { const w = getWorldbooks().find(x => x.id === i.dataset.resident); w.resident = i.checked; setWorldbooks(getWorldbooks()); renderWbList(el) })
  qsa('[data-edit]', el).forEach(b => b.onclick = () => wbForm(b.dataset.edit))
  qsa('[data-del]', el).forEach(b => b.onclick = () => { if(confirm('删除？')){ setWorldbooks(getWorldbooks().filter(x => x.id !== b.dataset.del)); renderWbList(el) } })
  qsa('[data-up]', el).forEach(b => b.onclick = () => {
    const wbs = getWorldbooks(); const w = wbs.find(x => x.id === b.dataset.up)
    if(w.priority > 1){ w.priority--; const other = wbs.find(x => x.priority === w.priority && x.id !== w.id); if(other) other.priority++; setWorldbooks(wbs); renderWbList(el) }
  })
}

// ============ 文风 ============
function renderStyle(){
  const body = qs('#styleBody')
  const styles = getStyles()
  body.innerHTML = styles.map(s => `
    <div class="wb-item">
      <div class="wb-top"><div class="wb-name">${esc(s.name)}</div><span class="chip ${s.mode==='offline'?'active':''}" style="font-size:10px;padding:3px 9px">${s.mode==='offline'?'线下':'线上'}</span></div>
      <div class="wb-content">${esc(s.scene||'')}${s.scene?' · ':''}${esc(s.content)}</div>
      <div class="wb-actions">
        <button class="btn btn-sm btn-secondary" data-edit="${s.id}">编辑</button>
        <button class="btn btn-sm" data-toggle="${s.id}">${s.mode==='offline'?'转线上':'转线下'}</button>
        <button class="btn btn-sm btn-ghost" data-del="${s.id}">删除</button>
      </div>
    </div>
  `).join('') || '<div class="empty">暂无文风，点右上角 + 新建</div>'
  qsa('[data-edit]', body).forEach(b => b.onclick = () => styleForm(b.dataset.edit))
  qsa('[data-toggle]', body).forEach(b => b.onclick = () => { const s = getStyles().find(x => x.id === b.dataset.toggle); s.mode = s.mode === 'offline' ? 'online' : 'offline'; setStyles(getStyles()); renderStyle() })
  qsa('[data-del]', body).forEach(b => b.onclick = () => { if(confirm('删除？')){ setStyles(getStyles().filter(x => x.id !== b.dataset.del)); renderStyle() } })
}
function styleForm(id){
  const s = id ? getStyles().find(x => x.id === id) : null
  showModal({
    title: s ? '编辑文风' : '新建文风',
    body:`
      <div class="field"><label>名称</label><input id="sfName" value="${esc(s?.name||'')}"></div>
      <div class="field"><label>适用场景</label><input id="sfScene" value="${esc(s?.scene||'')}"></div>
      <div class="field"><label>风格内容</label><textarea id="sfContent" rows="5">${esc(s?.content||'')}</textarea></div>
      <div class="field"><label>类型</label><select id="sfMode"><option value="online" ${s?.mode!=='offline'?'selected':''}>线上</option><option value="offline" ${s?.mode==='offline'?'selected':''}>线下</option></select></div>
    `,
    actions:[{label:'取消', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){
      const name = qs('#sfName').value.trim(); const content = qs('#sfContent').value.trim()
      if(!name || !content){ toast('名称和内容不能为空'); return }
      const obj = { name, scene: qs('#sfScene').value.trim(), content, mode: qs('#sfMode').value }
      const styles = getStyles()
      if(s){ Object.assign(s, obj) } else { obj.id = uid('style'); styles.unshift(obj) }
      setStyles(styles); renderStyle(); closeModal()
    }}]
  })
}

// ============ 网易云音乐 ============
let playing = false
let currentAudio = null
let currentLyrics = []   // [{t, text}]
let lyricsTimer = null
function renderMusic(){
  const body = qs('#musicBody')
  const tracks = store.get('tracks', [])
  const loggedIn = store.get('neteaseUser', null)
  body.innerHTML = `
    <div class="music-top">
      <div class="music-login">
        <div class="avatar">${loggedIn ? esc((loggedIn.nickname||'网')[0]) : '云'}</div>
        <div>
          <div class="nick">${loggedIn ? esc(loggedIn.nickname) : '未登录'}</div>
          <div class="status">${loggedIn ? '已登录网易云账号' : '点击登录网易云账号'}</div>
        </div>
        <div style="flex:1"></div>
        <button class="btn btn-sm" id="neteaseLogin">${loggedIn?'退出':'登录'}</button>
      </div>
      <div class="music-tabs">
        <button class="tab active" data-mt="local">本地音乐</button>
        <button class="tab" data-mt="listen">与 ta 共听</button>
        <button class="tab" data-mt="import">导入/搜索</button>
      </div>
    </div>
    <div class="music-body-inner" id="musicInner"></div>
    <div class="player-bar" id="playerBar" style="display:${tracks.length?'flex':'none'}">
      <div class="pb-art"></div>
      <div class="pb-info"><div class="pb-name" id="pbName">未播放</div><div class="pb-artist" id="pbArtist"></div></div>
      <button class="pb-btn" id="pbLyric">词</button>
      <button class="pb-btn" id="pbPlay"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
    </div>
  `
  qs('#neteaseLogin').onclick = () => { if(loggedIn){ store.set('neteaseUser', null); renderMusic() } else showQrLogin() }
  const renderInner = tab => {
    qsa('.music-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.mt === tab))
    const inner = qs('#musicInner')
    if(tab === 'local') renderTrackList(inner, tracks)
    else if(tab === 'listen') renderListenTogether(inner)
    else if(tab === 'import') renderMusicImport(inner)
  }
  qsa('.music-tabs .tab').forEach(t => t.onclick = () => renderInner(t.dataset.mt))
  qs('#pbPlay').onclick = () => {
    if(!currentAudio){ toast('请先选择一首歌'); return }
    if(playing){ currentAudio.pause(); playing = false; qs('#pbPlay').innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; qs('.pb-art').style.animationPlayState = 'paused' }
    else { currentAudio.play(); playing = true; qs('#pbPlay').innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'; qs('.pb-art').style.animationPlayState = 'running' }
  }
  qs('#pbLyric').onclick = () => openLyrics()
  renderInner('local')
}

// 扫码登录
function showQrLogin(){
  const qrSvg = `<svg viewBox="0 0 120 120" style="width:160px;height:160px;background:#fff;border-radius:12px;padding:8px"><g fill="#111">${genQrSquares()}</g></svg>`
  showModal({
    title:'扫码登录',
    body:`<div style="text-align:center"><div>${qrSvg}</div><p style="font-size:13px;color:var(--muted);margin:12px 0">打开网易云音乐 App 扫一扫</p><p style="font-size:11px;color:var(--muted-2)">（演示二维码，实际登录需后端接入）</p></div>`,
    actions:[
      {label:'模拟登录成功', cls:'btn btn-block', onOk(){ store.set('neteaseUser', { nickname:'云村用户' + Math.floor(Math.random()*9999) }); renderMusic(); closeModal() }}
    ]
  })
}
function genQrSquares(){
  let s = ''
  for(let i=0;i<16;i++){
    for(let j=0;j<16;j++){
      const on = ((i*13 + j*7 + i*j) % 5) < 3
      if(on) s += `<rect x="${4+i*7}" y="${4+j*7}" width="6" height="6"/>`
    }
  }
  return s
}

function renderTrackList(el, tracks){
  el.innerHTML = tracks.length ? tracks.map((t,i) => `
    <div class="track-row" data-i="${i}">
      <div class="track-idx">${i+1}</div>
      <div class="track-info"><div class="track-name">${esc(t.name)}</div><div class="track-artist">${esc(t.artist)}</div></div>
      <div class="track-play">♪</div>
    </div>`).join('') : '<div class="empty">暂无本地音乐，请导入或搜索</div>'
  qsa('.track-row', el).forEach(r => r.onclick = () => {
    const t = tracks[+r.dataset.i]
    playTrack(t)
  })
}
function playTrack(t){
  qs('#pbName').textContent = t.name; qs('#pbArtist').textContent = t.artist
  qs('#playerBar').style.display = 'flex'
  currentLyrics = t.lyrics || []
  if(currentAudio){ currentAudio.pause() }
  if(t.url){
    currentAudio = new Audio(t.url)
    currentAudio.play().then(() => { playing = true; qs('#pbPlay').innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'; qs('.pb-art').style.animationPlayState = 'running'; startLyricSync() }).catch(() => { playing = false; toast('无音源，仅演示 UI') })
  } else {
    currentAudio = null; playing = true
    qs('#pbPlay').innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
    qs('.pb-art').style.animationPlayState = 'running'
    toast('该歌曲无音源（演示），可导入本地音频')
  }
}
// 歌词同步
function startLyricSync(){
  if(lyricsTimer) clearInterval(lyricsTimer)
  lyricsTimer = setInterval(() => {
    const lr = qs('#lyricsOverlay')
    if(!lr){ clearInterval(lyricsTimer); return }
    if(!currentAudio) return
    const ct = currentAudio.currentTime
    let cur = -1
    currentLyrics.forEach((l,i) => { if(ct >= l.t) cur = i })
    qsa('.lyr-line', lr).forEach((ln,i) => ln.classList.toggle('active', i === cur))
    if(cur >= 0){ const el = qs('.lyr-line.active'); if(el) el.scrollIntoView({block:'center', behavior:'smooth'}) }
  }, 300)
}
function openLyrics(){
  if(!currentLyrics.length){ toast('当前歌曲无歌词，可导入 .lrc'); return }
  const ov = document.createElement('div')
  ov.className = 'lyrics-overlay'; ov.id = 'lyricsOverlay'
  ov.innerHTML = `<div class="lyr-head"><span>歌词</span><button class="lyr-close">×</button></div><div class="lyr-scroll">` + currentLyrics.map((l,i) => `<div class="lyr-line ${i===0?'active':''}">${esc(l.text)}</div>`).join('') + `</div>`
  document.body.appendChild(ov)
  qs('.lyr-close', ov).onclick = () => { ov.remove(); clearInterval(lyricsTimer) }
  startLyricSync()
}
// 解析 LRC 文件
function parseLrc(text){
  const lines = []
  text.split('\n').forEach(line => {
    const m = line.match(/\[(\d{1,2}):(\d{1,2})(?:\.(\d+))?\]\s*(.*)/)
    if(m){ const t = (+m[1])*60 + (+m[2]) + (+(m[3]||0)/1000); const txt = m[4] || ''; if(txt) lines.push({ t, text: txt }) }
  })
  return lines.sort((a,b) => a.t - b.t)
}
function renderListenTogether(el){
  const char = currentChar()
  el.innerHTML = `<div class="card"><h3>与 ta 一起听</h3><div class="empty" style="padding:20px">${char ? `正在与 ${esc(char.name)} 共听，选一首歌开始吧` : '暂无角色，请先到角色设定创建角色'}</div><div class="track-list" id="listenList"></div></div>`
  const tracks = store.get('tracks', [])
  renderTrackList(qs('#listenList'), tracks)
}
function renderMusicImport(el){
  el.innerHTML = `
    <div class="card">
      <div class="field"><label>本地导入歌曲（含真实音源）</label><input type="file" id="trackFile" accept="audio/*"></div>
      <div class="field"><label>导入歌词文件（.lrc 逐句同步）</label><input type="file" id="lrcFile" accept=".lrc,.txt"></div>
      <div class="field"><label>联网搜索</label><input id="searchInput" placeholder="歌名/歌手"><button class="btn btn-block" id="searchBtn" style="margin-top:8px">搜索</button></div>
      <div id="searchResults"></div>
    </div>
  `
  qs('#trackFile').onchange = e => {
    const f = e.target.files[0]; if(!f) return
    const url = URL.createObjectURL(f)
    const tracks = store.get('tracks', [])
    tracks.push({ name: f.name.replace(/\.[^.]+$/,''), artist: '本地导入', url })
    store.set('tracks', tracks)
    toast('已导入歌曲')
  }
  qs('#lrcFile').onchange = e => {
    const f = e.target.files[0]; if(!f) return
    const r = new FileReader()
    r.onload = () => {
      const lyrics = parseLrc(r.result)
      const tracks = store.get('tracks', [])
      if(tracks.length){
        // 绑定到最近导入的一首
        tracks[tracks.length-1].lyrics = lyrics
        store.set('tracks', tracks)
        toast('歌词已导入（' + lyrics.length + ' 行）')
      } else {
        toast('请先导入歌曲，再导入歌词')
      }
    }
    r.readAsText(f)
  }
  qs('#searchBtn').onclick = () => musicSearch(qs('#searchInput').value.trim())
}
function musicSearch(qv){
  const box = qs('#searchResults')
  if(!box) return
  // 模拟搜索结果
  const results = [
    { name: qv, artist: '搜索演示 · 结果 1' },
    { name: qv + ' (Live)', artist: '搜索演示 · 结果 2' },
    { name: qv + ' (Remix)', artist: '搜索演示 · 结果 3' },
  ]
  box.innerHTML = `<div class="section-title">搜索结果</div>` + results.map((r,i) => `<div class="track-row" data-sr="${i}"><div class="track-info"><div class="track-name">${esc(r.name)}</div><div class="track-artist">${esc(r.artist)}</div></div><div class="track-play">+</div></div>`).join('')
  qsa('[data-sr]', box).forEach(r => r.onclick = () => {
    const t = results[+r.dataset.sr]
    const tracks = store.get('tracks', [])
    tracks.push({ name: t.name, artist: t.artist })
    store.set('tracks', tracks)
    toast('已加入本地音乐')
  })
}

// ============ 情侣空间 ============
function renderCouple(){
  const body = qs('#coupleBody')
  const points = getPoints()
  const char = currentChar()
  body.innerHTML = `
    <div class="couple-hero">
      <div class="points">${points}</div>
      <div class="points-label">恋爱积分</div>
      <div class="hearts">与 ${esc(char?.name||'ta')} 的甜蜜值</div>
    </div>
    <div class="section-title">每日日记</div>
    <div class="card">
      <div class="btn-row">
        <button class="btn" id="genDiaryNow">立即生成今日日记</button>
        <button class="btn btn-secondary" id="genDiarySchedule">定时生成</button>
      </div>
      <div id="diaryList" style="margin-top:12px"></div>
    </div>
    <div class="section-title">情侣任务</div>
    <div class="card">
      <div class="field"><input id="newTaskInput" placeholder="添加想一起做的事"></div>
      <button class="btn btn-block btn-secondary" id="addTaskBtn">添加任务</button>
      <div id="taskList" style="margin-top:12px"></div>
    </div>
    <div class="section-title">甜蜜道具兑换</div>
    <div class="item-grid" id="itemGrid"></div>
  `
  renderDiaryList(qs('#diaryList'))
  renderTaskList(qs('#taskList'))
  renderItems(qs('#itemGrid'))
  qs('#genDiaryNow').onclick = () => generateDiary()
  qs('#genDiarySchedule').onclick = () => { toast('已设置每日 21:00 定时生成（演示）'); memorySet('diarySchedule', '21:00') }
  qs('#addTaskBtn').onclick = () => { const v = qs('#newTaskInput').value.trim(); if(!v) return; const tasks = getTasks(); tasks.push({ id: uid('t'), text:v, done:false, points:10 }); setTasks(tasks); qs('#newTaskInput').value=''; renderTaskList(qs('#taskList')) }
}
function generateDiary(){
  const char = currentChar()
  const diary = getDiary()
  const text = `今天，${char?.name||'ta'}在日记里写道：「今天的风很轻，我想起你笑起来的样子。有些话藏在心里很久了，下次见面，我想亲口对你说。」`
  diary.unshift({ id: uid('d'), date: new Date().toLocaleDateString(), text, time: now() })
  setDiary(diary)
  renderDiaryList(qs('#diaryList'))
  toast('日记已生成')
}
function renderDiaryList(el){
  const diary = getDiary()
  el.innerHTML = diary.length ? diary.map(d => `<div class="diary-item"><div class="d-date">${esc(d.date)}</div><div class="d-text">${esc(d.text)}</div></div>`).join('') : '<div class="empty">还没有日记，点击生成</div>'
}
function renderTaskList(el){
  const tasks = getTasks()
  el.innerHTML = tasks.length ? tasks.map(t => `<div class="task-row"><label class="switch"><input type="checkbox" data-task="${t.id}" ${t.done?'checked':''}><span class="slider"></span></label><div class="task-name">${esc(t.text)}</div><div class="task-points">+${t.points}</div></div>`).join('') : '<div class="empty">暂无任务</div>'
  qsa('[data-task]', el).forEach(i => i.onchange = () => {
    const tasks = getTasks(); const t = tasks.find(x => x.id === i.dataset.task)
    t.done = i.checked
    if(t.done){ setPoints(getPoints() + t.points) }
    setTasks(tasks)
    renderCouple()
  })
}
function renderItems(el){
  const items = [
    { name:'早安吻', icon:'吻', cost:20, cls:'icon-couple' },
    { name:'拥抱券', icon:'抱', cost:30, cls:'icon-checkphone' },
    { name:'一起看电影', icon:'影', cost:50, cls:'icon-music' },
    { name:'晚安语音', icon:'晚', cost:25, cls:'icon-character' },
    { name:'专属情书', icon:'书', cost:80, cls:'icon-worldbook' },
    { name:'秘密约会', icon:'约', cost:100, cls:'icon-reading' },
  ]
  el.innerHTML = items.map(it => `<div class="sweet-item"><div class="si-icon ${it.cls}">${it.icon}</div><div class="si-name">${it.name}</div><div class="si-cost">${it.cost} 积分</div></div>`).join('')
  qsa('.sweet-item', el).forEach((n,i) => n.onclick = () => {
    const it = items[i]
    if(getPoints() >= it.cost){ setPoints(getPoints() - it.cost); toast(`已兑换「${it.name}」`); renderCouple() }
    else toast('积分不足')
  })
}

// ============ 查手机 ============
function renderCheckPhone(){
  const body = qs('#checkphoneBody')
  const char = currentChar()
  const prof = currentProfile()
  const pname = char?.name || 'ta'
  const diary = getDiary()
  const favorites = getFavorites()
  const moments = getMoments().filter(m => m.author === pname || m.author === 'ta')
  const contacts = getCharacters().filter(x => x.id !== char?.id).map(x => x.name)
  body.innerHTML = `
    <div class="section-title">${esc(pname)} 的手机</div>
    <div class="phone-mock">
      <div class="pm-status"><span>09:41</span><span class="pm-signal">●●●● 5G</span></div>
      <div class="pm-apps">
        ${['微信','相册','便签','音乐','日记','相册','便签','收藏'].map((a,i) => `<div class="pm-app" data-app-open="${i}"><div class="pm-icon icon-${['character','photos','notes','music','couple','photos','notes','style'][i]}">${a[0]}</div><span>${a}</span></div>`).join('')}
      </div>
    </div>
    <div class="section-title">ta 的微信</div>
    <div class="list-group">
      <div class="list-item"><div class="item-icon icon-character">聊</div><div class="item-body"><div class="item-title">${esc(pname)} 与 ${esc(prof?.name||'你')} 的聊天</div><div class="item-sub">${getMsgs(char?.id || '').length} 条消息</div></div></div>
      <div class="list-item"><div class="item-icon icon-style">系</div><div class="item-body"><div class="item-title">联系人</div><div class="item-sub">${contacts.length ? contacts.map(esc).join('、') : '暂无其他联系人'}</div></div></div>
    </div>
    <div class="section-title">ta 的备忘录 / 日记</div>
    ${diary.length ? diary.slice(0,3).map(d => `<div class="diary-item"><div class="d-date">${esc(d.date)}</div><div class="d-text">${esc(d.text)}</div></div>`).join('') : `<div class="diary-item"><div class="d-date">ta 的备忘录</div><div class="d-text">${esc(char?.innerMonologue || char?.mind || (char ? char.name + ' 有些话还没对你说。' : '暂无'))}</div></div>`}
    <div class="section-title">ta 的收藏</div>
    ${favorites.length ? favorites.slice(0,3).map(f => `<div class="diary-item"><div class="d-text">${esc(f.text)}</div></div>`).join('') : '<div class="diary-item"><div class="d-text" style="color:var(--muted)">还没有收藏</div></div>'}
    <button class="btn btn-block btn-secondary" id="reverseCheck">反向：查看 user 的手机</button>
  `
  qs('#reverseCheck').onclick = () => {
    const p = currentProfile()
    const myDiary = getDiary().filter(d => d.mine)
    showModal({ title:'查看 user 的手机', body:`
      <div class="phone-mock" style="margin-bottom:10px"><div class="pm-status"><span>09:41</span><span>${esc(p?.name||'你')}的手机</span></div><div class="pm-apps">${['微信','相册','便签','设置'].map(a => `<div class="pm-app"><div class="pm-icon icon-character">${a[0]}</div><span>${a}</span></div>`).join('')}</div></div>
      <div class="section-title">你的备忘录</div><div class="card"><p style="font-size:13px;color:var(--muted)">${esc(p?.persona||'还没有写人设')}</p></div>
      <div class="section-title">你的收藏（${getFavorites().length}）</div>
      <div class="section-title">你的朋友圈（${getMoments().length}）</div>
    `, actions:[{label:'关闭', cls:'btn btn-block'}] })
  }
  qsa('[data-app-open]', body).forEach(el => el.onclick = () => {
    const idx = +el.dataset.appOpen
    const contents = [
      ['聊天','最近和 ' + esc(prof?.name||'你') + ' 聊过天'],
      ['相册','有一些你们的合照'],
      ['便签', esc(char?.innerMonologue || '写下了一些心里话')],
      ['音乐','最近在听同一首歌'],
      ['日记', esc(diary[0]?.text || '记下了今天的心情')],
      ['相册','更多照片'],
      ['便签','备忘清单'],
      ['收藏', esc(favorites[0]?.text || '收藏了一些想说的话')],
    ][idx] || ['内容','暂无']
    toast(`${contents[0]}：${contents[1]}`)
  })
}

// ============ 商城 ============
function renderShop(){
  const body = qs('#shopBody')
  const shopHtml = store.raw('shopHtml')
  body.innerHTML = `
    <div class="card">
      <div class="field"><label>导入商城 HTML（完整替换商城内容）</label><input type="file" id="shopFileInput" accept="text/html"></div>
      <p class="hint">导入后会完整渲染你的商城页面；未导入时显示默认示例</p>
    </div>
    <div id="shopContent"></div>
  `
  qs('#shopFileInput').onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { store.rawSet('shopHtml', r.result); renderShop() }; r.readAsText(f) }
  const content = qs('#shopContent')
  if(shopHtml){
    content.innerHTML = `<div class="section-title">已导入的商城</div><iframe class="shop-frame" srcdoc="${esc(shopHtml)}"></iframe>`
  } else {
    const defaultProducts = [
      { name:'定制头像', price:9.9, icon:'像', cls:'icon-character' },
      { name:'情书模板', price:6.6, icon:'书', cls:'icon-worldbook' },
      { name:'主题皮肤', price:19.9, icon:'肤', cls:'icon-style' },
      { name:'专属铃声', price:12.0, icon:'铃', cls:'icon-music' },
    ]
    content.innerHTML = `<div class="section-title">默认商品</div><div class="shop-items">` + defaultProducts.map(p => `<div class="shop-product"><div class="sp-img ${p.cls}" style="color:#fff">${p.icon}</div><div class="sp-body"><div class="sp-name">${p.name}</div><div class="sp-price">¥${p.price}</div></div></div>`).join('') + `</div>`
  }
}

// ============ 酒馆（线下模式） ============
function renderTavern(){
  const body = qs('#tavernBody')
  const chars = getCharacters()
  const wbs = getWorldbooks()
  const styles = getStyles().filter(s => s.mode === 'offline' || !s.mode)
  body.innerHTML = `
    <div class="card">
      <h3>线下 · 酒馆模拟</h3>
      <div class="field"><label>挂载世界书（多选）</label><div id="tvWb"></div></div>
      <div class="field"><label>选择文风</label><select id="tvStyle">${styles.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>在场角色</label><div class="character-grid" id="tvChars" style="grid-template-columns:repeat(3,1fr)"></div></div>
    </div>
    <div id="tvChatArea" style="display:none">
      <div class="chat-header-inline" style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--card);border-bottom:1px solid var(--hairline)"><div class="avatar icon-tavern" id="tvAvatar" style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600">馆</div><div><div id="tvName" style="font-weight:600">酒馆</div><div class="chat-status" id="tvStatus" style="font-size:12px;color:var(--muted)">灯光微黄，等你开口</div></div></div>
      <div class="message-list" id="tvMessages" style="height:300px"></div>
      <div class="tavern-composer" style="display:flex;gap:8px;padding:10px;background:var(--card);border-top:1px solid var(--hairline)"><input id="tvInput" placeholder="输入动作或对话..." style="flex:1;padding:10px 14px;border-radius:20px;border:1px solid var(--hairline-2);background:var(--card-2);color:var(--text);outline:none"><button class="btn" id="tvSend">发送</button></div>
    </div>
  `
  const wbBox = qs('#tvWb')
  wbBox.innerHTML = wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><input type="checkbox" value="${w.id}"><span style="font-size:13px">${esc(w.name)}${w.resident?' (常驻)':''}</span></div>`).join('') || '<div class="hint">暂无世界书</div>'
  const charGrid = qs('#tvChars')
  charGrid.innerHTML = chars.map(c => `<div class="char-card" data-char="${c.id}"><div class="char-avatar icon-character">${esc((c.name||'?')[0])}</div><div class="char-name">${esc(c.name)}</div></div>`).join('') || '<div class="hint">暂无角色</div>'
  qsa('[data-char]', charGrid).forEach(c => c.onclick = () => enterTavern(c.dataset.char))
  qs('#tvSend').onclick = tavernSend
  qs('#tvInput').onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); tavernSend() } }
}
function enterTavern(charId){
  const c = getChar(charId)
  qs('#tvChatArea').style.display = 'block'
  qs('#tvAvatar').textContent = (c?.name||'馆')[0]
  qs('#tvName').textContent = c?.name
  qs('#tvStatus').textContent = c?.mind || c?.desc || '灯光微黄，等你开口'
  memorySet('tavernChar', charId)
  renderTavernMsgs()
}
function renderTavernMsgs(){
  const msgs = store.get('tavernMsgs', [])
  const list = qs('#tvMessages')
  list.innerHTML = msgs.map(m => `<div class="msg ${m.sender==='me'?'me':'char'}"><div class="bubble">${esc(m.text)}</div></div>`).join('')
  list.scrollTop = list.scrollHeight
}
function tavernSend(){
  const input = qs('#tvInput')
  const text = input.value.trim()
  if(!text) return
  const msgs = store.get('tavernMsgs', [])
  msgs.push({ id: uid('t'), sender:'me', text, time:now() })
  store.set('tavernMsgs', msgs)
  input.value = ''
  renderTavernMsgs()
  const charId = memory('tavernChar')
  const c = getChar(charId)
  setTimeout(() => {
    const msgs2 = store.get('tavernMsgs', [])
    msgs2.push({ id: uid('t'), sender:'char', text: c ? `${c.name}微微侧头：「${text}……这倒是有点意思。」` : '酒保擦着杯子，等你开口。', time:now() })
    store.set('tavernMsgs', msgs2)
    renderTavernMsgs()
  }, 700)
}

// ============ 同人文/共读 ============
function renderReading(){
  const body = qs('#readingBody')
  const books = store.get('books', [])
  body.innerHTML = `
    <div class="card">
      <h3>生成同人文</h3>
      <div class="field"><label>主题/CP</label><input id="fanficTopic" placeholder="例如：雨天初遇"></div>
      <button class="btn btn-block" id="genFanficBtn">AI 生成同人文</button>
    </div>
    <div class="card">
      <h3>导入书本</h3>
      <div class="field"><label>文件（txt/md）</label><input type="file" id="bookFile" accept=".txt,.md"></div>
    </div>
    <div class="section-title">我的书库</div>
    <div id="bookList"></div>
    <div id="readerView" style="display:none"></div>
  `
  qs('#genFanficBtn').onclick = () => {
    const topic = qs('#fanficTopic').value.trim() || '一次重逢'
    const char = currentChar()
    const text = `【同人文】\n\n那是一个下着小雨的黄昏。\n\n${char?.name||'ta'}站在街角的屋檐下，望着对面亮起的灯。你在人群里一眼就认出了那个身影。\n\n「原来，你也在这里。」\n\n故事从这里开始。`
    store.set('fanfic_' + Date.now(), { topic, text })
    toast('同人文已生成，可到书库查看')
  }
  qs('#bookFile').onchange = e => {
    const f = e.target.files[0]; if(!f) return
    const r = new FileReader()
    r.onload = () => { const books = store.get('books', []); books.push({ id: uid('b'), name: f.name.replace(/\.[^.]+$/,''), content: r.result }); store.set('books', books); renderReading() }
    r.readAsText(f)
  }
  const bookList = qs('#bookList')
  bookList.innerHTML = books.map(b => `<div class="book-row" data-book="${b.id}"><div class="book-cover">${esc((b.name||'书')[0])}</div><div class="book-info"><div class="book-name">${esc(b.name)}</div><div class="book-desc">${esc(b.content.slice(0,80))}</div></div></div>`).join('') || '<div class="empty">暂无书本，导入一本书与 ta 共读</div>'
  qsa('[data-book]', bookList).forEach(r => r.onclick = () => {
    const b = books.find(x => x.id === r.dataset.book)
    const char = currentChar()
    const view = qs('#readerView')
    view.style.display = 'block'
    bookList.style.display = 'none'
    view.innerHTML = `<div class="reader-view"><h3>${esc(b.name)}</h3><p style="color:var(--muted);font-size:12px">与 ${esc(char?.name||'ta')} 共读中</p><p style="white-space:pre-wrap;margin-top:12px">${esc(b.content)}</p><button class="btn btn-block btn-secondary" id="closeReader">返回书库</button></div>`
    qs('#closeReader').onclick = () => { view.style.display = 'none'; bookList.style.display = 'block' }
  })
}
function readingAddBody(){ return `<div class="field"><label>生成同人文主题</label><input id="rdTopic"></div><button class="btn btn-block" id="rdGen">生成</button><div class="field" style="margin-top:10px"><label>导入书本</label><input type="file" id="rdFile" accept=".txt,.md"></div>` }

// ============ 论坛（知乎） ============
function getPosts(){ return store.get('forumPosts', []) }
function setPosts(v){ store.set('forumPosts', v) }
function renderForum(){
  const body = qs('#forumBody')
  const posts = getPosts()
  body.innerHTML = `
    <div class="zhihu-feed" id="zhFeed"></div>
  `
  renderZhFeed(qs('#zhFeed'), 'hot')
}
function renderZhFeed(el, tab){
  const posts = getPosts()
  const sorted = tab === 'hot' ? [...posts].sort((a,b) => (b.likes||0)-(a.likes||0)) : [...posts].sort((a,b) => b.time-a.time)
  el.innerHTML = sorted.length ? sorted.map(p => `
    <div class="zh-item" data-post="${p.id}">
      <div class="zh-title">${esc(p.title)}</div>
      <div class="zh-excerpt">${esc((p.body||'').slice(0,60))}...</div>
      <div class="zh-meta"><span>${p.likes} 赞同</span><span>${(p.answers||[]).length} 评论</span><span class="zh-hot">${p.likes>5?'热门':''}</span></div>
    </div>
  `).join('') : '<div class="empty">暂无问题，点右上角提问</div>'
  qsa('[data-post]', el).forEach(i => i.onclick = () => openPost(i.dataset.post))
}
function openPost(id){
  const p = getPosts().find(x => x.id === id)
  if(!p) return
  const container = qs('#appContainer')
  container.innerHTML = `<div class="app-screen"><header class="app-header"><button class="header-btn back" data-action="back"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><h1 class="header-title">问题详情</h1><span class="header-spacer"></span></header><div class="app-body" id="postBody"></div></div>`
  qs('[data-action="back"]').onclick = () => goBack()
  const body = qs('#postBody')
  body.innerHTML = `
    <div class="card"><h3>${esc(p.title)}</h3><p style="font-size:14px;color:var(--text-2);line-height:1.6">${esc(p.body||'')}</p></div>
    <div class="section-title">回答</div>
    ${(p.answers||[]).map(a => `<div class="zh-answer"><div class="za-author"><div class="za-avatar icon-character">${esc((a.author||'?')[0])}</div><div class="za-name">${esc(a.author)}</div></div><div class="za-text">${esc(a.text)}</div></div>`).join('') || '<div class="empty">暂无回答</div>'}
    <button class="btn btn-block btn-secondary" id="answerBtn">写回答</button>
  `
  qs('#answerBtn').onclick = () => {
    showModal({ title:'写回答', body:`<textarea id="ansText" rows="4" placeholder="写下你的回答..."></textarea>`, actions:[{label:'提交', cls:'btn btn-block', onOk(){ const t = qs('#ansText').value.trim(); if(!t) return; const prof = currentProfile(); p.answers = p.answers||[]; p.answers.push({ author: prof?.name||'匿名', text: t }); setPosts(getPosts()); openPost(id); closeModal() }}] })
  }
}
function askQuestion(){
  showModal({ title:'提问', body:`<div class="field"><label>标题</label><input id="qTitle"></div><div class="field"><label>问题描述</label><textarea id="qBody" rows="3"></textarea></div>`, actions:[{label:'发布', cls:'btn btn-block', onOk(){ const t = qs('#qTitle').value.trim(); if(!t) return; const posts = getPosts(); posts.unshift({ id: uid('p'), title: t, body: qs('#qBody').value.trim(), likes:0, answers:[], time:now() }); setPosts(posts); renderForum(); closeModal() }}] })
}

// ============ 弹窗/Toast ============
function showModal(opts){
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `<div class="modal"><button class="modal-close">×</button><h3>${esc(opts.title)}</h3><div class="modal-body">${opts.body}</div><div class="btn-row">${(opts.actions||[]).map(a => `<button class="${a.cls}" data-ma>${a.label}</button>`).join('')}</div></div>`
  document.body.appendChild(overlay)
  const btns = qsa('[data-ma]', overlay)
  ;(opts.actions||[]).forEach((a,i) => btns[i].onclick = () => { if(a.onOk) a.onOk(); else closeModal() })
  overlay.onclick = e => { if(e.target === overlay) closeModal() }
  qs('.modal-close', overlay).onclick = closeModal
}
function closeModal(){ const m = qs('.modal-overlay'); if(m) m.remove() }
function toast(msg){
  const t = document.createElement('div')
  t.className = 'toast'; t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.classList.add('show'), 10)
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300) }, 1800)
}
function addMenuBody(){
  return `<div class="list-group" style="border:1px solid var(--hairline)">
    <div class="list-item" id="amNewChar"><div class="item-icon icon-character">角</div><div class="item-body"><div class="item-title">新建角色人设</div></div></div>
    <div class="list-item" id="amNewGroup"><div class="item-icon icon-style">群</div><div class="item-body"><div class="item-title">发起群聊</div></div></div>
  </div>`
}

// ============ 时间工具 ============
function timeAgo(ts){
  const d = now() - ts
  if(d < 60000) return '刚刚'
  if(d < 3600000) return Math.floor(d/60000) + '分钟前'
  if(d < 86400000) return Math.floor(d/3600000) + '小时前'
  return new Date(ts).toLocaleDateString()
}

// ============ 初始化 ============
function ensureDefaults(){
  if(getProfiles().length === 0){
    setProfiles([{ id: uid('p'), name:'晓梦生', persona:'喜欢记录日常，观察细节', wechatId:'xm-sheng' }])
    setActiveProfile(getProfiles()[0].id)
  }
  // 首次启动引导：提示导入世界书（不预设）
  if(store.raw('seeded') !== '1'){
    store.rawSet('seeded', '1')
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ensureDefaults()
  renderHome()
  bindPageIndicator()
  updateClock()
  setInterval(updateClock, 30000)
  applyFontToDoc()
  applyWallpaper()

  // 弹窗添加按钮的事件（延迟绑定，因为 modal 动态创建）
  document.addEventListener('click', e => {
    if(e.target.id === 'amNewChar'){ closeModal(); charForm(null) }
    if(e.target.id === 'amNewGroup'){ closeModal(); createGroup() }
  })
})

function createGroup(){
  const chars = getCharacters()
  if(chars.length < 2){ toast('至少需要 2 个角色才能建群'); return }
  showModal({
    title:'发起群聊',
    body:`<div class="field"><label>群名</label><input id="grpName" value="好友群"></div><div class="field"><label>选择成员</label><div id="grpMembers"></div></div>`,
    actions:[{label:'创建', cls:'btn btn-block', onOk(){
      const name = qs('#grpName').value.trim() || '好友群'
      const members = qsa('#grpMembers input:checked').map(i => i.value)
      if(members.length < 2){ toast('至少选 2 个成员'); return }
      const chats = getChats()
      chats.push({ id: uid('g'), type:'group', name, avatar:'群', color:'icon-style', members, unread:0, last:'群聊已创建', time:now() })
      setChats(chats)
      renderWechat()
      closeModal()
    }}]
  })
  qs('#grpMembers').innerHTML = chars.map(c => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0"><input type="checkbox" value="${c.id}"><span style="font-size:13px">${esc(c.name)}</span></div>`).join('')
}

// 处理子页面导航（朋友圈/收藏/表情包）—— pushApp 已在顶部定义

window.__app = { openApp, closeApp, APPS }
