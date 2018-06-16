class Board {
    constructor(player, nbTiles) {
        var nbCases = parseInt(nbTiles);
        var widthCase = 3;

        
        if (nbCases < 3) {
            nbCases = 3;
        }
        if (nbCases > 6) {
            nbCases = 6;
        }

        this.player = player;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        var scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.objects = [];

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(0x000000, 0.0);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        var nbCasesDrawn = 0;
        var geometry = new THREE.BoxGeometry(widthCase, 0.4, widthCase);

        var pair = this.pair;

        for (var i = nbCases; i >= 1; i--) {
            for (var y = 1; y <= nbCases; y++) {
                var color = 0xF4F4F4;

                if (pair(nbCases) && ((!pair(i) && pair(y)) || (pair(i) && !pair(y)))) {
                    color = 0x1a4355;
                } else if (!pair(nbCases) && !pair(nbCasesDrawn)) {
                    color = 0x1a4355;
                }

                var material = new THREE.MeshLambertMaterial({
                    color: color
                });

                var newCase = new THREE.Mesh(geometry, material);
                newCase.position.x = (widthCase * i) - ((widthCase / 2) * (nbCases + 1)) + (i / 1.8);
                newCase.position.y = 2;
                newCase.position.z = (widthCase * y) - ((widthCase / 2) * (nbCases + 1)) + (y / 1.8);

                // On décale la case du nombre de case courant (i) x la taille de chaque case (widthcase)
                // 

                newCase.pid = nbCasesDrawn;
                scene.add(newCase);
                this.objects.push(newCase);
                nbCasesDrawn++;
            }
        }

        var geometry2 = new THREE.BoxGeometry(widthCase / 2, 0.3, widthCase / 2);

        var colorHover = 0xffff00;
        if (player === 1) {
            colorHover = 0x00ffff;
        }

        var material = new THREE.MeshLambertMaterial({
            color: colorHover
        });

        this.caseHover = new THREE.Mesh(geometry2, material);
        this.caseHover.position.x = newCase.position.x;
        this.caseHover.position.y = 2.3;
        this.caseHover.position.z = newCase.position.z;
        this.caseHover.material.transparent = true;
        scene.add(this.caseHover);

        var light = new THREE.AmbientLight(0x404040);
        scene.add(light);
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        scene.add(directionalLight);

        var controls = new THREE.OrbitControls(this.camera);

        this.camera.position.set(-5, 15, 10);
        controls.update();

        var animate = () => {
            requestAnimationFrame(animate);

            var posX = this.round(this.caseHover.position.x);
            var posZ = this.round(this.caseHover.position.z);
            var vitesse = 0.4;

            if (this.caseHover.goToX) {
                if (this.caseHover.goToX - posX > vitesse) {
                    this.caseHover.position.x = this.round(posX + vitesse);
                } else if (posX - this.caseHover.goToX > vitesse) {
                    this.caseHover.position.x = this.round(posX - vitesse);
                } else {
                    this.caseHover.position.x = this.caseHover.goToX;
                }
            }

            if (this.caseHover.goToZ) {
                if (this.caseHover.goToZ - posZ > vitesse) {
                    this.caseHover.position.z = this.round(posZ + vitesse);
                } else if (posZ - this.caseHover.goToZ > vitesse) {
                    this.caseHover.position.z = this.round(posZ - vitesse);
                } else {
                    this.caseHover.position.z = this.caseHover.goToZ;
                }
            }

            this.renderer.render(scene, this.camera);
        };

        animate();
    }

    pair(number) {
        if (number % 2 === 0) {
            return true;
        } else {
            return false;
        }
    }

    round(number) {
        var factor = Math.pow(10, 2);
        return Math.round(number * factor) / factor;
    }

    colorCase(pid, player) {
        var object = this.objects[pid];
        if (player === 1) {
            object.material.color.setHex(0x00ffff);
        } else {
            object.material.color.setHex(0xffff00);
        }

        object.scale.set(1, 2, 1);
        object.position.y = 2.2;
    }

    hoverCase(object) {
        if (object) {
            this.caseHover.goToX = this.round(object.position.x);
            this.caseHover.goToZ = this.round(object.position.z);
        }
    }

    intersect(x, y) {
        this.mouse.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(y / this.renderer.domElement.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        var intersects = this.raycaster.intersectObjects(this.objects);

        if (intersects.length > 0) {
            var object = intersects[0].object;
            return object;
        }
    }
}
