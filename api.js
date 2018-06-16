let fs = require('fs');
let express = require('express');
let app = express();
let server = require('http').createServer(app);  
let io = require('socket.io')(server);

let openFolder = 'games/open/';
let playingFolder = 'games/play/';
let endFolder = 'games/end/';

let saveBoard = (game, name) => {
    let file =  name + '.json';
    fs.writeFile(file, JSON.stringify(game), function (err) {
        if (err) {
            throw err;
        }
    });
}

// With my stockage array we can detect combos easily
// For example with 3 x 3 board, horitontal combos can be :
///// [1, 0, 0, 1, 0, 0, 1, 0, 0] 
// OR [0, 1, 0, 0, 1, 0, 0, 1, 0]
// OR [0, 0, 1, 0, 0, 1, 0, 0, 1]
// So we just need to count modulo result together 
// On a un combo si 1 case sur 3 est de la même couleur (à partir de l'offset 0, 1 ou 2)

app.use(express.static('public'));

io.on('connection', function(client) {  
    client.on('join', function (player, party) {
        client.broadcast.emit('join', party, player);
    });	

    client.on('play', function (pid, idParty) {
        client.broadcast.emit('play', pid, idParty);
    });
    
    client.on('end', function (message, idParty) {
        client.broadcast.emit('end', message, idParty);
    });

    client.on('create', function (idParty, player) {
        client.broadcast.emit('create', idParty, player);
    });

    client.on('quit', function (party) {
        console.log('QUIT');
        client.broadcast.emit('end', party, 'L\'autre joueur a quitté la partie.');

        if (fs.existsSync(playingFolder + party + '.json')) {
            fs.rename(playingFolder + party + '.json', endFolder + party + '.json'); 
        }

        if (fs.existsSync(openFolder + party + '.json')) {
            fs.rename(openFolder + party + '.json', endFolder + party + '.json'); 
        }
    });
});

// Retourne une liste de parties en attente d'un second joueur
app.get('/party/all', function(req, res) {
    let result = [];

    fs.readdirSync(openFolder).forEach(file => {
        if (file != '.DS_Store') {
            let data = fs.readFileSync(openFolder + file);
            data = JSON.parse(data);
            let player = data.players && data.players[0];
            let fileName = data.file;
            
            let party = {};
            party.player = player;
            party.id = fileName;
            result.push(party);
        }
    })

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.send(result);
});

// Créer une nouvelle partie
app.get('/party/new/:player/:width', function(req, res) {
    let player = req.params.player;
    let width = parseInt(req.params.width);
    let newFile = player + '_' + Date.now();

    if (width < 3) {
        width = 3;
    }

    if (width > 6) {
        width = 6;
    }

    let game = {
        "state": "wait",
        "file" : newFile,
        "msg": "En attente d'un second joueur (dans une autre fenêtre)...",
        "nbClicks": 0,
        "nbTiles": width,
        "players" : [player, "Joueur 2"]
    };

    let index = 0;
    game.board = [];
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < width; y++) {
            game.board[index] = 0;
            index++;
        }
    }

    saveBoard(game, openFolder + newFile);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.send(game);
});


// Rejoindre une partie
app.get('/start/:party/:player', function(req, res) {
    let file = req.params.party;
    let player = req.params.player;
    let data = {
        state: "error",
        msg: "L'autre joueur a quitté la partie."
    };

    if (fs.existsSync(openFolder + file + '.json')) {
        data = fs.readFileSync(openFolder + file + '.json');
        data = JSON.parse(data);
    
        data.state = 'running';
        data.msg =  data.players[0] + ' commence la partie.';
        data.players[1] = player;
        data.currentPlayer = 1;
    
        fs.rename(openFolder + file + '.json', playingFolder + file + '.json'); 
        console.log('save', data);
        saveBoard(data, playingFolder + file);
        console.log('save', data);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
});

// Placer un pion
app.get('/play/:party/:player/:move', function(req, res) {
    let party = req.params.party;
    let result = {
        state: "error",
        msg: "Impossible de charger le board."
    };

    if (fs.existsSync(playingFolder + party + '.json')) {
        let player = parseInt(req.params.player);
        let move = parseInt(req.params.move);

        let data = fs.readFileSync(playingFolder + party + '.json');  
        let game = JSON.parse(data); 

        let board = game.board;

        game.state = 'running';
        
        if (move < board.length && board[move] === 0) {
            board[move] = player;
            let nextPlayer = 2;
            if (player === 2) {
                nextPlayer = 1;
            }
            
            game.msg = 'C\'est au tour de ' + game.players[nextPlayer - 1] + '.';
            
            game.currentPlayer = nextPlayer;
            game.nbClicks += 1;
        } else {
            game.msg = 'Cette case n\'est pas disponible !';
            game.state = 'error';
        }

        let comboY = 0;
        let diag1 = 0;
        let diag2 = 0;
        let combosX = {};
        let combosY = {};
        let findCombo = 0;
        let nbTiles = game.nbTiles;

        for (let index = 0; index < nbTiles; index++) {
            combosX[index] = 0;
            combosY[index] = 0;
        }

        for (let indexBoard = 0; indexBoard < board.length; indexBoard++) {
            let currentCase = board[indexBoard];
           
            // VERTICAL
            // TODO : CHECKER L'INDEX CASE
            let indexVertical = Math.floor(indexBoard / nbTiles);
            if (currentCase === player) {
                combosY[indexVertical] = combosY[indexVertical] + 1;
            }

            // Horitonzal
            let indexHorizontal = indexBoard % nbTiles;
            if (currentCase === player) {
                combosX[indexHorizontal] = combosX[indexHorizontal] + 1;
            }
           
            // DIAGONALE 1
            if (indexBoard % (nbTiles + 1) === 0 && currentCase === player) {
                diag1++;
            }

            if (combosY[indexVertical] >= nbTiles) {
                console.log('VERTICAL COMBO');
                findCombo++;
                break;
            }

            if (combosX[indexHorizontal] >= nbTiles) {
                console.log('HORITONTAL COMBO');
                findCombo++;
                break;
            }

            if (diag1 >= nbTiles) {
                console.log('DIAG 1 COMBO !');
                findCombo++;
                break;
            }
        }

        let checkIndex = nbTiles - 1;
        for (let index = 0; index < nbTiles; index++) {
            if (board[checkIndex] === player) {
                diag2 ++;
            }
            checkIndex += (nbTiles - 1);
        }

        if (diag2 >= nbTiles) {
            console.log('DIAG 2 COMBO !');
            findCombo++;
        }

        if (findCombo >= 1) {
            game.state = 'end';
            game.msg = game.players[player - 1] + ' a gagné !';
        } else if (game.nbClicks >= (nbTiles * nbTiles)) {
            game.state = 'end';
            game.msg = 'Personne n\'a gagné';
        }

        saveBoard(game, playingFolder + party);
        result = game;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.send(result);
});

// Retourner l'index
app.use(function(req, res, next){
    res.sendFile(__dirname + '/public/index.html');
});


server.listen(8080);  