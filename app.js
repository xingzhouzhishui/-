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
const timeAgo = ts => { const d = now()-ts; if(d<60000) return '刚刚'; if(d<3600000) return Math.floor(d/60000)+'分钟前'; if(d<86400000) return Math.floor(d/3600000)+'小时前'; return new Date(ts).toLocaleDateString() }

// ============ 应用注册表 ============
const APPS = [
  { id:'wechat',    name:'微信',    icon:'微', cls:'icon-wechat',    tpl:'tpl-wechat',   dock:true },
  { id:'music',     name:'网易云音乐',icon:'音', cls:'icon-music',     tpl:'tpl-music',    dock:true },
  { id:'tavern',    name:'线下',    icon:'线', cls:'icon-tavern',    tpl:'tpl-tavern',   dock:true },
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
const SUBPAGES = { moments:'朋友圈', favorites:'收藏', stickers:'表情包' }
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
function getCharByName(n){ return getCharacters().find(c => c.name === n) }
function currentChar(){ return getChar(getActiveChar()) || getCharacters()[0] || null }

function getWorldbooks(){ return store.get('worldbooks', []) }
function setWorldbooks(v){ store.set('worldbooks', v) }
function getStyles(){ return store.get('styles', []) }
function setStyles(v){ store.set('styles', v) }
function getChats(){ return store.get('chats', []) }
function setChats(v){ store.set('chats', v) }
function getMsgs(id){ return store.get('msg_' + id, []) }
function setMsgs(id, v){ store.set('msg_' + id, v) }
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
function memory(k){ return store.get('memory_' + k, null) }
function memorySet(k, v){ store.set('memory_' + k, v) }

// 默认心声（内置初始状态）
const DEFAULT_MIND = '正在想你，有一点走神。'
function buildCharContext(char){
  if(!char) return ''
  const wbs = getWorldbooks().filter(w => (char.worldbooks||[]).includes(w.id) || (char.residentWorldbooks||[]).includes(w.id))
  const others = getCharacters().filter(c => c.id !== char.id)
  const g = char.guard || {}
  const p = []
  p.push(`【你正在扮演】${char.name}`)
  if(char.persona) p.push(`【人设】${char.persona}`)
  if(g.speechStyle) p.push(`【口吻】${g.speechStyle}`)
  if(g.forbiddenTopics && g.forbiddenTopics.length) p.push(`【绝对禁止提及】${g.forbiddenTopics.join('、')}`)
  if(g.negativePrompts) p.push(`【注意避免】${g.negativePrompts}`)
  if(wbs.length) p.push(`【世界书】${wbs.map(w => w.content).join('\n')}`)
  if(others.length) p.push(`【防串味】你只是 ${char.name}，与 ${others.map(o=>o.name).join('、')} 无关，不要模仿或带入他们。`)
  return p.join('\n')
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
  qsa('.app-icon').forEach(el => el.onclick = () => openApp(el.dataset.app))
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

// ============ 导航（含全局事件委托，返回键必达） ============
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
  if(!app) return
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
  if(appStack.length > 1){
    appStack.pop()
    const id = appStack[appStack.length-1]
    if(SUBPAGES[id]) renderSubPage(id)
    else mountApp(id)
  } else closeApp()
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
}

// 全局事件委托：返回键、通用动作
document.addEventListener('click', e => {
  const back = e.target.closest('[data-action="back"]')
  if(back){ e.preventDefault(); goBack(); return }
  const act = e.target.closest('[data-action]')
  if(!act) return
  const action = act.dataset.action
  const screen = act.closest('.app-screen')
  const appId = screen ? screen.dataset.app : ''
  headerAction(appId, action, act)
})

function headerAction(id, action, el){
  if(action === 'add'){
    if(id === 'wechat'){ showModal({title:'添加', body:addMenuBody(), actions:[{label:'关闭', cls:'btn btn-block'}]}) }
    else if(id === 'character'){ charForm(null) }
    else if(id === 'worldbook'){ focusWbInput() }
    else if(id === 'style'){ styleForm(null) }
    else if(id === 'shop'){ qs('#shopFileInput') && qs('#shopFileInput').click() }
    else if(id === 'reading'){ showModal({title:'添加', body:readingAddBody(), actions:[{label:'关闭', cls:'btn btn-block'}]}) }
  }
  else if(action === 'search' && id === 'music'){ musicSearchModal() }
  else if(action === 'ask' && id === 'forum'){ askQuestion() }
}

// ============ 微信 ============
function ensureChats(){
  const chars = getCharacters()
  if(getChats().length === 0){
    const chats = chars.map(c => ({ id:c.id, type:'single', name:c.name, avatar:(c.name||'?')[0], color:'icon-character', unread:0, last:'开始聊天吧', time:now() }))
    if(chars.length >= 2) chats.push({ id:'group_friends', type:'group', name:'好友群', avatar:'群', color:'icon-style', unread:0, last:'欢迎来到群聊', time:now(), members: chars.map(c=>c.id) })
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
    const lastText = last ? (last.type === 'text' ? last.text : '[特殊消息]') : c.last
    return `<div class="chat-row" data-chat="${c.id}"><div class="avatar ${c.color}">${esc(c.avatar)}</div><div class="chat-info"><div class="chat-name-row"><span class="chat-name">${esc(c.name)}</span><span class="chat-time">${timeAgo(c.time)}</span></div><div class="chat-last">${esc(lastText||'')}</div></div>${c.unread?`<div class="unread">${c.unread}</div>`:''}</div>`
  }).join('') || '<div class="empty">暂无会话，请先在角色设定创建角色</div>'
  qsa('.chat-row', el).forEach(r => r.onclick = () => openChatDetail(r.dataset.chat))
}
function renderContactsPanel(){
  const el = qs('#panel-contacts')
  const chars = getCharacters()
  const groups = getChats().filter(c => c.type === 'group')
  let html = `<div class="contact-add" id="addContactBtn"><div class="avatar">+</div><div style="flex:1;font-size:15px">添加新的 char 人设</div></div>`
  html += groups.map(g => `<div class="chat-row" data-chat="${g.id}"><div class="avatar ${g.color}">${esc(g.avatar)}</div><div class="chat-info"><span class="chat-name">${esc(g.name)}</span></div></div>`).join('')
  html += `<div class="contact-letter">角色（${chars.length}）</div>`
  html += chars.map(c => `<div class="chat-row" data-chat="${c.id}"><div class="avatar icon-character">${esc((c.name||'?')[0])}</div><div class="chat-info"><span class="chat-name">${esc(c.name)}</span></div></div>`).join('')
  el.innerHTML = html
  qs('#addContactBtn').onclick = () => charForm(null)
  qsa('.chat-row', el).forEach(r => r.onclick = () => openChatDetail(r.dataset.chat))
}
function renderDiscoverPanel(){
  const el = qs('#panel-discover')
  el.innerHTML = `
    <div class="section-title">朋友圈与收藏</div>
    <div class="list-group">
      <div class="list-item" data-nav="moments"><div class="item-icon icon-couple">朋</div><div class="item-body"><div class="item-title">朋友圈</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="favorites"><div class="item-icon icon-style">藏</div><div class="item-body"><div class="item-title">收藏</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="stickers"><div class="item-icon icon-photos">表</div><div class="item-body"><div class="item-title">表情包</div></div><span class="chevron">›</span></div>
    </div>
    <div class="section-title">小程序</div>
    <div class="list-group">
      <div class="list-item" data-nav="mini-music"><div class="item-icon icon-music">音</div><div class="item-body"><div class="item-title">网易云音乐</div><div class="item-sub">听歌、扫码登录、歌单</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="mini-couple"><div class="item-icon icon-couple">情</div><div class="item-body"><div class="item-title">情侣空间</div><div class="item-sub">日记、任务、道具</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="mini-tavern"><div class="item-icon icon-tavern">线</div><div class="item-body"><div class="item-title">线下酒馆</div><div class="item-sub">线下模式</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="mini-shop"><div class="item-icon icon-shop">商</div><div class="item-body"><div class="item-title">商城</div><div class="item-sub">导入商品</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-nav="mini-reading"><div class="item-icon icon-reading">读</div><div class="item-body"><div class="item-title">共读</div><div class="item-sub">同人文、一起读书</div></div><span class="chevron">›</span></div>
    </div>
  `
  qsa('[data-nav]', el).forEach(item => item.onclick = () => {
    const n = item.dataset.nav
    if(n === 'moments') pushApp('moments')
    else if(n === 'favorites') pushApp('favorites')
    else if(n === 'stickers') pushApp('stickers')
    else if(n === 'mini-music') openApp('music')
    else if(n === 'mini-couple') openApp('couple')
    else if(n === 'mini-tavern') openApp('tavern')
    else if(n === 'mini-shop') openApp('shop')
    else if(n === 'mini-reading') openApp('reading')
  })
}
function renderMePanel(){
  const el = qs('#panel-me')
  const p = currentProfile() || {}
  el.innerHTML = `
    <div class="list-item" id="meProfileEdit"><div class="avatar icon-character" style="width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:22px">${esc((p.name||'晓')[0])}</div><div class="item-body"><div class="item-title" style="font-size:17px">${esc(p.name||'晓梦生')}</div><div class="item-sub">微信号：${esc(p.wechatId||'xm-sheng')}</div></div><span class="chevron">›</span></div>
    <div class="list-group" style="margin-top:14px">
      <div class="list-item" data-me="favorites"><div class="item-body"><div class="item-title">收藏</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-me="moments"><div class="item-body"><div class="item-title">朋友圈</div></div><span class="chevron">›</span></div>
      <div class="list-item" data-me="settings"><div class="item-body"><div class="item-title">设置</div></div><span class="chevron">›</span></div>
    </div>`
  qs('#meProfileEdit').onclick = () => editProfile()
  qsa('[data-me]', el).forEach(item => item.onclick = () => { const m = item.dataset.me; if(m==='favorites') pushApp('favorites'); else if(m==='moments') pushApp('moments'); else openApp('settings') })
}
function editProfile(){
  const p = currentProfile() || {}
  showModal({ title:'编辑资料', body:`<div class="field"><label>名称</label><input id="epName" value="${esc(p.name||'')}"></div><div class="field"><label>微信号</label><input id="epWx" value="${esc(p.wechatId||'')}"></div><div class="field"><label>个性签名</label><input id="epSign" value="${esc(p.sign||'')}"></div>`, actions:[{label:'取消', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){ const profs = getProfiles(); const idx = profs.findIndex(x => x.id === p.id); const obj = { ...p, name:qs('#epName').value.trim(), wechatId:qs('#epWx').value.trim(), sign:qs('#epSign').value.trim() }; if(idx>=0) profs[idx]=obj; else { obj.id=uid('p'); profs.push(obj); setActiveProfile(obj.id) } setProfiles(profs); renderMePanel(); closeModal() }}] })
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
  qs('#chatDetailSub').textContent = (char && char.readNoReply) ? '在线 · 已读不回' : '在线'
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
  const input = qs('#detailChatInput')
  input.onkeydown = e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendDetailMessage() } }
  const composer = qs('.chat-composer')
  qsa('[data-action]', composer).forEach(btn => {
    const a = btn.dataset.action
    btn.onclick = () => { if(a==='voice') sendVoice(); else if(a==='emoji') toggleStickerPanel(); else if(a==='plus') toggleActionPanel() }
  })
  // 详情页头部更多按钮
  const moreBtn = qs('.chat-detail-screen [data-action="more"]')
  if(moreBtn) moreBtn.onclick = () => showChatSettings(chatId)
}
function renderMessage(m, char){
  const cls = m.sender === 'me' ? 'me' : 'char'
  const avatar = m.sender === 'me' ? '' : (char ? (char.name||'?')[0] : '?')
  let body = ''
  if(m.type === 'text') body = esc(m.text)
  else if(m.type === 'image') body = `<img src="${m.dataUrl}">`
  else if(m.type === 'audio') body = `<audio controls src="${m.dataUrl}"></audio>`
  else if(m.type === 'location') body = `<div class="location-card">位置 · ${esc(m.text)}</div>`
  else if(m.type === 'transfer') body = `<div class="transfer">转账 ${esc(m.text)} 元</div>`
  else if(m.type === 'redpacket') body = `<div class="redpacket">红包 ${esc(m.text)} 元</div>`
  else if(m.type === 'call') body = `<div class="call-card">${esc(m.text)}</div>`
  else if(m.type === 'system') body = `<span class="sys">${esc(m.text)}</span>`
  else if(m.type === 'sticker') body = `<img class="sticker" src="${m.dataUrl}">`
  const tools = (m.sender === 'me' || m.sender === 'char') ? `<div class="bubble-tools">${m.sender==='me'?`<button data-act="recall" data-id="${m.id}">撤回</button><button data-act="edit" data-id="${m.id}">修改</button>`:''}<button data-act="fav" data-id="${m.id}">收藏</button>${m.sender==='char'?`<button data-act="regen" data-id="${m.id}">重回</button>`:''}</div>` : ''
  return `<div class="msg ${cls}"><div class="avatar-s">${esc(avatar)}</div><div class="bubble">${body}${tools}</div></div>`
}
function bindMessageTools(){
  qsa('[data-act]', qs('#detailMessageList')).forEach(btn => {
    btn.onclick = () => {
      const act = btn.dataset.act, id = btn.dataset.id
      if(act === 'recall') recallMessage(id)
      else if(act === 'edit') editMessage(id)
      else if(act === 'fav') favoriteMessage(id)
      else if(act === 'regen') regenerateMessage(id)
    }
  })
}
function addMsg(chatId, msg){
  const msgs = getMsgs(chatId)
  msgs.push({ id: uid('m'), ...msg, time: now() })
  setMsgs(chatId, msgs)
  const chats = getChats(); const chat = chats.find(c => c.id === chatId)
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
  if(chat && chat.type === 'group') groupReply(chat)
  else setTimeout(() => charReply(chat, char), 700)
}
function charReply(chat, char){
  const list = qs('#detailMessageList')
  list.insertAdjacentHTML('beforeend', `<div class="msg char typing" id="typingMsg"><div class="avatar-s">${esc((char?.name||'?')[0])}</div><div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`)
  list.scrollTop = list.scrollHeight
  const ctx = buildCharContext(char)
  const replies = char ? [`我在听，你说。`,`${char.name}停了一下，才回你：「嗯，这件事我记得。」`,`「继续，我想知道更多。」`,`${char.name}没有立刻回答，像在斟酌用词。`] : ['我在。']
  setTimeout(() => { const t = qs('#typingMsg'); if(t) t.remove(); addMsg(activeChatId, { sender:'char', type:'text', text: replies[Math.floor(Math.random()*replies.length)], _ctx: ctx }) }, 900)
}
function groupReply(chat){
  const members = chat.members || []
  const speaker = getChar(members[Math.floor(Math.random()*members.length)]) || getCharacters()[0]
  if(!speaker){ return }
  const list = qs('#detailMessageList')
  list.insertAdjacentHTML('beforeend', `<div class="msg char typing" id="typingMsg"><div class="avatar-s">${esc((speaker.name||'?')[0])}</div><div class="bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`)
  list.scrollTop = list.scrollHeight
  setTimeout(() => { const t = qs('#typingMsg'); if(t) t.remove(); addMsg(activeChatId, { sender:'char', type:'text', text:`${speaker.name}：大家都在呢。`, _speaker: speaker.name }) }, 900)
}
function recallMessage(id){ setMsgs(activeChatId, getMsgs(activeChatId).filter(m => m.id !== id)); renderChatDetail() }
function editMessage(id){
  const msgs = getMsgs(activeChatId); const m = msgs.find(x => x.id === id)
  if(!m) return
  const nt = prompt('修改消息内容：', m.text || '')
  if(nt === null) return
  m.text = nt.trim(); m.type = 'text'; setMsgs(activeChatId, msgs); renderChatDetail()
}
function favoriteMessage(id){
  const m = getMsgs(activeChatId).find(x => x.id === id)
  if(!m) return
  const favs = getFavorites(); favs.unshift({ id: uid('f'), source: activeChatId, text: m.text || '[图片/语音]', time: now() })
  setFavorites(favs); toast('已收藏')
}
function regenerateMessage(id){
  const msgs = getMsgs(activeChatId); const m = msgs.find(x => x.id === id)
  if(!m) return
  const char = getCharByName((getChats().find(c => c.id === activeChatId)||{}).name)
  const alts = char ? [`${char.name}换了个说法：「其实我一直在想这件事。」`,`「让我重新说，」${char.name}低声道。`,`${char.name}沉默了一瞬，重新组织语言。`] : ['重新组织了一下。']
  m.text = alts[Math.floor(Math.random()*alts.length)]; setMsgs(activeChatId, msgs); renderChatDetail()
}
function sendVoice(){ toast('按住说话（演示）') }
function toggleStickerPanel(){
  const panel = qs('#chatActionPanel')
  if(panel.style.display === 'grid'){ panel.style.display = 'none'; return }
  panel.style.display = 'grid'
  const stickers = getStickers()
  panel.innerHTML = stickers.length ? stickers.map(s => `<button class="action-item" data-src="${esc(s.link)}"><img src="${esc(s.link)}" style="width:54px;height:54px;border-radius:10px;object-fit:cover"><span>${esc(s.note)}</span></button>`).join('') : '<div style="grid-column:1/-1;text-align:center;color:var(--muted);font-size:12px">暂无表情包，请在发现页导入</div>'
  qsa('.action-item[data-src]', panel).forEach(b => b.onclick = () => { addMsg(activeChatId, { sender:'me', type:'sticker', dataUrl: b.dataset.src, text:'' }); panel.style.display = 'none' })
}
function toggleActionPanel(){
  const panel = qs('#chatActionPanel')
  if(panel.style.display === 'grid'){ panel.style.display = 'none'; return }
  panel.style.display = 'grid'
  panel.innerHTML = `
    <button class="action-item" data-a="photo"><div class="ai" style="background:linear-gradient(160deg,#5e6a76,#333a44)">图</div><span>照片</span></button>
    <button class="action-item" data-a="transfer"><div class="ai" style="background:linear-gradient(160deg,#e8a23d,#8a5a12)">转</div><span>转账</span></button>
    <button class="action-item" data-a="redpacket"><div class="ai" style="background:linear-gradient(160deg,#d44a3f,#7c2a22)">包</div><span>红包</span></button>
    <button class="action-item" data-a="location"><div class="ai" style="background:linear-gradient(160deg,#5d7a66,#35473c)">位</div><span>位置</span></button>
    <button class="action-item" data-a="voicecall"><div class="ai" style="background:linear-gradient(160deg,#6d7784,#3c444e)">语</div><span>语音通话</span></button>
    <button class="action-item" data-a="videocall"><div class="ai" style="background:linear-gradient(160deg,#7a828c,#474e57)">视</div><span>视频通话</span></button>
    <button class="action-item" data-a="sticker"><div class="ai" style="background:linear-gradient(160deg,#716a5e,#403c35)">表</div><span>表情包</span></button>
    <button class="action-item" data-a="mind"><div class="ai" style="background:linear-gradient(160deg,#6f6355,#3f3830)">心</div><span>角色心声</span></button>`
  qsa('.action-item[data-a]', panel).forEach(b => b.onclick = () => handleChatAction(b.dataset.a, panel))
}
function handleChatAction(a, panel){
  const chat = getChats().find(c => c.id === activeChatId)
  const char = chat ? getCharByName(chat.name) : null
  panel.style.display = 'none'
  if(a === 'photo'){ pickImage(d => addMsg(activeChatId, { sender:'me', type:'image', dataUrl:d, text:'' })) }
  else if(a === 'transfer'){ const amt = prompt('转账金额：', '88.88'); if(amt !== null) addMsg(activeChatId, { sender:'me', type:'transfer', text: Number(amt||0).toFixed(2) }) }
  else if(a === 'redpacket'){ const amt = prompt('红包金额：', '66'); if(amt !== null) addMsg(activeChatId, { sender:'me', type:'redpacket', text: amt }) }
  else if(a === 'location'){ addMsg(activeChatId, { sender:'me', type:'location', text:'会展中心 · 2号门' }) }
  else if(a === 'voicecall'){ addMsg(activeChatId, { sender:'me', type:'call', text:'语音通话 已拨打' }) }
  else if(a === 'videocall'){ addMsg(activeChatId, { sender:'me', type:'call', text:'视频通话 已拨打' }) }
  else if(a === 'sticker'){ toggleStickerPanel() }
  else if(a === 'mind'){ toast(`心声：${char?.mind || char?.name + ' 正在想你'}`) }
}
function pickImage(cb){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'
  inp.onchange = () => { const f = inp.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(f) }
  inp.click()
}
function showChatSettings(chatId){
  const chat = getChats().find(c => c.id === chatId)
  const char = chat ? getCharByName(chat.name) : null
  const wbs = getWorldbooks()
  const sel = char ? (char.worldbooks || []) : []
  const body = char ? `
    <div class="field"><label>角色备注</label><textarea id="csNote" rows="2">${esc(char.note||'')}</textarea></div>
    <div class="field"><label>角色心声（状态栏显示）</label><input id="csMind" value="${esc(char.mind||'')}"></div>
    <div class="field"><label>挂载世界书（多选）</label><div id="csWb"></div></div>
    <div class="field"><label><span class="switch" style="vertical-align:middle"><input type="checkbox" id="csReadNoReply" ${char.readNoReply?'checked':''}><span class="slider"></span></span> 开启已读不回</label></div>
    <div class="field"><label><span class="switch" style="vertical-align:middle"><input type="checkbox" id="csTimeSense" ${char.timeSense?'checked':''}><span class="slider"></span></span> 时间感知</label></div>
    <button class="btn btn-block btn-secondary" id="csSummarize">生成角色内容向量总结</button>
    <div class="field" style="margin-top:10px"><label>向量总结</label><div class="hint" id="csSummary">${esc(char.summary||'点击生成')}</div></div>` : `<div class="empty">群聊设置</div>`
  showModal({ title:(char?char.name:chat.name)+' 设置', body, actions:[{label:'关闭', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){ if(!char){ closeModal(); return } char.note = qs('#csNote').value.trim(); char.mind = qs('#csMind').value.trim(); char.readNoReply = qs('#csReadNoReply').checked; char.timeSense = qs('#csTimeSense').checked; char.worldbooks = qsa('#csWb input:checked').map(i => i.value); setCharacters(getCharacters()); renderChatDetail(); closeModal() }}] })
  const wbBox = qs('#csWb')
  if(wbBox) wbBox.innerHTML = wbs.length ? wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0"><input type="checkbox" value="${w.id}" ${sel.includes(w.id)?'checked':''}><span style="font-size:13px">${esc(w.name)}${w.resident?' (常驻)':''}</span></div>`).join('') : '<div class="hint">暂无世界书，请先导入</div>'
  const sumBtn = qs('#csSummarize')
  if(sumBtn) sumBtn.onclick = () => { if(!char) return; char.summary = `角色「${char.name}」：${char.persona||''}。${char.mind? '心声：'+char.mind:''}${char.readNoReply?' · 已读不回':''}${char.timeSense?' · 时间感知':''}`; setCharacters(getCharacters()); qs('#csSummary').textContent = char.summary }
}

// ============ 朋友圈/收藏/表情包（子页面） ============
function renderSubPage(key){
  const container = qs('#appContainer')
  container.innerHTML = `<div class="app-screen"><header class="app-header"><button class="header-btn back" data-action="back"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><h1 class="header-title">${SUBPAGES[key]}</h1><span class="header-spacer"></span></header><div class="app-body" id="subBody"></div></div>`
  const body = qs('#subBody')
  if(key === 'moments') renderMoments(body)
  else if(key === 'favorites') renderFavorites(body)
  else if(key === 'stickers') renderStickerManage(body)
}
function renderMoments(body){
  const moments = getMoments()
  body.innerHTML = `<div class="field"><textarea id="momentText" rows="2" placeholder="这一刻想分享什么"></textarea><div style="margin-top:8px"><button class="btn btn-block" id="postMomentBtn">发表</button></div></div>` + moments.map(m => `<div class="moment-item"><div class="m-head"><div class="m-avatar icon-character">${esc((m.author||'我')[0])}</div><div><div class="m-name">${esc(m.author||'我')}</div><div class="m-time">${timeAgo(m.time)}</div></div></div><div class="m-text">${esc(m.text)}</div>${m.image?`<img class="m-img" src="${m.image}">`:''}<div class="m-actions"><span>赞 ${m.likes?.length||0}</span><span>评论 ${m.comments?.length||0}</span></div></div>`).join('')
  qs('#postMomentBtn').onclick = () => { const t = qs('#momentText').value.trim(); if(!t){ toast('请输入内容'); return } const p = currentProfile()||{}; const ms = getMoments(); ms.unshift({ id:uid('mm'), author:p.name||'我', text:t, time:now(), likes:[], comments:[] }); setMoments(ms); renderMoments(body) }
}
function renderFavorites(body){
  const favs = getFavorites()
  body.innerHTML = favs.length ? favs.map(f => `<div class="list-item"><div class="item-body"><div class="item-title" style="font-size:14px">${esc(f.text)}</div><div class="item-sub">${timeAgo(f.time)}</div></div></div>`).join('') : '<div class="empty">暂无收藏</div>'
}
function renderStickerManage(body){
  body.innerHTML = `<div class="card"><div class="field"><label>图床链接</label><input id="stLink" placeholder="https://.../表情.png"></div><div class="field"><label>中文说明（必须含汉字，解释表情含义）</label><input id="stNote" placeholder="例如：这是一个眨眼卖萌的表情"></div><button class="btn btn-block" id="addStBtn">导入表情包</button></div><div id="stList"></div>`
  qs('#addStBtn').onclick = () => { const link = qs('#stLink').value.trim(); const note = qs('#stNote').value.trim(); if(!link||!note){ toast('请填写链接和说明'); return } if(!/[\u4e00-\u9fa5]/.test(note)){ toast('说明文字必须包含汉字'); return } const st = getStickers(); st.unshift({ link, note }); setStickers(st); qs('#stLink').value=''; qs('#stNote').value=''; renderStickerList(qs('#stList')) }
  renderStickerList(qs('#stList'))
}
function renderStickerList(el){
  const st = getStickers()
  el.innerHTML = st.length ? `<div class="item-grid" style="grid-template-columns:repeat(3,1fr)">` + st.map(s => `<div class="sweet-item"><img src="${esc(s.link)}" style="width:100%;height:60px;object-fit:cover;border-radius:8px"><div class="si-name" style="font-size:10px">${esc(s.note)}</div></div>`).join('') + `</div>` : '<div class="empty">暂无表情包</div>'
}

// ============ 设置 ============
function getSettings(){ return store.get('settings', { fontSize:15, apiUrl:'', apiKey:'', modelName:'', notify:false, neteaseApi:'' }) }
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
    <div class="card"><div class="field"><label>字体大小：<span id="fsVal">${s.fontSize}px</span></label><input type="range" id="setFontSize" min="12" max="22" value="${s.fontSize}"></div><div class="field"><label>自定义壁纸</label><input type="file" id="setWallpaper" accept="image/*"></div><button class="btn btn-block" id="applyFontBtn">应用外观</button></div>
    <div class="section-title">AI API</div>
    <div class="card"><div class="field"><label>API 地址</label><input id="setApiUrl" value="${esc(s.apiUrl)}" placeholder="https://api.example.com"></div><div class="field"><label>API 密钥</label><input id="setApiKey" value="${esc(s.apiKey)}" placeholder="密钥"></div><div class="field"><label>模型名称</label><input id="setModelName" value="${esc(s.modelName)}" placeholder="gpt-xx"></div><button class="btn btn-block" id="saveApiBtn">保存 API</button></div>
    <div class="section-title">网易云音乐 API</div>
    <div class="card"><div class="field"><label>NeteaseCloudMusicApi 地址</label><input id="setNeteaseApi" value="${esc(s.neteaseApi)}" placeholder="https://你的-api-实例"><div class="hint">扫码登录/歌单/音源需部署 NeteaseCloudMusicApi 服务后填入地址</div></div><button class="btn btn-block" id="saveNeteaseBtn">保存</button></div>
    <div class="section-title">通用</div>
    <div class="card"><div class="list-group" style="border:1px solid var(--hairline)"><div class="list-item"><div class="item-body"><div class="item-title">前端通知</div></div><label class="switch"><input type="checkbox" id="setNotify" ${s.notify?'checked':''}><span class="slider"></span></label></div></div><button class="btn btn-secondary btn-block" id="exportBackupBtn">导出备份</button><div class="field" style="margin-top:10px"><label>导入备份</label><input type="file" id="importBackupInput" accept="application/json"></div></div>`
  qs('#setFontSize').oninput = e => qs('#fsVal').textContent = e.target.value + 'px'
  qs('#applyFontBtn').onclick = () => { s.fontSize = qs('#setFontSize').value; saveSettings(s); applyFontToDoc(); toast('已应用') }
  qs('#saveApiBtn').onclick = () => { s.apiUrl = qs('#setApiUrl').value.trim(); s.apiKey = qs('#setApiKey').value.trim(); s.modelName = qs('#setModelName').value.trim(); saveSettings(s); toast('API 已保存') }
  qs('#saveNeteaseBtn').onclick = () => { s.neteaseApi = qs('#setNeteaseApi').value.trim().replace(/\/$/,''); saveSettings(s); toast('网易云 API 已保存') }
  qs('#setWallpaper').onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { store.rawSet('wallpaper_custom', r.result); applyWallpaper(); toast('壁纸已保存') }; r.readAsDataURL(f) }
  qs('#setNotify').onchange = e => { s.notify = e.target.checked; saveSettings(s) }
  qs('#exportBackupBtn').onclick = exportBackup
  qs('#importBackupInput').onchange = e => importBackup(e.target.files[0])
  qs('#addProfileBtn').onclick = () => profileForm(null)
  qsa('[data-profile]', body).forEach(item => item.onclick = () => profileForm(item.dataset.profile))
}
function applyFontToDoc(){ document.documentElement.style.fontSize = getSettings().fontSize + 'px' }
function applyWallpaper(){ const c = store.raw('wallpaper_custom'); const v = qs('.wallpaper-veil'); if(v && c) v.style.backgroundImage = `url(${c})` }
function profileForm(id){
  const p = id ? getProfiles().find(x => x.id === id) : null
  showModal({ title: p?'编辑用户配置':'新建用户配置', body:`<div class="field"><label>名称</label><input id="pfName" value="${esc(p?.name||'')}"></div><div class="field"><label>人设（性格/口吻/背景）</label><textarea id="pfPersona" rows="4">${esc(p?.persona||'')}</textarea></div>`, actions:[{label:'取消', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){ const name = qs('#pfName').value.trim(); if(!name){ toast('请输入名称'); return } const profs = getProfiles(); if(p){ p.name=name; p.persona=qs('#pfPersona').value.trim() } else { const np = { id:uid('p'), name, persona:qs('#pfPersona').value.trim() }; profs.push(np); setActiveProfile(np.id) } setProfiles(profs); renderSettings(); closeModal() }}] })
}
function exportBackup(){
  const data = { settings:getSettings(), profiles:getProfiles(), characters:getCharacters(), worldbooks:getWorldbooks(), styles:getStyles(), chats:getChats(), moments:getMoments(), favorites:getFavorites(), diary:getDiary(), tasks:getTasks(), points:getPoints() }
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'xiaomeng_backup.json'; a.click()
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
  body.innerHTML = `
    <div class="seg-tabs"><button class="seg active" data-ct="list">角色列表</button><button class="seg" data-ct="guide">使用说明</button></div>
    <div class="seg-panel active" id="segList"></div>
    <div class="seg-panel" id="segGuide"><div class="card"><h3>防串味机制说明</h3><p style="font-size:13px;color:var(--text-2);line-height:1.7">每个角色拥有独立的「说话口吻」「绝对禁止提及」「注意避免」三条防线，AI 回复时会注入角色专属上下文，并明确提示不要模仿其他角色，从而避免人设混淆。</p></div></div>`
  renderCharList(qs('#segList'), chars, ac)
  qsa('[data-ct]', body).forEach(t => t.onclick = () => { qsa('[data-ct]', body).forEach(x => x.classList.remove('active')); t.classList.add('active'); qsa('.seg-panel', body).forEach(p => p.classList.remove('active')); qs(t.dataset.ct === 'list' ? '#segList' : '#segGuide').classList.add('active') })
}
function renderCharList(el, chars, ac){
  const wbs = getWorldbooks()
  el.innerHTML = chars.map(c => {
    const wbCount = (c.worldbooks||[]).length + (c.residentWorldbooks||[]).length
    return `<div class="char-card-big ${c.id===ac?'active':''}">
      ${c.id===ac?'<div class="cc-badge">使用中</div>':''}
      <div class="cc-head"><div class="cc-avatar icon-character">${esc((c.name||'?')[0])}</div><div><div class="cc-name">${esc(c.name)}</div><div class="cc-tags">${esc((c.tags||[]).join('、')||'无标签')} · 挂载 ${wbCount} 本世界书</div></div></div>
      <div class="cc-mind">心声：${esc(c.mind || DEFAULT_MIND)}</div>
      <div class="cc-persona">${esc(c.persona||'未填写人设')}</div>
      <div class="cc-actions"><button class="btn btn-sm" data-use="${c.id}">设为当前</button><button class="btn btn-sm btn-secondary" data-edit="${c.id}">编辑</button><button class="btn btn-sm btn-ghost" data-del="${c.id}">删除</button></div>
    </div>`
  }).join('') || '<div class="empty">暂无角色，点右上角 + 新建</div>'
  qsa('[data-use]', el).forEach(b => b.onclick = () => { setActiveChar(b.dataset.use); renderCharacter() })
  qsa('[data-edit]', el).forEach(b => b.onclick = () => charForm(b.dataset.edit))
  qsa('[data-del]', el).forEach(b => b.onclick = () => { if(confirm('删除该角色？')){ setCharacters(getCharacters().filter(c => c.id !== b.dataset.del)); renderCharacter() } })
}
function charForm(id){
  const c = id ? getChar(id) : null
  const wbs = getWorldbooks()
  const styles = getStyles()
  const onlineStyles = styles.filter(s => s.mode !== 'offline')
  const offlineStyles = styles.filter(s => s.mode === 'offline')
  showModal({ title: c?'编辑角色':'新建角色', body:`
    <div class="field"><label>角色名</label><input id="cfName" value="${esc(c?.name||'')}"></div>
    <div class="field"><label>人设（性格/背景/经历）</label><textarea id="cfPersona" rows="4">${esc(c?.persona||'')}</textarea></div>
    <div class="field"><label>标签（顿号分隔）</label><input id="cfTags" value="${esc((c?.tags||[]).join('、'))}"></div>
    <div class="field"><label>角色心声（状态栏）</label><input id="cfMind" value="${esc(c?.mind||DEFAULT_MIND)}"><div class="hint">内置初始心声，可修改</div></div>
    <div class="guard-box"><div class="guard-title">防串味 / 防人设混淆机制</div>
      <div class="field"><label>说话口吻</label><input id="cfSpeech" value="${esc(c?.guard?.speechStyle||'')}" placeholder="例如：温柔克制、短句、留白"></div>
      <div class="field"><label>绝对禁止提及（顿号分隔）</label><input id="cfForbidden" value="${esc((c?.guard?.forbiddenTopics||[]).join('、'))}" placeholder="其他角色名、无关设定"></div>
      <div class="field"><label>注意避免（负面提示）</label><textarea id="cfNegative" rows="2">${esc(c?.guard?.negativePrompts||'')}</textarea></div>
    </div>
    <div class="field"><label>挂载世界书（多选）</label><div id="cfWb"></div></div>
    <div class="field"><label>常驻世界书（始终生效）</label><div id="cfWbResident"></div></div>
    <div class="field"><label>线上文风</label><select id="cfOnlineStyle"><option value="">无</option>${onlineStyles.map(s => `<option value="${s.id}" ${c?.onlineStyle===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="field"><label>线下文风</label><select id="cfOfflineStyle"><option value="">无</option>${offlineStyles.map(s => `<option value="${s.id}" ${c?.offlineStyle===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>`,
  actions:[{label:'取消', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){
    const name = qs('#cfName').value.trim(); if(!name){ toast('请输入角色名'); return }
    const data = { name, persona:qs('#cfPersona').value.trim(), tags:qs('#cfTags').value.split('、').map(t=>t.trim()).filter(Boolean), mind:qs('#cfMind').value.trim()||DEFAULT_MIND, guard:{ speechStyle:qs('#cfSpeech').value.trim(), forbiddenTopics:qs('#cfForbidden').value.split('、').map(t=>t.trim()).filter(Boolean), negativePrompts:qs('#cfNegative').value.trim() }, worldbooks:qsa('#cfWb input:checked').map(i=>i.value), residentWorldbooks:qsa('#cfWbResident input:checked').map(i=>i.value), onlineStyle:qs('#cfOnlineStyle').value, offlineStyle:qs('#cfOfflineStyle').value, readNoReply:c?.readNoReply||false, timeSense:c?.timeSense!==false }
    const chars = getCharacters()
    if(c) Object.assign(c, data); else { data.id = uid('char'); chars.push(data); setActiveChar(data.id) }
    setCharacters(chars); renderCharacter(); closeModal()
  }}] })
  const wbBox = qs('#cfWb'), wbResident = qs('#cfWbResident')
  if(wbBox) wbBox.innerHTML = wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><input type="checkbox" value="${w.id}" ${(c?.worldbooks||[]).includes(w.id)?'checked':''}><span style="font-size:13px">${esc(w.name)}</span></div>`).join('') || '<div class="hint">暂无世界书</div>'
  if(wbResident) wbResident.innerHTML = wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><input type="checkbox" value="${w.id}" ${(c?.residentWorldbooks||[]).includes(w.id)?'checked':''}><span style="font-size:13px">${esc(w.name)}</span></div>`).join('') || '<div class="hint">暂无世界书</div>'
}

// ============ 世界书 ============
function renderWorldbook(){
  const body = qs('#worldbookBody')
  body.innerHTML = `
    <div class="seg-tabs"><button class="seg active" data-wt="import">导入</button><button class="seg" data-wt="list">我的世界书</button></div>
    <div class="seg-panel active" id="segImport">
      <div class="card"><h3>导入世界书</h3>
        <div class="field"><label>导入文件（txt / docx / json / md）</label><input type="file" id="wbFile" accept=".txt,.docx,.json,.md,.mdx"></div>
        <div class="field"><label>或粘贴文本</label><textarea id="wbPaste" rows="5" placeholder="直接粘贴世界书内容..."></textarea></div>
        <div class="field"><label>名称</label><input id="wbName" placeholder="世界书名称"></div>
        <button class="btn btn-block" id="wbAddBtn">添加世界书</button>
      </div>
    </div>
    <div class="seg-panel" id="segList"><div id="wbList"></div></div>`
  qs('#wbAddBtn').onclick = addWorldbook
  qs('#wbFile').onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { qs('#wbPaste').value = r.result; if(!qs('#wbName').value) qs('#wbName').value = f.name.replace(/\.[^.]+$/,'') }; r.readAsText(f) }
  renderWbList(qs('#wbList'))
  qsa('[data-wt]', body).forEach(t => t.onclick = () => { qsa('[data-wt]', body).forEach(x => x.classList.remove('active')); t.classList.add('active'); qsa('.seg-panel', body).forEach(p => p.classList.remove('active')); qs(t.dataset.wt==='import'?'#segImport':'#segList').classList.add('active') })
}
function focusWbInput(){ qs('#wbName').focus() }
function addWorldbook(){
  const name = qs('#wbName').value.trim(), content = qs('#wbPaste').value.trim()
  if(!name || !content){ toast('请填写名称和内容'); return }
  const wbs = getWorldbooks(); wbs.push({ id:uid('wb'), name, content, resident:false, priority:wbs.length+1, source:'import', createdAt:now() })
  setWorldbooks(wbs); qs('#wbName').value=''; qs('#wbPaste').value=''; renderWbList(qs('#wbList')); toast('世界书已添加')
}
function wbForm(id){
  const w = getWorldbooks().find(x => x.id === id); if(!w) return
  showModal({ title:'编辑世界书', body:`<div class="field"><label>名称</label><input id="ewName" value="${esc(w.name)}"></div><div class="field"><label>内容</label><textarea id="ewContent" rows="6">${esc(w.content)}</textarea></div>`, actions:[{label:'取消', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){ w.name = qs('#ewName').value.trim(); w.content = qs('#ewContent').value.trim(); setWorldbooks(getWorldbooks()); renderWorldbook(); closeModal() }}] })
}
function renderWbList(el){
  const wbs = getWorldbooks()
  el.innerHTML = wbs.map(w => `<div class="wb-item"><div class="wb-top"><div class="wb-name">${esc(w.name)}</div><label class="switch" title="是否常驻"><input type="checkbox" data-resident="${w.id}" ${w.resident?'checked':''}><span class="slider"></span></label></div><div class="wb-content">${esc(w.content)}</div><div class="wb-meta"><span>${w.resident?'常驻':'非驻留'}</span><span>优先级 ${w.priority}</span><span>${esc(w.source||'import')}</span></div><div class="wb-actions"><button class="btn btn-sm btn-secondary" data-edit="${w.id}">编辑</button><button class="btn btn-sm" data-up="${w.id}">优先级 ↑</button><button class="btn btn-sm btn-ghost" data-del="${w.id}">删除</button></div></div>`).join('') || '<div class="empty">暂无世界书，请导入</div>'
  qsa('[data-resident]', el).forEach(i => i.onchange = () => { const w = getWorldbooks().find(x => x.id === i.dataset.resident); w.resident = i.checked; setWorldbooks(getWorldbooks()); renderWbList(el) })
  qsa('[data-edit]', el).forEach(b => b.onclick = () => wbForm(b.dataset.edit))
  qsa('[data-del]', el).forEach(b => b.onclick = () => { if(confirm('删除？')){ setWorldbooks(getWorldbooks().filter(x => x.id !== b.dataset.del)); renderWbList(el) } })
  qsa('[data-up]', el).forEach(b => b.onclick = () => { const wbs = getWorldbooks(); const w = wbs.find(x => x.id === b.dataset.up); if(w && w.priority > 1){ w.priority--; const other = wbs.find(x => x.priority === w.priority && x.id !== w.id); if(other) other.priority++; setWorldbooks(wbs); renderWbList(el) } })
}

// ============ 文风 ============
function renderStyle(){
  const body = qs('#styleBody')
  const styles = getStyles()
  body.innerHTML = styles.map(s => `<div class="wb-item"><div class="wb-top"><div class="wb-name">${esc(s.name)}</div><span class="chip ${s.mode==='offline'?'active':''}" style="font-size:10px;padding:3px 9px">${s.mode==='offline'?'线下':'线上'}</span></div><div class="wb-content">${esc(s.scene||'')}${s.scene?' · ':''}${esc(s.content)}</div><div class="wb-actions"><button class="btn btn-sm btn-secondary" data-edit="${s.id}">编辑</button><button class="btn btn-sm" data-toggle="${s.id}">${s.mode==='offline'?'转线上':'转线下'}</button><button class="btn btn-sm btn-ghost" data-del="${s.id}">删除</button></div></div>`).join('') || '<div class="empty">暂无文风，点右上角 + 新建</div>'
  qsa('[data-edit]', body).forEach(b => b.onclick = () => styleForm(b.dataset.edit))
  qsa('[data-toggle]', body).forEach(b => b.onclick = () => { const s = getStyles().find(x => x.id === b.dataset.toggle); s.mode = s.mode==='offline'?'online':'offline'; setStyles(getStyles()); renderStyle() })
  qsa('[data-del]', body).forEach(b => b.onclick = () => { if(confirm('删除？')){ setStyles(getStyles().filter(x => x.id !== b.dataset.del)); renderStyle() } })
}
function styleForm(id){
  const s = id ? getStyles().find(x => x.id === id) : null
  showModal({ title: s?'编辑文风':'新建文风', body:`<div class="field"><label>名称</label><input id="sfName" value="${esc(s?.name||'')}"></div><div class="field"><label>适用场景</label><input id="sfScene" value="${esc(s?.scene||'')}"></div><div class="field"><label>风格内容</label><textarea id="sfContent" rows="5">${esc(s?.content||'')}</textarea></div><div class="field"><label>类型</label><select id="sfMode"><option value="online" ${s?.mode!=='offline'?'selected':''}>线上</option><option value="offline" ${s?.mode==='offline'?'selected':''}>线下</option></select></div>`, actions:[{label:'取消', cls:'btn btn-secondary'},{label:'保存', cls:'btn', onOk(){ const name = qs('#sfName').value.trim(), content = qs('#sfContent').value.trim(); if(!name||!content){ toast('名称和内容不能为空'); return } const obj = { name, scene:qs('#sfScene').value.trim(), content, mode:qs('#sfMode').value }; const styles = getStyles(); if(s) Object.assign(s, obj); else { obj.id = uid('style'); styles.unshift(obj) } setStyles(styles); renderStyle(); closeModal() }}] })
}

// ============ 网易云音乐 ============
let audioEl = null
let neteaseCookie = ''
function neBase(){ return getSettings().neteaseApi || '' }
function renderMusic(){
  const body = qs('#musicBody')
  const user = store.get('neteaseUser', null)
  const tracks = store.get('tracks', [])
  body.innerHTML = `
    <div class="music-hero">
      <div class="music-user"><div class="avatar">${user?esc((user.nickname||'云')[0]):'云'}</div><div><div class="nick">${user?esc(user.nickname):'未登录'}</div><div class="status">${user?'已登录网易云账号':'扫码登录网易云'}</div></div><div style="flex:1"></div><button class="btn btn-sm btn-netease" id="neLogin">${user?'退出':'扫码登录'}</button></div>
      <div class="music-subtabs"><button class="tab active" data-mt="local">本地音乐</button><button class="tab" data-mt="playlist">我的歌单</button><button class="tab" data-mt="search">搜索</button><button class="tab" data-mt="listen">与 ta 共听</button></div>
    </div>
    <div class="music-body-inner" id="musicInner"></div>
    <div class="player-bar" id="playerBar" style="display:none"><div class="pb-art" id="pbArt"></div><div class="pb-info"><div class="pb-name" id="pbName">未播放</div><div class="pb-artist" id="pbArtist"></div></div><button class="pb-btn" id="pbPlay"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button></div>`
  qs('#neLogin').onclick = () => { if(user){ store.set('neteaseUser', null); neteaseCookie=''; renderMusic() } else neteaseQRLogin() }
  const renderInner = tab => {
    qsa('.music-subtabs .tab').forEach(t => t.classList.toggle('active', t.dataset.mt === tab))
    const inner = qs('#musicInner')
    if(tab === 'local') renderTrackList(inner, tracks)
    else if(tab === 'playlist') renderPlaylists(inner)
    else if(tab === 'search') renderMusicSearch(inner)
    else if(tab === 'listen') renderListen(inner)
  }
  qsa('.music-subtabs .tab').forEach(t => t.onclick = () => renderInner(t.dataset.mt))
  qs('#pbPlay').onclick = () => { if(audioEl){ if(audioEl.paused){ audioEl.play(); qs('#pbPlay').innerHTML = pauseSVG() } else { audioEl.pause(); qs('#pbPlay').innerHTML = playSVG() } } }
  renderInner('local')
}
function playSVG(){ return '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' }
function pauseSVG(){ return '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>' }
function playTrack(t){
  qs('#pbName').textContent = t.name; qs('#pbArtist').textContent = t.artist || ''
  qs('#playerBar').style.display = 'flex'; qs('#pbPlay').innerHTML = pauseSVG()
  if(audioEl){ audioEl.pause() }
  audioEl = new Audio(t.url || t.mp3url)
  audioEl.play().catch(() => {})
}
function renderTrackList(el, tracks){
  el.innerHTML = tracks.length ? tracks.map((t,i) => `<div class="track-row" data-i="${i}"><div class="track-idx">${i+1}</div><div class="track-info"><div class="track-name">${esc(t.name)}</div><div class="track-artist">${esc(t.artist||'')}</div></div><div class="track-play">♪</div></div>`).join('') : '<div class="empty">暂无歌曲，请搜索或登录导入歌单</div>'
  qsa('.track-row', el).forEach(r => r.onclick = () => playTrack(tracks[+r.dataset.i]))
}
function renderListen(el){
  const char = currentChar()
  const tracks = store.get('tracks', [])
  el.innerHTML = `<div class="card"><h3>与 ta 一起听</h3><p style="font-size:13px;color:var(--muted)">${char?`正在与 ${esc(char.name)} 共听，选一首歌开始吧`:'暂无角色，请先创建角色'}</p></div>` + (tracks.length?tracks.map((t,i) => `<div class="track-row" data-i="${i}"><div class="track-idx">${i+1}</div><div class="track-info"><div class="track-name">${esc(t.name)}</div><div class="track-artist">${esc(t.artist||'')}</div></div><div class="track-play">♪</div></div>`).join(''):'<div class="empty">暂无共听曲目</div>')
  qsa('.track-row', el).forEach(r => r.onclick = () => { playTrack(tracks[+r.dataset.i]); toast(char?`已开启与 ${char.name} 共听`:'') })
}
function renderMusicSearch(el){
  el.innerHTML = `<div class="card"><div class="field"><label>搜索歌曲（联网）</label><input id="musicSearchInput" placeholder="歌名/歌手"></div><button class="btn btn-block btn-netease" id="musicSearchBtn">搜索</button><div class="field" style="margin-top:10px"><label>本地导入</label><input type="file" id="trackFile" accept="audio/*"></div></div><div id="searchResults"></div>`
  qs('#musicSearchBtn').onclick = () => musicSearch(qs('#musicSearchInput').value.trim(), qs('#searchResults'))
  qs('#trackFile').onchange = e => { const f = e.target.files[0]; if(!f) return; const url = URL.createObjectURL(f); const tracks = store.get('tracks', []); tracks.push({ name: f.name.replace(/\.[^.]+$/,''), artist:'本地导入', url }); store.set('tracks', tracks); toast('已导入') }
}
function musicSearchModal(){
  showModal({ title:'搜索歌曲', body:`<div class="field"><input id="mSearchQ" placeholder="歌名/歌手"></div>`, actions:[{label:'搜索', cls:'btn btn-block btn-netease', onOk(){ const q = qs('#mSearchQ').value.trim(); if(q) musicSearch(q, null, true) }}] })
}
async function musicSearch(q, box, asModal){
  if(!q){ toast('请输入搜索内容'); return }
  const base = neBase()
  if(!base){ renderLocalSearch(q, box); return }
  try{
    const res = await fetch(`${base}/search?keywords=${encodeURIComponent(q)}&limit=30`)
    const j = await res.json()
    const songs = (j.result && j.result.songs) || []
    if(!songs.length){ toast('未找到结果'); return }
    const list = songs.map(s => ({ name:s.name, artist:(s.artists||[]).map(a=>a.name).join('/'), id:s.id }))
    showSearchResults(list, box, asModal)
  }catch(e){ renderLocalSearch(q, box) }
}
function renderLocalSearch(q, box){
  const results = [{ name:q, artist:'搜索演示 · 需配置网易云 API' },{ name:q+' (Live)', artist:'搜索演示' },{ name:q+' (Remix)', artist:'搜索演示' }]
  showSearchResults(results, box, false)
}
function showSearchResults(list, box, asModal){
  const html = `<div class="section-title">搜索结果（${list.length}）</div>` + list.map((r,i) => `<div class="track-row" data-sr="${i}"><div class="track-info"><div class="track-name">${esc(r.name)}</div><div class="track-artist">${esc(r.artist)}</div></div><div class="track-play">+</div></div>`).join('')
  if(asModal){ closeModal(); showModal({ title:'搜索结果', body:html, actions:[{label:'关闭', cls:'btn btn-block'}] }) }
  else if(box){ box.innerHTML = html }
  const target = asModal ? qs('.modal') : box
  qsa('[data-sr]', target).forEach(r => r.onclick = async () => {
    const t = list[+r.dataset.sr]
    const base = neBase()
    let url = ''
    if(base && t.id){ try{ const u = await fetch(`${base}/song/url?id=${t.id}${neteaseCookie?'&cookie='+encodeURIComponent(neteaseCookie):''}`); const uj = await u.json(); url = (uj.data && uj.data[0] && uj.data[0].url) || '' }catch(e){} }
    const tracks = store.get('tracks', []); tracks.push({ name:t.name, artist:t.artist, url }); store.set('tracks', tracks)
    toast(url?'已加入本地音乐（有音源）':'已加入（无音源，可本地导入）')
    if(asModal) closeModal()
  })
}
async function renderPlaylists(el){
  const base = neBase()
  const user = store.get('neteaseUser', null)
  if(!user){ el.innerHTML = '<div class="empty">请先扫码登录</div>'; return }
  if(!base){ el.innerHTML = '<div class="empty">请先在设置页配置网易云 API 地址</div>'; return }
  el.innerHTML = '<div class="empty">加载歌单中...</div>'
  try{
    const res = await fetch(`${base}/user/playlist?uid=${user.userId}${neteaseCookie?'&cookie='+encodeURIComponent(neteaseCookie):''}`)
    const j = await res.json()
    const pls = (j.playlist || []).filter(p => p.trackCount > 0)
    el.innerHTML = pls.map(p => `<div class="playlist-card" data-pl="${p.id}"><div class="pl-cover">${esc((p.name||'歌')[0])}</div><div class="pl-info"><div class="pl-name">${esc(p.name)}</div><div class="pl-count">${p.trackCount} 首</div></div><span class="chevron">›</span></div>`).join('') || '<div class="empty">暂无歌单</div>'
    qsa('[data-pl]', el).forEach(c => c.onclick = () => loadPlaylist(c.dataset.pl))
  }catch(e){ el.innerHTML = '<div class="empty">歌单加载失败，请检查 API 地址</div>' }
}
async function loadPlaylist(id){
  const base = neBase()
  try{
    const res = await fetch(`${base}/playlist/detail?id=${id}${neteaseCookie?'&cookie='+encodeURIComponent(neteaseCookie):''}`)
    const j = await res.json()
    const tracks = (j.playlist && j.playlist.tracks) || []
    const list = tracks.map(t => ({ name:t.name, artist:(t.ar||[]).map(a=>a.name).join('/'), id:t.id }))
    showModal({ title:'歌单歌曲', body:`<div style="max-height:50vh;overflow-y:auto">` + list.map((r,i) => `<div class="track-row" data-pls="${i}"><div class="track-idx">${i+1}</div><div class="track-info"><div class="track-name">${esc(r.name)}</div><div class="track-artist">${esc(r.artist)}</div></div></div>`).join('') + `</div>`, actions:[{label:'关闭', cls:'btn btn-block'}] })
    qsa('[data-pls]').forEach(async r => {
      r.onclick = async () => { const t = list[+r.dataset.pls]; let url=''; try{ const u = await fetch(`${base}/song/url?id=${t.id}${neteaseCookie?'&cookie='+encodeURIComponent(neteaseCookie):''}`); const uj = await u.json(); url = (uj.data&&uj.data[0]&&uj.data[0].url)||'' }catch(e){} ; const tracks = store.get('tracks', []); tracks.push({ name:t.name, artist:t.artist, url }); store.set('tracks', tracks); closeModal(); toast('已加入本地音乐'); playTrack({ name:t.name, artist:t.artist, url }) }
    })
  }catch(e){ toast('歌单加载失败') }
}
async function neteaseQRLogin(){
  const base = neBase()
  if(!base){ showModal({ title:'需要网易云 API', body:`<div class="hint" style="font-size:13px;line-height:1.7">扫码登录需要部署 NeteaseCloudMusicApi 服务。<br><br>1. 部署该开源项目获得一个 API 地址<br>2. 在「设置 → 网易云音乐 API」填入地址<br>3. 回到这里扫码登录</div>`, actions:[{label:'去设置', cls:'btn btn-block', onOk(){ closeModal(); openApp('settings') }}] }); return }
  // 显示二维码弹窗
  showModal({ title:'扫码登录', body:`<div class="qr-box"><img id="qrImg" src=""><div class="qr-tip" id="qrTip">正在生成二维码...</div></div>`, actions:[{label:'取消', cls:'btn btn-block btn-secondary', onOk(){ closeModal() }}] })
  try{
    const keyRes = await fetch(`${base}/login/qr/key?timestamp=${Date.now()}`)
    const keyData = await keyRes.json()
    const key = keyData.data.unikey
    const qrRes = await fetch(`${base}/login/qr/create?key=${key}&qrimg=true&timestamp=${Date.now()}`)
    const qrData = await qrRes.json()
    const img = qs('#qrImg')
    if(img && qrData.data && qrData.data.qrimg){ img.src = 'data:image/png;base64,' + qrData.data.qrimg; qs('#qrTip').textContent = '请用网易云音乐 App 扫码' }
    pollQR(key)
  }catch(e){ if(qs('#qrTip')) qs('#qrTip').textContent = '二维码生成失败，请检查 API 地址' }
}
function pollQR(key){
  const base = neBase()
  const timer = setInterval(async () => {
    try{
      const res = await fetch(`${base}/login/qr/check?key=${key}&timestamp=${Date.now()}`)
      const j = await res.json()
      const tip = qs('#qrTip')
      if(j.code === 800){ if(tip) tip.textContent = '二维码已过期，请重试'; clearInterval(timer) }
      else if(j.code === 801){ if(tip) tip.textContent = '等待扫码...' }
      else if(j.code === 802){ if(tip) tip.textContent = '已扫码，请在手机上确认' }
      else if(j.code === 803){
        clearInterval(timer)
        neteaseCookie = j.cookie || ''
        // 获取用户信息
        const acct = await fetch(`${base}/login/status?timestamp=${Date.now()}${neteaseCookie?'&cookie='+encodeURIComponent(neteaseCookie):''}`)
        const aj = await acct.json()
        const prof = aj.data && aj.data.profile
        store.set('neteaseUser', { nickname: (prof&&prof.nickname)||'网易云用户', userId: (prof&&prof.userId)||'' })
        closeModal(); renderMusic(); toast('登录成功')
      }
    }catch(e){}
  }, 3000)
}

// ============ 情侣空间 ============
function renderCouple(){
  const body = qs('#coupleBody')
  const points = getPoints()
  const char = currentChar()
  body.innerHTML = `
    <div class="seg-tabs"><button class="seg active" data-cp="diary">日记</button><button class="seg" data-cp="task">任务</button><button class="seg" data-cp="item">道具</button></div>
    <div class="couple-hero"><div class="points">${points}</div><div class="points-label">恋爱积分</div><div class="hearts">与 ${esc(char?.name||'ta')} 的甜蜜值</div></div>
    <div class="seg-panel active" id="cpDiary"></div>
    <div class="seg-panel" id="cpTask"></div>
    <div class="seg-panel" id="cpItem"></div>`
  renderDiaryPanel(qs('#cpDiary'))
  renderTaskPanel(qs('#cpTask'))
  renderItemPanel(qs('#cpItem'))
  qsa('[data-cp]', body).forEach(t => t.onclick = () => { qsa('[data-cp]', body).forEach(x => x.classList.remove('active')); t.classList.add('active'); qsa('.seg-panel', body).forEach(p => p.classList.remove('active')); qs('#' + (t.dataset.cp === 'diary' ? 'cpDiary' : t.dataset.cp === 'task' ? 'cpTask' : 'cpItem')).classList.add('active') })
}
function renderDiaryPanel(el){
  el.innerHTML = `<div class="card"><div class="btn-row"><button class="btn" id="genDiaryNow">立即生成今日日记</button><button class="btn btn-secondary" id="genDiarySchedule">定时生成</button></div><div id="diaryList" style="margin-top:12px"></div></div>`
  renderDiaryList(qs('#diaryList'))
  qs('#genDiaryNow').onclick = () => generateDiary()
  qs('#genDiarySchedule').onclick = () => { toast('已设置每日 21:00 定时生成（演示）'); memorySet('diarySchedule','21:00') }
}
function generateDiary(){
  const char = currentChar()
  const diary = getDiary()
  diary.unshift({ id:uid('d'), date:new Date().toLocaleDateString(), text:`今天，${char?.name||'ta'}在日记里写道：「今天的风很轻，我想起你笑起来的样子。有些话藏在心里很久了，下次见面，我想亲口对你说。」`, time:now() })
  setDiary(diary); renderDiaryList(qs('#diaryList')); toast('日记已生成')
}
function renderDiaryList(el){
  const diary = getDiary()
  el.innerHTML = diary.length ? diary.map(d => `<div class="diary-item"><div class="d-date">${esc(d.date)}</div><div class="d-text">${esc(d.text)}</div></div>`).join('') : '<div class="empty">还没有日记，点击生成</div>'
}
function renderTaskPanel(el){
  el.innerHTML = `<div class="card"><div class="field"><input id="newTaskInput" placeholder="添加想一起做的事"></div><button class="btn btn-block btn-secondary" id="addTaskBtn">添加任务（+10积分）</button><div id="taskList" style="margin-top:12px"></div></div>`
  renderTaskList(qs('#taskList'))
  qs('#addTaskBtn').onclick = () => { const v = qs('#newTaskInput').value.trim(); if(!v) return; const tasks = getTasks(); tasks.push({ id:uid('t'), text:v, done:false, points:10 }); setTasks(tasks); qs('#newTaskInput').value=''; renderTaskList(qs('#taskList')) }
}
function renderTaskList(el){
  const tasks = getTasks()
  el.innerHTML = tasks.length ? tasks.map(t => `<div class="task-row"><label class="switch"><input type="checkbox" data-task="${t.id}" ${t.done?'checked':''}><span class="slider"></span></label><div class="task-name">${esc(t.text)}</div><div class="task-points">+${t.points}</div></div>`).join('') : '<div class="empty">暂无任务</div>'
  qsa('[data-task]', el).forEach(i => i.onchange = () => { const tasks = getTasks(); const t = tasks.find(x => x.id === i.dataset.task); t.done = i.checked; if(t.done) setPoints(getPoints()+t.points); setTasks(tasks); renderCouple() })
}
function renderItemPanel(el){
  const items = [{ name:'早安吻', icon:'吻', cost:20, cls:'icon-couple' },{ name:'拥抱券', icon:'抱', cost:30, cls:'icon-checkphone' },{ name:'一起看电影', icon:'影', cost:50, cls:'icon-music' },{ name:'晚安语音', icon:'晚', cost:25, cls:'icon-character' },{ name:'专属情书', icon:'书', cost:80, cls:'icon-worldbook' },{ name:'秘密约会', icon:'约', cost:100, cls:'icon-reading' }]
  el.innerHTML = `<div class="item-grid">` + items.map(it => `<div class="sweet-item"><div class="si-icon ${it.cls}">${it.icon}</div><div class="si-name">${it.name}</div><div class="si-cost">${it.cost} 积分</div></div>`).join('') + `</div>`
  qsa('.sweet-item', el).forEach((n,i) => n.onclick = () => { const it = items[i]; if(getPoints() >= it.cost){ setPoints(getPoints()-it.cost); toast(`已兑换「${it.name}」`); renderCouple() } else toast('积分不足') })
}

// ============ 查手机 ============
function renderCheckPhone(){
  const body = qs('#checkphoneBody')
  const char = currentChar()
  body.innerHTML = `
    <div class="section-title">查看 ${esc(char?.name||'ta')} 的手机</div>
    <div class="phone-mock"><div class="pm-status"><span>09:41</span><span>${esc(char?.name||'ta')}的手机</span></div><div class="pm-apps">${['微信','相册','便签','音乐','日记','收藏'].map((a,i) => `<div class="pm-app"><div class="pm-icon icon-${['character','photos','notes','music','couple','style'][i]}">${a[0]}</div><span>${a}</span></div>`).join('')}</div></div>
    <div class="section-title">ta 的手机内容</div>
    <div class="card"><div class="diary-item"><div class="d-date">ta 的备忘录</div><div class="d-text">${char ? `${esc(char.name)} 的备忘：${esc(char.mind || DEFAULT_MIND)}` : '暂无'}</div></div><button class="btn btn-block btn-secondary" id="reverseCheck">反向：查看 user 的手机</button></div>`
  qs('#reverseCheck').onclick = () => { const p = currentProfile(); showModal({ title:'查看 user 的手机', body:`<div class="card"><h3>${esc(p?.name||'你')} 的手机</h3><p style="font-size:13px;color:var(--muted)">你的备忘录：${esc(p?.persona||'还没有写人设')}</p></div>`, actions:[{label:'关闭', cls:'btn btn-block'}] }) }
}

// ============ 商城 ============
function renderShop(){
  const body = qs('#shopBody')
  body.innerHTML = `<div class="card"><div class="field"><label>导入商城 HTML</label><input type="file" id="shopFileInput" accept="text/html"></div><p class="hint">导入后商品展示在下方</p></div><div class="section-title">商品</div><div class="shop-items" id="shopItems"></div>`
  qs('#shopFileInput').onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { store.rawSet('shopHtml', r.result); toast('商城 HTML 已导入') }; r.readAsText(f) }
  const products = [{ name:'定制头像', price:9.9, icon:'像' },{ name:'情书模板', price:6.6, icon:'书' },{ name:'主题皮肤', price:19.9, icon:'肤' },{ name:'专属铃声', price:12.0, icon:'铃' }]
  qs('#shopItems').innerHTML = products.map(p => `<div class="shop-product"><div class="sp-img">${p.icon}</div><div class="sp-body"><div class="sp-name">${p.name}</div><div class="sp-price">¥${p.price}</div></div></div>`).join('')
}

// ============ 线下（酒馆） ============
function renderTavern(){
  const body = qs('#tavernBody')
  const chars = getCharacters()
  const wbs = getWorldbooks()
  const styles = getStyles().filter(s => s.mode === 'offline')
  body.innerHTML = `
    <div class="card"><h3>线下 · 酒馆模拟</h3>
      <div class="field"><label>挂载世界书（多选）</label><div id="tvWb"></div></div>
      <div class="field"><label>选择文风</label><select id="tvStyle"><option value="">无</option>${styles.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>在场角色</label><div class="character-grid" id="tvChars" style="grid-template-columns:repeat(3,1fr)"></div></div>
    </div>
    <div id="tvChatArea" style="display:none"><div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--card);border-bottom:1px solid var(--hairline)"><div class="avatar icon-tavern" id="tvAvatar" style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600">线</div><div><div id="tvName" style="font-weight:600">线下</div><div id="tvStatus" style="font-size:12px;color:var(--muted)">灯光微黄，等你开口</div></div></div><div class="message-list" id="tvMessages" style="height:300px"></div><div style="display:flex;gap:8px;padding:10px;background:var(--card);border-top:1px solid var(--hairline)"><input id="tvInput" placeholder="输入动作或对话..." style="flex:1;padding:10px 14px;border-radius:20px;border:1px solid var(--hairline-2);background:var(--card-2);color:var(--text);outline:none"><button class="btn" id="tvSend">发送</button></div></div>`
  qs('#tvWb').innerHTML = wbs.map(w => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><input type="checkbox" value="${w.id}"><span style="font-size:13px">${esc(w.name)}${w.resident?' (常驻)':''}</span></div>`).join('') || '<div class="hint">暂无世界书</div>'
  const grid = qs('#tvChars')
  grid.innerHTML = chars.map(c => `<div class="char-card" data-char="${c.id}"><div class="char-avatar icon-character">${esc((c.name||'?')[0])}</div><div class="char-name">${esc(c.name)}</div></div>`).join('') || '<div class="hint">暂无角色</div>'
  qsa('[data-char]', grid).forEach(c => c.onclick = () => enterTavern(c.dataset.char))
  qs('#tvSend').onclick = tavernSend
  qs('#tvInput').onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); tavernSend() } }
}
function enterTavern(charId){
  const c = getChar(charId)
  qs('#tvChatArea').style.display = 'block'
  qs('#tvAvatar').textContent = (c?.name||'线')[0]
  qs('#tvName').textContent = c?.name
  qs('#tvStatus').textContent = c?.mind || c?.desc || '灯光微黄，等你开口'
  memorySet('tavernChar', charId)
  renderTavernMsgs()
}
function renderTavernMsgs(){
  const list = qs('#tvMessages')
  list.innerHTML = store.get('tavernMsgs', []).map(m => `<div class="msg ${m.sender==='me'?'me':'char'}"><div class="bubble">${esc(m.text)}</div></div>`).join('')
  list.scrollTop = list.scrollHeight
}
function tavernSend(){
  const input = qs('#tvInput'); const text = input.value.trim(); if(!text) return
  const msgs = store.get('tavernMsgs', []); msgs.push({ id:uid('t'), sender:'me', text, time:now() }); store.set('tavernMsgs', msgs); input.value=''; renderTavernMsgs()
  const c = getChar(memory('tavernChar'))
  setTimeout(() => { const msgs2 = store.get('tavernMsgs', []); msgs2.push({ id:uid('t'), sender:'char', text: c ? `${c.name}微微侧头：「${text}……这倒是有点意思。」` : '酒保擦着杯子，等你开口。', time:now() }); store.set('tavernMsgs', msgs2); renderTavernMsgs() }, 700)
}

// ============ 共读（读书应用） ============
function renderReading(){
  const body = qs('#readingBody')
  body.innerHTML = `
    <div class="seg-tabs"><button class="seg active" data-rd="shelf">书架</button><button class="seg" data-rd="fanfic">同人文</button><button class="seg" data-rd="import">导入</button></div>
    <div class="seg-panel active" id="rdShelf"></div>
    <div class="seg-panel" id="rdFanfic"></div>
    <div class="seg-panel" id="rdImport"></div>`
  renderShelf(qs('#rdShelf'))
  renderFanficPanel(qs('#rdFanfic'))
  renderImportPanel(qs('#rdImport'))
  qsa('[data-rd]', body).forEach(t => t.onclick = () => { qsa('[data-rd]', body).forEach(x => x.classList.remove('active')); t.classList.add('active'); qsa('.seg-panel', body).forEach(p => p.classList.remove('active')); qs('#' + (t.dataset.rd==='shelf'?'rdShelf':t.dataset.rd==='fanfic'?'rdFanfic':'rdImport')).classList.add('active') })
}
function renderShelf(el){
  const books = store.get('books', [])
  const fanfics = Object.keys(localStorage).filter(k => k.startsWith('fanfic_')).map(k => ({ id:k, name:JSON.parse(localStorage.getItem(k)).topic || '同人文', type:'fanfic' }))
  const all = [...books, ...fanfics]
  el.innerHTML = all.length ? `<div class="bookshelf">` + all.map(b => `<div class="book-cover-item" data-book="${b.id}"><div class="cover">${esc((b.name||'书')[0])}</div><div class="book-title">${esc(b.name)}</div></div>`).join('') + `</div>` : '<div class="empty">书架空空如也，去导入或生成吧</div>'
  qsa('[data-book]', el).forEach(b => b.onclick = () => openReader(b.dataset.book))
}
function renderFanficPanel(el){
  el.innerHTML = `<div class="card"><h3>生成同人文</h3><div class="field"><label>主题/CP</label><input id="fanficTopic" placeholder="例如：雨天初遇"></div><button class="btn btn-block" id="genFanficBtn">AI 生成同人文</button></div>`
  qs('#genFanficBtn').onclick = () => { const topic = qs('#fanficTopic').value.trim() || '一次重逢'; const char = currentChar(); const text = `【同人文】\n\n那是一个下着小雨的黄昏。\n\n${char?.name||'ta'}站在街角的屋檐下，望着对面亮起的灯。你在人群里一眼就认出了那个身影。\n\n「原来，你也在这里。」\n\n故事从这里开始。`; localStorage.setItem('fanfic_' + Date.now(), JSON.stringify({ topic, text })); toast('同人文已生成，可到书架查看'); renderShelf(qs('#rdShelf')) }
}
function renderImportPanel(el){
  el.innerHTML = `<div class="card"><h3>导入书本</h3><div class="field"><label>文件（txt/md）</label><input type="file" id="bookFile" accept=".txt,.md"></div><p class="hint">导入后可到书架打开阅读</p></div>`
  qs('#bookFile').onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => { const books = store.get('books', []); books.push({ id:uid('b'), name:f.name.replace(/\.[^.]+$/,''), content:r.result }); store.set('books', books); toast('已导入'); renderShelf(qs('#rdShelf')) }; r.readAsText(f) }
}
function openReader(id){
  const books = store.get('books', [])
  const b = books.find(x => x.id === id)
  let content = '', name = ''
  if(b){ content = b.content; name = b.name }
  else { try{ const d = JSON.parse(localStorage.getItem(id)||'{}'); content = d.text||''; name = d.topic||'同人文' }catch(e){} }
  const char = currentChar()
  const container = qs('#appContainer')
  container.innerHTML = `<div class="app-screen"><header class="app-header"><button class="header-btn back" data-action="back"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><h1 class="header-title">${esc(name)}</h1><span class="header-spacer"></span></header><div class="app-body" id="readerBody"></div></div>`
  appStack.push('reader')
  const body = qs('#readerBody')
  body.innerHTML = `<div class="reader-view"><div class="reader-toolbar"><button class="rt-btn" id="rtBack">← 返回书架</button><span style="font-size:12px;color:var(--muted)">与 ${esc(char?.name||'ta')} 共读</span><button class="rt-btn" id="rtBig">字号+</button></div><div class="reader-text" id="readerText">${esc(content)}</div></div>`
  qs('#rtBack').onclick = () => goBack()
  let fs = 17
  qs('#rtBig').onclick = () => { fs += 2; qs('#readerText').style.fontSize = fs + 'px' }
}
function readingAddBody(){
  return `<div class="field"><label>生成同人文主题</label><input id="rdTopic"></div><button class="btn btn-block" id="rdGen">生成</button><div class="field" style="margin-top:10px"><label>导入书本</label><input type="file" id="rdFile" accept=".txt,.md"></div>`
}

// ============ 论坛（知乎） ============
function getPosts(){ return store.get('forumPosts', []) }
function setPosts(v){ store.set('forumPosts', v) }
function renderForum(){
  const body = qs('#forumBody')
  body.innerHTML = `<div class="seg-tabs"><button class="seg active" data-ft="hot">热门</button><button class="seg" data-ft="new">最新</button><button class="seg" data-ft="mine">我的</button></div><div class="seg-panel active" id="ftHot"></div><div class="seg-panel" id="ftNew"></div><div class="seg-panel" id="ftMine"></div>`
  renderZhFeed(qs('#ftHot'), 'hot')
  renderZhFeed(qs('#ftNew'), 'new')
  renderZhFeed(qs('#ftMine'), 'mine')
  qsa('[data-ft]', body).forEach(t => t.onclick = () => { qsa('[data-ft]', body).forEach(x => x.classList.remove('active')); t.classList.add('active'); qsa('.seg-panel', body).forEach(p => p.classList.remove('active')); qs('#' + (t.dataset.ft==='hot'?'ftHot':t.dataset.ft==='new'?'ftNew':'ftMine')).classList.add('active') })
}
function renderZhFeed(el, type){
  const posts = getPosts()
  const p = currentProfile() || {}
  let list = type === 'hot' ? [...posts].sort((a,b)=>(b.likes||0)-(a.likes||0)) : type === 'new' ? [...posts].sort((a,b)=>b.time-a.time) : posts.filter(x => x.author === (p.name||'晓梦生'))
  el.innerHTML = list.length ? list.map(x => `<div class="zh-item" data-post="${x.id}"><div class="zh-title">${esc(x.title)}</div><div class="zh-excerpt">${esc((x.body||'').slice(0,60))}...</div><div class="zh-meta"><span>${x.likes} 赞同</span><span>${(x.answers||[]).length} 评论</span>${x.likes>5?'<span class="zh-hot">热门</span>':''}</div></div>`).join('') : '<div class="empty">暂无问题，点右上角提问</div>'
  qsa('[data-post]', el).forEach(i => i.onclick = () => openPost(i.dataset.post))
}
function openPost(id){
  const p = getPosts().find(x => x.id === id); if(!p) return
  const container = qs('#appContainer')
  container.innerHTML = `<div class="app-screen"><header class="app-header"><button class="header-btn back" data-action="back"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button><h1 class="header-title">问题详情</h1><span class="header-spacer"></span></header><div class="app-body" id="postBody"></div></div>`
  appStack.push('post')
  const body = qs('#postBody')
  body.innerHTML = `<div class="card"><h3>${esc(p.title)}</h3><p style="font-size:14px;color:var(--text-2);line-height:1.6">${esc(p.body||'')}</p></div><div class="section-title">回答</div>${(p.answers||[]).map(a => `<div class="zh-answer"><div class="za-author"><div class="za-avatar icon-character">${esc((a.author||'?')[0])}</div><div class="za-name">${esc(a.author)}</div></div><div class="za-text">${esc(a.text)}</div></div>`).join('')||'<div class="empty">暂无回答</div>'}<button class="btn btn-block btn-secondary" id="answerBtn">写回答</button>`
  qs('#answerBtn').onclick = () => showModal({ title:'写回答', body:`<textarea id="ansText" rows="4" placeholder="写下你的回答..."></textarea>`, actions:[{label:'提交', cls:'btn btn-block', onOk(){ const t = qs('#ansText').value.trim(); if(!t) return; const prof = currentProfile(); p.answers = p.answers||[]; p.answers.push({ author:prof?.name||'匿名', text:t }); setPosts(getPosts()); openPost(id); closeModal() }}] })
}
function askQuestion(){
  showModal({ title:'提问', body:`<div class="field"><label>标题</label><input id="qTitle"></div><div class="field"><label>问题描述</label><textarea id="qBody" rows="3"></textarea></div>`, actions:[{label:'发布', cls:'btn btn-block', onOk(){ const t = qs('#qTitle').value.trim(); if(!t) return; const posts = getPosts(); posts.unshift({ id:uid('p'), title:t, body:qs('#qBody').value.trim(), likes:0, answers:[], time:now() }); setPosts(posts); renderForum(); closeModal() }}] })
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
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg
  document.body.appendChild(t); setTimeout(() => t.classList.add('show'), 10)
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300) }, 1800)
}
function addMenuBody(){
  return `<div class="list-group" style="border:1px solid var(--hairline)"><div class="list-item" id="amNewChar"><div class="item-icon icon-character">角</div><div class="item-body"><div class="item-title">新建角色人设</div></div></div><div class="list-item" id="amNewGroup"><div class="item-icon icon-style">群</div><div class="item-body"><div class="item-title">发起群聊</div></div></div></div>`
}

// ============ 初始化 ============
function ensureDefaults(){
  if(getProfiles().length === 0){
    const p = { id:uid('p'), name:'晓梦生', persona:'喜欢记录日常，观察细节', wechatId:'xm-sheng' }
    setProfiles([p]); setActiveProfile(p.id)
  }
  if(store.raw('seeded') !== '1'){ store.rawSet('seeded', '1') }
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
  showModal({ title:'发起群聊', body:`<div class="field"><label>群名</label><input id="grpName" value="好友群"></div><div class="field"><label>选择成员</label><div id="grpMembers"></div></div>`, actions:[{label:'创建', cls:'btn btn-block', onOk(){ const name = qs('#grpName').value.trim() || '好友群'; const members = qsa('#grpMembers input:checked').map(i => i.value); if(members.length < 2){ toast('至少选 2 个成员'); return } const chats = getChats(); chats.push({ id:uid('g'), type:'group', name, avatar:'群', color:'icon-style', members, unread:0, last:'群聊已创建', time:now() }); setChats(chats); renderWechat(); closeModal() }}] })
  qs('#grpMembers').innerHTML = chars.map(c => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0"><input type="checkbox" value="${c.id}"><span style="font-size:13px">${esc(c.name)}</span></div>`).join('')
}

window.__app = { openApp, closeApp, APPS }
