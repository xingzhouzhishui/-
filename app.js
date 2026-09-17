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
const trunc = (s, n) => { s = String(s||''); return s.length > n ? s.slice(0, n) + '…' : s }
function msgPreview(m){
  if(!m) return ''
  if(m.type === 'text') return m.text
  return ({image:'[图片]',audio:'[语音]',location:'[位置]',transfer:'[转账]',redpacket:'[红包]',call:'[通话]',sticker:'[表情]',system:'[系统]'}[m.type]||'[消息]')
}

// ============ 应用注册表 ============
const APPS = [
  { id:'wechat',    name:'微信',    icon:'微', cls:'icon-wechat',    tpl:'tpl-wechat',   dock:true },
  { id:'music',     name:'网易云音乐',icon:'音', cls:'icon-music',     tpl:'tpl-music',    dock:true },
  { id:'offline',   name:'线下',    icon:'下', cls:'icon-tavern',    tpl:'tpl-tavern',   dock:true },
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

// ============ 数据层 ============
function getProfiles(){ return store.get('profiles', []) }
function setProfiles(v){ store.set('profiles', v) }
function getActiveProfile(){ return store.raw('activeProfile') }
function setActiveProfile(id){ store.rawSet('activeProfile', id) }
function currentProfile(){ return getProfiles().find(p => p.id === getActiveProfile()) || getProfiles()[0] || null }

function getCharacters(){ return store.get('characters', []) }
function setCharacters(v){ store.set('characters', v) }
function getActiveChar(){ return store.raw('activeChar') }
function setActiveChar(id){ store.rawSet('activeChar', id) }
function getChar(id){ return getCharacters().find(c => c.id === id) }
function getCharByName(name){ return getCharacters().find(c => c.name === name) }
function currentChar(){ return getChar(getActiveChar()) || getCharacters()[0] || null }

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
function getSettings(){ return store.get('settings', { fontSize:15, fontUrl:'', apiUrl:'', apiKey:'', modelName:'', notify:false }) }
function saveSettings(s){ store.set('settings', s) }
function memory(key){ return store.get('memory_' + key, null) }
function memorySet(key, v){ store.set('memory_' + key, v) }

// 头像渲染（有图显示图，无图显示首字）
function avatarHTML(obj, cls, extra){
  if(obj && obj.avatar){ return `<div class="avatar ${cls||''}" style="background-image:url(${obj.avatar});background-size:cover;background-position:center;${extra||''}"></div>` }
  return `<div class="avatar ${cls||''}" style="${extra||''}">${esc((obj?.name||'?')[0])}</div>`
}

// 角色 AI 上下文（防串味）
function buildCharContext(char){
  if(!char) return ''
  const wbs = getWorldbooks().filter(w => (char.worldbooks||[]).includes(w.id) || (char.residentWorldbooks||[]).includes(w.id))
  const others = getCharacters().filter(c => c.id !== char.id)
  const guard = char.guard || {}
  const parts = []
  parts.push(`【你正在扮演】${char.name}`)
  if(char.persona) parts.push(`【人设】${char.persona}`)
  if(guard.speechStyle) parts.push(`【口吻】${guard.speechStyle}`)
  if(guard.forbiddenTopics && guard.forbiddenTopics.length) parts.push(`【绝对禁止提及】${guard.forbiddenTopics.join('、')}`)
  if(guard.negativePrompts) parts.push(`【注意避免】${guard.negativePrompts}`)
  if((char.residentWorldbooks||[]).length) parts.push(`【常驻世界书】${wbs.filter(w => (char.residentWorldbooks||[]).includes(w.id)).map(w => w.content).join('\n')}`)
  if(others.length) parts.push(`【防串味】你只是 ${char.name}，与以下角色无关联：${others.map(o => o.name).join('、')}`)
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
const SUBPAGES = { moments:'朋友圈', favorites:'收藏', stickers:'表情包' }
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
    case 'offline': renderOffline(); break
    case 'reading': renderReading(); break
    case 'forum': renderForum(); break
  }
  bindHeader(id)
}
function bindHeader(id){
  qsa('[data-action]').forEach(btn => {
    btn.onclick = () => {
      const action = btn.dataset.action
      if(action === 'back') goBack()
      else if(action === 'more') headerMore(id)
      else headerAction(id, action)
    }
  })
}
function headerMore(id){
  if(id === 'wechat') showModal({title:'添加', body:addMenuBody(), actions:[{label:'关闭', cls:'btn btn-block'}]})
}
function headerAction(id, action){
  if(id === 'character' && action === 'add'){ charForm(null) }
  if(id === 'worldbook' && action === 'add'){ qs('#wbFile').click() }
  if(id === 'style' && action === 'add'){ styleForm(null) }
  if(id === 'music' && action === 'search'){ musicSearchModal() }
  if(id === 'shop' && action === 'add'){ qs('#shopFileInput') && qs('#shopFileInput').click() }
  if(id === 'forum' && action === 'ask'){ askQuestion() }
}

// ============ 微信 ============
function ensureChats(){
  const chars = getCharacters()
  if(getChats().length === 0){
    const chats = chars.map(c => ({ id:c.id, type:'single', name:c.name, avatar:(c.name||'?')[0], color:'icon-character', unread:0, last:'开始聊天吧', time:now() }))
    if(chars.length >= 2) chats.push({ id:'group_friends', type:'group', name:'好友群', avatar:'群', color:'icon-style', unread:0, last:'欢迎来到群聊', time:now(), members: chars.map(c => c.id) })
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
  renderChatsPanel(); renderContactsPanel(); renderDiscoverPanel(); renderMePanel()
}
function renderChatsPanel(){
  const el = qs('#panel-chats')
  const chats = getChats()
  el.innerHTML = chats.map(c => {
    const msgs = getMsgs(c.id)
    const last = msgs[msgs.length-1]
    const lastText = last ? (last.type==='text' ? last.text : ({image:'[图片]',audio:'[语音]',location:'[位置]',transfer:'[转账]',redpacket:'[红包]',call:'[通话]',sticker:'[表情]'}[last.type]||'[消息]')) : c.last
    return `<div class="chat-row" data-chat="${c.id}">
      <div class="avatar ${c.color}">${esc(c.avatar)}</div>
      <div class="chat-info">
        <div class="chat-name-row"><span class="chat-name">${esc(c.name)}</span><span class="chat-time">${timeAgo(c.time)}</span></div>
        <div class="chat-last">${esc(lastText||'')}</div>
      </div>
      ${c.unread ? `<div class="unread">${c.unread}</div>` : ''}
    </div>`
  }).join('') || '<div class="empty">暂无会话，请先在角色设定创建角色</div>'
  qsa('.chat-row', el).forEach(r => r.onclick = () => openChatDetail(r.dataset.chat))
}
function renderContactsPanel(){
  const el = qs('#panel-contacts')
  const chars = getCharacters()
  const groups = getChats().filter(c => c.type === 'group')
  let html = `<div class="contact-add" id="addContactBtn"><div class="avatar">+</div><div style="flex:1;font-size:15px">添加新的 char 人设</div></div>`
  html += groups.map(g => `<div class="chat-row" data-chat="${g.id}"><div class="avatar ${g.color}">${esc(g.avatar)}</div><div class="chat-info"><span class="chat-name">${esc(g.name)}</span></div></div>`).join('')
  html += `<div class="contact-letter">角色 (${chars.length})</div>`
  html += chars.map(c => `<div class="chat-row" data-chat="${c.id}"><div class="avatar icon-character">${esc((c.name||'?')[0])}</div><div class="chat-info"><span class="chat-name">${esc(c.name)}</span><div class="chat-sub">${esc((c.tags||[]).join('、'))}</div></div></div>`).join('')
  el.innerHTML = html
  const ab = qs('#addContactBtn'); if(ab) ab.onclick = () => charForm(null)
  qsa('.chat-row', el).forEach(r => r.onclick = () => openChatDetail(r.dataset.chat))
}
function renderDiscoverPanel(){
  const el = qs('#panel-discover')
  el.innerHTML = `
    <div class="list-group">
      <div class="list-item" data-nav="moments"><div class="item-icon icon-couple">朋</div><div class="item-body"><div class="item-title">朋友圈</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="favorites"><div class="item-icon icon-style">藏</div><div class="item-body"><div class="item-title">收藏</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="stickers"><div class="item-icon icon-photos">表</div><div class="item-body"><div class="item-title">表情包</div></div><span class="chevron">›</span></div>
    </div>
    <div class="section-title">小程序</div>
    <div class="list-group">
      <div class="list-item" data-nav="mini-music"><div class="item-icon icon-music">音</div><div class="item-body"><div class="item-title">网易云音乐</div><div class="item-sub">听歌、共听</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="mini-couple"><div class="item-icon icon-couple">情</div><div class="item-body"><div class="item-title">情侣空间</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="mini-offline"><div class="item-icon icon-tavern">下</div><div class="item-body"><div class="item-title">线下</div><div class="item-sub">沉浸长文对话</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="mini-shop"><div class="item-icon icon-shop">商</div><div class="item-body"><div class="item-title">商城</div></div><span class="chevron">›</span></div>
    </div>
  `
  qsa('[data-nav]', el).forEach(item => item.onclick = () => {
    const nav = item.dataset.nav
    if(nav === 'moments') pushApp('moments')
    else if(nav === 'favorites') pushApp('favorites')
    else if(nav === 'stickers') pushApp('stickers')
    else if(nav === 'mini-music') openApp('music')
    else if(nav === 'mini-couple') openApp('couple')
    else if(nav === 'mini-offline') openApp('offline')
    else if(nav === 'mini-shop') openApp('shop')
  })
}
function renderMePanel(){
  const el = qs('#panel-me')
  const p = currentProfile() || {}
  el.innerHTML = `
    <div class="list-item" id="meProfileEdit">
      <div class="avatar icon-character" style="width:58px;height:58px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:23px">${esc((p.name||'晓')[0])}</div>
      <div class="item-body"><div class="item-title" style="font-size:17px">${esc(p.name||'晓梦生')}</div><div class="item-sub">微信号：${esc(p.wechatId||'xm-sheng')}</div></div>
      <span class="chevron">›</span>
    </div>
    <div class="list-group" style="margin-top:14px">
      <div class="list-item" data-me="favorites"><div class="item-body"><div class="item-title">收藏</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-me="moments"><div class="item-body"><div class="item-title">朋友圈</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-me="settings"><div class="item-body"><div class="item-title">设置</div></div><span class="chevron">›</span></div>
    </div>
  `
  const edit = qs('#meProfileEdit'); if(edit) edit.onclick = () => editProfile()
  qsa('[data-me]', el).forEach(item => item.onclick = () => {
    const m = item.dataset.me
    if(m === 'favorites') pushApp('favorites'); else if(m === 'moments') pushApp('moments'); else if(m === 'settings') openApp('settings')
  })
}
function editProfile(){
  const p = currentProfile() || {}
  showModal({ title:'编辑资料', body:`
    <div class="field"><label>名称</label><input id="epName" value="${esc(p.name||'')}"></div>
    <div class="field"><label>微信号</label><input id="epWx" value="${esc(p.wechatId||'')}"></div>
    <div class="field"><label>个性签名</label><input id="epSign" value="${esc(p.sign||'')}"></div>`,
    actions:[{label:'取消', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){
      const profiles = getProfiles(); const idx = profiles.findIndex(x => x.id === p.id)
      const obj = { ...p, name: qs('#epName').value.trim(), wechatId: qs('#epWx').value.trim(), sign: qs('#epSign').value.trim() }
      if(idx >= 0) profiles[idx] = obj; else { obj.id = uid('p'); profiles.push(obj); setActiveProfile(obj.id) }
      setProfiles(profiles); renderMePanel(); closeModal()
    }}] })
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
  qs('#chatDetailSub').textContent = (char && char.readNoReply) ? '在线 · 已读不回' : (chat.type === 'group' ? '群聊' : '在线')
  // 聊天背景
  const screen = qs('.chat-detail-screen')
  const bg = (char && char.chatBg) || (currentProfile() && currentProfile().chatBg)
  const bgUrl = (char && char.chatBgUrl) || (currentProfile() && currentProfile().chatBgUrl)
  if(screen){ screen.style.backgroundImage = bg ? `url(${bg})` : (bgUrl ? `url(${bgUrl})` : ''); screen.style.backgroundSize = 'cover'; screen.style.backgroundPosition = 'center' }
  appStack.push('chat-detail')
  renderChatDetail()
}

function renderChatDetail(){
  const chatId = activeChatId
  const chat = getChats().find(c => c.id === chatId) || { name:'联系人', avatar:'?' }
  const char = getCharByName(chat.name)
  const msgs = getMsgs(chatId)
  const list = qs('#detailMessageList')
  list.innerHTML = msgs.map(m => renderMessage(m, char)).join('') || '<div class="time-sep">开始聊天吧</div>'
  list.scrollTop = list.scrollHeight
  const input = qs('#detailChatInput')
  input.onkeydown = e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendDetailMessage() } }
  qsa('[data-action]').forEach(btn => {
    const a = btn.dataset.action
    if(a === 'voice') btn.onclick = () => sendVoice()
    if(a === 'emoji') btn.onclick = () => toggleStickerPanel()
    if(a === 'plus') btn.onclick = () => toggleActionPanel()
    if(a === 'more') btn.onclick = () => showChatSettings(chatId)
    if(a === 'back') btn.onclick = () => goBack()
  })
  bindMessageLongPress()
  bindVoicePlay()
  bindRedPacketOpen()
}

// 消息渲染：文本用气泡，卡片类独立展示
function renderMessage(m, char){
  const me = m.sender === 'me'
  const avatar = me ? '' : (char ? (char.name||'?')[0] : '?')
  const cls = me ? 'me' : 'char'
  let inner = ''
  let cardCls = ''
  if(m.type === 'text'){ inner = esc(m.text) }
  else if(m.type === 'image'){ cardCls='msg-image'; inner = `<img src="${m.dataUrl}" alt="图片">` }
  else if(m.type === 'sticker'){ cardCls='msg-image'; inner = `<img src="${m.dataUrl}" alt="表情" style="max-width:120px">` }
  else if(m.type === 'audio'){ cardCls=''; inner = voiceBubble(m, me) }
  else if(m.type === 'location'){ cardCls='msg-location'; inner = `<div class="loc-icon">⌖</div><div><div class="loc-name">${esc(m.text)}</div><div class="loc-addr">位置信息</div></div>` }
  else if(m.type === 'transfer'){ cardCls='msg-transfer'; inner = `<div class="tr-icon">¥</div><div><div class="tr-title">转账给${esc(m.to||'对方')}</div><div class="tr-amt">¥${esc(m.text)}</div></div>` }
  else if(m.type === 'redpacket'){ cardCls='msg-redpacket'; inner = `<div class="rp-icon">吉</div><div><div class="rp-title">${esc(m.sender==='me'?'你':'ta')}的红包</div><div class="rp-sub">${m.opened ? '已领取' : '恭喜发财，大吉大利'}</div></div>${m.opened? '<div class="rp-opened">已领</div>':''}` }
  else if(m.type === 'call'){ inner = `<span class="sys">${esc(m.text)}</span>` }
  else if(m.type === 'system'){ inner = `<span class="sys">${esc(m.text)}</span>` }
  if(m.type === 'call' || m.type === 'system'){ return `<div class="time-sep" style="margin:4px 0">${esc(m.text)}</div>` }
  const wrapCls = cardCls ? 'msg-card ' + cardCls : 'bubble'
  const profile = currentProfile() || {}
  const charBubble = char ? (char.bubbleColor || '#26292f') : '#26292f'
  const userBubble = profile.bubbleColor || '#3d4a5c'
  const avatarHtml = me ? '' : (char && char.avatar ? `<div class="avatar-s" style="background-image:url(${char.avatar});background-size:cover;background-position:center"></div>` : `<div class="avatar-s">${esc(avatar)}</div>`)
  const bubbleStyle = cardCls ? '' : (me ? `background:${userBubble}` : `background:${charBubble}`)
  const openAttr = (m.type === 'redpacket' && !m.opened) ? `data-rp="${m.id}" data-rpsender="${m.sender}"` : ''
  return `<div class="msg ${cls}" data-mid="${m.id}">${avatarHtml}<div class="${wrapCls}" style="${bubbleStyle}" ${openAttr}>${inner}</div></div>`
}

function voiceBubble(m, me){
  const dur = m.duration || 3
  return `<div class="voice-wrap"><div class="voice-bubble ${me?'me':'char'}" data-voice="${m.id}">
    <svg viewBox="0 0 24 24" class="vb-play"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
    <div class="vb-bars"><span></span><span></span><span></span></div>
    <span class="vb-dur">${dur}''</span>
  </div><div class="voice-text">${esc(m.text||'')}</div></div>`
}

function bindMessageLongPress(){
  qsa('.msg', qs('#detailMessageList')).forEach(mEl => {
    let timer
    mEl.addEventListener('touchstart', () => { timer = setTimeout(() => showMessageMenu(mEl.dataset.mid), 450) })
    mEl.addEventListener('touchend', () => clearTimeout(timer))
    mEl.addEventListener('touchmove', () => clearTimeout(timer))
    mEl.addEventListener('contextmenu', e => { e.preventDefault(); showMessageMenu(mEl.dataset.mid) })
  })
}

function showMessageMenu(mid){
  const msgs = getMsgs(activeChatId)
  const m = msgs.find(x => x.id === mid)
  if(!m) return
  const items = []
  if(m.sender === 'me'){ items.push({label:'撤回', fn:() => recallMessage(mid)}); items.push({label:'修改', fn:() => editMessage(mid)}) }
  if(m.sender === 'char'){ items.push({label:'重回', fn:() => regenerateMessage(mid)}) }
  items.push({label:'收藏', fn:() => favoriteMessage(mid)})
  if(m.type === 'text') items.push({label:'复制', fn:() => { try{ navigator.clipboard.writeText(m.text) }catch(e){} toast('已复制') }})
  items.push({label:'删除', fn:() => deleteMessage(mid)})
  showActionSheet(items)
}
function showActionSheet(items){
  const overlay = document.createElement('div')
  overlay.className = 'sheet-overlay'
  overlay.innerHTML = `<div class="sheet">${items.map(i => `<button class="sheet-item" data-fn>${esc(i.label)}</button>`).join('')}<button class="sheet-item sheet-cancel" data-cancel>取消</button></div>`
  document.body.appendChild(overlay)
  const btns = qsa('[data-fn]', overlay)
  items.forEach((it,i) => btns[i].onclick = () => { it.fn(); closeSheet() })
  qs('[data-cancel]', overlay).onclick = closeSheet
  overlay.onclick = e => { if(e.target === overlay) closeSheet() }
}
function closeSheet(){ const s = qs('.sheet-overlay'); if(s) s.remove() }

function deleteMessage(id){ setMsgs(activeChatId, getMsgs(activeChatId).filter(m => m.id !== id)); renderChatDetail() }
function recallMessage(id){
  const msgs = getMsgs(activeChatId).filter(m => m.id !== id)
  msgs.push({ id: uid('m'), sender:'system', type:'system', text:'你撤回了一条消息', time:now() })
  setMsgs(activeChatId, msgs); renderChatDetail()
}
function editMessage(id){
  const msgs = getMsgs(activeChatId); const m = msgs.find(x => x.id === id); if(!m) return
  const nt = prompt('修改消息内容：', m.text || '')
  if(nt === null) return; m.text = nt.trim(); m.type = 'text'; setMsgs(activeChatId, msgs); renderChatDetail()
}
function favoriteMessage(id){
  const m = getMsgs(activeChatId).find(x => x.id === id); if(!m) return
  const favs = getFavorites(); favs.unshift({ id: uid('f'), source: activeChatId, text: m.type==='text' ? m.text : ({image:'[图片]',audio:'[语音]',location:'[位置]',transfer:'[转账]',redpacket:'[红包]'}[m.type]||'[消息]'), time: now() })
  setFavorites(favs); toast('已收藏')
}
function regenerateMessage(id){
  const msgs = getMsgs(activeChatId); const m = msgs.find(x => x.id === id); if(!m) return
  const chat = getChats().find(c => c.id === activeChatId); const char = chat ? getCharByName(chat.name) : null
  const alts = char ? [`${char.name}换了个说法：「其实我一直在想这件事。」`, `「让我重新说，」${char.name}低声道。`, `${char.name}沉默了一瞬，重新组织语言。`] : ['重新组织了一下。']
  m.text = alts[Math.floor(Math.random()*alts.length)]; m.type = 'text'
  setMsgs(activeChatId, msgs); renderChatDetail()
}

function showChatSettings(chatId){
  const chat = getChats().find(c => c.id === chatId)
  const char = chat ? getCharByName(chat.name) : null
  if(!char){ toast('群聊暂无角色设置'); return }
  const wbs = getWorldbooks()
  const selected = char.worldbooks || []
  showModal({
    title: char.name + ' 设置',
    body: `
      <div class="field"><label>角色备注</label><textarea id="csNote" rows="2">${esc(char.note||'')}</textarea></div>
      <div class="field"><label>角色心声</label><input id="csMind" value="${esc(char.mind||'')}"></div>
      <div class="field"><label>挂载世界书（多选）</label><div id="csWb"></div></div>
      <div class="list-group" style="border:1px solid var(--hairline)">
        <div class="list-item"><div class="item-body"><div class="item-title">开启已读不回</div></div><label class="switch"><input type="checkbox" id="csReadNoReply" ${char.readNoReply?'checked':''}><span class="slider"></span></label></div>
        <div class="list-item"><div class="item-body"><div class="item-title">时间感知</div></div><label class="switch"><input type="checkbox" id="csTimeSense" ${char.timeSense?'checked':''}><span class="slider"></span></label></div>
      </div>
      <button class="btn btn-block btn-secondary" id="csSummarize">生成角色内容向量总结</button>
      <div class="field" style="margin-top:10px"><label>向量总结</label><div class="hint" id="csSummary">${esc(char.summary||'点击生成')}</div></div>
    `,
    actions:[
      {label:'关闭', cls:'btn btn-secondary'},
      {label:'保存', cls:'btn', onOk(){
        char.note = qs('#csNote').value.trim()
        char.mind = qs('#csMind').value.trim()
        char.readNoReply = qs('#csReadNoReply').checked
        char.timeSense = qs('#csTimeSense').checked
        char.worldbooks = qsa('#csWb input:checked').map(i => i.value)
        setCharacters(getCharacters())
        renderChatDetail(); closeModal()
      }}
    ]
  })
  const wbBox = qs('#csWb')
  if(wbBox) wbBox.innerHTML = wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0"><input type="checkbox" value="${w.id}" ${selected.includes(w.id)?'checked':''}><span style="font-size:13px">${esc(w.name)}${w.resident?' (常驻)':''}</span></div>`).join('') || '<div class="hint">暂无世界书</div>'
  const sumBtn = qs('#csSummarize')
  if(sumBtn) sumBtn.onclick = () => {
    char.summary = `角色「${char.name}」：${char.persona||''}。${char.mind? '心声：'+char.mind : ''}${char.readNoReply?' · 已读不回':''}${char.timeSense?' · 时间感知':''}`
    setCharacters(getCharacters())
    qs('#csSummary').textContent = char.summary
  }
}

function addMsg(chatId, msg){
  const msgs = getMsgs(chatId)
  msgs.push({ id: uid('m'), ...msg, time: now() })
  setMsgs(chatId, msgs)
  const chats = getChats(); const chat = chats.find(c => c.id === chatId)
  if(chat){ chat.time = now(); chat.last = msg.type === 'text' ? msg.text : ({image:'[图片]',audio:'[语音]',location:'[位置]',transfer:'[转账]',redpacket:'[红包]',call:'[通话]',sticker:'[表情]'}[msg.type]||'[消息]'); setChats(chats) }
  renderChatDetail()
}
function updateMsg(chatId, id, patch){
  const msgs = getMsgs(chatId); const m = msgs.find(x => x.id === id)
  if(m){ Object.assign(m, patch); setMsgs(chatId, msgs); renderChatDetail() }
}

function sendDetailMessage(){
  const input = qs('#detailChatInput')
  const text = input.value.trim(); if(!text) return
  input.value = ''
  addMsg(activeChatId, { sender:'me', type:'text', text })
  const chat = getChats().find(c => c.id === activeChatId)
  if(chat && chat.type === 'group') groupReply(chat)
  else { const char = chat ? getCharByName(chat.name) : null; setTimeout(() => charReply(chat, char), 700) }
}

function showTyping(avatar){
  const list = qs('#detailMessageList')
  list.insertAdjacentHTML('beforeend', `<div class="msg char typing" id="typingMsg"><div class="avatar-s">${esc(avatar||'?')}</div><div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`)
  list.scrollTop = list.scrollHeight
}
function clearTyping(){ const t = qs('#typingMsg'); if(t) t.remove() }

function charReply(chat, char){
  showTyping(char ? (char.name||'?')[0] : '?')
  const replies = char ? [`我在听，你说。`, `${char.name}稍微停了一下，才回复你：「嗯，这件事我记得。」`, `「继续，我想知道更多。」`, `${char.name}没有立刻回答，像在斟酌用词。`] : ['我在。']
  setTimeout(() => { clearTyping(); addMsg(activeChatId, { sender:'char', type:'text', text: replies[Math.floor(Math.random()*replies.length)] }); updateMind() }, 900)
}
function groupReply(chat){
  const members = chat.members || []
  const speaker = getChar(members[Math.floor(Math.random()*members.length)])
  if(!speaker){ showTyping('群'); setTimeout(() => { clearTyping(); addMsg(activeChatId, { sender:'char', type:'text', text:'群里还没有成员。' }) }, 800); return }
  showTyping((speaker.name||'?')[0])
  setTimeout(() => { clearTyping(); addMsg(activeChatId, { sender:'char', type:'text', text:`${speaker.name}：大家都在呢。`, _speaker: speaker.name }); updateMind() }, 900)
}

// 实时心声：根据最近对话更新
function updateMind(){
  const chat = getChats().find(c => c.id === activeChatId); if(!chat) return
  const char = getCharByName(chat.name); if(!char) return
  const msgs = getMsgs(activeChatId)
  const lastUser = [...msgs].reverse().find(m => m.sender === 'me')
  const lastChar = [...msgs].reverse().find(m => m.sender === 'char')
  const topic = lastUser ? trunc(lastUser.text || '', 20) : '刚才的对话'
  char.currentMind = `你刚才提到「${topic}」，${char.name}其实把每个字都听进去了。${lastChar && lastChar.text ? 'ta 刚才说「'+trunc(lastChar.text,20)+'」，' : ''}心里其实比说出来的更多。`
  setCharacters(getCharacters())
}

// 语音消息（模拟微信 UI，实际为文字/合成）
function sendVoice(){
  showModal({ title:'发送语音', body:`<div class="field"><label>语音内容（将转为语音）</label><textarea id="vcText" rows="3" placeholder="输入要说的话"></textarea></div>`, actions:[{label:'取消', cls:'btn btn-secondary'},{label:'发送', cls:'btn', onOk(){ const t = qs('#vcText').value.trim(); if(!t) return; const dur = Math.max(1, Math.round(t.length/2.5)); addMsg(activeChatId, { sender:'me', type:'audio', text:t, duration:dur }); const chat = getChats().find(c => c.id === activeChatId); const char = chat ? getCharByName(chat.name) : null; setTimeout(() => { showTyping(char ? (char.name||'?')[0] : '?'); setTimeout(() => { clearTyping(); addMsg(activeChatId, { sender:'char', type:'audio', text:'听到了，我也在听。', duration:3 }); updateMind() }, 700) }, 600); closeModal() }}] })
}
function bindVoicePlay(){
  qsa('[data-voice]', qs('#detailMessageList')).forEach(v => {
    v.onclick = () => {
      const mid = v.dataset.voice
      const m = getMsgs(activeChatId).find(x => x.id === mid)
      if(m && m.text && 'speechSynthesis' in window){ const u = new SpeechSynthesisUtterance(m.text); u.lang = 'zh-CN'; speechSynthesis.cancel(); speechSynthesis.speak(u) }
      v.classList.toggle('playing')
    }
  })
}
function bindRedPacketOpen(){
  qsa('[data-rp]', qs('#detailMessageList')).forEach(rp => {
    rp.onclick = () => {
      const id = rp.dataset.rp, sender = rp.dataset.rpsender
      const msgs = getMsgs(activeChatId); const m = msgs.find(x => x.id === id)
      if(!m || m.opened) return
      m.opened = true; setMsgs(activeChatId, msgs)
      const chat = getChats().find(c => c.id === activeChatId); const char = chat ? getCharByName(chat.name) : null
      if(sender === 'me'){ setTimeout(() => addMsg(activeChatId, { sender:'char', type:'text', text: char ? `谢谢你的红包，我收到啦，心里很暖。` : '红包已领取。' }), 500) }
      else addMsg(activeChatId, { sender:'system', type:'system', text:'你领取了 ta 的红包' })
      renderChatDetail()
    }
  })
}

// 表情包 / 操作面板
function toggleStickerPanel(){
  const panel = qs('#chatActionPanel')
  if(panel.style.display === 'grid'){ panel.style.display = 'none'; return }
  panel.style.display = 'grid'
  const stickers = getStickers()
  panel.innerHTML = stickers.length ? stickers.map(s => `<button class="action-item" data-src="${esc(s.link)}"><img src="${esc(s.link)}" style="width:52px;height:52px;border-radius:10px;object-fit:cover"><span style="font-size:9px">${esc(s.note)}</span></button>`).join('') : '<div style="grid-column:1/-1;text-align:center;color:var(--muted);font-size:12px">暂无表情包，请在发现页导入</div>'
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
    <button class="action-item" data-a="mind"><div class="ai" style="background:linear-gradient(160deg,#8a7460,#4c4136)">心</div><span>心声</span></button>
  `
  qsa('.action-item[data-a]', panel).forEach(b => b.onclick = () => handleChatAction(b.dataset.a, panel))
}
function handleChatAction(a, panel){
  panel.style.display = 'none'
  if(a === 'photo'){ pickImage(dataUrl => addMsg(activeChatId, { sender:'me', type:'image', dataUrl, text:'' })) }
  else if(a === 'transfer'){ transferCard() }
  else if(a === 'redpacket'){ redPacketCard() }
  else if(a === 'location'){ locationCard() }
  else if(a === 'voicecall'){ startCall('voice') }
  else if(a === 'videocall'){ startCall('video') }
  else if(a === 'sticker'){ toggleStickerPanel() }
  else if(a === 'mind'){ showMindCard() }
}
function transferCard(){
  showModal({ title:'转账', body:`<div class="pay-card"><div class="pay-amt"><span>¥</span><input id="trAmt" type="number" placeholder="0.00"></div><div class="pay-to">转账给 ${esc((getChats().find(c=>c.id===activeChatId)||{}).name||'对方')}</div></div>`, actions:[{label:'取消', cls:'btn btn-secondary'},{label:'转账', cls:'btn', onOk(){ const amt = Number(qs('#trAmt').value||0).toFixed(2); if(amt<=0){ toast('请输入金额'); return }; addMsg(activeChatId, { sender:'me', type:'transfer', text:amt }); closeModal() }}] })
}
function redPacketCard(){
  showModal({ title:'发红包', body:`<div class="pay-card"><div class="pay-amt"><span>¥</span><input id="rpAmt" type="number" placeholder="0.00"></div><div class="pay-sub">单个金额</div><div class="field" style="margin-top:10px"><label>祝福语</label><input id="rpNote" value="恭喜发财，大吉大利"></div></div>`, actions:[{label:'取消', cls:'btn btn-secondary'},{label:'塞钱进红包', cls:'btn', onOk(){ const amt = qs('#rpAmt').value.trim(); if(!amt || Number(amt)<=0){ toast('请输入金额'); return }; addMsg(activeChatId, { sender:'me', type:'redpacket', text:amt, opened:false }); closeModal() }}] })
}
function locationCard(){
  showModal({ title:'发送位置', body:`<div class="field"><label>位置名称</label><input id="locName" placeholder="例如：会展中心 · 2号门"></div><div class="field"><label>详细地址</label><input id="locAddr" placeholder="街道、门牌号等"></div>`, actions:[{label:'取消', cls:'btn btn-secondary'},{label:'发送', cls:'btn', onOk(){ const name = qs('#locName').value.trim(); if(!name){ toast('请输入位置'); return }; addMsg(activeChatId, { sender:'me', type:'location', text:name }); closeModal() }}] })
}
function pickImage(cb){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'
  inp.onchange = () => { const f = inp.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(f) }
  inp.click()
}

// 心声浮动卡片
function showMindCard(){
  const char = currentChar()
  const chat = getChats().find(c => c.id === activeChatId)
  const target = chat ? getCharByName(chat.name) : char
  if(!target){ toast('请先创建角色'); return }
  const mood = target.mood || '平静'
  const status = (target.readNoReply ? '已读不回' : '在线') + (target.timeSense ? ' · 时间感知' : '')
  const monologue = target.currentMind || target.monologue || generateMonologue(target)
  const overlay = document.createElement('div')
  overlay.className = 'mind-overlay'
  overlay.innerHTML = `<div class="mind-card">
    ${avatarHTML(target,'mind-avatar icon-character')}
    <div class="mind-name">${esc(target.name)} 的心声</div>
    <div class="mind-meta"><span class="mind-mood">心情：${esc(mood)}</span><span class="mind-status">状态：${esc(status)}</span></div>
    <div class="mind-text">${esc(monologue)}</div>
    <button class="btn btn-block" data-close-mind>收起</button>
  </div>`
  document.body.appendChild(overlay)
  qs('[data-close-mind]', overlay).onclick = () => overlay.remove()
  overlay.onclick = e => { if(e.target === overlay) overlay.remove() }
}
function generateMonologue(char){
  const base = `${char.name}此刻心里在想：你发来的每一条消息，我都认真看过了。有些话想说，又怕打扰到你。`
  if(char.mind) return char.mind + '。' + base.slice(0, 60)
  return base + '也许下次，我可以更坦率一点，把心里的话都说给你听。'
}

// 视频/语音通话（悬浮在聊天屏幕上）
function startCall(kind){
  const chat = getChats().find(c => c.id === activeChatId)
  const char = chat ? getCharByName(chat.name) : currentChar()
  addMsg(activeChatId, { sender:'me', type:'call', text: kind==='video' ? '视频通话' : '语音通话' })
  const overlay = document.createElement('div')
  overlay.className = 'call-overlay'
  overlay.innerHTML = `
    <div class="call-full">
      <div class="call-avatar icon-character" id="callAvatar">${esc((char?.name||'对')[0])}</div>
      <div class="call-name">${esc(char?.name||'对方')}</div>
      <div class="call-timer" id="callTimer">00:00</div>
      <div class="call-status" id="callStatus">等待对方接听...</div>
      <div class="call-dialogue" id="callDialogue"></div>
      <div class="call-controls">
        <button class="cc-btn" data-cc="mute"><svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5.1c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" fill="currentColor"/></svg></button>
        <button class="cc-btn cc-hangup" data-cc="hangup"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor" transform="rotate(135 12 12)"/></svg></button>
        <button class="cc-btn" data-cc="speaker"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/></svg></button>
      </div>
    </div>`
  document.body.appendChild(overlay)
  const status = qs('#callStatus'), dialogue = qs('#callDialogue'), timer = qs('#callTimer')
  let sec = 0
  const timerInt = setInterval(() => { sec++; timer.textContent = String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(sec%60).padStart(2,'0') }, 1000)
  // 模拟接通与对话
  setTimeout(() => { status.textContent = kind === 'video' ? '视频通话中' : '语音通话中' }, 1500)
  const lines = char ? [
    `${char.name}：「你能看到我吗？」`,
    `${char.name}：「今天过得怎么样？」`,
    `你：「${kind==='video'?'能看到，很清楚':'听得很清楚'}。」`,
    `${char.name}：「那就好，我想多陪陪你。」`
  ] : ['对方：「喂，能听到吗？」']
  let li = 0
  const speak = () => {
    if(li < lines.length){ dialogue.innerHTML += `<div class="cd-line">${esc(lines[li])}</div>`; dialogue.scrollTop = dialogue.scrollHeight; li++; setTimeout(speak, 2200) }
  }
  setTimeout(speak, 2000)
  qsa('[data-cc]', overlay).forEach(b => b.onclick = () => {
    const c = b.dataset.cc
    if(c === 'hangup'){ clearInterval(timerInt); overlay.remove() }
    else if(c === 'mute'){ b.classList.toggle('active'); status.textContent = b.classList.contains('active') ? '已静音' : (kind==='video'?'视频通话中':'语音通话中') }
  })
}

// ============ 子页面（朋友圈/收藏/表情包） ============
function renderSubPage(key){
  const container = qs('#appContainer')
  container.innerHTML = `<div class="app-screen"><header class="app-header"><button class="header-btn back" data-action="back"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><h1 class="header-title">${SUBPAGES[key]}</h1><span class="header-spacer"></span></header><div class="app-body" id="subBody"></div></div>`
  qs('[data-action="back"]').onclick = () => goBack()
  const body = qs('#subBody')
  if(key === 'moments') renderMoments(body); else if(key === 'favorites') renderFavorites(body); else if(key === 'stickers') renderStickerManage(body)
}
function renderMoments(body){
  const moments = getMoments()
  body.innerHTML = `<div class="field"><textarea id="momentText" rows="2" placeholder="这一刻想分享什么"></textarea><div style="margin-top:8px"><button class="btn btn-block" id="postMomentBtn">发表</button></div></div>` + moments.map(m => `
    <div class="moment-item"><div class="m-head"><div class="m-avatar icon-character">${esc((m.author||'我')[0])}</div><div><div class="m-name">${esc(m.author||'我')}</div><div class="m-time">${timeAgo(m.time)}</div></div></div><div class="m-text">${esc(m.text)}</div>${m.image?`<img class="m-img" src="${m.image}">`:''}<div class="m-actions"><span>赞 ${(m.likes||[]).length}</span><span>评论 ${(m.comments||[]).length}</span></div></div>
  `).join('')
  qs('#postMomentBtn').onclick = () => { const t = qs('#momentText').value.trim(); if(!t){ toast('请输入内容'); return }; const p = currentProfile()||{}; const mm = getMoments(); mm.unshift({ id:uid('mm'), author:p.name||'我', text:t, time:now(), likes:[], comments:[] }); setMoments(mm); renderMoments(body) }
}
function renderFavorites(body){
  const favs = getFavorites()
  body.innerHTML = favs.length ? favs.map(f => `<div class="list-item"><div class="item-body"><div class="item-title" style="font-size:14px">${esc(f.text)}</div><div class="item-sub">${timeAgo(f.time)}</div></div></div>`).join('') : '<div class="empty">暂无收藏，长按聊天消息即可收藏</div>'
}
function renderStickerManage(body){
  body.innerHTML = `<div class="card"><div class="field"><label>图床链接</label><input id="stLink" placeholder="https://.../表情.png"></div><div class="field"><label>中文说明（必须含汉字）</label><input id="stNote" placeholder="例如：这是一个眨眼卖萌的表情"></div><button class="btn btn-block" id="addStBtn">导入表情包</button></div><div id="stList"></div>`
  qs('#addStBtn').onclick = () => { const link = qs('#stLink').value.trim(); const note = qs('#stNote').value.trim(); if(!link||!note){ toast('请填写链接和说明'); return }; if(!/[\u4e00-\u9fa5]/.test(note)){ toast('说明必须含汉字'); return }; const st = getStickers(); st.unshift({ link, note }); setStickers(st); qs('#stLink').value=''; qs('#stNote').value=''; renderStickerList(qs('#stList')) }
  renderStickerList(qs('#stList'))
}
function renderStickerList(el){
  const st = getStickers()
  el.innerHTML = st.length ? `<div class="item-grid" style="grid-template-columns:repeat(3,1fr)">` + st.map(s => `<div class="sweet-item"><img src="${esc(s.link)}" style="width:100%;height:60px;object-fit:cover;border-radius:8px"><div class="si-name" style="font-size:10px">${esc(s.note)}</div></div>`).join('') + `</div>` : '<div class="empty">暂无表情包</div>'
}

// ============ 设置 ============
function renderSettings(){
  const body = qs('#settingsBody')
  const s = getSettings()
  const profiles = getProfiles(); const ap = getActiveProfile()
  body.innerHTML = `
    <div class="section-title">用户配置（多套）</div>
    <div class="list-group">${profiles.map(p => `<div class="list-item" data-profile="${p.id}"><div class="item-body"><div class="item-title">${esc(p.name||'未命名')}${p.id===ap?' (当前)':''}</div><div class="item-sub">${esc(p.persona||'')}</div></div><span class="chevron">›</span></div>`).join('')}</div>
    <button class="btn btn-block" id="addProfileBtn">+ 新建用户配置</button>

    <div class="section-title">字体与外观</div>
    <div class="card">
      <div class="field"><label>系统字体（上传 woff/woff2/ttf）</label><input type="file" id="setFontFile" accept=".woff,.woff2,.ttf,.otf"></div>
      <div class="field"><label>自定义字体 URL</label><input id="setFontUrl" value="${esc(s.fontUrl)}" placeholder="https://.../font.woff2"></div>
      <div class="field"><label>字体大小：<span id="fsVal">${s.fontSize}px</span></label><input type="range" id="setFontSize" min="12" max="24" value="${s.fontSize}"></div>
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
      <div class="list-group" style="border:1px solid var(--hairline)"><div class="list-item"><div class="item-body"><div class="item-title">前端通知</div></div><label class="switch"><input type="checkbox" id="setNotify" ${s.notify?'checked':''}><span class="slider"></span></label></div></div>
      <button class="btn btn-secondary btn-block" id="exportBackupBtn">导出备份</button>
      <div class="field" style="margin-top:10px"><label>导入备份</label><input type="file" id="importBackupInput" accept="application/json"></div>
    </div>
  `
  qs('#setFontSize').oninput = e => { qs('#fsVal').textContent = e.target.value + 'px' }
  qs('#setFontFile').onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { s.fontUrl = r.result; saveSettings(s); toast('字体已加载'); applyFontToDoc() }; r.readAsDataURL(f) }
  qs('#applyFontBtn').onclick = () => { s.fontUrl = qs('#setFontUrl').value.trim(); s.fontSize = qs('#setFontSize').value; saveSettings(s); applyFontToDoc(); toast('已应用') }
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
    if(s.fontUrl.startsWith('data:') || s.fontUrl.startsWith('http')){
      const ff = new FontFace('CustomUI', `url(${s.fontUrl})`)
      ff.load().then(f => { document.fonts.add(f); document.documentElement.style.fontFamily = 'CustomUI, -apple-system, system-ui' }).catch(()=>{})
    }
  } else { document.documentElement.style.fontFamily = '' }
}
function applyWallpaper(){
  const custom = store.raw('wallpaper_custom')
  const veil = qs('.wallpaper-veil')
  if(veil && custom) veil.style.backgroundImage = `url(${custom})`
}
function profileForm(id){
  const p = id ? getProfiles().find(x => x.id === id) : null
  showModal({ title: p ? '编辑用户配置' : '新建用户配置', body:`<div class="field"><label>名称</label><input id="pfName" value="${esc(p?.name||'')}"></div><div class="field"><label>人设（性格/口吻/背景）</label><textarea id="pfPersona" rows="4">${esc(p?.persona||'')}</textarea></div>`, actions:[{label:'取消', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){ const name = qs('#pfName').value.trim(); if(!name){ toast('请输入名称'); return }; const profiles = getProfiles(); if(p){ p.name = name; p.persona = qs('#pfPersona').value.trim() } else { const np = { id:uid('p'), name, persona: qs('#pfPersona').value.trim() }; profiles.push(np); setActiveProfile(np.id) }; setProfiles(profiles); renderSettings(); closeModal() }}] })
}
function exportBackup(){
  const data = { settings:getSettings(), profiles:getProfiles(), characters:getCharacters(), worldbooks:getWorldbooks(), styles:getStyles(), chats:getChats(), moments:getMoments(), favorites:getFavorites(), diary:getDiary(), tasks:getTasks(), points:getPoints() }
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'xiaomeng_backup.json'; a.click()
}
function importBackup(file){
  if(!file) return
  const r = new FileReader()
  r.onload = () => { try{ const d = JSON.parse(r.result); if(d.settings) saveSettings(d.settings); if(d.profiles) setProfiles(d.profiles); if(d.characters) setCharacters(d.characters); if(d.worldbooks) setWorldbooks(d.worldbooks); if(d.styles) setStyles(d.styles); if(d.chats) setChats(d.chats); if(d.moments) setMoments(d.moments); if(d.favorites) setFavorites(d.favorites); if(d.diary) setDiary(d.diary); if(d.tasks) setTasks(d.tasks); if(d.points!=null) setPoints(d.points); toast('备份导入成功'); renderSettings() }catch(e){ toast('导入失败') } }
  r.readAsText(file)
}

// ============ 角色设定 ============
function renderCharacter(){
  const body = qs('#characterBody')
  const chars = getCharacters()
  const ac = getActiveChar()
  if(!chars.length){ body.innerHTML = '<div class="empty">暂无角色，点右上角 + 新建</div>'; return }
  const cards = chars.map(c => {
    const wbCount = (c.worldbooks||[]).length + (c.residentWorldbooks||[]).length
    return `<div class="char-card-big ${c.id===ac?'active':''}">
      ${c.id===ac ? '<div class="cc-badge">使用中</div>' : ''}
      <div class="cc-head">${avatarHTML(c,'cc-avatar icon-character')}<div><div class="cc-name">${esc(c.name)}</div><div class="cc-tags">${esc((c.tags||[]).join('、')||'无标签')} · ${wbCount} 本世界书</div></div></div>
      <div class="cc-persona">${esc(trunc(c.persona||'未填写人设',60))}</div>
      <div class="cc-actions">
        <button class="btn btn-sm" data-use="${c.id}">${c.id===ac?'当前角色':'设为当前'}</button>
        <button class="btn btn-sm btn-secondary" data-edit="${c.id}">编辑</button>
        <button class="btn btn-sm btn-ghost" data-del="${c.id}">删除</button>
      </div>
    </div>`
  })
  body.innerHTML = `<div class="char-list">${cards.join('')}</div>`
  qsa('[data-use]', body).forEach(b => b.onclick = () => { setActiveChar(b.dataset.use); renderCharacter() })
  qsa('[data-edit]', body).forEach(b => b.onclick = () => charForm(b.dataset.edit))
  qsa('[data-del]', body).forEach(b => b.onclick = () => { if(confirm('删除该角色？')){ const id = b.dataset.del; setCharacters(getCharacters().filter(c => c.id !== id)); if(getActiveChar() === id) setActiveChar(getCharacters()[0]?.id || null); renderCharacter() } })
}

function charForm(id){
  const c = id ? getChar(id) : null
  const wbs = getWorldbooks()
  const onlineStyles = getStyles().filter(s => s.mode !== 'offline')
  const offlineStyles = getStyles().filter(s => s.mode === 'offline')
  showModal({ title: c ? '编辑角色' : '新建角色', body: `
    <div class="field"><label>角色名</label><input id="cfName" value="${esc(c?.name||'')}"></div>
    <div class="field"><label>人设（性格/背景/经历）</label><textarea id="cfPersona" rows="3">${esc(c?.persona||'')}</textarea></div>
    <div class="field"><label>标签（顿号分隔）</label><input id="cfTags" value="${esc((c?.tags||[]).join('、'))}"></div>
    <div class="field"><label>头像（可上传图片）</label><input type="file" id="cfAvatar" accept="image/*">${c?.avatar?'<div class="hint">已设置头像，重新上传可替换</div>':''}</div>
    <div class="field"><label>心情</label><input id="cfMood" value="${esc(c?.mood||'')}" placeholder="例如：平静、想念、期待"></div>
    <div class="field"><label>心声（约100字内心独白）</label><textarea id="cfMonologue" rows="3">${esc(c?.monologue||'')}</textarea></div>
    <div class="field"><label>气泡颜色</label><input type="color" id="cfBubble" value="${esc(c?.bubbleColor||'#26292f')}"></div>
    <div class="field"><label>聊天背景（文件）</label><input type="file" id="cfBg" accept="image/*"></div>
    <div class="field"><label>聊天背景 URL</label><input id="cfBgUrl" value="${esc(c?.chatBgUrl||'')}"></div>
    <div class="guard-box"><div class="guard-title">防串味 / 防人设混淆</div>
      <div class="field"><label>说话口吻</label><input id="cfSpeech" value="${esc(c?.guard?.speechStyle||'')}" placeholder="例如：温柔克制、短句、留白"></div>
      <div class="field"><label>绝对禁止提及（顿号分隔）</label><input id="cfForbidden" value="${esc((c?.guard?.forbiddenTopics||[]).join('、'))}"></div>
      <div class="field"><label>注意避免（负面提示）</label><textarea id="cfNegative" rows="2">${esc(c?.guard?.negativePrompts||'')}</textarea></div>
    </div>
    <div class="field"><label>挂载世界书（多选）</label><div id="cfWb"></div></div>
    <div class="field"><label>常驻世界书（始终生效）</label><div id="cfWbResident"></div></div>
    <div class="field"><label>线上文风</label><select id="cfOnlineStyle">${onlineStyles.map(s => `<option value="${s.id}" ${(c?.onlineStyle===s.id)?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="field"><label>线下文风</label><select id="cfOfflineStyle">${offlineStyles.map(s => `<option value="${s.id}" ${(c?.offlineStyle===s.id)?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
  `, actions:[
    {label:'取消', cls:'btn btn-secondary'},
    {label:'保存', cls:'btn', onOk(){
      const name = qs('#cfName').value.trim(); if(!name){ toast('请输入角色名'); return }
      const avatarFile = qs('#cfAvatar').files[0]
      const doSave = (avatarDataUrl) => {
        const readBg = (cb) => { const bf = qs('#cfBg').files[0]; if(!bf) return cb(null); const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(bf) }
        readBg(bgDataUrl => {
          const data = {
            name, persona: qs('#cfPersona').value.trim(),
            tags: qs('#cfTags').value.split('、').map(t=>t.trim()).filter(Boolean),
            mood: qs('#cfMood').value.trim(),
            monologue: qs('#cfMonologue').value.trim(),
            bubbleColor: qs('#cfBubble').value,
            avatar: avatarDataUrl || c?.avatar,
            chatBg: bgDataUrl || c?.chatBg,
            chatBgUrl: qs('#cfBgUrl').value.trim(),
            guard: { speechStyle: qs('#cfSpeech').value.trim(), forbiddenTopics: qs('#cfForbidden').value.split('、').map(t=>t.trim()).filter(Boolean), negativePrompts: qs('#cfNegative').value.trim() },
            worldbooks: qsa('#cfWb input:checked').map(i => i.value),
            residentWorldbooks: qsa('#cfWbResident input:checked').map(i => i.value),
            onlineStyle: qs('#cfOnlineStyle').value, offlineStyle: qs('#cfOfflineStyle').value,
            readNoReply: c?.readNoReply || false, timeSense: c?.timeSense !== false,
          }
          const chars = getCharacters()
          if(c){ const idx = chars.findIndex(x => x.id === c.id); chars[idx] = { ...c, ...data } }
          else { data.id = uid('char'); chars.push(data); setActiveChar(data.id) }
          setCharacters(chars); renderCharacter(); closeModal(); toast('已保存')
        })
      }
      if(avatarFile){ const r = new FileReader(); r.onload = () => doSave(r.result); r.readAsDataURL(avatarFile) }
      else doSave(null)
    }}
  ]})
  const wbBox = qs('#cfWb'), wbResident = qs('#cfWbResident')
  if(wbBox) wbBox.innerHTML = wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><input type="checkbox" value="${w.id}" ${(c?.worldbooks||[]).includes(w.id)?'checked':''}><span style="font-size:13px">${esc(w.name)}</span></div>`).join('') || '<div class="hint">暂无世界书</div>'
  if(wbResident) wbResident.innerHTML = wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><input type="checkbox" value="${w.id}" ${(c?.residentWorldbooks||[]).includes(w.id)?'checked':''}><span style="font-size:13px">${esc(w.name)}</span></div>`).join('') || '<div class="hint">暂无世界书</div>'
}

// ============ 世界书 ============
function renderWorldbook(){
  const body = qs('#worldbookBody')
  body.innerHTML = `
    <div class="card"><h3>导入世界书</h3>
      <div class="field"><label>导入文件（txt / docx / json / md）</label><input type="file" id="wbFile" accept=".txt,.docx,.json,.md,.mdx"></div>
      <div class="field"><label>或粘贴文本</label><textarea id="wbPaste" rows="4" placeholder="直接粘贴世界书内容..."></textarea></div>
      <div class="field"><label>名称</label><input id="wbName" placeholder="世界书名称"></div>
      <button class="btn btn-block" id="wbAddBtn">添加世界书</button>
    </div>
    <div class="section-title">我的世界书</div><div id="wbList"></div>
  `
  qs('#wbAddBtn').onclick = addWorldbook
  qs('#wbFile').onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { qs('#wbPaste').value = r.result; if(!qs('#wbName').value) qs('#wbName').value = f.name.replace(/\.[^.]+$/,'') }; r.readAsText(f) }
  renderWbList(qs('#wbList'))
}
function addWorldbook(){
  const name = qs('#wbName').value.trim(); const content = qs('#wbPaste').value.trim()
  if(!name || !content){ toast('请填写名称和内容'); return }
  const wbs = getWorldbooks(); wbs.push({ id:uid('wb'), name, content, resident:false, priority:wbs.length+1, source:'import', createdAt:now() })
  setWorldbooks(wbs); qs('#wbName').value=''; qs('#wbPaste').value=''; renderWbList(qs('#wbList')); toast('世界书已添加')
}
function renderWbList(el){
  const wbs = getWorldbooks()
  el.innerHTML = wbs.map(w => `
    <div class="wb-item">
      <div class="wb-top"><div class="wb-name">${esc(w.name)}</div><label class="switch" title="是否常驻"><input type="checkbox" data-resident="${w.id}" ${w.resident?'checked':''}><span class="slider"></span></label></div>
      <div class="wb-content">${esc(trunc(w.content, 80))}</div>
      <div class="wb-meta"><span>${w.resident?'常驻':'非驻留'}</span><span>优先级 ${w.priority}</span><span>${w.content.length} 字</span></div>
      <div class="wb-actions"><button class="btn btn-sm btn-secondary" data-edit="${w.id}">查看/编辑</button><button class="btn btn-sm" data-up="${w.id}">优先级 ↑</button><button class="btn btn-sm btn-ghost" data-del="${w.id}">删除</button></div>
    </div>`).join('') || '<div class="empty">暂无世界书，请导入</div>'
  qsa('[data-resident]', el).forEach(i => i.onchange = () => { const w = getWorldbooks().find(x => x.id === i.dataset.resident); w.resident = i.checked; setWorldbooks(getWorldbooks()); renderWbList(el) })
  qsa('[data-edit]', el).forEach(b => b.onclick = () => wbForm(b.dataset.edit))
  qsa('[data-del]', el).forEach(b => b.onclick = () => { if(confirm('删除？')){ setWorldbooks(getWorldbooks().filter(x => x.id !== b.dataset.del)); renderWbList(el) } })
  qsa('[data-up]', el).forEach(b => b.onclick = () => { const wbs = getWorldbooks(); const w = wbs.find(x => x.id === b.dataset.up); if(w.priority > 1){ const other = wbs.find(x => x.priority === w.priority-1); if(other) other.priority++; w.priority--; setWorldbooks(wbs); renderWbList(el) } })
}
function wbForm(id){
  const w = getWorldbooks().find(x => x.id === id); if(!w) return
  showModal({ title:'编辑世界书', body:`<div class="field"><label>名称</label><input id="ewName" value="${esc(w.name)}"></div><div class="field"><label>内容</label><textarea id="ewContent" rows="6">${esc(w.content)}</textarea></div>`, actions:[{label:'取消', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){ w.name = qs('#ewName').value.trim(); w.content = qs('#ewContent').value.trim(); setWorldbooks(getWorldbooks()); renderWorldbook(); closeModal() }}] })
}

// ============ 文风 ============
function renderStyle(){
  const body = qs('#styleBody')
  const styles = getStyles()
  body.innerHTML = styles.map(s => `
    <div class="wb-item">
      <div class="wb-top"><div class="wb-name">${esc(s.name)}</div><span class="chip ${s.mode==='offline'?'active':''}" style="font-size:10px;padding:3px 9px">${s.mode==='offline'?'线下':'线上'}</span></div>
      <div class="wb-content">${esc(trunc((s.scene||'')+(s.scene?' · ':'')+s.content, 80))}</div>
      <div class="wb-actions"><button class="btn btn-sm btn-secondary" data-edit="${s.id}">编辑</button><button class="btn btn-sm" data-toggle="${s.id}">${s.mode==='offline'?'转线上':'转线下'}</button><button class="btn btn-sm btn-ghost" data-del="${s.id}">删除</button></div>
    </div>`).join('') || '<div class="empty">暂无文风，点右上角 + 新建</div>'
  qsa('[data-edit]', body).forEach(b => b.onclick = () => styleForm(b.dataset.edit))
  qsa('[data-toggle]', body).forEach(b => b.onclick = () => { const s = getStyles().find(x => x.id === b.dataset.toggle); s.mode = s.mode === 'offline' ? 'online' : 'offline'; setStyles(getStyles()); renderStyle() })
  qsa('[data-del]', body).forEach(b => b.onclick = () => { if(confirm('删除？')){ setStyles(getStyles().filter(x => x.id !== b.dataset.del)); renderStyle() } })
}
function styleForm(id){
  const s = id ? getStyles().find(x => x.id === id) : null
  showModal({ title: s ? '编辑文风' : '新建文风', body:`<div class="field"><label>名称</label><input id="sfName" value="${esc(s?.name||'')}"></div><div class="field"><label>适用场景</label><input id="sfScene" value="${esc(s?.scene||'')}"></div><div class="field"><label>风格内容</label><textarea id="sfContent" rows="5">${esc(s?.content||'')}</textarea></div><div class="field"><label>类型</label><select id="sfMode"><option value="online" ${s?.mode!=='offline'?'selected':''}>线上</option><option value="offline" ${s?.mode==='offline'?'selected':''}>线下</option></select></div>`, actions:[{label:'取消', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){ const name = qs('#sfName').value.trim(); const content = qs('#sfContent').value.trim(); if(!name||!content){ toast('名称和内容不能为空'); return }; const obj = { name, scene: qs('#sfScene').value.trim(), content, mode: qs('#sfMode').value }; const styles = getStyles(); if(s) Object.assign(s, obj); else { obj.id = uid('style'); styles.unshift(obj) }; setStyles(styles); renderStyle(); closeModal() }}] })
}

// ============ 网易云音乐 ============
let playing = false, lyricTimer = null
function renderMusic(){
  const body = qs('#musicBody')
  const tracks = store.get('tracks', [])
  const user = store.get('neteaseUser', null)
  const currentTrack = store.get('currentTrack', null)
  body.innerHTML = `
    <div class="music-top">
      <div class="music-login">
        <div class="avatar" id="ncAvatar">${user ? esc((user.nickname||'网')[0]) : '云'}</div>
        <div><div class="nick">${user ? esc(user.nickname) : '未登录'}</div><div class="status">${user ? '已登录网易云账号' : '点击登录'}</div></div>
        <div style="flex:1"></div>
        <button class="btn btn-sm" id="neteaseLogin">${user?'退出':'登录'}</button>
      </div>
      <div class="music-tabs">
        <button class="tab active" data-mt="local">本地音乐</button>
        <button class="tab" data-mt="listen">与 ta 共听</button>
        <button class="tab" data-mt="lyrics">歌词</button>
        <button class="tab" data-mt="import">导入/搜索</button>
      </div>
    </div>
    <div class="music-body-inner" id="musicInner"></div>
    <div class="player-bar" id="playerBar" style="display:${tracks.length?'flex':'none'}">
      <div class="pb-art"></div>
      <div class="pb-info"><div class="pb-name" id="pbName">${esc(currentTrack?.name||'未播放')}</div><div class="pb-artist" id="pbArtist">${esc(currentTrack?.artist||'')}</div></div>
      <button class="pb-btn" id="pbPlay"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
    </div>
  `
  qs('#neteaseLogin').onclick = () => { if(user){ store.set('neteaseUser', null); renderMusic() } else showQrLogin() }
  const renderInner = tab => {
    qsa('.music-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.mt === tab))
    const inner = qs('#musicInner')
    if(tab === 'local') renderTrackList(inner, tracks)
    else if(tab === 'listen') renderListenTogether(inner)
    else if(tab === 'lyrics') renderLyrics(inner, currentTrack)
    else if(tab === 'import') renderMusicImport(inner)
  }
  qsa('.music-tabs .tab').forEach(t => t.onclick = () => renderInner(t.dataset.mt))
  qs('#pbPlay').onclick = () => { playing = !playing; qs('#pbPlay').innerHTML = playing ? '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; qs('.pb-art').style.animationPlayState = playing ? 'running' : 'paused' }
  renderInner('local')
}
function showQrLogin(){
  showModal({ title:'扫码登录网易云', body:`<div class="qr-box"><svg viewBox="0 0 100 100" class="qr-img"><g fill="#fff"><rect x="10" y="10" width="34" height="34" rx="3"/><rect x="56" y="10" width="34" height="34" rx="3"/><rect x="10" y="56" width="34" height="34" rx="3"/></g></svg><div class="qr-tip">请使用网易云音乐 App 扫码登录</div></div>`, actions:[{label:'模拟登录成功', cls:'btn btn-block', onOk(){ store.set('neteaseUser', { nickname:'云村用户' + Math.floor(Math.random()*1000) }); renderMusic(); closeModal(); toast('登录成功') }}] })
}
function renderTrackList(el, tracks){
  el.innerHTML = tracks.length ? tracks.map((t,i) => `<div class="track-row" data-i="${i}"><div class="track-idx">${i+1}</div><div class="track-info"><div class="track-name">${esc(t.name)}</div><div class="track-artist">${esc(t.artist)}</div></div><div class="track-play">♪</div></div>`).join('') : '<div class="empty">暂无音乐，请导入或搜索</div>'
  qsa('.track-row', el).forEach(r => r.onclick = () => {
    const t = tracks[+r.dataset.i]
    store.set('currentTrack', t)
    qs('#pbName').textContent = t.name; qs('#pbArtist').textContent = t.artist; qs('#playerBar').style.display = 'flex'
    if(t.url){ const a = new Audio(t.url); a.play().catch(()=>{}) }
    playing = true; qs('#pbPlay').innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
    qs('.pb-art').style.animationPlayState = 'running'
  })
}
function renderListenTogether(el){
  const char = currentChar()
  el.innerHTML = `<div class="card"><h3>与 ta 一起听</h3><div class="empty" style="padding:20px">${char ? `正在与 ${esc(char.name)} 共听，选一首歌开始吧` : '暂无角色'}</div><div id="listenList"></div></div>`
  renderTrackList(qs('#listenList'), store.get('tracks', []))
}
function renderMusicImport(el){
  el.innerHTML = `<div class="card"><div class="field"><label>本地导入歌曲</label><input type="file" id="trackFile" accept="audio/*"></div><div class="field"><label>联网搜索</label><input id="searchInput" placeholder="歌名/歌手"><button class="btn btn-block" id="searchBtn" style="margin-top:8px">搜索</button></div><div id="searchResults"></div></div>`
  qs('#trackFile').onchange = e => { const f = e.target.files[0]; if(!f) return; const url = URL.createObjectURL(f); const tracks = store.get('tracks', []); tracks.push({ name: f.name.replace(/\.[^.]+$/,''), artist: '本地导入', url }); store.set('tracks', tracks); toast('已导入') }
  qs('#searchBtn').onclick = () => musicSearch(qs('#searchInput').value.trim())
}
function musicSearchModal(){ showModal({ title:'联网搜索', body:`<div class="field"><input id="searchQuery" placeholder="输入歌名/歌手"></div>`, actions:[{label:'搜索', cls:'btn btn-block', onOk(){ const qv = qs('#searchQuery').value.trim(); if(qv){ musicSearch(qv) } }}] }) }
function musicSearch(qv){
  const box = qs('#searchResults'); if(!box) return
  const results = [ { name: qv, artist: '搜索结果 1' }, { name: qv + ' (Live)', artist: '搜索结果 2' }, { name: qv + ' (Remix)', artist: '搜索结果 3' } ]
  box.innerHTML = `<div class="section-title">搜索结果</div>` + results.map((r,i) => `<div class="track-row" data-sr="${i}"><div class="track-info"><div class="track-name">${esc(r.name)}</div><div class="track-artist">${esc(r.artist)}</div></div><div class="track-play">+</div></div>`).join('')
  qsa('[data-sr]', box).forEach(r => r.onclick = () => { const t = results[+r.dataset.sr]; const tracks = store.get('tracks', []); tracks.push({ name: t.name, artist: t.artist }); store.set('tracks', tracks); toast('已加入本地音乐') })
}

// 歌词面板
function renderLyrics(el, track){
  const lyrics = store.get('lyrics_' + (track?.name || ''), defaultLyrics())
  let idx = 0
  el.innerHTML = `<div class="card"><h3>歌词</h3><div class="lyrics-box" id="lyricsBox"></div></div>`
  const box = qs('#lyricsBox')
  box.innerHTML = lyrics.map((l,i) => `<div class="lyric-line" data-i="${i}">${esc(l)}</div>`).join('')
  if(lyricTimer) clearInterval(lyricTimer)
  lyricTimer = setInterval(() => {
    qsa('.lyric-line', box).forEach((l,i) => l.classList.toggle('active', i === idx))
    idx = (idx + 1) % lyrics.length
    const active = qs('.lyric-line.active', box); if(active) box.scrollTop = active.offsetTop - box.clientHeight/2
  }, 3000)
}
function defaultLyrics(){ return ['晓梦生','在灰与萌的边界','你把心事轻轻折叠','寄给另一端的我','风穿过安静的街角','时间在此刻停泊','我们隔着屏幕相望','却像并肩走过','每一句未说出口的话','都藏在旋律里漂泊'] }

// ============ 情侣空间 ============
function renderCouple(){
  const body = qs('#coupleBody')
  const points = getPoints(); const char = currentChar()
  body.innerHTML = `
    <div class="couple-hero"><div class="points">${points}</div><div class="points-label">恋爱积分</div><div class="hearts">与 ${esc(char?.name||'ta')} 的甜蜜值</div></div>
    <div class="section-title">每日日记</div>
    <div class="card"><div class="btn-row"><button class="btn" id="genDiaryNow">立即生成今日日记</button><button class="btn btn-secondary" id="genDiarySchedule">定时生成</button></div><div id="diaryList" style="margin-top:12px"></div></div>
    <div class="section-title">情侣任务</div>
    <div class="card"><div class="field"><input id="newTaskInput" placeholder="添加想一起做的事"></div><button class="btn btn-block btn-secondary" id="addTaskBtn">添加任务</button><div id="taskList" style="margin-top:12px"></div></div>
    <div class="section-title">甜蜜道具兑换</div><div class="item-grid" id="itemGrid"></div>
  `
  renderDiaryList(qs('#diaryList')); renderTaskList(qs('#taskList')); renderItems(qs('#itemGrid'))
  qs('#genDiaryNow').onclick = () => generateDiary()
  qs('#genDiarySchedule').onclick = () => { toast('已设置每日 21:00 定时生成'); memorySet('diarySchedule', '21:00') }
  qs('#addTaskBtn').onclick = () => { const v = qs('#newTaskInput').value.trim(); if(!v) return; const tasks = getTasks(); tasks.push({ id:uid('t'), text:v, done:false, points:10 }); setTasks(tasks); qs('#newTaskInput').value=''; renderTaskList(qs('#taskList')) }
}
function generateDiary(){
  const char = currentChar()
  const diary = getDiary()
  diary.unshift({ id:uid('d'), date: new Date().toLocaleDateString(), text: `今天，${char?.name||'ta'}在日记里写道：「今天的风很轻，我想起你笑起来的样子。有些话藏在心里很久了，下次见面，我想亲口对你说。」`, time:now() })
  setDiary(diary); renderDiaryList(qs('#diaryList')); toast('日记已生成')
}
function renderDiaryList(el){ const diary = getDiary(); el.innerHTML = diary.length ? diary.map(d => `<div class="diary-item"><div class="d-date">${esc(d.date)}</div><div class="d-text">${esc(d.text)}</div></div>`).join('') : '<div class="empty">还没有日记，点击生成</div>' }
function renderTaskList(el){
  const tasks = getTasks()
  el.innerHTML = tasks.length ? tasks.map(t => `<div class="task-row"><label class="switch"><input type="checkbox" data-task="${t.id}" ${t.done?'checked':''}><span class="slider"></span></label><div class="task-name">${esc(t.text)}</div><div class="task-points">+${t.points}</div></div>`).join('') : '<div class="empty">暂无任务</div>'
  qsa('[data-task]', el).forEach(i => i.onchange = () => { const tasks = getTasks(); const t = tasks.find(x => x.id === i.dataset.task); t.done = i.checked; if(t.done) setPoints(getPoints() + t.points); setTasks(tasks); renderCouple() })
}
function renderItems(el){
  const items = [ { name:'早安吻', icon:'吻', cost:20, cls:'icon-couple' }, { name:'拥抱券', icon:'抱', cost:30, cls:'icon-checkphone' }, { name:'一起看电影', icon:'影', cost:50, cls:'icon-music' }, { name:'晚安语音', icon:'晚', cost:25, cls:'icon-character' }, { name:'专属情书', icon:'书', cost:80, cls:'icon-worldbook' }, { name:'秘密约会', icon:'约', cost:100, cls:'icon-reading' } ]
  let itemPage = 1
  const draw = () => { const pg = paginate(items, itemPage, 6); el.innerHTML = pg.items.map(it => `<div class="sweet-item"><div class="si-icon ${it.cls}">${it.icon}</div><div class="si-name">${it.name}</div><div class="si-cost">${it.cost} 积分</div></div>`).join('') + `<div id="itemPager" style="grid-column:1/-1"></div>`; const pagerEl = qs('#itemPager'); if(pagerEl) pagerEl.innerHTML = pagerHTML(pg, p => { itemPage = p; draw() }); qsa('.sweet-item', el).forEach((n,i) => n.onclick = () => { const it = pg.items[i]; if(getPoints() >= it.cost){ setPoints(getPoints() - it.cost); toast(`已兑换「${it.name}」`); renderCouple() } else toast('积分不足') }) }
  draw()
}

// ============ 查看手机（拟真） ============
function renderCheckPhone(){
  const body = qs('#checkphoneBody')
  const char = currentChar()
  const cName = char?.name || 'ta'
  body.innerHTML = `
    <div class="section-title">${esc(cName)} 的手机</div>
    <div class="phone-mock">
      <div class="pm-status"><span>09:41</span><div class="pm-status-icons">●●●</div></div>
      <div class="pm-wallpaper"></div>
      <div class="pm-apps">
        ${checkApps().map(a => `<div class="pm-app" data-app="${a.id}"><div class="pm-icon ${a.cls}">${a.icon}</div><span>${a.name}</span></div>`).join('')}
      </div>
    </div>
    <div class="card"><button class="btn btn-block btn-secondary" id="reverseCheck">反向：查看 user 的手机</button></div>
    <div id="charPhoneContent"></div>
  `
  qsa('.pm-app', body).forEach(app => app.onclick = () => openCharApp(app.dataset.app, char))
  qs('#reverseCheck').onclick = () => reverseCheckPhone()
}
function checkApps(){
  return [
    { id:'wechat', name:'微信', icon:'微', cls:'icon-character' },
    { id:'notes', name:'便签', icon:'签', cls:'icon-notes' },
    { id:'diary', name:'日记', icon:'日', cls:'icon-couple' },
    { id:'gallery', name:'相册', icon:'照', cls:'icon-photos' },
    { id:'contacts', name:'通讯录', icon:'录', cls:'icon-style' },
    { id:'messages', name:'短信', icon:'信', cls:'icon-mail' },
    { id:'browser', name:'浏览器', icon:'浏', cls:'icon-worldbook' },
    { id:'music', name:'音乐', icon:'音', cls:'icon-music' },
  ]
}
function openCharApp(appId, char){
  const box = qs('#charPhoneContent')
  const cName = char?.name || 'ta'
  const pName = currentProfile()?.name || '你'
  let content = ''
  if(appId === 'notes') content = `<div class="section-title">ta 的便签</div>` + charNotes(cName, pName).map(n => `<div class="diary-item"><div class="d-date">${esc(n.time)}</div><div class="d-text">${esc(n.text)}</div></div>`).join('')
  else if(appId === 'diary') content = `<div class="section-title">ta 的日记</div>` + charDiary(cName, pName).map(d => `<div class="diary-item"><div class="d-date">${esc(d.date)}</div><div class="d-text">${esc(d.text)}</div></div>`).join('')
  else if(appId === 'wechat') content = renderCharWechat(char, pName)
  else if(appId === 'gallery') content = `<div class="section-title">ta 的相册</div><div class="item-grid" style="grid-template-columns:repeat(3,1fr)">` + [1,2,3,4,5,6].map(i => `<div class="sweet-item"><div class="si-icon icon-photos">${i}</div><div class="si-name" style="font-size:10px">照片 ${i}</div></div>`).join('') + `</div>`
  else if(appId === 'messages') content = `<div class="section-title">ta 的短信</div>` + charMessages(cName, pName).map(m => `<div class="list-item"><div class="item-body"><div class="item-title">${esc(m.from)}</div><div class="item-sub">${esc(m.text)}</div></div></div>`).join('')
  else if(appId === 'contacts') content = `<div class="section-title">ta 的通讯录</div>` + ['妈妈','最好的朋友','同事小陈', pName].map(n => `<div class="list-item"><div class="item-icon icon-character">${esc(n[0])}</div><div class="item-body"><div class="item-title">${esc(n)}</div></div></div>`).join('')
  else if(appId === 'browser') content = `<div class="section-title">ta 的浏览记录</div>` + [`「如何准备一个惊喜」`,`「${pName} 喜欢的东西」`,`「最近的天气」`].map(t => `<div class="list-item"><div class="item-body"><div class="item-title" style="font-size:13px">${esc(t)}</div></div></div>`).join('')
  else if(appId === 'music') content = `<div class="section-title">ta 最近听的歌</div>` + ['你喜欢的歌单','睡前轻音乐','一起听过的歌'].map(t => `<div class="list-item"><div class="item-icon icon-music">音</div><div class="item-body"><div class="item-title">${esc(t)}</div></div></div>`).join('')
  box.innerHTML = content || '<div class="empty">无内容</div>'
}
function charNotes(cName, pName){
  return [
    { time:'昨天 22:14', text:`给 ${pName} 准备了小惊喜，别被发现。` },
    { time:'3天前', text:'记住 ta 说喜欢的那家店，下次一起去。' },
    { time:'上周', text:'有些话，见面的时候再说吧。' }
  ]
}
function charDiary(cName, pName){
  return [
    { date:'今天', text:`今天和 ${pName} 聊天，时间过得特别快。我发现自己越来越期待手机亮起来的那一刻。` },
    { date:'昨天', text:'梦见和 ta 一起散步，风很轻，路很长，希望一直走下去。' },
    { date:'3天前', text:'想把心里的话都说出来，又怕说得太早。' }
  ]
}
function charWechat(cName, pName){
  return [
    { name:pName, last:'「晚安，明天见。」' },
    { name:'家人', last:'「记得吃饭。」' },
    { name:'朋友', last:'「周末有空吗？」' }
  ]
}
// 实时抓包：char 的微信显示与 user 的真实对话
function renderCharWechat(char, pName){
  const charId = char ? char.id : null
  const msgs = charId ? getMsgs(charId) : []
  const recent = msgs.slice(-8)
  const chatRows = recent.map(m => `<div class="list-item"><div class="item-icon icon-character">${esc((m.sender==='me'?pName:char?.name||'ta')[0])}</div><div class="item-body"><div class="item-title">${esc(m.sender==='me'?pName:char?.name)}</div><div class="item-sub">${esc(msgPreview(m))}</div></div></div>`).join('')
  const sendBtn = `<button class="btn btn-block btn-secondary" id="charSendMsg">代替 ta 发送消息</button>`
  const html = `<div class="section-title">ta 的微信（抓包：与你实时对话）</div>` + (chatRows || '<div class="empty">还没有和 ta 聊天</div>') + sendBtn
  setTimeout(() => { const b = qs('#charSendMsg'); if(b) b.onclick = () => sendAsChar(char, pName) }, 0)
  return html
}
function sendAsChar(char, pName){
  if(!char){ toast('暂无角色'); return }
  showModal({ title:`代替 ${char.name} 发送`, body:`<textarea id="saText" rows="3" placeholder="以 ta 的口吻输入..."></textarea>`, actions:[{label:'发送', cls:'btn btn-block', onOk(){ const t = qs('#saText').value.trim(); if(!t){ toast('请输入'); return }; addMsg(char.id, { sender:'char', type:'text', text:t }); closeModal(); renderCheckPhone(); toast('已以 ta 的身份发送') }}] })
}
function charMessages(cName, pName){
  return [ { from:pName, text:'到家了吗？' }, { from:'10086', text:'您的话费余额已不足' }, { from:'快递', text:'包裹已到驿站' } ]
}
function reverseCheckPhone(){
  const p = currentProfile()
  showModal({ title:'查看 user 的手机', body:`
    <div class="phone-mock" style="margin-bottom:0">
      <div class="pm-status"><span>09:41</span><div class="pm-status-icons">●●●</div></div>
      <div class="pm-apps">${checkApps().slice(0,8).map(a => `<div class="pm-app"><div class="pm-icon ${a.cls}">${a.icon}</div><span>${a.name}</span></div>`).join('')}</div>
    </div>
    <div class="section-title">你与 ta 的最近对话（实时）</div>
    <div id="revChat"></div>`, actions:[{label:'关闭', cls:'btn btn-block'}] })
  const char = currentChar()
  const msgs = char ? getMsgs(char.id).slice(-6) : []
  const rev = qs('#revChat')
  rev.innerHTML = msgs.length ? msgs.map(m => `<div class="list-item"><div class="item-body"><div class="item-title">${esc(m.sender==='me'?'你':char?.name)}</div><div class="item-sub">${esc(msgPreview(m))}</div></div></div>`).join('') : '<div class="empty">还没有对话内容</div>'
}

// ============ 商城（分页） ============
function renderShop(){
  const body = qs('#shopBody'); let shopPage = 1
  const products = [
    { name:'定制情侣头像', price:'9.9', icon:'像', cls:'icon-couple' },
    { name:'专属情书模板', price:'6.6', icon:'书', cls:'icon-worldbook' },
    { name:'主题皮肤', price:'19.9', icon:'肤', cls:'icon-style' },
    { name:'专属来电铃声', price:'12.0', icon:'铃', cls:'icon-music' },
    { name:'纪念日相册', price:'29.9', icon:'册', cls:'icon-photos' },
    { name:'语音祝福', price:'15.0', icon:'语', cls:'icon-character' },
    { name:'情侣手链', price:'39.9', icon:'链', cls:'icon-couple' },
    { name:'定制壁纸', price:'8.8', icon:'纸', cls:'icon-photos' },
  ]
  body.innerHTML = `<div class="shop-banner">晓梦商城 · 精选好物</div><div class="card"><div class="field"><label>导入商城 HTML</label><input type="file" id="shopFileInput" accept="text/html"></div></div><div class="section-title">商品分类</div><div class="shop-items" id="shopItems"></div><div id="shopPager"></div>`
  qs('#shopFileInput').onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { store.rawSet('shopHtml', r.result); toast('商城 HTML 已导入') }; r.readAsText(f) }
  const draw = () => { const pg = paginate(products, shopPage, 6); qs('#shopItems').innerHTML = pg.items.map(p => `<div class="shop-product"><div class="sp-img ${p.cls}">${p.icon}</div><div class="sp-body"><div class="sp-name">${p.name}</div><div class="sp-price">¥${p.price}</div><button class="btn btn-sm btn-block" data-buy="${p.name}">加入购物车</button></div></div>`).join(''); qs('#shopPager').innerHTML = pagerHTML(pg, p => { shopPage = p; draw() }); qsa('[data-buy]', qs('#shopItems')).forEach(b => b.onclick = () => toast(`已加入购物车：${b.dataset.buy}`)) }
  draw()
}

// ============ 线下（沉浸长文模式） ============
function renderOffline(){
  const body = qs('#tavernBody')
  const chars = getCharacters()
  const wbs = getWorldbooks()
  const styles = getStyles().filter(s => s.mode !== 'online')
  body.innerHTML = `
    <div class="offline-hero"><div class="oh-title">线下 · 沉浸对话</div><div class="oh-sub">完整世界书挂载，长文输出模式</div></div>
    <div class="card">
      <div class="field"><label>挂载世界书（多选）</label><div id="tvWb"></div></div>
      <div class="field"><label>选择文风</label><select id="tvStyle">${styles.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('') || '<option value="">暂无文风</option>'}</select></div>
      <div class="field"><label>对话模式</label><select id="tvMode"><option value="long">长文模式（详细描写）</option><option value="short">短文模式（简洁对话）</option></select></div>
      <div class="field"><label>在场角色</label><div class="character-grid" id="tvChars" style="grid-template-columns:repeat(3,1fr)"></div></div>
    </div>
    <div id="tvChatArea" style="display:none">
      <div class="chat-header-inline"><div class="avatar icon-tavern" id="tvAvatar">下</div><div><div id="tvName" style="font-weight:600">线下</div><div class="chat-status" id="tvStatus" style="font-size:12px;color:var(--muted)">等待开场</div></div></div>
      <div class="message-list" id="tvMessages" style="height:300px"></div>
      <div class="tavern-composer"><textarea id="tvInput" placeholder="输入动作、对话或场景描述（长文）..."></textarea><button class="btn" id="tvSend">发送</button></div>
    </div>
  `
  const wbBox = qs('#tvWb')
  wbBox.innerHTML = wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><input type="checkbox" value="${w.id}"><span style="font-size:13px">${esc(w.name)}${w.resident?' (常驻)':''}</span></div>`).join('') || '<div class="hint">暂无世界书</div>'
  const charGrid = qs('#tvChars')
  charGrid.innerHTML = chars.map(c => `<div class="char-card" data-char="${c.id}"><div class="char-avatar icon-character">${esc((c.name||'?')[0])}</div><div class="char-name">${esc(c.name)}</div></div>`).join('') || '<div class="hint">暂无角色</div>'
  qsa('[data-char]', charGrid).forEach(c => c.onclick = () => enterOffline(c.dataset.char))
  qs('#tvSend').onclick = offlineSend
  qs('#tvInput').onkeydown = e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); offlineSend() } }
}
function enterOffline(charId){
  const c = getChar(charId)
  qs('#tvChatArea').style.display = 'block'
  qs('#tvAvatar').textContent = (c?.name||'下')[0]
  qs('#tvName').textContent = c?.name
  qs('#tvStatus').textContent = c?.monologue?.slice(0,20) || '等待开场'
  memorySet('offlineChar', charId)
  renderOfflineMsgs()
}
function renderOfflineMsgs(){
  const msgs = store.get('offlineMsgs', [])
  const list = qs('#tvMessages')
  list.innerHTML = msgs.map(m => `<div class="msg ${m.sender==='me'?'me':'char'}"><div class="bubble" style="white-space:pre-wrap">${esc(m.text)}</div></div>`).join('')
  list.scrollTop = list.scrollHeight
}
function offlineSend(){
  const input = qs('#tvInput'); const text = input.value.trim(); if(!text) return
  const mode = qs('#tvMode').value
  const msgs = store.get('offlineMsgs', []); msgs.push({ id:uid('t'), sender:'me', text, time:now() }); store.set('offlineMsgs', msgs); input.value = ''; renderOfflineMsgs()
  const c = getChar(memory('offlineChar'))
  const wbNames = qsa('#tvWb input:checked').map(i => { const w = getWorldbooks().find(x => x.id === i.value); return w ? w.name : '' }).filter(Boolean)
  setTimeout(() => {
    const msgs2 = store.get('offlineMsgs', [])
    const longReply = c ? `${c.name}缓缓抬起头，目光落在你身上。${wbNames.length ? '（已挂载世界书：' + wbNames.join('、') + '）' : ''}\n\n「${trunc(text,40)}……」${c.name}斟酌着开口，声音不大，却像带着温度。` : '这里静悄悄的，等你开口。'
    const shortReply = c ? `${c.name}：「${trunc(text,20)}……继续说。」` : '在听。'
    msgs2.push({ id:uid('t'), sender:'char', text: mode === 'long' ? longReply : shortReply, time:now() })
    store.set('offlineMsgs', msgs2); renderOfflineMsgs()
  }, 800)
}

// ============ 同人文/共读 ============
function renderReading(){
  const body = qs('#readingBody')
  const books = store.get('books', [])
  body.innerHTML = `
    <div class="card"><h3>生成同人文</h3><div class="field"><label>主题/CP</label><input id="fanficTopic" placeholder="例如：雨天初遇"></div><button class="btn btn-block" id="genFanficBtn">AI 生成同人文</button></div>
    <div class="card"><h3>导入书本</h3><div class="field"><label>文件（txt/md）</label><input type="file" id="bookFile" accept=".txt,.md"></div></div>
    <div class="section-title">我的书库</div><div id="bookList"></div><div id="readerView" style="display:none"></div>
  `
  qs('#genFanficBtn').onclick = () => { const topic = qs('#fanficTopic').value.trim() || '一次重逢'; const char = currentChar(); const text = `【同人文】\n\n那是一个下着小雨的黄昏。\n\n${char?.name||'ta'}站在街角的屋檐下，望着对面亮起的灯。你在人群里一眼就认出了那个身影。\n\n「原来，你也在这里。」\n\n故事从这里开始。`; const books = store.get('books', []); books.push({ id:uid('b'), name:`同人文 · ${topic}`, content:text }); store.set('books', books); renderReading() }
  qs('#bookFile').onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { const books = store.get('books', []); books.push({ id:uid('b'), name: f.name.replace(/\.[^.]+$/,''), content: r.result }); store.set('books', books); renderReading() }; r.readAsText(f) }
  const bookList = qs('#bookList')
  bookList.innerHTML = books.map(b => `<div class="book-row" data-book="${b.id}"><div class="book-cover">${esc((b.name||'书')[0])}</div><div class="book-info"><div class="book-name">${esc(b.name)}</div><div class="book-desc">${esc(b.content.slice(0,80))}</div></div></div>`).join('') || '<div class="empty">暂无书本</div>'
  qsa('[data-book]', bookList).forEach(r => r.onclick = () => { const b = books.find(x => x.id === r.dataset.book); const char = currentChar(); const view = qs('#readerView'); view.style.display = 'block'; bookList.style.display = 'none'; view.innerHTML = `<div class="reader-view"><h3>${esc(b.name)}</h3><p style="color:var(--muted);font-size:12px">与 ${esc(char?.name||'ta')} 共读中</p><p style="white-space:pre-wrap;margin-top:12px">${esc(b.content)}</p><button class="btn btn-block btn-secondary" id="closeReader">返回书库</button></div>`; qs('#closeReader').onclick = () => { view.style.display='none'; bookList.style.display='block' } })
}

// ============ 论坛（知乎） ============
function getPosts(){ return store.get('forumPosts', []) }
function setPosts(v){ store.set('forumPosts', v) }
function renderForum(){
  const body = qs('#forumBody')
  body.innerHTML = `<div class="forum-tabs"><button class="tab active" data-ft="hot">热门</button><button class="tab" data-ft="latest">最新</button></div><div class="zhihu-feed" id="zhFeed"></div>`
  qsa('.forum-tabs .tab').forEach(t => t.onclick = () => { qsa('.forum-tabs .tab').forEach(x => x.classList.remove('active')); t.classList.add('active'); renderZhFeed(qs('#zhFeed'), t.dataset.ft) })
  renderZhFeed(qs('#zhFeed'), 'hot')
}
function renderZhFeed(el, tab){
  const posts = getPosts()
  const sorted = tab === 'hot' ? [...posts].sort((a,b) => (b.likes||0)-(a.likes||0)) : [...posts].sort((a,b) => b.time-a.time)
  el.innerHTML = sorted.length ? sorted.map(p => `<div class="zh-item" data-post="${p.id}"><div class="zh-title">${esc(p.title)}</div><div class="zh-excerpt">${esc((p.body||'').slice(0,60))}...</div><div class="zh-meta"><span>${p.likes} 赞同</span><span>${(p.answers||[]).length} 评论</span>${p.likes>5?'<span class="zh-hot">热门</span>':''}</div></div>`).join('') : '<div class="empty">暂无问题</div>'
  qsa('[data-post]', el).forEach(i => i.onclick = () => openPost(i.dataset.post))
}
function openPost(id){
  const p = getPosts().find(x => x.id === id); if(!p) return
  const container = qs('#appContainer')
  container.innerHTML = `<div class="app-screen"><header class="app-header"><button class="header-btn back" data-action="back"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><h1 class="header-title">问题详情</h1><span class="header-spacer"></span></header><div class="app-body" id="postBody"></div></div>`
  qs('[data-action="back"]').onclick = () => goBack()
  const body = qs('#postBody')
  const renderAns = () => { qs('#ansList').innerHTML = (p.answers||[]).map(a => `<div class="zh-answer"><div class="za-author"><div class="za-avatar icon-character">${esc((a.author||'?')[0])}</div><div class="za-name">${esc(a.author)}</div></div><div class="za-text">${esc(a.text)}</div></div>`).join('') || '<div class="empty">暂无回答</div>' }
  body.innerHTML = `<div class="card"><h3>${esc(p.title)}</h3><p style="font-size:14px;color:var(--text-2);line-height:1.6">${esc(p.body||'')}</p></div><div class="section-title">回答 (${(p.answers||[]).length})</div><div id="ansList"></div>
    <div class="card" style="margin-top:14px"><h3>生成回答</h3>
      <div class="field"><label>回答数量</label><select id="genCount"><option>1</option><option>2</option><option selected>3</option><option>5</option></select></div>
      <div class="field"><label>回答类型</label><select id="genType"><option value="char">角色视角</option><option value="neutral">中立分析</option><option value="user">用户视角</option></select></div>
      <button class="btn btn-block" id="genAnswers">生成回答</button>
      <button class="btn btn-block btn-secondary" id="answerBtn" style="margin-top:8px">手动写回答</button>
    </div>`
  renderAns()
  qs('#genAnswers').onclick = () => generateAnswers(p, Number(qs('#genCount').value), qs('#genType').value, renderAns)
  qs('#answerBtn').onclick = () => showModal({ title:'写回答', body:`<textarea id="ansText" rows="4" placeholder="写下你的回答..."></textarea>`, actions:[{label:'提交', cls:'btn btn-block', onOk(){ const t = qs('#ansText').value.trim(); if(!t) return; const prof = currentProfile(); p.answers = p.answers||[]; p.answers.push({ author: prof?.name||'匿名', text:t }); setPosts(getPosts()); renderAns(); closeModal() }}] })
}
function generateAnswers(p, count, type, cb){
  const chars = getCharacters()
  const prof = currentProfile()
  const pool = type === 'char' ? (chars.length ? chars.map(c => ({ author:c.name, text:`${c.persona ? trunc(c.persona,30) + '。' : ''}关于「${trunc(p.title,20)}」，我的看法其实很简单——心里早就有答案，只是还没说出口。` })) : [{ author:'匿名角色', text:'关于这个问题，我的看法是……' }])
    : type === 'user' ? [{ author: prof?.name||'你', text:'作为亲历者，我想说的是：答案往往藏在不经意的瞬间里。' }]
    : [{ author:'理性分析者', text:'从客观角度看，这个问题需要拆解成几个层面来思考。' }, { author:'观察者', text:'我注意到一些细节，或许能提供不同的视角。' }]
  for(let i=0;i<count;i++){ const tpl = pool[i % pool.length]; p.answers = p.answers||[]; p.answers.push({ author: tpl.author, text: tpl.text + '（第' + (i+1) + '条回答）' }) }
  setPosts(getPosts()); cb(); toast('已生成 ' + count + ' 条回答')
}
function askQuestion(){
  showModal({ title:'提问', body:`<div class="field"><label>标题</label><input id="qTitle"></div><div class="field"><label>问题描述</label><textarea id="qBody" rows="3"></textarea></div>`, actions:[{label:'发布', cls:'btn btn-block', onOk(){ const t = qs('#qTitle').value.trim(); if(!t) return; const posts = getPosts(); posts.unshift({ id:uid('p'), title:t, body: qs('#qBody').value.trim(), likes:0, answers:[], time:now() }); setPosts(posts); renderForum(); closeModal() }}] })
}

// ============ 弹窗/Toast ============
function paginate(arr, page, size){
  size = size || 10
  const pages = Math.max(1, Math.ceil(arr.length / size))
  page = Math.min(Math.max(1, page), pages)
  return { items: arr.slice((page-1)*size, page*size), page, pages, total: arr.length }
}
function pagerHTML(pg, onClick){
  if(pg.pages <= 1) return ''
  let h = '<div class="pager">'
  h += `<button class="pg-btn" data-pg="${pg.page-1}" ${pg.page<=1?'disabled':''}>‹</button>`
  for(let i=1;i<=pg.pages;i++) h += `<button class="pg-btn ${i===pg.page?'active':''}" data-pg="${i}">${i}</button>`
  h += `<button class="pg-btn" data-pg="${pg.page+1}" ${pg.page>=pg.pages?'disabled':''}>›</button></div>`
  setTimeout(() => { qsa('.pg-btn').forEach(b => b.onclick = () => onClick(Number(b.dataset.pg))) }, 0)
  return h
}
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

// ============ 工具 ============
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
    const p = { id: uid('p'), name:'晓梦生', persona:'喜欢记录日常，观察细节', wechatId:'xm-sheng' }
    setProfiles([p]); setActiveProfile(p.id)
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
  document.addEventListener('click', e => {
    if(e.target.id === 'amNewChar'){ closeModal(); charForm(null) }
    if(e.target.id === 'amNewGroup'){ closeModal(); createGroup() }
  })
})

function createGroup(){
  const chars = getCharacters()
  if(chars.length < 2){ toast('至少需要 2 个角色才能建群'); return }
  showModal({ title:'发起群聊', body:`<div class="field"><label>群名</label><input id="grpName" value="好友群"></div><div class="field"><label>选择成员</label><div id="grpMembers"></div></div>`, actions:[{label:'创建', cls:'btn btn-block', onOk(){ const name = qs('#grpName').value.trim() || '好友群'; const members = qsa('#grpMembers input:checked').map(i => i.value); if(members.length < 2){ toast('至少选 2 个成员'); return }; const chats = getChats(); chats.push({ id:uid('g'), type:'group', name, avatar:'群', color:'icon-style', members, unread:0, last:'群聊已创建', time:now() }); setChats(chats); renderWechat(); closeModal() }}] })
  qs('#grpMembers').innerHTML = chars.map(c => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0"><input type="checkbox" value="${c.id}"><span style="font-size:13px">${esc(c.name)}</span></div>`).join('')
}

window.__app = { openApp, closeApp, APPS }
