import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const featuresList = {
 primary: {
 female:
 "average_value_Adjusted net enrollment rate, primary, female (% of primary school age children)",
 male:
 "average_value_Adjusted net enrollment rate, primary, male (% of primary school age children)",
 },
 secondary: {
 female: "average_value_School enrollment, secondary, female (% gross)",
 male: "average_value_School enrollment, secondary, male (% gross)",
 },
 tertiary: {
 female: "average_value_School enrollment, tertiary, female (% gross)",
 male: "average_value_School enrollment, tertiary, male (% gross)",
 },
 fertility: {
 both: "average_value_Fertility rate, total (births per woman)",
 },
 lifeexp: {
 female: "average_value_Life expectancy at birth, female (years)",
 male: "average_value_Life expectancy at birth, male (years)",
 },
 survival65: {
 female: "average_value_Survival to age 65, female (% of cohort)",
 male: "average_value_Survival to age 65, male (% of cohort)",
 },
};

const stages = [
 { id: "primary", label: "Primary School" },
 { id: "secondary", label: "Secondary School" },
 { id: "tertiary", label: "Higher Education" },
 { id: "family", label: "Family & Fertility" },
 { id: "longevity", label: "Long-term Health" },
];


let allData = [];
let currentRegion = null;
let currentYear = null;
let currentGender = "female";
let currentStageIndex = 0;

const regionSelect = d3.select("#lp-region-select");
const yearSelect = d3.select("#lp-year-select");
const genderToggle = d3.select("#lp-gender-toggle");
const stageTrack = d3.select("#lp-stage-track");
const titleEl = d3.select("#lp-stage-title");
const textEl = d3.select("#lp-stage-text");
const miniChartContainer = d3.select("#lp-stage-mini-chart");
const prevBtn = d3.select("#lp-prev-stage");
const nextBtn = d3.select("#lp-next-stage");


d3.csv("data/gender_regions_decades.csv", d3.autoType).then((data) => {
 allData = data.filter((d) => d.region && d.Year);

 initControls();
 initStageTrack();
 
 currentRegion = regionSelect.property("value");
 currentYear = +yearSelect.property("value");
 updateStageView();
});


function initControls() {
 const regions = Array.from(new Set(allData.map((d) => d.region))).sort(
 d3.ascending
 );
 regionSelect
 .selectAll("option")
 .data(regions)
 .join("option")
 .attr("value", (d) => d)
 .text((d) => d);


 const allYears = Array.from(new Set(allData.map((d) => d.Year))).sort(
 d3.ascending
 );
 const years = allYears.filter((y) => y >= 1970 && y <= 2010);

 yearSelect
 .selectAll("option")
 .data(years)
 .join("option")
 .attr("value", (d) => d)
 .text((d) => `${d}-${d + 9}`);


 yearSelect.property("value", d3.max(years));

 regionSelect.on("change", () => {
 currentRegion = regionSelect.property("value");
 updateStageView();
 });

 yearSelect.on("change", () => {
 currentYear = +yearSelect.property("value");
 updateStageView();
 });

 genderToggle.selectAll("button").on("click", function () {
 const btn = d3.select(this);
 currentGender = btn.attr("data-gender");
 genderToggle.selectAll("button").classed("active", false);
 btn.classed("active", true);
 updateStageView();
 });

 prevBtn.on("click", () => {
 if (currentStageIndex > 0) {
 currentStageIndex -= 1;
 updateStageView();
 }
 });

 nextBtn.on("click", () => {
 if (currentStageIndex < stages.length - 1) {
 currentStageIndex += 1;
 updateStageView();
 }
 });
}

function initStageTrack() {
 const nodes = stageTrack
 .selectAll(".stage-node")
 .data(stages)
 .join("div")
 .attr("class", "stage-node")
 .on("click", (_, d) => {
 currentStageIndex = stages.findIndex((s) => s.id === d.id);
 updateStageView();
 });

 nodes
 .append("div")
 .attr("class", "stage-node-circle")
 .text((d, i) => i + 1);

 nodes
 .append("div")
 .attr("class", "stage-node-label")
 .text((d) => d.label);
}



function updateStageView() {
 if (!currentRegion) currentRegion = regionSelect.property("value");
 if (!currentYear) currentYear = +yearSelect.property("value");

 
 const row = allData.find(
 (d) => d.region === currentRegion && d.Year === currentYear
 );

 const stage = stages[currentStageIndex];

 
 stageTrack.selectAll(".stage-node").classed("active", (d, i) => {
 return i === currentStageIndex;
 });

 stageTrack.selectAll(".stage-node").classed("completed", (d, i) => {
 return i < currentStageIndex;
 });

 
 prevBtn.property("disabled", currentStageIndex === 0);
 nextBtn.text(
 currentStageIndex === stages.length - 1 ? "Finish ◀◀" : "Next stage ▶"
 );

 if (!row) {
 titleEl.text("No data for this path (yet)");
 textEl.text(
 `We don't have enough data for ${currentRegion} in ${currentYear}. Try a different year or region.`
 );
 miniChartContainer.selectAll("*").remove();
 return;
 }
 const genderLabel = currentGender === "female" ? "girl" : "boy";
 const otherGender = currentGender === "female" ? "male" : "female";
 const region = currentRegion;
 const year = currentYear;

 if (stage.id === "primary") {
 const valSelf = getMetric(row, "primary", currentGender);
 const valOther = getMetric(row, "primary", otherGender);

 titleEl.text("Stage 1 · Primary School");
 if (isNumber(valSelf) && isNumber(valOther)) {
 const diff = valSelf - valOther;
 const word =
 Math.abs(diff) < 1
 ? "about the same chance"
 : diff > 0
 ? "a higher chance"
 : "a lower chance";
 
 textEl.text(
 `As a ${genderLabel} in ${region} in ${year}, you have about ${valSelf.toFixed(1)}% chance of being enrolled in primary school. 
 That’s ${word} than ${otherGender === "female" ? "girls" : "boys"}, who are at ${valOther.toFixed(1)}%.`
 );
 drawMiniBarChart({
 title: "Primary school enrollment",
 row,
 stageId: "primary",
 unit: "%",
 });
 } else {
 textEl.text(
 `We don’t have enough data about primary school enrollment in ${region} in ${year}. Try a different year or region.`
 );
 miniChartContainer.selectAll("*").remove();
 }
 } else if (stage.id === "secondary") {
 const valSelf = getMetric(row, "secondary", currentGender);
 const valOther = getMetric(row, "secondary", otherGender);

 titleEl.text("Stage 2 · Secondary School");

 if (isNumber(valSelf) && isNumber(valOther)) {
 const diff = valSelf - valOther;
 const word =
 Math.abs(diff) < 1
 ? "about the same chance"
 : diff > 0
 ? "a better chance"
 : "a worse chance";
 textEl.text(
 `Moving into secondary school, ${genderLabel}s in ${region} in ${year} are enrolled at about ${valSelf.toFixed(1)}%. 
 That gives you ${word} of staying in school compared to ${otherGender === "female" ? "girls" : "boys"} (${valOther.toFixed(1)}%).`
 );
 drawMiniBarChart({
 title: "Secondary school enrollment",
 row,
 stageId: "secondary",
 unit: "%",
 });
 } else {
 textEl.text(
 `Secondary school data is patchy for this path, so we can’t say much about the gap here.`
 );
 miniChartContainer.selectAll("*").remove();
 }
 } else if (stage.id === "tertiary") {
 const valSelf = getMetric(row, "tertiary", currentGender);
 const valOther = getMetric(row, "tertiary", otherGender);

 titleEl.text("Stage 3 · Higher Education");

 if (isNumber(valSelf) && isNumber(valOther)) {
 const diff = valSelf - valOther;
 const word =
 Math.abs(diff) < 1
 ? "about equally"
 : diff > 0
 ? "slightly more likely"
 : "less likely";
 
 textEl.text(
 `Only a smaller group reaches college or university. In ${region} in ${year}, around ${valSelf.toFixed(1)}% of ${genderLabel}s are 
 enrolled in tertiary education, while ${otherGender === "female" ? "girls" : "boys"} are at ${valOther.toFixed(1)}%. You’re ${word} to continue studying beyond secondary school.`
 );
 
 drawMiniBarChart({
 title: "Tertiary enrollment",
 row,
 stageId: "tertiary",
 unit: "%",
 });
 } else {
 textEl.text(
 `We’re missing tertiary enrollment data for this path, which already tells a story: many regions still don’t track (or provide) detailed higher-education data by gender.`
 );
 miniChartContainer.selectAll("*").remove();
 } 
 } else if (stage.id === "family") {
 const fert = getMetric(row, "fertility", "both");

 titleEl.text("Stage 4 · Family & Fertility");

 if (isNumber(fert)) {
 textEl.text(
 `In ${region} in ${year}, families have about ${fert.toFixed(1)} children on average. 
 This statistic is measured per woman, but it shapes daily life for everyone—how many siblings you might have, 
 how soon people start families, and how easy it is to stay in school or work.`
 );
 drawFertilityChart(fert);
 } else {
 textEl.text(
 `We don’t have solid fertility data for this path, so we skip this part of the story.`
 );
 miniChartContainer.selectAll("*").remove();
 }
 } else if (stage.id === "longevity") {
 const leSelf = getMetric(row, "lifeexp", currentGender);
 const leOther = getMetric(row, "lifeexp", otherGender);
 const survSelf = getMetric(row, "survival65", currentGender);
 const survOther = getMetric(row, "survival65", otherGender);

 titleEl.text("Stage 5 · Long-term Health");

 if (isNumber(leSelf) && isNumber(survSelf)) {
 let text = `By the end of the path, a typical ${genderLabel} in ${region} in ${year} can expect to live to about ${leSelf.toFixed(1)} years old. 
 Around ${survSelf.toFixed(1)}% make it to age 65.`;
 
 if (isNumber(leOther) && isNumber(survOther)) {
 const deltaLE = leSelf - leOther;
 const deltaSurv = survSelf - survOther;

 const leWord =
 Math.abs(deltaLE) < 0.4
 ? "about the same life expectancy"
 : deltaLE > 0
 ? "a slightly longer life"
 : "a slightly shorter life";
 
 text += ` Compared to ${
 otherGender === "female" ? "girls" : "boys"}, that means ${leWord} (they are at ${leOther.toFixed(1)} years and ${survOther.toFixed(1)}% reach 65).`;
 } 
 
 textEl.text(text);
 drawLongevityChart({ leSelf, leOther, survSelf, survOther });
 } else {
 textEl.text(
 `Health and survival data aren’t available here, so we can’t close the story with life expectancy for this path.`
 );
 miniChartContainer.selectAll("*").remove();
 }
 }
}



function getMetric(row, stageId, gender) {
 const cols = featuresList[stageId];
 if (!cols) return null;

 if (gender === "both") {
 const col = cols.both;
 return row[col];
 }

 const colName = cols[gender];
 return row[colName];
}

function isNumber(v) {
 return v !== null && v !== undefined && !Number.isNaN(v);
}


function drawMiniBarChart({ title, row, stageId, unit }) {
 miniChartContainer.selectAll("*").remove();

 const valFemale = getMetric(row, stageId, "female");
 const valMale = getMetric(row, stageId, "male");

 if (!isNumber(valFemale) || !isNumber(valMale)) {
 return;
 }
 
 const data = [
 { gender: "Girls", value: valFemale },
 { gender: "Boys", value: valMale },
 ];

 const width = 340;
 const height = 90;
 const margin = { top: 20, right: 10, bottom: 24, left: 70 };

 const svg = miniChartContainer
 .append("svg")
 .attr("width", width)
 .attr("height", height);

 const x = d3
 .scaleLinear()
 .domain([0, d3.max(data, (d) => d.value) || 1])
 .nice()
 .range([margin.left, width - margin.right]);

 const y = d3
 .scaleBand()
 .domain(data.map((d) => d.gender))
 .range([margin.top, height - margin.bottom])
 .padding(0.3);
 svg
 .append("text")
 .attr("x", margin.left)
 .attr("y", 12)
 .attr("fill", "#555")
 .attr("font-size", 11)
 .text(title);

 svg
 .selectAll("rect.bar")
 .data(data)
 .join("rect")
 .attr("class", "bar")
 .attr("x", x(0))
 .attr("y", (d) => y(d.gender))
 .attr("height", y.bandwidth())
 .attr("width", 0)
 .attr("rx", 6)
 .attr("fill", (d) => (d.gender === "Girls" ? "#ff8cbc" : "#7e9cff"))
 .transition()
 .duration(700)
 .attr("width", (d) => x(d.value) - x(0));
 svg
 .selectAll("text.value-label")
 .data(data)
 .join("text")
 .attr("class", "value-label")
 .attr("x", (d) => x(d.value) + 4)
 .attr("y", (d) => y(d.gender) + y.bandwidth() / 2 + 4)
 .attr("font-size", 11)
 .attr("fill", "#444")
 .text((d) => `${d.value.toFixed(1)}${unit}`);

 const yAxis = d3.axisLeft(y).tickSize(0);
 svg
 .append("g")
 .attr("transform", `translate(${margin.left},0)`)
 .call(yAxis)
 .call((g) => g.selectAll("text").attr("font-size", 11))
 .call((g) => g.select(".domain").remove());
}


function drawFertilityChart(fert) {
 miniChartContainer.selectAll("*").remove();

 const width = 340;
 const height = 90;
 const margin = { top: 20, right: 16, bottom: 28, left: 40 };

 const svg = miniChartContainer
 .append("svg")
 .attr("width", width)
 .attr("height", height);

 const maxF = Math.max(1, Math.min(7, fert + 1));
 const x = d3
 .scaleLinear()
 .domain([0, maxF])
 .range([margin.left, width - margin.right]);
 svg
 .append("text")
 .attr("x", margin.left)
 .attr("y", 12)
 .attr("fill", "#555")
 .attr("font-size", 11)
 .text("Average number of children per woman");

 
 svg
 .append("rect")
 .attr("x", x(0))
 .attr("y", height / 2 - 10)
 .attr("width", x(maxF) - x(0))
 .attr("height", 20)
 .attr("rx", 10)
 .attr("fill", "#f1e2ff");

 
 svg
 .append("rect")
 .attr("x", x(0))
 .attr("y", height / 2 - 10)
 .attr("width", 0)
 .attr("height", 20)
 .attr("rx", 10)
 .attr("fill", "#ff8cbc")
 .transition()
 .duration(700)
 .attr("width", x(fert) - x(0));
 svg
 .append("circle")
 .attr("cx", x(fert))
 .attr("cy", height / 2)
 .attr("r", 6)
 .attr("fill", "#ff5e9c");

 svg
 .append("text")
 .attr("x", x(fert))
 .attr("y", height / 2 - 16)
 .attr("text-anchor", "middle")
 .attr("font-size", 11)
 .attr("fill", "#333")
 .text(`${fert.toFixed(1)} kids`);
}


function drawLongevityChart({ leSelf, leOther, survSelf, survOther }) {
 miniChartContainer.selectAll("*").remove();

 const width = 360;
 const height = 110;
 const margin = { top: 18, right: 16, bottom: 30, left: 60 };

 const svg = miniChartContainer
 .append("svg")
 .attr("width", width)
 .attr("height", height);

 svg
 .append("text")
 .attr("x", margin.left)
 .attr("y", 12)
 .attr("fill", "#555")
 .attr("font-size", 11)
 .text("Life expectancy & survival to 65");
 const genders = ["You", "Other"];
 const data = [
 {
 label: "You",
 lifeExp: leSelf,
 survival: isNumber(survSelf) ? survSelf : null,
 },
 
 {
 label: "Other",
 lifeExp: leOther,
 survival: isNumber(survOther) ? survOther : null,
 },
 ];

 const x = d3
 .scaleLinear()
 .domain([
 40,
 d3.max(data.map((d) => d.lifeExp).filter(isNumber)) || 90,])
 .nice()
 .range([margin.left, width - margin.right]);

 const y = d3
 .scaleBand()
 .domain(genders)
 .range([margin.top + 8, height - margin.bottom])
 .padding(0.4);
 svg
 .selectAll("rect.life-bar")
 .data(data)
 .join("rect")
 .attr("class", "life-bar")
 .attr("x", x(40))
 .attr("y", (d) => y(d.label))
 .attr("height", y.bandwidth())
 .attr("width", 0)
 .attr("rx", 6)
 .attr("fill", (d) => (d.label === "You" ? "#ff8cbc" : "#7e9cff"))
 .transition()
 .duration(700)
 .attr("width", (d) => x(d.lifeExp) - x(40));
 svg
 .selectAll("text.life-label")
 .data(data)
 .join("text")
 .attr("class", "life-label")
 .attr("x", (d) => x(d.lifeExp) + 4)
 .attr("y", (d) => y(d.label) + y.bandwidth() / 2 + 4)
 .attr("font-size", 10.5)
 .attr("fill", "#333")
 .text((d) => `${d.lifeExp.toFixed(1)} yrs`);
 

 const survScale = d3
 .scaleLinear()
 .domain([0, 100])
 .range([margin.left, width - margin.right]);

 svg
 .selectAll("circle.surv-dot")
 .data(data.filter((d) => isNumber(d.survival)))
 .join("circle")
 .attr("class", "surv-dot")
 .attr("cx", (d) => survScale(d.survival))
 .attr("cy", (d) => y(d.label) + y.bandwidth() / 2)
 .attr("r", 0)
 .attr("fill", "#3c8f5d")
 .attr("stroke", "#fff")
 .attr("stroke-width", 1.5)
 .transition()
 .delay(400)
 .duration(400)
 .attr("r", 5);

 svg
 .append("g")
 .attr("transform", `translate(0,${height - margin.bottom})`)
 .call(
 d3.axisBottom(x).ticks(4).tickFormat((d) => `${d} yrs`)
 )
 .call((g) => g
 .selectAll("text")
 .attr("font-size", 10)
 .attr("fill", "#666")
 )
 .call((g) => g.select(".domain").attr("stroke", "#aaa"));

 svg
 .append("g")
 .attr("transform", `translate(${margin.left},0)`)
 .call(d3.axisLeft(y).tickSize(0))
 .call((g) => g
 .selectAll("text")
 .attr("font-size", 11)
 .attr("fill", "#444")
 )
 .call((g) => g.select(".domain").remove());
}