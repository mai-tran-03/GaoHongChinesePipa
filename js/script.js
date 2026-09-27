const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2hlcKXwBpTq8s_I0tUPdOeF-BFSnXEWEvb1H05A83_8_voW3zQFjY3XozE5H35WeszxCe658UBD9T/pub?gid=0&single=true&output=csv";

function getTagClass(tagText) {
    const tag = tagText.toLowerCase().trim();
    if (tag.includes("performance") || tag.includes("concert")) return "concert-tag";
    if (tag.includes("lecture") || tag.includes("speaker")) return "lecture-tag";
    if (tag.includes("premiere")) return "premiere-tag";
    if (tag.includes("virtual")) return "virtual-tag";
    if (tag.includes("collab")) return "collab-tag";
    if (tag.includes("award")) return "award-tag";
    if (tag.includes("international")) return "international-tag";
    return "flagship-tag";
}

function parseCSV(csvText) {
    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;

    for (let index = 0; index < csvText.length; index += 1) {
        const character = csvText[index];
        const nextCharacter = csvText[index + 1];

        if (character === '"') {
            if (insideQuotes && nextCharacter === '"') {
                field += '"';
                index += 1;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (character === "," && !insideQuotes) {
            row.push(field);
            field = "";
        } else if ((character === "\n" || character === "\r") && !insideQuotes) {
            if (character === "\r" && nextCharacter === "\n") index += 1;
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += character;
        }
    }

    if (field || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
}

async function loadCalendarFromSheets() {
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error(`Spreadsheet request failed: ${response.status}`);

        const csvText = await response.text();
        const rows = parseCSV(csvText);
        const headers = rows[0].map(header => header.trim().toLowerCase());
        const dataRows = rows.slice(1);
        const requiredHeaders = ["day", "month", "year", "title", "tag", "time", "description", "location"];
        const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
        if (missingHeaders.length > 0) {
            throw new Error(`Spreadsheet is missing headers: ${missingHeaders.join(", ")}`);
        }

        const getCell = (row, header) => (row[headers.indexOf(header)] || "").trim();

        let currentMonthGroup = "";
        let htmlOutput = "";

        dataRows.forEach(row => {
            if (row.length < headers.length || !row[0]) return;

            const day = getCell(row, "day");
            const month = getCell(row, "month");
            const year = getCell(row, "year");
            const title = getCell(row, "title");
            const tagText = getCell(row, "tag");
            const timeText = getCell(row, "time");
            const description = getCell(row, "description");
            const location = getCell(row, "location");

            const monthYearHeader = `${month} ${year}`;
            if (currentMonthGroup !== monthYearHeader) {
                if (currentMonthGroup !== "") htmlOutput += `</div>`;
                currentMonthGroup = monthYearHeader;
                htmlOutput += `
            <div class="month-group">
                <h3 class="month-header">${monthYearHeader}</h3>
            `;
            }

            const tagCSS = getTagClass(tagText);
            htmlOutput += `
            <div class="calendar-card">
            <div class="card-date-badge">
                <span class="day">${day}</span>
                <span class="month">${month}</span>
            </div>
            <div class="card-details">
                <div class="event-meta">
                <span class="event-tag ${tagCSS}">${tagText}</span>
                <span class="event-time">${timeText}</span>
                </div>
                <h4 class="event-name">${title}</h4>
                <p class="event-desc">${description}</p>
                ${location ? `<span class="event-location">📍 ${location}</span>` : ''}
            </div>
            </div>
            `;
        });

        if (htmlOutput !== "") htmlOutput += `</div>`;

        // Inject all elements directly onto the live web layout canvas
        document.getElementById("dynamic-calendar-target").innerHTML = htmlOutput;

    } catch (error) {
        console.error("Error loading events spreadsheet script:", error);
        document.getElementById("dynamic-calendar-target").innerHTML = "<p>Error loading current calendar items.</p>";
    }
}

// Run the script automatically when the page finishes loading
document.addEventListener("DOMContentLoaded", loadCalendarFromSheets);
