// Initialize map
var map = L.map('map').setView([39.5, -98.35], 4);

L.tileLayer(
'https://api.mapbox.com/styles/v1/addielandstrom/cmlzm35pi002n01sm6mfzfahf/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWRkaWVsYW5kc3Ryb20iLCJhIjoiY21sZmh1b2F3MDIzazNmb2ttN2lhYTF3bSJ9.cRSmYv9tp-yssgvOWFcAsQ',
{ maxZoom: 18 }
).addTo(map);

// GLOBAL VARIABLES
var chinatownLayer;
var geojsonData;
var selectedVariable = "chinese_pop";
var compareMode = false;
var selectedFeatures = [];

// CONTROL PANEL
var controlPanel = L.control({ position: 'topright' });

controlPanel.onAdd = function (map) {

var div = L.DomUtil.create('div', 'info control-panel');

div.innerHTML = `
<div style="background:white; padding:12px; width:230px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.3);">

    <b>Search</b><br>
    <input type="text" id="searchInput" placeholder="Search name"
           style="width:100%; margin-bottom:6px;">
    <button onclick="searchChinatown()" style="width:100%;">Search</button>

    <hr>

    <b>Visualize Data</b><br>
    <select id="variableSelect" style="width:100%; margin-bottom:6px;">
        <option value="none">None (Default Points)</option>
        <option value="chinese_pop">% Chinese</option>
        <option value="asian">% Asian</option>
        <option value="foreign_pop">% Foreign Born</option>
        <option value="asianlang_household">% Asian Language Households</option>
        <option value="limited_eng_households">% Limited English</option>
        <option value="nr_median_house_income">Median Household Income</option>
        <option value="nr_median_rent">Rent Burden</option>
    </select>

    <button onclick="updateVisualization()" style="width:100%;">Update Map</button>

    <hr>

    <b>Type</b><br>
    <select id="layerFilter"
            style="width:100%; margin-bottom:6px;"
            onchange="updateTypeDescription()">

        <option value="">All</option>
        <option value="Traditional_Chinatowns">Traditional</option>
        <option value="Commercial_Chinatowns">Commercial</option>
        <option value="Revitalized_Chinatowns">Revitalized</option>
        <option value="Satellite_Chinatowns">Satellite</option>

    </select>

    <div id="typeDescription"
         style="font-size:13px; color:#555; margin-bottom:8px;">
        Select a type to see description.
    </div>

    <hr>

    <b>Established Before</b><br>
    <input type="range"
           id="yearSlider"
           min="1850"
           max="2025"
           value="2025"
           step="1"
           style="width:100%;">

    <div style="text-align:center; font-weight:bold;"
         id="yearDisplay">2025</div>

    <label style="display:block; margin-top:6px;">
        <input type="checkbox" id="openFilter">
        Only show active Chinatowns
    </label>

    <button onclick="applyFilters()" style="width:100%; margin-top:6px;">
        Apply
    </button>

    <button onclick="resetFilters()" style="width:100%; margin-top:4px;">
        Reset
    </button>

    <hr>

    <b>Compare Chinatowns</b><br>

    <button onclick="startComparison()" style="width:100%;">
    Start Comparison
    </button>

    <button onclick="resetComparison()" style="width:100%; margin-top:4px;">
    Clear Comparison
    </button>

    <div id="comparisonResult" style="margin-top:8px; font-size:13px;"></div>

    <canvas id="comparisonChart" width="220" height="180" style="margin-top:8px;"></canvas>

</div>
`;

L.DomEvent.disableClickPropagation(div);
return div;

};

controlPanel.addTo(map);

// COLOR SCALE
function getColor(value) {

if (value == null) return "#cccccc";

if (value > 40) return "#800026";
if (value > 25) return "#BD0026";
if (value > 15) return "#E31A1C";
if (value > 10) return "#FC4E2A";
if (value > 5) return "#FD8D3C";
if (value > 2) return "#FEB24C";

return "#FED976";

}

// POINT STYLE
function stylePoints(feature, latlng) {

    // If "None" is selected → default style
    if (selectedVariable === "none") {

        return L.circleMarker(latlng, {
            radius: 7,
            fillColor: "#ff6600",
            color: "#333",
            weight: 1,
            fillOpacity: 0.9
        });

    }

    // Otherwise color by data
    var value = feature.properties[selectedVariable];

    return L.circleMarker(latlng, {
        radius: 7,
        fillColor: getColor(value),
        color: "#333",
        weight: 1,
        fillOpacity: 0.9
    });

}

// LOAD GEOJSON
fetch('data/JoinedChinatowns.geojson')
.then(response => response.json())
.then(data => {

    geojsonData = data;

    chinatownLayer = L.geoJSON(geojsonData, {
        pointToLayer: stylePoints,
        onEachFeature: createPopup
    }).addTo(map);

})
.catch(error => console.error("Error loading GeoJSON:", error));

// POPUPS
function createPopup(feature, layer) {

var p = feature.properties;

layer.bindPopup(

    "<b>" + (p.Name ?? "Unknown") + "</b><br>" +
    "<b>Type:</b> " + (p.layer ?? "N/A") + "<br>" +
    "<b>Years Active:</b> " + (p.Description ?? "N/A") +

    "<hr><b>Location</b><br>" +
    (p.nr_county ?? "Unknown County") + ", " +
    (p.nr_state ?? "Unknown State") +

    "<hr><b>Census Demographics</b><br>" +

    "Total Population: " + (p.nr_total_pop ?? "N/A") + "<br>" +
    "% Asian: " + (p.asian ?? "N/A") + "%<br>" +
    "% Chinese: " + (p.chinese_pop ?? "N/A") + "%<br>" +
    "% Foreign Born: " + (p.foreign_pop ?? "N/A") + "%<br>" +
    "% Asian Language Households: " +
    (p.asianlang_household ?? "N/A") + "%<br>" +
    "% Limited English: " +
    (p.limited_eng_households ?? "N/A") + "%<br>" +

    "<hr><b>Housing & Economy</b><br>" +

    "Median Household Income: $" +
    (p.nr_median_house_income ?? "N/A") + "<br>" +

    "Rent Burden: " +
    (p.nr_median_rent ?? "N/A") + "%"
);

layer.on("click", function () {

    if (!compareMode) return;

    if (selectedFeatures.length < 2) {

        selectedFeatures.push(feature);

        layer.setStyle({
            color: "blue",
            weight: 3
        });

    }

    if (selectedFeatures.length === 2) {
        showComparison();
        compareMode = false;
    }

});

}

// UPDATE VISUALIZATION
function updateVisualization() {

selectedVariable =
    document.getElementById("variableSelect").value;

if (chinatownLayer) {
    map.removeLayer(chinatownLayer);
}

chinatownLayer = L.geoJSON(geojsonData, {
    pointToLayer: stylePoints,
    onEachFeature: createPopup
}).addTo(map);

}

// SEARCH
function searchChinatown() {

var searchText =
    document.getElementById("searchInput").value.toLowerCase();

chinatownLayer.eachLayer(function (layer) {

    var name = layer.feature.properties.Name;

    if (name && name.toLowerCase().includes(searchText)) {

        map.setView(layer.getLatLng(), 12);
        layer.openPopup();

    }
});

}

// FILTERS
function applyFilters() {

var selectedYear =
    document.getElementById("yearSlider").value;

var layerValue =
    document.getElementById("layerFilter").value;

document.getElementById("yearDisplay").innerText =
    selectedYear;

if (chinatownLayer) {
    map.removeLayer(chinatownLayer);
}

chinatownLayer = L.geoJSON(geojsonData, {

    filter: function (feature) {

        var description =
            feature.properties.Description || "";

        var layerType =
            feature.properties.layer || "";

        var match = description.match(/\d{4}/);

        var establishedYear =
            match ? parseInt(match[0]) : null;

        var matchesYear = true;

        if (establishedYear) {
            matchesYear =
                establishedYear <= parseInt(selectedYear);
        }

        var matchesLayer = true;

        if (layerValue) {
            matchesLayer =
                layerType === layerValue;
        }

        return matchesYear && matchesLayer;
    },

    pointToLayer: stylePoints,
    onEachFeature: createPopup

}).addTo(map);

}

// RESET
function resetFilters() {

document.getElementById("yearSlider").value = 2025;
document.getElementById("yearDisplay").innerText = 2025;
document.getElementById("layerFilter").value = "";
document.getElementById("openFilter").checked = false;

if (chinatownLayer) {
    map.removeLayer(chinatownLayer);
}

chinatownLayer = L.geoJSON(geojsonData, {
    pointToLayer: stylePoints,
    onEachFeature: createPopup
}).addTo(map);

}

// YEAR SLIDER
document.addEventListener("input", function (e) {

if (e.target && e.target.id === "yearSlider") {

    document.getElementById("yearDisplay").innerText =
        e.target.value;

    applyFilters();
}

});

// TYPE DESCRIPTIONS
function updateTypeDescription() {

var selected =
    document.getElementById("layerFilter").value;

var descBox =
    document.getElementById("typeDescription");

if (selected === "Commercial_Chinatowns") {

    descBox.innerHTML =
        "Developed from commercial roots when Chinese businesses arrived first before a Chinese community settled.";

} else if (selected === "Revitalized_Chinatowns") {

    descBox.innerHTML =
        "Traditional Chinatowns that evolved due to immigration changes after restrictive laws were lifted.";

} else if (selected === "Traditional_Chinatowns") {

    descBox.innerHTML =
        "Formed before WWII as Chinese laborers clustered together for protection from discrimination.";

} else if (selected === "Satellite_Chinatowns") {

    descBox.innerHTML =
        "Suburban or newer Chinese commercial districts outside historic downtown cores.";

} else {

    descBox.innerHTML =
        "Select a type to see description.";
}

}

function startComparison() {

    compareMode = true;
    selectedFeatures = [];

    document.getElementById("comparisonResult").innerHTML =
        "Click two Chinatowns on the map to compare.";

}

function showComparison() {

    var a = selectedFeatures[0].properties;
    var b = selectedFeatures[1].properties;

    var html =
        "<b>" + a.Name + "</b> vs <b>" + b.Name + "</b>";

    document.getElementById("comparisonResult").innerHTML = html;


    var dataA = [
        a.chinese_pop,
        a.asian,
        a.foreign_pop,
        a.asianlang_household,
        a.limited_eng_households
    ];

    var dataB = [
        b.chinese_pop,
        b.asian,
        b.foreign_pop,
        b.asianlang_household,
        b.limited_eng_households
    ];

    var ctx = document.getElementById("comparisonChart").getContext("2d");

    if (window.compareChart) {
        window.compareChart.destroy();
    }

    window.compareChart = new Chart(ctx, {

        type: "bar",

        data: {

            labels: [
                "% Chinese",
                "% Asian",
                "% Foreign Born",
                "% Asian Language",
                "% Limited English"
            ],

            datasets: [

                {
                    label: a.Name,
                    data: dataA
                },

                {
                    label: b.Name,
                    data: dataB
                }

            ]
        },

        options: {

            responsive: false,

            plugins: {
                legend: {
                    position: "bottom"
                }
            },

            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }

    });

}

function resetComparison() {

    compareMode = false;
    selectedFeatures = [];

    document.getElementById("comparisonResult").innerHTML = "";

    if (window.compareChart) {
        window.compareChart.destroy();
    }

}



