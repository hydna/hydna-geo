$(function(){

    /*
     * TODO: hover info on you + on single active
    * */

    var HYDNA_DOMAIN = "lol.hydna.org";
    var MIN_DIST = 5;
    var MIN_LINE_DIST = 20;
    var LINE_OFFSET = 10;

    var map = $("#map");
    var marker_container = $("#markers");
    var effect_container = $("#effects");
    var line_container = $("#lines");
    var chat_container = $("#chat-container");
    var chat_input = $("#chat-id"); 
    var activity = $("#activity");
    var map_width = 960;
    var map_height = map_width;
    var visible_height = Math.floor(map_height * .75);
    var me = null;
    var markers = [];
    var line_timeouts = {};

    var active_count = 1;

    var zones = {
        topleft: {
            bubble: $("#north-america"),
            pos: {x: (map_width * .25), y: visible_height * .25}
        },
        bottomleft: {
            bubble: $("#south-america"),
            pos: {x:(map_width * .25),y: visible_height * .75}
        },
        topright: {
            bubble: $("#europe-asia"),
            pos: {x: (map_width * .75), y: visible_height * .25}
        },
        bottomright: {
            bubble: $("#africa-australia"),
            pos: {x: (map_width * .75), y: visible_height * .75}
        }
    }
    
    /*
    // test markers
    var coords = [];

    coords.push({longitude:17.9, latitude:59.3});
    coords.push({longitude:-73.995, latitude:40.7});
    coords.push({latitude:-33.7969235,longitude:150.9224326});
    coords.push({latitude:-36.863023,longitude:174.8654693});
    coords.push({latitude:-34.6158527,longitude:-58.4332985});
    coords.push({latitude:51.5286416,longitude:-0.1015987});
    coords.push({latitude:37.7577,longitude:-122.4376});
     
    for(var i = 0; i < 10; i++){
        var index = Math.round(Math.random() * (coords.length - 1));
        var pos = coords[index];
        
        var lol = Math.random() * 1.0;
        var type = "active";
        if(lol > 0.5){
            type = "old";
        }
        addMarker(Math.round(Math.random() * 10000), pos.latitude, pos.longitude, "", "", type, i * 100);
    }
    */   

    function distance(x1, y1, x2, y2){
        var xd = x1 - x2;
        var yd = y1 - y2;
        return Math.sqrt(xd * xd + yd * yd);
    }

    function angle(x1, y1, x2, y2){
        return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    }

    function mapCoords(latitude, longitude, w, h){
        var x = (longitude + 180.0) * (w / 360.0);
        var latRad = latitude * Math.PI / 180.0;
        var mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
        var y = (h / 2) - (w * mercN / (2 * Math.PI));
        return {x:x, y:y};
    }


    function addMarker(id, latitude, longitude, country, city, type, delay){
        var pos = mapCoords(latitude, longitude, map_width, map_height);

        var min_distance = 100000;
        var min_index = -1;
        for(var i = 0; i < markers.length; i++){
            if(markers[i].type !== "me" && type === markers[i].type){
                var dist = distance(markers[i].pos.x, markers[i].pos.y, pos.x, pos.y);
                if(dist < min_distance){
                    min_distance = dist;
                    min_index = i;
                }
            }
        }

        pos.x = Math.round(pos.x);
        pos.y = Math.round(pos.y);
        
        if(min_distance > MIN_DIST){

            var layer = 1;
            var label = "";

            if(type === "me"){
                layer = 201;
                count_label = "";
            }

            if(type === "active"){
                layer = 101;     
            }

            if(city !== undefined && city.length > 0){
                label += city;
            }

            if(country !== undefined && country.length > 0){
                if(label.length > 0){
                    label += ", ";
                }
                label += country;
            }

            if(label.length === 0 && type === "me"){
                label = "You";
            }

            var point = $("<div class='point " + type + "' id='" + id + "' data-layer='" + layer + "' style='left:" + pos.x + "px;top:" + (pos.y - 40) + "px; z-index:" + layer + ";'><div class='count'>0</div><div class='info'>" + label + "</div></div>");
            
            marker_container.append(point);

            point.on("mouseover", function(){
                $(this).css("z-index", 2000);
            });

            point.on("mouseout", function(){
                $(this).css("z-index", $(this).data("layer"));
            });

            if(!delay){
                delay = 0;
            }

            setTimeout(function(){
                point.addClass("placed");
                point.css("top", pos.y);
            }, delay);

            markers.push({id:id, pos: pos, type:type, count: 1, contains:[id]});
            
            if(type != "old"){
                addLine(id, pos);
            }

        }else{

            var marker = markers[min_index];
           
            marker.count += 1;
            marker.contains.push(id);
            
            if(type === "active"){
                addJoinEffect(marker.pos);
            }
            
            updateMarkerCount(marker);
        }
    }
    
    function updateMarkerCount(marker){
        var label = " archived visits";

        if(marker.type === "active"){
            label = " active visitors";
        }

        var marker_el = $("#" + marker.id + " .count");

        if(marker_el.length > 0){

            if(marker.count > 1){
                marker_el.addClass("active");
            }else{
                marker_el.removeClass("active");
            }

            marker_el.html("<span>" + marker.count + label + "</span>");
        }
    }

    function inZone(x, y){
        var w = map_width *.5;
        var h = visible_height * .5;
        if(x <= w && y <= h){
            return zones.topleft;
        }
        if(x <= w && y >= h){
            return zones.bottomleft;
        }
        
        if(x >= w && y <= h){
            return zones.topright;
        }
        
        if(x >= w && y >= h){
            return zones.bottomright;
        }

        return zones.topright;
    }

    function rotateStr(deg){
        return "-moz-transform:translateZ(0) rotate(" + deg + "deg);-webkit-transform:translateZ(0) rotate(" + deg + "deg);-o-transform:translateZ(0) rotate(" + deg + "deg);-ms-transform:translateZ(0) rotate(" + deg + "deg);transform:translateZ(0) rotate(" + deg + "deg)";
 
    }

    function addLeaveEffect(pos){
         
        var point = $("<div class='point old placed' style='opacity:1;left:" + pos.x + "px;top:" + pos.y + "px;z-index:1;'></div>");
        effect_container.append(point);
        point.removeClass("placed");

        setTimeout(function(){
            point.css("top", pos.y - 50);
            point.css("opacity", 0);
        }, 50);

        setTimeout(function(){
            point.remove();
        }, 500);

    }

    function addJoinEffect(pos){
        var point = $("<div class='point active' style='left:" + pos.x + "px;top:" + (pos.y - 50) + "px;z-index:1;'></div>");
        effect_container.append(point);

        setTimeout(function(){
            point.css("top", pos.y);
            point.css("opacity", 1);
        }, 50);

        setTimeout(function(){
            point.remove();
        }, 500);

    }

    function addLine(id, pos){

        var zone = inZone(pos.x, pos.y);
        var offsetY = LINE_OFFSET;
        var lengthOffset = 0;

        var zone_pos = {x: zone.pos.x - 70, y: zone.pos.y};
       
        var dist = Math.round(distance(pos.x, pos.y - offsetY, zone_pos.x, zone_pos.y)) - lengthOffset;
        
        if(dist < MIN_LINE_DIST){
            dist = MIN_LINE_DIST;
        }

        var deg = Math.round(angle(pos.x, pos.y - offsetY, zone_pos.x, zone_pos.y));

        var line = $("<div class='line' id='line_" + id + "' style='left:" + Math.round(pos.x) + "px;top:" + Math.round(pos.y - offsetY) + "px;width:" + dist + "px;" + rotateStr(deg) + "'></div>");

        line_container.append(line);
    }

    function addMarkers(items, type){
        for(var i = 0; i < items.length; i++){
            var parts = items[i].split(",");
            if(parts[0] != me){
                addMarker(parts[0], parseFloat(parts[2]), parseFloat(parts[1]), parts[5], parts[3], type, 200 + (i * 50));
            }
        }
    }

    function deleteMarker(id){

        var marker_el = $("#" + id);  
        marker_el.removeClass("placed");
        marker_el.css("top", marker_el.offset().top - 50);

        var line_el = $("#line_" + id); 
        line_el.removeClass("active");
        setTimeout(function(){
            line_el.remove();   
            marker_el.remove();
        }, 500);
    }

    function removeMarker(id){
        var pos;
        for(var i = 0; i < markers.length; i++){ 
            for(var j = 0; j < markers[i].contains.length; j++){
                if(id === markers[i].contains[j]){

                    var marker = markers[i];

                    marker.count = marker.count - 1;
                    updateMarkerCount(marker);

                    marker.contains.splice(j, 1);
                    
                    if(marker.contains.length === 0){
                        deleteMarker(marker.id);
                        markers.splice(i, 1);
                    }else{
                        addLeaveEffect(marker.pos);
                    }

                    return;
                }
            }
        }
    }

    function updateActiveCount(){
        var label = active_count + " Active user";
        if(active_count > 1){
            label += "s";
        }
        activity.html(label);
    }

    function containedIn(id){
        var marker_id = id;
        for(var i = 0; i < markers.length; i++){
            for(var j = 0; j < markers[i].contains.length; j++){
                if(id === markers[i].contains[j]){
                    return markers[i].id;
                }
            }
        }

        return marker_id;
    }

    function say(id, what){

        var marker_id = containedIn(id);
        var pos;

        for(var i = 0; i < markers.length; i++){
            if(markers[i].id === marker_id){
                pos = markers[i].pos;
            }
        }

        var zone = inZone(pos.x, pos.y);

        var line = $("#line_" + marker_id); 
        line.stop();

        clearTimeout(line_timeouts[marker_id]);

        line.addClass("active");

        line_timeouts[marker_id] = setTimeout(function(){
            line.removeClass("active");
        }, 3500);

        var message = what.replace(/<([^>]+)>/g,'');
        var item = $("<li><span>- " + message + "</span></li>").hide().fadeIn(300).delay(3500).slideUp(300, function(){$(this).remove();});
        $("ul", zone.bubble).append(item);
    }

    map.css("width", map_width);
    map.css("height", visible_height);
    map.css("background-size", map_width + "px "+ map_height + "px");

    var channel = new HydnaChannel(HYDNA_DOMAIN, "rwe");
    channel.onopen = function(evt){
        try{
            var pos = JSON.parse(evt.data);
            me = pos.id;
            addMarker(pos.id, pos.latitude, pos.longitude, pos.country, pos.city, "me", 0);
            channel.emit("active");
            channel.emit("list");
        }catch(e){}

        chat_container.addClass("active");
    }

    channel.onmessage = function(evt){
        try{
            var msg = JSON.parse(evt.data);
            say(msg.id, msg.msg);
        }catch(e){}
    }

    channel.onsignal = function(evt){
        try{ 
            var msg = JSON.parse(evt.data);

            switch(msg.type){
                case "list":
                    if(msg.items){
                        addMarkers(msg.items, "old");
                    }
                break;
                case "active":
                    if(msg.items){
                        addMarkers(msg.items, "active");
                        active_count = msg.items.length;
                        updateActiveCount();
                    }
                    
                break;
                case "join":
                    addMarker(msg.id, msg.latitude, msg.longitude, msg.country, msg.city, "active");
                    active_count += 1;
                    updateActiveCount();
                break;
                case "leave":
                    removeMarker(msg.id);
                    active_count -= 1;
                    updateActiveCount();
                break;
            }
        }catch(e){}
    }

    channel.onclose = function(evt){
        console.log("channel closed: " + evt.reason);
    }

    $("#chat-form").on("submit", function(evt){
        evt.preventDefault();
        
        if(channel.readyState === HydnaChannel.OPEN){ 
            if(chat_input.val().length > 0){

                var message = chat_input.val().replace(/<([^>]+)>/g,'');
                channel.send(JSON.stringify({id:me, msg:message}));
                chat_input.val("");
            }
        }
    });

});
