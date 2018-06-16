$(function(){
    let Morpion = new Party();

    // Quand on créer une nouvelle partie
    $('#new-party').click(Morpion.newParty);

    // Le premier formulaire permet d'inscrire le nom du Joueur 1
    $('#form form').submit(function(event){
        event.preventDefault();
        Morpion.createParty();
    });

    // Le second formulaire pour le Joueur 2
    $('#form2 form').submit(function(event) {
        event.preventDefault();
        Morpion.joinParty();
    });

    // Pour lancer une nouvelle partie
    $('#play-again').click(function(event){
        event.preventDefault();
        window.location.href = '/';
    });

    // Pour prevenir l'autre utilisateur que le joueur quitte lap age
    $(window).on("beforeunload", function() {
        if (Morpion.idParty) {
            Morpion.socket.emit('quit', Morpion.idParty);
        }
    });


    // Force homepage /
    var url = window.location.pathname;
    var params = window.location.search;
    if (url !== '/' || params.length > 0) {
        window.location.href = '/';
    }
});