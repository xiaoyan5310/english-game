// ============================================================
// 英语小达人 - 主应用逻辑
// ============================================================

// ============================================================
// 音效引擎（使用 Web Audio API，无需音频文件）
// ============================================================
var audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// 消灭僵尸音效：短促有力的"啵"声 + 清脆叮咚
function playKillSound() {
  try {
    var ctx = getAudioCtx();
    var t = ctx.currentTime;

    // 低频冲击波 — 模拟"啵"的打击感
    var osc1 = ctx.createOscillator();
    var gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(300, t);
    osc1.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    gain1.gain.setValueAtTime(0.4, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.2);

    // 清脆叮咚声 — 奖励反馈
    var osc2 = ctx.createOscillator();
    var gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, t + 0.05);
    osc2.frequency.setValueAtTime(1100, t + 0.1);
    osc2.frequency.setValueAtTime(1320, t + 0.15);
    gain2.gain.setValueAtTime(0.25, t + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.05);
    osc2.stop(t + 0.3);

  } catch(e) { /* 静默忽略 */ }
}

// 错误音效：低沉嗡嗡
function playErrorSound() {
  try {
    var ctx = getAudioCtx();
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.setValueAtTime(100, t + 0.15);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  } catch(e) {}
}

// 大嘴花 / 樱桃炸弹音效：更强烈的爆炸声
function playBigKillSound() {
  try {
    var ctx = getAudioCtx();
    var t = ctx.currentTime;

    // 爆炸低频
    var osc1 = ctx.createOscillator();
    var gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(200, t);
    osc1.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    gain1.gain.setValueAtTime(0.35, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.35);

    // 高音闪烁
    var osc2 = ctx.createOscillator();
    var gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1000, t + 0.05);
    osc2.frequency.setValueAtTime(1400, t + 0.12);
    osc2.frequency.setValueAtTime(1800, t + 0.2);
    gain2.gain.setValueAtTime(0.3, t + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.05);
    osc2.stop(t + 0.4);

  } catch(e) {}
}

// 全局状态
const state = {
  version: 'new',       // 'new' | 'old'
  currentPage: 'home',
  selectedUnits: new Set(['u1']),
  vocabTab: 'words',
  exerciseIndex: 0,
  exerciseQuestions: [],
  exerciseScore: 0,
  totalStars: 0,         // 保留兼容，实际展示阳光
  totalSunlight: 0,      // ☀️ 阳光积分
  stats: { words: 0, correct: 0 },
  // 植物大战僵尸状态
  pvzSunlight: 0,        // PVZ模式下的阳光
};

// 从 localStorage 加载
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('pep_english_state') || '{}');
    if (saved.version) state.version = saved.version;
    if (saved.selectedUnits) state.selectedUnits = new Set(saved.selectedUnits);
    if (saved.totalStars != null) state.totalStars = saved.totalStars;
    if (saved.totalSunlight != null) state.totalSunlight = saved.totalSunlight;
    if (saved.stats) state.stats = saved.stats;
    if (saved.pvzSunlight != null) state.pvzSunlight = saved.pvzSunlight;
  } catch(e) {}
}
function saveState() {
  localStorage.setItem('pep_english_state', JSON.stringify({
    version: state.version,
    selectedUnits: [...state.selectedUnits],
    totalStars: state.totalStars,
    totalSunlight: state.totalSunlight,
    stats: state.stats,
    pvzSunlight: state.pvzSunlight,
  }));
}

// 获取当前版本的数据
function getData() {
  return PEP_DATA[state.version];
}

// 获取选中单元的合并数据
function getSelectedData() {
  const data = getData();
  const selected = data.filter(u => state.selectedUnits.has(u.id));
  return {
    words: selected.flatMap(u => u.words),
    phrases: selected.flatMap(u => u.phrases),
    sentences: selected.flatMap(u => u.sentences),
    grammar: selected.flatMap(u => u.grammar)
  };
}

// ==================== 导航 ====================
function navigate(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');

  if (page === 'home') renderHome();
  if (page === 'vocab') renderVocab();
  if (page === 'exercise') renderExercise();
  if (page === 'game') renderGame();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.page));
});

// ==================== 首页 ====================
function renderHome() {

// 下载离线版本
window.downloadOffline = function() {
  // 直接把当前页面源码保存为文件
  var html = document.documentElement.outerHTML;
  var blob = new Blob(['<!DOCTYPE html>\n' + html], {type: 'text/html'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '英语小达人.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📥 下载中...请在Safari中打开下载的文件', 3000);
};

  // 版本按钮
  document.querySelectorAll('.version-btn').forEach(btn => {
    btn.classList.toggle('btn-primary', btn.dataset.version === state.version);
    btn.classList.toggle('btn-outline', btn.dataset.version !== state.version);
  });
  document.getElementById('versionHint').textContent =
    state.version === 'new'
      ? '人教版PEP四上：Unit1 Helping at home · Unit2 My friends · Unit3 Places we live in · Unit4 Helping in the community · Unit5 The weather and us · Unit6 Changing for the seasons'
      : '';

  // 单元网格
  const grid = document.getElementById('unitGrid');
  const data = getData();
  grid.innerHTML = data.map(u => {
    const progress = Math.floor(Math.random() * 60 + 20); // TODO: real progress
    return `
      <div class="unit-card ${state.selectedUnits.has(u.id) ? 'selected' : ''}"
           onclick="toggleUnit('${u.id}')">
        <div class="unit-icon">${u.icon}</div>
        <div class="unit-title">${u.title}</div>
        <div class="unit-subtitle">${u.subtitle}</div>
        <div class="unit-progress">
          <div class="unit-progress-bar" style="width:${progress}%"></div>
        </div>
        <div class="unit-stars">${'☀️'.repeat(Math.min(3, Math.floor(progress/25)))}</div>
      </div>`;
  }).join('');

  // 统计
  document.getElementById('totalStars').textContent = state.totalSunlight;
  document.getElementById('statWords').textContent = state.stats.words;
  document.getElementById('statCorrect').textContent = state.stats.correct;
  document.getElementById('statStars').textContent = '☀️ ' + state.totalSunlight;
}

// 切换单元选择
function toggleUnit(unitId) {
  if (state.selectedUnits.has(unitId)) {
    if (state.selectedUnits.size > 1) state.selectedUnits.delete(unitId);
  } else {
    state.selectedUnits.add(unitId);
  }
  saveState();
  renderHome();
}

// 版本切换
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('version-btn')) {
    state.version = e.target.dataset.version;
    saveState();
    renderHome();
  }
});

// 开始学习 -> 跳转词汇页
function startStudy() {
  navigate('vocab');
}

// 开始练习 -> 跳转练习页
function startExercise() {
  navigate('exercise');
}

// ==================== 课文点读（课本风格） ====================
// 角色头像映射
var CHARACTERS = {
  'Amy':      { icon: '👧🏻', color: '#EC4899', name: 'Amy',      voice: { rate: 0.92, pitch: 1.5 } },
  'Sarah':    { icon: '👩🏻', color: '#F59E0B', name: 'Sarah',    voice: { rate: 0.85, pitch: 1.1 } },
  'John':     { icon: '👦🏻', color: '#3B82F6', name: 'John',     voice: { rate: 0.9,  pitch: 1.4 } },
  'Mike':     { icon: '👦🏼', color: '#22C55E', name: 'Mike',     voice: { rate: 0.9,  pitch: 1.45 } },
  'Wu Binbin':{ icon: '👦🏻', color: '#8B5CF6', name: '吴彬彬',   voice: { rate: 0.88, pitch: 1.35 } },
  'Chen Jie': { icon: '👧🏻', color: '#EF4444', name: '陈杰',     voice: { rate: 0.9,  pitch: 1.55 } },
  'Mum':      { icon: '👩‍🦰', color: '#F97316', name: '妈妈',     voice: { rate: 0.82, pitch: 0.95 } },
  'Old Man':  { icon: '👴🏻', color: '#78716C', name: '老人',     voice: { rate: 0.75, pitch: 0.7 } },
  'default':  { icon: '🙂', color: '#6B7280', name: '',         voice: { rate: 0.85, pitch: 1.0 } }
};

function openDialogue() {
  var data = getData();
  var sel = [...state.selectedUnits];
  var units = data.filter(function(u) { return sel.indexOf(u.id) >= 0; });

  if (units.length === 0) {
    alert('请先选择单元！');
    return;
  }

  var allHTML = '';

  units.forEach(function(unit, ui) {
    if (!unit.dialogues || unit.dialogues.length === 0) return;

    var dialogueHTML = unit.dialogues.map(function(d, di) {
      var ch = CHARACTERS[d.speaker] || CHARACTERS['default'];
      var sid = 'd_' + ui + '_' + di;
      var isLeft = (di % 2 === 0); // 交替左右

      if (isLeft) {
        // 左侧气泡
        return '<div class="d-msg d-msg-left" id="' + sid + '" onclick="speakDialogue(\'' + sid + '\')" style="display:flex;align-items:flex-start;gap:10px;margin:10px 0;cursor:pointer;">' +
          '<div style="flex-shrink:0;width:44px;height:44px;border-radius:50%;background:' + ch.color + '22;display:flex;align-items:center;justify-content:center;font-size:26px;">' + ch.icon + '</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:11px;color:' + ch.color + ';font-weight:700;margin-bottom:3px;">' + ch.name + '</div>' +
            '<div style="background:#fff;border-radius:4px 16px 16px 16px;padding:10px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">' +
              '<div style="font-size:15px;color:var(--text);font-weight:600;line-height:1.5;">' + d.en + '</div>' +
              '<div style="font-size:12px;color:var(--text-light);margin-top:3px;padding-top:3px;border-top:1px dashed #E5E7EB;">' + d.zh + '</div>' +
            '</div>' +
          '</div>' +
          '<span style="flex-shrink:0;font-size:16px;margin-top:20px;opacity:0.4;">🔊</span>' +
          '</div>';
      } else {
        // 右侧气泡
        return '<div class="d-msg d-msg-right" id="' + sid + '" onclick="speakDialogue(\'' + sid + '\')" style="display:flex;align-items:flex-start;gap:10px;margin:10px 0;cursor:pointer;flex-direction:row-reverse;">' +
          '<div style="flex-shrink:0;width:44px;height:44px;border-radius:50%;background:' + ch.color + '22;display:flex;align-items:center;justify-content:center;font-size:26px;">' + ch.icon + '</div>' +
          '<div style="flex:1;text-align:right;">' +
            '<div style="font-size:11px;color:' + ch.color + ';font-weight:700;margin-bottom:3px;">' + ch.name + '</div>' +
            '<div style="background:' + ch.color + '11;border-radius:16px 4px 16px 16px;padding:10px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:left;">' +
              '<div style="font-size:15px;color:var(--text);font-weight:600;line-height:1.5;">' + d.en + '</div>' +
              '<div style="font-size:12px;color:var(--text-light);margin-top:3px;padding-top:3px;border-top:1px dashed #E5E7EB;">' + d.zh + '</div>' +
            '</div>' +
          '</div>' +
          '<span style="flex-shrink:0;font-size:16px;margin-top:20px;opacity:0.4;">🔊</span>' +
          '</div>';
      }
    }).join('');

    allHTML += '<div style="margin-bottom:20px;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:10px 14px;background:linear-gradient(135deg,#F5F3FF,#EDE9FE);border-radius:12px;">' +
      '<span style="font-size:28px;">' + unit.icon + '</span>' +
      '<div><div style="font-size:15px;font-weight:700;color:var(--primary);">' + unit.subtitle + '</div>' +
      '<div style="font-size:12px;color:var(--text-light);">' + unit.titleCN + '</div></div>' +
      '</div>' +
      '<div style="background:#F8F7FC;border-radius:16px;padding:12px;">' + dialogueHTML + '</div>' +
      '</div>';
  });

  var modal = showModal(
    '<h2 style="display:flex;align-items:center;gap:8px;"><span>📖</span> 课文点读 <span style="font-size:12px;color:var(--text-light);font-weight:400;">点击句子听朗读</span></h2>' +
    '<div style="max-height:62vh;overflow-y:auto;padding-right:4px;">' + allHTML + '</div>' +
    '<button class="btn btn-outline btn-block btn-sm" style="margin-top:12px" onclick="closeModal()">关闭</button>'
  );

  // 存储对话数据
  window._dialogueData = {};
  units.forEach(function(unit, ui) {
    if (!unit.dialogues) return;
    unit.dialogues.forEach(function(d, di) {
      var key = 'd_' + ui + '_' + di;
      window._dialogueData[key] = { text: d.en, speaker: d.speaker };
    });
  });
}

// 朗读单句（不同角色不同音色）
window.speakDialogue = function(sid) {
  var data = window._dialogueData && window._dialogueData[sid];
  if (!data) return;
  var text = data.text;
  var ch = CHARACTERS[data.speaker] || CHARACTERS['default'];
  if (!text) return;

  var el = document.getElementById(sid);
  if (el) {
    // 找到气泡div并高亮
    var bubble = el.querySelector('div[style] div[style]');
    if (!bubble) {
      var divs = el.querySelectorAll('div');
      for (var i = 0; i < divs.length; i++) {
        if (divs[i].textContent.indexOf(text) >= 0) {
          bubble = divs[i];
          break;
        }
      }
    }
    if (bubble) {
      bubble.style.transition = 'all 0.2s';
      bubble.style.boxShadow = '0 0 0 3px var(--primary), 0 4px 12px rgba(79,70,229,0.3)';
      bubble.style.transform = 'scale(1.03)';
      setTimeout(function() {
        bubble.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        bubble.style.transform = 'scale(1)';
      }, 800);
    }
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = ch.voice.rate;
    utter.pitch = ch.voice.pitch;
    window.speechSynthesis.speak(utter);
  }
};

// ==================== 词汇页 ====================
function renderVocab() {
  const tabs = document.querySelectorAll('#vocabTabs .tab');
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === state.vocabTab));

  const data = getSelectedData();
  const container = document.getElementById('vocabContent');

  if (state.vocabTab === 'words') {
    container.innerHTML = `
      <div style="text-align:center; margin-bottom:12px; font-size:13px; color:var(--text-light);">
        共 ${data.words.length} 个单词 · 点击翻转 | 🔊听发音 | 🎤跟读
      </div>
      <div class="word-list">
        ${data.words.map((w, i) => `
          <div class="word-item" onclick="flipWordCard(this)" data-en="${w.en}" data-zh="${w.zh}" data-type="${w.type}">
            <div style="flex:1;min-width:0;">
              <span class="word-en">${w.en}</span>
              ${w.phonetic ? `<span style="font-size:12px;color:var(--primary-light);font-weight:600;margin-left:6px;">${w.phonetic}</span>` : ''}
            </div>
            <div style="display:flex; align-items:center; gap:4px;flex-shrink:0;">
              <span class="word-zh" style="display:none;margin-right:4px;">${w.zh}</span>
              <span class="word-type">${w.type}</span>
              <span style="font-size:16px;cursor:pointer;" onclick="event.stopPropagation();speakWord('${w.en}')">🔊</span>
              <span style="font-size:16px;cursor:pointer;padding:2px;" onclick="event.stopPropagation();startSpeechRecognition('${w.en.replace(/'/g,"\\'")}')" title="跟读">🎤</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (state.vocabTab === 'phrases') {
    container.innerHTML = `
      <div style="text-align:center; margin-bottom:12px; font-size:13px; color:var(--text-light);">
        共 ${data.phrases.length} 个短语 · 🔊听发音 | 🎤跟读
      </div>
      <div class="word-list">
        ${data.phrases.map(p => `
          <div class="word-item">
            <span class="word-en">${p.en}</span>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <span class="word-zh">${p.zh}</span>
              <span style="font-size:16px;cursor:pointer;" onclick="event.stopPropagation();speakWord('${p.en.replace(/'/g,"\\'")}')">🔊</span>
              <span style="font-size:16px;cursor:pointer;padding:2px;" onclick="event.stopPropagation();startSpeechRecognition('${p.en.replace(/'/g,"\\'")}')" title="跟读">🎤</span>
            </div>
          </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (state.vocabTab === 'sentences') {
    container.innerHTML = `
      <div style="text-align:center; margin-bottom:12px; font-size:13px; color:var(--text-light);">
        共 ${data.sentences.length} 个句型 · 🔊听发音 | 🎤跟读
      </div>
      <div class="word-list">
        ${data.sentences.map(s => `
          <div class="word-item">
            <div style="flex:1;min-width:0;">
              <div class="word-en" style="font-size:15px;">${s.en}</div>
              <div class="word-zh" style="margin-top:4px;">${s.zh}</div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
              <span style="font-size:18px;cursor:pointer;" onclick="event.stopPropagation();speakWord('${s.en.replace(/'/g,"\\'")}')">🔊</span>
              <span style="font-size:18px;cursor:pointer;padding:2px;" onclick="event.stopPropagation();startSpeechRecognition('${s.en.replace(/'/g,"\\'")}')" title="跟读">🎤</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (state.vocabTab === 'grammar') {
    container.innerHTML = `
      <div style="text-align:center; margin-bottom:12px; font-size:13px; color:var(--text-light);">
        共 ${data.grammar.length} 个语法点
      </div>
      ${data.grammar.map(g => `
        <div class="grammar-card">
          <div class="grammar-title">📌 ${g.title}</div>
          <div class="grammar-content">${g.content}</div>
        </div>
      `).join('')}
    `;
  }
}

// Tab 切换
document.getElementById('vocabTabs').addEventListener('click', (e) => {
  if (e.target.classList.contains('tab')) {
    state.vocabTab = e.target.dataset.tab;
    renderVocab();
  }
});

// 翻转单词卡片
function flipWordCard(el) {
  const zh = el.querySelector('.word-zh');
  const isShowing = zh.style.display !== 'none';
  if (isShowing) {
    zh.style.display = 'none';
  } else {
    zh.style.display = 'inline';
    zh.classList.add('animate-star');
    // 记录已学
    state.stats.words++;
    saveState();
  }
}

// 发音 (使用 Web Speech API)
function speakWord(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

// ==================== 跟读功能（录音方案） ====================
let speechRecognitionActive = false;

function startSpeechRecognition(targetText) {
  if (speechRecognitionActive) {
    showToast('⏳ 请稍等，上次还没结束...');
    return;
  }

  // 1. 先播放标准发音
  speakWord(targetText);
  showToast('🔊 先听标准发音...', 2500);

  // 2. 判断有没有录音支持
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('⚠️ 浏览器不支持录音');
    return;
  }

  speechRecognitionActive = true;

  // 等发音听完（2秒）后录音
  setTimeout(function() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
      var mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      var mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      var chunks = [];

      mediaRecorder.ondataavailable = function(e) {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = function() {
        speechRecognitionActive = false;
        stream.getTracks().forEach(function(t) { t.stop(); });
        var blob = new Blob(chunks, { type: chunks.length ? chunks[0].type : 'audio/webm' });
        var url = URL.createObjectURL(blob);

        // 回放录音，同时弹窗自评
        var audio = new Audio(url);
        lastFollowAudio = audio;
        audio.play();
        showToast('🔊 播放你的录音...', 2000);

        setTimeout(function() {
          showFollowEval(targetText);
        }, 400);
      };

      mediaRecorder.onerror = function() {
        speechRecognitionActive = false;
        stream.getTracks().forEach(function(t) { t.stop(); });
        showToast('⚠️ 录音失败，请检查麦克风权限');
      };

      showToast('🎤 请大声跟读！', 2500);
      mediaRecorder.start();

      // 4秒后停止录音
      setTimeout(function() {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 4000);

    }).catch(function() {
      speechRecognitionActive = false;
      showToast('🔒 请允许麦克风权限（设置>Safari>麦克风）');
    });
  }, 2000);
}

function showFollowEval(targetText) {
  var oldDiv = document.getElementById('followEval');
  if (oldDiv) oldDiv.remove();

  // 模拟评分：根据单词长度和随机因子生成一个分数
  var targetWords = targetText.split(/\\s+/);
  var baseScore = 75 + Math.floor(Math.random() * 20); // 75~94分
  var score = Math.min(98, baseScore + targetWords.length);

  var stars = '';
  if (score >= 90) stars = '⭐⭐⭐⭐⭐';
  else if (score >= 80) stars = '⭐⭐⭐⭐';
  else if (score >= 70) stars = '⭐⭐⭐';
  else stars = '⭐⭐';

  var color = score >= 90 ? '#16A34A' : score >= 80 ? '#F59E0B' : '#EF4444';
  var emoji = score >= 90 ? '🏆' : score >= 80 ? '👍' : '💪';

  var div = document.createElement('div');
  div.id = 'followEval';
  div.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);z-index:1000;background:#fff;padding:20px 24px;border-radius:18px;box-shadow:0 6px 28px rgba(0,0,0,0.22);text-align:center;max-width:90vw;min-width:280px;animation:starPop 0.3s ease;';
  div.innerHTML = '<p style="margin:0 0 4px;font-size:14px;color:#666;">标准发音</p>'+
    '<p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#F59E0B;">'+targetText+'</p>'+
    '<div style="font-size:48px;margin:8px 0;">'+emoji+'</div>'+
    '<p style="margin:0;font-size:32px;font-weight:800;color:'+color+';">'+score+'<span style="font-size:16px;">分</span></p>'+
    '<p style="margin:4px 0 12px;font-size:14px;">'+stars+'</p>'+
    '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">'+
    '<button class="btn btn-primary btn-sm" onclick="followSelfEval(true,'+targetWords.length+','+score+')">✅ 领取阳光</button>'+
    '<button class="btn btn-outline btn-sm" onclick="followSelfEval(false,0,0)">🔄 再试一次</button>'+
    '<button class="btn btn-outline btn-sm" onclick="replayFollowAudio()">🔊 再听一遍</button>'+
    '</div>';
  document.body.appendChild(div);
}

var lastFollowAudio = null;
window.replayFollowAudio = function() {
  if (lastFollowAudio) {
    lastFollowAudio.currentTime = 0;
    lastFollowAudio.play();
  }
};

window.followSelfEval = function(ok, wordCount, score) {
  var div = document.getElementById('followEval');
  if (div) div.remove();
  if (ok) {
    // 80分以上给阳光，90分以上更多
    var bonus = 0;
    if (score >= 90) bonus = 5;
    else if (score >= 80) bonus = 3;
    else bonus = 2;
    state.totalSunlight += bonus;
    saveState();
    document.getElementById('totalStars').textContent = state.totalSunlight;
    var ss = document.getElementById('statStars');
    if (ss) ss.textContent = '☀️ ' + state.totalSunlight;
    showToast('✅ 跟读成功！'+score+'分 +'+bonus+'☀️', 3000);
  } else {
    showToast('💪 继续加油！先点🔊多听几遍', 2000);
  }
};

// Toast 提示
function showToast(msg, duration) {
  duration = duration || 2000;
  // 移除旧 toast
  const old = document.getElementById('speechToast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'speechToast';
  toast.style.cssText = `
    position:fixed;bottom:100px;left:50%;transform:translateX(-50%);z-index:999;
    background:rgba(30,41,59,0.95);color:#fff;padding:12px 24px;
    border-radius:24px;font-size:14px;font-weight:600;text-align:center;
    max-width:90vw;box-shadow:0 4px 20px rgba(0,0,0,0.3);
    animation:starPop 0.3s ease;
    pointer-events:none;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ==================== 练习页 ====================
function generateExerciseQuestions() {
  const data = getSelectedData();
  const questions = [];

  // 题型1: 看英文选中文 (单词) - 6题
  const shuffledWords1 = [...data.words].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(6, shuffledWords1.length); i++) {
    const w = shuffledWords1[i];
    const wrongs = data.words.filter(x => x.en !== w.en).sort(() => Math.random() - 0.5).slice(0, 3);
    questions.push({
      type: 'word-en2zh', icon: '📖',
      question: `"${w.en}" 的中文意思是？`,
      answer: w.zh, options: [...wrongs.map(x=>x.zh), w.zh].sort(()=>Math.random()-0.5), word: w
    });
  }

  // 题型2: 看中文选英文 - 5题
  const shuffledWords2 = [...data.words].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(5, shuffledWords2.length); i++) {
    const w = shuffledWords2[i];
    const wrongs = data.words.filter(x => x.zh !== w.zh).sort(() => Math.random() - 0.5).slice(0, 3);
    questions.push({
      type: 'word-zh2en', icon: '✏️',
      question: `"${w.zh}" 的英文是？`,
      answer: w.en, options: [...wrongs.map(x=>x.en), w.en].sort(()=>Math.random()-0.5), word: w
    });
  }

  // 题型3: 短语配对 - 5题
  if (data.phrases.length >= 4) {
    const sp = [...data.phrases].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(5, sp.length); i++) {
      const p = sp[i];
      const wrongs = data.phrases.filter(x => x.en !== p.en).sort(() => Math.random() - 0.5).slice(0, 3);
      questions.push({
        type: 'phrase', icon: '📎',
        question: `短语 "${p.en}" 的意思是？`,
        answer: p.zh, options: [...wrongs.map(x=>x.zh), p.zh].sort(()=>Math.random()-0.5)
      });
    }
  }

  // 题型4: 句子填空 - 4题
  if (data.sentences.length >= 3) {
    const ss = [...data.sentences].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(4, ss.length); i++) {
      const s = ss[i];
      const words = s.en.split(' ');
      if (words.length >= 3) {
        const bi = Math.floor(Math.random() * words.length);
        const bw = words[bi];
        const otherWords = data.words.map(w => w.en).filter(w => w !== bw).sort(() => Math.random() - 0.5).slice(0, 3);
        words[bi] = '______';
        questions.push({
          type: 'fill', icon: '📝',
          question: `补全句子：${words.join(' ')}<br><small style="color:var(--text-light);">${s.zh}</small>`,
          answer: bw, options: [...otherWords, bw].sort(()=>Math.random()-0.5)
        });
      }
    }
  }

  // 题型5: 听音选词 - 4题 (看单词选发音)
  const sw3 = [...data.words].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(4, sw3.length); i++) {
    const w = sw3[i];
    const wrongs = data.words.filter(x => x.en !== w.en).sort(() => Math.random() - 0.5).slice(0, 3);
    questions.push({
      type: 'listen', icon: '🔊',
      question: `点击 🔊 听发音，选择对应的中文：<br><button class="btn btn-accent btn-sm" style="margin-top:8px" onclick="speakWord('${w.en.replace(/'/g,"\\'")}')">🔊 播放</button>`,
      answer: w.zh, options: [...wrongs.map(x=>x.zh), w.zh].sort(()=>Math.random()-0.5), word: w
    });
  }

  // 题型6: 拼写填空（看中文填英文首字母提示）- 4题
  const sw4 = [...data.words].filter(w => w.en.length >= 3).sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(4, sw4.length); i++) {
    const w = sw4[i];
    const hint = w.en[0] + '_'.repeat(w.en.length - 1);
    const wrongs = data.words.filter(x => x.en !== w.en && x.en[0] === w.en[0]).sort(() => Math.random() - 0.5).slice(0, 2);
    const otherWrongs = data.words.filter(x => x.en !== w.en && x.en[0] !== w.en[0]).sort(() => Math.random() - 0.5).slice(0, 1);
    questions.push({
      type: 'spell', icon: '🔤',
      question: `"${w.zh}" 的正确拼写是？<br><small style="color:var(--text-light);">提示：${hint}</small>`,
      answer: w.en, options: [...wrongs.map(x=>x.en), ...otherWrongs.map(x=>x.en), w.en].sort(()=>Math.random()-0.5), word: w
    });
  }

  // 题型7: 语法选择 - 4题
  const grammarData = data.grammar;
  if (grammarData.length >= 2) {
    // 基于语法点生成简单选择题
    const grammarQs = [
      { q: 'He ___ a doctor.', a: 'is', opts: ['is','am','are','be'], zh: '他是一名医生。' },
      { q: 'She ___ long hair.', a: 'has', opts: ['has','have','is','are'], zh: '她有长头发。' },
      { q: 'There ___ a book on the desk.', a: 'is', opts: ['is','are','am','be'], zh: '桌上有一本书。' },
      { q: '___ you like apples?', a: 'Do', opts: ['Do','Does','Is','Are'], zh: '你喜欢苹果吗？' },
      { q: 'I can ___ a kite.', a: 'fly', opts: ['fly','flies','flying','flew'], zh: '我会放风筝。' },
      { q: 'What ___ she do?', a: 'does', opts: ['does','do','is','are'], zh: '她是做什么的？' },
    ];
    const picked = grammarQs.sort(() => Math.random() - 0.5).slice(0, 4);
    picked.forEach(g => {
      questions.push({
        type: 'grammar', icon: '📐',
        question: `${g.q}<br><small style="color:var(--text-light);">${g.zh}</small>`,
        answer: g.a, options: g.opts.sort(()=>Math.random()-0.5)
      });
    });
  }

  // 题型8: 句子排序 - 3题（给打乱的词排序）
  if (data.sentences.length >= 3) {
    const ss2 = [...data.sentences].sort(() => Math.random() - 0.5).slice(0, 3);
    ss2.forEach(s => {
      const words = s.en.split(' ');
      if (words.length >= 3 && words.length <= 8) {
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        questions.push({
          type: 'order', icon: '🔀',
          question: `请排列正确的句子：<br><small style="color:var(--text-light);">${s.zh}</small>`,
          answer: words.join(' '),
          options: shuffled,
          fullAnswer: words
        });
      }
    });
  }

  return questions.sort(() => Math.random() - 0.5);
}

function renderExercise() {
  state.exerciseQuestions = generateExerciseQuestions();
  state.exerciseIndex = 0;
  state.exerciseScore = 0;
  updateExerciseUI();
  showExerciseQuestion();
}

function updateExerciseUI() {
  document.getElementById('exScore').textContent = state.exerciseScore;
  document.getElementById('exTotal').textContent = state.exerciseQuestions.length;
  const progress = state.exerciseQuestions.length > 0
    ? Math.round(state.exerciseIndex / state.exerciseQuestions.length * 100)
    : 0;
  document.getElementById('exProgress').style.width = progress + '%';
}

function showExerciseQuestion() {
  if (state.exerciseIndex >= state.exerciseQuestions.length) {
    showExerciseResult();
    return;
  }
  window._exerciseAnswered = false; // 重置答题状态
  updateExerciseUI();
  const q = state.exerciseQuestions[state.exerciseIndex];

  let typeLabel = q.icon + ' ';
  if (q.type === 'word-en2zh' || q.type === 'word-zh2en') typeLabel += '单词';
  else if (q.type === 'phrase') typeLabel += '短语';
  else if (q.type === 'fill') typeLabel += '填空';
  else if (q.type === 'listen') typeLabel += '听音';
  else if (q.type === 'spell') typeLabel += '拼写';
  else if (q.type === 'grammar') typeLabel += '语法';
  else if (q.type === 'order') typeLabel += '排序';

  document.getElementById('exQuestion').innerHTML = `
    <div style="font-size:12px; color:var(--text-light); margin-bottom:8px;">
      第 ${state.exerciseIndex + 1} / ${state.exerciseQuestions.length} 题 · ${typeLabel}
    </div>
    ${q.question}
  `;
  document.getElementById('exFeedback').textContent = '';
  document.getElementById('exNextBtn').style.display = 'none';

  const optionsEl = document.getElementById('exOptions');

  if (q.type === 'order') {
    // 句子排序特殊渲染
    optionsEl.innerHTML = '';
    // 显示排序区域
    const sortArea = document.createElement('div');
    sortArea.className = 'sort-answer';
    sortArea.id = 'sortAnswerArea';
    sortArea.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;min-height:40px;padding:8px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:12px;border:2px dashed var(--border);';

    const wordArea = document.createElement('div');
    wordArea.className = 'sort-words';
    wordArea.id = 'sortWordArea';
    wordArea.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;';

    let placedWords = [];
    let remainingWords = [...q.options];

    function renderSort() {
      sortArea.innerHTML = placedWords.map((w,i) =>
        `<div class="sort-word" style="background:var(--primary-light);color:#fff;cursor:pointer;" onclick="sortRemove(${i})">${w}</div>`
      ).join('');
      wordArea.innerHTML = remainingWords.map((w,i) =>
        `<div class="sort-word" onclick="sortAdd(${i})">${w}</div>`
      ).join('');
      // 检查答案
      if (placedWords.length === q.fullAnswer.length) {
        const userSentence = placedWords.join(' ');
        if (userSentence === q.answer) {
          // 正确
          answerExerciseDirect(true, q);
        } else {
          // 错误
          answerExerciseDirect(false, q);
        }
      }
    }

    window.sortAdd = function(i) {
      placedWords.push(remainingWords[i]);
      remainingWords.splice(i, 1);
      renderSort();
    };
    window.sortRemove = function(i) {
      remainingWords.push(placedWords[i]);
      placedWords.splice(i, 1);
      renderSort();
    };

    optionsEl.parentNode.insertBefore(sortArea, optionsEl);
    optionsEl.parentNode.insertBefore(wordArea, optionsEl);
    renderSort();
  } else {
    // 标准选择题渲染
    // 清理排序区域
    const oldSort = document.getElementById('sortAnswerArea');
    const oldWord = document.getElementById('sortWordArea');
    if (oldSort) oldSort.remove();
    if (oldWord) oldWord.remove();

    optionsEl.innerHTML = q.options.map(o => `
      <div class="exercise-option" onclick="answerExercise(this, '${o.replace(/'/g, "\\'")}')">${o}</div>
    `).join('');
  }
}

// 直接给排序题打分
function answerExerciseDirect(correct, q) {
  if (window._exerciseAnswered) return;
  window._exerciseAnswered = true;

  if (correct) {
    state.exerciseScore++;
    state.stats.correct++;
    state.totalSunlight++;
    document.getElementById('exFeedback').innerHTML = '✅ 太棒了！+1☀️';
    document.getElementById('exFeedback').style.color = 'var(--success)';
    if (q.word) speakWord(q.word.en);
  } else {
    document.getElementById('exFeedback').innerHTML = `❌ 正确答案是：${q.answer}`;
    document.getElementById('exFeedback').style.color = 'var(--danger)';
  }

  updateExerciseUI();
  document.getElementById('exNextBtn').style.display = 'flex';
  saveState();
}

function answerExercise(el, chosen) {
  if (el.classList.contains('correct') || el.classList.contains('wrong')) return;
  document.querySelectorAll('#exOptions .exercise-option').forEach(o => o.classList.add('disabled'));

  const q = state.exerciseQuestions[state.exerciseIndex];
  const isCorrect = chosen === q.answer;

  if (isCorrect) {
    el.classList.add('correct');
    state.exerciseScore++;
    state.stats.correct++;
    state.totalSunlight++;
    document.getElementById('exFeedback').innerHTML = '✅ 太棒了！+1☀️';
    document.getElementById('exFeedback').style.color = 'var(--success)';
    if (q.word) speakWord(q.word.en);
    saveState();
  } else {
    el.classList.add('wrong');
    document.getElementById('exFeedback').innerHTML = `❌ 正确答案是：${q.answer}`;
    document.getElementById('exFeedback').style.color = 'var(--danger)';
    document.querySelectorAll('#exOptions .exercise-option').forEach(o => {
      if (o.textContent.trim() === q.answer) o.classList.add('correct');
    });
  }

  updateExerciseUI();
  document.getElementById('exNextBtn').style.display = 'flex';
}

function nextExercise() {
  state.exerciseIndex++;
  showExerciseQuestion();
}

function resetExercise() {
  state.exerciseQuestions = generateExerciseQuestions();
  state.exerciseIndex = 0;
  state.exerciseScore = 0;
  updateExerciseUI();
  showExerciseQuestion();
}

function showExerciseResult() {
  const total = state.exerciseQuestions.length;
  const score = state.exerciseScore;
  const pct = Math.round(score / total * 100);
  let emoji = '🌟';
  if (pct >= 90) emoji = '🏆';
  else if (pct >= 70) emoji = '👍';
  else if (pct >= 50) emoji = '💪';

  // 奖励阳光
  const bonusSun = pct >= 90 ? 10 : pct >= 70 ? 5 : pct >= 50 ? 2 : 0;
  state.totalSunlight += bonusSun;
  saveState();
  document.getElementById('totalStars').textContent = state.totalSunlight;
  document.getElementById('statStars').textContent = '☀️ ' + state.totalSunlight;

  document.getElementById('exQuestion').innerHTML = `
    <div style="font-size:40px; margin-bottom:8px;">${emoji}</div>
    <div style="font-size:20px; font-weight:800;">练习完成！</div>
    <div style="margin-top:8px;">得分：${score} / ${total}</div>
    <div style="font-size:14px; color:var(--text-light); margin-top:4px;">正确率 ${pct}%</div>
    <div style="margin-top:8px; font-size:18px; color:var(--accent);">+${bonusSun} ☀️ 阳光奖励</div>
  `;
  document.getElementById('exOptions').innerHTML = '';
  document.getElementById('exFeedback').textContent = '';
  document.getElementById('exNextBtn').style.display = 'none';
  document.getElementById('exProgress').style.width = '100%';
  document.getElementById('exScore').textContent = score;

  // 清理排序区
  const oldSort = document.getElementById('sortAnswerArea');
  const oldWord = document.getElementById('sortWordArea');
  if (oldSort) oldSort.remove();
  if (oldWord) oldWord.remove();
}

// ==================== 游戏页 ====================
const GAMES = [
  { id: 'pvz', name: '植物大战僵尸', icon: '🧟', desc: '用阳光种植物，打败英语僵尸！', color: '#22C55E', hot: true },
  { id: 'whack', name: '打地鼠', icon: '🔨', desc: '地鼠冒出来，敲对中文就得分！', color: '#F97316', hot: true },
  { id: 'bubble', name: '泡泡龙', icon: '🫧', desc: '点破正确的英语泡泡', color: '#3B82F6', hot: true },
  { id: 'goose', name: '抓大鹅', icon: '🦢', desc: '点击飞过的正确单词', color: '#10B981' },
  { id: 'match', name: '消消乐', icon: '💥', desc: '中英文配对消除', color: '#F59E0B' },
  { id: 'memory', name: '记忆翻牌', icon: '🃏', desc: '翻牌找配对', color: '#8B5CF6' },
  { id: 'quiz', name: '闪电答题', icon: '⚡', desc: '限时选择正确答案', color: '#EF4444' },
  { id: 'snake', name: '单词贪吃蛇', icon: '🐍', desc: '吃正确字母拼单词', color: '#06B6D4' },
  { id: 'shoot', name: '填空射击', icon: '🎯', desc: '选词填入句子', color: '#F97316' }
];

function renderGame() {
  document.getElementById('gameGrid').innerHTML = GAMES.map(g => {
    var hotTag = g.hot ? '<span style="display:inline-block;background:#EF4444;color:#fff;font-size:9px;padding:1px 6px;border-radius:8px;margin-left:4px;vertical-align:middle;">热门</span>' : '';
    return '<div class="game-card" onclick="startGame(\'' + g.id + '\')" style="border-top:3px solid ' + g.color + ';">' +
      '<div class="game-icon">' + g.icon + '</div>' +
      '<div class="game-name">' + g.name + hotTag + '</div>' +
      '<div class="game-desc">' + g.desc + '</div>' +
      '</div>';
  }).join('');
}

// ==================== 游戏：抓大鹅 ====================
function startGame(gameId) {
  const data = getSelectedData();
  if (data.words.length < 3) {
    alert('请至少选择一个单元来玩游戏！');
    return;
  }

  switch(gameId) {
    case 'pvz': gamePvz(data); break;
    case 'whack': gameWhack(data); break;
    case 'bubble': gameBubble(data); break;
    case 'goose': gameGoose(data); break;
    case 'match': gameMatch(data); break;
    case 'memory': gameMemory(data); break;
    case 'quiz': gameQuiz(data); break;
    case 'snake': gameSnake(data); break;
    case 'shoot': gameShoot(data); break;
  }
}

// ---- 抓大鹅 ----
function gameGoose(data) {
  const words = [...data.words].sort(() => Math.random() - 0.5).slice(0, 10);
  let score = 0, total = words.length;
  let currentWordIdx = 0;
  let geeseActive = [];

  const modal = showModal(`
    <h2>🦢 抓大鹅</h2>
    <div style="text-align:center; margin-bottom:8px; font-size:14px;">
      目标：<strong id="gooseTarget" style="color:var(--primary); font-size:18px;"></strong>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
      <span>得分：<strong id="gooseScore">0</strong> / ${total}</span>
      <span id="gooseTimer" style="color:var(--danger);">⏱ 30s</span>
    </div>
    <div class="game-area" id="gooseArea" style="height:320px; overflow:hidden;"></div>
    <button class="btn btn-outline btn-block btn-sm" style="margin-top:8px" onclick="closeModal()">退出</button>
  `);

  let timer = 30;
  const timerInterval = setInterval(() => {
    timer--;
    const timerEl = document.getElementById('gooseTimer');
    if (timerEl) timerEl.textContent = `⏱ ${timer}s`;
    if (timer <= 0) {
      clearInterval(timerInterval);
      endGooseGame(score, total);
    }
  }, 1000);

  function spawnGeese() {
    const area = document.getElementById('gooseArea');
    if (!area) { clearInterval(timerInterval); return; }

    // 清除飞出去的鹅
    document.querySelectorAll('.goose-item').forEach(g => g.remove());

    if (currentWordIdx >= words.length) {
      clearInterval(timerInterval);
      setTimeout(() => endGooseGame(score, total), 1500);
      return;
    }

    const target = words[currentWordIdx];
    document.getElementById('gooseTarget').textContent = target.zh;

    // 生成3-4只鹅，其中一只是正确答案
    const count = 3 + Math.floor(Math.random() * 2);
    const correctPos = Math.floor(Math.random() * count);

    for (let i = 0; i < count; i++) {
      const isCorrect = i === correctPos;
      const word = isCorrect ? target : words.filter(w => w.en !== target.en).sort(() => Math.random() - 0.5)[0];
      const goose = document.createElement('div');
      goose.className = 'goose-item';
      goose.style.setProperty('--y', (20 + Math.random() * 60) + '%');
      goose.style.top = (15 + i * 22) + '%';
      goose.style.animationDuration = (4 + Math.random() * 3) + 's';
      goose.textContent = word.en;
      goose.title = isCorrect ? '✓' : '✗';
      goose.dataset.correct = isCorrect;

      goose.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isCorrect) {
          score++;
          document.getElementById('gooseScore').textContent = score;
          currentWordIdx++;
          speakWord(target.en);
          // 显示反馈
          const fb = document.createElement('div');
          fb.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:40px;z-index:10;pointer-events:none;animation:starPop 0.5s ease;';
          fb.textContent = '✅';
          area.appendChild(fb);
          setTimeout(() => fb.remove(), 600);

          setTimeout(spawnGeese, 800);
        } else {
          // 错误反馈
          goose.style.color = 'red';
          setTimeout(() => { goose.style.color = ''; }, 300);
        }
      });

      area.appendChild(goose);
    }
  }

  spawnGeese();
}

function endGooseGame(score, total) {
  const bonus = score >= total * 0.8 ? 3 : score >= total * 0.5 ? 1 : 0;
  state.totalSunlight += bonus;
  saveState();
  document.getElementById("totalStars").textContent = state.totalSunlight;

  document.querySelector('#modalContent').innerHTML = `
    <h2>🦢 游戏结束</h2>
    <div style="text-align:center; font-size:48px; margin:16px 0;">${score >= total * 0.8 ? '🏆' : '👍'}</div>
    <div style="text-align:center; font-size:18px; font-weight:700;">抓到 ${score} / ${total} 只大鹅</div>
    <div style="text-align:center; color:var(--accent); margin:8px 0;">奖励 ⭐ x ${bonus}</div>
    <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="closeModal()">再来一次</button>
  `;
}

// ---- 消消乐 ----
function gameMatch(data) {
  const pairs = [...data.words].sort(() => Math.random() - 0.5).slice(0, 6);
  const cards = [];
  pairs.forEach(p => {
    cards.push({ id: p.en + '_en', text: p.en, type: 'en', pair: p.en });
    cards.push({ id: p.en + '_zh', text: p.zh, type: 'zh', pair: p.en });
  });
  cards.sort(() => Math.random() - 0.5);

  let selected = null;
  let matched = new Set();
  let score = 0;
  const total = pairs.length;

  const modal = showModal(`
    <h2>💥 单词消消乐</h2>
    <div style="text-align:center; margin-bottom:8px;">配对：<strong id="matchScore">0</strong> / ${total}</div>
    <div class="match-grid" id="matchGrid"></div>
    <button class="btn btn-outline btn-block btn-sm" style="margin-top:12px" onclick="closeModal()">退出</button>
  `);

  function renderMatchGrid() {
    const grid = document.getElementById('matchGrid');
    if (!grid) return;
    grid.innerHTML = cards.map(c => `
      <div class="match-card ${selected && selected.id === c.id ? 'selected' : ''} ${matched.has(c.pair) ? 'matched' : ''}"
           onclick="matchCardClick('${c.id}')"
           style="color:${c.type === 'en' ? 'var(--primary)' : 'var(--text)'}; font-size:${c.type === 'en' ? '15px' : '13px'};">
        ${c.text}
      </div>
    `).join('');
  }

  window.matchCardClick = function(id) {
    const card = cards.find(c => c.id === id);
    if (!card || matched.has(card.pair)) return;

    if (!selected) {
      selected = card;
      renderMatchGrid();
    } else if (selected.id === card.id) {
      selected = null;
      renderMatchGrid();
    } else if (selected.pair === card.pair && selected.type !== card.type) {
      // 配对成功
      matched.add(card.pair);
      score++;
      document.getElementById('matchScore').textContent = score;
      selected = null;
      renderMatchGrid();
      if (score >= total) {
        setTimeout(() => endMatchGame(score, total), 500);
      }
    } else {
      // 配对失败
      selected = card;
      renderMatchGrid();
    }
  };

  renderMatchGrid();
}

function endMatchGame(score, total) {
  const bonus = score >= total * 0.8 ? 3 : 1;
  state.totalSunlight += bonus;
  saveState();
  document.getElementById("totalStars").textContent = state.totalSunlight;

  document.querySelector('#modalContent').innerHTML = `
    <h2>💥 消消乐完成！</h2>
    <div style="text-align:center; font-size:48px; margin:16px 0;">🏆</div>
    <div style="text-align:center; font-size:18px;">全部配对成功！</div>
    <div style="text-align:center; color:var(--accent); margin:8px 0;">奖励 ⭐ x ${bonus}</div>
    <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="closeModal()">再来一次</button>
  `;
}

// ---- 记忆翻牌 ----
function gameMemory(data) {
  const pairs = [...data.words].sort(() => Math.random() - 0.5).slice(0, 6);
  const cards = [];
  pairs.forEach(p => {
    cards.push({ id: p.en + '_en', text: p.en, type: 'en', pair: p.en });
    cards.push({ id: p.en + '_zh', text: p.zh, type: 'zh', pair: p.en });
  });
  cards.sort(() => Math.random() - 0.5);

  let flippedCards = [];
  let matchedPairs = new Set();
  let score = 0;
  let locked = false;
  const total = pairs.length;

  const modal = showModal(`
    <h2>🃏 记忆翻牌</h2>
    <div style="text-align:center; margin-bottom:8px;">配对：<strong id="memScore">0</strong> / ${total}</div>
    <div class="memory-grid" id="memoryGrid"></div>
    <button class="btn btn-outline btn-block btn-sm" style="margin-top:12px" onclick="closeModal()">退出</button>
  `);

  function renderMemoryGrid() {
    const grid = document.getElementById('memoryGrid');
    if (!grid) return;
    grid.innerHTML = cards.map(c => `
      <div class="memory-card ${flippedCards.some(f => f.id === c.id) || matchedPairs.has(c.pair) ? 'flipped' : ''} ${matchedPairs.has(c.pair) ? 'matched' : ''}"
           onclick="flipMemoryCard('${c.id}')">
        <div class="memory-card-inner">
          <div class="memory-card-front">❓</div>
          <div class="memory-card-back" style="font-size:${c.type === 'en' ? '14px' : '12px'};">${c.text}</div>
        </div>
      </div>
    `).join('');
  }

  window.flipMemoryCard = function(id) {
    if (locked) return;
    const card = cards.find(c => c.id === id);
    if (!card || matchedPairs.has(card.pair) || flippedCards.some(f => f.id === id)) return;

    flippedCards.push(card);
    renderMemoryGrid();

    if (flippedCards.length === 2) {
      locked = true;
      const [a, b] = flippedCards;
      if (a.pair === b.pair && a.type !== b.type) {
        // 匹配成功
        matchedPairs.add(a.pair);
        score++;
        document.getElementById('memScore').textContent = score;
        flippedCards = [];
        locked = false;
        renderMemoryGrid();
        if (score >= total) {
          setTimeout(() => endMemoryGame(score, total), 600);
        }
      } else {
        // 不匹配
        setTimeout(() => {
          flippedCards = [];
          locked = false;
          renderMemoryGrid();
        }, 800);
      }
    }
  };

  renderMemoryGrid();
}

function endMemoryGame(score, total) {
  const bonus = score >= total * 0.8 ? 3 : 1;
  state.totalSunlight += bonus;
  saveState();
  document.getElementById("totalStars").textContent = state.totalSunlight;
  document.querySelector('#modalContent').innerHTML = `
    <h2>🃏 全部找到！</h2>
    <div style="text-align:center; font-size:48px; margin:16px 0;">🧠</div>
    <div style="text-align:center; font-size:18px;">记忆力真好！</div>
    <div style="text-align:center; color:var(--accent); margin:8px 0;">奖励 ⭐ x ${bonus}</div>
    <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="closeModal()">再来一次</button>
  `;
}

// ---- 闪电答题 ----
function gameQuiz(data) {
  const words = [...data.words].sort(() => Math.random() - 0.5).slice(0, 12);
  let idx = 0, score = 0;
  let timeLeft = 5;
  let timerInterval;
  const total = words.length;

  const modal = showModal(`
    <h2>⚡ 闪电答题</h2>
    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
      <span>得分：<strong id="quizScore">0</strong> / ${total}</span>
      <span style="color:var(--danger);">⏱ <strong id="quizTimer">5</strong>s</span>
    </div>
    <div class="quiz-timer"><div class="quiz-timer-bar" id="quizTimerBar"></div></div>
    <div class="quiz-word" id="quizWord"></div>
    <div class="quiz-options" id="quizOptions"></div>
    <button class="btn btn-outline btn-block btn-sm" style="margin-top:12px" onclick="clearInterval(timerInterval);closeModal();">退出</button>
  `);

  function showQuizQuestion() {
    if (idx >= total) {
      clearInterval(timerInterval);
      endQuizGame(score, total);
      return;
    }
    timeLeft = 5;
    updateTimer();

    const word = words[idx];
    document.getElementById('quizWord').textContent = word.en;
    document.getElementById('quizTimer').textContent = timeLeft;
    document.getElementById('quizTimerBar').style.width = '100%';

    // 选项：随机3个错误 + 1个正确
    const wrongs = words.filter(w => w.en !== word.en).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...wrongs.map(w => w.zh), word.zh].sort(() => Math.random() - 0.5);

    const optEl = document.getElementById('quizOptions');
    optEl.innerHTML = options.map(o => `
      <div class="exercise-option" onclick="quizAnswer(this, '${o.replace(/'/g, "\\'")}', '${word.zh.replace(/'/g, "\\'")}')">${o}</div>
    `).join('');
  }

  function updateTimer() {
    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      const pct = Math.max(0, timeLeft / 5 * 100);
      const bar = document.getElementById('quizTimerBar');
      const timerEl = document.getElementById('quizTimer');
      if (bar) bar.style.width = pct + '%';
      if (timerEl) timerEl.textContent = Math.ceil(Math.max(0, timeLeft));
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        idx++;
        showQuizQuestion();
      }
    }, 100);
  }

  window.quizAnswer = function(el, chosen, answer) {
    clearInterval(timerInterval);
    document.querySelectorAll('#quizOptions .exercise-option').forEach(o => o.classList.add('disabled'));

    if (chosen === answer) {
      el.classList.add('correct');
      score++;
      document.getElementById('quizScore').textContent = score;
      speakWord(words[idx].en);
    } else {
      el.classList.add('wrong');
      document.querySelectorAll('#quizOptions .exercise-option').forEach(o => {
        if (o.textContent.trim() === answer) o.classList.add('correct');
      });
    }
    idx++;
    setTimeout(showQuizQuestion, 1000);
  };

  showQuizQuestion();
}

function endQuizGame(score, total) {
  const bonus = score >= total * 0.8 ? 3 : score >= total * 0.5 ? 1 : 0;
  state.totalSunlight += bonus;
  saveState();
  document.getElementById("totalStars").textContent = state.totalSunlight;
  document.querySelector('#modalContent').innerHTML = `
    <h2>⚡ 答题结束</h2>
    <div style="text-align:center; font-size:48px; margin:16px 0;">⚡</div>
    <div style="text-align:center; font-size:18px;">正确 ${score} / ${total}</div>
    <div style="text-align:center; color:var(--accent); margin:8px 0;">奖励 ⭐ x ${bonus}</div>
    <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="closeModal()">再来一次</button>
  `;
}

// ---- 单词贪吃蛇 ----
function gameSnake(data) {
  const word = data.words[Math.floor(Math.random() * data.words.length)];
  const letters = word.en.toLowerCase().split('');

  let snakePos = { x: 10, y: 10 };
  let snakeBody = [{ x: 10, y: 10 }];
  let direction = { x: 1, y: 0 };
  let targetIdx = 0;
  let score = 0;
  const gridSize = 20;
  const totalLetters = letters.length;

  // 放置字母
  const items = [];
  const placed = new Set();
  for (let i = 0; i < letters.length; i++) {
    let px, py, key;
    do {
      px = Math.floor(Math.random() * (gridSize - 2)) + 1;
      py = Math.floor(Math.random() * (gridSize - 2)) + 1;
      key = px + ',' + py;
    } while (placed.has(key) || (px === 10 && py === 10));
    placed.add(key);
    items.push({ x: px, y: py, letter: letters[i], collected: false });
  }

  const modal = showModal(`
    <h2>🐍 单词贪吃蛇</h2>
    <div style="text-align:center; margin-bottom:4px; font-size:13px; color:var(--text-light);">
      目标单词：<strong style="color:var(--primary);">${word.en}</strong> (${word.zh})
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
      <span>字母：<strong id="snakeLetters"></strong></span>
      <span>得分：<strong id="snakeScore">0</strong> / ${totalLetters}</span>
    </div>
    <canvas id="snakeCanvas" width="320" height="320" style="display:block; margin:0 auto; border:2px solid var(--border); border-radius:8px; background:var(--bg);"></canvas>
    <div style="text-align:center; margin-top:8px; display:flex; gap:4px; justify-content:center;">
      <button class="btn btn-sm btn-outline" id="snakeUp">⬆</button>
    </div>
    <div style="text-align:center; display:flex; gap:4px; justify-content:center; margin-top:4px;">
      <button class="btn btn-sm btn-outline" id="snakeLeft">⬅</button>
      <button class="btn btn-sm btn-outline" id="snakeDown">⬇</button>
      <button class="btn btn-sm btn-outline" id="snakeRight">➡</button>
    </div>
    <button class="btn btn-outline btn-block btn-sm" style="margin-top:8px" onclick="closeModal()">退出</button>
  `);

  const canvas = document.getElementById('snakeCanvas');
  const ctx = canvas.getContext('2d');
  const cellSize = 16;

  function draw() {
    ctx.clearRect(0, 0, 320, 320);

    // 画未收集的字母
    items.forEach(item => {
      if (!item.collected) {
        ctx.fillStyle = '#FDE68A';
        ctx.fillRect(item.x * cellSize + 1, item.y * cellSize + 1, cellSize - 2, cellSize - 2);
        ctx.fillStyle = '#92400E';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.letter.toUpperCase(), item.x * cellSize + cellSize / 2, item.y * cellSize + cellSize / 2 + 4);
      }
    });

    // 画蛇
    snakeBody.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#4F46E5' : '#818CF8';
      ctx.fillRect(seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2);
    });

    // 画目标字母
    ctx.fillStyle = 'var(--text)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('目标：' + letters[targetIdx]?.toUpperCase() || '✓', 4, 312);
  }

  function move() {
    const head = snakeBody[0];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };

    // 边界检测
    if (newHead.x < 0 || newHead.x >= gridSize || newHead.y < 0 || newHead.y >= gridSize) {
      endSnakeGame(score, totalLetters);
      return;
    }

    // 自碰检测
    if (snakeBody.some(s => s.x === newHead.x && s.y === newHead.y)) {
      endSnakeGame(score, totalLetters);
      return;
    }

    snakeBody.unshift(newHead);

    // 检查是否吃到字母
    const item = items.find(i => i.x === newHead.x && i.y === newHead.y && !i.collected);
    if (item && item.letter === letters[targetIdx]) {
      item.collected = true;
      score++;
      targetIdx++;
      document.getElementById('snakeScore').textContent = score;
      updateLetterDisplay();
      speakWord(item.letter);
      if (targetIdx >= totalLetters) {
        endSnakeGame(score, totalLetters);
        return;
      }
      // 蛇变长 (不pop)
    } else {
      snakeBody.pop();
    }

    draw();
  }

  function updateLetterDisplay() {
    const display = letters.map((l, i) =>
      i < targetIdx ? `<span style="color:var(--success);">${l.toUpperCase()}</span>` :
      i === targetIdx ? `<span style="color:var(--danger);font-size:16px;">${l.toUpperCase()}</span>` :
      l.toUpperCase()
    ).join(' ');
    document.getElementById('snakeLetters').innerHTML = display;
  }

  updateLetterDisplay();
  draw();

  const gameLoop = setInterval(move, 250);

  // 按钮控制
  document.getElementById('snakeUp').onclick = () => { if (direction.y !== 1) { direction = { x: 0, y: -1 }; } };
  document.getElementById('snakeDown').onclick = () => { if (direction.y !== -1) { direction = { x: 0, y: 1 }; } };
  document.getElementById('snakeLeft').onclick = () => { if (direction.x !== 1) { direction = { x: -1, y: 0 }; } };
  document.getElementById('snakeRight').onclick = () => { if (direction.x !== -1) { direction = { x: 1, y: 0 }; } };

  // 键盘控制
  document.addEventListener('keydown', snakeKeyHandler);
  function snakeKeyHandler(e) {
    if (e.key === 'ArrowUp' && direction.y !== 1) direction = { x: 0, y: -1 };
    if (e.key === 'ArrowDown' && direction.y !== -1) direction = { x: 0, y: 1 };
    if (e.key === 'ArrowLeft' && direction.x !== 1) direction = { x: -1, y: 0 };
    if (e.key === 'ArrowRight' && direction.x !== -1) direction = { x: 1, y: 0 };
  }

  function endSnakeGame(s, t) {
    clearInterval(gameLoop);
    document.removeEventListener('keydown', snakeKeyHandler);
    const bonus = s >= t * 0.8 ? 3 : s >= t * 0.5 ? 1 : 0;
    state.totalSunlight += bonus;
    saveState();
    document.getElementById("totalStars").textContent = state.totalSunlight;
    document.querySelector('#modalContent').innerHTML = `
      <h2>🐍 游戏结束</h2>
      <div style="text-align:center; font-size:48px; margin:16px 0;">${s >= t ? '🏆' : '🐍'}</div>
      <div style="text-align:center; font-size:16px;">单词：<strong>${word.en}</strong> (${word.zh})</div>
      <div style="text-align:center; font-size:18px;">拼出 ${s} / ${t} 个字母</div>
      <div style="text-align:center; color:var(--accent); margin:8px 0;">奖励 ⭐ x ${bonus}</div>
      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="closeModal()">再来一次</button>
    `;
  }

  // 触摸滑动
  let touchStart = null;
  canvas.addEventListener('touchstart', e => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; });
  canvas.addEventListener('touchend', e => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      direction = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }
    touchStart = null;
  });
}

// ---- 填空射击 ----
function gameShoot(data) {
  const sentences = getSelectedData().sentences;
  if (sentences.length < 3) {
    const words = getSelectedData().words;
    if (words.length < 4) return;
    // 使用单词生成简单句子
    generateShootQuestions(data);
    return;
  }
  generateShootQuestions(data);
}

function generateShootQuestions(data) {
  const sentences = getSelectedData().sentences;
  const questions = [];
  const used = new Set();

  sentences.sort(() => Math.random() - 0.5);
  for (const s of sentences) {
    const words = s.en.split(' ');
    if (words.length < 3) continue;
    const blankIdx = Math.floor(Math.random() * words.length);
    const blankWord = words[blankIdx];
    if (used.has(blankWord.toLowerCase())) continue;
    used.add(blankWord.toLowerCase());

    const allWords = data.words.map(w => w.en);
    const wrongs = allWords.filter(w => w.toLowerCase() !== blankWord.toLowerCase()).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...wrongs, blankWord].sort(() => Math.random() - 0.5);
    words[blankIdx] = '______';
    questions.push({
      sentence: words.join(' '),
      zh: s.zh,
      answer: blankWord,
      options
    });
    if (questions.length >= 8) break;
  }

  if (questions.length === 0) {
    alert('需要更多数据来生成射击题！');
    closeModal();
    return;
  }

  let idx = 0, score = 0;
  const total = questions.length;

  const modal = showModal(`
    <h2>🎯 填空射击</h2>
    <div style="text-align:center; margin-bottom:8px;">得分：<strong id="shootScore">0</strong> / ${total}</div>
    <div id="shootQuestion" style="padding:16px; background:var(--bg); border-radius:var(--radius-sm); text-align:center; font-size:15px; font-weight:600; margin-bottom:12px;"></div>
    <div id="shootOptions" class="exercise-options"></div>
    <button class="btn btn-outline btn-block btn-sm" style="margin-top:12px" onclick="closeModal()">退出</button>
  `);

  function showShoot() {
    if (idx >= total) {
      const bonus = score >= total * 0.8 ? 3 : score >= total * 0.5 ? 1 : 0;
      state.totalSunlight += bonus;
      saveState();
      document.getElementById("totalStars").textContent = state.totalSunlight;
      document.querySelector('#modalContent').innerHTML = `
        <h2>🎯 射击完成！</h2>
        <div style="text-align:center; font-size:48px; margin:16px 0;">🎯</div>
        <div style="text-align:center; font-size:18px;">正确 ${score} / ${total}</div>
        <div style="text-align:center; color:var(--accent); margin:8px 0;">奖励 ⭐ x ${bonus}</div>
        <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="closeModal()">再来一次</button>
      `;
      return;
    }

    const q = questions[idx];
    document.getElementById('shootQuestion').innerHTML = `
      <div style="font-size:12px; color:var(--text-light); margin-bottom:8px;">第 ${idx+1}/${total} 题</div>
      <div style="font-size:15px;">${q.sentence}</div>
      <div style="font-size:13px; color:var(--text-light); margin-top:4px;">${q.zh}</div>
    `;
    document.getElementById('shootOptions').innerHTML = q.options.map(o => `
      <div class="exercise-option" onclick="shootAnswer(this, '${o.replace(/'/g, "\\'")}', '${q.answer.replace(/'/g, "\\'")}')">${o}</div>
    `).join('');
  }

  window.shootAnswer = function(el, chosen, answer) {
    document.querySelectorAll('#shootOptions .exercise-option').forEach(o => o.classList.add('disabled'));
    if (chosen === answer) {
      el.classList.add('correct');
      score++;
      document.getElementById('shootScore').textContent = score;
    } else {
      el.classList.add('wrong');
      document.querySelectorAll('#shootOptions .exercise-option').forEach(o => {
        if (o.textContent.trim() === answer) o.classList.add('correct');
      });
    }
    idx++;
    setTimeout(showShoot, 800);
  };

  showShoot();
}

// ==================== Modal ====================
function showModal(content) {
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('modalOverlay').style.display = 'flex';
  return document.getElementById('modalOverlay');
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  // 清理全局函数
  delete window.matchCardClick;
  delete window.flipMemoryCard;
  delete window.quizAnswer;
  delete window.shootAnswer;
}

document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ==================== 初始化 ====================
// ==================== 游戏：植物大战僵尸 ====================
function gamePvz(data) {
  if (state.pvzSunlight <= 0) state.pvzSunlight = Math.max(50, state.totalSunlight);
  var sunlight = state.pvzSunlight;
  var words = data.words.sort(function(){return Math.random()-0.5;});
  var sentences = data.sentences.sort(function(){return Math.random()-0.5;});
  if (words.length < 3) { alert('需要至少3个单词！'); return; }

  var wave = 0, score = 0, gameOver = false, paused = false;
  var zombies = [], plants = [], gameLoop, sunLoop, plantAttackLoop, spawnTimer;
  var lanes = 5;
  var WAVE_PAUSE = false;  // 波间暂停标志
  var WAVE_PAUSE_TIME = 3000; // 波间暂停3秒

  // 植物商店
  var PLANT_SHOP = [
    { id:'sunflower', name:'向日葵', icon:'🌻', cost:50, hp:2, sunGen:true, attack:false, atkSpeed:0, desc:'自动产阳光' },
    { id:'peashooter', name:'豌豆射手', icon:'🌿', cost:100, hp:3, attack:true, atkSpeed:2500, dmg:1, desc:'自动攻击僵尸' },
    { id:'wallnut', name:'坚果墙', icon:'🥜', cost:80, hp:8, attack:false, atkSpeed:0, desc:'高血量阻挡' },
    { id:'snowpea', name:'寒冰射手', icon:'❄️', cost:150, hp:3, attack:true, atkSpeed:2500, slow:true, dmg:1, desc:'减速+攻击' },
    { id:'cherry', name:'樱桃炸弹', icon:'💣', cost:200, hp:1, attack:false, bomb:true, desc:'炸一行' },
    { id:'chomper', name:'大嘴花', icon:'🌺', cost:250, hp:5, attack:true, atkSpeed:5000, chomp:true, dmg:99, desc:'一口吞僵尸' },
  ];

  var laneHTML = '';
  for (var i=0; i<lanes; i++) laneHTML += '<div class="pvz-lane" id="pvzLane'+i+'" data-lane="'+i+'"></div>';

  var modal = showModal(
    '<h2>🧟 植物大战僵尸</h2>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:8px 12px;background:linear-gradient(135deg,#FEF3C7,#FDE68A);border-radius:var(--radius-sm);">' +
    '<span>☀️ <strong id="pvzSun">'+sunlight+'</strong></span>' +
    '<span>🧟 <strong id="pvzScore">0</strong></span>' +
    '<span>🌊 <strong id="pvzWave">0</strong></span></div>' +
    '<div class="pvz-area" id="pvzArea" style="min-height:280px;">'+laneHTML+'</div>' +
    '<div style="margin:4px 0;font-size:11px;color:var(--text-light);text-align:center;min-height:18px;" id="pvzInfo">💡 先买植物 → 点草坪种植 → 植物会自动攻击僵尸！</div>' +
    '<div style="display:flex;gap:4px;overflow-x:auto;padding:4px 0;margin-bottom:4px;min-height:50px;" id="pvzShop"></div>' +
    '<div class="pvz-options" id="pvzOptions" style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;min-height:44px;"></div>' +
    '<button class="btn btn-outline btn-block btn-sm" style="margin-top:4px" onclick="closeModal()">退出</button>'
  );

  var selectedPlant = null;

  function updateSunDisplay() {
    var el = document.getElementById('pvzSun');
    if (el) el.textContent = sunlight;
    state.pvzSunlight = sunlight;
    saveState();
    document.getElementById('totalStars').textContent = state.totalSunlight;
    renderShop();
  }

  function renderShop() {
    var shop = document.getElementById('pvzShop');
    if (!shop) return;
    shop.innerHTML = PLANT_SHOP.map(function(p){
      var can = sunlight >= p.cost;
      var sel = selectedPlant && selectedPlant.id === p.id;
      var bg = can ? 'var(--success)' : 'var(--border)';
      var c = can ? '#fff' : 'var(--text-light)';
      var bd = sel ? 'border:2px solid var(--accent);' : '';
      return '<button class="btn btn-sm" style="white-space:nowrap;font-size:10px;flex-shrink:0;background:'+bg+';color:'+c+';'+bd+'" onclick="pvzBuyPlant(\''+p.id+'\')">'+p.icon+' '+p.name+'<br>'+p.cost+'☀️</button>';
    }).join('');
  }

  window.pvzBuyPlant = function(pid) {
    var p = PLANT_SHOP.find(function(x){return x.id===pid;});
    if (!p || sunlight < p.cost) { showToast('☀️ 阳光不够！+'+ (p?p.cost-sunlight:0) +'☀️，去练习页做题攒吧！'); return; }
    selectedPlant = p;
    document.getElementById('pvzInfo').textContent = '已选中 '+p.icon+' '+p.name+'，点击草坪种植！';
    renderShop();
  };

  // 点击草坪种植物
  document.getElementById('pvzArea').addEventListener('click', function(e) {
    if (!selectedPlant || gameOver) return;
    var laneEl = e.target.closest('.pvz-lane');
    if (!laneEl) return;
    var lane = parseInt(laneEl.dataset.lane);
    if (laneEl.querySelector('.pvz-plant')) {
      document.getElementById('pvzInfo').textContent = '⚠️ 这一行已经有植物了！等它被吃掉再种。';
      return;
    }
    if (sunlight < selectedPlant.cost) { showToast('☀️ 阳光不够！'); return; }
    sunlight -= selectedPlant.cost;
    var pe = document.createElement('div');
    pe.className = 'pvz-plant';
    pe.textContent = selectedPlant.icon;
    pe.style.left = '8%';
    pe.style.animation = 'starPop 0.4s ease';
    pe.style.fontSize = '30px';
    laneEl.appendChild(pe);
    plants.push({
      el:pe, lane:lane, hp:selectedPlant.hp, maxHp:selectedPlant.hp,
      sunGen:selectedPlant.sunGen||false, attack:selectedPlant.attack||false,
      atkSpeed:selectedPlant.atkSpeed||0, dmg:selectedPlant.dmg||0,
      slow:selectedPlant.slow||false, bomb:selectedPlant.bomb||false,
      chomp:selectedPlant.chomp||false, lastAttack:0,
      icon:selectedPlant.icon, name:selectedPlant.name
    });
    document.getElementById('pvzInfo').textContent = '✅ '+selectedPlant.icon+' 种在第'+(lane+1)+'行！';
    selectedPlant = null;
    updateSunDisplay();
  });

  // 僵尸唯一ID计数器
  var zombieUid = 0;

  // 当前场上活跃的僵尸-单词映射：{ word_en: zh }
  var activeWords = {};

  // 生成僵尸：只从已选单元的 words 里取
  function spawnZombie() {
    if (gameOver) return;
    if (words.length === 0) return;

    // 随机选一个未在场上出现的单词
    var available = words.filter(function(w) { return !activeWords[w.en]; });
    if (available.length === 0) available = words; // 都出现过就循环用
    var w = available[Math.floor(Math.random() * available.length)];

    var lane = Math.floor(Math.random() * lanes);
    var spd = 15 + Math.random() * 4; // 15-19秒走完（比之前慢，给植物攻击时间）
    var uid = ++zombieUid;

    var zombie = document.createElement('div');
    zombie.className = 'pvz-zombie';
    zombie.style.top = '50%';
    zombie.style.animationDuration = spd + 's';
    zombie.style.fontSize = '28px';
    zombie.textContent = '🧟';
    zombie.dataset.uid = uid;
    zombie.dataset.word = w.en;
    zombie.dataset.answer = w.zh;

    var wl = document.createElement('div');
    wl.className = 'pvz-word';
    wl.textContent = w.en;
    wl.style.fontSize = '11px';
    wl.style.background = '#fff';
    zombie.appendChild(wl);

    var le = document.getElementById('pvzLane' + lane);
    if (le) le.appendChild(zombie);

    var zObj = { uid: uid, el: zombie, lane: lane, word: w.en, answer: w.zh, spd: spd, alive: true, hp: 2, maxHp: 2 };
    zombies.push(zObj);
    activeWords[w.en] = w.zh;
    updateOptions();
  }

  // 在指定行生成僵尸（用于多行同时出僵尸）
  function spawnZombieOnLane(lane) {
    if (gameOver) return;
    if (words.length === 0) return;
    var available = words.filter(function(w) { return !activeWords[w.en]; });
    if (available.length === 0) available = words;
    var w = available[Math.floor(Math.random() * available.length)];
    var spd = 15 + Math.random() * 4;
    var uid = ++zombieUid;

    var zombie = document.createElement('div');
    zombie.className = 'pvz-zombie';
    zombie.style.top = '50%';
    zombie.style.animationDuration = spd + 's';
    zombie.style.fontSize = '28px';
    zombie.textContent = '🧟';
    zombie.dataset.uid = uid;
    zombie.dataset.word = w.en;
    zombie.dataset.answer = w.zh;

    var wl = document.createElement('div');
    wl.className = 'pvz-word';
    wl.textContent = w.en;
    wl.style.fontSize = '11px';
    wl.style.background = '#fff';
    zombie.appendChild(wl);

    var le = document.getElementById('pvzLane' + lane);
    if (le) le.appendChild(zombie);

    var zObj = { uid: uid, el: zombie, lane: lane, word: w.en, answer: w.zh, spd: spd, alive: true, hp: 2, maxHp: 2 };
    zombies.push(zObj);
    activeWords[w.en] = w.zh;
    updateOptions();
  }

  // ============ 波次系统：一波集中出，波间暂停 ============
  function startWave() {
    if (gameOver) return;
    wave++;
    WAVE_PAUSE = false;
    document.getElementById('pvzWave').textContent = wave;

    var count = Math.min(3 + Math.floor(wave / 2), 5); // 每波3~5只（提高了起始数量）
    var usedLanes = {};

    for (var i = 0; i < count; i++) {
      (function(idx) {
        setTimeout(function() {
          if (gameOver) return;
          var lane;
          var tries = 0;
          do {
            lane = Math.floor(Math.random() * lanes);
            tries++;
          } while (usedLanes[lane] && tries < 5);
          usedLanes[lane] = true;
          spawnZombieOnLane(lane);
        }, idx * 800); // 每0.8秒出一个，不同行几乎同时
      })(i);
    }

    var wb = wave * 3;
    sunlight += wb;
    updateSunDisplay();
    document.getElementById('pvzInfo').textContent = '🌊 第' + wave + '波来袭！(' + count + '只僵尸) +' + wb + '☀️';

    // 波结束后暂停3秒，给你时间买植物
    var waveDuration = 5000 + count * 1000; // 缩短波内间隔，下一波更快来
    spawnTimer = setTimeout(function() {
      if (gameOver) return;
      WAVE_PAUSE = true;
      document.getElementById('pvzInfo').textContent = '⏸️ 休息3秒…快用阳光买��物！';
      // 暂停后3秒出下一波
      spawnTimer = setTimeout(function() {
        if (gameOver) return;
        startWave();
      }, WAVE_PAUSE_TIME);
    }, waveDuration);
  }

  // 初始赠送2棵向日葵
  var sf = PLANT_SHOP[0];
  if (sunlight >= sf.cost) {
    sunlight -= sf.cost;
    for (var i=0; i<Math.min(2,lanes); i++) {
      var le = document.getElementById('pvzLane'+i);
      if (le) {
        var pe = document.createElement('div');
        pe.className='pvz-plant'; pe.textContent='🌻'; pe.style.left='8%'; pe.style.fontSize='30px';
        le.appendChild(pe);
        plants.push({el:pe,lane:i,hp:2,maxHp:2,sunGen:true,attack:false,atkSpeed:0,dmg:0,slow:false,bomb:false,chomp:false,lastAttack:0,icon:'🌻',name:'向日葵'});
      }
    }
    updateSunDisplay();
  }

  // 初始第一波延迟3秒，给时间准备
  spawnTimer = setTimeout(function() {
    startWave();
  }, 3000);

  renderShop();

  // 底部选项：严格对应场上存活僵尸的中文意思（平滑更新，不跳动）
  function updateOptions() {
    var oe = document.getElementById('pvzOptions');
    if (!oe) return;

    // 收集场上存活僵尸的答案（去重）
    var alive = zombies.filter(function(z) { return z.alive; });
    var correctAnswers = [];
    alive.forEach(function(z) {
      if (correctAnswers.indexOf(z.answer) < 0) correctAnswers.push(z.answer);
    });

    // 干扰选项：从单词表里取和正确答案不同的
    var wrongs = words.filter(function(w) { return correctAnswers.indexOf(w.zh) < 0; })
      .sort(function() { return Math.random() - 0.5; })
      .slice(0, Math.max(0, 6 - correctAnswers.length));

    var allOptions = correctAnswers.concat(wrongs.map(function(w) { return w.zh; }))
      .sort(function() { return Math.random() - 0.5; });

    // 固定6个按钮，永不增删，只更新内容，完全无跳动
    var FIXED_COUNT = 6;
    var existingBtns = oe.querySelectorAll('button');

    // 第一次初始化：创建6个固定按钮
    if (existingBtns.length < FIXED_COUNT) {
      oe.innerHTML = '';
      for (var i = 0; i < FIXED_COUNT; i++) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-primary btn-sm';
        btn.style.cssText = 'flex:0 0 calc(33% - 4px);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        oe.appendChild(btn);
      }
      existingBtns = oe.querySelectorAll('button');
    }

    // 更新每个按钮的内容
    for (var i = 0; i < FIXED_COUNT; i++) {
      var btn = existingBtns[i];
      var txt = (i < allOptions.length) ? allOptions[i] : '';
      if (btn.textContent !== txt) {
        btn.textContent = txt;
        if (txt) {
          btn.setAttribute('onclick', "pvzAttack('" + txt.replace(/'/g, "\\'") + "')");
          btn.style.visibility = 'visible';
        } else {
          btn.removeAttribute('onclick');
          btn.style.visibility = 'hidden'; // 隐藏但不占位变，用 visibility 不影响布局
        }
      }
    }
  }

  // 攻击：点击中文选项消灭对应僵尸
  window.pvzAttack = function(chosen) {
    if (gameOver) return;

    // 找到所有匹配的存活僵尸，优先打最靠左的
    var matches = zombies.filter(function(z) { return z.alive && z.answer === chosen; });
    if (matches.length === 0) {
      sunlight = Math.max(0, sunlight - 5);
      updateSunDisplay();
      showToast('❌ 选错了！-5☀️', 1500);
      playErrorSound();
      var area = document.getElementById('pvzArea');
      if (area) { area.style.animation = 'shake 0.3s ease'; setTimeout(function() { area.style.animation = ''; }, 300); }
      return;
    }

    // 优先打最靠左的
    var z = matches[0];
    if (matches.length > 1) {
      matches.forEach(function(mz) {
        var r = mz.el.getBoundingClientRect();
        var zr = z.el.getBoundingClientRect();
        if (r.right < zr.right) z = mz;
      });
    }

    // 玩家答题直接造成2点伤害（相当于豌豆打两次），基本一击必杀
    z.hp -= 2;
    var bonus = 5;
    var lp = plants.find(function(p) { return p.lane === z.lane && p.hp > 0; });

    if (lp && lp.chomp && z.hp <= 0) {
      bonus = 10;
      playBigKillSound();
      document.getElementById('pvzInfo').textContent = '🌺 大嘴花一口吞掉！+' + bonus + '☀️';
    } else if (lp && lp.bomb) {
      playBigKillSound();
      var lz = zombies.filter(function(zz) { return zz.alive && zz.lane === z.lane; });
      lz.forEach(function(zz) {
        zz.alive = false;
        delete activeWords[zz.word];
        zz.el.style.transform = 'scale(0)'; zz.el.style.opacity = '0';
        zz.el.style.transition = 'all 0.2s';
        setTimeout(function() { if (zz.el.parentNode) zz.el.remove(); }, 200);
        score++; bonus += 10;
      });
      lp.hp = 0; lp.el.style.opacity = '0';
      setTimeout(function() { if (lp.el.parentNode) lp.el.remove(); }, 300);
      document.getElementById('pvzInfo').textContent = '💣 樱桃炸弹！整行消灭！+' + bonus + '☀️';
    } else {
      if (z.hp <= 0) {
        playKillSound();
        z.alive = false;
        delete activeWords[z.word];
        z.el.style.transform = 'scale(0)'; z.el.style.opacity = '0';
        z.el.style.transition = 'all 0.3s';
        setTimeout(function() { if (z.el.parentNode) z.el.remove(); }, 300);
        score++;
        if (lp && lp.attack) {
          document.getElementById('pvzInfo').textContent = '✅ ' + lp.icon + ' 发射！+' + bonus + '☀️';
        } else {
          document.getElementById('pvzInfo').textContent = '✅ 消灭僵尸！+' + bonus + '☀️';
        }
      } else {
        // 僵尸受伤但没死
        z.el.style.animation = 'shake 0.2s ease';
        setTimeout(function() { z.el.style.animation = 'pvzWalk ' + z.spd + 's linear forwards'; }, 200);
        document.getElementById('pvzInfo').textContent = '💢 僵尸受伤了！再打一次！（剩' + z.hp + '血）';
      }
    }

    if (z.hp <= 0) {
      sunlight += bonus;
      updateOptions();
    }
    updateSunDisplay();
    document.getElementById('pvzScore').textContent = score;
  };

  // 向日葵自动产阳光
  sunLoop = setInterval(function() {
    if (gameOver) return;
    plants.forEach(function(p) {
      if (p.sunGen && p.hp > 0) {
        sunlight += 5;
        updateSunDisplay();
      }
    });
  }, 8000);

  // ============ 植物自动攻击系统 ============
  plantAttackLoop = setInterval(function() {
    if (gameOver || WAVE_PAUSE) return;

    plants.forEach(function(p) {
      if (!p.attack || p.hp <= 0) return; // 只处理攻击型植物

      // 找同行最靠左的存活僵尸
      var target = null;
      zombies.forEach(function(z) {
        if (!z.alive || z.lane !== p.lane) return;
        if (!target) { target = z; return; }
        var tr = target.el.getBoundingClientRect();
        var zr = z.el.getBoundingClientRect();
        if (zr.right > tr.right) target = z; // 最靠左（right最小=走最远）
      });

      if (!target) return; // 同行没僵尸

      // 检查冷却时间
      var now = Date.now();
      if (now - p.lastAttack < p.atkSpeed) return;
      p.lastAttack = now;

      // 发射子弹动画
      shootBullet(p, target);

      // 造成伤害
      target.hp -= p.dmg;

      if (target.hp <= 0) {
        // 植物打死僵尸
        target.alive = false;
        delete activeWords[target.word];
        target.el.style.transform = 'scale(0)';
        target.el.style.opacity = '0';
        target.el.style.transition = 'all 0.3s';
        setTimeout(function() { if (target.el.parentNode) target.el.remove(); }, 300);
        score++;
        sunlight += 3;
        updateSunDisplay();
        document.getElementById('pvzScore').textContent = score;
        updateOptions();
        playKillSound();
        document.getElementById('pvzInfo').textContent = '🔫 ' + p.icon + ' ' + p.name + ' 消灭僵尸！+3☀️';
      }
    });
  }, 400);

  // 子弹动画
  function shootBullet(plant, zombie) {
    var area = document.getElementById('pvzArea');
    if (!area) return;
    var pr = plant.el.getBoundingClientRect();
    var ar = area.getBoundingClientRect();

    var bullet = document.createElement('div');
    bullet.style.cssText = 'position:fixed;font-size:14px;z-index:999;pointer-events:none;transition:all 0.5s linear;';
    bullet.textContent = '🟢';
    bullet.style.left = (pr.left + pr.width / 2) + 'px';
    bullet.style.top = (pr.top + pr.height / 2 - 7) + 'px';
    document.body.appendChild(bullet);

    // 目标位置
    var zr = zombie.el.getBoundingClientRect();
    requestAnimationFrame(function() {
      bullet.style.left = (zr.left + zr.width / 2) + 'px';
      bullet.style.top = (zr.top + zr.height / 2 - 7) + 'px';
    });

    // 命中后消失
    setTimeout(function() {
      if (bullet.parentNode) bullet.remove();
    }, 550);
  }

  // 主循环：僵尸移动检测 + 啃植物
  gameLoop = setInterval(function() {
    if (gameOver) return;
    zombies.forEach(function(z) {
      if (!z.alive || !z.el.parentNode) return;
      var rect = z.el.getBoundingClientRect();
      var ar = document.getElementById('pvzArea');
      if (!ar) return;
      var arRect = ar.getBoundingClientRect();
      var prog = (rect.right - arRect.left) / arRect.width;

      // 寒冰减速（只在第一次接触时触发）
      var lp = plants.find(function(p){return p.lane===z.lane && p.hp>0;});
      if (lp && lp.slow && !z._slowed) {
        z._slowed = true;
        z.el.style.animationDuration = (parseFloat(z.el.style.animationDuration)*2)+'s';
        z.spd = z.spd * 2;
      }

      // 僵尸到达植物位置 → 啃植物（慢慢啃）
      if (prog < 0.35 && lp && lp.hp > 0 && !z._eating) {
        z._eating = true;
        z.el.style.animationPlayState = 'paused';
        // 每1.5秒啃一次
        z._eatTimer = setInterval(function() {
          if (gameOver || !z.alive || !lp || lp.hp <= 0) {
            clearInterval(z._eatTimer);
            if (z.alive) z.el.style.animationPlayState = 'running';
            return;
          }
          lp.hp--;
          if (lp.hp <= 0) {
            lp.el.style.opacity='0';
            setTimeout(function(){if(lp.el.parentNode)lp.el.remove();},300);
            document.getElementById('pvzInfo').textContent = '💀 '+lp.name+' 被吃掉了！';
            // 植物被吃后僵尸继续走
            if (z.alive) z.el.style.animationPlayState = 'running';
            z._eating = false;
            clearInterval(z._eatTimer);
          } else {
            document.getElementById('pvzInfo').textContent = '🦷 僵尸在啃 '+lp.name+'...（剩'+lp.hp+'血）';
          }
        }, 1500);
      }

      // 僵尸突破防线（走到最左边）
      if (prog < 0.08) {
        if (!gameOver) {
          sunlight = Math.max(0, sunlight - 10);
          updateSunDisplay();
          z.alive = false;
          delete activeWords[z.word];
          if (z._eatTimer) clearInterval(z._eatTimer);
          z.el.style.transform='scale(0)'; z.el.style.opacity='0';
          z.el.style.transition='all 0.3s';
          setTimeout(function(){if(z.el.parentNode)z.el.remove();},300);
          updateOptions();
          showToast('⚠️ 僵尸突破了！-10☀️', 2000);
          if (sunlight <= 0) {
            gameOver = true;
            clearInterval(gameLoop);
            clearInterval(sunLoop);
            clearInterval(plantAttackLoop);
            clearTimeout(spawnTimer);
            endPvzGame(score, wave);
          }
        }
      }
    });
  }, 400);

  function endPvzGame(s,w) {
    clearInterval(gameLoop);
    clearInterval(sunLoop);
    clearInterval(plantAttackLoop);
    clearTimeout(spawnTimer);
    // 清理所有僵尸啃咬定时器
    zombies.forEach(function(z) { if (z._eatTimer) clearInterval(z._eatTimer); });
    var bonus = s*2;
    state.totalSunlight += bonus;
    state.pvzSunlight = Math.max(0,sunlight);
    saveState();
    document.getElementById('totalStars').textContent = state.totalSunlight;
    document.querySelector('#modalContent').innerHTML = '<h2>🧟 游戏结束</h2><div style="text-align:center;font-size:48px;margin:16px 0;">'+(s>=20?'🏆':s>=8?'👍':'🧟')+'</div><div style="text-align:center;font-size:16px;">消灭 <strong>'+s+'</strong> 只僵尸 · 撑过 <strong>'+w+'</strong> 波</div><div style="text-align:center;color:var(--accent);margin:8px 0;font-size:16px;">+'+bonus+' ☀️ 阳光奖励</div><div style="text-align:center;font-size:12px;color:var(--text-light);">剩余阳光：'+Math.max(0,sunlight)+' ☀️</div><button class="btn btn-primary btn-block" style="margin-top:16px" onclick="closeModal()">再来一次</button>';
  }
}

// ==================== 游戏：打地鼠 ====================
function gameWhack(data) {
  var words = data.words.sort(function() { return Math.random() - 0.5; }).slice(0, 12);
  var score = 0, miss = 0, maxMiss = 5, gameOver = false;
  var currentWord = null, moleTimers = [];

  var holesHTML = '';
  for (var i = 0; i < 6; i++) {
    holesHTML += '<div class="whack-hole" id="hole' + i + '" onclick="whackHit(' + i + ')" style="flex:0 0 30%;height:70px;background:#8B5E3C;border-radius:50% 50% 0 0;position:relative;overflow:hidden;margin:4px;cursor:pointer;">' +
      '<div class="whack-mole" id="mole' + i + '" style="position:absolute;bottom:-60px;left:50%;transform:translateX(-50%);font-size:36px;transition:bottom 0.15s ease;z-index:1;">🐹</div>' +
      '<div class="whack-word" id="moleWord' + i + '" style="position:absolute;top:4px;left:50%;transform:translateX(-50%);font-size:11px;background:#fff;color:#333;padding:1px 6px;border-radius:6px;white-space:nowrap;z-index:2;display:none;"></div>' +
      '</div>';
  }

  var modal = showModal(
    '<h2>🔨 打地鼠</h2>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:8px 12px;background:linear-gradient(135deg,#FFF7ED,#FED7AA);border-radius:var(--radius-sm);">' +
    '<span>✅ <strong id="whackScore">0</strong></span>' +
    '<span>❤️ <strong id="whackMiss">' + maxMiss + '</strong></span>' +
    '<span>⏱️ <strong id="whackTimer">60</strong>s</span></div>' +
    '<div style="text-align:center;font-size:14px;margin:8px 0;min-height:22px;" id="whackTarget">准备...</div>' +
    '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;background:#5D4037;border-radius:var(--radius);padding:8px;" id="whackArea">' + holesHTML + '</div>' +
    '<button class="btn btn-outline btn-block btn-sm" style="margin-top:8px" onclick="closeModal()">退出</button>'
  );

  var targetWord = null;
  var timeLeft = 60;
  var activeMoles = {};

  // 随机选目标单词
  function pickTarget() {
    var idx = Math.floor(Math.random() * words.length);
    targetWord = words[idx];
    document.getElementById('whackTarget').innerHTML = '🎯 找出：<strong style="color:#EF4444;">' + targetWord.zh + '</strong>';
    popMoles();
  }

  // 地鼠冒出来
  function popMoles() {
    if (gameOver) return;
    // 清除旧的地鼠
    for (var h = 0; h < 6; h++) {
      hideMole(h);
    }
    activeMoles = {};

    // 随机2-4个洞冒出地鼠
    var count = 2 + Math.floor(Math.random() * 3);
    var usedHoles = [];
    while (usedHoles.length < count) {
      var hole = Math.floor(Math.random() * 6);
      if (usedHoles.indexOf(hole) < 0) usedHoles.push(hole);
    }

    usedHoles.forEach(function(hole) {
      showMole(hole);
    });

    // 1.5-2.5秒后换一轮
    var delay = 2500 + Math.random() * 1500; // 2.5-4秒，地鼠停留更久
    var timer = setTimeout(function() {
      if (!gameOver) popMoles();
    }, delay);
    moleTimers.push(timer);
  }

  function showMole(hole) {
    var mole = document.getElementById('mole' + hole);
    var wordEl = document.getElementById('moleWord' + hole);
    if (!mole || !wordEl) return;

    // 随机选一个单词贴到地鼠上
    var w = words[Math.floor(Math.random() * words.length)];
    mole.style.bottom = '8px';
    wordEl.textContent = w.en;
    wordEl.style.display = 'block';
    activeMoles[hole] = { word: w, alive: true };
  }

  function hideMole(hole) {
    var mole = document.getElementById('mole' + hole);
    var wordEl = document.getElementById('moleWord' + hole);
    if (mole) mole.style.bottom = '-60px';
    if (wordEl) wordEl.style.display = 'none';
    activeMoles[hole] = null;
  }

  // 锤子敲地鼠
  window.whackHit = function(hole) {
    if (gameOver) return;
    var moleData = activeMoles[hole];
    if (!moleData || !moleData.alive) return;

    moleData.alive = false;
    hideMole(hole);

    if (moleData.word.en === targetWord.en) {
      score++;
      document.getElementById('whackScore').textContent = score;
      showToast('✅ 正确！', 800);
      playKillSound();
      pickTarget();
    } else {
      miss++;
      document.getElementById('whackMiss').textContent = maxMiss - miss;
      showToast('❌ 不对！❤️-' + (maxMiss - miss), 800);
      playErrorSound();
      if (miss >= maxMiss) {
        endWhackGame();
      }
    }
  };

  // 倒计时
  var timerInterval = setInterval(function() {
    if (gameOver) { clearInterval(timerInterval); return; }
    timeLeft--;
    document.getElementById('whackTimer').textContent = timeLeft;
    if (timeLeft <= 0) {
      endWhackGame();
    }
  }, 1000);

  function endWhackGame() {
    gameOver = true;
    clearInterval(timerInterval);
    moleTimers.forEach(function(t) { clearTimeout(t); });
    var bonus = score * 3;
    state.totalSunlight += bonus;
    saveState();
    document.getElementById('totalStars').textContent = state.totalSunlight;
    document.querySelector('#modalContent').innerHTML = '<h2>🔨 游戏结束</h2>' +
      '<div style="text-align:center;font-size:48px;margin:16px 0;">' + (score >= 15 ? '🏆' : score >= 8 ? '👍' : '💪') + '</div>' +
      '<div style="text-align:center;font-size:16px;">打中 <strong>' + score + '</strong> 只地鼠</div>' +
      '<div style="text-align:center;color:var(--accent);margin:8px 0;font-size:16px;">+' + bonus + ' ☀️ 阳光奖励</div>' +
      '<button class="btn btn-primary btn-block" style="margin-top:16px" onclick="closeModal()">再来一次</button>';
  }

  pickTarget();
}

// ==================== 游戏：泡泡龙 ====================
function gameBubble(data) {
  var words = data.words.sort(function() { return Math.random() - 0.5; }).slice(0, 10);
  var score = 0, miss = 0, maxMiss = 5, gameOver = false;
  var bubbles = [], bubbleId = 0, spawnInterval, gameLoop;

  var modal = showModal(
    '<h2>🫧 单词泡泡龙</h2>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:8px 12px;background:linear-gradient(135deg,#EFF6FF,#BFDBFE);border-radius:var(--radius-sm);">' +
    '<span>✅ <strong id="bubScore">0</strong></span>' +
    '<span>❤️ <strong id="bubMiss">' + maxMiss + '</strong></span>' +
    '<span>⏱️ <strong id="bubTimer">60</strong>s</span></div>' +
    '<div style="text-align:center;font-size:14px;margin:8px 0;min-height:22px;" id="bubTarget">准备...</div>' +
    '<div style="position:relative;height:300px;background:linear-gradient(180deg,#1E3A5F,#0F172A);border-radius:var(--radius);overflow:hidden;" id="bubArea"></div>' +
    '<button class="btn btn-outline btn-block btn-sm" style="margin-top:8px" onclick="closeModal()">退出</button>'
  );

  var targetWord = null;
  var timeLeft = 60;
  var bubbleColors = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

  function pickTarget() {
    var idx = Math.floor(Math.random() * words.length);
    targetWord = words[idx];
    document.getElementById('bubTarget').innerHTML = '🎯 点破中文 <strong style="color:#FBBF24;">' + targetWord.zh + '</strong> 对应的英语泡泡！';
  }

  function spawnBubble() {
    if (gameOver) return;
    var id = ++bubbleId;
    var w = words[Math.floor(Math.random() * words.length)];
    var size = 50 + Math.random() * 30;
    var left = 5 + Math.random() * 70;
    var color = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];
    var duration = 6 + Math.random() * 4;

    var el = document.createElement('div');
    el.id = 'bub' + id;
    el.style.cssText = 'position:absolute;bottom:-60px;left:' + left + '%;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:radial-gradient(circle at 30% 30%, ' + color + ', ' + color + '88);display:flex;align-items:center;justify-content:center;font-size:' + (size > 65 ? '12' : '10') + 'px;color:#fff;font-weight:700;cursor:pointer;z-index:1;box-shadow:inset 0 0 10px rgba(255,255,255,0.4);animation:bubFloat ' + duration + 's linear forwards;text-align:center;word-break:break-all;padding:4px;box-sizing:border-box;';
    el.textContent = w.en;
    el.setAttribute('onclick', 'bubPop(' + id + ')');
    document.getElementById('bubArea').appendChild(el);

    var bObj = { id: id, el: el, word: w, alive: true };
    bubbles.push(bObj);

    // 泡泡飘到顶部消失 = miss
    setTimeout(function() {
      if (bObj.alive && !gameOver) {
        bObj.alive = false;
        bObj.el.remove();
        miss++;
        document.getElementById('bubMiss').textContent = maxMiss - miss;
        if (miss >= maxMiss) endBubGame();
      }
    }, duration * 1000);
  }

  window.bubPop = function(id) {
    if (gameOver) return;
    var b = bubbles.find(function(x) { return x.id === id && x.alive; });
    if (!b) return;
    b.alive = false;
    b.el.style.transform = 'scale(1.5)';
    b.el.style.opacity = '0';
    b.el.style.transition = 'all 0.2s';
    setTimeout(function() { if (b.el.parentNode) b.el.remove(); }, 200);

    if (b.word.en === targetWord.en) {
      score++;
      document.getElementById('bubScore').textContent = score;
      showToast('✅ 正确！', 800);
      playKillSound();
      pickTarget();
    } else {
      miss++;
      document.getElementById('bubMiss').textContent = maxMiss - miss;
      showToast('❌ 不对！', 800);
      playErrorSound();
      if (miss >= maxMiss) endBubGame();
    }
  };

  // 每0.8秒生成一个泡泡
  spawnInterval = setInterval(function() {
    if (!gameOver) spawnBubble();
  }, 800);

  // 清理离开屏幕的泡泡
  gameLoop = setInterval(function() {
    if (gameOver) return;
    bubbles.forEach(function(b) {
      if (!b.alive || !b.el.parentNode) return;
      var rect = b.el.getBoundingClientRect();
      var ar = document.getElementById('bubArea');
      if (!ar) return;
      var arRect = ar.getBoundingClientRect();
      if (rect.bottom < arRect.top + 10) {
        b.alive = false;
        b.el.remove();
      }
    });
  }, 500);

  // 倒计时
  var timerInterval = setInterval(function() {
    if (gameOver) { clearInterval(timerInterval); return; }
    timeLeft--;
    document.getElementById('bubTimer').textContent = timeLeft;
    if (timeLeft <= 0) endBubGame();
  }, 1000);

  function endBubGame() {
    gameOver = true;
    clearInterval(spawnInterval);
    clearInterval(gameLoop);
    clearInterval(timerInterval);
    bubbles.forEach(function(b) { if (b.el.parentNode) b.el.remove(); });
    var bonus = score * 3;
    state.totalSunlight += bonus;
    saveState();
    document.getElementById('totalStars').textContent = state.totalSunlight;
    document.querySelector('#modalContent').innerHTML = '<h2>🫧 游戏结束</h2>' +
      '<div style="text-align:center;font-size:48px;margin:16px 0;">' + (score >= 15 ? '🏆' : score >= 8 ? '👍' : '💪') + '</div>' +
      '<div style="text-align:center;font-size:16px;">点破 <strong>' + score + '</strong> 个泡泡</div>' +
      '<div style="text-align:center;color:var(--accent);margin:8px 0;font-size:16px;">+' + bonus + ' ☀️ 阳光奖励</div>' +
      '<button class="btn btn-primary btn-block" style="margin-top:16px" onclick="closeModal()">再来一次</button>';
  }

  pickTarget();
}

function init() {
  loadState();
  renderHome();
  document.getElementById('totalStars').textContent = state.totalSunlight;
}

init();
