var defaultWidth = 700;
var defaultHeight = 800;
var wsScheme = "ws://";
var gameID = 0;
var gameMove = 0;
var playerWaiting = false;
var serverAddress = "localhost:22345";
var protocol = "chinese_chess_game";
var black = "black";
var red = "red";
var upper = "upper";
var lower = "lower";
var general = "general";
var advisor = "advisor";
var elephant = "elephant";
var horse = "horse";
var chariot = "chariot";
var cannon = "cannon";
var soldier = "soldier";
var online = "online";
var offline = "offline";
var gameType = offline;

class Piece {
    constructor (type, side, src, coord) {
        this.type = type;
        this.side = side;
        this.alive = true;
        this.src = src;
        this.coord = coord;
    }
}

class Diagram {
    constructor (localFaction) {
        this.localFaction = localFaction;
        this.pieces = [];

        if (gameType == online) {
            this.side = lower;
        }
        else {
            this.side = "";
        }
    }

    init() {
        this.pieceMaker(general, upper, [[4, 0]]);
        this.pieceMaker(advisor, upper, [[3, 0], [5, 0]]);
        this.pieceMaker(elephant, upper, [[2, 0], [6, 0]]);
        this.pieceMaker(horse, upper, [[1, 0], [7, 0]]);
        this.pieceMaker(chariot, upper, [[0, 0], [8, 0]]);
        this.pieceMaker(cannon, upper, [[1, 2], [7, 2]]);
        this.pieceMaker(soldier, upper, [[0, 3], [2, 3], [4, 3], [6, 3], [8, 3]]);

        this.pieceMaker(general, lower, [[4, 9]]);
        this.pieceMaker(advisor, lower, [[3, 9], [5, 9]]);
        this.pieceMaker(elephant, lower, [[2, 9], [6, 9]]);
        this.pieceMaker(horse, lower, [[1, 9], [7, 9]]);
        this.pieceMaker(chariot, lower, [[0, 9], [8, 9]]);
        this.pieceMaker(cannon, lower, [[1, 7], [7, 7]]);
        this.pieceMaker(soldier, lower, [[0, 6], [2, 6], [4, 6], [6, 6], [8, 6]]);
    }

    getGenerals() {
        let generals = 0;

        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].alive &&
                this.pieces[i].type == general) {
                generals = generals + 1;
            }
        }

        return generals;
    }

    switchSide(pieces) {
        for (let i = 0; i < pieces.length; i++) {
            pieces[i].coord[0] = 8 - pieces[i].coord[0];
            pieces[i].coord[1] = 9 - pieces[i].coord[1];

            if (pieces[i].side == upper) {
                pieces[i].side = lower;
            }
            else if (pieces[i].side == lower) {
                pieces[i].side = upper;
            }
        }

        return pieces;
    }

    toJSON(doSwitch) {
        let pieceCopies = JSON.parse(JSON.stringify(this.pieces))

        if (doSwitch) {
            return `json|${gameID}|${gameMove}|${JSON.stringify(this.switchSide(pieceCopies))}`;
        }
        else {
            return `json|${gameID}|${gameMove}|${JSON.stringify(pieceCopies)}`;
        }
    }

    sync(doSwitch) {
        gameMove = gameMove + 1;
        let outboundPieces = this.toJSON(doSwitch);
        client.send(outboundPieces);
        gameMove = gameMove + 1;
        playerWaiting = true;
    }

    pieceMaker(type, side, pos) {
        let src = "";

        switch(type) {
            case general:
                src = "g";
                break;

            case advisor:
                src = "a";
                break;

            case elephant:
                src = "e";
                break;

            case horse:
                src = "h";
                break;

            case chariot:
                src = "r";
                break;

            case cannon:
                src = "c";
                break;

            case soldier:
                src = "s";
                break;
        }
    
        for (let i = 0; i < pos.length; i++) {
            let newPiece = new Piece(type, side, src, pos[i]);
            this.pieces.push(newPiece);
        }
    }

    matchLine(sourceCoord, targetCoord) {
        if (sourceCoord[0] == targetCoord[0] ||
            sourceCoord[1] == targetCoord[1]) {
            return true;
        }
        else {
            return false;
        }
    }

    matchCoord(sourceCoord, targetCoord) {
        if (sourceCoord.toString() == targetCoord.toString()) {
            return true;
        }
        else {
            return false;
        }
    }

    inCamp(piece, coord) {
        if (coord[0] < 3 || coord[0] > 5) {
            return false;
        }
        
        if (piece.side == upper && coord[1] >= 3) {
            return false;
        }
        else if (piece.side == lower && coord[1] <= 6) {
            return false
        }

        return true;
    }

    inHomeland(piece, coord) {
        if (piece.side == upper && coord[1] >= 5) {
            return false;
        }
        else if (piece.side == lower && coord[1] <= 4) {
            return false;
        }

        return true;
    }

    getDistance(sourceCoord, targetCoord) {
        return Math.abs(sourceCoord[0] - targetCoord[0]) + Math.abs(sourceCoord[1] - targetCoord[1]);
    }

    getTargetPiece(coord) {
        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].alive && this.matchCoord(this.pieces[i].coord, coord)) {
                return i;
            }
        }

        return -1;
    }

    getSourcePiece(coord) {
        let selectedPiece = this.getTargetPiece(coord);

        if (this.getGenerals() != 2) {
            selectedPiece = -1;
        }

        if (selectedPiece != -1) {
            if (this.side != "" && this.side != this.pieces[selectedPiece].side) {
                selectedPiece = -1;
            }
        }

        return selectedPiece;
    }

    moveSelectedPiece(selectedPiece, coord) {
        let encounter = -1;
        let movable = false;

        if (playerWaiting) {
            return false;
        }
        if (selectedPiece == -1) {
            return false;
        }

        if (!this.pieceMovable(selectedPiece, coord)) {
            return false;
        }

        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].alive && this.matchCoord(this.pieces[i].coord, coord)) {
                encounter = i;
                break;
            }
        }
        
        if (encounter != -1) {
            if (this.pieces[encounter].side != this.pieces[selectedPiece].side) {
                this.pieces[encounter].alive = false;
                movable = true;
            }
        }
        else {
            movable = true;
        }

        if (movable) {
            this.pieces[selectedPiece].coord = coord;

            if (gameType == online) {
                this.sync(true);
            }
            else {
                if (this.side == "") {
                    this.side = this.pieces[selectedPiece].side;
                }
                if (this.side == upper) {
                    this.side = lower;
                }
                else if (this.side == lower) {
                    this.side = upper;
                }
            }

            return true;
        }
        else {
            return false;
        }
    }

    pieceMovable(selectedPiece, coord) {
        let result = true;

        switch(this.pieces[selectedPiece].type) {
            case general:
                result = this.generalMovable(selectedPiece, coord);
                break;

            case advisor:
                result = this.advisorMovable(selectedPiece, coord);
                break;

            case elephant:
                result = this.elephantMovable(selectedPiece, coord);
                break;

            case horse:
                result = this.horseMovable(selectedPiece, coord);
                break;

            case chariot:
                result = this.straightMovable(selectedPiece, coord);
                break;

            case cannon:
                let target = this.getTargetPiece(coord);

                if (target != -1 && this.pieces[target].side != this.pieces[selectedPiece].side) {
                    result = this.jumpMovable(selectedPiece, coord);
                }
                else {
                    result = this.straightMovable(selectedPiece, coord);
                }
                break;

            case soldier:
                result = this.soldierMovable(selectedPiece, coord);
                break;
        }

        return result;
    }

    generalMovable(selectedPiece, coord) {
        let target = this.getTargetPiece(coord);

        if (target != -1) {
            if (this.pieces[target].type == general && 
                this.straightMovable(selectedPiece, coord)) {
                return true;
            }
        } 

        if (!this.inCamp(this.pieces[selectedPiece], coord)) {
            return false;
        }

        if (this.getDistance(this.pieces[selectedPiece].coord, coord) != 1 ) {
            return false;
        }

        return true;
    }

    advisorMovable(selectedPiece, coord) {
        if (!this.inCamp(this.pieces[selectedPiece], coord)) {
            return false;
        }

        if (Math.abs(this.pieces[selectedPiece].coord[0] - coord[0]) != 1) {
            return false;
        }

        if (Math.abs(this.pieces[selectedPiece].coord[1] - coord[1]) != 1) {
            return false;
        }

        return true;
    }

    elephantMovable(selectedPiece, coord) {
        if (!this.inHomeland(this.pieces[selectedPiece], coord)) {
            return false;
        }

        if (Math.abs(this.pieces[selectedPiece].coord[0] - coord[0]) != 2) {
            return false;
        }

        if (Math.abs(this.pieces[selectedPiece].coord[1] - coord[1]) != 2) {
            return false;
        }

        if ((this.pieces[selectedPiece].coord[0] + 2 ) == coord[0] &&
            (this.pieces[selectedPiece].coord[1] + 2 ) == coord[1]) {
            if (this.getTargetPiece(
                [this.pieces[selectedPiece].coord[0] + 1,
                this.pieces[selectedPiece].coord[1] + 1]) != -1) {
                return false;
            }
        }
        else if ((this.pieces[selectedPiece].coord[0] - 2 ) == coord[0] &&
            (this.pieces[selectedPiece].coord[1] - 2 ) == coord[1]) {
            if (this.getTargetPiece(
                [this.pieces[selectedPiece].coord[0] - 1,
                this.pieces[selectedPiece].coord[1] - 1]) != -1) {
                return false;
            }
        }
        else if ((this.pieces[selectedPiece].coord[0] + 2 ) == coord[0] &&
            (this.pieces[selectedPiece].coord[1] - 2 ) == coord[1]) {
            if (this.getTargetPiece(
                [this.pieces[selectedPiece].coord[0] + 1,
                this.pieces[selectedPiece].coord[1] - 1]) != -1) {
                return false;
            }
        }
        else if ((this.pieces[selectedPiece].coord[0] - 2 ) == coord[0] &&
            (this.pieces[selectedPiece].coord[1] + 2 ) == coord[1]) {
            if (this.getTargetPiece(
                [this.pieces[selectedPiece].coord[0] - 1,
                this.pieces[selectedPiece].coord[1] + 1]) != -1) {
                return false;
            }
        }

        return true;
    }

    horseMovable(selectedPiece, coord) {
        if (this.matchLine(this.pieces[selectedPiece].coord, coord)) {
            return false;
        }

        if (this.getDistance(this.pieces[selectedPiece].coord, coord) != 3 ) {
            return false;
        }

        if ((this.pieces[selectedPiece].coord[0] + 2 ) == coord[0]) {
            if (this.getTargetPiece(
                [this.pieces[selectedPiece].coord[0] + 1, this.pieces[selectedPiece].coord[1]]) != -1) {
                return false;
            }
        }
        else if ((this.pieces[selectedPiece].coord[0] - 2 ) == coord[0]) {
            if (this.getTargetPiece(
                [this.pieces[selectedPiece].coord[0] - 1, this.pieces[selectedPiece].coord[1]]) != -1) {
                return false;
            }
        }
        else if ((this.pieces[selectedPiece].coord[1] + 2 ) == coord[1]) {
            if (this.getTargetPiece(
                [this.pieces[selectedPiece].coord[0], this.pieces[selectedPiece].coord[1] + 1]) != -1) {
                return false;
            }
        }
        else if ((this.pieces[selectedPiece].coord[1] - 2 ) == coord[1]) {
            if (this.getTargetPiece(
                [this.pieces[selectedPiece].coord[0], this.pieces[selectedPiece].coord[1] - 1]) != -1) {
                return false;
            }
        }

        return true;
    }

    straightMovable(selectedPiece, coord) {
        if (!this.matchLine(this.pieces[selectedPiece].coord, coord)) {
            return false;
        }
       
        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].alive) {
                if (this.pieces[i].coord[0] == this.pieces[selectedPiece].coord[0]) {
                    if (this.pieces[i].coord[1] > this.pieces[selectedPiece].coord[1] &&
                        this.pieces[i].coord[1] < coord[1]) {
                        return false;
                    }
                    else if (this.pieces[i].coord[1] < this.pieces[selectedPiece].coord[1] &&
                        this.pieces[i].coord[1] > coord[1]) {
                        return false;
                    }
                }
                else if (this.pieces[i].coord[1] == this.pieces[selectedPiece].coord[1]) {
                    if (this.pieces[i].coord[0] > this.pieces[selectedPiece].coord[0] &&
                        this.pieces[i].coord[0] < coord[0]) {
                        return false;
                    }
                    else if (this.pieces[i].coord[0] < this.pieces[selectedPiece].coord[0] &&
                        this.pieces[i].coord[0] > coord[0]) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    jumpMovable(selectedPiece, coord) {
        if (!this.matchLine(this.pieces[selectedPiece].coord, coord)) {
            return false;
        }

        let count = 0;

        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].alive) {
                if (this.pieces[i].coord[0] == this.pieces[selectedPiece].coord[0]) {
                    if (this.pieces[i].coord[1] > this.pieces[selectedPiece].coord[1] &&
                        this.pieces[i].coord[1] < coord[1]) {
                        count = count + 1;
                    }
                    else if (this.pieces[i].coord[1] < this.pieces[selectedPiece].coord[1] &&
                        this.pieces[i].coord[1] > coord[1]) {
                        count = count + 1;
                    }
                }
                else if (this.pieces[i].coord[1] == this.pieces[selectedPiece].coord[1]) {
                    if (this.pieces[i].coord[0] > this.pieces[selectedPiece].coord[0] &&
                        this.pieces[i].coord[0] < coord[0]) {
                        count = count + 1;
                    }
                    else if (this.pieces[i].coord[0] < this.pieces[selectedPiece].coord[0] &&
                        this.pieces[i].coord[0] > coord[0]) {
                        count = count + 1;
                    }
                }
            }
        }

        if (count == 1) {
            return true;
        }

        return false;
    }

    soldierMovable(selectedPiece, coord) {
        if (this.getDistance(this.pieces[selectedPiece].coord, coord) != 1 ) {
            return false;
        }

        if (this.inHomeland(this.pieces[selectedPiece], coord)) {
            if (this.pieces[selectedPiece].side == upper) {
                if (this.pieces[selectedPiece].coord[1] + 1 != coord[1]) {
                    return false;
                }
            }
            else if (this.pieces[selectedPiece].side == lower) {
                if (this.pieces[selectedPiece].coord[1] - 1 != coord[1]) {
                    return false;
                }
            }
        }
        else {
            if (this.pieces[selectedPiece].side == upper) {
                if (this.pieces[selectedPiece].coord[1] - 1 == coord[1]) {
                    return false;
                }
            }
            else if (this.pieces[selectedPiece].side == lower) {
                if (this.pieces[selectedPiece].coord[1] + 1 == coord[1]) {
                    return false;
                }
            }
        }

        return true;
    }

    getAlivePieces() {
        let alivePieces = [];

        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].alive) {
                alivePieces.push(this.pieces[i]);
            }
        }

        return alivePieces;
    }
}

class Board {
    constructor () {
        this.image = new Image();
        this.image.src = "image/xiang_board.svg";
        this.xCells = [];
        this.yCells = [];
        this.xCellSize = 0;
        this.yCellSize = 0;
    }

    grid() {
        this.xCells.length = 0;
        this.yCells.length = 0;
        this.xCellSize = canvas.width / 9;
        this.yCellSize = canvas.height / 10;
        
        let pointer = 0;

        for (let i = 0; i < 10; i++) {
            this.xCells.push(pointer);
            pointer = pointer + this.xCellSize;
        }

        pointer = 0;

        for (let i = 0; i < 11; i++) {
            this.yCells.push(pointer);
            pointer = pointer + this.yCellSize;
        } 
    }
}

class PlayerControl {
    constructor () {
        this.side = lower;
        this.selectedPiece = -1;
        this.savedCoord = [];
    }

    reset() {
        this.selectedPiece = -1;
        this.savedCoord.length = 0;
    }
}

function mouseClick(event) {
    let rect = canvas.getBoundingClientRect();
    let mouseX = (event.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
    let mouseY = (event.clientY- rect.top) / (rect.bottom - rect.top) * canvas.height;
    let coord = getCoordinate(mouseX, mouseY);

    if (diagram.matchCoord(control.savedCoord, coord)) {
        control.reset();
        return;
    }

    if (!diagram.moveSelectedPiece(control.selectedPiece, coord) && !playerWaiting) {
        let piece = diagram.getSourcePiece(coord);

        if (piece != -1) {
            control.selectedPiece = piece;
            control.savedCoord = coord;
        }
    }
    else {
        control.reset();
    }
}

function canvasResize() {
    if (window.innerWidth < defaultWidth) {
        canvas.width = window.innerWidth;
        canvas.height = (window.innerWidth / 700) * 800;
    }
    else {
        canvas.width = defaultWidth;
        canvas.height = defaultHeight;
    }

    board.grid();
}

function getCoordinate(x, y) {
    let coord = [null, null];

    for (let i = 0; i < 9; i++) {
        if (x > board.xCells[i] && x < board.xCells[i + 1]) {
            coord[0] = i;
            break;
        } 
    }

    for (let i = 0; i < 10; i++) {
        if (y > board.yCells[i] && y < board.yCells[i + 1]) {
            coord[1] = i;
            break;
        } 
    }

    return coord;
}

function showGrid() {
    for (let i = 0; i < 10; i++) {
        ctx.moveTo(board.xCells[i], 0);
        ctx.lineTo(board.xCells[i], 800);
    }

    for (let i = 0; i < 11; i++) {
        ctx.moveTo(0, board.yCells[i]);
        ctx.lineTo(700, board.yCells[i]);
    }
}

function gameRender() {
    let alivePieces = diagram.getAlivePieces();
    let padding = 5;
    let pieceWitdh = board.xCellSize * 0.8;
    let pieceHeight = board.yCellSize * 0.8;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(board.image, padding, padding,
    canvas.width - padding, canvas.height - padding);

    for (let i = 0; i < alivePieces.length; i++) {
        let pieceImage = new Image();
        let postfix = "";
    
        if (diagram.localFaction == red) {
            if (alivePieces[i].side == upper) {
                postfix = "d1";
            }
            else {
                postfix = "l1";
            }
        }
        else if (diagram.localFaction == black) {
            if (alivePieces[i].side == upper) {
                postfix = "l1";
            }
            else {
                postfix = "d1";
            }
        }

        pieceImage.src = "image/xiangqi_" + alivePieces[i].src + postfix +".svg";
        let x = alivePieces[i].coord[0];
        let y = alivePieces[i].coord[1];
        let currentX = board.xCells[x] + (board.xCellSize * 0.12);
        let currentY = board.yCells[y] + (board.yCellSize * 0.12);

        ctx.save();

        if (alivePieces[i].side == upper) {
            ctx.translate(board.xCellSize * 0.8, board.yCellSize * 0.8);
            ctx.rotate((180 * Math.PI) / 180);
            ctx.drawImage(pieceImage, -currentX, -currentY, pieceWitdh, pieceHeight);
        }
        else {
            ctx.drawImage(pieceImage, currentX, currentY, pieceWitdh, pieceHeight);
        }

        ctx.restore();
    }

    ctx.beginPath();

    if (control.savedCoord.length != 0) {
        let x = control.savedCoord[0];
        let y = control.savedCoord[1];
        ctx.rect(board.xCells[x], board.yCells[y], board.xCellSize, board.yCellSize);
    }

    //showGrid();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "red";
    ctx.stroke();
    ctx.closePath();
}

function gameMain() {
    var fps = 24;
    gameRender();
    
    setTimeout(function() {
        requestAnimationFrame(gameMain);
    }, 1000 / fps);
};

function gameLauncher(side) {
    canvas = document.createElement("canvas");
    canvas.width = defaultWidth;
    canvas.height = defaultHeight;
    document.body.appendChild(canvas);
    
    ctx = canvas.getContext("2d");
    diagram = new Diagram(side);
    control = new PlayerControl();
    board = new Board();
    
    canvas.addEventListener("mousedown", mouseClick, false);
    window.addEventListener("resize", canvasResize, false);
    
    canvasResize();
    diagram.init();
    gameMain();
}

function getSettings() {
    if (localStorage.getItem("gameType") !== null) {
        gameType = localStorage.getItem("gameType");
    }
    if (localStorage.getItem("serverAddress") !== null) {
        serverAddress = localStorage.getItem("serverAddress");
    }
}

function newClient() {
    return new Promise(function(resolve, reject) {
        let client = new WebSocket(`${wsScheme}${serverAddress}`, protocol);

        client.onopen = function() {
            if (client.readyState === client.OPEN) {
                client.send("hello");
            }
        };

        client.onerror = function (error) {
            reject(`Failed to connect to ${serverAddress}, abort.`);
        };

        client.onmessage = function (event) {
            if (typeof event.data === "string") {
                if (event.data.startsWith("hello|")) {
                    let inboundData = event.data.split("|");
                    gameID = parseInt(inboundData[1]);
                    gameMove = parseInt(inboundData[2]);
                    console.log(`Game: ${gameID}, Player: ${gameMove}`);
                    resolve(client);
                }
                else if (event.data == "sorry") {
                    reject(`Unable to join the server, abort.`);
                }
                else if (event.data == "incoming" && playerWaiting) {
                    client.send(`update|${gameID}|${gameMove}`);
                }
                else if (event.data.startsWith(`json|${gameID}|${gameMove}|`)) {
                    diagram.pieces = JSON.parse(event.data.replace(`json|${gameID}|${gameMove}|`, ""));
                    playerWaiting = false;
                }
            }
        };
    });
}

async function clientConnect() {
    try {
        client = await newClient();

        if (gameMove == 0) {
            gameLauncher(red);
        }
        else if (gameMove == 1) {
            playerWaiting = true;
            gameLauncher(black);
        }
    }
    catch (error) {
        document.body.innerHTML = error;
    }
}

getSettings();

if (gameType == online) {
    clientConnect();
}
else if (gameType == offline) {
    gameLauncher(red);
}
else {
    document.body.innerHTML = "Invalid game mode, abort.";
}