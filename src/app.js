/* ============================================================
   WUMMI HANGER — front logic (source)
   Build chạy: python build.py  ->  obfuscate + minify -> assets/
   ============================================================ */

(function () {
  "use strict";

  /* ---------------- phím tắt & bảo vệ trang ---------------- */
  (function safeGuards() {
    var block = function (e) {
      if (/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || "")) return;
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
  })();

  /* ---------------- tiện ích ---------------- */
  var $ = function (s) {
    return document.querySelector(s);
  };
  var $$ = function (s) {
    return document.querySelectorAll(s);
  };
  var shown = function (el) {
    return el && el.classList.remove("hidden");
  };
  var hidden = function (el) {
    return el && el.classList.add("hidden");
  };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var delayFor = function (i) {
    return (i % 12) * 40;
  };

  var TOKEN = localStorage.getItem("wummi_token") || "";
  var USER = null;
  var GUILDS = [];
  var GUILD_FILTER = "";
  var ACTIVE_GUILD = null;
  var HANGS = {};
  var XAMIC = {};
  var TIMER_INT = null;
  var QUEST_POLL = null;

  var TASK_LABEL = {
    WATCH_VIDEO: "XEM VIDEO",
    WATCH_VIDEO_ON_MOBILE: "XEM VIDEO MOBILE",
    PLAY_ON_DESKTOP: "CHƠI GAME",
    PLAY_ACTIVITY: "ACTIVITY",
    STREAM_ON_DESKTOP: "STREAM",
  };

  function api(path, method, body) {
    return fetch(path, {
      method: method || "GET",
      headers: { "Content-Type": "application/json", "X-Token": TOKEN },
      body: body ? JSON.stringify(body) : null,
    }).then(function (r) {
      return r.json();
    });
  }

  function toast(msg, type) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "toast show " + (type || "ok");
    clearTimeout(t._h);
    t._h = setTimeout(function () {
      t.classList.remove("show");
    }, 3200);
  }

  function iconUrl(g) {
    return g && g.icon ? "https://cdn.discordapp.com/icons/" + g.id + "/" + g.icon + ".png?size=128" : null;
  }

  function avatarUrl(u) {
    return u && u.avatar ? "https://cdn.discordapp.com/avatars/" + u.id + "/" + u.avatar + ".png?size=64" : null;
  }

  function showView(name) {
    $$(".view").forEach(function (v) {
      v.classList.remove("active");
    });
    var el = $("#view-" + name);
    if (el) el.classList.add("active");
  }

  function showMsg(text, isErr) {
    var m = $("#login-msg");
    if (!m) return;
    m.textContent = text;
    m.className = "msg " + (isErr ? "err" : "ok");
  }

  function fmtDuration(s) {
    var h = String(Math.floor(s / 3600)).padStart(2, "0");
    var m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    var sec = String(s % 60).padStart(2, "0");
    return h + ":" + m + ":" + sec;
  }

  /* ============================================================
     DASHBOARD (dựng bằng JS để không nằm trong HTML)
     ============================================================ */
  function dashShell() {
    return (
      '<header class="topbar glass">' +
      '<div class="brand">' +
      '<span class="brand-icon">🎧</span> ' +
      'WUMMI<span class="grad">HANGER</span>' +
      '<span class="tag-pro">PRO v3.0</span>' +
      "</div>" +
      '<div class="topbar-center">' +
      '<div class="status-pill live"><span class="pulse-dot"></span><span>CLOUD ENGINE 24/7 ACTIVE • HIGH-SPEED</span></div>' +
      "</div>" +
      '<div class="topbar-right">' +
      '<div id="user-chip" class="user-chip"></div>' +
      '<button id="btn-logout" class="btn-ghost-danger">Đăng xuất</button>' +
      "</div>" +
      "</header>" +
      '<main class="dash">' +

      '<aside class="panel glass guild-panel">' +
      '<div class="panel-head">' +
      '<div class="panel-title-wrap"><span class="panel-icon">🌐</span><h3>MÁY CHỦ DISCORD</h3></div>' +
      '<span id="guild-count" class="count">0</span>' +
      "</div>" +
      '<div class="search-box">' +
      '<span class="search-ic">&#128269;</span>' +
      '<input id="guild-search" type="text" placeholder="Tìm kiếm máy chủ..." autocomplete="off" spellcheck="false">' +
      "</div>" +
      '<div id="guild-list" class="list"></div>' +
      "</aside>" +

      '<section class="panel glass chan-panel">' +
      '<div class="panel-head">' +
      '<div class="panel-title-wrap"><span class="panel-icon">🔊</span><h3 id="chan-title">CHỌN SERVER</h3></div>' +
      "</div>" +
      '<div id="channel-list" class="list"></div>' +
      "</section>" +

      '<aside class="panel glass hang-panel">' +
      '<div class="panel-head">' +
      '<div class="panel-title-wrap"><span class="panel-icon">🎙️</span><h3>VOICE STUDIO 24/7</h3></div>' +
      '<span id="hang-count" class="count">0</span>' +
      "</div>" +
      '<div class="hang-box">' +
      '<div id="hang-status" class="hang-status idle">Chưa treo kênh nào</div>' +
      '<div id="hang-list" class="hang-list"></div>' +
      '<button id="btn-stop-all" class="btn-danger hidden">Ngừng tất cả voice</button>' +
      "</div>" +
      '<div class="hang-note">' +
      '<span class="note-bullet">💡</span> Treo voice 24/7 tự động duy trì. Xả mic sử dụng chuẩn mã hóa mới nhất AEAD AES256-GCM. (Lưu ý: Chạy trên máy tính hoặc VPS để truyền gói tin UDP voice không bị nhà cung cấp mạng chặn).' +
      "</div>" +
      "</aside>" +

      '<section class="panel glass quest-panel">' +
      '<div class="panel-head">' +
      '<div class="panel-title-wrap"><span class="panel-icon">🎯</span><h3>DISCORD QUEST HUB</h3><span id="quest-count" class="count">0</span></div>' +
      '<div class="quest-actions">' +
      '<label class="switch"><input type="checkbox" id="quest-auto-accept" checked><span>Auto nhận quest</span></label>' +
      '<button id="btn-quest-toggle" class="btn-join">Bật Auto Quest</button>' +
      "</div>" +
      "</div>" +
      '<div id="quest-list" class="quest-grid"></div>' +
      '<div class="terminal-card glass">' +
      '<div class="terminal-head">' +
      '<div class="terminal-head-left">' +
      '<div class="terminal-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
      '<div class="terminal-title"><span class="term-prompt">$</span> <span>CONSOLE LOGS // AUTO QUEST WORKER</span></div>' +
      "</div>" +
      '<div class="terminal-head-right">' +
      '<span id="quest-running" class="qstate idle">ĐANG TẮT</span>' +
      '<button type="button" id="btn-copy-log" class="btn-term-action" title="Sao chép toàn bộ logs">📋 Copy</button>' +
      '<button type="button" id="btn-clear-log" class="btn-term-action" title="Xóa logs">🗑️ Xóa</button>' +
      '<label class="terminal-autoscroll"><input type="checkbox" id="chk-autoscroll" checked><span>Tự cuộn</span></label>' +
      "</div>" +
      "</div>" +
      '<div id="quest-log" class="terminal-body"></div>' +
      "</div>" +
      '<div class="hang-note">' +
      '<span class="note-bullet">🚀</span> Tự động nhận và xử lý song song tất cả các nhiệm vụ Discord khả dụng. Log hiển thị tiến độ thời gian thực.' +
      "</div>" +
      "</section>" +
      "</main>"
    );
  }

  /* ---------------- hang / timer ---------------- */
  function renderHangPanel() {
    var keys = Object.keys(HANGS);
    var status = $("#hang-status");
    var box = $("#hang-list");
    if (!$("#hang-count")) return;
    $("#hang-count").textContent = keys.length;
    if (!keys.length) {
      status.className = "hang-status idle";
      status.textContent = "Chưa treo kênh nào";
      box.innerHTML = "";
      hidden($("#btn-stop-all"));
      return;
    }
    var xaOn = keys.some(function (k) {
      return !!XAMIC[k];
    });
    status.className = "hang-status live";
    status.textContent = "ĐANG TREO " + keys.length + " KÊNH" + (xaOn ? " • XẢ MIC" : "");
    shown($("#btn-stop-all"));

    var existingItems = box.querySelectorAll(".hang-item");
    var currentKeys = Array.prototype.map.call(existingItems, function (el) {
      return el.getAttribute("data-key");
    });
    var keysMatch = keys.length === currentKeys.length && keys.every(function (k, idx) {
      return k === currentKeys[idx];
    });

    if (keysMatch) {
      keys.forEach(function (key) {
        var el = box.querySelector('.hang-item[data-key="' + key + '"]');
        if (!el) return;
        var h = HANGS[key];
        var s = Math.max(0, Math.floor((Date.now() - h.started_at * 1000) / 1000));
        var timeEl = el.querySelector(".hang-item-time");
        if (timeEl) timeEl.textContent = fmtDuration(s);
        var isXa = !!XAMIC[key];
        var btnXa = el.querySelector(".btn-xa");
        if (btnXa) {
          btnXa.className = "btn-xa sm" + (isXa ? " active" : "");
          btnXa.textContent = isXa ? "Ngừng xả mic" : "Xả mic";
          if (h.xa_stage) btnXa.title = "Xả mic: " + h.xa_stage;
        }
        var wave = el.querySelector(".audio-wave");
        if (wave) wave.className = "audio-wave" + (isXa ? " active" : "");
      });
      return;
    }

    box.innerHTML = "";
    keys.forEach(function (key, i) {
      var h = HANGS[key];
      if (!h) return;
      var s = Math.max(0, Math.floor((Date.now() - h.started_at * 1000) / 1000));
      var isXa = !!XAMIC[key];
      var el = document.createElement("div");
      el.className = "hang-item";
      el.setAttribute("data-key", key);
      el.style.animationDelay = delayFor(i) + "ms";
      el.innerHTML =
        '<div class="hang-item-info">' +
        '<b class="hang-title"><span class="hang-dot"></span> ' + esc(h.guild_name) + " / " + esc(h.channel_name) + "</b>" +
        '<div class="hang-meta-row">' +
        '<span class="hang-item-time">' + fmtDuration(s) + "</span>" +
        '<div class="audio-wave' + (isXa ? " active" : "") + '"><span></span><span></span><span></span><span></span></div>' +
        "</div>" +
        "</div>" +
        '<div class="hang-item-actions">' +
        '<button type="button" class="btn-xa sm' + (isXa ? " active" : "") + '"' +
        (h.xa_stage ? ' title="Xả mic: ' + esc(h.xa_stage) + '"' : "") + ">" +
        (isXa ? "Ngừng xả mic" : "Xả mic") +
        "</button>" +
        '<button type="button" class="btn-danger sm">Ngừng</button>' +
        "</div>";
      el.querySelector(".btn-xa").addEventListener("click", function () {
        toggleXamic(key);
      });
      el.querySelector(".btn-danger").addEventListener("click", function () {
        stopHang(key);
      });
      box.appendChild(el);
    });
  }

  function toggleXamic(key) {
    var h = HANGS[key];
    if (!h) return;
    var on = !!XAMIC[key];
    api("/api/xamic", "POST", {
      action: on ? "stop" : "start",
      guild_id: h.guild_id,
      channel_id: h.channel_id,
      guild_name: h.guild_name,
      channel_name: h.channel_name,
    }).then(function (r) {
      if (!r.ok) return toast(r.error || "Thao tác thất bại", "err");
      XAMIC[key] = !on;
      renderHangPanel();
      toast(on ? "Đã ngừng xả mic" : "Xả mic đang phát liên tục", on ? "ok" : "err");
    });
  }

  function startTimers() {
    clearInterval(TIMER_INT);
    renderHangPanel();
    TIMER_INT = setInterval(function () {
      if (Date.now() - (startTimers._lastXaPoll || 0) > 3000) {
        startTimers._lastXaPoll = Date.now();
        refreshXaStages();
      }
      renderHangPanel();
    }, 1000);
  }

  function refreshXaStages() {
    api("/api/xamic/status").then(function (r) {
      if (!r.ok || !r.items) return;
      Object.keys(r.items).forEach(function (k) {
        var h = HANGS[k];
        var it = r.items[k];
        if (h && it && it.stage) h.xa_stage = it.stage;
      });
    }).catch(function () {});
  }

  function isHanging(gid, cid) {
    return !!HANGS[gid + ":" + cid];
  }

  /* ---------------- login ---------------- */
  function doLogin() {
    var token = $("#token-input").value.trim();
    if (!token) return toast("Vui lòng nhập token", "err");
    var btn = $("#btn-login");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Đang kết nối...';
    showMsg("", false);
    api("/api/login", "POST", { token: token }).then(function (r) {
      btn.disabled = false;
      btn.innerHTML = 'Kết nối <span class="btn-arrow">&rarr;</span>';
      if (!r.ok) {
        showMsg(r.error || "Đăng nhập thất bại", true);
        return;
      }
      TOKEN = token;
      try {
        localStorage.setItem("wummi_token", token);
      } catch (e) {}
      USER = r.user;
      loadDashboard();
    });
  }

  /* ---------------- dashboard ---------------- */
  function renderUserChip() {
    var chip = $("#user-chip");
    if (!chip || !USER) return;
    var av = avatarUrl(USER);
    if (av) {
      chip.innerHTML =
        '<img class="avatar" src="' + av + '" alt="">' +
        '<div class="uinfo"><b>' + esc(USER.username) + "</b><span>" + esc(USER.id) + "</span></div>";
    } else {
      chip.innerHTML =
        '<div class="avatar ph">' + esc((USER.username || "?").charAt(0).toUpperCase()) + "</div>" +
        '<div class="uinfo"><b>' + esc(USER.username) + "</b><span>" + esc(USER.id) + "</span></div>";
    }
  }

  function filteredGuilds() {
    var f = GUILD_FILTER.trim().toLowerCase();
    if (!f) return GUILDS;
    return GUILDS.filter(function (g) {
      return (g.name || "").toLowerCase().indexOf(f) > -1 || (g.id || "").indexOf(f) > -1;
    });
  }

  function renderGuilds() {
    var list = $("#guild-list");
    if (!list) return;
    var items = filteredGuilds();
    $("#guild-count").textContent = GUILDS.length;
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = GUILDS.length
        ? '<div class="empty">Không tìm thấy server</div>'
        : '<div class="empty">Không có server nào</div>';
      return;
    }
    items.forEach(function (g, i) {
      var item = document.createElement("div");
      item.className = "guild-item" + (ACTIVE_GUILD === g.id ? " active" : "");
      item.style.animationDelay = delayFor(i) + "ms";
      var img = iconUrl(g);
      item.innerHTML = img
        ? '<img class="g-icon" src="' + img + '" onerror="this.remove()" alt="">' +
          '<div class="g-meta"><b>' + esc(g.name) + "</b><span>" + esc(g.id) + "</span></div>"
        : '<div class="g-icon ph">' + esc((g.name || "?").charAt(0).toUpperCase()) + "</div>" +
          '<div class="g-meta"><b>' + esc(g.name) + "</b><span>" + esc(g.id) + "</span></div>";
      item.addEventListener("click", function () {
        selectGuild(g.id);
      });
      list.appendChild(item);
    });
  }

  function selectGuild(gid) {
    ACTIVE_GUILD = gid;
    renderGuilds();
    var g = GUILDS.find(function (x) {
      return x.id === gid;
    });
    var title = $("#chan-title");
    if (title) title.innerHTML = "&Sigma; " + esc(g ? g.name : "?");
    var box = $("#channel-list");
    box.innerHTML = '<div class="empty"><span class="spinner"></span> Đang tải kênh...</div>';
    api("/api/guilds/" + gid + "/channels").then(function (r) {
      if (!r.ok) {
        box.innerHTML = '<div class="empty">' + esc(r.error || "Lỗi") + "</div>";
        return;
      }
      box.innerHTML = "";
      if (!r.channels.length) {
        box.innerHTML = '<div class="empty">Server này không có kênh voice</div>';
        return;
      }
      r.channels.forEach(function (c, i) {
        var item = document.createElement("div");
        item.className = "chan-item";
        item.style.animationDelay = delayFor(i) + "ms";
        var key = gid + ":" + c.id;
        var isActive = isHanging(gid, c.id);
        item.innerHTML =
          '<div class="c-icon">&#127908;</div>' +
          '<div class="c-meta"><b>' + esc(c.name) + "</b><span>Kênh voice</span></div>" +
          '<button type="button" class="btn-join' + (isActive ? " active" : "") + '">' +
          (isActive ? "&#10003; Đang treo" : "Treo voice") +
          "</button>";
        var btn = item.querySelector(".btn-join");
        btn.addEventListener("click", function () {
          if (isHanging(gid, c.id)) return stopHang(key);
          btn.disabled = true;
          btn.textContent = "Đang treo...";
          api("/api/hang", "POST", {
            guild_id: gid,
            channel_id: c.id,
            guild_name: g.name,
            channel_name: c.name,
          }).then(function (rr) {
            btn.disabled = false;
            if (!rr.ok) {
              btn.textContent = "Treo voice";
              return toast(rr.error || "Không thể treo voice", "err");
            }
            HANGS[key] = {
              started_at: rr.started_at,
              guild_id: gid,
              channel_id: c.id,
              guild_name: g.name,
              channel_name: c.name,
            };
            startTimers();
            toast("Đã treo voice vào " + c.name, "ok");
            selectGuild(gid);
          });
        });
        box.appendChild(item);
      });
    });
  }

  function stopHang(key) {
    var h = HANGS[key];
    if (!h) return;
    if (XAMIC[key]) {
      api("/api/xamic", "POST", { action: "stop", guild_id: h.guild_id, channel_id: h.channel_id });
      delete XAMIC[key];
    }
    api("/api/stop", "POST", { guild_id: h.guild_id, channel_id: h.channel_id }).then(function () {
      delete HANGS[key];
      renderHangPanel();
      toast("Đã ngừng treo voice", "ok");
      if (ACTIVE_GUILD) selectGuild(ACTIVE_GUILD);
    });
  }

  function stopAllHangs() {
    api("/api/stop", "POST", {}).then(function () {
      HANGS = {};
      XAMIC = {};
      renderHangPanel();
      toast("Đã ngừng tất cả voice", "ok");
      if (ACTIVE_GUILD) selectGuild(ACTIVE_GUILD);
    });
  }

  function loadDashboard() {
    api("/api/guilds").then(function (r) {
      if (!r.ok) return logout();
      GUILDS = r.guilds;
      $("#view-dash").innerHTML = dashShell();
      renderUserChip();
      renderGuilds();

      $("#guild-search").addEventListener("input", function (e) {
        GUILD_FILTER = e.target.value;
        renderGuilds();
      });
      $("#btn-logout").addEventListener("click", logout);
      $("#btn-stop-all").addEventListener("click", stopAllHangs);
      $("#btn-quest-toggle").addEventListener("click", toggleQuest);

      var copyLogBtn = $("#btn-copy-log");
      if (copyLogBtn) {
        copyLogBtn.addEventListener("click", function () {
          var logEl = $("#quest-log");
          if (!logEl || !logEl.innerText) return toast("Chưa có logs để sao chép", "err");
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(logEl.innerText).then(function () {
              toast("Đã sao chép toàn bộ logs", "ok");
            }).catch(function () {
              toast("Không thể sao chép logs", "err");
            });
          }
        });
      }

      var clearLogBtn = $("#btn-clear-log");
      if (clearLogBtn) {
        clearLogBtn.addEventListener("click", function () {
          var logEl = $("#quest-log");
          if (logEl) logEl.innerHTML = '<div class="log-empty"><span class="empty-term-icon">⚡</span><span>Đã xóa nhật ký. Chờ sự kiện tiếp theo...</span></div>';
          toast("Đã xóa nhật ký", "ok");
        });
      }

      api("/api/status").then(function (st) {
        if (st.ok && st.hangs && st.hangs.length) {
          HANGS = {};
          XAMIC = {};
          st.hangs.forEach(function (h) {
            HANGS[h.key] = h;
            if (h.xamic) XAMIC[h.key] = true;
          });
          startTimers();
          toast("Đã nối lại phiên treo voice", "ok");
        }
      });

      refreshQuests();
      clearInterval(QUEST_POLL);
      QUEST_POLL = setInterval(refreshQuests, 5000);
      showView("dash");
    });
  }

  /* ---------------- quest ---------------- */
  function refreshQuests() {
    Promise.all([api("/api/quests"), api("/api/quests/status")]).then(function (res) {
      var r = res[0];
      var s = res[1];
      if (!r.ok || !s.ok) return;
      renderQuestToggle(!!r.running, s.auto_accept);
      renderQuestList(r.quests || []);
      renderQuestLog(s.logs || []);
    }).catch(function () {});
  }

  function renderQuestToggle(running, autoAccept) {
    var sw = $("#quest-auto-accept");
    if (sw) sw.checked = autoAccept !== false;
    var btn = $("#btn-quest-toggle");
    if (!btn) return;
    btn.textContent = running ? "Tắt Auto Quest" : "Bật Auto Quest";
    btn.classList.toggle("active", running);
    btn.disabled = false;
    var qr = $("#quest-running");
    qr.textContent = running ? "ĐANG CHẠY" : "ĐANG TẮT";
    qr.className = "qstate " + (running ? "run" : "idle");
  }

  function renderQuestList(quests) {
    var box = $("#quest-list");
    if (!box) return;
    $("#quest-count").textContent = quests.length;
    if (!quests.length) {
      box.className = "quest-grid empty-wrap";
      box.innerHTML =
        '<div class="empty-quest-card">' +
        '<span class="empty-quest-icon">🎯</span>' +
        '<b>Không có nhiệm vụ Discord nào</b>' +
        '<span>Hãy kiểm tra tab Quest trong Cài đặt người dùng Discord để xác nhận tài khoản có nhiệm vụ</span>' +
        '</div>';
      return;
    }
    box.className = "quest-grid";

    var existingItems = box.querySelectorAll(".quest-card");
    var currentIds = Array.prototype.map.call(existingItems, function (el) {
      return el.getAttribute("data-id");
    });
    var ids = quests.map(function (q) { return String(q.id); });
    var idsMatch = ids.length === currentIds.length && ids.every(function (id, idx) {
      return id === currentIds[idx];
    });

    if (idsMatch) {
      quests.forEach(function (q) {
        var el = box.querySelector('.quest-card[data-id="' + q.id + '"]');
        if (!el) return;
        var pct = q.target > 0 ? Math.min(100, Math.round((q.value / q.target) * 100)) : (q.completed ? 100 : 0);
        var fill = el.querySelector(".quest-fill");
        if (fill) fill.style.width = pct + "%";
        var progVal = el.querySelector(".quest-prog-val");
        if (progVal) progVal.textContent = q.target ? (Math.min(q.value, q.target) + "/" + q.target + "s (" + pct + "%)") : (q.completed ? "100%" : "");
        var statusBadge = el.querySelector(".quest-badge-state");
        var btnClaim = el.querySelector(".btn-quest-primary");
        if (q.completed) {
          if (statusBadge) { statusBadge.className = "quest-badge-state done"; statusBadge.textContent = "Hoàn thành"; }
          if (btnClaim) { btnClaim.className = "btn-quest-primary ready"; btnClaim.textContent = "Nhận phần thưởng"; }
        } else if (q.enrolled) {
          if (statusBadge) { statusBadge.className = "quest-badge-state run"; statusBadge.textContent = "Đang chạy " + pct + "%"; }
          if (btnClaim) { btnClaim.className = "btn-quest-primary running"; btnClaim.innerHTML = '<span class="quest-spinner"></span> Đang tự chạy ✦'; }
        } else {
          if (statusBadge) { statusBadge.className = "quest-badge-state idle"; statusBadge.textContent = "Chưa nhận"; }
          if (btnClaim) { btnClaim.className = "btn-quest-primary idle"; btnClaim.textContent = "Nhận nhiệm vụ"; }
        }
      });
      return;
    }

    box.innerHTML = "";
    quests.forEach(function (q, i) {
      var el = document.createElement("div");
      el.className = "quest-card";
      el.setAttribute("data-id", q.id);
      el.style.animationDelay = (i * 60) + "ms";
      var pct = q.target > 0 ? Math.min(100, Math.round((q.value / q.target) * 100)) : (q.completed ? 100 : 0);
      var banner = q.banner_url || "";
      var rewardIcon = q.reward_icon || "/assets/orb-icon.svg";
      var publisher = q.publisher || "Universal Pictures";
      var expiry = q.expires_str ? ("Kết thúc vào " + esc(q.expires_str)) : "Đang diễn ra";
      var questTag = "NHIỆM VỤ " + esc((q.name || "DISCORD QUEST").toUpperCase());
      var rewardTitle = "Nhận ✦ " + esc(q.reward_name || "200 Orbs");
      var desc = esc(q.desc || "Xem video để nhận được 200 Orbs!");
      
      var claimClass = q.completed ? "ready" : (q.enrolled ? "running" : "idle");
      var claimText = q.completed ? "Nhận phần thưởng" : (q.enrolled ? '<span class="quest-spinner"></span> Đang tự chạy ✦' : "Nhận nhiệm vụ");
      var statusClass = q.completed ? "done" : (q.enrolled ? "run" : "idle");
      var statusText = q.completed ? "Hoàn thành" : (q.enrolled ? ("Đang chạy " + pct + "%") : "Chưa nhận");

      el.innerHTML =
        '<div class="quest-card-hero' + (!banner ? " no-banner" : "") + '">' +
          (banner ? '<img class="quest-banner-img" src="' + banner + '" onerror="this.parentElement.classList.add(\'no-banner\');this.remove();" alt="">' : '') +
          '<div class="quest-hero-overlay"></div>' +
          '<div class="quest-hero-top-btns">' +
            '<button type="button" class="btn-hero-icon" title="Xem trước video"><span class="play-tri">▶</span></button>' +
            '<button type="button" class="btn-hero-icon" title="Tùy chọn">&#8226;&#8226;&#8226;</button>' +
          '</div>' +
          '<div class="quest-hero-title-overlay">' + esc(q.name) + '</div>' +
        '</div>' +
        '<div class="quest-meta-bar">' +
          '<div class="quest-publisher-wrap">' +
            '<span>Được quảng bá bởi</span> ' +
            '<span class="verified-check" title="Đã xác minh">✓</span> ' +
            '<b>' + esc(publisher) + '</b>' +
          '</div>' +
          '<span class="quest-expiry-text">' + expiry + '</span>' +
        '</div>' +
        '<div class="quest-card-body">' +
          '<div class="quest-orb-wrapper">' +
            '<div class="quest-orb-glow-ring">' +
              '<img class="quest-orb-img" src="' + rewardIcon + '" onerror="this.onerror=null;this.src=\'/assets/orb-icon.svg\'" alt="Orbs">' +
            '</div>' +
          '</div>' +
          '<div class="quest-details">' +
            '<div class="quest-type-label">' + questTag + '</div>' +
            '<div class="quest-reward-headline">' + rewardTitle + '</div>' +
            '<div class="quest-subtitle">' + desc + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="quest-progress-section">' +
          '<div class="quest-bar"><div class="quest-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="quest-prog-row">' +
            '<span class="quest-badge-state ' + statusClass + '">' + statusText + '</span>' +
            '<span class="quest-prog-val">' + (q.target ? (Math.min(q.value, q.target) + "/" + q.target + "s (" + pct + "%)") : "") + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="quest-card-btns">' +
          '<button type="button" class="btn-quest-sub">Tham Gia Máy C...</button>' +
          '<button type="button" class="btn-quest-primary ' + claimClass + '">' + claimText + '</button>' +
        '</div>';

      box.appendChild(el);
    });
  }

  function formatLogLine(line) {
    var safe = esc(line);
    safe = safe.replace(/^\[(\d{2}:\d{2}:\d{2})\]/, '<span class="log-time">[$1]</span>');
    safe = safe.replace(/\[Auto Quest\]/g, '<span class="log-tag auto">[Auto Quest]</span>');
    safe = safe.replace(/\[Activity\]/g, '<span class="log-tag act">[Activity]</span>');
    safe = safe.replace(/\[(WATCH_VIDEO|PLAY_ON_DESKTOP|STREAM_ON_DESKTOP)\]/g, '<span class="log-tag task">[$1]</span>');
    safe = safe.replace(/(Hoàn thành[^\n<]*|thành công[^\n<]*)/gi, '<span class="log-ok">$1</span>');
    safe = safe.replace(/(Rate limited[^\n<]*|Lỗi[^\n<]*|Bỏ sau[^\n<]*)/gi, '<span class="log-warn">$1</span>');
    safe = safe.replace(/(Tiến độ: \d+\/\d+s)/gi, '<span class="log-prog">$1</span>');
    return '<div class="log-line">' + safe + '</div>';
  }

  function renderQuestLog(logs) {
    var el = $("#quest-log");
    if (!el) return;
    if (!logs.length) {
      el.innerHTML = '<div class="log-empty"><span class="empty-term-icon">⚡</span><span>Chưa có nhật ký. Bật Auto Quest để bắt đầu tiến trình chạy ngầm.</span></div>';
      return;
    }
    var autoScroll = $("#chk-autoscroll") ? $("#chk-autoscroll").checked : true;
    var html = logs.slice(-150).map(formatLogLine).join("");
    el.innerHTML = html;
    if (autoScroll) el.scrollTop = el.scrollHeight;
  }

  function toggleQuest() {
    var btn = $("#btn-quest-toggle");
    btn.disabled = true;
    var running = btn.classList.contains("active");
    api(running ? "/api/quests/stop" : "/api/quests/start", "POST", {
      auto_accept: $("#quest-auto-accept").checked,
    }).then(function (r) {
      if (!r.ok) {
        btn.disabled = false;
        return toast(r.error || "Thao tác thất bại", "err");
      }
      toast(running ? "Đã tắt Auto Quest" : "Đã bật Auto Quest", "ok");
      refreshQuests();
    });
  }

  /* ---------------- khác ---------------- */
  function logout() {
    api("/api/logout", "POST", {}).then(function () {
      clearInterval(QUEST_POLL);
      try {
        localStorage.removeItem("wummi_token");
      } catch (e) {}
      location.reload();
    });
  }

  function tickClock() {
    var d = new Date();
    var c = $("#clock");
    var dt = $("#date");
    if (c)
      c.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (x) {
        return String(x).padStart(2, "0");
      }).join(":");
    if (dt)
      dt.textContent = d.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
  }

  /* ---------------- starfield ---------------- */
  var cv = $("#bg");
  var ctx = cv.getContext("2d");
  var P = [];
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var raf = null;

  function resize() {
    cv.width = innerWidth * DPR;
    cv.height = innerHeight * DPR;
    cv.style.width = innerWidth + "px";
    cv.style.height = innerHeight + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = Math.max(40, Math.min(130, Math.round((innerWidth * innerHeight) / 16000)));
    P = [];
    for (var i = 0; i < n; i++) P.push(mkP());
  }

  function mkP() {
    return {
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * 2.2 + 0.4,
      v: Math.random() * 0.4 + 0.1,
      a: Math.random() * 0.5 + 0.12,
      tw: Math.random() * Math.PI * 2,
    };
  }

  function anim() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      p.y -= p.v;
      p.tw += 0.02;
      if (p.y < -5) {
        p.y = innerHeight + 5;
        p.x = Math.random() * innerWidth;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 7);
      ctx.fillStyle = "rgba(167,139,250," + p.a * (0.6 + 0.4 * Math.sin(p.tw)).toFixed(3) + ")";
      ctx.fill();
    }
    raf = requestAnimationFrame(anim);
  }

  function stopAnim() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopAnim();
    else if (!raf) anim();
  });

  /* ---------------- init ---------------- */
  function init() {
    tickClock();
    setInterval(tickClock, 1000);

    addEventListener("resize", function () {
      resize();
    });
    resize();
    anim();

    $("#btn-login").addEventListener("click", doLogin);
    $("#token-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") doLogin();
    });

    var toggleBtn = $("#btn-toggle-token");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        var inp = $("#token-input");
        if (!inp) return;
        var isPass = inp.type === "password";
        inp.type = isPass ? "text" : "password";
        toggleBtn.textContent = isPass ? "🙈" : "👁️";
      });
    }

    var pasteBtn = $("#btn-paste-token");
    if (pasteBtn) {
      pasteBtn.addEventListener("click", function () {
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(function (clipText) {
            if (clipText) {
              $("#token-input").value = clipText.trim();
              toast("Đã dán token thành công", "ok");
            }
          }).catch(function () {
            toast("Không thể tự động đọc clipboard, hãy dán thủ công", "err");
          });
        } else {
          toast("Trình duyệt không hỗ trợ đọc clipboard", "err");
        }
      });
    }

    if (TOKEN) {
      api("/api/status").then(function (st) {
        if (st.ok && st.user) {
          USER = st.user;
          loadDashboard();
        } else {
          try {
            localStorage.removeItem("wummi_token");
          } catch (e) {}
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();