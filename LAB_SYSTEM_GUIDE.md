# Lab Management System - Implementation Guide

## Overview
Password-protected lab management system for Julia Barichello to view, organize, and analyze health lab results with interactive charts.

**Credentials:**
- Username: `Julia Barichello`
- Password: `Turtle`

## Lab Files Location
All lab files are stored in `/labs/` directory (72 total files)

## Lab Format Types

### 1. MyChart Single-Date Format (Older Labs)
**Identification:**
- Files WITHOUT "(3)" or with numbers (1), (2)
- Created before Sept 2024
- Examples: `CMP.pdf`, `B12.pdf`, `CBC_Auto_Diff.pdf`

**Characteristics:**
- Title: Test name at top (e.g., "COMPREHENSIVE METABOLIC PANEL")
- Date line: "Collected on November 29, 2023 9:06 AM"
- Visual design with colored bar charts
- Boxed values with normal range indicators
- Each test shows:
  - Test name
  - Normal range: X - Y unit
  - [VALUE in box]
  - Green/yellow bar visualization

**Parsing Strategy:**
```
Pattern to extract:
Test Name
Normal range: X - Y unit
[VALUE]

Date extraction: "Collected on [date]"
Single date per file
```

### 2. Follow My Health Format (Newer Labs)
**Identification:**
- Files with "(3)" and onwards: `CMP(3).pdf`, `B12(4).pdf`, `CMP(5).pdf`
- Created Sept 2024 onwards
- Contains "Collection Date:" in header

**Characteristics:**
- Title: "COMPREHENSIVE METABOLIC PANEL (CMP) *"
- Date line: "Collection Date: 09/12/2024 08:43:00"
- Clinical table format
- Columns: NAME | VALUE | REFERENCE RANGE
- Abnormal values marked with "H" (high) or "L" (low)
- Example row: `F  GLUCOSE  113 H  65-110 (MG/DL)`

**Parsing Strategy:**
```
Table structure:
F  TEST_NAME  VALUE  REFERENCE_RANGE

Date extraction: "Collection Date: MM/DD/YYYY HH:MM:SS"
Detect H/L markers for abnormal values
Single date per file
```

### 3. MyChart Period Format (Historical Multi-Date)
**Identification:**
- Files containing "_all" in filename
- Examples:
  - `CBC W Auto Differential_MyChart_all_18_22.pdf`
  - `Comprehensive Metabolic Panel_MyChart_all_18_22.pdf`

**Characteristics:**
- Title: "TEST NAME - Past Results"
- Multi-column table with dates as column headers
- Contains historical data from 2018-2022 (PRE-DIET BASELINE)
- Header row: `Name | Standard Range | 1/29/18 | 10/18/19 | 5/26/20 | 6/17/22`
- Data rows: `Test Name | X - Y unit | value1 | value2 | value3 | value4`
- Values can have "H" (high) or "L" (low) markers
- Multiple dates per file

**Parsing Strategy:**
```
Table structure:
Name              Standard Range    Date1    Date2    Date3    Date4
Hemoglobin        See Comment g/dL  12.9 L   12.9 L   13.0     14.3
WBC               4.0 - 10.0        12.8 H   9.9      10.1 H   9.3

Extract:
1. Date columns from header row
2. Each test name + standard range
3. Values for each date
4. H/L markers
5. Multiple data points per test
```

**CRITICAL NOTE:** Period labs contain baseline health data from BEFORE the diet started (2018-2022). Essential for before/after comparisons.

### 4. Chart Labs (JPG Images)
**Files:**
- `Lab_Agnela_1.jpg`
- `Lab_Angela_2.jpg`

**Characteristics:**
- Photos of printed flowsheets
- Multiple date columns (e.g., "3/16/2023 | 3/16/2023")
- Two main sections:
  - CBC (Hemoglobin, Hematocrit, RBC, WBC, etc.)
  - Routine chemistries & enzymes (Sodium, Potassium, Glucose, etc.)
- Requires OCR (Tesseract.js)

**Parsing Strategy:**
```
1. Apply Tesseract.js OCR
2. Detect sections: CBC, Routine chemistries
3. Extract table: Test name | Value | Value | ...
4. Parse dates from column headers
5. Handle handwritten/printed variations
```

## Lab Value Categories

### Comprehensive Metabolic Panel (CMP)
- Sodium, Potassium, Chloride, CO2
- BUN (Blood Urea Nitrogen), Creatinine, eGFR
- Glucose
- Calcium, Total Protein, Albumin, Globulin
- AST, ALT, Alkaline Phosphatase
- Total Bilirubin
- Anion Gap, BUN/Creatinine Ratio

### Complete Blood Count (CBC)
- Hemoglobin, Hematocrit
- RBC, WBC, Platelets
- MCV, MCH, MCHC
- RDW-CV, RDW-SD, MPV
- Differential counts:
  - Neutrophils (Absolute/Relative)
  - Lymphocytes (Absolute/Relative)
  - Monocytes (Absolute/Relative)
  - Eosinophils (Absolute/Relative)
  - Basophils (Absolute/Relative)

### Other Labs
- B12, B6, Folate
- Ferritin
- C-Reactive Protein (CRP)
- Blood Differential
- Bone Density

## Chart Types to Implement

### 1. Timeline View
- Chronological display of all labs
- Combines period labs (2018-2022) + single-date labs (2023-2025)
- Shows complete health history

### 2. Marker Trend Charts
- Single marker over time (e.g., Glucose from 2018 to present)
- Includes all data points from period labs + individual labs
- Visualizes diet impact (pre-2023 vs post-diet)
- Reference range zones (green = normal, yellow = borderline, red = abnormal)

### 3. Panel Comparison Charts
- Full CMP panel: All metabolic markers on one chart
- Full CBC panel: All blood count markers on one chart
- Multi-line chart with legend
- Toggle individual markers on/off

### 4. Before/After Comparison
- Period labs (2018-2022 baseline) vs Recent labs (2023-2025)
- Side-by-side or overlay comparison
- Highlight improvements/changes since diet started
- Statistical summary (avg pre-diet vs avg post-diet)

## Time Filtering Options

1. **All Time** - Includes 2018-2022 period data
2. **Last Year** - 2024-2025
3. **Last 6 Months**
4. **Last 3 Months**
5. **Custom Date Range** - User selects start/end
6. **Pre-Diet vs Post-Diet Toggle** - Compare baseline to current

## Technical Stack

### Libraries (via CDN)
1. **Chart.js (v4)** - Interactive charts
   ```html
   <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
   ```

2. **PDF.js** - PDF text extraction
   ```html
   <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3/build/pdf.min.js"></script>
   ```

3. **Tesseract.js** - OCR for JPG images
   ```html
   <script src="https://cdn.jsdelivr.net/npm/tesseract.js@4"></script>
   ```

### Authentication
- Client-side only (sessionStorage)
- Hardcoded credentials (acceptable for personal use)
- Session persists until browser tab closes
- Logout clears session

## File Structure

```
/
├── labs.html                 (new - main lab page)
├── labs-auth.js              (new - authentication)
├── labs-parser.js            (new - PDF/OCR parsing)
├── labs-charts.js            (new - Chart.js visualizations)
├── labs.css                  (new - styling)
├── labs/                     (existing - 72 files)
│   ├── labs_data.json        (new - extracted lab data cache)
│   ├── Lab_Agnela_1.jpg      (existing - chart lab)
│   ├── Lab_Angela_2.jpg      (existing - chart lab)
│   ├── CMP.pdf               (existing - MyChart format)
│   ├── CMP(3).pdf            (existing - Follow My Health format)
│   ├── CBC W Auto Differential_MyChart_all_18_22.pdf  (existing - Period format)
│   └── [69 other lab PDFs]   (existing)
└── [all other dashboard files]
```

## Implementation Steps

### Phase 1: Core Infrastructure
1. Create `labs.html` with login screen + protected content area
2. Create `labs-auth.js` for authentication
3. Create `labs.css` matching existing design system
4. Add "Labs" link to all navigation menus

### Phase 2: Lab Detection & Parsing
5. Create `labs-parser.js` with 4 format parsers:
   - MyChart Single-Date Parser
   - Follow My Health Parser
   - MyChart Period Parser (multi-date)
   - Chart Labs OCR Parser
6. Implement file detection (scan `/labs/` directory)
7. Create `labs_data.json` structure

### Phase 3: Visualization
8. Create `labs-charts.js` for Chart.js
9. Implement chart types:
   - Timeline view
   - Marker trends
   - Panel comparisons
   - Before/after analysis
10. Add time filtering controls

### Phase 4: UI/UX
11. Lab list view (grid of cards)
12. Lab detail view (PDF viewer + extracted data)
13. Chart view (interactive visualizations)
14. Mobile responsive design

### Phase 5: Testing
15. Test authentication flow
16. Test all 4 parsing formats
17. Test chart rendering
18. Test time filtering
19. Test on mobile devices

## Key Features

### Lab List View
- Grid of lab cards
- Each card shows:
  - Lab date
  - Lab type (CMP, CBC, B12, etc.)
  - Period badge if "_all" file
  - Key extracted values
  - Thumbnail preview
- Sort: newest first, oldest first, by type
- Filter: by lab type, date range, abnormal values
- Search: by test name or date

### Lab Detail View
- Full PDF/JPG viewer embedded
- Extracted values table (editable)
- Manual correction option
- Save to `labs_data.json`
- Link to chart view for this lab
- Download original file

### Chart View
- Interactive Chart.js charts
- Hover tooltips with values
- Legend with toggle on/off
- Export chart as PNG
- Print-friendly view
- Zoom/pan controls

## Data Storage Format

### labs_data.json Structure
```json
{
  "version": "1.0",
  "lastUpdated": "2025-12-13T17:00:00Z",
  "labs": [
    {
      "id": "cmp-2023-11-29",
      "filename": "CMP.pdf",
      "format": "mychart-single",
      "labType": "CMP",
      "collectionDate": "2023-11-29T09:06:00",
      "isPeriodLab": false,
      "values": {
        "Sodium": { "value": 138, "unit": "mmol/L", "range": "134 - 145", "status": "normal" },
        "Potassium": { "value": 4.6, "unit": "mmol/L", "range": "3.5 - 5.1", "status": "normal" },
        "Glucose": { "value": 92, "unit": "mg/dL", "range": "75 - 99", "status": "normal" }
      }
    },
    {
      "id": "cbc-all-18-22",
      "filename": "CBC W Auto Differential_MyChart_all_18_22.pdf",
      "format": "mychart-period",
      "labType": "CBC",
      "isPeriodLab": true,
      "dates": ["2018-01-29", "2019-10-18", "2020-05-26", "2022-06-17"],
      "values": {
        "Hemoglobin": {
          "unit": "g/dL",
          "range": "See Comment",
          "dataPoints": [
            { "date": "2018-01-29", "value": 12.9, "status": "low" },
            { "date": "2019-10-18", "value": 12.9, "status": "low" },
            { "date": "2020-05-26", "value": 13.0, "status": "normal" },
            { "date": "2022-06-17", "value": 14.3, "status": "normal" }
          ]
        }
      }
    }
  ]
}
```

## Design System Integration

### Colors (Match Existing)
- Primary: `#667eea`
- Secondary: `#764ba2`
- Accent: `#f093fb`
- Success: `#4CAF50` (normal values)
- Warning: `#ff9800` (borderline values)
- Danger: `#f44336` (abnormal values)

### Cards
- Use existing `.metric-card`, `.chart-container` classes
- Add new `.lab-card` with same styling
- Gradient backgrounds for headers
- Box shadows and hover effects

### Typography
- Match existing font stack: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- Consistent heading sizes (h1: 2.5rem, h4: 1.5rem, etc.)

## Security Considerations

- Client-side authentication only (acceptable for personal project)
- Credentials hardcoded in `labs-auth.js`
- No backend - all processing in browser
- Lab files in GitHub repo (keep repo private)
- HTTPS via GitHub Pages
- Can upgrade to proper backend (Firebase, Supabase) later if needed

## Future Enhancements

1. **Cloud Storage** - Move to Firebase/Supabase for proper storage
2. **Lab Upload** - Drag-and-drop new lab files
3. **Email Integration** - Auto-import labs from email
4. **Trend Analysis** - ML-powered insights
5. **Notifications** - Alert for abnormal values
6. **Anthropometric Correlation** - Compare labs with weight/BMI data
7. **Multi-User** - Support for multiple users
8. **Encrypted Storage** - Client-side encryption for sensitive data
9. **Export** - PDF reports, CSV downloads
10. **Print** - Print-friendly lab summaries

## Notes

- Period labs (files with "_all") are CRITICAL - they contain pre-diet baseline data from 2018-2022
- Before/after comparisons will show health improvements since starting diet
- All parsing happens client-side (no server required)
- Extracted data cached in `labs_data.json` for faster loading
- Manual correction option for OCR errors
- Mobile-first responsive design

## Testing Checklist

- [ ] Login with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Session persists on page reload
- [ ] Logout clears session
- [ ] All 72 lab files detected
- [ ] MyChart format parsed correctly
- [ ] Follow My Health format parsed correctly
- [ ] Period format (multi-date) parsed correctly
- [ ] JPG OCR extracts values
- [ ] Charts render with sample data
- [ ] Time filtering works
- [ ] Before/after comparison shows difference
- [ ] Mobile responsive (iPhone, Android)
- [ ] PDF viewer works
- [ ] Values editable and save to JSON
- [ ] Navigation links work on all pages

---

**Created:** 2025-12-13
**For:** Julia Barichello Lab Management System
**Project:** Antropometria Dashboard
