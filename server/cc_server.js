var port = 22345;
var protocol = "chinese_chess_game";
var connections = {};
var playerCount = 0;
var gameID = 0;
var jsonData = "";
var http = require("http");
var WebSocketServer = require("websocket").server;

var server = http.createServer(function(request, response) {
    console.log(`${new Date()}: Received request for ${request.url}`);
    response.writeHead(404);
    response.end();
});

server.listen(port, function() {
    console.log(`${new Date()}: Server is listening on port ${port}`);
});

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    return true;
}

function broadcastMsg(data) {
    Object.keys(connections).forEach(function(key) {
        let connection = connections[key];

        if (connection.connected) {
            connection.sendUTF(data);
        }
    });
}

wsServer.on("request", function(request) {
    if (!originIsAllowed(request.origin)) {
        request.reject();
        console.log(`${new Date()}: Connection from origin ${request.origin} rejected.`);
        return;
    }
    
    var connection = request.accept(protocol, request.origin);
    console.log(`${new Date()}: Connection accepted.`);

    connection.on("message", function(message) {
        if (message.type === "utf8") {
            if (message.utf8Data == "hello") {
                let msg = `hello|${gameID}|${playerCount % 2}`;
                connection.id = playerCount;
                connections[connection.id] = connection;
                playerCount = playerCount + 1;

                if (playerCount % 2 == 0) {
                    gameID = gameID + 1;
                } 

                connection.sendUTF(msg);
            }
            else if (message.utf8Data.startsWith("json|")) {
                jsonData = message.utf8Data;
                broadcastMsg("incoming");
            }
            else if (message.utf8Data.startsWith("update|")) {
                if (message.utf8Data.split("|")[1] == jsonData.split("|")[1] && message.utf8Data.split("|")[2] == jsonData.split("|")[2]) {
                    connection.sendUTF(jsonData);
                }
            }
        }
    });

    connection.on("close", function(reasonCode, description) {
        delete connections[connection.id];
        console.log(`${new Date()}: Peer ${connection.remoteAddress} disconnected.`);
    });
});