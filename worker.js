// ============================================================================
// MARS VTOL AGENT — CLOUDFLARE WORKER (ФИКС ОФИЦИАЛЬНОГО GEMINI API)
// ============================================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers для всех ответов
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Preflight запрос браузера
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    // Отдаём главную страницу
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(HTML, {
        headers: { "Content-Type": "text/html;charset=UTF-8", ...cors },
      });
    }

    // Бэкенд-прокси к официальному бесплатному Gemini 2.5 API
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();

        // Склеиваем системный промпт, контекст истории и новое сообщение в один запрос для Gemini
        let fullPrompt = `${body.system}\n\n`;
        
        if (body.messages && Array.isArray(body.messages)) {
          body.messages.forEach(msg => {
            const roleName = msg.role === "assistant" ? "Агент" : "Инженер";
            fullPrompt += `${roleName}: ${msg.content}\n`;
          });
        } else {
          fullPrompt += `Инженер: ${body.message || "Сделай отчет"}\n`;
        }
        
        fullPrompt += "\nАгент:";

        // Payload по официальной спецификации Google AI Studio
        const geminiPayload = {
          contents: [{
            parts: [{ text: fullPrompt }]
          }],
          // Подключаем встроенный поиск Google для работы с NASA/arXiv данными
          tools: [{ googleSearch: {} }]
        };

        // Запрос к родному эндпоинту Gemini 2.5 Flash
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(geminiPayload)
        });

        if (!resp.ok) {
          const errText = await resp.text();
          return new Response(JSON.stringify({ error: { message: `Gemini API Error: ${errText}` } }), {
            status: resp.status,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }

        const data = await resp.json();
        
        // Достаем текст ответа по структуре Google API
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Ошибка разбора ответа ИИ.";

        // Упаковываем строго в том формате, который ищет ваш фронтенд во встроенном скрипте
        const responseToFrontend = {
          content: [
            {
              type: "text",
              text: aiText
            }
          ]
        };

        return new Response(JSON.stringify(responseToFrontend), {
          status: 200,
          headers: { "Content-Type": "application/json", ...cors },
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: { message: e.message } }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...cors },
        });
      }
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};

// ============================================================================
// ВАШ СОХРАНЕННЫЙ HTML ИНТЕРФЕЙС (1:1 ИЗ ИСХОДНИКА)
// ============================================================================
const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Mars VTOL // Tech Researcher</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#F5F3EF;font-family:'IBM Plex Mono','Courier New',monospace;color:#1a1a1a;display:flex;flex-direction:column;min-height:100vh}

  #header{background:white;border-bottom:2px solid #E8E2DC;padding:0 28px;height:62px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:100;box-shadow:0 1px 6px rgba(0,0,0,0.06)}
  .mars-ball{width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 38% 35%,#F4845F,#C0410A 55%,#7A2508);box-shadow:0 2px 10px rgba(192,65,10,0.4);flex-shrink:0}
  .header-title{font-size:13px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
  .header-sub{font-size:9px;color:#C0410A;letter-spacing:.1em;margin-top:3px;text-transform:uppercase}
  #btn-clear{background:none;border:1.5px solid #E2DDD8;border-radius:6px;color:#999;font-size:10px;padding:5px 12px;cursor:pointer;font-family:inherit;letter-spacing:.1em;text-transform:uppercase;transition:all .15s;display:none}
  #btn-clear:hover{border-color:#C0410A;color:#C0410A}

  #toolbar{background:white;border-bottom:1.5px solid #EAE5E0;padding:10px 28px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .btn-weekly{background:#C0410A;border:none;border-radius:7px;padding:8px 18px;color:white;font-size:11px;font-weight:700;letter-spacing:.1em;cursor:pointer;font-family:inherit;transition:all .18s;text-transform:uppercase}
  .btn-weekly:hover:not(:disabled){background:#A33508;box-shadow:0 3px 10px rgba(192,65,10,0.3)}
  .btn-weekly:disabled{opacity:.45;cursor:not-allowed}
  .sep{width:1px;height:24px;background:#E2DDD8}
  .btn-chip{background:white;border:1.5px solid #E2DDD8;border-radius:20px;padding:5px 13px;font-size:11px;color:#555;cursor:pointer;font-family:inherit;transition:all .18s;white-space:nowrap}
  .btn-chip:hover:not(:disabled){border-color:#C0410A;color:#C0410A;background:#FFF5F0}
  .btn-chip:disabled{opacity:.4;cursor:not-allowed}

  #messages{flex:1;padding:24px 28px;display:flex;flex-direction:column;gap:18px;overflow-y:auto}
  .empty-state{text-align:center;padding:60px 20px;display:flex;flex-direction:column;align-items:center}
  .empty-ball{width:72px;height:72px;border-radius:50%;background:radial-gradient(circle at 38% 35%,#F4845F,#C0410A 55%,#7A2508);box-shadow:0 8px 28px rgba(192,65,10,0.22);margin-bottom:20px}
  .empty-title{font-size:15px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
  .empty-sub{font-size:12px;color:#999;margin-top:8px;line-height:1.7}
  .grid-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:28px;max-width:420px;text-align:left}
  .card{background:white;border:1.5px solid #E8E2DC;border-radius:10px;padding:13px 15px;border-top:3px solid #C0410A}
  .card-tag{font-size:9px;font-weight:700;color:#C0410A;letter-spacing:.15em;text-transform:uppercase;margin-bottom:5px}
  .card-desc{font-size:11px;color:#777;line-height:1.55}

  .msg-wrap{animation:fadeUp .3s ease forwards}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .msg-user{display:flex;justify-content:flex-end}
  .bubble-user{background:#C0410A;color:white;border-radius:12px 12px 2px 12px;padding:10px 16px;max-width:65%;font-size:12px;line-height:1.6;box-shadow:0 2px 8px rgba(192,65,10,0.2)}
  .msg-bot{display:flex;gap:10px;align-items:flex-start}
  .bot-avatar{width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 38% 35%,#F4845F,#C0410A 55%,#7A2508);flex-shrink:0;margin-top:2px}
  .bubble-bot{background:white;border:1.5px solid #E8E2DC;border-radius:2px 12px 12px 12px;padding:14px 18px;flex:1;font-size:12px;line-height:1.8;box-shadow:0 1px 4px rgba(0,0,0,0.05);color:#2a2a2a}
  .bubble-bot strong{color:#C0410A}
  .bubble-bot ul{margin:5px 0 5px 18px}
  .bubble-bot li{margin:3px 0;color:#333;line-height:1.65}
  .bubble-bot h2,.bubble-bot h3{color:#C0410A;margin:10px 0 4px;font-size:13px}
  .bubble-bot p{margin:5px 0;line-height:1.75}
  .bubble-error{border-color:#FFCCC7!important;background:#FFF8F8!important}

  .loading-wrap{display:flex;gap:10px;align-items:center}
  .loading-bubble{background:white;border:1.5px solid #E8E2DC;border-radius:2px 12px 12px 12px;padding:12px 18px;display:flex;align-items:center;gap:10px}
  .loading-text{font-size:11px;color:#999}
  .dots{display:flex;gap:4px}
  .dot{width:6px;height:6px;border-radius:50%;background:#C0410A;animation:blink 1s infinite}
  .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
  @keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}

  #input-area{background:white;border-top:1.5px solid #E8E2DC;padding:14px 28px;position:sticky;bottom:0;box-shadow:0 -2px 10px rgba(0,0,0,0.05)}
  .input-row{display:flex;gap:10px;align-items:flex-end;max-width:900px;margin:0 auto}
  #user-input{flex:1;background:white;border:1.5px solid #E2DDD8;border-radius:8px;color:#1a1a1a;padding:10px 14px;font-size:12px;font-family:inherit;resize:none;outline:none;line-height:1.6;transition:border-color .18s}
  #user-input:focus{border-color:#C0410A}
  #user-input::placeholder{color:#AAA}
  #btn-send{background:#C0410A;border:none;border-radius:8px;color:white;padding:0 20px;height:46px;font-size:11px;font-weight:700;letter-spacing:.1em;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .18s;text-transform:uppercase}
  #btn-send:hover:not(:disabled){background:#A33508}
  #btn-send:disabled{background:#D4B8B0;cursor:not-allowed}
  .input-footer{font-size:9px;color:#CCC;text-align:center;margin-top:7px;letter-spacing:.08em}

  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#F0EDE8}::-webkit-scrollbar-thumb{background:#D4C8BF;border-radius:3px}
</style>
</head>
<body>

<div id="header">
  <div class="mars-ball"></div>
  <div style="flex:1">
    <div class="header-title">Mars VTOL // Tech Researcher Agent</div>
    <div class="header-sub">45kg Hybrid VTOL · Hexapod Spiders · EPM Payload · PX4+ROS2 · Autonomous</div>
  </div>
  <button id="btn-clear" onclick="clearChat()">Очистить</button>
</div>

<div id="toolbar">
  <button class="btn-weekly" onclick="sendWeekly()">📡 Weekly Report</button>
  <div class="sep"></div>
  <button class="btn-chip" onclick="sendQuery('Hexapod locomotion Mars terrain autonomous 2025')">🦿 Hexapod</button>
  <button class="btn-chip" onclick="sendQuery('EPM FluxGrip electro permanent magnet payload drone 2025')">🧲 EPM FluxGrip</button>
  <button class="btn-chip" onclick="sendQuery('VIO SLAM GPS-denied navigation PX4 ROS2 2025')">👁 VIO SLAM</button>
  <button class="btn-chip" onclick="sendQuery('hybrid turbine generator VTOL power system UAV')">⚡ Энергетика</button>
  <button class="btn-chip" onclick="sendQuery('local LLM embedded robotics Jetson edge inference 2025')">🤖 Edge LLM</button>
  <button class="btn-chip" onclick="sendQuery('dust protection radiation hardening Mars UAV')">🌪 Пыль/Радиация</button>
</div>

<div id="messages">
  <div class="empty-state" id="empty">
    <div class="empty-ball"></div>
    <div class="empty-title">Mars VTOL Tech Intelligence</div>
    <div class="empty-sub">Нажми <strong style="color:#C0410A">Weekly Report</strong> или задай вопрос по проекту</div>
    <div class="grid-cards">
      <div class="card"><div class="card-tag">VTOL</div><div class="card-desc">Аэродинамика и подъёмная сила в марсианской атмосфере</div></div>
      <div class="card"><div class="card-tag">HEXAPOD</div><div class="card-desc">Шагающие пауки для разведки поверхности</div></div>
      <div class="card"><div class="card-tag">EPM</div><div class="card-desc">Электро-постоянные магниты для payload-плиты</div></div>
      <div class="card"><div class="card-tag">AUTONOMY</div><div class="card-desc">PX4 + ROS2 + SLAM без GPS и связи с Землёй</div></div>
    </div>
  </div>
</div>

<div id="input-area">
  <div class="input-row">
    <textarea id="user-input" rows="2" placeholder="Запрос агенту... (Enter — отправить, Shift+Enter — новая строка)"></textarea>
    <button id="btn-send" onclick="sendInput()">→ Send</button>
  </div>
  <div class="input-footer">NASA · JPL · ESA · arXiv · IEEE · WEB SEARCH ENABLED · MARS VTOL AGENT v3</div>
</div>

<script>
const SYSTEM = \`Ты — узкоспециализированный агент-исследователь технологий ИСКЛЮЧИТЕЛЬНО под проект:
- 45 кг гибридный VTOL (электро lift + турбина-генератор)
- Десантирование суб-агентов (hexapod-пауки + суб-дроны)
- Универсальная payload-плита на Electro-Permanent Magnets (EPM / FluxGrip)
- Полная автономия без GPS/связи (PX4 + ROS 2 + VIO/SLAM + Behavior Tree + локальный LLM)
- Марсианские условия (пыль, тонкая атмосфера, радиация, энергетика)

ОБЯЗАТЕЛЬНЫЕ критерии оценки каждой технологии:
- Применимость к весу 45 кг, энергобюджету, механике, ПО проекта
- Возможность реализации в open-source стеке (PX4, ROS 2, Gazebo)
- Преимущества/риски именно для Марса
- Оценка применимости от 1 до 10 + рекомендации по интеграции

Приоритет источников: NASA, JPL, ESA, AIAA, IEEE, Nature.

ВСЕГДА отвечай в формате:

**Дата:** [дата]
**Найденные релевантные технологии**

1. **[Название]**
   - Источник: [название] — [ссылка]
   - Краткое описание: [2-3 предложения]
   - Оценка применимости: X/10
   - Идеи интеграции: [конкретно для PX4, ROS2, EPM, hexapod]

**Вывод и приоритеты:**
- Что внедрять в первую очередь
- Какие задачи создать в проекте\`;

const WEEKLY = \`Сделай недельный отчёт по новым технологиям для проекта Mars VTOL + Hexapod Spiders по темам:
1. Mars aerial vehicles / VTOL для Марса
2. Hexapod locomotion & autonomous robots
3. Electro-permanent magnets / FluxGrip
4. VIO/SLAM навигация без GPS
5. Локальные LLM для embedded robotics
6. Dustproofing & radiation hardening
7. Гибридные энергосистемы БПЛА
8. PX4 / ROS 2 новые релизы
Для каждой темы найди 1-2 релевантные технологии. Сводный вывод с приоритетами интеграции.\`;

let messages = [];
let loading = false;

function sendInput() {
  const val = document.getElementById('user-input').value.trim();
  if (!val) return;
  document.getElementById('user-input').value = '';
  sendQuery(val);
}

function sendWeekly() { sendQuery(WEEKLY); }

async function sendQuery(text) {
  if (!text || loading) return;
  setLoading(true);
  document.getElementById('empty')?.remove();
  document.getElementById('btn-clear').style.display = 'block';

  addBubble('user', text.length > 140 ? text.slice(0,140)+'…' : text);
  messages.push({ role: 'user', content: text });

  const loadId = addLoading();
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: SYSTEM, messages })
    });
    removeLoading(loadId);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
    const reply = data.content.filter(b => b.type === 'text').map(b => b.text).join('\\n');
    messages.push({ role: 'assistant', content: reply });
    addBubble('bot', reply);
  } catch(e) {
    removeLoading(loadId);
    addBubble('bot', '❌ Ошибка: ' + e.message, true);
  } finally {
    setLoading(false);
  }
}

function addBubble(role, text, error=false) {
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap';
  if (role === 'user') {
    wrap.innerHTML = \`<div class="msg-user"><div class="bubble-user">\${esc(text)}</div></div>\`;
  } else {
    wrap.innerHTML = \`<div class="msg-bot"><div class="bot-avatar"></div><div class="bubble-bot\${error?' bubble-error':''}">\${md(text)}</div></div>\`;
  }
  document.getElementById('messages').appendChild(wrap);
  wrap.scrollIntoView({ behavior:'smooth', block:'end' });
}

function addLoading() {
  const id = 'load-' + Date.now();
  const el = document.createElement('div');
  el.id = id; el.className = 'loading-wrap';
  el.innerHTML = \`<div class="bot-avatar"></div><div class="loading-bubble"><span class="loading-text">🔍 Ищу данные NASA / JPL / arXiv через Gemini</span><div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div></div>\`;
  document.getElementById('messages').appendChild(el);
  el.scrollIntoView({ behavior:'smooth', block:'end' });
  return id;
}
function removeLoading(id) { document.getElementById(id)?.remove(); }

function setLoading(val) {
  loading = val;
  document.querySelectorAll('.btn-weekly,.btn-chip').forEach(b => b.disabled = val);
  document.getElementById('btn-send').disabled = val;
}

function clearChat() {
  messages = [];
  document.getElementById('messages').innerHTML = '';
  document.getElementById('btn-clear').style.display = 'none';
}

function esc(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function md(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^- (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*?<\\/li>\\n?)+/gs, m=>\`<ul>\${m}</ul>\`)
    .replace(/\\n\\n+/g,'</p><p>')
    .replace(/\\n/g,'<br/>');
}

document.getElementById('user-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendInput(); }
});
</script>
</body>
</html>`;
