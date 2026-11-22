const stages = [
  { name: "New", probability: 10, color: "#06d6a0" },
  { name: "Qualified", probability: 25, color: "#ffc145" },
  { name: "Proposal", probability: 50, color: "#f78c6b" },
  { name: "Negotiation", probability: 75, color: "#118ab2" },
  { name: "Won", probability: 100, color: "#ef476f" },
  { name: "Lost", probability: 0, color: "#cdd8db" },
];

const $ = (id) => document.getElementById(id);
const today = new Date();
const localDate = (date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0")).join("-");
const near = (offset) => localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
const monthDate = (offset, day = 8) => offset === 0
  ? near(-Math.min(day, today.getDate() - 1))
  : localDate(new Date(today.getFullYear(), today.getMonth() + offset, day));
const shortDate = (date) => new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const currency = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (value) => "US$" + currency.format(value);
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const fixtures = [
  ["Facilities survey", "Tandem Workspace", 0, 14500, near(11)],
  ["Metering pilot", "Glassline Works", 0, 22000, near(18)],
  ["Cold chain assessment", "Fern & Field Foods", 1, 28000, near(12)],
  ["Store network upgrade", "Beacon Retail", 1, 42000, near(21)],
  ["Service desk rollout", "Cedar Health", 2, 36000, near(-4)],
  ["Inventory pilot", "Juniper Supply", 2, 51500, near(9)],
  ["Fleet service agreement", "Northline Logistics", 3, 68000, near(4)],
  ["Warehouse expansion", "Harbor Assembly", 3, 84000, near(7)],
  ["Onboarding package", "Aster Design", 4, 28000, monthDate(0, 2)],
  ["Field support renewal", "Solace Energy", 4, 74000, monthDate(0, 6)],
  ["Regional training", "Morrow Foods", 4, 48000, monthDate(-1)],
  ["Workflow coaching", "Pine Health", 4, 19500, monthDate(-2)],
  ["Workshop series", "Aster Design", 4, 62500, monthDate(-2, 18)],
  ["Operations review", "Wren Print", 4, 34000, monthDate(-4)],
  ["Depot assessment", "Railbrook Supply", 4, 52500, monthDate(-5)],
  ["Site audit", "Oxbow Studios", 5, 18500, near(-7)],
  ["Support contract", "Lumen Fabrication", 5, 42000, near(-21)],
  ["Branch connectivity", "Beacon Retail", 0, 18500, near(26)],
  ["Help desk assessment", "Pine Health", 0, 12000, near(17)],
  ["Equipment service plan", "Harbor Assembly", 1, 33500, near(16)],
  ["Dispatch workflow review", "", 1, 16000, near(10), "Riley Morgan"],
  ["Vendor portal rollout", "Morrow Foods", 2, 24000, near(-1)],
  ["Route planning pilot", "Railbrook Supply", 2, 31500, near(20)],
  ["Multi-site maintenance", "Tandem Workspace", 3, 44500, near(3)],
  ["Production reporting", "Glassline Works", 3, 55000, near(13)],
  ["Site support extension", "Solace Energy", 5, 25500, monthDate(-1, 19)],
  ["Studio equipment survey", "Aster Design", 5, 9500, monthDate(-3, 14)],
];

const customers = [
  ["Tandem Workspace", "Commercial real estate", "Priya Shah", "Facilities Director"],
  ["Glassline Works", "Manufacturing", "Evan Brooks", "Plant Manager"],
  ["Fern & Field Foods", "Food distribution", "Samira Patel", "Quality Lead"],
  ["Beacon Retail", "Retail", "Noah Park", "IT Manager"],
  ["Cedar Health", "Healthcare", "Maya Chen", "Operations Director"],
  ["Juniper Supply", "Wholesale", "Mateo Ruiz", "Inventory Manager"],
  ["Northline Logistics", "Logistics", "Amina Okafor", "Fleet Manager"],
  ["Harbor Assembly", "Manufacturing", "Theo Carter", "Managing Director"],
  ["Aster Design", "Design services", "Nina Foster", "Studio Director"],
  ["Solace Energy", "Renewable energy", "Leah Santos", "Service Manager"],
  ["Morrow Foods", "Food manufacturing", "Daniel Kim", "Procurement Manager"],
  ["Pine Health", "Healthcare", "Avery Mills", "Clinic Administrator"],
  ["Wren Print", "Printing", "Elliot Green", "General Manager"],
  ["Railbrook Supply", "Industrial supply", "Marisol Vega", "Distribution Lead"],
  ["Oxbow Studios", "Media production", "Jordan Diaz", "Production Manager"],
  ["Lumen Fabrication", "Metal fabrication", "Tessa Reed", "Purchasing Manager"],
  ["Briar Biotech", "Laboratory services", "Hannah Ali", "Lab Operations Lead"],
  ["Meridian Parks", "Property services", "Zoe Stewart", "Regional Manager"],
];

const organizations = customers.map(([name, industry], index) => ({
  id: "o" + index, name, industry, website: name.toLowerCase().replace(/[^a-z]/g, "") + ".example",
}));
const contactStatuses = ["Lead", "Qualified", "Customer"];
const contacts = [
  ...customers.map(([organization, , name, title], index) => ({
    id: "c" + index, name, title, organization,
    status: index < 2 || index > 13 ? "Lead" : index < 8 ? "Qualified" : "Customer",
    email: name.toLowerCase().replace(" ", ".") + "@" + organizations[index].website,
    phone: "+1 202 555 " + (101 + index).toString().padStart(4, "0"),
  })),
  { id: "c18", name: "Riley Morgan", title: "Logistics Consultant", organization: "", status: "Qualified", email: "riley@independent.example", phone: "+1 202 555 0119" },
  { id: "c19", name: "Jamie Lennox", title: "Operations Consultant", organization: "", status: "Lead", email: "jamie@independent.example", phone: "+1 202 555 0120" },
  { id: "c20", name: "Sophie Tran", title: "Finance Manager", organization: "Cedar Health", status: "Customer", email: "sophie.tran@cedarhealth.example", phone: "+1 202 555 0121" },
  { id: "c21", name: "Marcus Bell", title: "Warehouse Supervisor", organization: "Juniper Supply", status: "Qualified", email: "marcus.bell@junipersupply.example", phone: "+1 202 555 0122" },
];

const demoTasks = [
  { id: "t1", title: "Confirm Cedar rollout scope", owner: "Cedar Health", deal: "d4", date: near(-2) },
  { id: "t2", title: "Send the revised service terms", owner: "Northline Logistics", deal: "d6", date: near(0) },
  { id: "t3", title: "Check pilot start dates", owner: "Mateo Ruiz · Juniper Supply", contact: "c5", date: near(2) },
];

const demoActivity = [
  { icon: "↗", title: "Moved from Proposal to Negotiation", owner: "Warehouse expansion", deal: "d7", date: near(0) },
  { icon: "C", title: "Call · Reviewed rollout timing", owner: "Maya Chen · Cedar Health", contact: "c4", date: near(-1) },
  { icon: "E", title: "Email · Sent pilot proposal", owner: "Inventory pilot", deal: "d5", date: near(-2) },
  { icon: "C", title: "Call · Confirmed pilot requirements", owner: "Mateo Ruiz · Juniper Supply", contact: "c5", date: near(-3) },
  { icon: "N", title: "Note · Received revised branch list", owner: "Branch connectivity", deal: "d17", date: near(-4) },
];

const fresh = () => ({
  deals: fixtures.map(([name, organization, stage, value, date, contact], index) => ({
    id: "d" + index, name, organization, stage, value, date,
    contact: contact || (index % 4 === 0 ? "" : contacts.find((item) => item.organization === organization)?.name),
    expectedDate: stage < 4 ? date : near(index + 3),
    probability: stages[stage].probability,
    reached: Array.from({ length: Math.min(stage + 1, 5) }, (_, i) => stage === 5 && i === 4 ? 5 : i),
  })),
  completed: [],
  activity: demoActivity,
});

const storageKey = "accountable-mockup-" + document.body.className + "-v1";
let state = fresh();
try {
  const previous = JSON.parse(localStorage.getItem(storageKey));
  if (previous) {
    const storedDeals = new Map(previous.deals.map((deal) => [deal.id, deal]));
    const originalDeals = new Map(state.deals.map((deal) => [deal.id, deal]));
    state = {
      ...previous,
      deals: [
        ...previous.deals.map((deal) => ({ ...originalDeals.get(deal.id), ...deal })),
        ...state.deals.filter((deal) => !storedDeals.has(deal.id)),
      ],
    };
  }
} catch {
  // The preview still works if browser storage is disabled.
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Keep this session's edits if browser storage is disabled.
  }
}

const tone = (stage) => 'style="--stage:' + stages[stage].color + '"';
const panelHead = (title, meta = "") =>
  '<div class="panel-head"><h2>' + title + '</h2>' + (meta ? "<small>" + meta + "</small>" : "") + "</div>";
const openDeals = () => state.deals.filter((deal) => deal.stage < 4);
const total = (deals) => deals.reduce((sum, deal) => sum + deal.value, 0);
const expected = (deals) => deals.reduce((sum, deal) => sum + Math.round(deal.value * 100) * deal.probability, 0) / 10000;
const dealById = (id) => state.deals.find((deal) => deal.id === id);
const stageDeals = (stage) => state.deals.filter((deal) => deal.stage === stage);
const isLate = (deal) => deal.stage < 4 && deal.date < near(0);
const stageOptions = (selected) => stages.map((stage, index) =>
  '<option value="' + index + '"' + (index === selected ? " selected" : "") + ">" + stage.name + "</option>").join("");

function renderDashboard() {
  const open = openDeals();
  const metrics = [["Open deals", open.length], ["Open pipeline value", money(total(open))], ["Expected revenue", money(expected(open))]];
  $("dashboard-stats").innerHTML = metrics.map(([label, value]) =>
    '<article class="stat"><p>' + label + "</p><strong>" + value + "</strong></article>").join("");

  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    const key = localDate(date).slice(0, 7);
    const wins = stageDeals(4).filter((deal) => deal.date.startsWith(key));
    return { month: date.toLocaleDateString("en-US", { month: "short" }), revenue: total(wins), wins: wins.length };
  });
  renderChart("revenue", "Won revenue", monthly, true);
  renderChart("wins", "Deals won", monthly, false);

  const funnelValues = stages.map((_, index) => total(state.deals.filter((deal) => deal.reached.includes(index))));
  const max = Math.max(1, ...funnelValues);
  $("funnel").innerHTML = panelHead("Sales funnel") +
    '<p class="muted">Value of deals that reached each stage</p><div class="funnel-rows">' +
    funnelValues.map((value, index) => '<div class="funnel-item" ' + tone(index) + '><div class="funnel-key"><span>' +
      stages[index].name + '</span><span class="numbers">' + money(value) +
      '</span></div><div class="funnel-track" aria-hidden="true"><div class="funnel-fill" style="--size:' +
      (value / max * 100) + '%"></div></div></div>').join("") + "</div>";

  renderTasks();
  $("activity").innerHTML = panelHead("Recent activity") + state.activity.slice(0, 3).map((entry, index) =>
    '<div class="activity-row"><span class="activity-icon" aria-hidden="true">' + escape(entry.icon) +
    '</span><div class="activity-copy"><strong>' + escape(entry.title) + "</strong>" +
    '<button type="button" class="text-link" data-activity="' + index + '">' + escape(entry.owner) +
    '</button></div><time datetime="' + entry.date + '">' + shortDate(entry.date) + "</time></div>").join("");
}

function renderTasks() {
  const open = demoTasks.filter((task) => !state.completed.includes(task.id));
  const groups = [
    ["Overdue", open.filter((task) => task.date < near(0))],
    ["Upcoming", open.filter((task) => task.date >= near(0))],
  ];
  $("tasks").innerHTML = panelHead("Follow-ups", open.length + " open") + '<div class="task-groups">' +
    groups.filter(([, entries]) => entries.length).map(([label, entries]) =>
      '<div><h3 class="group-title ' + label.toLowerCase() + '">' + label + "</h3>" +
      entries.map((task) => '<div class="task-row"><button type="button" class="check" data-done="' + task.id +
        '" aria-label="Mark done: ' + escape(task.title) + '"></button><div class="task-copy"><strong>' +
        escape(task.title) + '</strong><button type="button" class="text-link" data-task="' + task.id + '">' +
        escape(task.owner) + '</button></div><time datetime="' + task.date + '">' +
        (task.date === near(0) ? "Today" : shortDate(task.date)) + "</time></div>").join("") + "</div>").join("") +
    (open.length ? "" : '<p class="muted">No open follow-ups</p>') + "</div>";
}

const chartData = new Map();

function renderChart(id, title, monthly, isRevenue) {
  const series = monthly.map((item) => [item.month, isRevenue ? item.revenue : item.wins]);
  $(id).innerHTML = panelHead(title, "Last 6 months") +
    '<div class="chart"><canvas aria-hidden="true"></canvas></div>' +
    '<details class="chart-values"><summary>Show values</summary><ul class="data-values">' +
    series.map(([label, value]) => "<li><span>" + label + '</span><span class="numbers">' +
      (isRevenue ? money(value) : value) + "</span></li>").join("") + "</ul></details>";
  chartData.set(id, { series, isRevenue });
  drawChart(id);
}

function drawChart(id) {
  const { series, isRevenue } = chartData.get(id);
  const canvas = $(id).querySelector("canvas");
  const { width, height } = canvas.getBoundingClientRect();
  if (width < 120 || height < 40) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  const left = isRevenue ? 53 : 24;
  const right = width - 10;
  const bottom = height - 26;
  const top = 10;
  const values = series.map(([, value]) => value);
  const step = isRevenue ? Math.max(10000, Math.ceil(Math.max(...values) / 30000) * 10000)
    : Math.max(1, Math.ceil(Math.max(...values) / 3));
  const max = step * 3;
  const y = (value) => bottom - (bottom - top) * value / max;
  const band = (right - left) / series.length;
  const x = (index) => left + band * (index + 0.5);

  ctx.font = '10px "JetBrains Mono", Consolas, monospace';
  ctx.textBaseline = "middle";
  ctx.lineWidth = 1;
  for (let tick = 0; tick <= 3; tick++) {
    const value = tick * step;
    ctx.strokeStyle = "#e3ecee";
    ctx.beginPath();
    ctx.moveTo(left, y(value));
    ctx.lineTo(right, y(value));
    ctx.stroke();
    ctx.fillStyle = "#46646c";
    ctx.textAlign = "right";
    const label = isRevenue ? "US$" + (value ? value / 1000 + "k" : "0") : String(value);
    ctx.fillText(label, left - 6, y(value));
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#46646c";
  series.forEach(([label], index) => ctx.fillText(label, x(index), height - 10));
  if (isRevenue) {
    const trace = () => values.forEach((value, index) => ctx.lineTo(x(index), y(value)));
    ctx.beginPath();
    ctx.moveTo(x(0), bottom);
    trace();
    ctx.lineTo(x(values.length - 1), bottom);
    ctx.closePath();
    ctx.fillStyle = "#d9f8ef";
    ctx.fill();
    ctx.beginPath();
    trace();
    ctx.strokeStyle = "#08775b";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = "#08775b";
    values.forEach((value, index) => {
      ctx.beginPath();
      ctx.arc(x(index), y(value), 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    ctx.fillStyle = "#ffc145";
    values.forEach((value, index) => {
      if (value === 0) return;
      ctx.beginPath();
      ctx.roundRect(x(index) - band * 0.3, y(value), band * 0.6, bottom - y(value), [5, 5, 0, 0]);
      ctx.fill();
    });
  }
}

function renderBoard() {
  const open = openDeals();
  $("board-totals").innerHTML = [
    ["Open deals", open.length], ["Open value", money(total(open))], ["Expected revenue", money(expected(open))],
  ].map(([label, value]) => "<div>" + label + ' <strong class="numbers">' + value + "</strong></div>").join("");

  $("board").innerHTML = stages.map((stage, index) => {
    const deals = stageDeals(index);
    const summary = index < 4
      ? '<div class="lane-stat">Value <span class="numbers">' + money(total(deals)) +
        '</span></div><div class="lane-stat">Expected <span class="numbers">' + money(expected(deals)) + "</span></div>"
      : '<div class="lane-stat">Closed</div>';
    return '<section class="lane" data-stage="' + index + '" ' + tone(index) +
      ' aria-labelledby="stage-' + index + '"><header class="lane-head"><div class="lane-title">' +
      '<span class="stage-dot" aria-hidden="true"></span><h3 id="stage-' + index + '">' + stage.name +
      '</h3><span class="count">' + deals.length + "</span></div>" + summary +
      '</header><div class="lane-cards" tabindex="0" aria-label="' + stage.name + ' deals">' +
      deals.map(renderCard).join("") + '</div><button type="button" class="lane-add" data-add="' + index +
      '" aria-label="Add deal to ' + stage.name + '">+ Add deal</button></section>';
  }).join("");
  dealWorkspace?.syncBoard();
}

function renderCard(deal) {
  return '<article class="deal-card" draggable="true" data-id="' + deal.id +
    '"><a class="deal-title" href="#deal-' + deal.id + '" data-detail="' + deal.id + '">' + escape(deal.name) +
    '</a><p class="deal-org">' + escape(deal.organization || deal.contact) + '</p><div class="deal-value numbers"><strong>' +
    money(deal.value) + "</strong><span>" + deal.probability +
    '%</span></div><div class="deal-meta"><time datetime="' + deal.date + '">' + shortDate(deal.date) +
    '</time>' + (isLate(deal) ? '<span class="late">Late</span>' : "") +
    '<button type="button" class="move" data-move="' + deal.id + '" aria-label="Move ' + escape(deal.name) +
    '">Move</button></div>' + (dealWorkspace?.noteCount(deal.id) ?? "") + '</article>';
}

function changePosition(id, stage, before, newExpectedDate) {
  const deal = dealById(id);
  if (stage < 4 && deal.stage >= 4 && !deal.expectedDate && !newExpectedDate) {
    showMove(id, stage, before);
    return;
  }
  if (deal.stage !== stage) {
    const previous = deal.stage;
    deal.stage = stage;
    deal.probability = stages[stage].probability;
    if (!deal.reached.includes(stage)) deal.reached.push(stage);
    if (stage >= 4 && previous < 4) deal.date = near(0);
    if (stage < 4 && previous >= 4) {
      deal.expectedDate = deal.expectedDate || newExpectedDate;
      deal.date = deal.expectedDate;
    }
    state.activity.unshift({
      icon: "↗", title: "Moved from " + stages[previous].name + " to " + stages[stage].name,
      owner: deal.name, deal: deal.id, date: near(0),
    });
  }
  state.deals = state.deals.filter((candidate) => candidate.id !== id);
  const target = before ? state.deals.findIndex((candidate) => candidate.id === before) : -1;
  state.deals.splice(target < 0 ? state.deals.length : target, 0, deal);
  save();
  render();
  $("move-status").textContent = deal.name + " is in " + stages[stage].name + ".";
}

const dialog = $("record-dialog");
let dealWorkspace;

const statusBadge = (label) => '<span class="record-status">' + escape(label) + "</span>";
const closeDate = (deal) => '<time datetime="' + deal.date + '">' + shortDate(deal.date) + "</time>" +
  (isLate(deal) ? ' <span class="late">Late</span>' : "");
const recordLink = (type, record) => '<button type="button" class="text-link" data-record="' +
  type + '" data-record-id="' + record.id + '">' + escape(record.name) + "</button>";

function linkedName(type, name) {
  const collection = type === "contacts" ? contacts : organizations;
  const record = collection.find((item) => item.name === name);
  return record ? recordLink(type, record) : escape(name || "—");
}

function renderTimeline(key, id) {
  const entries = state.activity.filter((entry) => entry[key] === id);
  return '<section class="related"><h3>Timeline</h3>' + (entries.length
    ? '<ul>' + entries.map((entry) => "<li><strong>" + escape(entry.title) + '</strong><time datetime="' +
      entry.date + '">' + shortDate(entry.date) + "</time></li>").join("") + "</ul>"
    : '<p class="muted">No activity recorded</p>') + "</section>";
}

function relatedRecords(title, type, records) {
  return '<section class="related"><h3>' + title + "</h3>" + (records.length
    ? "<ul>" + records.map((record) => "<li>" + recordLink(type, record) + "</li>").join("") + "</ul>"
    : '<p class="muted">None linked</p>') + "</section>";
}

function showRecord(type, id) {
  let record;
  let details;
  if (type === "organizations") {
    record = organizations.find((item) => item.id === id);
    details = '<p>' + escape(record.industry) + ' · ' + escape(record.website) + '</p>' +
      relatedRecords("Contacts", "contacts", contacts.filter((item) => item.organization === record.name)) +
      relatedRecords("Deals", "deals", state.deals.filter((item) => item.organization === record.name));
  } else if (type === "contacts") {
    record = contacts.find((item) => item.id === id);
    details = '<p>' + escape(record.title) + ' · ' + statusBadge(record.status) + '</p>' +
      '<p>' + (record.organization ? linkedName("organizations", record.organization) : "Independent") + '</p>' +
      '<p>' + escape(record.email) + '<br>' + escape(record.phone) + '</p>' +
      relatedRecords("Deals", "deals", state.deals.filter((item) => item.contact === record.name)) +
      renderTimeline("contact", record.id);
  } else {
    record = dealById(id);
    if (dealWorkspace) {
      dealWorkspace.open(record);
      return;
    }
    details = '<p>' + statusBadge(stages[record.stage].name) + ' <span class="numbers">' +
      money(record.value) + " · " + record.probability + '%</span></p><p>' +
      (record.stage < 4 ? "Expected close " : "Closed ") + closeDate(record) + '</p>' +
      (record.organization ? '<p>Organization · ' + linkedName("organizations", record.organization) + '</p>' : '') +
      (record.contact ? '<p>Main contact · ' + linkedName("contacts", record.contact) + '</p>' : '') +
      renderTimeline("deal", record.id);
  }
  showRecordDialog(record.name, details);
}

function showRecordDialog(title, details) {
  dealWorkspace?.close();
  dialog.innerHTML = '<div class="dialog-stack"><h2 id="dialog-title" tabindex="-1">' + escape(title) +
    '</h2>' + details +
    '<form method="dialog"><div class="dialog-actions"><button class="button subtle">Close</button></div></form></div>';
  if (!dialog.open) dialog.showModal();
  $("dialog-title").focus();
}

function showDetails(entry) {
  if (entry.deal) showRecord("deals", entry.deal);
  else if (entry.contact) showRecord("contacts", entry.contact);
  else showRecordDialog(entry.owner, "<p>" + escape(entry.title) + "</p>");
}

const directorySpecs = {
  organizations: {
    title: "Organizations",
    columns: [["name", "Name"], ["industry", "Industry"], ["website", "Website"], ["contacts", "Contacts"], ["deals", "Deals"]],
    records: () => organizations.map((record) => ({
      ...record,
      contacts: contacts.filter((item) => item.organization === record.name).length,
      deals: state.deals.filter((item) => item.organization === record.name).length,
    })),
  },
  contacts: {
    title: "Contacts",
    columns: [["name", "Name"], ["status", "Status"], ["organization", "Organization"], ["email", "Email"], ["phone", "Phone"]],
    records: () => contacts,
  },
  deals: {
    title: "Deals",
    columns: [["name", "Name"], ["stage", "Stage"], ["value", "Value"], ["probability", "Probability"], ["date", "Close date"], ["organization", "Organization"], ["contact", "Main contact"]],
    records: () => state.deals,
  },
};
let directoryView;

function renderDirectory(type) {
  const { title } = directorySpecs[type];
  directoryView = { type, query: "", status: "", sort: "name", direction: 1 };
  $("directory").innerHTML = '<header class="page-head"><h1 id="directory-title">' + title + "</h1>" +
    (type === "deals" ? '<button class="button" type="button" data-add="0">+ Add deal</button>' : "") +
    '</header><div class="panel directory-panel"><div class="directory-tools">' +
    '<label for="directory-search" class="sr-only">Search ' + title.toLowerCase() +
    '</label><input id="directory-search" type="search" placeholder="Search ' + title.toLowerCase() + '">' +
    (type === "contacts" ? '<label for="contact-status" class="sr-only">Contact status</label><select id="contact-status">' +
      '<option value="">All statuses</option>' + contactStatuses.map((status) =>
        '<option>' + status + '</option>').join("") + '</select>' : "") +
    '<span class="directory-count muted" aria-live="polite"></span></div><div class="table-scroll"></div></div>';
  $("directory-search").addEventListener("input", (event) => {
    directoryView.query = event.target.value.trim().toLowerCase();
    renderDirectoryTable();
  });
  $("contact-status")?.addEventListener("change", (event) => {
    directoryView.status = event.target.value;
    renderDirectoryTable();
  });
  renderDirectoryTable();
}

function cellContent(type, key, record) {
  const value = record[key];
  switch (key) {
    case "name": return recordLink(type, record);
    case "stage": return statusBadge(stages[value].name);
    case "status": return statusBadge(value);
    case "organization": return linkedName("organizations", value);
    case "contact": return linkedName("contacts", value);
    case "date": return closeDate(record);
    case "value": return '<span class="numbers">' + money(value) + "</span>";
    case "probability": return '<span class="numbers">' + value + "%</span>";
    default: return escape(value);
  }
}

function renderDirectoryTable() {
  const { type, query, status, sort, direction } = directoryView;
  const { title, columns, records } = directorySpecs[type];
  const visible = records().filter((item) => {
    const cells = columns.map(([key]) => key === "stage" ? stages[item.stage].name : item[key]);
    return (!status || item.status === status) && cells.join(" ").toLowerCase().includes(query);
  });
  const compare = (a, b) => typeof a === "number" && typeof b === "number"
    ? a - b : String(a ?? "").localeCompare(String(b ?? ""));
  visible.sort((a, b) => direction * compare(a[sort], b[sort]) || a.id.localeCompare(b.id));
  const { activeElement } = document;
  const priorSort = activeElement.dataset.sort;
  $("directory").querySelector(".directory-count").textContent = visible.length + " " + (visible.length === 1 ? "record" : "records");
  $("directory").querySelector(".table-scroll").innerHTML =
    '<table><caption class="sr-only">' + title + '</caption><thead><tr>' +
    columns.map(([key, label]) => '<th scope="col"' + (key === sort
      ? ' aria-sort="' + (direction === 1 ? "ascending" : "descending") + '"' : "") +
      '><button type="button" data-sort="' + key + '">' + label +
      (key === sort ? ' <span aria-hidden="true">' + (direction === 1 ? "↑" : "↓") + "</span>" : "") +
      '</button></th>').join("") + '</tr></thead><tbody>' +
    (visible.length ? visible.map((record) => "<tr>" + columns.map(([key]) =>
      "<td>" + cellContent(type, key, record) + "</td>").join("") + "</tr>").join("")
      : '<tr><td colspan="' + columns.length + '" class="muted">No matching records</td></tr>') +
    "</tbody></table>";
  if (priorSort) $("directory").querySelector('[data-sort="' + priorSort + '"]').focus();
}

function showMove(id, initialStage, initialBefore) {
  dealWorkspace?.close();
  const deal = dealById(id);
  dialog.innerHTML = '<form><h2 id="dialog-title">Move ' + escape(deal.name) +
    '</h2><label>Stage<select name="stage">' + stageOptions(initialStage ?? deal.stage) +
    '</select></label><label>Position<select name="before"></select></label>' +
    '<label id="expected-label" hidden>Expected close date<input type="date" name="expectedDate"></label><div class="dialog-actions">' +
    '<button type="button" class="button subtle" data-close>Cancel</button><button class="button">Move deal</button></div></form>';
  const form = dialog.querySelector("form");
  const { stage, before, expectedDate } = form.elements;
  const refreshPositions = () => {
    const options = stageDeals(Number(stage.value)).filter((candidate) => candidate.id !== id);
    before.innerHTML = options.map((candidate) => '<option value="' + candidate.id + '">Before ' +
      escape(candidate.name) + "</option>").join("") + '<option value="">End of column</option>';
    const currentLane = stageDeals(deal.stage);
    if (Number(stage.value) === deal.stage) {
      before.value = currentLane[currentLane.indexOf(deal) + 1]?.id ?? "";
    } else {
      before.value = "";
    }
    const needsDate = Number(stage.value) < 4 && !deal.expectedDate;
    $("expected-label").hidden = !needsDate;
    expectedDate.required = needsDate;
  };
  refreshPositions();
  if (initialBefore) before.value = initialBefore;
  stage.addEventListener("change", refreshPositions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    dialog.close();
    changePosition(id, Number(stage.value), before.value, expectedDate.value);
    document.querySelector('[data-move="' + id + '"]').focus();
  });
  dialog.showModal();
}

function showAdd(index) {
  dealWorkspace?.close();
  const optionsFor = (records) => records.map((record) => '<option value="' + escape(record.name) + '"></option>').join("");
  dialog.innerHTML = '<form><h2 id="dialog-title">Add deal</h2><label>Name<input name="name" required maxlength="65"></label>' +
    '<label>Organization<input name="organization" list="organization-suggestions" maxlength="50"></label>' +
    '<datalist id="organization-suggestions">' + optionsFor(organizations) + '</datalist>' +
    '<label>Main contact<input name="contact" list="contact-suggestions" maxlength="50"></label>' +
    '<datalist id="contact-suggestions">' + optionsFor(contacts) + '</datalist>' +
    '<p class="muted">Enter an organization, a main contact, or both.</p>' +
    '<label>Stage<select name="stage">' + stageOptions(index) + '</select></label>' +
    '<label>Value (US$)<input name="value" required type="number" min="0" step=".01"></label>' +
    '<label><span id="close-label">' + (index < 4 ? "Expected close date" : "Actual close date") +
    '</span><input name="date" required type="date" value="' + (index < 4 ? near(7) : near(0)) +
    '"></label><div class="dialog-actions"><button type="button" class="button subtle" data-close>Cancel</button>' +
    '<button class="button">Save deal</button></div></form>';
  const form = dialog.querySelector("form");
  const validateLinks = () => {
    const hasLink = form.elements.organization.value.trim() || form.elements.contact.value.trim();
    form.elements.organization.setCustomValidity(hasLink ? "" : "Enter an organization or a main contact.");
  };
  form.elements.organization.addEventListener("input", validateLinks);
  form.elements.contact.addEventListener("input", validateLinks);
  form.elements.stage.addEventListener("change", () => {
    const closed = Number(form.elements.stage.value) >= 4;
    $("close-label").textContent = closed ? "Actual close date" : "Expected close date";
    form.elements.date.value = closed ? near(0) : near(7);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    const name = fields.get("name").trim();
    const organization = fields.get("organization").trim();
    const contact = fields.get("contact").trim();
    if (!name || (!organization && !contact)) {
      if (!name) form.elements.name.setCustomValidity("Enter a deal name.");
      validateLinks();
      form.reportValidity();
      return;
    }
    const stage = Number(fields.get("stage"));
    const date = fields.get("date");
    const id = "d" + Date.now();
    state.deals.push({
      id, name, organization, contact, stage, value: Number(fields.get("value")), date,
      expectedDate: stage < 4 ? date : null, probability: stages[stage].probability, reached: [stage],
    });
    save();
    dialog.close();
    render();
    const target = directoryView
      ? $("directory").querySelector('[data-record-id="' + id + '"]') || $("directory").querySelector("[data-add]")
      : $("pipeline").querySelector('[data-detail="' + id + '"]');
    target?.focus();
  });
  form.elements.name.addEventListener("input", () => form.elements.name.setCustomValidity(""));
  dialog.showModal();
}

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-add],[data-move],[data-detail],[data-done],[data-task],[data-activity],[data-close],[data-record],[data-sort]");
  if (!action) return;
  const { add, move, detail, done, task, activity, close, record, recordId, sort } = action.dataset;
  if (add !== undefined) showAdd(Number(add));
  if (move) showMove(move);
  if (detail) { event.preventDefault(); showDetails({ deal: detail }); }
  if (task) showDetails(demoTasks.find((item) => item.id === task));
  if (activity !== undefined) showDetails(state.activity[Number(activity)]);
  if (close !== undefined) dialog.close();
  if (record) showRecord(record, recordId);
  if (sort) {
    directoryView.direction = directoryView.sort === sort ? -directoryView.direction : 1;
    directoryView.sort = sort;
    renderDirectoryTable();
  }
  if (done) {
    state.completed.push(done);
    save();
    renderTasks();
    $("tasks").querySelector(".check")?.focus();
  }
});

let dragging = null;
let dropTarget = null;

function clearDrop() {
  document.querySelector(".is-over")?.classList.remove("is-over");
  document.querySelector(".insert-before")?.classList.remove("insert-before");
  dropTarget = null;
}

$("board").addEventListener("dragstart", (event) => {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  dragging = card.dataset.id;
  event.dataTransfer.setData("text/plain", dragging);
  event.dataTransfer.effectAllowed = "move";
});

$("board").addEventListener("dragover", (event) => {
  const lane = event.target.closest(".lane");
  if (!lane || !dragging) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  clearDrop();
  const before = [...lane.querySelectorAll("[data-id]")].find((card) => {
    const box = card.getBoundingClientRect();
    return card.dataset.id !== dragging && event.clientY < box.top + box.height / 2;
  });
  lane.classList.add("is-over");
  before?.classList.add("insert-before");
  dropTarget = { stage: Number(lane.dataset.stage), before: before?.dataset.id };
});

$("board").addEventListener("drop", (event) => {
  if (!dragging || !dropTarget || !event.target.closest(".lane")) return;
  event.preventDefault();
  const move = dropTarget;
  clearDrop();
  changePosition(dragging, move.stage, move.before);
  dragging = null;
});

$("board").addEventListener("dragend", () => { clearDrop(); dragging = null; });

function updateNav() {
  const target = location.hash.slice(1);
  const inDirectory = Object.hasOwn(directorySpecs, target);
  const selected = inDirectory || target === "pipeline" ? target : "dashboard";
  $("dashboard").hidden = inDirectory;
  $("pipeline").hidden = inDirectory;
  $("directory").hidden = !inDirectory;
  if (inDirectory) {
    renderDirectory(target);
    window.scrollTo(0, 0);
  } else {
    directoryView = undefined;
    chartData.forEach((_, id) => drawChart(id));
    $(selected).scrollIntoView();
    if (!location.hash) window.scrollTo(0, 0);
  }
  document.querySelectorAll(".menu a").forEach((anchor) => {
    if (anchor.hash === "#" + selected) anchor.setAttribute("aria-current", "location");
    else anchor.removeAttribute("aria-current");
  });
  dealWorkspace?.routeChanged(selected);
}

function render() {
  renderDashboard();
  renderBoard();
  if (directoryView) renderDirectoryTable();
}

window.addEventListener("hashchange", updateNav);
window.addEventListener("resize", () => chartData.forEach((_, id) => drawChart(id)));
render();
updateNav();
document.fonts.ready.then(() => chartData.forEach((_, id) => drawChart(id)));
