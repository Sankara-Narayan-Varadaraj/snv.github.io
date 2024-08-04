document.addEventListener('DOMContentLoaded', function() {
    loadProjects();
});

async function loadProjects() {
    const response = await fetch('path_to_your_projects_excel_file.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });

    const content = document.getElementById('projects-content');
    content.innerHTML = '<div class="projects-title">PROJECTS</div>';

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Assuming the first row contains headers
        const headers = json[0];
        const projectNameIndex = headers.indexOf('Project name');
        const projectDetailsIndex = headers.indexOf('Project details');
        const modelIndex = headers.indexOf('model');

        let currentProject = json[1][projectNameIndex]; // Get the project name from the second row
        let currentDetails = [];
        let modelRequired = false;

        for (let i = 1; i < json.length; i++) {
            const row = json[i];
            const detail = row[projectDetailsIndex];
            const model = row[modelIndex];
            if (detail) {
                currentDetails.push(detail);
            }
            if (model && model.toLowerCase() === 'yes') {
                modelRequired = true;
            }
        }

        addProjectDetails(content, currentProject, currentDetails, modelRequired);
    });
}

function addProjectDetails(content, project, details, modelRequired) {
    const projectContainerDiv = document.createElement('div');
    projectContainerDiv.className = 'project-container';
    projectContainerDiv.innerHTML = `
        <div class="left-section">
            <div class="project-name">${project}</div>
            <div class="details"><ul>${details.map(detail => `<li>${detail}</li>`).join('')}</ul></div>
        </div>
        <div class="slideshow-container" id="slideshow-${project}">
            <!-- Slideshow content will be dynamically inserted here -->
        </div>
        ${modelRequired ? `<div class="model-container" id="model-container-${project}">
            <canvas class="model" id="model-${project}"></canvas>
        </div>` : ''}
    `;

    content.appendChild(projectContainerDiv);

    loadSlideshow(project);
    if (modelRequired) {
        loadModel(project);
    }
}

async function loadSlideshow(project) {
    const slideshowContainer = document.getElementById(`slideshow-${project}`);
    const jsonFilePath = `media/${project.replace(/ /g, '_').toLowerCase()}.json`; // Generate JSON file path

    try {
        const response = await fetch(jsonFilePath);
        const json = await response.json();
        const files = json.media;

        files.forEach((file, index) => {
            let mediaElement;
            if (file.endsWith('.mp4')) {
                mediaElement = document.createElement('video');
                mediaElement.src = `${jsonFilePath.replace('.json', '')}/${file}`;
                mediaElement.controls = true;
            } else {
                mediaElement = document.createElement('img');
                mediaElement.src = `${jsonFilePath.replace('.json', '')}/${file}`;
            }
            if (index === 0) {
                mediaElement.classList.add('active');
            }
            slideshowContainer.appendChild(mediaElement);
        });

        // Set up the slideshow logic
        let currentIndex = 0;
        setInterval(() => {
            const activeElement = slideshowContainer.querySelector('.active');
            if (activeElement) {
                activeElement.classList.remove('active');
            }
            currentIndex = (currentIndex + 1) % files.length;
            slideshowContainer.children[currentIndex].classList.add('active');
        }, 5000); // Change slide every 5 seconds
    } catch (error) {
        console.error('Error loading slideshow:', error);
    }
}

async function loadModel(project) {
    const modelContainer = document.getElementById(`model-container-${project}`);
    const canvas = document.getElementById(`model-${project}`);
    const width = modelContainer.clientWidth;
    const height = modelContainer.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    const gltfLoader = new THREE.GLTFLoader();
    const modelPath = `models/${project.replace(/ /g, '_').toLowerCase()}.gltf`;

    gltfLoader.load(modelPath, function(gltf) {
        scene.add(gltf.scene);
        camera.position.z = 5;
        animate();
        
        function animate() {
            requestAnimationFrame(animate);
            gltf.scene.rotation.y += 0.01; // Rotate the model for a better view
            renderer.render(scene, camera);
        }
    }, undefined, function(error) {
        console.error('Error loading model:', error);
    });
}
