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

document.querySelectorAll("[data-metrika-goal]").forEach((link) => {
  link.addEventListener("click", () => {
    if (typeof window.ym !== "function") {
      return;
    }

    link.dataset.metrikaGoal
      .split(" ")
      .filter(Boolean)
      .forEach((goal) => {
        window.ym(metrikaId, "reachGoal", goal);
      });
  });
});
