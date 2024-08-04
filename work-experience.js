document.addEventListener('DOMContentLoaded', function() {
    loadWorkExperience();
});

async function loadWorkExperience() {
    const response = await fetch('./Work_Experience/WE.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });

    const content = document.getElementById('work-experience-content');
    content.innerHTML = '<div class="work-experience-title">WORK EXPERIENCE</div>';

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let currentCompany = json[0][3]; // Get the company name from the first row, fourth column
        let currentRole = null;
        let currentPeriod = null;
        let currentDetails = [];
        let firstRoleDisplayed = false;

        for (let i = 1; i < json.length; i++) {
            const row = json[i];
            const role = row[0];
            const detail = row[1];
            const period = row[2];

            if (role && period) {
                if (currentRole) {
                    // Add previous role details to content
                    addJobDetails(content, currentCompany, currentRole, currentPeriod, currentDetails, firstRoleDisplayed);
                    firstRoleDisplayed = true;
                }
                // Reset for new role
                currentRole = role;
                currentPeriod = period;
                currentDetails = detail ? [detail] : [];
            } else if (detail) {
                // Add detail to current role
                currentDetails.push(detail);
            } else if (!detail && currentDetails.length > 0) {
                // If we hit a blank row and have accumulated details, finalize current role
                addJobDetails(content, currentCompany, currentRole, currentPeriod, currentDetails, firstRoleDisplayed);
                currentRole = null;
                currentPeriod = null;
                currentDetails = [];
                firstRoleDisplayed = true;
            }
        }
        // Add the last role details if any
        if (currentRole) {
            addJobDetails(content, currentCompany, currentRole, currentPeriod, currentDetails, firstRoleDisplayed);
        }
    });
}

function addJobDetails(content, company, role, period, details, firstRoleDisplayed) {
    const workDetailDiv = document.createElement('div');
    workDetailDiv.className = 'work-details';
    workDetailDiv.innerHTML = `
        <div>${role}</div>
        <div class="details"><ul>${details.map(detail => `<li>${detail}</li>`).join('')}</ul></div>
        <div>${period}</div>
    `;

    const companyDiv = document.createElement('div');
    if (!firstRoleDisplayed) {
        companyDiv.innerHTML = `<h1 class="company-name">${company}</h1>`;
    } else {
        companyDiv.className = 'spacer';
    }
    companyDiv.appendChild(workDetailDiv);

    content.appendChild(companyDiv);
}
