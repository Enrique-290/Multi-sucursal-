const fmtTime = iso => new Date(iso).toLocaleString('es-MX',{hour12:false});

const API = {
  async branch() {
    const r = await fetch('/api/health'); return r.json();
  },
  async rooms() {
    const r = await fetch('/api/chat/threads'); return r.json();
  },
  async history(thread_id) {
    const r = await fetch('/api/chat/history/'+encodeURIComponent(thread_id)); return r.json();
  }
};

let state = {
  user_id: localStorage.getItem('USER_ID') || ('U-' + Math.random().toString(36).slice(2,7).toUpperCase()),
  user_name: localStorage.getItem('USER_NAME') || prompt('Tu nombre para el chat:') || 'Usuario',
  thread_id: null,
  socket: null,
};

localStorage.setItem('USER_ID', state.user_id);
localStorage.setItem('USER_NAME', state.user_name);

function el(tag, attrs={}, ...children){
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=> e[k]=v);
  children.forEach(c => e.append(c));
  return e;
}

function renderRooms(list){
  const cont = document.getElementById('rooms');
  cont.innerHTML = '';
  list.forEach(r=>{
    const div = el('div',{className:'room' + (state.thread_id===r.id?' active':'')});
    div.textContent = (r.name || r.id);
    div.addEventListener('click', ()=> joinRoom(r.id));
    cont.append(div);
  });
}

function renderMessages(list){
  const box = document.getElementById('messages');
  box.innerHTML = '';
  list.forEach(m=>{
    const wrap = el('div',{className:'msg'});
    const who = el('div',{className:'meta'}, `${m.user_name||m.user_id} • ${fmtTime(m.created_at)}`);
    const body = el('div',{}, m.body||'');
    wrap.append(who, body);
    box.append(wrap);
  });
  box.scrollTop = box.scrollHeight;
}

async function joinRoom(thread_id){
  state.thread_id = thread_id;
  // load history
  const h = await API.history(thread_id);
  renderMessages(h.items||[]);
  // join socket room
  if (state.socket) {
    state.socket.emit('join', { thread_id });
  }
  // highlight
  document.querySelectorAll('.room').forEach(n=>n.classList.remove('active'));
  const rooms = await API.rooms();
  renderRooms(rooms.items);
  document.querySelectorAll('.room').forEach(n=>{
    if (n.textContent===rooms.items.find(x=>x.id===thread_id).name) n.classList.add('active');
  });
}

async function main(){
  const b = await API.branch();
  document.getElementById('branchName').textContent = b.branch.name;
  document.getElementById('branchId').textContent = b.branch.id;
  document.getElementById('userNameBadge').textContent = state.user_name;

  const rooms = await API.rooms();
  renderRooms(rooms.items);
  if (rooms.items.length) joinRoom(rooms.items[0].id);

  state.socket = io();
  state.socket.on('connect', ()=>{
    if (state.thread_id) state.socket.emit('join', { thread_id: state.thread_id });
  });
  state.socket.on('chat:new', (msg)=>{
    if (msg.thread_id === state.thread_id) {
      const box = document.getElementById('messages');
      const wrap = document.createElement('div');
      wrap.className = 'msg';
      wrap.innerHTML = `<div class="meta">${msg.user_name || msg.user_id} • ${fmtTime(msg.created_at)}</div><div>${msg.body||''}</div>`;
      box.append(wrap);
      box.scrollTop = box.scrollHeight;
    }
  });

  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('messageInput').addEventListener('keydown', e=>{
    if (e.key==='Enter') sendMessage();
  });
}

async function sendMessage(){
  const input = document.getElementById('messageInput');
  const body = input.value.trim();
  if (!body || !state.thread_id) return;
  state.socket.emit('chat:send', {
    thread_id: state.thread_id,
    body,
    user_id: state.user_id,
    user_name: state.user_name
  });
  input.value = '';
}

main();
