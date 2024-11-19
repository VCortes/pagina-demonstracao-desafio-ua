$(document).ready(function () {
    let userProjectData = {};
    let userProjectSections = [];
    let sections = [];
    let userProjectCriteria = [];
    let userProjectGrade = {};
    let userProjects = [];

    // Função para carregar os projetos no seletor
    function populateProjectSelect() {
        // Ordenar alfabeticamente pelo título dos projetos
        userProjects.sort((a, b) => a.title.localeCompare(b.title));

        const selectElement = $('#user_project_id');
        selectElement.empty();
        selectElement.append('<option value="" selected disabled>Selecione um projeto</option>');

        userProjects.forEach(project => {
            selectElement.append(`<option value="${project.id}">${project.title}</option>`);
        });
    }

    // Carregando os dados dos projetos ao iniciar a página
    fetchCSV('user_project.csv')
        .then(data => {
            userProjects = data;
            populateProjectSelect();
        })
        .catch(error => {
            console.error('Erro ao carregar os projetos:', error);
        });

    $('#load-button').on('click', function () {
        const userProjectId = $('#user_project_id').val();
        if (userProjectId) {
            Promise.all([
                fetchCSV('user_project.csv'),
                fetchCSV('user_project_section.csv'),
                fetchCSV('user_project_criteria.csv'),
                fetchCSV('section.csv'),
                fetchCSV('user_project_grade.csv')
            ]).then(([userProjectDataArray, userProjectSectionsData, userProjectCriteriaData, sectionsData, userProjectGradeData]) => {
                processData(userProjectId, userProjectDataArray, userProjectSectionsData, userProjectCriteriaData, sectionsData, userProjectGradeData);
                displayData();
            }).catch(error => {
                console.error('Erro ao ler os arquivos:', error);
            });
        } else {
            alert('Por favor, selecione um projeto.');
        }
    });

    function fetchCSV(fileName) {
        return fetch(fileName)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar ' + fileName);
                }
                return response.text();
            })
            .then(csvText => {
                return new Promise((resolve, reject) => {
                    Papa.parse(csvText, {
                        header: true,
                        skipEmptyLines: true,
                        complete: results => resolve(results.data),
                        error: error => reject(error)
                    });
                });
            });
    }

    function processData(userProjectId, userProjectDataArray, userProjectSectionsData, userProjectCriteriaData, sectionsData, userProjectGradeData) {
        userProjectData = userProjectDataArray.find(up => up.id === userProjectId);
        if (!userProjectData) {
            alert('Projeto não encontrado para o ID fornecido.');
            return;
        }
        userProjectSections = userProjectSectionsData.filter(ups => ups.user_project_id === userProjectId);
        userProjectCriteria = userProjectCriteriaData.filter(upc => upc.user_project_id === userProjectId);
        sections = sectionsData;
        userProjectGrade = userProjectGradeData.find(upg => upg.id === userProjectId) || {};
    }

    function displayData() {
        if (!userProjectData) return;
        $('#project-title').text(userProjectData.title || 'Título do Projeto');
        const projectContent = $('#project-content').empty();
        const sectionsMap = {};
        sections.forEach(section => {
            sectionsMap[section.id] = section;
        });
        userProjectSections.sort((a, b) => {
            const seqA = parseInt(sectionsMap[a.section_id]?.sequence || 0);
            const seqB = parseInt(sectionsMap[b.section_id]?.sequence || 0);
            return seqA - seqB;
        });
        userProjectSections.forEach(userSection => {
            const section = sectionsMap[userSection.section_id];
            const sectionCard = $(`
                <div class="section-card card">
                    <div class="card-header">
                        <i class="fas fa-folder-open"></i> ${section?.title || 'Título da Seção'}
                    </div>
                    <div class="card-body">
                        <h5>Enunciado</h5>
                        <p class="description">${section?.description || 'Descrição da Seção'}</p>
                        <h5>Resposta</h5>
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="content flex-grow-1">${userSection.content || 'Conteúdo não disponível.'}</div>
                            <button class="btn btn-link text-decoration-none edit-button"><i class="fas fa-pencil-alt"></i></button>
                        </div>
                    </div>
                </div>
            `);
            sectionCard.find('.edit-button').on('click', () => {
                openEditModal(userSection, sectionCard.find('.content'));
            });
            projectContent.append(sectionCard);
        });

        // Exibindo a nota e o feedback geral
        if (userProjectGrade.feedback || userProjectGrade.grade) {
            const gradeCard = $(`
                <div class="card my-4">
                    <div class="card-body">
                        ${userProjectGrade.grade ? `<h5 class="card-title"><i class="fas fa-star"></i> Nota Geral: ${parseFloat(userProjectGrade.grade).toFixed(1)}</h5>` : ''}
                        ${userProjectGrade.feedback ? `<p><strong>Feedback Geral:</strong> ${userProjectGrade.feedback}</p>` : ''}
                    </div>
                </div>
            `);
            projectContent.append(gradeCard);
        }

        // Exibindo a nota e o feedback do projeto
        if (userProjectData.feedback || userProjectData.grade) {
            const projectGradeCard = $(`
                <div class="card my-4">
                    <div class="card-body">
                        ${userProjectData.grade ? `<h5 class="card-title"><i class="fas fa-star"></i> Nota do Projeto: ${parseFloat(userProjectData.grade).toFixed(1)}</h5>` : ''}
                        ${userProjectData.feedback ? `<p><strong>Feedback do Projeto:</strong> ${userProjectData.feedback}</p>` : ''}
                    </div>
                </div>
            `);
            projectContent.append(projectGradeCard);
        }

        // Exibindo os critérios de avaliação
        if (userProjectCriteria.length > 0) {
            const criteriaTitle = $('<h2 class="mt-5">Critérios de Avaliação</h2>');
            projectContent.append(criteriaTitle);
            userProjectCriteria.forEach(criteria => {
                const criteriaCard = $(`
                    <div class="criteria-card card">
                        <div class="card-header">
                            <i class="fas fa-check-circle"></i> ${criteria.criteria_name}
                        </div>
                        <div class="card-body">
                            <p><strong>Nota:</strong> ${parseFloat(criteria.grade).toFixed(1)}</p>
                            <p><strong>Feedback:</strong> ${criteria.feedback}</p>
                        </div>
                    </div>
                `);
                projectContent.append(criteriaCard);
            });
        }
    }

    function openEditModal(userSection, contentElement) {
        const editModal = new bootstrap.Modal($('#editContentModal'));
        $('#editContentTextarea').val(userSection.content || '');
        $('#saveContentButton').off('click').on('click', function () {
            const newContent = $('#editContentTextarea').val();
            userSection.content = newContent;
            contentElement.text(newContent);
            // Enviar atualização para o servidor para atualizar o CSV
            fetch('update_user_project_section.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_project_id: userSection.user_project_id,
                    section_id: userSection.section_id,
                    content: newContent
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Erro ao atualizar o conteúdo no servidor.');
                    }
                    return response.json();
                })
                .then(data => {
                    // Lidar com a resposta do servidor se necessário
                })
                .catch(error => {
                    console.error('Erro:', error);
                });
            editModal.hide();
        });
        editModal.show();
    }
});
