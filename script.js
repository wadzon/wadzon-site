const metrikaId = 109692355;

if (typeof window.ym !== "function") {
  window.ym = function () {
    (window.ym.a = window.ym.a || []).push(arguments);
  };
  window.ym.l = Number(new Date());

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://mc.yandex.ru/metrika/tag.js";
  document.head.appendChild(script);

  window.ym(metrikaId, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true
  });
}

document.querySelectorAll("[data-pending='true']").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
  });
});

function reachMetrikaGoals(goalString) {
  if (typeof window.ym !== "function") {
    return;
  }

  goalString
    .split(" ")
    .filter(Boolean)
    .forEach((goal) => {
      window.ym(metrikaId, "reachGoal", goal);
    });
}

document.querySelectorAll("[data-metrika-goal]").forEach((link) => {
  link.addEventListener("click", () => {
    reachMetrikaGoals(link.dataset.metrikaGoal);
  });
});

const examplesCatalog = document.getElementById("examples-catalog");

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

function hydrateExampleAudio(scope) {
  scope.querySelectorAll("audio[data-src]").forEach((audio) => {
    audio.src = audio.dataset.src;
    audio.removeAttribute("data-src");
  });
}

if (examplesCatalog && Array.isArray(window.WADZON_EXAMPLES_CATALOG)) {
  const root = examplesCatalog.dataset.examplesRoot || "assets/examples/";

  window.WADZON_EXAMPLES_CATALOG.forEach((category, index) => {
    const details = document.createElement("details");
    details.className = "example-category";
    if (index === 0) {
      details.open = true;
    }

    const summary = document.createElement("summary");
    summary.className = "example-category__summary";

    const summaryText = createElement("span", "example-category__title", category.category);
    const summaryCount = createElement("span", "example-category__count", `${category.examples.length} примера`);
    summary.append(summaryText, summaryCount);
    details.append(summary);

    const grid = createElement("div", "example-grid");

    category.examples.forEach((example) => {
      const card = createElement("article", "example-card");

      const tags = createElement("div", "example-tags");
      example.tags.forEach((tag) => {
        tags.append(createElement("span", "", tag));
      });

      const title = createElement("h3", "", example.title);
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "none";
      audio.dataset.src = `${root}${example.audio}`;
      audio.setAttribute("aria-label", example.title);

      const action = createElement("a", "example-order-button", "Хочу похожую песню");
      action.href = "contacts.html#order";
      action.dataset.metrikaGoal = "example_order_click";
      action.addEventListener("click", () => {
        reachMetrikaGoals(action.dataset.metrikaGoal);
      });

      card.append(tags, title, audio, action);
      grid.append(card);
    });

    details.append(grid);
    details.addEventListener("toggle", () => {
      if (details.open) {
        hydrateExampleAudio(details);
      }
    });

    examplesCatalog.append(details);
    if (details.open) {
      hydrateExampleAudio(details);
    }
  });
}
