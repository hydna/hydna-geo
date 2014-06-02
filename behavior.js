behavior('/', {
    
    open:function(event){
        var pos = event.connection.geo;
        pos.id = event.connection.id;
        pos.type = "join";
        
        var msg = JSON.stringify(pos);
        event.channel.emit(msg);
        
        var pos_list = [];
        pos_list.push(event.connection.id);
        pos_list.push(pos.longitude);
        pos_list.push(pos.latitude);
        pos_list.push(pos.city);
        pos_list.push(pos.region);
        pos_list.push(pos.country_name);
        pos_list.push(pos.country_code);
        pos_list.push(Math.floor(new Date().getTime() / 1000));
        
        event.channel.set('active:'+event.connection.id, pos_list.join(','));
        
        event.allow(msg);
    },
    
    close:function(event){
        var msg = {id: event.connection.id, type:"leave"};
        
        event.channel.emit(JSON.stringify(msg));
        
        event.channel.del('active:'+event.connection.id);
        
        var pos = event.connection.geo;
        
        var pos_list = [];
        pos_list.push("old_"+event.connection.id);
        pos_list.push(pos.longitude);
        pos_list.push(pos.latitude);
        pos_list.push(pos.city);
        pos_list.push(pos.region);
        pos_list.push(pos.country_name);
        pos_list.push(pos.country_code);
        pos_list.push(Math.floor(new Date().getTime() / 1000));
        
        event.channel.push('visit', pos_list.join(','));
        // trim the "visits" to only contain the last 100 added elements
        event.channel.trim('visit', -100);
    },
    
    emit: function(event){
        
        switch(event.data){
            case "list":
                event.channel.range('visit', -100, function(err, items) {
                    if(err){
                        console.log(err);
                    }
                    event.channel.emit(JSON.stringify({type:"list", items:items}), event.connection);
                });
            break;
            
            case "active":
                event.channel.findall("active:*", function(err, items){
                    if(err){
                        console.log(err);
                    }
                    event.channel.emit(JSON.stringify({type:"active", items:items}));    
                });
                
            break;
        }
    }
});
