const btnRitual = document.getElementById('btn-ritual');
const btnFechar = document.getElementById('btn-fechar-ritual');
const container = document.getElementById('ritual-container');
const ui = document.getElementById('ritual-ui');

let scene, camera, renderer, animationId;
let isRitualActive = false;

// Elementos 3D
let giratinaGroup;
let magicCircleGroup;
let debris = [];
let torchesLights = [];
let priests = [];
let clock = new THREE.Clock();
let earthquakeActive = false;
let lookAtTarget = new THREE.Vector3(0, 10, 0); // Alvo no centro (Altar)

btnRitual.addEventListener('click', () => {
    container.style.display = 'block';
    isRitualActive = true;
    initThreeJS();
});

btnFechar.addEventListener('click', () => {
    container.style.display = 'none';
    isRitualActive = false;
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) renderer.dispose();
    
    gsap.killTweensOf("*");
    
    while (container.firstChild) {
        if (container.firstChild.id !== 'ritual-ui' && container.firstChild.id !== 'btn-fechar-ritual') {
            container.removeChild(container.firstChild);
        } else {
            break; 
        }
    }
    
    const canvas = container.querySelector('canvas');
    if(canvas) canvas.remove();

    ui.style.opacity = '0';
});

function initThreeJS() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.006); // Névoa escura e densa

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 15, 500); // Altura de uma pessoa andando (15m na nossa escala gigante)

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x050505);
    renderer.localClippingEnabled = true; // Para o efeito de portal do Giratina
    
    container.insertBefore(renderer.domElement, container.firstChild);

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0x332211, 0.4); // Bem mais escuro
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x443322, 0x111111, 0.3); // Fraca
    scene.add(hemiLight);

    const altarLight = new THREE.PointLight(0xff4400, 4, 300);
    altarLight.position.set(0, 20, 0);
    scene.add(altarLight);

    // ====== TEXTURAS ESPECÍFICAS ======
    const textureLoaderMain = new THREE.TextureLoader();

    // Pilar
    const texPillar = textureLoaderMain.load('assets/pillar_texture.png');
    texPillar.wrapS = THREE.RepeatWrapping; texPillar.wrapT = THREE.RepeatWrapping;
    texPillar.repeat.set(1, 4);
    // Escurecido para adaptar à luz ambiente
    const pillarMat = new THREE.MeshLambertMaterial({ map: texPillar, color: 0x444444 });

    // ====== CORREDOR RETO (de Z=100 até Z=600) ======
    const corridorLength = 500;
    
    // Chão Corredor
    const texCorridorFloor = textureLoaderMain.load('assets/floor_texture.png');
    texCorridorFloor.wrapS = THREE.RepeatWrapping; texCorridorFloor.wrapT = THREE.RepeatWrapping;
    texCorridorFloor.repeat.set(4, 12);
    const corridorFloorGeo = new THREE.PlaneGeometry(184, corridorLength);
    const corridorFloor = new THREE.Mesh(corridorFloorGeo, new THREE.MeshLambertMaterial({ map: texCorridorFloor, color: 0x333333 }));
    corridorFloor.rotation.x = -Math.PI / 2;
    corridorFloor.position.set(0, 0, 350);
    scene.add(corridorFloor);

    // Teto Corredor
    const texCorridorCeiling = textureLoaderMain.load('assets/ceiling_texture.png');
    texCorridorCeiling.wrapS = THREE.RepeatWrapping; texCorridorCeiling.wrapT = THREE.RepeatWrapping;
    texCorridorCeiling.repeat.set(4, 12);
    const corridorCeiling = new THREE.Mesh(corridorFloorGeo, new THREE.MeshLambertMaterial({ map: texCorridorCeiling, color: 0x222222 })); // teto muito escuro
    corridorCeiling.rotation.x = Math.PI / 2;
    corridorCeiling.position.set(0, 150, 350);
    scene.add(corridorCeiling);

    // Paredes Corredor (Relevo Asteca Puro)
    const wallGeo = new THREE.PlaneGeometry(corridorLength, 150);
    const wallTexClone = textureLoaderMain.load('assets/stone_relief.png?v=2');
    wallTexClone.wrapS = THREE.RepeatWrapping; wallTexClone.wrapT = THREE.RepeatWrapping;
    wallTexClone.repeat.set(8, 3);
    const wallTexMat2 = new THREE.MeshLambertMaterial({ map: wallTexClone, color: 0x444444 });

    const wall1 = new THREE.Mesh(wallGeo, wallTexMat2);
    wall1.rotation.y = Math.PI / 2;
    wall1.position.set(-92, 75, 350);
    scene.add(wall1);

    const wall2 = new THREE.Mesh(wallGeo, wallTexMat2);
    wall2.rotation.y = -Math.PI / 2;
    wall2.position.set(92, 75, 350);
    scene.add(wall2);

    // ====== SALA CIRCULAR DO ALTAR (centrada em Z=0) ======
    const roomRadius = 200;
    
    // Parede circular (Relevo Asteca Puro)
    const roomWallGeo = new THREE.CylinderGeometry(roomRadius, roomRadius, 150, 48, 1, true);
    const roomBrickTex = textureLoaderMain.load('assets/stone_relief.png?v=2');
    roomBrickTex.wrapS = THREE.RepeatWrapping; roomBrickTex.wrapT = THREE.RepeatWrapping;
    roomBrickTex.repeat.set(16, 3);
    const roomWallMat = new THREE.MeshLambertMaterial({ map: roomBrickTex, color: 0x444444, side: THREE.BackSide });
    const roomWall = new THREE.Mesh(roomWallGeo, roomWallMat);
    roomWall.position.set(0, 75, 0);
    scene.add(roomWall);

    // Chão Circular
    const texRoomFloor = textureLoaderMain.load('assets/floor_texture.png');
    texRoomFloor.wrapS = THREE.RepeatWrapping; texRoomFloor.wrapT = THREE.RepeatWrapping;
    texRoomFloor.repeat.set(10, 10);
    const roomFloorMat = new THREE.MeshLambertMaterial({ map: texRoomFloor, color: 0x333333 });
    const roomFloorGeo = new THREE.CircleGeometry(roomRadius, 48);
    const roomFloor = new THREE.Mesh(roomFloorGeo, roomFloorMat);
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.position.set(0, 0.1, 0);
    scene.add(roomFloor);

    // Teto Circular
    const texRoomCeiling = textureLoaderMain.load('assets/ceiling_texture.png');
    texRoomCeiling.wrapS = THREE.RepeatWrapping; texRoomCeiling.wrapT = THREE.RepeatWrapping;
    texRoomCeiling.repeat.set(10, 10);
    const roomCeilingMat = new THREE.MeshLambertMaterial({ map: texRoomCeiling, color: 0x222222 });
    const roomCeiling = new THREE.Mesh(roomFloorGeo, roomCeilingMat);
    roomCeiling.rotation.x = Math.PI / 2;
    roomCeiling.position.set(0, 150, 0);
    scene.add(roomCeiling);

    // ALTAR NO CENTRO
    for(let i=0; i<6; i++) {
        const stepGeo = new THREE.BoxGeometry(60 - (i*8), 3, 60 - (i*8));
        const step = new THREE.Mesh(stepGeo, roomFloorMat);
        step.position.set(0, 1.5 + (i*3), 0);
        scene.add(step);
    }

    // MEGA PILARES CIRCULANDO A SALA REDONDA
    const pillarGeo = new THREE.BoxGeometry(12, 150, 12);

    // --- TOCHA REALISTA (cabo + chama) ---
    function createTorch(x, y, z) {
        const torchGroup = new THREE.Group();
        // Cabo de madeira
        const stickMat = new THREE.MeshLambertMaterial({ color: 0x3b2210 });
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 8, 6), stickMat);
        stick.position.set(0, 0, 0);
        torchGroup.add(stick);
        // Braseiro no topo
        const bowlMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1, 2, 8), bowlMat);
        bowl.position.set(0, 5, 0);
        torchGroup.add(bowl);
        // Chama (3 camadas)
        const flame1 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5, 8), new THREE.MeshBasicMaterial({ color: 0xff4400 }));
        flame1.position.set(0, 8.5, 0);
        torchGroup.add(flame1);
        const flame2 = new THREE.Mesh(new THREE.ConeGeometry(1, 3.5, 6), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        flame2.position.set(0, 8.5, 0);
        torchGroup.add(flame2);
        const flame3 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2, 5), new THREE.MeshBasicMaterial({ color: 0xffee88 }));
        flame3.position.set(0, 9, 0);
        torchGroup.add(flame3);

        torchGroup.position.set(x, y, z);
        scene.add(torchGroup);
        return torchGroup;
    }

    // Pilares dentro da sala circular (raio 170, dentro da parede de raio 200)
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + (Math.PI / 12);
        const pX = Math.sin(angle) * 170;
        const pZ = Math.cos(angle) * 170;

        const p = new THREE.Mesh(pillarGeo, pillarMat);
        p.position.set(pX, 75, pZ);
        scene.add(p);

        createTorch(pX * 0.9, 25, pZ * 0.9);

        const light = new THREE.PointLight(0xff8833, 2, 150);
        light.position.set(pX * 0.85, 32, pZ * 0.85);
        scene.add(light);
        torchesLights.push(light);
    }

    // PILARES E TOCHAS DO CORREDOR
    for (let i = 100; i <= 450; i += 50) {
        const pL = new THREE.Mesh(pillarGeo, pillarMat);
        pL.position.set(-80, 75, i);
        scene.add(pL);
        const pR = new THREE.Mesh(pillarGeo, pillarMat);
        pR.position.set(80, 75, i);
        scene.add(pR);

        createTorch(-70, 25, i);
        createTorch(70, 25, i);

        // Luz real a cada 100m do corredor para iluminar as paredes
        if (i % 100 === 0) {
            const cLight = new THREE.PointLight(0xff8833, 1.5, 150);
            cLight.position.set(0, 30, i);
            scene.add(cLight);
            torchesLights.push(cLight);
        }
    }

    // --- MURAIS GIGANTES NAS PAREDES ---
    const textureLoader = new THREE.TextureLoader();
    const muralGeo = new THREE.PlaneGeometry(120, 90);
    
    textureLoader.load('assets/mural_creation.png', (texture) => {
        const muralMesh = new THREE.Mesh(muralGeo, new THREE.MeshBasicMaterial({ map: texture }));
        muralMesh.position.set(-195, 75, 0); // Na parede circular
        muralMesh.rotation.y = Math.PI / 2;
        scene.add(muralMesh);
    }, undefined, () => {});

    textureLoader.load('assets/mural_banishment.png', (texture) => {
        const muralMesh2 = new THREE.Mesh(muralGeo, new THREE.MeshBasicMaterial({ map: texture }));
        muralMesh2.position.set(195, 75, 0); // Na parede circular oposta
        muralMesh2.rotation.y = -Math.PI / 2;
        scene.add(muralMesh2);
    }, undefined, () => {});


    // --- SACERDOTES REZANDO ---
    // (Os sacerdotes agora serão carregados via GLB mais abaixo)


    // --- CÍRCULO MÁGICO DE INVOCAÇÃO (NO CENTRO GIGANTE) ---
    magicCircleGroup = new THREE.Group();
    magicCircleGroup.position.set(0, 20, 0); // Acima do altar
    magicCircleGroup.rotation.x = -Math.PI / 2;
    magicCircleGroup.scale.set(0, 0, 0);

    const arcaneMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(38, 40, 64), arcaneMat);
    magicCircleGroup.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(30, 32, 24, 1, 0, Math.PI*2), arcaneMat);
    magicCircleGroup.add(ring2);
    const tri1 = new THREE.Mesh(new THREE.CircleGeometry(28, 3), arcaneMat);
    tri1.material.wireframe = true; magicCircleGroup.add(tri1);
    const tri2 = new THREE.Mesh(new THREE.CircleGeometry(28, 3), arcaneMat);
    tri2.rotation.z = Math.PI; tri2.material.wireframe = true; magicCircleGroup.add(tri2);

    scene.add(magicCircleGroup);


    // --- CHUVA DE PEDRAS (DEBRIS) ---
    const debrisGeo = new THREE.BoxGeometry(2, 2, 2);
    // Reduzido de 150 para 30 para não engasgar o WebGL
    for(let i=0; i<30; i++) {
        const dMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const rock = new THREE.Mesh(debrisGeo, dMat);
        
        rock.position.set(
            (Math.random() - 0.5) * 200,
            150 + Math.random() * 50, // No teto alto
            (Math.random() - 0.5) * 200
        );
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        const scale = Math.random() * 2 + 1;
        rock.scale.set(scale, scale, scale);
        rock.visible = false;
        
        rock.userData = {
            velocity: 0,
            gravity: 0.2 + (Math.random() * 0.2),
            rotSpeed: (Math.random() - 0.5) * 0.2
        };
        scene.add(rock);
        debris.push(rock);
    }


    // --- CARREGANDO O GIRATINA EM GLB ---
    // Plano de corte: só mostra o que está ACIMA de Y=20 (altura do portal)
    const portalClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -20);

    giratinaGroup = new THREE.Group();
    giratinaGroup.position.set(0, -30, 0); // Começa bem abaixo do portal
    scene.add(giratinaGroup);

    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    
    const gltfLoader = new THREE.GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load('assets/giratina.glb', (gltf) => {
        const model = gltf.scene;
        model.scale.set(45, 45, 45);
        model.position.set(0, 0, 0);
        // Aplicar clipping plane em todos os materiais do Giratina
        model.traverse((child) => {
            if (child.isMesh) {
                child.material.clippingPlanes = [portalClipPlane];
                child.material.clipShadows = true;
            }
        });
        giratinaGroup.add(model);
    }, undefined, (err) => {
        console.error("Erro ao carregar o modelo GLB do Giratina:", err);
    });

    gltfLoader.load('assets/sacerdote.glb?v=3' + Date.now(), (gltf) => {
        const pModel = gltf.scene;
        pModel.scale.set(8, 8, 8); 
        
        // Reduzido de 12 para 6 sacerdotes para salvar draw calls!
        for(let i=0; i<6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.sin(angle) * 45;
            const z = Math.cos(angle) * 45;

            const pClone = pModel.clone();
            
            // Criamos um grupo para podermos rotacionar o modelo sem conflitar com o lookAt
            const wrapper = new THREE.Group();
            wrapper.position.set(x, 8, z); // Y=8 para os pés ficarem no chão (modelo tem pivot no centro)
            wrapper.lookAt(0, 0, 0);
            
            // O modelo dentro do wrapper pode precisar de um ajuste de rotação (depende da exportação do Meshy AI)
            pClone.position.set(0, 0, 0);
            wrapper.add(pClone);
            
            scene.add(wrapper);
            priests.push(wrapper);
        }
    }, undefined, (err) => {
        console.error("Erro ao carregar o Sacerdote:", err);
    });

    window.addEventListener('resize', onWindowResize, false);
    clock.start();
    
    startRitualAnimation();
    animate();
}

function startRitualAnimation() {
    earthquakeActive = false;
    
    torchesLights.forEach(light => {
        gsap.to(light, {
            intensity: "random(1.2, 2.0)",
            distance: "random(140, 160)",
            duration: "random(0.3, 0.6)",
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    });

    // Câmera avança em direção ao centro num longo corredor
    gsap.to(camera.position, {
        z: 90, 
        y: 15, // Mantém a altura da pessoa
        duration: 22, // Demora 22 segundos caminhando no corredor
        ease: "power2.inOut",
        onComplete: triggerAwakening
    });

    // Movimento de "passos" (head bobbing)
    gsap.to(camera.position, {
        y: 18, // Pula de 15 pra 18 pra simular o passo forte
        duration: 0.5,
        repeat: 44, 
        yoyo: true,
        ease: "sine.inOut"
    });
}

function triggerAwakening() {
    earthquakeActive = true;
    
    // Círculo mágico
    gsap.to(magicCircleGroup.scale, {
        x: 1, y: 1, z: 1,
        duration: 3,
        ease: "elastic.out(1, 0.5)"
    });

    gsap.to(ui, { opacity: 1, duration: 3, delay: 3 });
    
    // Giratina SOBE ATRAVESSANDO o portal (clipping revela conforme sobe)
    gsap.to(giratinaGroup.position, {
        y: 50, // Sobe de -30 até 50
        duration: 8,
        delay: 2,
        ease: "power2.out",
        onComplete: () => {
            gsap.to(giratinaGroup.position, {
                y: 55,
                duration: 4,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        }
    });

    // Câmera recua ANDANDO (não flutuando)
    gsap.to(camera.position, {
        z: 180,
        duration: 8,
        ease: "power3.out"
    });
    // Head bobbing durante a recuada
    gsap.to(camera.position, {
        y: 18,
        duration: 0.5,
        repeat: 16,
        yoyo: true,
        ease: "sine.inOut"
    });

    // Câmera foca no meio do Giratina para não cortar as pontas
    gsap.to(lookAtTarget, {
        y: 60, 
        duration: 8,
        ease: "power3.out"
    });

    // Luz principal explode
    const altarLight = scene.children.find(c => c.type === "PointLight" && c.color.r === 1 && c.color.g === 0);
    if(altarLight) {
        gsap.to(altarLight, {
            intensity: 30,
            distance: 400,
            duration: 4,
            yoyo: true,
            repeat: 1
        });
    }

    debris.forEach(rock => {
        rock.visible = true;
        rock.position.y += Math.random() * 50; 
    });
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    if (!isRitualActive) return;
    animationId = requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();

    if (earthquakeActive) {
        camera.position.x = (Math.random() - 0.5) * 1.5; // Terremoto forte
        
        if(magicCircleGroup) {
            magicCircleGroup.rotation.z += 0.08; // Roda rápido
        }

        debris.forEach(rock => {
            if(rock.visible) {
                rock.userData.velocity += rock.userData.gravity;
                rock.position.y -= rock.userData.velocity;
                rock.rotation.x += rock.userData.rotSpeed;
                rock.rotation.y += rock.userData.rotSpeed;

                if(rock.position.y < 0) {
                    rock.position.y = 150 + Math.random() * 50;
                    rock.userData.velocity = 0;
                    rock.position.x = (Math.random() - 0.5) * 200;
                    rock.position.z = (Math.random() - 0.5) * 200;
                }
            }
        });
    }

    // Animação dos sacerdotes rezando (curvando-se ritmicamente)
    priests.forEach((priest, index) => {
        const offset = time * 2 + index * 0.5;
        // O corpo balança pra frente e pra trás (rezando)
        priest.children[0].rotation.x = 0.2 + Math.sin(offset) * 0.15;
    });

    if (giratinaGroup && giratinaGroup.position.y > -5) {
        giratinaGroup.rotation.y = Math.sin(time * 0.5) * 0.15;
    }

    camera.lookAt(lookAtTarget);
    renderer.render(scene, camera);
}
