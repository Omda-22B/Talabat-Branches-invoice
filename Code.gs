// ═══════════════════════════════════════════════════════════════════
//  Talabat Warehouse QC Dashboard — Backend (Code.gs)
// ═══════════════════════════════════════════════════════════════════

function doGet(e) {
  return HtmlService.createTemplateFromFile('Dashboard')
    .evaluate()
    .setTitle('Warehouse QC | Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ── Main data function — reads sheet ONCE, returns compact JSON ──
function getSheetData() {
  try {
    const ss  = SpreadsheetApp.getActiveSpreadsheet();
    const sh  = ss.getSheets()[0];
    const raw = sh.getDataRange().getValues();

    if (raw.length < 2) return { rows: [], ts: Date.now() };

    // ── Locate columns by header (case-insensitive, flexible) ──
    const hdr = raw[0].map(h => h.toString().trim().toLowerCase());
    const col = {
      podId:    findCol(hdr, ['pod id','pod_id','podid']),
      date:     findCol(hdr, ['ship date','ship_date','shipdate','date']),
      by:       findCol(hdr, ['submitted by','submitted_by','submittedby']),
      store:    findCol(hdr, ['store']),
      tpl:      findCol(hdr, ['3pl','tpl','logistics']),
      stNum:    findCol(hdr, ['st number','st_number','stnumber']),
      itemNum:  findCol(hdr, ['item number','item_number','itemnumber']),
      desc:     findCol(hdr, ['description','desc']),
      qty:      findCol(hdr, ['remaining qty','remaining_qty','qty','quantity']),
      reviewed: findCol(hdr, ['reviewed by','reviewed_by','reviewedby']),
      comment:  findCol(hdr, ['comment','comments']),
    };

    const tz   = Session.getScriptTimeZone();
    const rows = [];

    for (let i = 1; i < raw.length; i++) {
      const r     = raw[i];
      const podId = (r[col.podId] || '').toString().trim();
      if (!podId) continue;

      // ── Format date ──
      let dateStr = '';
      const dv = r[col.date];
      if (dv instanceof Date) {
        dateStr = Utilities.formatDate(dv, tz, 'yyyy-MM-dd');
      } else if (dv) {
        dateStr = dv.toString().split(/[ T]/)[0];
      }

      const email = (r[col.by] || '').toString().trim();
      const user  = email.includes('@') ? email.split('@')[0] : email;

      // Compact row array — indices documented below
      rows.push([
        podId,                                       // [0]  POD ID
        dateStr,                                     // [1]  date YYYY-MM-DD
        user,                                        // [2]  user (short name)
        (r[col.store]    || '').toString().trim(),   // [3]  store
        (r[col.tpl]      || '').toString().trim(),   // [4]  3PL
        (r[col.stNum]    || '').toString().trim(),   // [5]  ST Number
        (r[col.itemNum]  || '').toString().trim(),   // [6]  Item Number
        (r[col.desc]     || '').toString().trim(),   // [7]  Description
        Number(r[col.qty]) || 0,                     // [8]  Qty
        (r[col.reviewed] || '').toString().trim(),   // [9]  Reviewed By
        email,                                       // [10] Full email
        (r[col.comment]  || '').toString().trim(),   // [11] Comment
      ]);
    }

    return { rows, ts: Date.now() };

  } catch (err) {
    console.error('getSheetData:', err);
    return { error: err.message, rows: [], ts: Date.now() };
  }
}

// ── Helper: find first matching column header ──
function findCol(headers, candidates) {
  for (const c of candidates) {
    const i = headers.indexOf(c);
    if (i !== -1) return i;
  }
  return 0; // safe fallback
}
