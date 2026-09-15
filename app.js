// 设置原型逻辑，使用 localStorage 持久化
const qs = s => document.querySelector(s)

function saveSettings(){
  const settings = {
    fontUrl: qs('#fontUrl').value,
    fontSize: qs('#fontSize').value,
    apiUrl: qs('#apiUrl').value,
    apiKey: qs('#apiKey').value,
    modelName: qs('#modelName').value,
    keepAlive: qs('#keepAlive').checked,
    enableNotify: qs('#enableNotify').checked,
    cloudSync: qs('#cloudSync').checked,
    wallpaper: localStorage.getItem('wallpaper') || null
  }
  localStorage.setItem('settings', JSON.stringify(settings))
  alert('设置已保存')
}

function loadSettings(){
  const raw = localStorage.getItem('settings')
  if(!raw) return
  const s = JSON.parse(raw)
  qs('#fontUrl').value = s.fontUrl || ''
  qs('#fontSize').value = s.fontSize || 14
  qs('#apiUrl').value = s.apiUrl || ''
  qs('#apiKey').value = s.apiKey || ''
  qs('#modelName').value = s.modelName || ''
  qs('#keepAlive').checked = !!s.keepAlive
  qs('#enableNotify').checked = !!s.enableNotify
  qs('#cloudSync').checked = !!s.cloudSync
  if(s.wallpaper) applyWallpaperDataUrl(s.wallpaper)
}

function applyFont(){
  const url = qs('#fontUrl').value.trim()
  if(!url){
    document.documentElement.style.fontSize = qs('#fontSize').value + 'px'
    saveSettings()
    return
  }
  const fontFace = new FontFace('CustomUI', `url(${url})`)
  fontFace.load().then(f=>{
    document.fonts.add(f)
    document.documentElement.style.fontFamily = 'CustomUI, system-ui'
    document.documentElement.style.fontSize = qs('#fontSize').value + 'px'
    saveSettings()
  }).catch(err=>{
    alert('字体加载失败：' + err)
  })
}

function handleWallpaperFile(file){
  if(!file) return
  const reader = new FileReader()
  reader.onload = e=>{
    const dataUrl = e.target.result
    localStorage.setItem('wallpaper', dataUrl)
    applyWallpaperDataUrl(dataUrl)
  }
  reader.readAsDataURL(file)
}

function applyWallpaperDataUrl(dataUrl){
  const preview = qs('#wallpaperPreview')
  preview.style.backgroundImage = `url(${dataUrl})`
  preview.textContent = ''
}

function clearWallpaper(){
  localStorage.removeItem('wallpaper')
  const preview = qs('#wallpaperPreview')
  preview.style.backgroundImage = 'none'
  preview.textContent = '未设置壁纸'
}

function exportBackup(){
  const data = {
    settings: JSON.parse(localStorage.getItem('settings')||'{}'),
    wallpaper: localStorage.getItem('wallpaper') || null
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'am_skin_backup.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function importBackupFile(file){
  const reader = new FileReader()
  reader.onload = e=>{
    try{
      const data = JSON.parse(e.target.result)
      if(data.settings) localStorage.setItem('settings', JSON.stringify(data.settings))
      if(data.wallpaper){
        localStorage.setItem('wallpaper', data.wallpaper)
        applyWallpaperDataUrl(data.wallpaper)
      }
      loadSettings()
      alert('备份导入成功')
    }catch(err){alert('导入失败：文件格式错误')}
  }
  reader.readAsText(file)
}

function exportDesktop(){
  const html = '<!-- 导出的桌面 HTML（示例） -->\n<div>桌面导出示例</div>'
  const blob = new Blob([html], {type:'text/html'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'desktop.html'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function getRoleState(){
  try{ return JSON.parse(localStorage.getItem('roleState') || '{}') }catch(e){ return {} }
}

function saveRoleState(data){
  localStorage.setItem('roleState', JSON.stringify(data))
}

function renderRoleState(){
  const roleState = getRoleState()
  const note = roleState.note || '温柔、观察细节、喜欢小惊喜'
  const worldbook = roleState.worldbook || '主线世界'
  const readNoReply = !!roleState.readNoReply
  const timeSense = !!roleState.timeSense
  const noteInput = qs('#roleNote')
  const worldbookSelect = qs('#worldbookSelect')
  const readNoReplyInput = qs('#readNoReply')
  const timeSenseInput = qs('#timeSense')
  if(noteInput) noteInput.value = note
  if(worldbookSelect) worldbookSelect.value = worldbook
  if(readNoReplyInput) readNoReplyInput.checked = readNoReply
  if(timeSenseInput) timeSenseInput.checked = timeSense
  const worldbooks = {
    '主线世界': '主线世界：两人相识于雨天，日常碎片中逐渐信任彼彼此。',
    '灰色回忆': '灰色回忆：时间被压成一页页的旧照片，回忆比现实更真实。',
    '酒馆分支': '酒馆分支：灯光低沉、笑声轻快、故事发生在一间会发光的旧酒馆。'
  }
  const preview = qs('#worldbookPreview')
  if(preview) preview.textContent = worldbooks[worldbook] || worldbooks['主线世界']
  const statusText = qs('#chatStatusText')
  if(statusText) statusText.textContent = readNoReply ? '在线·已读不回' : '在线'
}

function summarizeRole(){
  const note = (qs('#roleNote') && qs('#roleNote').value.trim()) || '温柔、观察细节、喜欢小惊喜'
  const worldbook = (qs('#worldbookSelect') && qs('#worldbookSelect').value) || '主线世界'
  const readNoReply = !!(qs('#readNoReply') && qs('#readNoReply').checked)
  const timeSense = !!(qs('#timeSense') && qs('#timeSense').checked)
  const summary = `角色备注：${note}；世界书：${worldbook}；状态：${readNoReply ? '已读不回' : '正常回复'}；时间感知：${timeSense ? '开启' : '关闭'}。`
  const preview = qs('#worldbookPreview')
  if(preview) preview.textContent = summary
  saveRoleState({ note, worldbook, readNoReply, timeSense })
  addChatMessage('char', 'text', { text: '我已经记住你的角色设定和世界书状态了。' })
}

// ---------- 微信聊天原型 ----------
function getChatMessages(){
  try{
    return JSON.parse(localStorage.getItem('chatMessages') || '[]')
  }catch(e){ return [] }
}

function saveChatMessages(list){
  localStorage.setItem('chatMessages', JSON.stringify(list))
}

function seedChatMessages(){
  const existing = getChatMessages()
  if(existing.length) return
  const initial = [
    {id:'m1', sender:'char', type:'text', text:'我已经在这里了，今天也想听你讲讲你的安排。', time: Date.now()-600000},
    {id:'m2', sender:'me', type:'text', text:'今天想整理一下电脑桌面和一些小设定。', time: Date.now()-420000},
    {id:'m3', sender:'char', type:'text', text:'那就从整体设置开始吧，先把氛围做得舒服一点。', time: Date.now()-180000}
  ]
  saveChatMessages(initial)
}

function renderChatMessages(){
  const list = qs('#messageList')
  if(!list) return
  const messages = getChatMessages()
  list.innerHTML = ''
  messages.forEach(msg => {
    const row = document.createElement('div')
    row.className = 'message-row ' + (msg.sender === 'me' ? 'me' : 'char')

    const bubble = document.createElement('div')
    bubble.className = 'bubble'

    if(msg.type === 'image' && msg.dataUrl){
      const img = document.createElement('img')
      img.src = msg.dataUrl
      img.alt = '图片消息'
      bubble.appendChild(img)
    } else if(msg.type === 'audio' && msg.dataUrl){
      const audio = document.createElement('audio')
      audio.controls = true
      audio.src = msg.dataUrl
      bubble.appendChild(audio)
    } else {
      bubble.textContent = msg.text || ''
    }

    row.appendChild(bubble)
    list.appendChild(row)
  })
  list.scrollTop = list.scrollHeight
}

function addChatMessage(sender, type, payload){
  const messages = getChatMessages()
  messages.push({
    id: 'm_' + Date.now() + Math.random().toString(16).slice(2),
    sender,
    type,
    text: payload.text || '',
    dataUrl: payload.dataUrl || '',
    time: Date.now()
  })
  saveChatMessages(messages)
  renderChatMessages()
}

function sendChatMessage(){
  const input = qs('#chatInput')
  const text = input.value.trim()
  if(!text) return
  addChatMessage('me', 'text', {text})
  input.value = ''

  setTimeout(() => {
    const replies = [
      '我在看你说的内容，先保留这个设定。',
      '这条消息很适合放进角色设定里。',
      '这个方向还不错，我会把它融进氛围里。',
      '我们可以一边调 UI，一边把角色细节补得更完整。'
    ]
    const randomReply = replies[Math.floor(Math.random() * replies.length)]
    addChatMessage('char', 'text', {text: randomReply})
  }, 400)
}

function replyWithImage(file){
  if(!file) return
  const reader = new FileReader()
  reader.onload = e => {
    addChatMessage('me', 'image', {dataUrl: e.target.result})
    setTimeout(() => addChatMessage('char','text',{text:'这张图很适合放在壁纸或者朋友圈里。'}), 350)
  }
  reader.readAsDataURL(file)
}

function recallLastMessage(){
  const messages = getChatMessages()
  const lastUserMessageIndex = messages.findLastIndex(m => m.sender === 'me')
  if(lastUserMessageIndex === -1){
    alert('没有可撤回的消息')
    return
  }
  messages.splice(lastUserMessageIndex, 1)
  saveChatMessages(messages)
  renderChatMessages()
}

function modifyLastMessage(){
  const messages = getChatMessages()
  const lastUserMessageIndex = messages.findLastIndex(m => m.sender === 'me')
  if(lastUserMessageIndex === -1){
    alert('没有可修改的消息')
    return
  }
  const current = messages[lastUserMessageIndex]
  const nextText = window.prompt('修改最近一条消息：', current.text || '')
  if(nextText === null) return
  if(!nextText.trim()) return
  messages[lastUserMessageIndex].text = nextText.trim()
  messages[lastUserMessageIndex].type = 'text'
  saveChatMessages(messages)
  renderChatMessages()
}

function sendTransfer(){
  const amount = window.prompt('请输入转账金额：', '88.88')
  if(amount === null) return
  const text = `转账 ${Number(amount || 0).toFixed(2)} 元，已发送。`
  addChatMessage('me', 'system', {text})
  setTimeout(() => addChatMessage('char', 'text', {text: '收到了，记得看看余额和记录。'}), 300)
}

function sendRedPacket(){
  const amount = window.prompt('请输入红包金额：', '66')
  if(amount === null) return
  addChatMessage('me', 'system', {text: `发红包：${amount} 元`})
  setTimeout(() => addChatMessage('char', 'text', {text: '红包到账了，感谢你。'}), 300)
}

function startCall(kind){
  const label = kind === 'video' ? '视频通话' : '语音通话'
  addChatMessage('me', 'system', {text: `${label}已拨打`})
  setTimeout(() => {
    const status = kind === 'video' ? '视频通话中，画质稳定。' : '语音通话中，音质清晰。'
    addChatMessage('char', 'text', {text: status})
  }, 350)
}

function sendLocation(){
  const locationText = '会展中心 · 2号门'
  addChatMessage('me', 'location', {text: locationText})
  setTimeout(() => addChatMessage('char', 'text', {text: '我在门口等你，晚点一起去。'}), 350)
}

function aiRegenerateLast(){
  const messages = getChatMessages()
  const lastChar = [...messages].reverse().find(m => m.sender === 'char')
  if(!lastChar) return
  const next = lastChar.text + '（根据上下文重写一版）'
  const idx = messages.findIndex(m => m.id === lastChar.id)
  if(idx >= 0){
    messages[idx].text = next
    saveChatMessages(messages)
    renderChatMessages()
  }
}

// ---------- AI 生成与本地缓存 ----------
function getAiCache(){
  try{
    return JSON.parse(localStorage.getItem('ai_cache')||'[]')
  }catch(e){return []}
}

function saveAiCache(list){
  localStorage.setItem('ai_cache', JSON.stringify(list))
}

function addAiCacheItem(item){
  const list = getAiCache()
  list.unshift(item)
  saveAiCache(list)
}

function renderAiResults(){
  const container = qs('#aiResults')
  const list = getAiCache()
  if(!list.length){ container.textContent = '暂无生成内容'; container.style.backgroundImage='none'; return }
  container.innerHTML = ''
  list.forEach(it=>{
    const div = document.createElement('div')
    div.className = 'ai-item'
    if(it.type === 'image'){
      const img = document.createElement('img')
      img.src = it.dataUrl
      img.alt = it.prompt
      div.appendChild(img)
    }else if(it.type === 'audio'){
      const btn = document.createElement('button')
      btn.textContent = '播放语音'
      btn.addEventListener('click', ()=>{
        if(it.dataUrl){
          const a = new Audio(it.dataUrl)
          a.play()
        }else if(it.synthOnly){
          const u = new SpeechSynthesisUtterance(it.prompt)
          speechSynthesis.speak(u)
        }
      })
      div.appendChild(btn)
    }
    const meta = document.createElement('div')
    meta.style.flex = '1'
    meta.innerHTML = `<div style="font-size:13px;color:#56616a">${it.prompt}</div><div style="font-size:11px;color:#95a0a6">${new Date(it.ts).toLocaleString()}</div>`
    div.appendChild(meta)
    const useBtn = document.createElement('button')
    useBtn.textContent = '在聊天中使用'
    useBtn.addEventListener('click', ()=>{
      const msgs = JSON.parse(localStorage.getItem('chatMessages')||'[]')
      msgs.push({from:'ai', type:it.type, dataUrl:it.dataUrl||null, prompt:it.prompt, ts:Date.now()})
      localStorage.setItem('chatMessages', JSON.stringify(msgs))
      alert('已添加到聊天消息（本地）')
    })
    div.appendChild(useBtn)
    container.appendChild(div)
  })
}

async function callApiGenerate(type, prompt){
  const apiUrl = qs('#apiUrl').value.trim()
  const apiKey = qs('#apiKey').value.trim()
  if(!apiUrl) return null
  try{
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey?{'Authorization': 'Bearer '+apiKey}:{})
      },
      body: JSON.stringify({type, prompt, model: qs('#modelName').value})
    })
    if(!resp.ok) throw new Error(resp.status + ' ' + resp.statusText)
    const j = await resp.json()
    // 期望返回 { mime: 'image/png', base64: '...' } 或 { mime: 'audio/mpeg', base64: '...' }
    if(j.base64 && j.mime){
      return {dataUrl: `data:${j.mime};base64,${j.base64}`, mime: j.mime}
    }
    if(j.data && j.mime){
      const data = j.data
      const dataUrl = data.startsWith('data:')? data : `data:${j.mime};base64,${data}`
      return {dataUrl, mime: j.mime}
    }
    return null
  }catch(err){
    console.error('API 调用失败', err)
    throw err
  }
}

async function generateImage(){
  const prompt = qs('#aiPrompt').value.trim()
  if(!prompt){ alert('请输入提示'); return }
  try{
    const res = await callApiGenerate('image', prompt).catch(()=>null)
    let dataUrl = null
    if(res && res.dataUrl) dataUrl = res.dataUrl
    else {
      // fallback: 生成简单 SVG 占位
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='#f6f7f8'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9aa0a6' font-size='24'>${prompt}</text></svg>`
      dataUrl = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)
    }
    const item = {id: 'ai_'+Date.now(), type:'image', prompt, dataUrl, ts: Date.now()}
    addAiCacheItem(item)
    renderAiResults()
    alert('图片已生成并缓存')
  }catch(e){ alert('生成图片失败：' + e) }
}

async function generateAudio(){
  const prompt = qs('#aiPrompt').value.trim()
  if(!prompt){ alert('请输入提示'); return }
  try{
    let res = null
    try{ res = await callApiGenerate('audio', prompt) }catch(e){ res = null }
    if(res && res.dataUrl){
      const item = {id:'ai_'+Date.now(), type:'audio', prompt, dataUrl: res.dataUrl, ts:Date.now()}
      addAiCacheItem(item)
      renderAiResults()
      alert('语音已生成并缓存')
      return
    }
    // fallback: 使用浏览器语音合成，不产生可重用数据，但标记为 synthOnly
    const item = {id:'ai_'+Date.now(), type:'audio', prompt, dataUrl:null, synthOnly:true, ts:Date.now()}
    addAiCacheItem(item)
    renderAiResults()
    alert('使用浏览器语音合成（本地播放，无 API 消耗）')
  }catch(e){ alert('生成语音失败：' + e) }
}

// ---------- 结束 AI 区 ----------

// ---------- 表情包与朋友圈 ----------
function getStickers(){
  try{ return JSON.parse(localStorage.getItem('stickers') || '[]') }catch(e){ return [] }
}

function saveStickers(list){
  localStorage.setItem('stickers', JSON.stringify(list))
}

function renderStickers(){
  const list = qs('#stickerList')
  if(!list) return
  const stickers = getStickers()
  if(!stickers.length){
    list.innerHTML = '<div class="sticker-item">暂无导入表情包</div>'
    return
  }
  list.innerHTML = stickers.map(item => `
    <div class="sticker-item">
      <div>${item.note}</div>
      <img src="${item.link}" alt="${item.note}">
    </div>
  `).join('')
}

function addSticker(){
  const link = qs('#stickerLink').value.trim()
  const note = qs('#stickerNote').value.trim()
  if(!link || !note){ alert('请填写图床链接和说明文字'); return }
  if(!/[\u4e00-\u9fa5]/.test(note) && !/[\u4e00-\u9fa5]/.test(link)){
    alert('必须在说明文字或链接中保留中文内容，便于表情理解。')
    return
  }
  const stickers = getStickers()
  stickers.unshift({link, note})
  saveStickers(stickers)
  renderStickers()
  qs('#stickerLink').value = ''
  qs('#stickerNote').value = ''
  addChatMessage('char', 'text', {text: '新表情包已导入，可在聊天中使用。'})
}

function getMoments(){
  try{ return JSON.parse(localStorage.getItem('moments') || '[]') }catch(e){ return [] }
}

function saveMoments(list){
  localStorage.setItem('moments', JSON.stringify(list))
}

function renderMoments(){
  const list = qs('#momentList')
  if(!list) return
  const moments = getMoments()
  if(!moments.length){
    list.innerHTML = '<div class="moment-item">暂无朋友圈内容</div>'
    return
  }
  list.innerHTML = moments.map(item => `
    <div class="moment-item">
      <div>${item.text}</div>
      ${item.image ? `<img src="${item.image}" alt="moment" />` : ''}
      <div class="meta">${new Date(item.time).toLocaleString()} · 赞 ${item.likes || 0} · 评论 ${item.comments || 0}</div>
    </div>
  `).join('')
}

function postMoment(){
  const text = (qs('#momentText') && qs('#momentText').value.trim()) || '今天也想记录一点小日常。'
  const file = qs('#momentImageInput') ? qs('#momentImageInput').files[0] : null
  const moments = getMoments()
  const item = { text, time: Date.now(), likes: 0, comments: 0 }
  if(file){
    const reader = new FileReader()
    reader.onload = e => {
      item.image = e.target.result
      moments.unshift(item)
      saveMoments(moments)
      renderMoments()
      if(qs('#momentText')) qs('#momentText').value = ''
      if(qs('#momentImageInput')) qs('#momentImageInput').value = ''
      addChatMessage('char', 'text', {text: '朋友圈更新成功，今天也是温柔的一天。'})
    }
    reader.readAsDataURL(file)
  }else{
    moments.unshift(item)
    saveMoments(moments)
    renderMoments()
    if(qs('#momentText')) qs('#momentText').value = ''
    addChatMessage('char', 'text', {text: '朋友圈更新成功，今天也是温柔的一天。'})
  }
}

// 事件绑定
window.addEventListener('DOMContentLoaded', ()=>{
  loadSettings()
  if(qs('#saveApi')) qs('#saveApi').addEventListener('click', saveSettings)
  if(qs('#applyFont')) qs('#applyFont').addEventListener('click', applyFont)
  if(qs('#wallpaperFile')) qs('#wallpaperFile').addEventListener('change', e=>handleWallpaperFile(e.target.files[0]))
  if(qs('#clearWallpaper')) qs('#clearWallpaper').addEventListener('click', clearWallpaper)
  if(qs('#exportBackup')) qs('#exportBackup').addEventListener('click', exportBackup)
  if(qs('#importBackup')) qs('#importBackup').addEventListener('change', e=>importBackupFile(e.target.files[0]))
  if(qs('#exportDesktop')) qs('#exportDesktop').addEventListener('click', exportDesktop)

  const genImageBtn = qs('#genImage')
  if(genImageBtn) genImageBtn.addEventListener('click', generateImage)
  const genAudioBtn = qs('#genAudio')
  if(genAudioBtn) genAudioBtn.addEventListener('click', generateAudio)

  seedChatMessages()
  renderChatMessages()
  renderAiResults()
  renderStickers()
  renderMoments()
  renderRoleState()

  if(qs('#sendMessage')) qs('#sendMessage').addEventListener('click', sendChatMessage)
  if(qs('#chatInput')) qs('#chatInput').addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendChatMessage() }})
  if(qs('#recallLast')) qs('#recallLast').addEventListener('click', recallLastMessage)
  if(qs('#modifyLast')) qs('#modifyLast').addEventListener('click', modifyLastMessage)
  if(qs('#chatImageInput')) qs('#chatImageInput').addEventListener('change', e => replyWithImage(e.target.files[0]))
  if(qs('#chatAudioInput')) qs('#chatAudioInput').addEventListener('change', e => { const file = e.target.files[0]; if(file) { const reader = new FileReader(); reader.onload = event => { addChatMessage('me', 'audio', {dataUrl: event.target.result}); setTimeout(() => addChatMessage('char', 'text', {text: '我会把这段语音存进本地缓存，之后可以反复听。'}), 350) }; reader.readAsDataURL(file) } })
  if(qs('#sendTransfer')) qs('#sendTransfer').addEventListener('click', sendTransfer)
  if(qs('#sendRedPacket')) qs('#sendRedPacket').addEventListener('click', sendRedPacket)
  if(qs('#voiceCall')) qs('#voiceCall').addEventListener('click', () => startCall('voice'))
  if(qs('#videoCall')) qs('#videoCall').addEventListener('click', () => startCall('video'))
  if(qs('#summarizeRole')) qs('#summarizeRole').addEventListener('click', summarizeRole)
  if(qs('#addSticker')) qs('#addSticker').addEventListener('click', addSticker)
  if(qs('#postMoment')) qs('#postMoment').addEventListener('click', postMoment)
  if(qs('#readNoReply')) qs('#readNoReply').addEventListener('change', () => {
    const role = getRoleState(); role.readNoReply = qs('#readNoReply').checked; saveRoleState(role); renderRoleState();
  })
  if(qs('#timeSense')) qs('#timeSense').addEventListener('change', () => {
    const role = getRoleState(); role.timeSense = qs('#timeSense').checked; saveRoleState(role); renderRoleState();
  })
  if(qs('#worldbookSelect')) qs('#worldbookSelect').addEventListener('change', () => {
    const role = getRoleState(); role.worldbook = qs('#worldbookSelect').value; saveRoleState(role); renderRoleState();
  })
  if(qs('#roleNote')) qs('#roleNote').addEventListener('change', () => {
    const role = getRoleState(); role.note = qs('#roleNote').value; saveRoleState(role); renderRoleState();
  })

  const actionRow = document.querySelector('.chat-actions')
  if(actionRow){
    const locationBtn = document.createElement('button')
    locationBtn.id = 'sendLocation'
    locationBtn.textContent = '位置'
    locationBtn.addEventListener('click', sendLocation)
    actionRow.appendChild(locationBtn)

    const regenBtn = document.createElement('button')
    regenBtn.id = 'aiRegenerate'
    regenBtn.textContent = '重回'
    regenBtn.addEventListener('click', aiRegenerateLast)
    actionRow.appendChild(regenBtn)
  }

  // 线下模式初始化
  seedWorldbooksForTavern()
  seedWritingStyles()
  seedTavernChars()
  renderTavernWorldbookSelect()
  renderTavernStyleSelect()
  renderTavernCharacters()

  if(qs('#manageStylesBtn')) qs('#manageStylesBtn').addEventListener('click', showStyleManagePage)
  if(qs('#refreshWorldbooksBtn')) qs('#refreshWorldbooksBtn').addEventListener('click', () => { renderTavernWorldbookSelect(); alert('世界书列表已刷新') })
  if(qs('#addTavernCharBtn')) qs('#addTavernCharBtn').addEventListener('click', addTavernCharacter)
  if(qs('#tavernSendBtn')) qs('#tavernSendBtn').addEventListener('click', sendTavernMessage)
  if(qs('#tavernInput')) qs('#tavernInput').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); sendTavernMessage() }})
  if(qs('#tavernStylePreviewBtn')) qs('#tavernStylePreviewBtn').addEventListener('click', previewStyleInChat)

  if(qs('#saveStyleBtn')) qs('#saveStyleBtn').addEventListener('click', saveStyle)
  if(qs('#cancelStyleBtn')) qs('#cancelStyleBtn').addEventListener('click', hideStyleManagePage)
})

// ---------- 线下模式 · 酒馆模拟 ----------
function getWorldbooks(){
  try{ return JSON.parse(localStorage.getItem('worldbooks') || '{}') }catch(e){ return {} }
}

function getWritingStyles(){
  try{ return JSON.parse(localStorage.getItem('writingStyles') || '[]') }catch(e){ return [] }
}

function saveWritingStyles(list){
  localStorage.setItem('writingStyles', JSON.stringify(list))
}

function getTavernChars(){
  try{ return JSON.parse(localStorage.getItem('tavernChars') || '[]') }catch(e){ return [] }
}

function saveTavernChars(list){
  localStorage.setItem('tavernChars', JSON.stringify(list))
}

function getTavernMessages(){
  try{ return JSON.parse(localStorage.getItem('tavernMessages') || '[]') }catch(e){ return [] }
}

function saveTavernMessages(list){
  localStorage.setItem('tavernMessages', JSON.stringify(list))
}

function renderTavernWorldbookSelect(){
  const select = qs('#tavernWorldbookSelect')
  if(!select) return
  const worldbooks = getWorldbooks()
  const names = Object.keys(worldbooks)
  select.innerHTML = '<option value="">-- 选择挂载的世界书 --</option>' + names.map(n => `<option value="${n}">${n}</option>`).join('')
}

function renderTavernStyleSelect(){
  const select = qs('#tavernStyleSelect')
  if(!select) return
  const styles = getWritingStyles()
  select.innerHTML = '<option value="">-- 选择文风 --</option>' + styles.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
}

function renderTavernCharacters(){
  const container = qs('#tavernCharacterList')
  if(!container) return
  const chars = getTavernChars()
  const selectedId = localStorage.getItem('tavernSelectedChar')
  if(!chars.length){
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:12px">暂无角色，点击添加角色卡</div>'
    qs('#tavernChatArea').style.display = 'none'
    return
  }
  container.innerHTML = chars.map(c => `
    <div class="char-card ${c.id === selectedId ? 'selected' : ''}" data-id="${c.id}">
      <div class="char-avatar">${(c.name||'?')[0]}</div>
      <div class="char-name">${c.name}</div>
      <div class="char-tags">${(c.tags||[]).slice(0,2).join('、')}</div>
    </div>
  `).join('')
  container.querySelectorAll('.char-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      selectTavernChar(card.dataset.id)
    })
  })
  if(selectedId && chars.find(c=>c.id===selectedId)){
    showTavernChat(selectedId)
  }else{
    qs('#tavernChatArea').style.display = 'none'
  }
}

function selectTavernChar(charId){
  localStorage.setItem('tavernSelectedChar', charId)
  renderTavernCharacters()
  showTavernChat(charId)
}

function showTavernChat(charId){
  const chars = getTavernChars()
  const char = chars.find(c=>c.id===charId)
  if(!char) return
  qs('#tavernChatArea').style.display = 'block'
  qs('#tavernCharName').textContent = char.name
  qs('#tavernCharAvatar').textContent = (char.name||'?')[0]
  qs('#tavernCharStatus').textContent = char.desc || '灯光微黄，等你开口'
  renderTavernMessages()
}

function renderTavernMessages(){
  const list = qs('#tavernMessageList')
  if(!list) return
  const messages = getTavernMessages()
  list.innerHTML = ''
  messages.forEach(msg => {
    const row = document.createElement('div')
    row.className = 'message-row ' + (msg.sender === 'me' ? 'me' : 'char')
    const bubble = document.createElement('div')
    bubble.className = 'bubble'
    bubble.textContent = msg.text || ''
    row.appendChild(bubble)
    list.appendChild(row)
  })
  list.scrollTop = list.scrollHeight
}

function addTavernMessage(sender, text){
  const messages = getTavernMessages()
  messages.push({id: 't_'+Date.now()+Math.random().toString(16).slice(2), sender, text, time: Date.now()})
  saveTavernMessages(messages)
  renderTavernMessages()
}

function sendTavernMessage(){
  const input = qs('#tavernInput')
  const text = input.value.trim()
  if(!text) return
  addTavernMessage('me', text)
  input.value = ''

  const selectedId = localStorage.getItem('tavernSelectedChar')
  const chars = getTavernChars()
  const char = chars.find(c=>c.id===selectedId)
  const worldbookName = qs('#tavernWorldbookSelect').value
  const styleId = qs('#tavernStyleSelect').value
  const styles = getWritingStyles()
  const style = styles.find(s=>s.id===styleId)
  const worldbooks = getWorldbooks()
  const wbContent = worldbookName ? worldbooks[worldbookName] : ''

  setTimeout(() => {
    let reply = ''
    if(char){
      const stylePrefix = style ? `\n【文风指导】${style.content}\n` : ''
      const wbPrefix = wbContent ? `\n【世界书背景】${wbContent}\n` : ''
      // 简易模拟回复，实际应调用 API
      const templates = [
        `${char.name}微微侧头，目光在昏黄灯光下停留片刻："${text}……这事儿有意思。"`,
        `${char.name}轻敲吧台，指尖发出细微声响："接着说，我在听。"${stylePrefix}${wbPrefix}`,
        `${char.name}嘴角勾起一抹不易察觉的弧度："如果故事要继续，那得看你怎么写了。"`,
        `${char.name}将杯中琥珀色液体轻晃："这间酒馆不缺故事，缺的是讲故事的人。"`
      ]
      reply = templates[Math.floor(Math.random() * templates.length)]
    }else{
      reply = '酒保擦拭着杯子，目光平静："客官想聊什么？"'
    }
    addTavernMessage('char', reply)
  }, 500)
}

function previewStyleInChat(){
  const styleId = qs('#tavernStyleSelect').value
  const styles = getWritingStyles()
  const style = styles.find(s=>s.id===styleId)
  if(!style){
    alert('请先选择一个文风')
    return
  }
  const preview = `【文风预览】${style.name}\n场景：${style.scene}\n\n${style.content}\n\n—— 以上风格将应用于后续对话生成中`
  alert(preview)
}

// 文风管理
let editingStyleId = null

function renderStyleList(){
  const container = qs('#styleList')
  if(!container) return
  const styles = getWritingStyles()
  if(!styles.length){
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:12px">暂无文风，请新建</div>'
    return
  }
  container.innerHTML = styles.map(s => `
    <div class="style-item" data-id="${s.id}">
      <div class="style-info">
        <div class="style-name">${s.name}</div>
        <div class="style-scene">${s.scene || '通用'}</div>
        <div class="style-content">${s.content.slice(0,80)}...</div>
      </div>
      <div class="style-actions">
        <button class="edit-style-btn">编辑</button>
        <button class="delete-style-btn">删除</button>
      </div>
    </div>
  `).join('')
  container.querySelectorAll('.edit-style-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = e.target.closest('.style-item').dataset.id
      editStyle(id)
    })
  })
  container.querySelectorAll('.delete-style-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = e.target.closest('.style-item').dataset.id
      deleteStyle(id)
    })
  })
}

function editStyle(id){
  const styles = getWritingStyles()
  const style = styles.find(s=>s.id===id)
  if(!style) return
  editingStyleId = id
  qs('#styleName').value = style.name
  qs('#styleScene').value = style.scene || ''
  qs('#styleContent').value = style.content
  qs('#saveStyleBtn').textContent = '更新文风'
  showStyleManagePage()
}

function deleteStyle(id){
  if(!confirm('确定删除该文风？')) return
  const styles = getWritingStyles().filter(s=>s.id!==id)
  saveWritingStyles(styles)
  renderStyleList()
  renderTavernStyleSelect()
}

function saveStyle(){
  const name = qs('#styleName').value.trim()
  const scene = qs('#styleScene').value.trim()
  const content = qs('#styleContent').value.trim()
  if(!name || !content){
    alert('文风名称和内容不能为空')
    return
  }
  const styles = getWritingStyles()
  if(editingStyleId){
    const idx = styles.findIndex(s=>s.id===editingStyleId)
    if(idx>=0){
      styles[idx] = {...styles[idx], name, scene, content}
    }
  }else{
    styles.unshift({id: 'style_'+Date.now(), name, scene, content, createdAt: Date.now()})
  }
  saveWritingStyles(styles)
  resetStyleForm()
  renderStyleList()
  renderTavernStyleSelect()
  hideStyleManagePage()
}

function resetStyleForm(){
  editingStyleId = null
  qs('#styleName').value = ''
  qs('#styleScene').value = ''
  qs('#styleContent').value = ''
  qs('#saveStyleBtn').textContent = '保存文风'
}

function showStyleManagePage(){
  qs('#styleManagePage').style.display = 'block'
  qs('#offlinePage').style.display = 'none'
  renderStyleList()
}

function hideStyleManagePage(){
  qs('#styleManagePage').style.display = 'none'
  qs('#offlinePage').style.display = 'block'
}

function addTavernCharacter(){
  const name = prompt('角色名称：')
  if(!name) return
  const desc = prompt('角色简介/设定：') || ''
  const tagsInput = prompt('标签（用顿号分隔，如：温柔、神秘、酒保）：') || ''
  const tags = tagsInput.split('、').map(t=>t.trim()).filter(Boolean)
  const chars = getTavernChars()
  const newChar = {id: 'char_'+Date.now(), name, desc, tags, createdAt: Date.now()}
  chars.unshift(newChar)
  saveTavernChars(chars)
  renderTavernCharacters()
}

// 初始化默认文风
function seedWritingStyles(){
  const existing = getWritingStyles()
  if(existing.length) return
  const defaults = [
    {id:'style_1', name:'日系轻小说风', scene:'日常、校园、青春', content:'使用第一人称或第三人称限制视角\n细腻描写环境光影、季节气息与微表情\n对话简短留白多，心理活动用括号标注\n避免网络流行语，保持克制灰调\n结尾常留悬念或余韵', createdAt:Date.now()},
    {id:'style_2', name:'克苏鲁调查风', scene:'悬疑、恐怖、调查', content:'使用第二人称"你"增强代入感\n大量感官描写：霉味、潮湿、耳鸣、视觉扭曲\n理智值检定式叙述，逐步揭露恐怖核心\n术语专业：神话生物、咒文、秘密结社\n节奏缓慢铺垫，高潮突发疯狂', createdAt:Date.now()+1},
    {id:'style_3', name:'赛博朋克黑话', scene:'科幻、黑帮、霓虹夜城', content:'混杂英语词汇：choom、edgerunner、corpo、chrome\n短句快节奏，像数据流一样切割叙述\n霓虹灯、雨夜、植入体、贫富差距为核心意象\n第一人称愤世嫉俗内心独白\n结局开放式，不给圆满只给真相', createdAt:Date.now()+2},
    {id:'style_4', name:'古风志怪笔记', scene:'志怪、传奇、笔记体', content:'半文半白，留白修辞\n"予观夫……"、"盖闻……"式开篇\n妖鬼神怪皆有来历，非善非恶\n因果循环，结局多含哲理警世\n地名人名用典故暗喻', createdAt:Date.now()+3}
  ]
  saveWritingStyles(defaults)
}

function seedTavernChars(){
  const existing = getTavernChars()
  if(existing.length) return
  const defaults = [
    {id:'char_1', name:'老酒保', desc:'擦杯子的动作从未停过，眼神看透世事', tags:['神秘','倾听者','酒馆'], createdAt:Date.now()},
    {id:'char_2', name:'流浪吟游诗人', desc:'琴盒贴着旅途贴纸，歌里藏着未完的故事', tags:['艺术','漂泊','音乐'], createdAt:Date.now()+1},
    {id:'char_3', name:'穿风衣的侦探', desc:'雨夜总坐在角落，手里攥着没抽完的烟', tags:['推理','冷峻','黑夜'], createdAt:Date.now()+2},
    {id:'char_4', name:'会发光的猫', desc:'蹲在吧台最高处，瞳孔像两颗琥珀', tags:['奇幻','治愈','观察者'], createdAt:Date.now()+3}
  ]
  saveTavernChars(defaults)
}

// 初始化默认世界书（供酒馆挂载）
function seedWorldbooksForTavern(){
  const existing = getWorldbooks()
  if(Object.keys(existing).length) return
  const defaults = {
    '主线世界': '主线世界：两人相识于雨天，日常碎片中逐渐信任彼此。',
    '灰色回忆': '灰色回忆：时间被压成一页页的旧照片，回忆比现实更真实。',
    '酒馆分支': '酒馆分支：灯光低沉、笑声轻快、故事发生在一间会发光的旧酒馆。',
    '赛博酒巷': '赛博酒巷：霓虹渗进廉价啤酒，植入体在酒精中闪烁，每个角落都藏着数据交易。',
    '克苏鲁旧港': '克苏鲁旧港：雾气裹着腐臭海风，灯塔光束扫过的地方理智开始流失。',
    '江南烟雨楼': '江南烟雨楼：油纸伞下穿行的皆是前尘往事，茶香掩不住刀光剑影。'
  }
  localStorage.setItem('worldbooks', JSON.stringify(defaults))
}
