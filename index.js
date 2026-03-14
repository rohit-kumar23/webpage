const getNavItems = () => document.querySelectorAll("nav > ul > li[data-target]");
const getSections = () => document.querySelectorAll(".content > section");
const getAboutContributions = () => document.getElementById("about-contributions");

const handleToggle = (targetId) => {
  let hasMatch = false;

  getNavItems().forEach((li) => {
    const isActive = li.dataset.target === targetId;
    li.classList.toggle("active", isActive);
  });

  getSections().forEach((section) => {
    const isActive = section.id === targetId;
    section.classList.toggle("hidden", !isActive);
    hasMatch = hasMatch || isActive;
  });

  getAboutContributions()?.classList.toggle("hidden", targetId !== "About");

  if (hasMatch && window.location.hash !== `#${targetId}`) {
    window.location.hash = targetId;
  }
};

window.handleToggle = handleToggle;

/* clock */

const updateTime = () => {
  const date = new Date();
  const timeZone = "Asia/Kolkata";

  const formatter = new Intl.DateTimeFormat("sv-SE", { timeZone });
  const dateString = formatter.format(date).substring(0, 10);
  // const nyaDateString = mapping[dateString];
  const nyaDateString = dateString;

  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: timeZone,
  });

  const newTime = nyaDateString + "\xa0\xa0\xa0\xa0" + time;
  const originalTime = document.getElementById("clock").textContent;
  if (originalTime !== newTime)
    document.getElementById("clock").innerText = newTime;
};

const GITHUB_USERNAME = "rohit-kumar23";
const GITHUB_CONTRIBUTIONS_API =
  "https://github-contributions-api.jogruber.de/v4/rohit-kumar23";

const toDateOnly = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const formatContributionDate = (dateString) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const buildContributionWeeks = (contributions) => {
  const contributionMap = new Map(
    contributions.map((entry) => [entry.date, entry])
  );
  const visibleContributions = contributions.slice(-371);

  if (!visibleContributions.length) {
    return [];
  }

  const startDate = toDateOnly(`${visibleContributions[0].date}T00:00:00`);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const endDate = toDateOnly(
    `${visibleContributions[visibleContributions.length - 1].date}T00:00:00`
  );
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days = [];
  for (
    const cursor = new Date(startDate);
    cursor <= endDate;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const dateKey = toIsoDate(cursor);
    const contribution = contributionMap.get(dateKey);
    days.push(
      contribution || {
        date: dateKey,
        count: null,
        level: 0,
      }
    );
  }

  const weeks = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return weeks;
};

const renderGitHubContributions = (data) => {
  const calendar = document.querySelector(".calendar");
  if (!calendar) {
    return;
  }

  const today = toDateOnly(new Date());
  const contributions = (data.contributions || [])
    .filter((entry) => toDateOnly(`${entry.date}T00:00:00`) <= today)
    .sort((left, right) => left.date.localeCompare(right.date));

  const weeks = buildContributionWeeks(contributions);
  if (!weeks.length) {
    calendar.textContent = "No GitHub activity available right now.";
    return;
  }

  let previousMonth = -1;
  const monthLabels = weeks
    .map((week) => {
      const firstRealDay = week.find((entry) => entry.count !== null);
      if (!firstRealDay) {
        return "";
      }

      const monthIndex = new Date(`${firstRealDay.date}T00:00:00`).getMonth();
      if (monthIndex === previousMonth) {
        return "";
      }

      previousMonth = monthIndex;
      return new Date(`${firstRealDay.date}T00:00:00`).toLocaleString(
        "en-GB",
        { month: "short" }
      );
    })
    .map((label) => `<span>${label}</span>`)
    .join("");

  const cells = weeks
    .flat()
    .map((entry) => {
      if (entry.count === null) {
        return '<div class="calendar-cell calendar-cell-empty"></div>';
      }

      const contributionLabel =
        entry.count === 1 ? "1 contribution" : `${entry.count} contributions`;

      return `<div class="calendar-cell level-${entry.level}" title="${contributionLabel} on ${formatContributionDate(
        entry.date
      )}"></div>`;
    })
    .join("");

  const currentYear = String(today.getFullYear());
  const currentYearTotal = data.total?.[currentYear];
  const summaryText =
    typeof currentYearTotal === "number"
      ? `${currentYearTotal} contributions in ${currentYear}`
      : "Recent public GitHub activity";

  calendar.innerHTML = `
    <div class="calendar-summary">
      <span>${summaryText}</span>
      <a href="https://github.com/${GITHUB_USERNAME}" target="_blank" rel="noreferrer">View on GitHub</a>
    </div>
    <div class="calendar-body">
      <div class="calendar-day-labels">
        <span></span>
        <span>Mon</span>
        <span></span>
        <span>Wed</span>
        <span></span>
        <span>Fri</span>
        <span></span>
      </div>
      <div class="calendar-grid-wrapper">
        <div class="calendar-month-labels">${monthLabels}</div>
        <div class="calendar-heatmap">${cells}</div>
      </div>
    </div>
    <div class="calendar-legend">
      <a href="https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/troubleshooting-missing-contributions" target="_blank" rel="noreferrer">Learn how GitHub counts contributions</a>
      <div class="calendar-legend-scale">
      <span>Less</span>
      <span class="calendar-legend-box level-0"></span>
      <span class="calendar-legend-box level-1"></span>
      <span class="calendar-legend-box level-2"></span>
      <span class="calendar-legend-box level-3"></span>
      <span class="calendar-legend-box level-4"></span>
      <span>More</span>
      </div>
    </div>
  `;
};

const loadGitHubContributions = async () => {
  const calendar = document.querySelector(".calendar");
  if (!calendar) {
    return;
  }

  try {
    const response = await fetch(GITHUB_CONTRIBUTIONS_API, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const data = await response.json();
    renderGitHubContributions(data);
  } catch (error) {
    console.error("Unable to load GitHub contributions", error);
    calendar.textContent = "Unable to load GitHub activity right now.";
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelector('nav > h1[data-target="About"]')?.addEventListener("click", () => {
    handleToggle("About");
  });

  getNavItems().forEach((li) => {
    li.addEventListener("click", () => {
      handleToggle(li.dataset.target);
    });
  });

  const targetId = window.location.hash.slice(1) || "About";
  handleToggle(targetId);

  updateTime();
  document.getElementById("clock-wrapper").classList.remove("hidden");
  setInterval(updateTime, 1000);
  await loadGitHubContributions();
});

window.addEventListener("hashchange", () => {
  const targetId = window.location.hash.slice(1) || "About";
  handleToggle(targetId);
});
