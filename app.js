// 晓梦生小手机 - 手机模拟 Web App
const qs = (s, el) => (el || document).querySelector(s)
const qsa = (s, el) => Array.from((el || document).querySelectorAll(s))
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v) }catch(e){ return d } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) },
  raw(k){ return localStorage.getItem(k) },
  rawSet(k, v){ localStorage.setItem(k, v) },
  rawDel(k){ localStorage.removeItem(k) }
}
const uid = p => (p||'id') + '_' + Date.now() + Math.random().toString(16).slice(2)
const now = () => Date.now()

// ============ 应用注册表 ============
const APPS = [
  { id:'wechat',    name:'微信',    icon:'微', cls:'icon-wechat',    tpl:'tpl-wechat',   dock:true },
  { id:'music',     name:'音乐',    icon:'♪', cls:'icon-music',     tpl:'tpl-music',    dock:true },
  { id:'tavern',    name:'酒馆',    icon:'馆', cls:'icon-tavern',    tpl:'tpl-tavern',   dock:true },
  { id:'settings',  name:'设置',    icon:'设', cls:'icon-settings',  tpl:'tpl-settings', dock:true },
  { id:'character', name:'角色设定',icon:'角', cls:'icon-character', tpl:'tpl-character' },
  { id:'worldbook', name:'世界书',  icon:'书', cls:'icon-worldbook', tpl:'tpl-worldbook' },
  { id:'style',     name:'文风',    icon:'风', cls:'icon-style',     tpl:'tpl-style-manage' },
  { id:'couple',    name:'情侣空间',icon:'情', cls:'icon-couple',    tpl:'tpl-couple' },
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
let appStack = [] // 用于返回栈

// ============ 状态栏时间 ============
function updateClock(){
  const t = new Date()
  const h = String(t.getHours()).padStart(2,'0')
  const m = String(t.getMinutes()).padStart(2,'0')
  qs('#statusTime').textContent = h + ':' + m
}

// ============ 主屏幕渲染 ============
function renderHome(){
  const dock = APPS.filter(a => a.dock)
  const grid = APPS.filter(a => !a.dock)
  // 每页 12 个
  const pages = [[],[]]
  grid.forEach((a,i) => pages[Math.floor(i/12) % 2].push(a))
  qs('#dockApps').innerHTML = dock.map(iconHTML).join('')
  qs('#appGridPage0').innerHTML = pages[0].map(iconHTML).join('')
  qs('#appGridPage1').innerHTML = pages[1].map(iconHTML).join('')
  bindIconEvents()
}

function iconHTML(a){
  return `<button class="app-icon" data-app="${a.id}">
    <div class="icon ${a.cls}">${a.icon}</div>
    <span class="name">${a.name}</span>
  </button>`
}

function bindIconEvents(){
  qsa('.app-icon').forEach(el => {
    el.addEventListener('click', () => openApp(el.dataset.app))
  })
}

// 页面指示器
function bindPageIndicator(){
  const pages = qs('#appPages')
  const dots = qsa('#pageIndicator .dot')
  pages.addEventListener('scroll', () => {
    const idx = Math.round(pages.scrollLeft / pages.clientWidth)
    dots.forEach((d,i) => d.classList.toggle('active', i === idx))
  })
}

// ============ 应用打开/关闭 ============
function openApp(id){
  const app = appById(id)
  if(!app) return
  if(app.placeholder){
    showModal({ title:app.name, body:`<p style="font-size:14px;color:var(--muted)">「${app.name}」正在开发中，敬请期待。</p>`, actions:[{label:'知道了', cls:'btn btn-block'}] })
    return
  }
  appStack = [id]
  mountApp(id)
}

function pushApp(id){
  const app = appById(id)
  if(!app) return
  appStack.push(id)
  mountApp(id)
}

function mountApp(id){
  const app = appById(id)
  const container = qs('#appContainer')
  const tpl = document.getElementById(app.tpl)
  container.innerHTML = ''
  container.appendChild(tpl.content.cloneNode(true))
  container.classList.add('open')
  document.querySelector('.phone').classList.add('app-open')
  renderApp(id)
}

function closeApp(){
  const container = qs('#appContainer')
  container.classList.remove('open')
  document.querySelector('.phone').classList.remove('app-open')
  setTimeout(() => { container.innerHTML = '' }, 320)
  appStack = []
}

function goBack(){
  if(appStack.length > 1){ appStack.pop(); const id = appStack[appStack.length-1]; reloadAppScreen(id) }
  else closeApp()
}

function reloadAppScreen(id){
  const container = qs('#appContainer')
  const tpl = document.getElementById(appById(id).tpl)
  container.innerHTML = ''
  container.appendChild(tpl.content.cloneNode(true))
  renderApp(id)
}

// ============ 应用渲染分派 ============
function renderApp(id){
  switch(id){
    case 'wechat': renderWechat(); break
    case 'settings': renderSettings(); break
    case 'tavern': renderTavern(); break
    case 'character': renderCharacter(); break
    case 'worldbook': renderWorldbook(); break
    case 'style': renderStyleManage(); break
    case 'music': renderMusic(); break
    case 'couple': renderCouple(); break
    case 'shop': renderShop(); break
    case 'forum': renderForum(); break
  }
  bindHeaderActions(id)
}

function bindHeaderActions(id){
  qsa('[data-action]').forEach(btn => {
    const action = btn.dataset.action
    btn.addEventListener('click', () => {
      if(action === 'back') goBack()
      else if(action === 'style-manage') pushApp('style')
      else handleAppAction(id, action)
    })
  })
}

function handleAppAction(id, action){
  if(id === 'wechat'){
    if(action === 'search'){ /* todo */ }
    if(action === 'more'){ /* todo */ }
  }
  if(id === 'tavern' && action === 'style-manage'){ openApp('style') }
  if(id === 'worldbook' && action === 'import'){ importWorldbook() }
  if(id === 'shop' && action === 'import'){ importShop() }
}

// ============ 微信 ============
function renderWechat(){
  // Tab 切换
  qsa('.wechat-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      qsa('.wechat-tabs .tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      qsa('.tab-panel').forEach(p => p.classList.remove('active'))
      const panel = qs('#' + tab.dataset.tab + 'Panel')
      if(panel) panel.classList.add('active')
    })
  })
  renderChatList()
  renderContacts()
  renderDiscover()
  renderMeProfile()
}

function getChats(){
  return store.get('chats', [
    { id:'c1', name:'Char', last:'我已经记住你的设定。', time:'09:30', avatar:'C', color:'icon-character', unread:0 },
    { id:'c2', name:'老酒保', last:'这间酒馆不缺故事。', time:'昨天', avatar:'酒', color:'icon-tavern', unread:2 },
  ])
}

function renderChatList(){
  const list = qs('#chatList')
  if(!list) return
  const chats = getChats()
  list.innerHTML = chats.map(c => `
    <div class="chat-row" data-chat="${c.id}">
      <div class="avatar ${c.color}">${c.avatar}</div>
      <div class="chat-info">
        <div class="chat-name-row">
          <span class="chat-name">${c.name}</span>
          <span class="chat-time">${c.time}</span>
        </div>
        <div class="chat-last">${c.last}</div>
      </div>
    </div>
  `).join('')
  qsa('.chat-row', list).forEach(row => {
    row.addEventListener('click', () => openChatDetail(row.dataset.chat))
  })
}

function openChatDetail(chatId){
  const chat = getChats().find(c => c.id === chatId) || { name:'联系人', avatar:'C', color:'icon-character' }
  const container = qs('#appContainer')
  const tpl = document.getElementById('tpl-chat-detail')
  container.innerHTML = ''
  container.appendChild(tpl.content.cloneNode(true))
  qs('#chatDetailName').textContent = chat.name
  appStack.push('chat-detail')
  renderChatDetail(chatId)
  bindHeaderActions('chat-detail')
}

function getChatMessages(chatId){
  return store.get('msg_' + chatId, [])
}
function saveChatMessages(chatId, list){ store.set('msg_' + chatId, list) }

function seedMessages(chatId, name){
  const existing = getChatMessages(chatId)
  if(existing.length) return
  saveChatMessages(chatId, [
    { id:uid('m'), sender:'char', text:'我在看，今天想聊点什么？', time:now()-600000 },
    { id:uid('m'), sender:'me', text:'先把氛围做得舒服一点。', time:now()-300000 },
  ])
}

function renderChatDetail(chatId){
  const chat = getChats().find(c => c.id === chatId) || { name:'联系人' }
  seedMessages(chatId, chat.name)
  const list = qs('#detailMessageList')
  const msgs = getChatMessages(chatId)
  list.innerHTML = msgs.map(m => `
    <div class="msg ${m.sender}">
      <div class="bubble">${escapeHTML(m.text || '')}</div>
    </div>
  `).join('')
  list.scrollTop = list.scrollHeight

  // 发送
  const input = qs('#detailChatInput')
  const send = () => {
    const text = input.value.trim()
    if(!text) return
    const msgs = getChatMessages(chatId)
    msgs.push({ id:uid('m'), sender:'me', text, time:now() })
    saveChatMessages(chatId, msgs)
    renderChatDetail(chatId)
    input.value = ''
    // 模拟回复
    setTimeout(() => {
      const msgs2 = getChatMessages(chatId)
      msgs2.push({ id:uid('m'), sender:'char', text:'嗯，我记住了。', time:now() })
      saveChatMessages(chatId, msgs2)
      const list2 = qs('#detailMessageList')
      if(list2) renderChatDetail(chatId)
    }, 600)
  }
  input.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); send() } }
  qs('[data-action="face"]') && (qs('[data-action="face"]').onclick = () => {})
  qs('[data-action="plus"]') && (qs('[data-action="plus"]').onclick = () => {})
  qs('[data-action="voice"]') && (qs('[data-action="voice"]').onclick = () => {})
}

function renderContacts(){
  const list = qs('#contactList')
  if(!list) return
  const contacts = ['新的朋友','群聊','Char','老酒保','流浪吟游诗人','穿风衣的侦探','会发光的猫']
  list.innerHTML = contacts.map(c => `
    <div class="chat-row">
      <div class="avatar icon-character">${c[0]}</div>
      <div class="chat-info"><span class="chat-name">${c}</span></div>
    </div>
  `).join('')
}

function renderDiscover(){
  const list = qs('#discoverGrid')
  if(!list) return
  const items = ['朋友圈','视频号','直播','看一看','搜一搜','小程序']
  list.innerHTML = `<div class="list-group">` + items.map((it,i) => `
    <div class="list-item">
      <div class="item-icon ${['icon-couple','icon-photos','icon-camera','icon-forum','icon-mail','icon-shop'][i]}">${it[0]}</div>
      <div class="item-body"><div class="item-title">${it}</div></div>
      <span class="chevron">›</span>
    </div>
  `).join('') + `</div>`
}

function renderMeProfile(){
  const box = qs('#meProfile')
  if(!box) return
  box.innerHTML = `
    <div class="list-item">
      <div class="avatar icon-character" style="width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:22px">晓</div>
      <div class="item-body"><div class="item-title" style="font-size:17px">晓梦生</div><div class="item-sub">微信号：xm-sheng</div></div>
    </div>
    <div class="list-group" style="margin-top:14px">
      <div class="list-item"><div class="item-body"><div class="item-title">收藏</div></div><span class="chevron">›</span></div>
      <div class="list-item"><div class="item-body"><div class="item-title">相册</div></div><span class="chevron">›</span></div>
      <div class="list-item"><div class="item-body"><div class="item-title">卡包</div></div><span class="chevron">›</span></div>
      <div class="list-item"><div class="item-body"><div class="item-title">设置</div></div><span class="chevron">›</span></div>
    </div>
  `
}

// ============ 设置 ============
function getSettings(){
  return store.get('settings', {
    fontUrl:'', fontSize:14, apiUrl:'', apiKey:'', modelName:'',
    keepAlive:false, enableNotify:false, cloudSync:false, wallpaper:null
  })
}
function saveSettings(s){ store.set('settings', s) }

function renderSettings(){
  const box = qs('#settingsSections')
  const s = getSettings()
  box.innerHTML = `
    <div class="section-title">外观</div>
    <div class="form-card">
      <div class="field">
        <label>自定义字体 URL</label>
        <input type="text" id="setFontUrl" placeholder="https://.../font.woff2" value="${escapeAttr(s.fontUrl)}">
      </div>
      <div class="field">
        <label>字体大小：<span id="fontSizeVal">${s.fontSize}px</span></label>
        <input type="range" id="setFontSize" min="12" max="22" value="${s.fontSize}">
      </div>
      <div class="field">
        <label>壁纸</label>
        <input type="file" id="setWallpaper" accept="image/*">
      </div>
      <button class="btn btn-block" id="applyFontBtn">应用外观</button>
    </div>

    <div class="section-title">API 与模型</div>
    <div class="form-card">
      <div class="field"><label>API 地址</label><input type="text" id="setApiUrl" placeholder="https://api.example.com" value="${escapeAttr(s.apiUrl)}"></div>
      <div class="field"><label>API 密钥</label><input type="text" id="setApiKey" placeholder="请输入密钥" value="${escapeAttr(s.apiKey)}"></div>
      <div class="field"><label>模型名称</label><input type="text" id="setModelName" placeholder="gpt-xx-mini" value="${escapeAttr(s.modelName)}"></div>
      <button class="btn btn-block" id="saveApiBtn">保存 API</button>
    </div>

    <div class="section-title">通用</div>
    <div class="form-card">
      <div class="list-group" style="box-shadow:none;border:1px solid #eceef1">
        ${toggleItem('keepAlive','后台保活',s.keepAlive)}
        ${toggleItem('enableNotify','前端通知',s.enableNotify)}
        ${toggleItem('cloudSync','云端同步',s.cloudSync)}
      </div>
      <button class="btn btn-secondary btn-block" id="exportBackupBtn">导出备份</button>
      <div class="field" style="margin-top:10px"><label>导入备份</label><input type="file" id="importBackupInput" accept="application/json"></div>
    </div>
  `

  qs('#setFontSize').addEventListener('input', e => { qs('#fontSizeVal').textContent = e.target.value + 'px' })
  qs('#applyFontBtn').addEventListener('click', () => {
    const s = getSettings()
    s.fontUrl = qs('#setFontUrl').value.trim()
    s.fontSize = qs('#setFontSize').value
    saveSettings(s)
    applyFontToDoc()
    toast('外观已应用')
  })
  qs('#saveApiBtn').addEventListener('click', () => {
    const s = getSettings()
    s.apiUrl = qs('#setApiUrl').value.trim()
    s.apiKey = qs('#setApiKey').value.trim()
    s.modelName = qs('#setModelName').value.trim()
    saveSettings(s)
    toast('API 设置已保存')
  })
  qs('#setWallpaper').addEventListener('change', e => {
    const f = e.target.files[0]; if(!f) return
    const r = new FileReader()
    r.onload = () => {
      const s = getSettings(); s.wallpaper = r.result; saveSettings(s)
      applyWallpaper(); toast('壁纸已保存')
    }
    r.readAsDataURL(f)
  })
  qsa('.toggle-item input').forEach(t => {
    t.addEventListener('change', e => {
      const s = getSettings(); s[e.target.dataset.key] = e.target.checked; saveSettings(s)
    })
  })
  qs('#exportBackupBtn').addEventListener('click', exportBackup)
  qs('#importBackupInput').addEventListener('change', e => importBackupFile(e.target.files[0]))
}

function toggleItem(key, label, checked){
  return `<div class="list-item toggle-item">
    <div class="item-body"><div class="item-title">${label}</div></div>
    <label class="switch"><input type="checkbox" data-key="${key}" ${checked?'checked':''}><span class="slider"></span></label>
  </div>`
}

function applyFontToDoc(){
  const s = getSettings()
  document.documentElement.style.fontSize = s.fontSize + 'px'
}
function applyWallpaper(){
  const s = getSettings()
  const home = qs('.home-screen')
  if(!home) return
  if(s.wallpaper){ home.style.backgroundImage = `url(${s.wallpaper})`; home.style.backgroundSize = 'cover'; home.style.backgroundPosition = 'center' }
  else { home.style.backgroundImage = '' }
}

function exportBackup(){
  const data = { settings: getSettings() }
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = 'xiaomeng_backup.json'
  a.click(); URL.revokeObjectURL(a.href)
}
function importBackupFile(file){
  if(!file) return
  const r = new FileReader()
  r.onload = () => {
    try{
      const data = JSON.parse(r.result)
      if(data.settings){ saveSettings(Object.assign(getSettings(), data.settings)); renderSettings() }
      toast('备份导入成功')
    }catch(e){ toast('导入失败：文件格式错误') }
  }
  r.readAsText(file)
}

// ============ 酒馆 ============
function getWorldbooks(){ return store.get('worldbooks', {}) }
function getWritingStyles(){ return store.get('writingStyles', []) }
function getTavernChars(){ return store.get('tavernChars', []) }
function saveWorldbooks(w){ store.set('worldbooks', w) }
function saveWritingStyles(w){ store.set('writingStyles', w) }
function saveTavernChars(c){ store.set('tavernChars', c) }
function getTavernMessages(){ return store.get('tavernMessages', []) }
function saveTavernMessages(m){ store.set('tavernMessages', m) }

function seedDefaults(){
  if(Object.keys(getWorldbooks()).length === 0){
    saveWorldbooks({
      '主线世界':'两人相识于雨天，日常碎片中逐渐信任彼此。',
      '灰色回忆':'时间被压成一页页的旧照片，回忆比现实更真实。',
      '酒馆分支':'灯光低沉、笑声轻快，故事发生在一间会发光的旧酒馆。',
      '赛博酒巷':'霓虹渗进廉价啤酒，植入体在酒精中闪烁，每个角落都藏着数据交易。',
      '克苏鲁旧港':'雾气裹着腐臭海风，灯塔光束扫过的地方理智开始流失。',
      '江南烟雨楼':'油纸伞下穿行的皆是前尘往事，茶香掩不住刀光剑影。'
    })
  }
  if(getWritingStyles().length === 0){
    saveWritingStyles([
      {id:'style_1',name:'日系轻小说风',scene:'日常、校园、青春',content:'第一人称或第三人称限制视角\n细腻描写环境光影、季节气息与微表情\n对话简短留白多，心理活动用括号标注\n避免网络流行语，保持克制灰调'},
      {id:'style_2',name:'克苏鲁调查风',scene:'悬疑、恐怖、调查',content:'第二人称增强代入感\n大量感官描写：霉味、潮湿、耳鸣、视觉扭曲\n理智值检定式叙述，逐步揭露恐怖核心'},
      {id:'style_3',name:'赛博朋克黑话',scene:'科幻、黑帮、霓虹夜城',content:'混杂英语词汇：choom、corpo、chrome\n短句快节奏，像数据流一样切割叙述\n霓虹灯、雨夜、植入体为核心意象'},
      {id:'style_4',name:'古风志怪笔记',scene:'志怪、传奇、笔记体',content:'半文半白，留白修辞\n"予观夫……"式开篇\n妖鬼神怪皆有来历，非善非恶'}
    ])
  }
  if(getTavernChars().length === 0){
    saveTavernChars([
      {id:'char_1',name:'老酒保',desc:'擦杯子的动作从未停过，眼神看透世事',tags:['神秘','倾听者']},
      {id:'char_2',name:'流浪吟游诗人',desc:'琴盒贴着旅途贴纸，歌里藏着未完的故事',tags:['艺术','漂泊']},
      {id:'char_3',name:'穿风衣的侦探',desc:'雨夜总坐在角落，手里攥着没抽完的烟',tags:['推理','冷峻']},
      {id:'char_4',name:'会发光的猫',desc:'蹲在吧台最高处，瞳孔像两颗琥珀',tags:['奇幻','治愈']}
    ])
  }
}

function renderTavern(){
  const wb = qs('#tavernWorldbookSelect')
  const ws = qs('#tavernStyleSelect')
  const names = Object.keys(getWorldbooks())
  wb.innerHTML = '<option value="">-- 选择世界书 --</option>' + names.map(n => `<option value="${escapeAttr(n)}">${escapeHTML(n)}</option>`).join('')
  ws.innerHTML = '<option value="">-- 选择文风 --</option>' + getWritingStyles().map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('')
  renderTavernChars()
  qs('#addTavernCharBtn').addEventListener('click', addTavernChar)
  qs('#tavernSendBtn').addEventListener('click', sendTavernMessage)
  qs('#tavernInput').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); sendTavernMessage() } })
  // 恢复选中
  const sel = store.raw('tavernSelectedChar')
  if(sel){ const c = getTavernChars().find(x => x.id === sel); if(c) showTavernChat(sel) }
}

function renderTavernChars(){
  const grid = qs('#tavernCharGrid')
  const chars = getTavernChars()
  const sel = store.raw('tavernSelectedChar')
  grid.innerHTML = chars.map(c => `
    <div class="char-card ${c.id===sel?'selected':''}" data-id="${c.id}">
      <div class="char-avatar">${escapeHTML((c.name||'?')[0])}</div>
      <div class="char-name">${escapeHTML(c.name)}</div>
      <div class="char-tags">${escapeHTML((c.tags||[]).slice(0,2).join('、'))}</div>
    </div>
  `).join('')
  qsa('.char-card', grid).forEach(card => {
    card.addEventListener('click', () => { store.rawSet('tavernSelectedChar', card.dataset.id); renderTavernChars(); showTavernChat(card.dataset.id) })
  })
}

function showTavernChat(charId){
  const chars = getTavernChars()
  const c = chars.find(x => x.id === charId)
  if(!c) return
  qs('#tavernChatArea').style.display = 'block'
  qs('#tavernSetup').style.display = 'none'
  qs('#tavernCharAvatar').textContent = (c.name||'?')[0]
  qs('#tavernCharName').textContent = c.name
  qs('#tavernCharStatus').textContent = c.desc || '灯光微黄，等你开口'
  renderTavernMessages()
}

function renderTavernMessages(){
  const list = qs('#tavernMessageList')
  const msgs = getTavernMessages()
  list.innerHTML = msgs.map(m => `<div class="msg ${m.sender}"><div class="bubble">${escapeHTML(m.text)}</div></div>`).join('')
  list.scrollTop = list.scrollHeight
}

function sendTavernMessage(){
  const input = qs('#tavernInput')
  const text = input.value.trim()
  if(!text) return
  const msgs = getTavernMessages()
  msgs.push({id:uid('t'),sender:'me',text,time:now()})
  saveTavernMessages(msgs)
  renderTavernMessages()
  input.value = ''
  const charId = store.raw('tavernSelectedChar')
  const c = getTavernChars().find(x => x.id === charId)
  const wbName = qs('#tavernWorldbookSelect').value
  const styleId = qs('#tavernStyleSelect').value
  const style = getWritingStyles().find(s => s.id === styleId)
  const wb = wbName ? getWorldbooks()[wbName] : ''
  setTimeout(() => {
    const templates = [
      `${c.name}微微侧头，目光在昏黄灯光下停留片刻："${text}……这事儿有意思。"`,
      `${c.name}轻敲吧台："接着说，我在听。"`,
      `${c.name}嘴角勾起一抹弧度："如果故事要继续，那得看你怎么写了。"`,
      `${c.name}将杯中液体轻晃："这间酒馆不缺故事，缺的是讲故事的人。"`
    ]
    const msgs2 = getTavernMessages()
    msgs2.push({id:uid('t'),sender:'char',text:templates[Math.floor(Math.random()*templates.length)],time:now()})
    saveTavernMessages(msgs2)
    renderTavernMessages()
  }, 600)
}

function addTavernChar(){
  showModal({
    title:'添加角色卡',
    body:`
      <div class="field"><label>角色名称</label><input type="text" id="ncName" placeholder="角色名字"></div>
      <div class="field"><label>角色简介/设定</label><textarea id="ncDesc" rows="3" placeholder="角色简介"></textarea></div>
      <div class="field"><label>标签（顿号分隔）</label><input type="text" id="ncTags" placeholder="神秘、倾听者、酒馆"></div>
    `,
    actions:[
      {label:'取消', cls:'btn btn-secondary'},
      {label:'添加', cls:'btn', onOk(){
        const name = qs('#ncName').value.trim()
        if(!name){ toast('请输入角色名称'); return }
        const desc = qs('#ncDesc').value.trim()
        const tags = qs('#ncTags').value.split('、').map(t=>t.trim()).filter(Boolean)
        const chars = getTavernChars()
        chars.unshift({id:uid('char'),name,desc,tags})
        saveTavernChars(chars)
        renderTavernChars()
        closeModal()
      }}
    ]
  })
}

// ============ 角色设定 ============
function getIdentity(){ return store.get('identity', {}) }
function saveIdentity(d){ store.set('identity', d) }

function renderCharacter(){
  const box = qs('#characterSections')
  const id = getIdentity()
  box.innerHTML = `
    <div class="form-card">
      <h3>用户设定</h3>
      <div class="field"><label>用户名</label><input type="text" id="idUserName" value="${escapeAttr(id.userName||'')}" placeholder="你的名字/昵称"></div>
      <div class="field"><label>用户人设</label><textarea id="idUserPersona" rows="3" placeholder="你的性格、口吻、背景设定...">${escapeHTML(id.userPersona||'')}</textarea></div>
    </div>
    <div class="form-card">
      <h3>角色设定</h3>
      <div class="field"><label>角色名</label><input type="text" id="idCharName" value="${escapeAttr(id.charName||'')}" placeholder="角色名字"></div>
      <div class="field"><label>角色人设</label><textarea id="idCharPersona" rows="3" placeholder="角色性格、口吻、背景设定...">${escapeHTML(id.charPersona||'')}</textarea></div>
    </div>
    <div class="btn-row">
      <button class="btn" id="saveIdentityBtn">保存</button>
      <button class="btn btn-secondary" id="exportIdentityBtn">导出 JSON</button>
    </div>
    <div class="field" style="margin-top:12px"><label>导入身份设定</label><input type="file" id="importIdentityInput" accept="application/json"></div>
  `
  qs('#saveIdentityBtn').addEventListener('click', () => {
    saveIdentity({
      userName: qs('#idUserName').value.trim(),
      userPersona: qs('#idUserPersona').value.trim(),
      charName: qs('#idCharName').value.trim(),
      charPersona: qs('#idCharPersona').value.trim(),
    })
    toast('身份设定已保存')
  })
  qs('#exportIdentityBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(getIdentity(), null, 2)], {type:'application/json'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'identity.json'; a.click()
  })
  qs('#importIdentityInput').addEventListener('change', e => {
    const f = e.target.files[0]; if(!f) return
    const r = new FileReader()
    r.onload = () => { try{ saveIdentity(JSON.parse(r.result)); renderCharacter(); toast('导入成功') }catch(err){ toast('导入失败') } }
    r.readAsText(f)
  })
}

// ============ 世界书 ============
function renderWorldbook(){
  renderWorldbookEditor()
  renderWorldbookList()
}
function renderWorldbookEditor(){
  const box = qs('#wbEditor')
  box.innerHTML = `
    <div class="form-card">
      <div class="field"><label>条目名称</label><input type="text" id="wbName" placeholder="例如：主角背景、酒馆设定"></div>
      <div class="field"><label>触发关键词（逗号分隔）</label><input type="text" id="wbKeywords" placeholder="酒馆,老酒保,灯光"></div>
      <div class="field"><label>条目内容</label><textarea id="wbContent" rows="4" placeholder="详细设定内容..."></textarea></div>
      <div class="btn-row">
        <button class="btn" id="addWbBtn">添加条目</button>
        <button class="btn btn-secondary" id="importWbBtn">导入文件</button>
      </div>
      <div class="field" style="margin-top:10px"><label>导入世界书文件</label><input type="file" id="wbFileInput" accept=".txt,.json,.docx"></div>
    </div>
  `
  qs('#addWbBtn').addEventListener('click', () => {
    const name = qs('#wbName').value.trim()
    const content = qs('#wbContent').value.trim()
    if(!name || !content){ toast('名称和内容不能为空'); return }
    const wb = getWorldbooks()
    wb[name] = content
    saveWorldbooks(wb)
    qs('#wbName').value = ''; qs('#wbContent').value = ''
    renderWorldbookList()
    toast('世界书条目已添加')
  })
  qs('#importWbBtn').addEventListener('click', () => qs('#wbFileInput').click())
  qs('#wbFileInput').addEventListener('change', e => {
    const f = e.target.files[0]; if(!f) return
    const r = new FileReader()
    r.onload = () => {
      const text = r.result
      const name = f.name.replace(/\.[^.]+$/, '') || '导入条目'
      const wb = getWorldbooks()
      wb[name] = text
      saveWorldbooks(wb)
      renderWorldbookList()
      toast('世界书文件已导入')
    }
    r.readAsText(f)
  })
}
function renderWorldbookList(){
  const list = qs('#wbList')
  const wb = getWorldbooks()
  const names = Object.keys(wb)
  if(!names.length){ list.innerHTML = '<div class="section-title">暂无世界书条目</div>'; return }
  list.innerHTML = names.map(n => `
    <div class="wb-item">
      <div class="wb-name">${escapeHTML(n)}</div>
      <div class="wb-content">${escapeHTML(wb[n])}</div>
      <div class="wb-actions">
        <button class="btn btn-secondary" data-del="${escapeAttr(n)}">删除</button>
      </div>
    </div>
  `).join('')
  qsa('[data-del]', list).forEach(btn => {
    btn.addEventListener('click', () => {
      if(!confirm('确定删除该条目？')) return
      const wb = getWorldbooks()
      delete wb[btn.dataset.del]
      saveWorldbooks(wb)
      renderWorldbookList()
    })
  })
}
function importWorldbook(){ qs('#wbFileInput').click() }

// ============ 文风管理 ============
function renderStyleManage(){
  const box = qs('#styleEditor')
  box.innerHTML = `
    <div class="form-card">
      <div class="field"><label>文风名称</label><input type="text" id="stName" placeholder="例如：日系轻小说"></div>
      <div class="field"><label>适用场景</label><input type="text" id="stScene" placeholder="例如：酒馆闲聊、悬疑推理"></div>
      <div class="field"><label>文风内容（提示词/风格描述）</label><textarea id="stContent" rows="5" placeholder="粘贴或输入文风描述..."></textarea></div>
      <button class="btn btn-block" id="saveStyleBtn">保存文风</button>
    </div>
  `
  renderStyleList()
  qs('#saveStyleBtn').addEventListener('click', () => {
    const name = qs('#stName').value.trim()
    const scene = qs('#stScene').value.trim()
    const content = qs('#stContent').value.trim()
    if(!name || !content){ toast('名称和内容不能为空'); return }
    const styles = getWritingStyles()
    styles.unshift({id:uid('style'),name,scene,content})
    saveWritingStyles(styles)
    qs('#stName').value = ''; qs('#stScene').value = ''; qs('#stContent').value = ''
    renderStyleList()
    toast('文风已保存')
  })
}
function renderStyleList(){
  const list = qs('#styleList')
  const styles = getWritingStyles()
  if(!styles.length){ list.innerHTML = '<div class="section-title">暂无文风，请新建</div>'; return }
  list.innerHTML = styles.map(s => `
    <div class="style-item">
      <div class="style-name">${escapeHTML(s.name)}</div>
      <div class="style-scene">${escapeHTML(s.scene || '通用')}</div>
      <div class="style-content">${escapeHTML(s.content)}</div>
      <div class="style-actions">
        <button class="btn btn-secondary" data-del="${s.id}">删除</button>
      </div>
    </div>
  `).join('')
  qsa('[data-del]', list).forEach(btn => {
    btn.addEventListener('click', () => {
      if(!confirm('确定删除该文风？')) return
      saveWritingStyles(getWritingStyles().filter(s => s.id !== btn.dataset.del))
      renderStyleList()
    })
  })
}

// ============ 音乐 ============
let musicPlaying = false
function renderMusic(){
  const box = qs('#musicPlayer')
  box.innerHTML = `
    <div class="album-art" id="albumArt">♪</div>
    <div class="track-title">晓梦生 · 未命名</div>
    <div class="track-artist">本地音乐库</div>
    <div class="music-controls">
      <button id="prevTrack"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
      <button class="play-btn" id="playTrack"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
      <button id="nextTrack"><svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm10-12h2v12h-2z"/></svg></button>
    </div>
  `
  qs('#playTrack').addEventListener('click', () => {
    musicPlaying = !musicPlaying
    qs('#albumArt').classList.toggle('spinning', musicPlaying)
    qs('#playTrack').innerHTML = musicPlaying
      ? '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
  })
}

// ============ 情侣空间 ============
function renderCouple(){
  const box = qs('#coupleContent')
  const tasks = store.get('coupleTasks', [])
  const diary = store.get('coupleDiary', '')
  box.innerHTML = `
    <div class="form-card">
      <h3>今日日记</h3>
      <textarea id="coupleDiaryInput" rows="5" placeholder="记录今天想对 ta 说的话...">${escapeHTML(diary)}</textarea>
      <button class="btn btn-block" id="saveDiaryBtn" style="margin-top:8px">保存日记</button>
    </div>
    <div class="form-card">
      <h3>任务打卡</h3>
      <div class="list-group" style="box-shadow:none;border:1px solid #eceef1" id="taskList"></div>
      <div class="field" style="margin-top:10px"><label>新任务</label><input type="text" id="newTaskInput" placeholder="添加一个想一起做的事"></div>
      <button class="btn btn-block" id="addTaskBtn">添加任务</button>
    </div>
  `
  const renderTasks = () => {
    const tasks = store.get('coupleTasks', [])
    const list = qs('#taskList')
    if(!list) return
    list.innerHTML = tasks.length ? tasks.map((t,i) => `
      <div class="list-item">
        <div class="item-body"><div class="item-title">${escapeHTML(t.text)}</div></div>
        <label class="switch"><input type="checkbox" data-i="${i}" ${t.done?'checked':''}><span class="slider"></span></label>
      </div>
    `).join('') : '<div class="list-item"><div class="item-body"><div class="item-title" style="color:var(--muted)">还没有任务</div></div></div>'
    qsa('#taskList input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', e => {
        const tasks = store.get('coupleTasks', [])
        tasks[+e.target.dataset.i].done = e.target.checked
        store.set('coupleTasks', tasks)
      })
    })
  }
  renderTasks()
  qs('#saveDiaryBtn').addEventListener('click', () => {
    store.set('coupleDiary', qs('#coupleDiaryInput').value.trim())
    toast('日记已保存')
  })
  qs('#addTaskBtn').addEventListener('click', () => {
    const v = qs('#newTaskInput').value.trim()
    if(!v) return
    const tasks = store.get('coupleTasks', [])
    tasks.push({text:v, done:false})
    store.set('coupleTasks', tasks)
    qs('#newTaskInput').value = ''
    renderTasks()
  })
}

// ============ 商城 ============
function renderShop(){
  const box = qs('#shopContent')
  box.innerHTML = `
    <div class="section-title">导入商城 HTML</div>
    <div class="form-card">
      <div class="field"><label>商城文件（HTML）</label><input type="file" id="shopFileInput" accept="text/html"></div>
      <p style="font-size:12px;color:var(--muted)">导入后商品将展示在下方。</p>
    </div>
    <div id="shopItems" class="shop-items"></div>
  `
  qs('#shopFileInput').addEventListener('change', e => {
    const f = e.target.files[0]; if(!f) return
    const r = new FileReader()
    r.onload = () => {
      store.rawSet('shopHtml', r.result)
      toast('商城 HTML 已导入')
    }
    r.readAsText(f)
  })
}
function importShop(){ qs('#shopFileInput').click() }

// ============ 论坛 ============
function renderForum(){
  qsa('.forum-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      qsa('.forum-tabs .tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      renderForumList(tab.dataset.tab)
    })
  })
  renderForumList('latest')
}
function renderForumList(type){
  const list = qs('#forumList')
  const posts = store.get('forumPosts', [
    {id:'p1',title:'大家最喜欢哪个文风？',author:'晓梦生',likes:12,comments:5,time:'2小时前'},
    {id:'p2',title:'分享一个克苏鲁风的开场',author:'流浪诗人',likes:8,comments:3,time:'昨天'},
    {id:'p3',title:'酒馆角色卡交流',author:'侦探',likes:15,comments:7,time:'3天前'},
  ])
  const mine = type === 'my' ? posts.filter(p => p.author === '晓梦生') : posts
  list.innerHTML = mine.length ? mine.map(p => `
    <div class="list-item">
      <div class="item-body">
        <div class="item-title">${escapeHTML(p.title)}</div>
        <div class="item-sub">${escapeHTML(p.author)} · ${escapeHTML(p.time)} · 赞 ${p.likes} · 评 ${p.comments}</div>
      </div>
      <span class="chevron">›</span>
    </div>
  `).join('') : '<div class="section-title">暂无帖子</div>'
}

// ============ 弹窗 ============
function showModal(opts){
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal">
      <h3>${opts.title}</h3>
      <div class="modal-body">${opts.body}</div>
      <div class="btn-row">${(opts.actions||[]).map(a => `<button class="${a.cls}" data-modal-action>${a.label}</button>`).join('')}</div>
    </div>
  `
  document.body.appendChild(overlay)
  const btns = qsa('[data-modal-action]', overlay)
  ;(opts.actions||[]).forEach((a,i) => {
    btns[i].addEventListener('click', () => { if(a.onOk) a.onOk(); else closeModal() })
  })
  overlay.addEventListener('click', e => { if(e.target === overlay) closeModal() })
}
function closeModal(){ const m = qs('.modal-overlay'); if(m) m.remove() }

// ============ Toast ============
function toast(msg){
  const t = document.createElement('div')
  t.className = 'toast'
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.classList.add('show'), 10)
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300) }, 1800)
}

// ============ 工具 ============
function escapeHTML(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }
function escapeAttr(s){ return escapeHTML(s) }

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  seedDefaults()
  renderHome()
  bindPageIndicator()
  updateClock()
  setInterval(updateClock, 30000)
  applyFontToDoc()
  applyWallpaper()

  // 手势：点按 home 指示条或边缘返回
  document.addEventListener('click', e => {
    if(e.target.closest('[data-app]') && !e.target.closest('#appContainer')) return
  })
})

// 暴露全局（调试）
window.__app = { openApp, closeApp, APPS }
