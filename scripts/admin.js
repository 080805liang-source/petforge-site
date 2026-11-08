(() => {
  const config = window.PETFORGE_MEMBERSHIP;
  const loginCard = document.querySelector("#admin-login-card");
  const dashboard = document.querySelector("#admin-dashboard");
  const loginForm = document.querySelector("#admin-login-form");
  const loginSubmit = document.querySelector("#admin-login-submit");
  const loginNote = document.querySelector("#admin-login-note");
  const refreshButton = document.querySelector("#admin-refresh");
  const signoutButton = document.querySelector("#admin-signout");
  const state = { offset: 0, limit: 20, totalUsers: 0, feedbackOffset: 0, codesOffset: 0 };

  const api = async (path, options = {}) => {
    if (!config?.apiUrl) throw new Error("账号服务暂未配置。");
    const response = await window.PetForgeSession.fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "请求失败，请稍后重试。");
    return body;
  };
  const number = (value) => new Intl.NumberFormat("zh-CN").format(Number(value || 0));
  const date = (value) => value ? new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—";
  const statusLabel = (status) => ({ open: "待处理", in_progress: "处理中", resolved: "已解决" }[status] || status);
  const categoryLabel = (category) => ({ bug: "功能异常", account: "账号登录", payment: "会员码与次数", idea: "改进建议", other: "其他" }[category] || "其他");

  function showDashboard() { loginCard.hidden = true; dashboard.hidden = false; signoutButton.hidden = false; refreshButton.hidden = false; document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("zh-CN", { dateStyle: "full" }).format(new Date()); loadOverview(); loadUsers(); loadFeedback(); loadCodes(); }
  function showLogin(message = "") { loginCard.hidden = false; dashboard.hidden = true; signoutButton.hidden = true; refreshButton.hidden = true; loginNote.textContent = message; document.querySelector("#code-output").value = ""; document.querySelector("#code-results").hidden = true; }
  function renderMetrics(metrics) {
    const values = [["metric-users", metrics.users], ["metric-generations", metrics.generations], ["metric-views", metrics.pageViews], ["metric-feedback", metrics.openFeedback]];
    values.forEach(([id, value]) => { const node = document.querySelector(`#${id}`); if (node) node.textContent = number(value); });
    document.querySelector("#metric-today-users").textContent = number(metrics.todayUsers);
    document.querySelector("#metric-active-users").textContent = number(metrics.activeUsers);
    document.querySelector("#metric-today-generations").textContent = number(metrics.todayGenerations);
    document.querySelector("#metric-today-views").textContent = number(metrics.todayPageViews);
    document.querySelector("#sidebar-feedback-count").textContent = number(metrics.openFeedback);
    const notices = [];
    if (metrics.openFeedback > 0) notices.push(`有 ${number(metrics.openFeedback)} 条反馈等待跟进，建议先检查账号、会员码和生成功能的问题。`);
    if (metrics.todayUsers > 0) notices.push(`今天新增 ${number(metrics.todayUsers)} 位用户。`);
    if (metrics.todayGenerations > 0) notices.push(`今天已生成 ${number(metrics.todayGenerations)} 次桌宠。`);
    if (!notices.length) notices.push("当前没有待处理反馈。邀请用户体验后，可在这里关注使用数据与新问题。");
    document.querySelector("#operations-brief").textContent = notices.join(" ");
  }
  function renderActivity(activity) {
    const chart = document.querySelector("#activity-chart");
    if (!activity.some((item) => item.views || item.generations)) { chart.innerHTML = '<p class="loading-line">暂时没有访问与生成记录。用户开始使用后，趋势会显示在这里。</p>'; return; }
    const max = Math.max(1, ...activity.flatMap((item) => [item.views, item.generations]));
    chart.innerHTML = activity.map((item) => `<div class="chart-day"><div class="chart-bars"><i class="chart-bar" style="height:${Math.max(2, item.views / max * 100)}%" title="浏览 ${number(item.views)}"></i><i class="chart-bar generation" style="height:${Math.max(2, item.generations / max * 100)}%" title="生成 ${number(item.generations)}"></i></div><label>${item.day.slice(5)}</label></div>`).join("");
  }
  function renderPages(pages) {
    const node = document.querySelector("#page-totals");
    const labels = { home: "封面", creator: "创作台", workshop: "工坊", support: "支持" };
    const max = Math.max(1, ...pages.map((item) => item.views));
    node.innerHTML = pages.map((item) => `<div class="page-total-row"><span>${labels[item.page] || item.page}</span><div class="progress-track"><i style="width:${Math.max(item.views ? 5 : 0, item.views / max * 100)}%"></i></div><strong>${number(item.views)}</strong></div>`).join("");
  }
  function renderUsers(users, total = 0) {
    const body = document.querySelector("#users-table");
    state.totalUsers = total;
    body.innerHTML = users.length ? users.map((user) => `<tr><td>${escapeHtml(user.identity || "匿名账号")}</td><td>${date(user.createdAt)}</td><td>${number(user.usageCount)}</td><td>${user.isAdmin ? "无限" : user.membershipActive ? `会员至 ${date(user.vipExpiresAt)}` : number(user.credits)}</td><td><span class="user-role ${user.isAdmin ? "admin" : ""}">${user.isAdmin ? "管理员" : "用户"}</span></td></tr>`).join("") : `<tr><td colspan="5" class="empty-cell">暂时还没有用户记录。</td></tr>`;
    document.querySelector("#users-page-note").textContent = total ? `显示 ${state.offset + 1}–${Math.min(state.offset + users.length, total)}，共 ${number(total)} 位` : "暂无用户";
    document.querySelector("#users-prev").disabled = state.offset <= 0;
    document.querySelector("#users-next").disabled = state.offset + state.limit >= total;
  }
  function renderFeedback(items, total) {
    const list = document.querySelector("#feedback-list");
    list.innerHTML = items.length ? items.map((item) => `<article class="feedback-item"><div class="feedback-item-head"><span class="feedback-category">${categoryLabel(item.category)}</span><span class="status-pill ${item.status}">${statusLabel(item.status)}</span><time class="feedback-date">${date(item.createdAt)}</time></div><p class="feedback-message">${escapeHtml(item.message)}</p>${item.details ? `<p class="feedback-details">${escapeHtml(item.details)}</p>` : ""}<span class="feedback-contact">联系方式：${escapeHtml(item.contact || "未提供")}</span><div class="feedback-actions"><label>处理状态<select data-feedback-id="${escapeHtml(item.id)}"><option value="open" ${item.status === "open" ? "selected" : ""}>待处理</option><option value="in_progress" ${item.status === "in_progress" ? "selected" : ""}>处理中</option><option value="resolved" ${item.status === "resolved" ? "selected" : ""}>已解决</option></select></label></div></article>`).join("") : `<p class="empty-cell">当前筛选下没有反馈。</p>`;
    document.querySelector("#feedback-total").textContent = `共 ${number(total)} 条反馈`;
    document.querySelector("#feedback-prev").disabled = state.feedbackOffset <= 0;
    document.querySelector("#feedback-next").disabled = state.feedbackOffset + 20 >= total;
  }
  function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
  async function loadOverview() {
    try { const data = await api("/admin/overview"); renderMetrics(data.metrics); renderActivity(data.activity); renderPages(data.pageTotals); }
    catch (error) { showLogin(error.message); }
  }
  async function loadUsers() {
    try { const data = await api(`/admin/users?offset=${state.offset}&limit=${state.limit}`); renderUsers(data.users || [], data.total); }
    catch (error) { document.querySelector("#users-table").innerHTML = `<tr><td colspan="5" class="empty-cell">${escapeHtml(error.message)}</td></tr>`; }
  }
  async function loadFeedback() {
    const filter = document.querySelector("#feedback-filter").value;
    try { const data = await api(`/admin/feedback?status=${encodeURIComponent(filter)}&offset=${state.feedbackOffset}`); renderFeedback(data.feedback || [], data.total); }
    catch (error) { document.querySelector("#feedback-list").innerHTML = `<p class="empty-cell">${escapeHtml(error.message)}</p>`; }
  }
  async function loadCodes() {
    const table = document.querySelector("#codes-table");
    try {
      const data = await api(`/admin/codes?offset=${state.codesOffset}`);
      table.innerHTML = data.codes.length ? data.codes.map((code) => `<tr><td>${escapeHtml(code.label)}</td><td>${code.kind === "credits" ? `${number(code.credits)} 次` : `${number(code.durationDays)} 天`}</td><td>${date(code.createdAt)}</td><td>${{ unused: "未兑换", used: "已兑换", revoked: "已停用" }[code.status] || "—"}</td><td>${code.status === "unused" ? `<button class="pager-button" data-revoke-code="${escapeHtml(code.id)}" type="button">停用</button>` : "—"}</td></tr>`).join("") : '<tr><td colspan="5" class="empty-cell">尚未生成会员码。</td></tr>';
      document.querySelector("#codes-page-note").textContent = data.total ? `显示 ${state.codesOffset + 1}–${Math.min(state.codesOffset + data.codes.length, data.total)}，共 ${number(data.total)} 个` : "暂无会员码";
      document.querySelector("#codes-prev").disabled = state.codesOffset <= 0;
      document.querySelector("#codes-next").disabled = state.codesOffset + 20 >= data.total;
    } catch (error) { table.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`; }
  }
  document.querySelector("#code-issue-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.querySelector("#code-issue-submit");
    const note = document.querySelector("#code-issue-note");
    if (document.querySelector("#code-output").value && !window.confirm("请确认已下载上一批会员码。继续生成会替换当前显示的内容。")) return;
    button.disabled = true; note.textContent = "正在生成会员码…";
    try {
      const type = document.querySelector("#code-type").value;
      const data = await api("/admin/issue-code", { method: "POST", body: JSON.stringify({ kind: "membership", durationDays: Number(type), quantity: Number(document.querySelector("#code-quantity").value) }) });
      document.querySelector("#code-output").value = data.codes.map((item) => `${item.code}\t${item.kind === "credits" ? `${item.credits} 次使用` : `${item.durationDays} 天会员`}`).join("\n");
      document.querySelector("#code-results").hidden = false;
      note.textContent = `已生成 ${data.codes.length} 个会员码，请立即下载保存。每个码只能兑换一次。`;
      state.codesOffset = 0; await loadCodes();
    } catch (error) { note.textContent = error.message; }
    finally { button.disabled = false; }
  });
  document.querySelector("#code-download")?.addEventListener("click", () => {
    const value = document.querySelector("#code-output").value;
    if (!value) return;
    const url = URL.createObjectURL(new Blob(["\uFEFFPET FORGE 会员码\n请妥善保管，每个码只能兑换一次。\n\n", value], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `PETFORGE-codes-${Date.now()}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.querySelector("#codes-table")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-revoke-code]");
    if (!button || !window.confirm("确认停用这个会员码？停用后买家将无法兑换。")) return;
    button.disabled = true;
    try { await api(`/admin/codes/${encodeURIComponent(button.dataset.revokeCode)}`, { method: "PUT", body: JSON.stringify({ status: "revoked" }) }); await loadCodes(); }
    catch (error) { button.disabled = false; window.alert(error.message); }
  });
  document.querySelector("#codes-refresh")?.addEventListener("click", loadCodes);
  document.querySelector("#codes-prev")?.addEventListener("click", () => { state.codesOffset = Math.max(0, state.codesOffset - 20); loadCodes(); });
  document.querySelector("#codes-next")?.addEventListener("click", () => { state.codesOffset += 20; loadCodes(); });
  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault(); loginSubmit.disabled = true; loginNote.textContent = "正在验证管理员权限…";
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ identity: "email", email: document.querySelector("#admin-email").value.trim().toLowerCase(), password: document.querySelector("#admin-password").value }) });
      if (!data.user?.isAdmin) throw new Error("这个账号没有管理员权限。");
      showDashboard();
    } catch (error) { loginNote.textContent = error.message; }
    finally { loginSubmit.disabled = false; }
  });
  refreshButton?.addEventListener("click", async () => { refreshButton.disabled = true; await Promise.all([loadOverview(), loadUsers(), loadFeedback(), loadCodes()]); refreshButton.disabled = false; });
  signoutButton?.addEventListener("click", async () => { try { await api("/auth/logout", { method: "POST" }); } catch (_) {} showLogin("已退出管理员工作台。"); });
  document.querySelector("#users-prev")?.addEventListener("click", () => { state.offset = Math.max(0, state.offset - state.limit); loadUsers(); });
  document.querySelector("#users-next")?.addEventListener("click", () => { state.offset += state.limit; loadUsers(); });
  document.querySelector("#feedback-filter")?.addEventListener("change", () => { state.feedbackOffset = 0; loadFeedback(); });
  document.querySelector("#feedback-prev")?.addEventListener("click", () => { state.feedbackOffset = Math.max(0, state.feedbackOffset - 20); loadFeedback(); });
  document.querySelector("#feedback-next")?.addEventListener("click", () => { state.feedbackOffset += 20; loadFeedback(); });
  document.querySelector("#feedback-refresh")?.addEventListener("click", loadFeedback);
  document.querySelector("#feedback-list")?.addEventListener("change", async (event) => {
    const select = event.target.closest("[data-feedback-id]"); if (!select) return;
    select.disabled = true;
    try { await api(`/admin/feedback/${encodeURIComponent(select.dataset.feedbackId)}`, { method: "PUT", body: JSON.stringify({ status: select.value }) }); await loadFeedback(); await loadOverview(); }
    catch (error) { select.disabled = false; window.alert(error.message); }
  });
  (async () => { try { const data = await api("/me"); if (data.user?.isAdmin) showDashboard(); else showLogin("这个账号没有管理员权限。"); } catch (_) { showLogin(); } })();
})();
