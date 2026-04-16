# Tag Analyzer - Technical Documentation

## Overview
Tag Analyzer is a web-based tool designed to parse and visualize tracking network traffic from HAR files and Google Tag Assistant JSON exports. It focuses on identifying conversion events, user-provided data (UPDE), and potential tracking errors.

## Core Features
- **Dual Format Support**: Accepts `.har` files (exported from browser DevTools) and `.json` files (exported from Tag Assistant).
- **Automated Parameter Extraction**: Automatically extracts key tracking parameters: `ecsid`, `ec_mode`, `em`, `eme`, and `label`.
- **EM/EME Toggle**: Switch the 4th column between `em` and `eme` parameters. All error detection and coloring logic automatically adapt to the selected parameter.
- **Event Classification**: Categorizes requests based on URL patterns and Tag Assistant metadata.
- **Error Detection**: Identifies and highlights tracking errors based on parameter values and HTTP status.
- **Advanced Filtering**: Column-specific filters with support for standard text matching and Regular Expressions (Regex).
- **Data Export**: Export filtered results to a CSV file for external analysis.
- **Visual Grouping**: Consistent color coding for session IDs and event types to facilitate rapid scanning.
- **GitHub Pages Deployment**: Automated workflow to build and deploy the application to GitHub Pages.

## Business Policy Logic
The application centralizes its core rules in a `BusinessPolicy` object to ensure consistency across the UI and data processing layers.

### 1. Event Type Classification
- **Conversion**: Triggered if the URL includes `/pagead/conversion` or `/viewthroughconversion`, or if the Tag Assistant hit title includes "Conversion".
- **UPDE (User Provided Data)**: Triggered if the URL includes `/ccm/form-data` or `/pagead/form-data`, or if the Tag Assistant hit title includes "User provided data".
- **Other**: Default category for all other requests.

### 2. Error Detection
A request is marked as an "Error" if any of the following conditions are met:
- **EM Error**: The `em` (or `eme`) parameter value is exactly `tv.1`, `tv.1~`, or matches the pattern `/^tv\.1~e[0-9]/`.
- **HTTP Error**: The response status code is outside the "OK" range (specifically `< 200` or `>= 400`).

### 3. Default Application State
- **Initial Filter**: The "Event Type" filter defaults to `Conversion|UPDE`.
- **Regex Mode**: Enabled by default for the Event Type filter.
- **Sorting**: Requests are sorted in **descending order** by sequence number (newest first).

## UI & Visual Language

### Table Columns (Order)
1. **Seq**: Sequence number.
2. **ecsid**: Enhanced Conversion Session ID.
3. **ec_mode**: Enhanced Conversion Mode.
4. **EM/EME Value**: Enhanced Measurement value (Toggleable). Limited width with truncation and hover tooltips.
5. **Label**: Conversion label.
6. **Event Type**: Classification (Conversion/UPDE/other).
7. **Error**: Description of the detected error.
8. **Method**: HTTP method (GET/POST).
9. **URL**: Full request URL.
10. **Status**: HTTP response status.
11. **Time**: Request duration.

### Color Coding
- **Row Highlighting**: Rows meeting error conditions are highlighted with a **pink background**.
- **ecsid**: Assigned distinct colors from a cool/neutral palette (Blues, Purples, Indigos, Cyans, Teals, Emeralds, Limes). Reddish/warm colors are explicitly avoided.
- **EM/EME Value**:
    - Errors (`tv.1`, `tv.1~`, or `tv.1~e...`) are shown as **bright red badges** with bold white text.
    - Non-error values use a warm palette (Amber, Orange, Yellow).
- **Label**: Assigned colors from a green/cool palette.
- **ec_mode**: Assigned colors from a violet/indigo palette.
- **Event Type**:
    - **Conversion**: Bold Purple.
    - **UPDE**: Bold Blue.

## Technical Implementation
- **Language**: TypeScript.
- **Testing**: Vitest for unit testing core business logic and parsing.
- **Styling**: Tailwind CSS.
- **Architecture**: Vanilla DOM manipulation within a Vite environment.
- **Parsing**:
    - **HAR**: Standard JSON parsing of the `log.entries` structure.
    - **Tag Assistant**: Custom parser that traverses `data.containers` -> `messages` -> multiple hit locations (`gtagCommandModel`, `ga4CommandModel`, `googleAdsCommandModel`, or direct `hits`) to reconstruct tracking requests with high fidelity.
