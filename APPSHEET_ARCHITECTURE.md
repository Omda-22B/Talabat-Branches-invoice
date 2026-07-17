# Talabat Warehouse QC Dashboard — Complete AppSheet Architecture

> Production-ready specification for Google AppSheet connected to live Google Sheets data.  
> Brand: Talabat · Primary `#FF5A00` · Data: 1,352 PODs · 8,975 invoice lines · 74 stores · 4 3PLs

---

## Table of Contents

1. [Google Sheet Setup](#1-google-sheet-setup)
2. [AppSheet App Creation](#2-appsheet-app-creation)
3. [Tables & Data Structure](#3-tables--data-structure)
4. [Virtual Columns](#4-virtual-columns)
5. [Slices](#5-slices)
6. [App Formulas & Expressions](#6-app-formulas--expressions)
7. [Dashboard Views](#7-dashboard-views)
8. [Chart Configuration](#8-chart-configuration)
9. [Filter / Slicer Setup](#9-filter--slicer-setup)
10. [Navigation & UX](#10-navigation--ux)
11. [Branding & Theme](#11-branding--theme)
12. [Performance Optimizations](#12-performance-optimizations)
13. [Additional KPIs & Insights](#13-additional-kpis--insights)

---

## 1. Google Sheet Setup

### Sheet Name: `POD_Invoice_Data`

Ensure the Google Sheet has **exactly these column headers** in Row 1:

| Col | Header | Type | Notes |
|-----|--------|------|-------|
| A | POD ID | Text | Unique per delivery (e.g. `POD-20260701-105030-424`) |
| B | Ship Date | DateTime | ISO format preferred |
| C | Submitted By | Text | Email address |
| D | Store | Text | Store name (74 unique) |
| E | 3PL | Text | Logistaway / NAQLA / Trella / QC Warehouse Review |
| F | ST Number | Text | e.g. `ST078863` |
| G | Item Number | Number | SKU integer |
| H | Description | Text | Product name |
| I | Remaining Qty | Number | Integer quantity |
| J | Barcode | Text | EAN-13 (store as Text to preserve leading zeros) |
| K | Comment | Text | Free text, may be blank |
| L | Reviewed By | Text | `Warehouse QC` or `3PL` or blank |

### Additional Helper Sheet: `POD_Summary` (AppSheet-computed, read-only)

AppSheet will derive everything from `POD_Invoice_Data`. No need to pre-aggregate.

---

## 2. AppSheet App Creation

### Step-by-Step

1. Open [appsheet.com](https://appsheet.com) → **Make a new app** → **Start with your own data**
2. Connect to **Google Sheets** → select your spreadsheet → select sheet `POD_Invoice_Data`
3. App name: `Talabat WH QC Dashboard`
4. AppSheet will auto-detect columns. Proceed to **Data → Columns** to configure types (see Section 3).

---

## 3. Tables & Data Structure

### Table: `POD_Invoice_Data`

Go to **Data → Tables → POD_Invoice_Data → Columns** and set:

| Column | AppSheet Type | Key? | Formula | Notes |
|--------|--------------|------|---------|-------|
| POD ID | Text | — | — | Row ID (not unique per row; multiple rows per POD) |
| Ship Date | DateTime | — | — | Enable **Show date only** in format |
| Submitted By | Text | — | — | |
| Store | Text | — | — | |
| 3PL | Text | — | — | |
| ST Number | Text | — | — | |
| Item Number | Number | — | — | |
| Description | Text | — | — | |
| Remaining Qty | Number | — | — | |
| Barcode | Text | — | — | Set type to **Text** (not Number) |
| Comment | Text | — | — | |
| Reviewed By | Text | — | — | |
| _RowNumber | Number | ✅ KEY | — | Auto row key — AppSheet auto-creates this |

> **Important:** AppSheet needs a unique row key. Use `_RowNumber` (auto-generated) as the key column.

---

## 4. Virtual Columns

Add these in **Data → Tables → POD_Invoice_Data → Columns → + Add Virtual Column**

### VC-01: `Review_Status`
```
Type: Text
Formula: IF(ISBLANK([Reviewed By]), "Pending", "Reviewed")
```

### VC-02: `Ship_Date_Only`
```
Type: Date
Formula: DATE([Ship Date])
```

### VC-03: `Has_Comment`
```
Type: Yes/No
Formula: NOT(ISBLANK([Comment]))
```

### VC-04: `Submitted_Name`
```
Type: Text
Formula: LEFT([Submitted By], FIND("@", [Submitted By]) - 1)
```
> Extracts `kareem.mostafa` from `kareem.mostafa@talabat.com`

### VC-05: `Is_Today`
```
Type: Yes/No
Formula: ([Ship_Date_Only] = TODAY())
```

### VC-06: `Week_Number`
```
Type: Number
Formula: WEEKNUM([Ship_Date_Only])
```

### VC-07: `Store_Short`
```
Type: Text
Formula: LEFT([Store], 20)
```
> Truncates long store names for chart labels.

---

## 5. Slices

Go to **Data → Slices → + New Slice**

### Slice 1: `Reviewed_PODs`
```
Table: POD_Invoice_Data
Row Filter Condition: NOT(ISBLANK([Reviewed By]))
Columns: All
```

### Slice 2: `Pending_PODs`
```
Table: POD_Invoice_Data
Row Filter Condition: ISBLANK([Reviewed By])
Columns: All
```

### Slice 3: `Today_PODs`
```
Table: POD_Invoice_Data
Row Filter Condition: ([Ship_Date_Only] = TODAY())
Columns: All
```

### Slice 4: `Today_Reviewed`
```
Table: POD_Invoice_Data
Row Filter Condition: AND([Ship_Date_Only] = TODAY(), NOT(ISBLANK([Reviewed By])))
Columns: All
```

### Slice 5: `Today_Pending`
```
Table: POD_Invoice_Data
Row Filter Condition: AND([Ship_Date_Only] = TODAY(), ISBLANK([Reviewed By]))
Columns: All
```

### Slice 6: `Has_Comment_Slice`
```
Table: POD_Invoice_Data
Row Filter Condition: NOT(ISBLANK([Comment]))
Columns: All
```

### Slice 7: `Recent_Activity` (last 7 days)
```
Table: POD_Invoice_Data
Row Filter Condition: ([Ship_Date_Only] >= (TODAY() - 7))
Columns: POD ID, Ship Date, Store, 3PL, Submitted By, Reviewed By, Comment, Review_Status
Sort: Ship Date DESCENDING
```

---

## 6. App Formulas & Expressions

### KPI Expressions (used in Dashboard Cards)

These expressions go into **Dashboard Card** values or **Ref** column formulas.

#### Total PODs
```
COUNTIF(POD_Invoice_Data[POD ID], UNIQUE(POD_Invoice_Data[POD ID]))
```
AppSheet simplified:
```
COUNT(UNIQUE(POD_Invoice_Data[POD ID]))
```

#### Total Invoice Lines
```
COUNT(POD_Invoice_Data[POD ID])
```

#### Total Items Quantity
```
SUM(POD_Invoice_Data[Remaining Qty])
```

#### Reviewed PODs
```
COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], NOT(ISBLANK([Reviewed By])))))
```

#### Pending PODs
```
COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], ISBLANK([Reviewed By]))))
```

#### Review Completion Rate %
```
ROUND(
  COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], NOT(ISBLANK([Reviewed By]))))) /
  COUNT(UNIQUE(POD_Invoice_Data[POD ID])) * 100
, 1)
```

#### PODs Created Today
```
COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], [Ship_Date_Only] = TODAY())))
```

#### Reviewed Today
```
COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], AND([Ship_Date_Only] = TODAY(), NOT(ISBLANK([Reviewed By]))))))
```

#### Pending Today
```
COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], AND([Ship_Date_Only] = TODAY(), ISBLANK([Reviewed By])))))
```

#### Total Stores
```
COUNT(UNIQUE(POD_Invoice_Data[Store]))
```

#### Total 3PL Companies
```
COUNT(UNIQUE(POD_Invoice_Data[3PL]))
```

#### Total Submitted Users
```
COUNT(UNIQUE(POD_Invoice_Data[Submitted By]))
```

#### Average Items per POD
```
ROUND(
  COUNT(POD_Invoice_Data[POD ID]) /
  COUNT(UNIQUE(POD_Invoice_Data[POD ID]))
, 1)
```

#### Average Quantity per POD
```
ROUND(
  SUM(POD_Invoice_Data[Remaining Qty]) /
  COUNT(UNIQUE(POD_Invoice_Data[POD ID]))
, 1)
```

#### PODs with Comments
```
COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], NOT(ISBLANK([Comment])))))
```

---

## 7. Dashboard Views

### How AppSheet Dashboards Work

In AppSheet, go to **Views → + New View → Dashboard**.  
A dashboard is a grid of "panels" — each panel shows another view (chart, deck, table, etc.).

---

### View 1: `Executive_Overview` (Dashboard)

**View Type:** Dashboard  
**Position:** Tab 1 (Home)

#### Panel Layout (3-column grid on tablet/desktop, 1-column on mobile):

```
┌─────────────────┬─────────────────┬─────────────────┐
│  Total PODs     │  Invoice Lines  │  Total Qty      │
│  📦 1,352       │  📄 8,975       │  📊 107,396     │
├─────────────────┼─────────────────┼─────────────────┤
│  Reviewed       │  Pending        │  Review Rate    │
│  ✅ 222         │  ⏳ 1,130       │  🎯 16.4%       │
├─────────────────┼─────────────────┼─────────────────┤
│  Today PODs     │  Reviewed Today │  Pending Today  │
│  📅 live        │  ✅ live        │  ⏳ live        │
├─────────────────┼─────────────────┼─────────────────┤
│  Total Stores   │  Total 3PLs     │  Submitters     │
│  🏪 74          │  🚚 4           │  👤 6           │
├─────────────────┴─────────────────┼─────────────────┤
│  Avg Items/POD                    │  Avg Qty/POD    │
│  📋 6.6                           │  📦 79.4        │
└───────────────────────────────────┴─────────────────┘
```

Each KPI panel is created as a separate **Chart View (Scorecard type)**.

---

### KPI Card Views (create each as a separate view)

#### Card: `KPI_Total_PODs`
```
View Type: Chart
Chart Type: Scorecard
Table: POD_Invoice_Data
Value Expression: COUNT(UNIQUE(POD_Invoice_Data[POD ID]))
Label: "Total PODs"
Icon: package (Material icon)
Color: #FF5A00
```

#### Card: `KPI_Invoice_Lines`
```
Value Expression: COUNT(POD_Invoice_Data[POD ID])
Label: "Invoice Lines"
Icon: description
Color: #FF5A00
```

#### Card: `KPI_Total_Qty`
```
Value Expression: SUM(POD_Invoice_Data[Remaining Qty])
Label: "Total Qty"
Icon: inventory_2
Color: #FF5A00
```

#### Card: `KPI_Reviewed`
```
Value Expression: COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], NOT(ISBLANK([Reviewed By])))))
Label: "Reviewed PODs"
Icon: check_circle
Color: #22C55E
```

#### Card: `KPI_Pending`
```
Value Expression: COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], ISBLANK([Reviewed By]))))
Label: "Pending Review"
Icon: pending
Color: #F59E0B
```

#### Card: `KPI_Review_Rate`
```
Value Expression: ROUND(COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], NOT(ISBLANK([Reviewed By]))))) / COUNT(UNIQUE(POD_Invoice_Data[POD ID])) * 100, 1) & "%"
Label: "Review Rate"
Icon: bar_chart
Color: #FF5A00
```

#### Card: `KPI_Today_PODs`
```
Value Expression: COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], [Ship_Date_Only] = TODAY())))
Label: "PODs Today"
Icon: today
Color: #3B82F6
```

#### Card: `KPI_Reviewed_Today`
```
Value Expression: COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], AND([Ship_Date_Only] = TODAY(), NOT(ISBLANK([Reviewed By]))))))
Label: "Reviewed Today"
Icon: done_all
Color: #22C55E
```

#### Card: `KPI_Pending_Today`
```
Value Expression: COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], AND([Ship_Date_Only] = TODAY(), ISBLANK([Reviewed By])))))
Label: "Pending Today"
Icon: hourglass_empty
Color: #F59E0B
```

---

### View 2: `Daily_POD_Trend` (Line Chart)
```
View Type: Chart
Chart Type: Line
Table: POD_Invoice_Data
Group By: Ship_Date_Only
Aggregate: COUNT(UNIQUE([POD ID]))
Label: "Daily POD Trend"
X-Axis: Ship_Date_Only
Y-Axis: Count of PODs
Color: #FF5A00
Line Smoothing: ON
Show Points: ON
```

### View 3: `Daily_Qty_Trend` (Line Chart)
```
View Type: Chart
Chart Type: Line
Table: POD_Invoice_Data
Group By: Ship_Date_Only
Aggregate: SUM([Remaining Qty])
Label: "Daily Items Quantity Trend"
X-Axis: Ship_Date_Only
Y-Axis: Total Remaining Qty
Color: #FF8C42
```

### View 4: `Reviewed_vs_Pending` (Donut)
```
View Type: Chart
Chart Type: Donut
Table: POD_Invoice_Data
Group By: Review_Status
Aggregate: COUNT(UNIQUE([POD ID]))
Label: "Reviewed vs Pending"
Colors: Reviewed=#22C55E, Pending=#F59E0B
Show Legend: ON
Show Labels: ON (with %)
```

### View 5: `PODs_by_Store` (Horizontal Bar)
```
View Type: Chart
Chart Type: Bar (Horizontal)
Table: POD_Invoice_Data
Group By: Store
Aggregate: COUNT(UNIQUE([POD ID]))
Sort: Descending
Max Groups: 20
Label: "PODs by Store"
Color: #FF5A00
```

### View 6: `PODs_by_3PL` (Bar Chart)
```
View Type: Chart
Chart Type: Bar
Table: POD_Invoice_Data
Group By: 3PL
Aggregate: COUNT(UNIQUE([POD ID]))
Sort: Descending
Label: "PODs by 3PL"
Color: #FF5A00
```

### View 7: `PODs_by_Submitter` (Bar Chart)
```
View Type: Chart
Chart Type: Bar
Table: POD_Invoice_Data
Group By: Submitted_Name
Aggregate: COUNT(UNIQUE([POD ID]))
Sort: Descending
Label: "PODs by Submitted User"
Color: #FF8C42
```

### View 8: `Review_Rate_by_Store` (Bar Chart)
```
View Type: Chart
Chart Type: Bar (Horizontal)
Table: POD_Invoice_Data
Group By: Store
Aggregate: 
  ROUND(
    COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], 
      AND([Store] = [_THISROW].[Store], NOT(ISBLANK([Reviewed By])))
    ))) /
    COUNT(UNIQUE(SELECT(POD_Invoice_Data[POD ID], [Store] = [_THISROW].[Store]))) * 100
  , 1)
Sort: Descending
Label: "Review Rate by Store (%)"
Color Gradient: Low=#F59E0B, High=#22C55E
```

> **AppSheet Tip:** For review rate by store, use a separate aggregated slice or a pre-computed summary sheet for best performance.

### View 9: `Review_Progress_Over_Time` (Area Chart)
```
View Type: Chart
Chart Type: Area
Table: Reviewed_PODs (Slice)
Group By: Ship_Date_Only
Aggregate: COUNT(UNIQUE([POD ID]))
Label: "Review Progress Over Time"
Color: #22C55E
Fill Opacity: 0.3
```

### View 10: `Top10_Frequent_Items` (Horizontal Bar)
```
View Type: Chart
Chart Type: Bar (Horizontal)
Table: POD_Invoice_Data
Group By: Description
Aggregate: COUNT([POD ID])
Sort: Descending
Max Groups: 10
Label: "Top 10 Most Frequent Items"
Color: #FF5A00
```

### View 11: `Top10_Items_by_Qty` (Horizontal Bar)
```
View Type: Chart
Chart Type: Bar (Horizontal)
Table: POD_Invoice_Data
Group By: Description
Aggregate: SUM([Remaining Qty])
Sort: Descending
Max Groups: 10
Label: "Top 10 Items by Quantity"
Color: #FF8C42
```

### View 12: `Top10_Stores_by_Qty` (Bar Chart)
```
View Type: Chart
Chart Type: Bar
Table: POD_Invoice_Data
Group By: Store
Aggregate: SUM([Remaining Qty])
Sort: Descending
Max Groups: 10
Label: "Top 10 Stores by Total Quantity"
Color: #FF5A00
```

### View 13: `Top10_Stores_Pending` (Bar Chart)
```
View Type: Chart
Chart Type: Bar (Horizontal)
Table: Pending_PODs (Slice)
Group By: Store
Aggregate: COUNT(UNIQUE([POD ID]))
Sort: Descending
Max Groups: 10
Label: "Top 10 Stores with Pending Reviews"
Color: #F59E0B
```

### View 14: `Top_Reviewers` (Deck / Table)
```
View Type: Table
Table: POD_Invoice_Data
Filter: NOT(ISBLANK([Reviewed By]))
Group By: Reviewed By
Aggregate: COUNT(UNIQUE([POD ID]))
Sort: Descending
Label: "Top Reviewers Leaderboard"
Columns shown: Reviewed By, COUNT(Unique POD ID)
```

### View 15: `Comments_Analysis` (Donut)
```
View Type: Chart
Chart Type: Donut
Table: POD_Invoice_Data
Group By: Has_Comment
Aggregate: COUNT(UNIQUE([POD ID]))
Label: "PODs with vs. without Comments"
Colors: TRUE=#3B82F6, FALSE=#E5E7EB
Legend Labels: TRUE="Has Comment", FALSE="No Comment"
```

### View 16: `Recent_Activity` (Table)
```
View Type: Table
Slice: Recent_Activity
Sort: Ship Date DESCENDING
Columns: POD ID, Store, 3PL, Ship Date, Submitted By, Reviewed By, Comment, Review_Status
Row Color: 
  IF([Review_Status]="Reviewed", "#F0FDF4",
  IF([Review_Status]="Pending", "#FFFBEB", "#FFFFFF"))
Label: "Recent Activity (Last 7 Days)"
```

---

## 8. Chart Configuration

### Chart Panel Arrangement in Main Dashboard

Create a **Dashboard View** named `Main_Dashboard` and add panels in this order:

```
Row 1: KPI_Total_PODs | KPI_Invoice_Lines | KPI_Total_Qty
Row 2: KPI_Reviewed   | KPI_Pending       | KPI_Review_Rate
Row 3: KPI_Today_PODs | KPI_Reviewed_Today| KPI_Pending_Today
Row 4: KPI_Stores     | KPI_3PLs          | KPI_Submitters
Row 5: [Daily_POD_Trend — full width]
Row 6: [Daily_Qty_Trend — full width]
Row 7: Reviewed_vs_Pending (half) | Comments_Analysis (half)
Row 8: [PODs_by_Store — full width]
Row 9: PODs_by_3PL (half) | PODs_by_Submitter (half)
Row 10: [Review_Rate_by_Store — full width]
Row 11: [Review_Progress_Over_Time — full width]
Row 12: Top10_Frequent_Items (half) | Top10_Items_by_Qty (half)
Row 13: Top10_Stores_by_Qty (half) | Top10_Stores_Pending (half)
Row 14: [Top_Reviewers — full width]
Row 15: [Recent_Activity — full width]
```

---

## 9. Filter / Slicer Setup

AppSheet uses **Interactive Filters** on Dashboard and Table views.

### Global Interactive Filter View: `Dashboard_Filters`

```
View Type: Form or Quick Edit Panel
Position: Top of each dashboard tab
```

Create a **Filter View** with these fields:

| Filter Field | Type | Expression |
|---|---|---|
| Date Range - From | Date | Applied to: Ship_Date_Only >= [Filter_From] |
| Date Range - To | Date | Applied to: Ship_Date_Only <= [Filter_To] |
| Store | EnumList (multi-select) | CONTAINS([Store]) |
| 3PL | EnumList | [3PL] |
| Submitted By | EnumList | [Submitted By] |
| Reviewed By | EnumList | [Reviewed By] |
| Review Status | Enum | [Review_Status] |
| ST Number | Text | CONTAINS([ST Number]) |
| Item Number | Number | [Item Number] = |
| Description | Text | CONTAINS([Description]) |
| Barcode | Text | [Barcode] = |
| Has Comment | Yes/No | [Has_Comment] = |

### AppSheet Filter Implementation

In AppSheet, filters are implemented via **Slices with parameterized conditions** or via the built-in **Interactive Filter** feature on dashboard views.

**Step-by-step for Interactive Filters:**

1. Open any **Chart or Table View**
2. Go to **View Options → Filters**
3. Enable **"Show filter button"** on the view
4. Select which columns are filterable
5. AppSheet will render filter chips at the top of the view

For global cross-view filtering, use AppSheet's **"App-level context"** with a dedicated filter table:

```
Table: Filter_State (new Google Sheet tab)
Columns: Filter_From (Date), Filter_To (Date), Store (Text), 3PL (Text), ...
```

Then reference `Filter_State[Filter_From]` in all slice conditions.

---

## 10. Navigation & UX

### Bottom Navigation Bar

Go to **UX → Navigation → Primary Navigation**

Set navigation type to **Bottom Bar** with these tabs:

| Tab | Icon | View |
|-----|------|------|
| Dashboard | dashboard | Main_Dashboard |
| PODs | local_shipping | PODs_List |
| Stores | store | Stores_View |
| Items | inventory | Items_View |
| Analytics | analytics | Analytics_Dashboard |
| Users | people | Users_View |
| Settings | settings | Settings_View |

### Tab Views

#### PODs Tab: `PODs_List`
```
View Type: Table
Table: POD_Invoice_Data
Group By: POD ID
Sort: Ship Date DESCENDING
Columns: POD ID, Ship Date, Store, 3PL, Submitted By, Review_Status
Row Action: Tap to open POD detail
```

#### POD Detail View: `POD_Detail`
```
View Type: Detail
Table: POD_Invoice_Data
Show all columns
Highlight: Review_Status with color coding
Action Button: "Mark as Reviewed" (updates Reviewed By field)
```

#### Stores Tab: `Stores_View`
```
View Type: Deck
Table: POD_Invoice_Data
Group By: Store
Summary: COUNT(UNIQUE([POD ID])) PODs | SUM([Remaining Qty]) items
Icon: store
Sort: COUNT(POD ID) DESCENDING
```

#### Items Tab: `Items_View`
```
View Type: Table
Table: POD_Invoice_Data
Group By: Description
Columns: Description, Item Number, COUNT, SUM(Remaining Qty)
Sort: COUNT DESCENDING
Search: ON
```

#### Analytics Tab: `Analytics_Dashboard`
```
View Type: Dashboard
Panels: All chart views (same as Main_Dashboard but charts only, no KPIs)
```

#### Users Tab: `Users_View`
```
View Type: Table
Table: POD_Invoice_Data
Group By: Submitted By
Columns: Submitted By, COUNT(POD ID), SUM(Remaining Qty)
```

---

## 11. Branding & Theme

### AppSheet Theme Settings

Go to **UX → Theme**

```
Primary Color: #FF5A00
Secondary Color: #FFFFFF
Background Color: #F8F9FA
Header Color: #FF5A00
Header Text Color: #FFFFFF
Font: Roboto (AppSheet default, matches Material Design)
Icon Style: Material Icons (Rounded)
Corner Radius: 12px (rounded cards)
Shadow: Enabled (soft shadow on cards)
```

### Launch Image / Brand

Go to **UX → Brand**

```
App Logo: Upload Talabat logo (orange rocket icon)
Launch Screen Background: #FF5A00
Launch Screen Text Color: #FFFFFF
App Name: "Talabat WH QC"
```

### View Header Styles

For each view, set:
```
Header Background: #FF5A00
Header Text: #FFFFFF
Sort/Filter Icons: #FFFFFF
```

### KPI Card Styling

In **Chart Views → Style**:
```
Card Background: #FFFFFF
Card Shadow: 0 2px 8px rgba(0,0,0,0.08)
Card Border Radius: 12px
Value Font Size: 32px (Large)
Label Font Size: 12px
Label Color: #6B7280
Value Color: Based on metric (see card definitions above)
Icon Color: Match value color
Padding: 16px
```

### Status Colors (Row Formatting)

Apply to all table/deck views via **Column → Show?** and **Color** settings:

```
Review_Status = "Reviewed" → Background: #F0FDF4, Text: #166534
Review_Status = "Pending"  → Background: #FFFBEB, Text: #92400E
```

---

## 12. Performance Optimizations

### Critical Rules for 8,975+ Rows

#### 1. Avoid Heavy Virtual Columns
- Keep virtual columns to the minimum defined in Section 4
- Do NOT create virtual columns that call `SELECT()` on every row (these run per-row)
- Use slices for filtering instead of per-row `SELECT()` in VCs

#### 2. Use Slices Instead of In-View Filters Where Possible
- Pre-defined slices (Section 5) load faster than dynamic filters
- The `Recent_Activity` slice (last 7 days) limits data shown in the live table

#### 3. Chart Aggregation Best Practices
```
✅ Use built-in chart aggregation (COUNT, SUM, AVG)
✅ Set Max Groups on bar/horizontal bar charts (10-20)
✅ Use table-level data (not slice) for KPI scorecards
❌ Avoid LOOKUP() in chart expressions
❌ Avoid nested SELECT() in chart definitions
```

#### 4. Dashboard Panel Count
- Keep each dashboard to max 12-15 panels
- Split into two dashboards if needed: `Overview_Dashboard` and `Analytics_Dashboard`

#### 5. Sync Settings
Go to **Settings → Sync**:
```
Background Sync: ON
Sync Interval: 5 minutes (or "On Open" + manual refresh button)
Offline Mode: OFF (live data required)
Delta Sync: ON (only fetch changes, not full dataset)
```

#### 6. Data Size Management
```
Cache: Enable "Cache computed columns" in Settings
Offline: Disable offline sync to reduce app bundle size
Images: No images in this app (no performance hit)
```

#### 7. Slice Conditions — Use Date Indexing
AppSheet indexes Date columns automatically. Always filter by date first:
```
✅ [Ship_Date_Only] >= (TODAY() - 30)  ← date filter first
✅ AND([Ship_Date_Only] >= X, [Store] = Y)
❌ [Store] = Y  ← non-indexed filter without date bound
```

#### 8. Security Filter
Go to **Security → Require Sign-In** — enable sign-in to:
- Restrict to `@talabat.com` domain
- Use `USEREMAIL()` in filter conditions for personalized views

---

## 13. Additional KPIs & Insights

### Suggested Additional Metrics (not in original spec)

These are recommended based on the real data patterns:

#### Operational Health KPIs

| KPI | Expression | Insight |
|-----|-----------|---------|
| **Backlog Rate** | `ROUND(COUNT(UNIQUE(SELECT(...Pending...))) / COUNT(UNIQUE(...)) * 100, 1)` | % of work still in queue |
| **Review Velocity** | Reviewed PODs / Days active | How fast QC is clearing backlog |
| **Avg Review Lag** | Days between Ship Date and Reviewed Date | Requires adding `Reviewed Date` column |
| **QC Throughput Today** | KPI_Reviewed_Today value | Real-time throughput |
| **Stores Never Reviewed** | Stores with 0% review rate | Risk indicator |
| **High-Volume Items** | Items > 100 units total | Priority items for physical check |

#### Additional Recommended Charts

**Chart A: Review Backlog Aging**
```
Type: Stacked Bar
Group By: Ship_Date_Only
Series: Reviewed (green) vs Pending (amber)
Purpose: Shows accumulation of unreviewed work over time
```

**Chart B: 3PL Performance Matrix**
```
Type: Grouped Bar
X-Axis: 3PL Company
Series 1: Total PODs
Series 2: Reviewed PODs
Series 3: Pending PODs
Purpose: Compare 3PL partners on delivery and review metrics
```

**Chart C: Store × 3PL Heatmap**
```
Type: Table with conditional formatting
Rows: Stores
Columns: 3PLs
Values: COUNT(PODs)
Color: Cell intensity by volume
Purpose: Identify which 3PL serves which stores
```

**Chart D: Weekly Submission Cadence**
```
Type: Bar
Group By: Week_Number
Aggregate: COUNT(UNIQUE([POD ID]))
Purpose: Identify weekly patterns, workload spikes
```

**Chart E: Submitter Workload Balance**
```
Type: Pie
Group By: Submitted_Name
Aggregate: COUNT(UNIQUE([POD ID]))
Purpose: Are submissions evenly distributed among field staff?
```

#### Executive Summary Card (recommended addition)

A single card at the very top of the dashboard showing:
```
"📦 1,352 PODs | ✅ 16.4% Reviewed | ⏳ 1,130 Pending | 🏪 74 Stores | 🚚 4 Partners"
```
Expression:
```
COUNT(UNIQUE(POD_Invoice_Data[POD ID])) & " PODs | " &
ROUND(...review_rate...) & "% Reviewed | " &
COUNT(UNIQUE(SELECT(...Pending...))) & " Pending"
```

#### Actionable Alert Views

**Alert View: `Stores_Never_Reviewed`**
```
Filter: Store has PODs but 0 reviewed
Action: "Send reminder to field team"
Color: Red highlight
```

**Alert View: `Items_Missing_Description`**
```
Filter: ISBLANK([Description])
Count in KPI card
Purpose: Data quality monitoring
```

---

## Full Step-by-Step Build Checklist

Use this checklist to build the app from zero:

### Phase 1: Data Setup
- [ ] Rename Google Sheet tab to `POD_Invoice_Data`
- [ ] Ensure `Barcode` column is formatted as Text
- [ ] Ensure `Ship Date` is a proper DateTime format
- [ ] Add `_RowNumber` as auto-key if not present

### Phase 2: AppSheet Connection
- [ ] Create new app from Google Sheets
- [ ] Set column types (Section 3)
- [ ] Add all 7 Virtual Columns (Section 4)
- [ ] Create all 7 Slices (Section 5)

### Phase 3: KPI Cards (14 cards)
- [ ] KPI_Total_PODs
- [ ] KPI_Invoice_Lines
- [ ] KPI_Total_Qty
- [ ] KPI_Reviewed
- [ ] KPI_Pending
- [ ] KPI_Review_Rate
- [ ] KPI_Today_PODs
- [ ] KPI_Reviewed_Today
- [ ] KPI_Pending_Today
- [ ] KPI_Stores
- [ ] KPI_3PLs
- [ ] KPI_Submitters
- [ ] KPI_Avg_Items_per_POD
- [ ] KPI_Avg_Qty_per_POD

### Phase 4: Charts (15 charts)
- [ ] Daily_POD_Trend
- [ ] Daily_Qty_Trend
- [ ] Reviewed_vs_Pending
- [ ] PODs_by_Store
- [ ] PODs_by_3PL
- [ ] PODs_by_Submitter
- [ ] Review_Rate_by_Store
- [ ] Review_Progress_Over_Time
- [ ] Top10_Frequent_Items
- [ ] Top10_Items_by_Qty
- [ ] Top10_Stores_by_Qty
- [ ] Top10_Stores_Pending
- [ ] Top_Reviewers
- [ ] Comments_Analysis
- [ ] Recent_Activity

### Phase 5: Dashboard Assembly
- [ ] Create Main_Dashboard with all panels
- [ ] Create Analytics_Dashboard
- [ ] Configure panel grid layout
- [ ] Set panel sizes (full/half width)

### Phase 6: Navigation
- [ ] Set Bottom Navigation bar
- [ ] Create all 7 tab views
- [ ] Configure detail views
- [ ] Add "Mark as Reviewed" action

### Phase 7: Filters
- [ ] Enable interactive filters on all chart views
- [ ] Configure filterable columns per view
- [ ] Test cross-chart filter behavior

### Phase 8: Branding
- [ ] Apply Talabat color theme
- [ ] Upload logo
- [ ] Set font and icon style
- [ ] Configure status color coding

### Phase 9: Performance & Security
- [ ] Enable Delta Sync
- [ ] Set 5-minute background sync
- [ ] Restrict to @talabat.com domain
- [ ] Test with full 8,975-row dataset
- [ ] Verify mobile responsiveness

### Phase 10: QA
- [ ] Test all 14 KPIs for accuracy
- [ ] Verify chart data matches Google Sheet
- [ ] Test filters on all views
- [ ] Check mobile layout on iOS + Android
- [ ] Share with stakeholders for review

---

*Document generated for Talabat Warehouse QC Dashboard — July 2026*
