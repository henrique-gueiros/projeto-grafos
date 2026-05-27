(function () {
  var THEMES = {
    dark: { bg: "#0f0f1a", font: "#111111", stroke: "#0f0f1a" },
    light: { bg: "#eef1f6", font: "#1a1a2e", stroke: "#eef1f6" },
  };

  function boot() {
    if (typeof network === "undefined") return;

    var fitBtn = document.getElementById("btn-fit");
    var physicsBtn = document.getElementById("btn-physics");
    var themeBtn = document.getElementById("btn-theme");
    var physicsOn = true;

    function fitGraph() {
      network.fit({ animation: { duration: 400, easingFunction: "easeInOutQuad" } });
    }

    function updatePhysicsButton() {
      if (!physicsBtn) return;
      physicsBtn.classList.toggle("active", physicsOn);
      var label = physicsBtn.querySelector(".btn-label");
      if (label) label.textContent = physicsOn ? "Pausar" : "Física";
      physicsBtn.title = physicsOn
        ? "Pausar física (Espaço)"
        : "Retomar física (Espaço)";
    }

    function setPhysics(on) {
      physicsOn = on;
      network.setOptions({ physics: { enabled: on } });
      updatePhysicsButton();
    }

    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("grafo-theme", theme);
      var palette = THEMES[theme] || THEMES.dark;
      network.setOptions({
        background: { color: palette.bg },
        nodes: {
          font: {
            color: palette.font,
            strokeWidth: 2,
            strokeColor: palette.stroke,
          },
        },
      });
      if (themeBtn) themeBtn.classList.toggle("active", theme === "light");
    }

    var savedTheme = localStorage.getItem("grafo-theme");
    applyTheme(savedTheme === "light" ? "light" : "dark");
    updatePhysicsButton();

    network.once("stabilizationIterationsDone", fitGraph);
    window.setTimeout(fitGraph, 400);

    if (fitBtn) fitBtn.addEventListener("click", fitGraph);
    if (physicsBtn) {
      physicsBtn.addEventListener("click", function () {
        setPhysics(!physicsOn);
      });
    }
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var next = document.documentElement.getAttribute("data-theme") === "light"
          ? "dark"
          : "light";
        applyTheme(next);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.key === "0") fitGraph();
      else if (e.code === "Space") {
        e.preventDefault();
        setPhysics(!physicsOn);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
