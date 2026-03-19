// Initialize map
var map = L.map('map').setView([39.5, -98.35], 4);

L.tileLayer(
'https://api.mapbox.com/styles/v1/addielandstrom/cmlzm35pi002n01sm6mfzfahf/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWRkaWVsYW5kc3Ryb20iLCJhIjoiY21sZmh1b2F3MDIzazNmb2ttN2lhYTF3bSJ9.cRSmYv9tp-yssgvOWFcAsQ',
{ maxZoom: 18 }
).addTo(map);

// Global Variables
var chinatownLayer;
var geojsonData;
var selectedVariable = "none";
var compareMode = false;
var selectedFeatures = [];
var proportionalVariable = "none";

// Control Panel
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

    <b>Variable 1: Choropleth </b><br>
    <select id="variableSelect" style="width:100%; margin-bottom:6px;">
        <option value="none">None (Default Color)</option>
        <option value="chinese_pop">% Chinese</option>
        <option value="asian">% Asian</option>
        <option value="foreign_pop">% Foreign Born</option>
        <option value="asianlang_household">% Asian Language Households</option>
        <option value="limited_eng_households">% Limited English</option>
        <option value="nr_median_house_income">Median Household Income</option>
        <option value="nr_median_rent">% Rent Burden</option>
    </select>

    <b>Variable 2: Proportional Symbols</b><br>
        <select id="proportionalSelect" style="width:100%; margin-bottom:6px;">
            <option value="none">None (Fixed Size)</option>
            <option value="chinese_pop">% Chinese</option>
            <option value="asian">% Asian</option>
            <option value="foreign_pop">% Foreign Born</option>
            <option value="asianlang_household">% Asian Language Households</option>
            <option value="limited_eng_households">% Limited English</option>
            <option value="nr_median_house_income">Median Household Income</option>
            <option value="nr_median_rent">% Rent Burden</option>
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

    <b>Active Status</b><br>
        <select id="statusFilter" style="width:100%; margin-bottom:6px;">
            <option value="">All</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
        </select>

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

</div>
`;

L.DomEvent.disableClickPropagation(div);
return div;

};

controlPanel.addTo(map);

// Color Scale
function getColor(value) {

    if (value == null) return "#cccccc";

    if (selectedVariable === "nr_median_house_income") {
        return value > 120000 ? "#800026" :
               value > 100000 ? "#BD0026" :
               value > 80000 ? "#E31A1C" :
               value > 60000 ? "#FC4E2A" :
               value > 40000 ? "#FD8D3C" :
               value > 20000 ? "#FEB24C" :
                               "#FED976";
    }

    // Default (percent)
    return value > 40 ? "#800026" :
           value > 25 ? "#BD0026" :
           value > 15 ? "#E31A1C" :
           value > 10 ? "#FC4E2A" :
           value > 5 ? "#FD8D3C" :
           value > 2 ? "#FEB24C" :
                        "#FED976";
}

function getRadius(value, variable) {
    if (value == null) return 5; // default small radius

    if (variable === "nr_median_house_income") {
        // Scale income smaller so 30k–40k isn't huge
        return 7 + (value / 8000); 
    }

    // Percentages (0–100)
    return 5 + (value / 6); 
}

// Point Style
function stylePoints(feature, latlng) {

    var colorValue = feature.properties[selectedVariable];
    var sizeValue = feature.properties[proportionalVariable];

    // Default radius
    var radius = (proportionalVariable === "none")
    ? 7
    : getRadius(sizeValue, proportionalVariable);


    return L.circleMarker(latlng, {

        radius: radius,

        fillColor:
            selectedVariable === "none"
                ? "#ff6600"
                : getColor(colorValue),

        color: "#333",
        weight: 1,
        fillOpacity: 0.9

    });

}

// Load GeoJSON
fetch('data/JoinedChinatowns.geojson')
.then(response => response.json())
.then(data => {

    geojsonData = data;

    chinatownLayer = L.geoJSON(geojsonData, {
        pointToLayer: stylePoints,
        onEachFeature: createPopup
    }).addTo(map);

    updateLegends();

})
.catch(error => console.error("Error loading GeoJSON:", error));

// Popups
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

function updateVisualization() {

    selectedVariable =
        document.getElementById("variableSelect").value;

    proportionalVariable =
        document.getElementById("proportionalSelect").value;

    if (chinatownLayer) {
        map.removeLayer(chinatownLayer);
    }

    chinatownLayer = L.geoJSON(geojsonData, {
        pointToLayer: stylePoints,
        onEachFeature: createPopup
    }).addTo(map);

    updateLegends();

}

// Search
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

// FIitlers
function applyFilters() { 

    var selectedYear = document.getElementById("yearSlider").value; 
    var layerValue = document.getElementById("layerFilter").value; 
    var statusValue = document.getElementById("statusFilter").value; // ✅ NEW

    document.getElementById("yearDisplay").innerText = selectedYear; 
        
    if (chinatownLayer) { 
        map.removeLayer(chinatownLayer); 
    } 

    chinatownLayer = L.geoJSON(geojsonData, { 

        filter: function (feature) { 

            var description = feature.properties.Description || ""; 
            var layerType = feature.properties.layer || ""; 

            // Year Filter
            var match = description.match(/\d{4}/); 
            var establishedYear = match ? parseInt(match[0]) : null; 

            var matchesYear = true; 
            if (establishedYear) { 
                matchesYear = establishedYear <= parseInt(selectedYear); 
            } 

            // Type Filter
            var matchesLayer = true; 
            if (layerValue) { 
                matchesLayer = layerType === layerValue; 
            } 

            // Status Filter
            var isActive = description.includes("Present"); 

            var matchesStatus = true; 

            if (statusValue === "active") { 
                matchesStatus = isActive; 
            } else if (statusValue === "inactive") { 
                matchesStatus = !isActive; 
            } 

            // Final Filter
            return matchesYear && matchesLayer && matchesStatus; 
        }, 

        pointToLayer: stylePoints, 
        onEachFeature: createPopup 

    }).addTo(map); 
}
// Reset
function resetFilters() {

    document.getElementById("yearSlider").value = 2025;
    document.getElementById("yearDisplay").innerText = 2025;
    document.getElementById("layerFilter").value = "";
    document.getElementById("statusFilter").value = ""; //
    document.getElementById("searchInput").value = "";

    // Reset map view
    map.setView([39.5, -98.35], 4);  

    // Reset layer
    if (chinatownLayer) {
        map.removeLayer(chinatownLayer);
    }

    chinatownLayer = L.geoJSON(geojsonData, {
        pointToLayer: stylePoints,
        onEachFeature: createPopup
    }).addTo(map);
}

// Year slider
document.addEventListener("input", function (e) {

if (e.target && e.target.id === "yearSlider") {

    document.getElementById("yearDisplay").innerText =
        e.target.value;

    applyFilters();
}

});

// Type description
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

// Add chart control once at the start, hidden initially
var chartControl = L.control({ position: 'bottomleft' });

chartControl.onAdd = function () {
    var div = L.DomUtil.create('div', 'info legend');
    div.style.display = "none"; 
    div.id = "chartContainer";
    div.innerHTML = `<canvas id="comparisonChart" width="220" height="180"></canvas>`;
    return div;
};

chartControl.addTo(map);

function showComparison() {

    var chartDiv = document.getElementById("chartContainer");
    chartDiv.style.display = "block";

    var a = selectedFeatures[0].properties;
    var b = selectedFeatures[1].properties;

    // Show all variables
    var fields = [
        "chinese_pop",
        "asian",
        "foreign_pop",
        "asianlang_household",
        "limited_eng_households",
        "nr_median_rent"
    ];

    var dataA = fields.map(f => a[f]);
    var dataB = fields.map(f => b[f]);

    var labels = fields.map(f =>
        f.replace(/_/g, " ")
         .replace("nr ", "")
         .replace("household", "")
         .trim()
    );

    document.getElementById("comparisonResult").innerHTML =
        `<b>${a.Name}</b> vs <b>${b.Name}</b>`;

    var ctx = document.getElementById("comparisonChart").getContext("2d");

    if (window.compareChart) window.compareChart.destroy();

    window.compareChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                { label: a.Name, data: dataA },
                { label: b.Name, data: dataB }
            ]
        },
        options: {
            responsive: false,
            plugins: { legend: { position: "bottom" } },
            scales: { 
                y: { 
                    beginAtZero: true
                    
                } 
            }
        }
    });
}

function resetComparison() {
    compareMode = false;
    selectedFeatures = [];

    // Hide chart
    var chartDiv = document.getElementById("chartContainer");
    chartDiv.style.display = "none";

    if (window.compareChart) {
        window.compareChart.destroy();
    }

    document.getElementById("comparisonResult").innerHTML = "";
}

var colorLegend = L.control({ position: 'bottomleft' });

colorLegend.onAdd = function () {

    var div = L.DomUtil.create('div', 'info legend');

    // Set grades depending on variable
    var grades, isPercent;

    if (selectedVariable === "nr_median_house_income") {
        grades = [10000, 20000, 30000, 40000, 50000];
        isPercent = false;
    } else {
        grades = [0, 2, 5, 10, 15, 25, 40];
        isPercent = true;
    }

    // Map variable to readable label
    var labelMap = {
        chinese_pop: "% Chinese",
        asian: "% Asian",
        foreign_pop: "% Foreign Born",
        asianlang_household: "% Asian Language",
        limited_eng_households: "% Limited English",
        nr_median_house_income: "Median Income ($)",
        nr_median_rent: "Rent Burden (%)"
    };

    div.innerHTML += "<b>" + (labelMap[selectedVariable] || "Legend") + "</b><br>";

    for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            (isPercent ? grades[i] + "%" : "$" + grades[i]) +
            (grades[i + 1]
                ? '&ndash;' + (isPercent ? grades[i + 1] + "%" : "$" + grades[i + 1]) + '<br>'
                : '+');
    }

    return div;
};

var sizeLegend = L.control({ position: 'bottomleft' });

sizeLegend.onAdd = function () {

    var div = L.DomUtil.create('div', 'info legend');

    var labelMap = {
    chinese_pop: "% Chinese",
    asian: "% Asian",
    foreign_pop: "% Foreign Born",
    asianlang_household: "% Asian Language",
    limited_eng_households: "% Limited English",
    nr_median_house_income: "Median Income ($)",
    nr_median_rent: "Rent Burden (%)"
    };

    div.innerHTML += "<b>" + (labelMap[proportionalVariable] || "Circle Size") + "</b><br>";

    var values = proportionalVariable === "nr_median_house_income"
    ? [2000, 8000, 30000, 70000]
    : [10, 25, 50, 100];

    values.forEach(function (val) {

    var radius = getRadius(val, proportionalVariable);
    var isPercent = proportionalVariable !== "nr_median_house_income";

    div.innerHTML +=
        '<div style="display:flex; align-items:center; margin-bottom:4px;">' +
        '<div style="width:' + (radius * 2) + 'px; height:' + (radius * 2) +
        'px; border-radius:50%; background:#999; opacity:0.7; margin-right:8px;"></div>' +
        (isPercent ? val + "%" : "$" + val) +
        '</div>';

    });

    return div;
};

function updateLegends() {

    map.removeControl(colorLegend);
    map.removeControl(sizeLegend);

    if (selectedVariable !== "none") {
        colorLegend.addTo(map);
    }

    if (proportionalVariable !== "none") {
        sizeLegend.addTo(map);
    }

}
