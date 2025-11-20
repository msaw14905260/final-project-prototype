// SUPER MINIMAL TEST: just draw countries in solid red on a rotating globe.
// No CSV, no metrics. If this doesn't show countries, the problem is ONLY
// in loading the world map / JS itself.

const container = document.getElementById("globe-container");
const size = container ? container.clientWidth : 760;
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

// Background: water + graticule
svg.append("path")
  .datum({ type: "Sphere" })
  .attr("class", "water")
  .attr("d", path);

svg.append("path")
  .datum(graticule())
  .attr("class", "graticule")
  .attr("d", path);

// ==== LOAD WORLD MAP (TopoJSON) & DRAW COUNTRIES ====
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
  .then(world => {
    console.log("World loaded", world);

    const countries = topojson.feature(world, world.objects.countries).features;
    console.log("Countries length:", countries.length);

    svg.append("g")
      .attr("id", "countries-layer")
      .selectAll("path")
      .data(countries)
      .join("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("fill", "red")          // BIG OBVIOUS COLOR
      .attr("stroke", "white")      // WHITE BORDERS
      .attr("stroke-width", 0.4);

    addDrag();
    startRotation();
  })
  .catch(err => {
    console.error("Error loading world map:", err);
  });

// ==== DRAG TO ROTATE ====
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

// ==== AUTO ROTATION ====
function startRotation() {
  const velocity = 0.02; // degrees per frame

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
  svg.select("#countries-layer").selectAll("path").attr("d", path);
}
