(function () {
  var config = window.GRAFICOS_DINAMICOS || {};
  var baseData = config.nodes || [];
  var regionColors = config.regionColors || {};
  var svgNS = "http://www.w3.org/2000/svg";
  var debounceId = null;

  function makeSvgEl(tag, attrs) {
    var el = document.createElementNS(svgNS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function clearSvg(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function visibleNodeIds() {
    var visible = {};
    if (typeof nodesView !== "undefined" && nodesView.getIds) {
      nodesView.getIds().forEach(function (id) { visible[id] = true; });
      return visible;
    }

    if (typeof nodes === "undefined" || !nodes.get) {
      baseData.forEach(function (item) { visible[item.iata] = true; });
      return visible;
    }

    var allNodes = nodes.get({ returnType: "Object" });
    Object.keys(allNodes).forEach(function (id) {
      if (!allNodes[id].hidden) visible[id] = true;
    });
    return visible;
  }

  function filteredData() {
    var visible = visibleNodeIds();
    return baseData.filter(function (item) {
      return !!visible[item.iata];
    });
  }

  function labelFiltro(data) {
    var label = document.getElementById("charts-region-label");
    if (!label) return;

    if (data.length === baseData.length) {
      label.textContent = "Todas as regiões";
      return;
    }
    if (data.length === 0) {
      label.textContent = "Sem aeroportos no filtro";
      return;
    }

    var regioes = {};
    data.forEach(function (item) { regioes[item.regiao] = true; });
    var nomes = Object.keys(regioes).sort();
    label.textContent = nomes.length === 1 ? nomes[0] : "Filtro atual";
  }

  function drawEmpty(svg, message) {
    clearSvg(svg);
    svg.setAttribute("viewBox", "0 0 420 170");
    svg.appendChild(makeSvgEl("text", {
      x: 210,
      y: 85,
      "text-anchor": "middle",
      class: "chart-empty",
    })).textContent = message;
  }

  function drawRanking(data) {
    var svg = document.getElementById("ranking-chart");
    if (!svg) return;
    if (!data.length) {
      drawEmpty(svg, "Nenhum aeroporto para exibir");
      return;
    }

    clearSvg(svg);
    var width = 420;
    var height = 170;
    var margin = { top: 18, right: 12, bottom: 34, left: 28 };
    var chartW = width - margin.left - margin.right;
    var chartH = height - margin.top - margin.bottom;
    var top = data.slice().sort(function (a, b) {
      return b.grau - a.grau || a.iata.localeCompare(b.iata);
    }).slice(0, 10);
    var maxGrau = Math.max.apply(null, top.map(function (item) { return item.grau; }));
    var barW = chartW / top.length * 0.76;
    var gap = chartW / top.length * 0.24;

    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.appendChild(makeSvgEl("line", {
      x1: margin.left,
      y1: margin.top + chartH,
      x2: margin.left + chartW,
      y2: margin.top + chartH,
      class: "chart-axis",
    }));

    top.forEach(function (item, i) {
      var x = margin.left + i * (barW + gap) + gap / 2;
      var h = maxGrau ? (item.grau / maxGrau) * chartH : 0;
      var y = margin.top + chartH - h;
      var color = regionColors[item.regiao] || "#7e57c2";

      svg.appendChild(makeSvgEl("rect", {
        x: x,
        y: y,
        width: barW,
        height: h,
        rx: 3,
        fill: color,
      }));
      svg.appendChild(makeSvgEl("text", {
        x: x + barW / 2,
        y: y - 5,
        "text-anchor": "middle",
        class: "chart-value",
      })).textContent = item.grau;
      svg.appendChild(makeSvgEl("text", {
        x: x + barW / 2,
        y: margin.top + chartH + 17,
        "text-anchor": "middle",
        class: "chart-label",
      })).textContent = item.iata;
    });
  }

  function drawDistribuicao(data) {
    var svg = document.getElementById("degree-chart");
    if (!svg) return;
    if (!data.length) {
      drawEmpty(svg, "Nenhum grau para exibir");
      return;
    }

    clearSvg(svg);
    var width = 420;
    var height = 170;
    var margin = { top: 18, right: 12, bottom: 36, left: 34 };
    var chartW = width - margin.left - margin.right;
    var chartH = height - margin.top - margin.bottom;
    var counts = {};

    data.forEach(function (item) {
      counts[item.grau] = (counts[item.grau] || 0) + 1;
    });

    var graus = Object.keys(counts).map(Number).sort(function (a, b) { return a - b; });
    var maxFreq = Math.max.apply(null, graus.map(function (grau) { return counts[grau]; }));
    var barW = chartW / graus.length * 0.72;
    var gap = chartW / graus.length * 0.28;

    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.appendChild(makeSvgEl("line", {
      x1: margin.left,
      y1: margin.top + chartH,
      x2: margin.left + chartW,
      y2: margin.top + chartH,
      class: "chart-axis",
    }));

    graus.forEach(function (grau, i) {
      var freq = counts[grau];
      var x = margin.left + i * (barW + gap) + gap / 2;
      var h = maxFreq ? (freq / maxFreq) * chartH : 0;
      var y = margin.top + chartH - h;

      svg.appendChild(makeSvgEl("rect", {
        x: x,
        y: y,
        width: barW,
        height: h,
        rx: 3,
        fill: "#26a69a",
      }));
      svg.appendChild(makeSvgEl("text", {
        x: x + barW / 2,
        y: y - 5,
        "text-anchor": "middle",
        class: "chart-value",
      })).textContent = freq;
      svg.appendChild(makeSvgEl("text", {
        x: x + barW / 2,
        y: margin.top + chartH + 17,
        "text-anchor": "middle",
        class: "chart-label",
      })).textContent = grau;
    });

    svg.appendChild(makeSvgEl("text", {
      x: margin.left + chartW / 2,
      y: height - 4,
      "text-anchor": "middle",
      class: "chart-label",
    })).textContent = "Grau";
  }

  function renderCharts() {
    var data = filteredData();
    labelFiltro(data);
    drawRanking(data);
    drawDistribuicao(data);
  }

  function scheduleRender() {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(renderCharts, 80);
  }

  function setupListeners() {
    renderCharts();

    if (typeof nodes !== "undefined" && nodes.on) {
      nodes.on("*", function (event) {
        if (event === "update" || event === "remove" || event === "add") {
          scheduleRender();
        }
      });
    }

    document.addEventListener("click", function (event) {
      if (event.target.closest("#filtro-simples .filtro-chip") ||
          event.target.closest("#btn-limpar-filtros")) {
        scheduleRender();
      }
    });
    document.addEventListener("grafo-filtro-change", scheduleRender);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupListeners);
  } else {
    setupListeners();
  }
})();
