$(document).ready(function() {
    //Check if the user is rejoining
    //ps: This value is set by Express if browser session is still valid
    var user = $('#user').text();
    // show join box
    if (user === "") {
        $('#ask').show();
        $('#ask input').focus();
    } else { //rejoin using old session
        join(user);
    }

    // join on enter
    $('#ask input').keydown(function(event) {
        if (event.keyCode == 13) {
            $('#ask a').click();
        }
    });

    /*
     When the user joins, hide the join-field, display chat-widget and also call 'join' function that
     initializes Socket.io and the entire app.
     */
    $('#ask a').click(function() {
        join($('#ask input').val());
    });

    var container = $('div#msgs');


    function initSocketIO() {
        /*
         Connect to socket.io on the server.
         */
        var host = window.location.host //.split(':')[0];
        var socket = io.connect('http://' + host, {
            reconnect: false,
            'try multiple transports': false
        });
        var intervalID;
        var reconnectCount = 0;

        //console.log("socket:"+socket.connected);

        socket.on('connect', function() {
            console.log('connected');
            // send join message
            socket.emit('join', JSON.stringify({}));
        });
        socket.on('connecting', function() {
            console.log('connecting');
        });
        socket.on('disconnect', function() {
            console.log('disconnect');
            intervalID = setInterval(tryReconnect, 4000);
        });
        socket.on('connect_failed', function() {
            console.log('connect_failed');
        });
        socket.on('error', function(err) {
            console.log('error: ' + err);
        });
        socket.on('reconnect_failed', function() {
            console.log('reconnect_failed');
        });
        socket.on('reconnect', function() {
            console.log('reconnected ');
        });
        socket.on('reconnecting', function() {
            console.log('reconnecting');
        });

        var tryReconnect = function() {
            ++reconnectCount;
            if (reconnectCount == 5) {
                clearInterval(intervalID);
            }
            console.log('Making a dummy http call to set jsessionid (before we do socket.io reconnect)');
            $.ajax('/')
                .success(function() {
                    console.log("http request succeeded");
                    //reconnect the socket AFTER we got jsessionid set
                    io.connect('http://' + host, {
                        reconnect: false,
                        'try multiple transports': false
                    });

                    clearInterval(intervalID);
                }).error(function(err) {
                    console.log("http request failed (probably server not up yet)");
                });
        };



        /*
         When a message comes from the server, format, colorize it etc. and display in the chat widget
         */
        socket.on('chat', function(msg) {
            var message = JSON.parse(msg);            

            var html = "<ul>";
            html +=      "<li class=\"message\" style=\"display: block\" class="+message.action+">";
            html +=        "<span class=\"user\">"+message.user+"</span>: <span class=\"message\">"+message.msg+"</span>";
            html +=        "<span class=\"time\">"+(new Date()).toString("HH:mm:ss")+"</span>";
            html +=      "</li>";
            html +=    "</ul>";

            container.append(html);  // append to list     
            // Scroll to new messages
            container.scrollTop($("#msgs")[0].scrollHeight);
        });

        /*
         When the user creates a new chat message, send it to server via socket.emit w/ 'chat' event/channel name
         */
        $('#channel form').submit(function(event) {
            event.preventDefault();
            var input = $(this).find(':input');
            var msg = sanitise(input.val());


            socket.emit('chat', JSON.stringify({
                action: 'message',
                msg: msg
            }));
            input.val('');
            
        });
    }


    function join(name) {
        $('#ask').hide();
        $('#channel').show();
        $('input#message').focus();

        $.post('/user', {
            "user": name
        }).success(function() {
            initSocketIO();

        }).error(function(error) {
            console.log("error:"+error);
        });
    }

    function sanitise (text) {
      var sanitised_text = text;

      /* istanbul ignore else */
      if (text.indexOf('<') > -1 /* istanbul ignore next */
         || text.indexOf('>') > -1) {
        sanitised_text = text.replace(/</g, '&lt').replace(/>/g, '&gt');
      }

      return sanitised_text;
    }
    

});