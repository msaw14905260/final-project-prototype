import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// === BASIC LAYOUT ===
const margin = { top: 40, right: 40, bottom: 70, left: 200 };
const width = 960 - margin.left - margin.right;
const fullWidth = width + margin.left + margin.right;
const barHeight = 40;

// Regions we care about
const focusRegions = new Set([
  "Latin America & Caribbean",
  "Europe & Central Asia",
  "Sub-Saharan Africa",
  "East Asia & Pacific",
  "South Asia",
  "Middle East & North Africa",
  "North America"
]);

// Container (card) in the main page
const container = d3.select("#viz1-container");
if (container.empty()) {
  console.warn("gender.js: #viz1-container not found – bar chart will not render.");
}

// SVG setup
const svg = container
  .append("svg")
  .attr("class", "gender-chart")
  .attr("viewBox", `0 0 ${fullWidth} 500`)
  .attr("preserveAspectRatio", "xMidYMid meet");

const g = svg
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleBand().padding(0.2);

const xAxisG = g.append("g").attr("class", "x-axis");
const yAxisG = g.append("g").attr("class", "y-axis");

const decadeSelect = d3.select("#decade-dropdown");

// Tooltip
const tooltip = container
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background", "white")
  .style("padding", "8px 10px")
  .style("border-radius", "8px")
  .style("border", "1px solid #ddd")
  .style("box-shadow", "0 8px 20px rgba(15, 23, 42, 0.12)")
  .style("font-size", "0.75rem")
  .style("line-height", "1.4")
  .style("pointer-events", "none")
  .style("opacity", 0);

let allData = [];
let decades = [];

// === LOAD DATA ===
// Adjust path if needed (e.g. "gender_clean_regions.csv" if it's in root)
d3.csv("data/gender_clean_regions.csv", d3.autoType).then(raw => {
  console.log("gender.js – columns:", raw.columns);

  // Filter rows: focus regions + valid decade + at least one of the secondary metrics present
  const cleaned = raw.filter(d =>
    focusRegions.has(d.region) &&
    Number.isFinite(d.decade) &&
    (
      Number.isFinite(d["average_value_School enrollment, secondary, female (% net)"]) ||
      Number.isFinite(d["average_value_School enrollment, secondary, male (% net)"])
    )
  );

  // Roll up: (decade, region) -> mean female/male secondary enrollment
  const rollup = d3.rollup(
    cleaned,
    values => {
      const female = d3.mean(
        values,
        v => v["average_value_School enrollment, secondary, female (% net)"]
      );
      const male = d3.mean(
        values,
        v => v["average_value_School enrollment, secondary, male (% net)"]
      );
      return { female, male };
    },
    d => d.decade,
    d => d.region
  );

  allData = [];
  rollup.forEach((regionMap, decade) => {
    regionMap.forEach((vals, region) => {
      const female = vals.female;
      const male = vals.male;
      if (!Number.isFinite(female) || !Number.isFinite(male)) return;
      allData.push({
        decade: +decade,
        region,
        female_secondary: female,
        male_secondary: male,
        secondary_gap: female - male  // girls - boys
      });
    });
  });

  console.log("gender.js – decade-aggregated rows:", allData.length);

  // Decades we actually have
  decades = Array.from(new Set(allData.map(d => d.decade)))
    .filter(d => d >= 1970 && d <= 2010)
    .sort(d3.ascending);

  console.log("gender.js – decades:", decades);

  if (decades.length === 0) {
    console.error("gender.js – no valid decades in data. Check CSV / path.");
    return;
  }

  // Populate dropdown
  decadeSelect
    .selectAll("option")
    .data(decades)
    .join("option")
    .attr("value", d => d)
    .text(d => `${d}-${d + 9}`);

  // Default to 2010 decade if available, else latest
  const defaultDecade = 2010;
  decadeSelect.property(
    "value",
    decades.includes(defaultDecade) ? defaultDecade : decades[decades.length - 1]
  );

  // Global domain based on absolute gap across all decades
  const maxAbs = d3.max(allData, d => Math.abs(d.secondary_gap));
  x.domain([-maxAbs, maxAbs]);

  // Draw first view
  updateChart(+decadeSelect.property("value"), false);

  // Interaction
  decadeSelect.on("change", function () {
    const dec = +this.value;
    updateChart(dec, true);
  });
}).catch(err => {
  console.error("gender.js – error loading CSV:", err);
});

// === UPDATE FUNCTION ===
function updateChart(decade, animate = true) {
  // Subset for this decade
  const dataDecade = allData
    .filter(d => d.decade === decade)
    .sort((a, b) => d3.descending(a.secondary_gap, b.secondary_gap));

  console.log(`gender.js – decade ${decade}:`, dataDecade.length, "regions");

  // Rescale x to this decade's max abs gap (so bars use full width)
  const maxAbsDecade = d3.max(dataDecade, d => Math.abs(d.secondary_gap)) || 1;
  x.domain([-maxAbsDecade, maxAbsDecade]);

  const height = dataDecade.length * barHeight;
  const svgHeight = height + margin.top + margin.bottom + 30;

  // Update viewBox to fit new height
  svg.attr("viewBox", `0 0 ${fullWidth} ${svgHeight}`);

  // Y-band for regions
  y.range([0, height]).domain(dataDecade.map(d => d.region));

  const t = animate
    ? d3.transition().duration(900).ease(d3.easeCubicOut)
    : d3.transition().duration(0);

  // === BARS ===
  const bars = g.selectAll("rect.bar").data(dataDecade, d => d.region);

  // EXIT
  bars
    .exit()
    .transition(t)
    .attr("width", 0)
    .attr("x", x(0))
    .remove();

  // ENTER
  const barsEnter = bars
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("y", d => y(d.region))
    .attr("height", y.bandwidth())
    .attr("x", x(0))
    .attr("width", 0)
    .attr("fill", d => (d.secondary_gap >= 0 ? "#ff82c6" : "#6aa5ff"))
    .on("mouseover", (event, d) => {
      const decadeLabel = `${d.decade}-${d.decade + 9}`;
      const gap = d.secondary_gap;
      const absGap = Math.abs(gap).toFixed(2);

      let directionText, directionColor;
      if (gap > 0) {
        directionText = "Gap favors girls";
        directionColor = "#ff82c6";
      } else if (gap < 0) {
        directionText = "Gap favors boys";
        directionColor = "#6aa5ff";
      } else {
        directionText = "No gender gap";
        directionColor = "#9ca3af";
      }

      tooltip
        .style("opacity", 1)
        .html(`
          <div style="text-decoration: underline; font-weight: 700; margin-bottom: 4px;">
            ${d.region}
          </div>
          <div><span style="font-style: italic;">Decade:</span> ${decadeLabel}</div>
          <div><span style="font-style: italic;">Girls in secondary:</span> ${d.female_secondary.toFixed(1)}%</div>
          <div><span style="font-style: italic;">Boys in secondary:</span> ${d.male_secondary.toFixed(1)}%</div>
          <div><span style="font-style: italic;">Gap (girls - boys):</span> ${absGap} percentage points</div>
          <div style="margin-top: 4px; font-weight: 600; color: ${directionColor};">
            ${directionText}
          </div>
        `);
    })
    .on("mousemove", event => {
      const rect = container.node().getBoundingClientRect();
      const offsetX = 24;
      const offsetY = -80;

      let xPos = event.clientX - rect.left + offsetX;
      let yPos = event.clientY - rect.top + offsetY;

      if (yPos < 0) yPos = 8;

      tooltip
        .style("left", `${xPos}px`)
        .style("top", `${yPos}px`);
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  const barsAll = barsEnter.merge(bars);

  // For animation: reset then transition
  if (animate) {
    barsAll
      .attr("x", x(0))
      .attr("width", 0);
  }

  barsAll
    .transition(t)
    .attr("y", d => y(d.region))
    .attr("height", y.bandwidth())
    .attr("fill", d => (d.secondary_gap >= 0 ? "#ff82c6" : "#6aa5ff"))
    .attr("x", d => (d.secondary_gap >= 0 ? x(0) : x(d.secondary_gap)))
    .attr("width", d => Math.abs(x(d.secondary_gap) - x(0)));

  // === AXES ===
  xAxisG
    .attr("transform", `translate(0,${height})`)
    .transition(t)
    .call(
      d3.axisBottom(x)
        .ticks(7)
        .tickFormat(d => `${d} pts`)
    );

  yAxisG
    .transition(t)
    .call(d3.axisLeft(y));

  // === X-AXIS TITLE ===
  svg.selectAll(".x-axis-title").remove();

  svg.append("text")
    .attr("class", "x-axis-title")
    .attr("text-anchor", "middle")
    .attr("x", margin.left + width / 2)
    .attr("y", height + margin.top + 52)
    .style("font-size", "0.8rem")
    .style("fill", "#cbd5f5")
    .text("Gender gap (girls - boys), percentage points");
}
