document.querySelectorAll('[data-pending="true"]').forEach((link) => {
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
        window.ym(109692355, "reachGoal", goal);
      });
  });
});
