
if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1]
    }
}

function urlPath () {
    return window.location.pathname.split ("/")
}

function setStatus (status) {
    document.getElementById ("status").innerHTML = status
}

function noOp () {}

function retrieve (url, callback, error) {
    var xhr = new XMLHttpRequest()
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
	if(xhr.readyState === 4 && xhr.status === 200) {
	    callback (xhr.responseText)
	} else {
	    error ()
	}
    };
    xhr.send();
}

function retrieveJson (url, callback, error) {
    retrieve (url, function (data) { callback (JSON.parse (data))}, error)
}

function retrieveConfiguration (callback) {
    retrieveJson ("data/configuration.json", callback, noOp)
}

function retrieveLocations (callback) {
    retrieveJson ("data/locations.geojson", callback, noOp)
}

var TrekMate = {
    tags: new Set ([]),
    realtime: null
}

function navigateTag (tag) {
    TrekMate.tag = tag
    TrekMate.realtime.update ()
}

function renderTags (tags) {
    var html = ""
    for (const tag of tags.sort ()) {
	html += "<a href='javascript:navigateTag(\"" + tag + "\")'>"
	if (TrekMate.tag == tag) {
	    html += tag + " [SELECTED]"
	} else {
	    html += tag
	}
	html += "</a><br>"
    }
    document.getElementById ("menu").innerHTML = html
}

function initialize () {
    var mapId = urlPath ().last ()
    
    document.getElementById ("status").innerHTML = "map: " + mapId

    var map = L.map(
	"map",
	{
	    maxBoundsViscosity: 1.0})
    map.setView([45, 0], 4)
    map.setMaxBounds ([[-90,-180],[90,180]])
    
    L.tileLayer(
	"http://tile.openstreetmap.org//{z}/{x}/{y}.png",
	{
	    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
	    maxZoom: 18,
	    bounds:[[-90,-180],[90,180]],
	    noWrap: true
	}).addTo(map)


    retrieveConfiguration (function (configuration) {
	map.setView (
	    [configuration.latitude, configuration.longitude],
	    configuration.zoom)
    })

    TrekMate.tag = "#world"
    
    var realtime = L.realtime (
	function (success, error) {
	    retrieveLocations (
		function (data) {
		    var tags = data.features.reduce (
			(tags, feature) => {
			    return feature.properties.tags.reduce (
				(tags, tag) => {
				    if (tag.startsWith ("#") || tag.startsWith ("@")) {
					tags.add (tag)
				    }
				    return tags },
				tags)},
			new Set ())
		   		    
		    renderTags (Array.from (tags))
		    data.features = data.features.filter (
			feature => {
			    return feature.properties.tags.filter(
				tag => tag == TrekMate.tag).length > 0})
		    success (data)})},
	{
	    // prevent auto refresh since data is huge
	    start: false,
	    interval: 5 * 1000,
	    pointToLayer: function (point, latlng) {
		var icon = L.icon ({
		    iconUrl: "../pins/" + point.properties.pin,
		    iconSize: [25,25],
		    iconAnchor: [12.5,12.5]})
		return L
		    .marker (latlng, {icon: icon})
		    .on ("click", function (e) {
			setStatus (point.properties.description)})
	    }}).addTo (map)

    TrekMate.realtime = realtime

    TrekMate.realtime.update ()
    
    map.on (
	"click",
	function (e) {
	    setStatus (
		"{:longitude " + Number (e.latlng.lng).toFixed (5) +
		" :latitude " + Number (e.latlng.lat).toFixed (5)  +
		" :tags #{}}")
	}
    )
}
