class Party {
    constructor() {
        // On initialise les variables utiles
        this.url = window.location.href;


        this.socket = io.connect(this.url);

        // La partie en cours
        this.currentPlaying = 1;
        this.idPlayer = null;
        this.idParty = null;

        // Pour récupérer la liste des parties en attente
        $.ajax({
            url: this.url + "party/all",
            type: "GET",
            crossDomain: true,
            success: (response) => {
                response.forEach((party) => {
                    this.addDomParty(party.id, party.player);
                });
            }
        });

        this.activeSocket();
    }

    addDomParty(idParty, player) {
        var join = $('<li data-id="'+idParty+'" class="'+idParty+'">Rejoindre <strong>'+player+'</strong></li>');
        $('#open-parties').prepend(join);

        let _this = this;

        // Quand on cliquera sur cette partie
        join.click(function(event, test) {
            event.preventDefault();
            let idParty = $(this).data('id');
            $('body').addClass('form2');

            // On récupère l'id cliquée, on affiche le formulaire et on initialise le Player 2
            _this.idPlayer = 2;
            _this.idParty = idParty;    
        });
    }

    activeSocket() {
        // Quand la partie est terminée
        this.socket.on('end', (message, party) => {
            if (party === this.idParty) {
                this.lightbox(message);
                $('#play-again').show();
            }
        });

        // Quand une nouvelle partie est créée par un autre joueur
        this.socket.on('create', (idParty, player) => {
            if (!this.idParty) { // et qu'il n'a pas de partie commencée
                // On l'affiche dans la liste front 
                this.addDomParty(idParty, player);
            }
        });

        // Quand un autre utilisateur rejoint une partie
        this.socket.on('join', (party, player) => {
            if (party === this.idParty) { // Si c'est notre partie, elle commence
                $('#select-party').remove();
                $('#tour strong').html(player);
                this.designBoard();
            } else { // Sinon la partie n'est plus dispo, on la retire de la liste front
                $('.' + party).remove();
            }
        });

        // L'autre joueur a joué
        this.socket.on('play', (pid, party) => {
            if (party === this.idParty) { // Si c'est bien notre adversaire
                
                // On inverse le current player
                var player = 1;
                if (this.idPlayer === 1) {
                    player = 2;
                }

                // On colore la case et on cache la lightbox "wait"
                this.board.colorCase(pid, player);
                this.currentPlaying = this.idPlayer;
                $('body').removeClass('wait');
            }
        });
    }

    lightbox(message) {
        $('.lightbox div p').html(message);
        $('body').addClass('wait').removeClass('form form2');
    }

    removeLightbox(message) {
        $('body').removeClass('wait');
    }

    newParty() {
        $('body').addClass('form');
    }

    // On créer une nouvelle partie
    createParty () {
        $('body').removeClass('form');
        
        // On récupère le pseudo + le nombre de cases
        var width = parseInt($('#width').val());
        this.nbTiles = width;

        var name = $('#name').val();

        if (name.length === 0) {
            name = "Joueur sans nom";
        }

        $.ajax({
            url: this.url + "party/new/" + name + "/" + width,
            type: "GET",
            crossDomain: true,
            success: (response) => {
                // On initialise le player 1 (créateur)
                this.idPlayer = 1;
                this.idParty = response.file;
                $('#select-party').html(response.msg);

                // On prévient les autres users qu'une partie est créée
                this.socket.emit('create', this.idParty, name);
            }
        });
    }

    // Quand on clique sur "rejoindre une partie"
    joinParty() {

        // On récupère le pseudo
        var name = $('#name').val();

        if (name.length === 0) {
            name = "Joueur 2 sans nom";
        }
        
        $.ajax({
            url: this.url + "start/" + this.idParty + '/' + name,
            type: "GET",
            crossDomain: true,
            success: (response) => {
                // S'il y a une erreur (l'autre joueur a quitté avant)
                if (response.state === 'error') {
                    this.lightbox(response.msg);
                } else {
                    // Sinon la partie commence et on prévient l'autre joueur
                    this.socket.emit('join', name, this.idParty);
                    this.nbTiles = response.nbTiles;
                    this.designBoard();
                    this.lightbox(response.msg);
                }
            }
        });
    }

    // Dès qu'on déplace la souris
    moveHover(event) {
        // Si on peut jouer
        if (!$('body').hasClass('wait')) {
            document.body.style.cursor = 'pointer';
            var object = this.board.intersect(event.clientX, event.clientY);

            if (object) {
                // Si on est sur une case existante
                this.board.hoverCase(object);
            } 
            if (!object || object.scale && object.scale.y == 2) {
                // Si la case n'est plus dispo (déjà jouée) on change le curseur
                document.body.style.cursor = 'default';
            }
        }
    }

    // Quand on clique sur le board
    click(event) {
        // Si on est le joueur actuel et que le jeu n'est pas en pause pour x raison
        if(this.currentPlaying === this.idPlayer && !$('body').hasClass('wait')) {
            var object = this.board.intersect(event.clientX, event.clientY);

            // Si le clic correspond à une case
            if (object) {
                var pid = object.pid;               
                $.ajax({
                    url: this.url + "play/" + this.idParty + "/" + this.idPlayer + "/" + pid,
                    type: "GET",
                    crossDomain: true,
                    success: (response) => {
                        // Si on ne peut pas jouer sur cette case, on affiche temporairement l'erreur
                        if (response.state === "error") {
                            this.lightbox(response.msg);
                            setTimeout(() => {
                                this.removeLightbox();
                            }, 1000);
                        } else {
                            // Sinon on colore la case
                            // et on previent l'autre utilisateur pour qu'il la colore aussi
                            this.board.colorCase(pid, this.idPlayer);
                            this.socket.emit('play', pid, this.idParty);
                            this.currentPlaying = response.currentPlayer;
                            
                            this.lightbox(response.msg);
                            
                            // Si le joueur actuel a gagné
                            if (response.state === 'end') {
                                // On prévient l'autre joueur, et on affiche le message
                                this.socket.emit('end', response.msg, this.idParty);
                                $('#play-again').show();
                            }
                        }
                    }
                });
            }
        } 
    }

    // Fonction pour designer le board
    designBoard() {
        // On cache les formuaires
        $('body').removeClass('form2');
        $('#select-party').remove();
        
        this.board = new Board(this.idPlayer, this.nbTiles);

        // On init les listeners
        document.addEventListener('click', (event) => {
            event.preventDefault();
            this.click(event);
        });

        document.addEventListener('mousemove', (event) => {
            event.preventDefault();
            this.moveHover(event);
        });
    }
}