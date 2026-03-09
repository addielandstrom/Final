
// Initialize map
var map = L.map('map').setView([39.5, -98.35], 4);

L.tileLayer('https://api.mapbox.com/styles/v1/addielandstrom/cmlzm35pi002n01sm6mfzfahf/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWRkaWVsYW5kc3Ryb20iLCJhIjoiY21sZmh1b2F3MDIzazNmb2ttN2lhYTF3bSJ9.cRSmYv9tp-yssgvOWFcAsQ',{
    maxZoom: 18,
}).addTo(map);

var title = L.control({ position: 'topleft' });


// Create custom control
var controlPanel = L.control({ position: 'topright' });

controlPanel.onAdd = function(map) {

    var div = L.DomUtil.create('div', 'info control-panel');

    div.innerHTML = `
        <div style="background:white; padding:12px; width:220px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.3);">

            <b>Search</b><br>
            <input type="text" id="searchInput" placeholder="Search name"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                style="width:100%; margin-bottom:6px;">
            <button onclick="searchChinatown()" style="width:100%;">Search</button>

            <hr>

            <b>Type</b><br>
            <select id="layerFilter" style="width:100%; margin-bottom:6px;" onchange="updateTypeDescription()">
                <option value="">All</option>
                <option value="Traditional_Chinatowns">Traditional</option>
                <option value="Commercial_Chinatowns">Commercial</option>
                <option value="Revitalized_Chinatowns">Revitalized</option>
                <option value="Satellite_Chinatowns">Satellite</option>
            </select>

            <div id="typeDescription" style="font-size:13px; color:#555; margin-bottom:8px;">
            Select a type to see description.
            </div>

            <hr>

            <b>Established Before</b><br>
            <input type="range" id="yearSlider" min="1850" max="2025" value="2025" step="1" style="width:100%;">
            <div style="text-align:center; font-weight:bold;" id="yearDisplay">2025</div>

            <label style="display:block; margin-top:6px;">
            <input type="checkbox" id="openFilter" onchange="applyFilters()">
            Only show active Chinatowns
            </label>

            <button onclick="applyFilters()" style="width:100%; margin-top:6px;">Apply</button>
            <button onclick="resetFilters()" style="width:100%; margin-top:4px;">Reset</button>

        </div>
    `;

    // Prevent map from dragging when interacting with panel
    L.DomEvent.disableClickPropagation(div);

    return div;
};

controlPanel.addTo(map);

document.addEventListener("input", function(e){
    if(e.target && e.target.id === "yearSlider"){
        document.getElementById("yearDisplay").innerText = e.target.value;
        applyFilters();
    }
});

var chinatownLayer;
var geojsonData;

// LOAD DATA
fetch('data/ChinatownsUS.geojson')
.then(response => response.json())
.then(data => {

    geojsonData = data;  // store original dataset

    chinatownLayer = L.geoJSON(geojsonData, {
        pointToLayer: function(feature, latlng){
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#f26d2b",
                color: "#bc2e12",
                weight: 1,
                fillOpacity: 0.9
            });
        },
        onEachFeature: function(feature, layer){
            layer.bindPopup(
                "<b>" + feature.properties.Name + "</b><br>" +
                "<b>Years:</b> " + feature.properties.Description + "<br>" +
                "<b>Type:</b> " + feature.properties.layer
            );
        }
    }).addTo(map);

})
.catch(error => console.error("Error loading GeoJSON:", error));


// SEARCH
function searchChinatown(){

    var searchText = document.getElementById("searchInput").value.toLowerCase();

    chinatownLayer.eachLayer(function(layer){

        var name = layer.feature.properties.Name;

        if(name && name.toLowerCase().includes(searchText)){
            map.setView(layer.getLatLng(), 12);
            layer.openPopup();
        }

    });
}


function applyFilters(){

    var selectedYear = document.getElementById("yearSlider").value;
    var layerValue = document.getElementById("layerFilter").value;
    var onlyOpen = document.getElementById("openFilter").checked;

    document.getElementById("yearDisplay").innerText = selectedYear;

    if(chinatownLayer){
        map.removeLayer(chinatownLayer);
    }

    chinatownLayer = L.geoJSON(geojsonData, {

        filter: function(feature){

            var description = feature.properties.Description || "";
            var layerType = feature.properties.layer || "";

            // Year filter
            var match = description.match(/\d{4}/);
            var establishedYear = match ? parseInt(match[0]) : null;
            var matchesYear = true;
            if(establishedYear){
                matchesYear = establishedYear <= parseInt(selectedYear);
            }

            // Type filter
            var matchesLayer = true;
            if(layerValue){
                matchesLayer = layerType === layerValue;
            }

            // Open filter
            var matchesOpen = true;
            if(onlyOpen){
                var openStatus = feature.properties.Open || feature.properties.Status || feature.properties.open || "Yes";
                matchesOpen = String(openStatus).toLowerCase().startsWith("y") || String(openStatus).toLowerCase() === "open";
            }

            return matchesYear && matchesLayer && matchesOpen;
        },

        pointToLayer: function(feature, latlng){
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#f26d2b",
                color: "#bc2e12",
                weight: 1,
                fillOpacity: 0.9
            });
        },

        onEachFeature: function(feature, layer){
            layer.bindPopup(
                "<b>" + feature.properties.Name + "</b><br>" +
                "<b>Years:</b> " + feature.properties.Description + "<br>" +
                "<b>Type:</b> " + feature.properties.layer + "<br>" +
                "<b>Status:</b> " + feature.properties.Open
            );
        }

    }).addTo(map);

} 



function resetFilters(){
    document.getElementById("yearSlider").value = 2025;
    document.getElementById("yearDisplay").innerText = 2025;
    document.getElementById("layerFilter").value = "";
    document.getElementById("openFilter").checked = false;

    if(chinatownLayer){
        map.removeLayer(chinatownLayer);
    }

    chinatownLayer = L.geoJSON(geojsonData, {
        pointToLayer: function(feature, latlng){
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#f26d2b",
                color: "#bc2e12",
                weight: 1,
                fillOpacity: 0.9
            });
        },
        onEachFeature: function(feature, layer){
            layer.bindPopup(
                "<b>" + feature.properties.Name + "</b><br>" +
                "<b>Years:</b> " + feature.properties.Description + "<br>" +
                "<b>Type:</b> " + feature.properties.layer + "<br>" +
                "<b>Status:</b> " + feature.properties.Open
            );
        }
    }).addTo(map);
}

document.getElementById("yearSlider").addEventListener("input", function(){
    applyFilters();
});

function updateTypeDescription() {

    var selected = document.getElementById("layerFilter").value;
    var descBox = document.getElementById("typeDescription");

    if(selected === "Commercial_Chinatowns") {
        descBox.innerHTML = "Developed from commercial roots when Chinese businesses arrived first before a Chinese community settled into an area.";
    }
    else if(selected === "Revitalized_Chinatowns") {
        descBox.innerHTML = "Traditional Chinatowns that have evolved due to the influx of immigrants from the lifting of restrictive immigration legislation.";
    }
    else if(selected === "Traditional_Chinatowns") {
        descBox.innerHTML = "Formed before WW2 and were a result of Chinese laborers congregating together as a form of protection from discrimination.";
    }
    else if(selected === "Satellite_Chinatowns") {
        descBox.innerHTML = "Suburban or newer Chinese commercial districts formed outside traditional downtown cores.";
    }
    else {
        descBox.innerHTML = "Select a type to see description.";
    }
}