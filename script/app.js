$(function(){

    var HYDNA_DOMAIN = "lol.hydna.org";
    var MIN_DIST = 5;

    var map = $("#map");
    var chat_container = $("#chat-container");
    var chat_input = $("#chat-id"); 
    var mapWidth = 960;
    var mapHeight = mapWidth;
    var me = null;
    var markers = [];

    var visibleHeight = Math.floor(mapHeight * .75);

    /*
    var coords = [];

    coords.push({longitude:17.9, latitude:59.3});
    coords.push({longitude:-73.995, latitude:40.7});
    coords.push({latitude:-33.7969235,longitude:150.9224326});
    coords.push({latitude:-36.863023,longitude:174.8654693});
    coords.push({latitude:-34.6158527,longitude:-58.4332985});
    coords.push({latitude:51.5286416,longitude:-0.1015987});
    coords.push({latitude:37.7577,longitude:-122.4376});
     
    for(var i = 0; i < 100; i++){
        var index = Math.round(Math.random() * (coords.length - 1));
        var pos = coords[index];
        
        var lol = Math.random() * 1.0;
        var type = "active";
        if(lol > 0.5){
            type = "old";
        }
        add_marker(Math.round(Math.random() * 10000), pos.latitude, pos.longitude, "", "", type, i * 100);
    }
    */

    function map_coords(latitude, longitude, w, h){
        // get x value
        var x = (longitude + 180.0) * (w / 360.0);
        // convert from degrees to radians
        var latRad = latitude * Math.PI / 180.0;

        // get y value
        var mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
        var y = (h / 2) - (w * mercN / (2 * Math.PI));

        return {x:x, y:y};
    }


    function add_marker(id, latitude, longitude, country, city, type, delay){
        var pos = map_coords(latitude, longitude, mapWidth, mapHeight);
        
        var min_distance = 100000;
        var min_index = -1;
        for(var i = 0; i < markers.length; i++){
            if(markers[i].type != "me" && type === markers[i].type){
                var xd = markers[i].pos.x - pos.x;
                var yd = markers[i].pos.y - pos.y;
                var dist = Math.sqrt(xd * xd + yd * yd);
                if(dist < min_distance){
                    min_distance = dist;
                    min_index = i;
                }
            }
        }

        if(min_distance > MIN_DIST){

            var layer = 1;
            if(type == "me"){
                layer = 201;
            }
            if(type == "active"){
                layer = 101;        
            }
            var point = $("<div class='point "+type+"' id='"+id+"' style='left:"+pos.x+"px;top:"+(pos.y-40)+"px; z-index:"+layer+";'><ul></ul><span class='count'>0</span></div>");
            map.append(point);

            if(!delay){
                delay = 0;
            }

            setTimeout(function(){
                point.addClass("placed");
                point.css("top", pos.y);
            }, delay);

            markers.push({id:id, pos: pos, type:type, count: 1, contains:[]});
        }else{
            var marker = markers[min_index];
            marker.count += 1;
            marker.contains.push(id);
            // update count in obj
            $("#"+marker.id + " .count").addClass("active").html(marker.count);
        }
    }

    function add_markers(items, type){
        for(var i = 0; i < items.length; i++){
            var parts = items[i].split(",");
            if(parts[0] != me){
                add_marker(parts[0], parseFloat(parts[2]), parseFloat(parts[1]), parts[5], parts[3], type, 200 +(i*50));
            }
        }
    }

    function remove_marker(id){
        $("#"+id).remove();
    }

    function say(id, what){
        var marker_id = id;
        for(var i = 0; i < markers.length; i++){
            for(var j = 0; j < markers[i].contains; j++){
                if(id === markers[i].contains[j]){
                    marker_id = markers[i].id;
                    break;
                }
            }
        }
        var item = $("<li>- "+what+"</li>").fadeIn().delay(3500).slideUp(300, function(){ $(this).remove();});
        $("#"+marker_id+" ul").append(item);
    }

    map.css("width", mapWidth);
    map.css("height", visibleHeight);
    map.css("background-size", mapWidth + "px "+ mapHeight + "px");

    var channel = new HydnaChannel(HYDNA_DOMAIN, "rwe");
    channel.onopen = function(evt){
        try{
            var pos = JSON.parse(evt.data);
            me = pos.id;
            add_marker(pos.id, pos.latitude, pos.longitude, pos.country, pos.city, "me", 0);
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
                        add_markers(msg.items, "old");
                    }
                break;
                case "active":
                    if(msg.items){
                        add_markers(msg.items, "active");
                    }
                break;
                case "join":
                    add_marker(msg.id, msg.latitude, msg.longitude, msg.country, msg.city, "me");
                break;
                case "leave":
                    remove_marker(msg.id);
                break;
            }
        }catch(e){}
    }

    channel.onclose = function(evt){
        console.log("channel closed "+evt.reason);
    }

    $("#chat-form").on("submit", function(evt){
        evt.preventDefault();
        
        if(channel.readyState === HydnaChannel.OPEN){ 
            if(chat_input.val().length > 0){
                channel.send(JSON.stringify({id:me, msg:chat_input.val()}));
                chat_input.val("");
            }
        }
    });

});
