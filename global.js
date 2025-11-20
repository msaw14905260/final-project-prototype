// global.js
const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/* =======================================
 * PART A: SCROLLYTELLING GLOBE (TOP)
 * =====================================*/
(function scrollyGlobe() {
  const container = document.getElementById("globe-container");
  if (!container) return; // safety

  const size = container.clientWidth || 760;
  const width = size;
  const height = size;
  const radius = Math.min(width, height) / 2 - 20;

  const svg = d3
    .select("#globe")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const projection = d3
    .geoOrthographic()
    .scale(radius)
    .translate([width / 2, height / 2])
    .clipAngle(90);

  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule();

  let rotation = [0, -20];
  projection.rotate(rotation);
  let isDragging = false;
  let lastDragPos = null;
  let lastRotation = null;

  // water + graticule
  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("class", "water")
    .attr("d", path);

  svg.append("path")
    .datum(graticule())
    .attr("class", "graticule")
    .attr("d", path);

  const countriesLayer = svg.append("g").attr("id", "countries-layer");
  const annotationGroup = svg.append("g").attr("id", "annotation-group");

  // Regions for steps
  // Regions for steps (approximate lon, lat)
  const regionAnnotations = [
    { step: 0, name: "Africa",                      coords: [20, 5] },
    { step: 1, name: "Asia",                        coords: [90, 30] },
    { step: 2, name: "Middle East & North Africa",  coords: [35, 25] },
    { step: 3, name: "Europe",                      coords: [15, 50] },
    { step: 4, name: "Latin America & the Caribbean", coords: [-70, -10] },
    { step: 5, name: "Northern America",            coords: [-100, 40] },
    { step: 6, name: "Oceania",                     coords: [140, -25] },
  ];


  let countries = [];

  d3.json(WORLD_URL)
    .then(world => {
      countries = topojson.feature(world, world.objects.countries).features;

    countriesLayer
        .selectAll("path")
        .data(countries)
        .join("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", "#444f7a")
        .attr("stroke", "white")
        .attr("stroke-width", 0.3);

      addDrag();    // you can still drag manually
      // No auto-rotation for scrolly globe
      initScrolly();

    })
    .catch(err => console.error("Scrolly globe world load error:", err));

  function addDrag() {
    svg.call(
      d3.drag()
        .on("start", (event) => {
          isDragging = true;
          lastDragPos = [event.x, event.y];
          lastRotation = rotation.slice();
        })
        .on("drag", (event) => {
          const dx = event.x - lastDragPos[0];
          const dy = event.y - lastDragPos[1];

          rotation[0] = lastRotation[0] + dx * 0.4;
          rotation[1] = lastRotation[1] - dy * 0.4;

          projection.rotate(rotation);
          render();
        })
        .on("end", () => {
          isDragging = false;
        })
    );
  }

  function startRotation() {
    const velocity = 0.02;
    d3.timer(() => {
      if (isDragging) return;
      rotation[0] += velocity;
      projection.rotate(rotation);
      render();
    });
  }

  function render() {
    svg.selectAll("path.water").attr("d", path);
    svg.selectAll("path.graticule").attr("d", path);
    countriesLayer.selectAll("path").attr("d", path);
    // annotation shapes re-projected in drawAnnotation
  }

  // Scrollytelling using IntersectionObserver
  function initScrolly() {
    const steps = document.querySelectorAll(".step");
    if (!steps.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const stepIndex = +el.dataset.step;

          steps.forEach((s) => s.classList.toggle("is-active", s === el));
          activateStep(stepIndex);
        });
      },
      {
        root: null,
        threshold: 0.6,
      }
    );

    steps.forEach((step) => observer.observe(step));
    activateStep(0);
  }

  function activateStep(stepIndex) {
    const region = regionAnnotations.find((r) => r.step === stepIndex);
    if (!region) {
      annotationGroup.selectAll("*").remove();
      return;
    }

    const [lon, lat] = region.coords;
    rotation = [-lon, -lat];
    projection.rotate(rotation);

    svg.selectAll("path.water").attr("d", path);
    svg.selectAll("path.graticule").attr("d", path);
    countriesLayer.selectAll("path").attr("d", path);

    drawAnnotation(region);
  }

  function drawAnnotation(region) {
    annotationGroup.selectAll("*").remove();

    const [x, y] = projection(region.coords);
    if (!isFinite(x) || !isFinite(y)) return;

    const labelOffsetX = 80;
    const labelOffsetY = -30;

    annotationGroup
      .append("circle")
      .attr("class", "annotation-dot")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 5);

    annotationGroup
      .append("line")
      .attr("class", "annotation-line")
      .attr("x1", x)
      .attr("y1", y)
      .attr("x2", x + labelOffsetX)
      .attr("y2", y + labelOffsetY);

    annotationGroup
      .append("text")
      .attr("class", "annotation-label")
      .attr("x", x + labelOffsetX)
      .attr("y", y + labelOffsetY - 4)
      .text(region.name);
  }
})();



/* =======================================
/* =======================================
 * PART B: EXPLORE GLOBE (BOTTOM)
 * =====================================*/
(function exploreGlobe() {
  const container = document.getElementById("globe-explore-container");
  const svgEl = document.getElementById("globe-explore");
  if (!container || !svgEl) return; // if bottom view isn't in the HTML, just skip

  const size = container.clientWidth || 760;
  const width = size;
  const height = size;
  const radius = Math.min(width, height) / 2 - 20;

  const svg = d3
    .select("#globe-explore")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const projection = d3
    .geoOrthographic()
    .scale(radius)
    .translate([width / 2, height / 2])
    .clipAngle(90);

  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule();

  let rotation = [0, -20];
  projection.rotate(rotation);
  let isDragging = false;
  let lastDragPos = null;
  let lastRotation = null;

  // Background
  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("class", "water")
    .attr("d", path);

  svg.append("path")
    .datum(graticule())
    .attr("class", "graticule")
    .attr("d", path);

  const countriesLayer = svg.append("g").attr("id", "explore-countries");

  const metricSelect = document.getElementById("metric-select");
  const yearSlider = document.getElementById("year-slider");
  const yearLabel = document.getElementById("year-label");
  const legendMin = document.getElementById("legend-min");
  const legendMax = document.getElementById("legend-max");

  if (!metricSelect || !yearSlider || !yearLabel || !legendMin || !legendMax) {
    console.warn("Explore controls missing, skipping explore globe.");
    return;
  }

  const colorScale = d3.scaleSequential(d3.interpolateViridis);

  let countries = [];
  let dataByCodeYear = null;
  let metricColumns = [];
  let years = [];
  let currentMetric = null;
  let currentYear = null;

  // 1️⃣ ALWAYS load world + draw countries (even if CSV fails)
  d3.json(WORLD_URL)
    .then(world => {
      countries = topojson.feature(world, world.objects.countries).features;
      console.log("Explore globe: countries loaded:", countries.length);

      countriesLayer
        .selectAll("path")
        .data(countries)
        .join("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", "#444f7a")    // base color
        .attr("stroke", "white")
        .attr("stroke-width", 0.3);

      addDrag();
      startRotation();
      render();

      // 2️⃣ Then try loading gender.csv for choropleth
      loadGenderData();
    })
    .catch(err => {
      console.error("Explore globe world load error:", err);
    });

  function loadGenderData() {
    d3.csv("gender.csv", d3.autoType)
      .then(data => {
        console.log("Explore globe: gender.csv rows:", data.length);

        dataByCodeYear = d3.rollup(
          data,
          v => v,
          d => d["Country Code"],  // e.g. "USA", "FRA"
          d => d.Year
        );

        metricColumns = data.columns.filter(c => c.startsWith("average_value_"));
        if (!metricColumns.length) {
          console.warn("No metric columns starting with 'average_value_' in gender.csv");
        }

        const preferredMetric =
          metricColumns.find(c =>
            c.toLowerCase().includes("life expectancy at birth, female (years)")
          ) || metricColumns[0];

        currentMetric = preferredMetric;

        years = Array.from(new Set(data.map(d => d.Year))).sort(d3.ascending);
        currentYear = years[years.length - 1];

        setupControls();
        updateChoropleth();
      })
      .catch(err => {
        console.error("Explore globe gender.csv load error:", err);
        // If CSV fails, we still keep the plain blue globe.
      });
  }

  function setupControls() {
    metricSelect.innerHTML = "";
    metricColumns.forEach(col => {
      const opt = document.createElement("option");
      opt.value = col;
      opt.textContent = prettyMetricLabel(col);
      metricSelect.appendChild(opt);
    });

    if (currentMetric) metricSelect.value = currentMetric;

    metricSelect.addEventListener("change", () => {
      currentMetric = metricSelect.value;
      updateChoropleth();
    });

    yearSlider.min = 0;
    yearSlider.max = years.length - 1;
    yearSlider.value = years.indexOf(currentYear);
    yearLabel.textContent = currentYear;

    yearSlider.addEventListener("input", () => {
      const idx = +yearSlider.value;
      currentYear = years[idx];
      yearLabel.textContent = currentYear;
      updateChoropleth();
    });
  }

  function prettyMetricLabel(col) {
    let label = col.replace("average_value_", "");
    label = label.replace(
      " (% of primary school age children)",
      " (% of children)"
    );
    label = label.replace(
      " (births per 1,000 women ages 15-19)",
      " (per 1k women 15–19)"
    );
    return label;
  }

  function addDrag() {
    svg.call(
      d3.drag()
        .on("start", (event) => {
          isDragging = true;
          lastDragPos = [event.x, event.y];
          lastRotation = rotation.slice();
        })
        .on("drag", (event) => {
          const dx = event.x - lastDragPos[0];
          const dy = event.y - lastDragPos[1];

          rotation[0] = lastRotation[0] + dx * 0.4;
          rotation[1] = lastRotation[1] - dy * 0.4;

          projection.rotate(rotation);
          render();
        })
        .on("end", () => {
          isDragging = false;
        })
    );
  }

  function startRotation() {
    const velocity = 0.01;
    d3.timer(() => {
      if (isDragging) return;
      rotation[0] += velocity;
      projection.rotate(rotation);
      render();
    });
  }

  function render() {
    svg.selectAll("path.water").attr("d", path);
    svg.selectAll("path.graticule").attr("d", path);
    countriesLayer.selectAll("path.country").attr("d", path);
  }

  function getValue(countryCode, year, metric) {
    if (!countryCode || !metric || !dataByCodeYear) return null;
    const byYear = dataByCodeYear.get(countryCode);
    if (!byYear) return null;
    const rows = byYear.get(year);
    if (!rows || !rows.length) return null;

    const vals = rows
      .map(r => r[metric])
      .filter(v => v != null && !isNaN(v));

    if (!vals.length) return null;
    return d3.mean(vals);
  }

  function updateChoropleth() {
    if (!countries.length || !currentMetric || !dataByCodeYear) return;

    const vals = [];
    countries.forEach(d => {
      const code =
        d.id ||
        d.properties.iso3 ||
        d.properties.ISO3 ||
        d.properties.iso_a3;
      const v = getValue(code, currentYear, currentMetric);
      if (v != null && !isNaN(v)) vals.push(v);
    });

    if (!vals.length) {
      console.warn("No data values for this metric/year.");
      return;
    }

    const extent = d3.extent(vals);
    colorScale.domain(extent);

    countriesLayer
      .selectAll("path.country")
      .attr("fill", d => {
        const code =
          d.id ||
          d.properties.iso3 ||
          d.properties.ISO3 ||
          d.properties.iso_a3;
        const v = getValue(code, currentYear, currentMetric);
        if (v == null || isNaN(v)) return "#444f7a"; // fallback color
        return colorScale(v);
      });

    legendMin.textContent = d3.format(".2f")(extent[0]);
    legendMax.textContent = d3.format(".2f")(extent[1]);

    render();
  }
})();
