import { supabase } from '../lib/supabaseClient.js';
import * as XLSX from 'xlsx-js-style';
import { generateUUID } from '../utils/uuid.js';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL + "/functions/v1/operator-admin";

async function callEdgeFunction(payload) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) throw new Error("Not authenticated");

    const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || "Edge function request failed");
    }
    return result;
}

// ------------------------------------------------------------------
// AUTH / PROFILE
// ------------------------------------------------------------------

export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
}

export async function getCurrentProfile() {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) throw error;
    return data;
}

export async function requireAdminProfile() {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== 'admin' || !profile.active) {
        throw new Error("Admin access required or profile inactive");
    }
    return profile;
}

export async function requireOperatorProfile() {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== 'operator' || !profile.active) {
        throw new Error("Operator access required or profile inactive");
    }
    return profile;
}

// ------------------------------------------------------------------
// OPERATOR DATA ACCESS
// ------------------------------------------------------------------

export async function getOperatorBills() {
    const user = await getCurrentUser();

    const { data: routes, error: routeError } = await supabase
        .from('routes')
        .select('*')
        .eq('assigned_operator_id', user.id)
        .eq('active', true);

    if (routeError) throw routeError;
    const route = routes && routes.length > 0 ? routes[0] : null;

    const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('*, operator_updates(*)')
        .eq('assigned_operator_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

    if (billsError) throw billsError;

    const formattedBills = bills.map(b => {
        const sortedUpdates = (b.operator_updates || []).sort((a, b) =>
            new Date(a.created_at) - new Date(b.created_at)
        );
        const hasUpdate = sortedUpdates.length > 0;
        const latestUpdate = hasUpdate ? sortedUpdates[sortedUpdates.length - 1] : null;

        let latestRemark = null;
        if (latestUpdate) {
            latestRemark = latestUpdate.is_cancelled ? latestUpdate.cancel_remark : (latestUpdate.notes || "Payment Collected");
        }

        return {
            id: b.id,
            bill_no: b.bill_no,
            bill_date: b.bill_date,
            retailer_name: b.retailer_name,
            original_amount: b.original_amount,
            has_update: hasUpdate,
            latest_remark: latestRemark,
            latest_update: latestUpdate
        };
    });

    const doneCount = formattedBills.filter(b => b.has_update).length;

    return {
        route_name: route ? route.route_name : "Your Route",
        route_id: route ? route.id : "",
        total: formattedBills.length,
        done: doneCount,
        pending: formattedBills.length - doneCount,
        bills: formattedBills
    };
}

export async function searchOperatorBills(query) {
    const user = await getCurrentUser();
    const { data: bills, error } = await supabase
        .from('bills')
        .select('id, bill_no, retailer_name, original_amount')
        .eq('assigned_operator_id', user.id)
        .eq('active', true)
        .or(`retailer_name.ilike.%${query}%,bill_no.ilike.%${query}%`)
        .limit(30);

    if (error) throw error;
    return bills || [];
}

export async function getOperatorBillDetail(billId) {
    const user = await getCurrentUser();
    const { data: bill, error } = await supabase
        .from('bills')
        .select('*, operator_updates(*)')
        .eq('id', billId)
        .eq('assigned_operator_id', user.id)
        .single();

    if (error) throw error;
    if (!bill) throw new Error("Bill not found");

    const sortedUpdates = (bill.operator_updates || []).sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    );

    return {
        id: bill.id,
        bill_no: bill.bill_no,
        bill_date: bill.bill_date,
        retailer_name: bill.retailer_name,
        original_amount: bill.original_amount,
        updates: sortedUpdates.map(u => ({
            update_id: u.update_id,
            cash_amount: u.cash_amount,
            online_amount: u.online_amount,
            cheq_amount: u.cheq_amount,
            cash_pending_amount: u.cash_pending_amount,
            is_cancelled: u.is_cancelled,
            cancel_remark: u.cancel_remark,
            notes: u.notes,
            created_at: u.created_at,
            synced: true
        }))
    };
}

export async function submitOperatorBillUpdate(billId, payload, clientUpdateId = null) {
    await requireOperatorProfile();
    const updateId = clientUpdateId || generateUUID();

    const { data, error } = await supabase.rpc('submit_bill_update_v4', {
        p_update_id: updateId,
        p_bill_id: billId,
        p_cash_amount: payload.cash_amount || 0.0,
        p_online_amount: payload.online_amount || 0.0,
        p_cheq_amount: payload.cheq_amount || 0.0,
        p_cash_pending_amount: payload.cash_pending_amount || 0.0,
        p_is_cancelled: payload.is_cancelled || false,
        p_cancel_remark: payload.cancel_remark || null,
        p_notes: payload.notes || null,
        p_created_at: payload.created_at || new Date().toISOString()
    });

    if (error) throw error;

    // Treat cash_pending as pending/remaining, NOT collected
    const totalCollected = (payload.cash_amount || 0) + (payload.online_amount || 0) + (payload.cheq_amount || 0);
    const { data: bill } = await supabase.from('bills').select('original_amount').eq('id', billId).single();
    const difference = bill ? (bill.original_amount - totalCollected) : 0;

    return { update_id: updateId, total_collected: totalCollected, difference: difference };
}

export async function syncPendingUpdates(pendingUpdates) {
    if (!pendingUpdates || pendingUpdates.length === 0) return { count: 0 };
    let pushed = 0;
    let errors = [];

    for (const update of pendingUpdates) {
        try {
            await submitOperatorBillUpdate(update.bill_id, update, update.client_update_id);
            pushed++;
        } catch (err) {
            errors.push({ id: update.client_update_id, error: err.message });
        }
    }

    if (errors.length > 0 && pushed === 0) {
        throw new Error(`Sync failed for all updates. First error: ${errors[0].error}`);
    }

    return { count: pushed, errors };
}

// ------------------------------------------------------------------
// ADMIN READ OPERATIONS
// ------------------------------------------------------------------

export async function getAdminDashboardData() {
    await requireAdminProfile();

    const { data: routes, error: routesError } = await supabase.from('routes').select('id, route_name, assigned_operator_id').eq('active', true);
    if (routesError) throw new Error(`Routes fetch failed: ${routesError.message}`);

    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, full_name, username, active').eq('role', 'operator');
    if (profilesError) throw new Error(`Profiles fetch failed: ${profilesError.message}`);

    const { count: totalBills, error: billsError } = await supabase.from('bills').select('id', { count: 'exact', head: true }).eq('active', true);
    if (billsError) throw new Error(`Bills count failed: ${billsError.message}`);

    const activeRoutes = routes || [];
    const operators = profiles || [];

    const operatorMap = {};
    operators.forEach(op => {
        operatorMap[op.id] = op;
    });

    const activeRoutesList = [];
    for (const route of activeRoutes) {
        const { count: billCount } = await supabase.from('bills').select('id', { count: 'exact', head: true }).eq('route_id', route.id).eq('active', true);
        const opInfo = operatorMap[route.assigned_operator_id];

        activeRoutesList.push({
            id: route.id,
            route_name: route.route_name,
            operator_id: route.assigned_operator_id,
            operator_name: opInfo?.full_name || opInfo?.username || "Unassigned",
            operator_username: opInfo?.username || null,
            operator_active: opInfo ? opInfo.active : false,
            bill_count: billCount || 0
        });
    }

    const activeOperatorsCount = operators.filter(op => op.active).length;

    return {
        total_routes: activeRoutes.length,
        active_operators: activeOperatorsCount,
        total_bills: totalBills || 0,
        active_routes: activeRoutesList
    };
}

export async function getRoutesData() {
    await requireAdminProfile();
    const dashboardData = await getAdminDashboardData();
    return dashboardData.active_routes;
}

export async function getOperatorsData() {
    await requireAdminProfile();
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, active, created_at')
        .eq('role', 'operator')
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Operators fetch failed: ${error.message}`);
    return data || [];
}

export async function checkOperatorHasActiveData(operatorId) {
    await requireAdminProfile();
    const { count, error } = await supabase
        .from('bills')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_operator_id', operatorId)
        .eq('active', true);

    if (error) throw new Error(`Check active data failed: ${error.message}`);

    return {
        operator_id: operatorId,
        has_data: (count || 0) > 0,
        active_bill_count: count || 0
    };
}
// ------------------------------------------------------------------
// ADMIN PRIVILEGED OPERATIONS
// ------------------------------------------------------------------

export async function clearOperatorData(operatorId) {
    await requireAdminProfile();

    const { error: err1 } = await supabase.from('operator_updates').delete().eq('operator_id', operatorId);
    if (err1) throw err1;

    const { error: err2 } = await supabase.from('bills').delete().eq('assigned_operator_id', operatorId);
    if (err2) throw err2;

    const { error: err3 } = await supabase.from('daily_batches').delete().eq('assigned_operator_id', operatorId);
    if (err3) throw err3;

    const { error: err4 } = await supabase.from('routes').delete().eq('assigned_operator_id', operatorId);
    if (err4) throw err4;

    return { message: "Data cleared successfully", operator_id: operatorId };
}

export async function clearAllOperations() {
    await requireAdminProfile();
    const dummyUuid = "00000000-0000-0000-0000-000000000000";

    const { error: err1 } = await supabase.from('operator_updates').delete().neq('update_id', dummyUuid);
    if (err1) throw err1;

    const { error: err2 } = await supabase.from('bills').delete().neq('id', dummyUuid);
    if (err2) throw err2;

    const { error: err3 } = await supabase.from('daily_batches').delete().neq('id', dummyUuid);
    if (err3) throw err3;

    const { error: err4 } = await supabase.from('routes').delete().neq('id', dummyUuid);
    if (err4) throw err4;

    return { status: "success", message: "Completely wiped all daily operations data" };
}

export async function createOperator(payload) {
    return await callEdgeFunction({ action: "create", ...payload });
}

export async function deactivateOperator(operatorId) {
    return await callEdgeFunction({ action: "disable", operator_id: operatorId });
}

// ------------------------------------------------------------------
// EXPORT / IMPORT HELPERS (Using SheetJS)
// ------------------------------------------------------------------

export async function fetchPaymentExportData(filters = {}) {
    await requireAdminProfile();
    let query = supabase.from('bills').select('*, operator_updates(*)');

    if (filters.route_id) query = query.eq('route_id', filters.route_id);
    if (filters.operator_id) query = query.eq('assigned_operator_id', filters.operator_id);

    const { data: bills, error: billsError } = await query;
    if (billsError) throw billsError;
    if (!bills || bills.length === 0) throw new Error("No bills found for export");

    const { data: profiles, error: profError } = await supabase.from('profiles').select('id, full_name').eq('role', 'operator');
    if (profError) throw profError;

    const operatorsMap = {};
    if (profiles) profiles.forEach(p => operatorsMap[p.id] = p.full_name);

    return { bills, operatorsMap };
}

export async function generatePaymentCollectionExcel(filters = {}) {
    const { bills } = await fetchPaymentExportData(filters);

    // 1. Define Headers
    const headers = [
        "Sr/No", "Bill No", "Bill Date", "Retailer Name", "Bill Amount",
        "Cash", "Online", "Cheq", "Cash Pending", "Cancel", "Remarks", "Difference"
    ];

    const aoa = [headers];

    // Variables for Totals
    let totalBill = 0, totalCash = 0, totalOnline = 0, totalCheq = 0, totalPending = 0, totalDiff = 0;

    // 2. Process Data
    bills.forEach((bill, idx) => {
        const updates = bill.operator_updates || [];
        const latestUpdate = updates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        const cash = latestUpdate?.cash_amount || 0;
        const online = latestUpdate?.online_amount || 0;
        const cheq = latestUpdate?.cheq_amount || 0;
        const cashPending = latestUpdate?.cash_pending_amount || 0;
        const isCancelled = latestUpdate?.is_cancelled || false;

        const remarksList = [];
        if (isCancelled && latestUpdate?.cancel_remark) remarksList.push(latestUpdate.cancel_remark);
        if (latestUpdate?.notes) remarksList.push(latestUpdate.notes);

        const originalAmount = bill.original_amount || 0;
        const collectedWithoutPending = cash + online + cheq;
        const difference = originalAmount - collectedWithoutPending;

        // Add to totals
        totalBill += originalAmount;
        totalCash += cash;
        totalOnline += online;
        totalCheq += cheq;
        totalPending += cashPending;
        totalDiff += difference;

        aoa.push([
            idx + 1,
            bill.bill_no || "",
            bill.bill_date || "",
            bill.retailer_name || "",
            originalAmount,
            cash,
            online,
            cheq,
            cashPending,
            isCancelled ? "Yes" : "No",
            remarksList.join(" | "),
            difference
        ]);
    });

    // Append Totals Row
    aoa.push([
        "", "", "", "TOTALS:", totalBill, totalCash, totalOnline, totalCheq, totalPending, "", "", totalDiff
    ]);

    // 3. Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // 4. Define Styles
    const borderStyle = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
    };

    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F81BD" } }, // Nice blue header
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle
    };

    const dataStyle = { border: borderStyle, alignment: { vertical: "center" } };
    const numberStyle = { ...dataStyle, numFmt: "#,##0.00" }; // Currency format
    const cancelledRowFill = { fgColor: { rgb: "FFC7CE" } }; // Light red for cancelled
    const totalRowStyle = { font: { bold: true }, fill: { fgColor: { rgb: "D9D9D9" } }, border: borderStyle, numFmt: "#,##0.00" }; // Gray for totals

    // 5. Apply Styles to Cells
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        // Check if this is a cancelled row (Column J / Index 9 is the "Cancel" column)
        let isCancelledRow = false;
        if (R > 0 && R < range.e.r) {
            const cancelCellAddress = XLSX.utils.encode_cell({ r: R, c: 9 });
            if (ws[cancelCellAddress] && ws[cancelCellAddress].v === "Yes") {
                isCancelledRow = true;
            }
        }

        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' }; // Initialize empty cells

            if (R === 0) {
                // Header Row
                ws[cellAddress].s = headerStyle;
            } else if (R === range.e.r) {
                // Totals Row
                ws[cellAddress].s = totalRowStyle;
            } else {
                // Data Rows
                let currentStyle = [4, 5, 6, 7, 8, 11].includes(C) ? { ...numberStyle } : { ...dataStyle };

                // Apply red background if cancelled
                if (isCancelledRow) {
                    currentStyle.fill = cancelledRowFill;
                }

                ws[cellAddress].s = currentStyle;
            }
        }
    }

    // 6. Set Column Widths
    ws['!cols'] = [
        { wch: 6 },   // Sr/No
        { wch: 15 },  // Bill No
        { wch: 12 },  // Bill Date
        { wch: 30 },  // Retailer Name (Wider)
        { wch: 15 },  // Bill Amount
        { wch: 12 },  // Cash
        { wch: 12 },  // Online
        { wch: 12 },  // Cheq
        { wch: 15 },  // Cash Pending
        { wch: 8 },   // Cancel
        { wch: 40 },  // Remarks (Wider)
        { wch: 15 },  // Difference
    ];

    // 7. Generate and Export File
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment Collection");

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `payment_collection_${timestamp}.xlsx`;

    if (Capacitor.isNativePlatform()) {
        try {
            const base64Data = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
            const writeResult = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache
            });
            await Share.share({
                title: 'Exported Payment Report',
                text: 'Payment Collection Excel Report',
                url: writeResult.uri,
                dialogTitle: 'Save or Share Excel Report',
            });
        } catch (error) {
            console.error("Capacitor Native Export Error:", error);
            throw new Error("Failed to save and share Excel file on Android.");
        }
    } else {
        XLSX.writeFile(wb, fileName);
    }
}

function parseExcelToBills(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    let headerIdx = -1;
    for (let i = 0; i < aoa.length; i++) {
        const rowStr = aoa[i].map(String).join(" ").toLowerCase();
        if ((rowStr.includes('bill number') || rowStr.includes('bill no')) && rowStr.includes('amount')) {
            headerIdx = i;
            break;
        }
    }

    if (headerIdx === -1) throw new Error("Could not locate headers. Ensure columns like 'Bill Number' and 'Net Amount' exist.");

    const headers = aoa[headerIdx].map(h => String(h || "").trim().toLowerCase());
    const colMap = {};
    headers.forEach((h, idx) => {
        if (h === 'bill number' || h === 'bill no') colMap['bill_no'] = idx;
        if (h === 'bill date') colMap['bill_date'] = idx;
        if (h === 'retailer name' || h === 'party name') colMap['retailer_name'] = idx;
        if (h === 'net amount' || h.includes('amount')) colMap['original_amount'] = idx;
    });

    if (colMap['bill_no'] === undefined || colMap['original_amount'] === undefined) {
        throw new Error("Missing required columns: 'Bill Number' and 'Net Amount'");
    }

    const bills = [];
    for (let i = headerIdx + 1; i < aoa.length; i++) {
        const row = aoa[i];
        if (!row || row.length === 0) continue;

        const billNo = row[colMap['bill_no']];
        const originalAmountStr = row[colMap['original_amount']];

        if (!billNo || originalAmountStr === undefined || originalAmountStr === "") continue;

        let originalAmount = parseFloat(String(originalAmountStr).replace(/,/g, ''));
        if (isNaN(originalAmount)) continue;

        let rawDate = colMap['bill_date'] !== undefined ? row[colMap['bill_date']] : null;
        let billDate = new Date().toISOString().split('T')[0];

        if (typeof rawDate === 'number') {
            const jsDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            billDate = jsDate.toISOString().split('T')[0];
        } else if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) billDate = d.toISOString().split('T')[0];
        }

        bills.push({
            bill_no: String(billNo).trim(),
            bill_date: billDate,
            retailer_name: String(row[colMap['retailer_name']] || "").trim(),
            original_amount: originalAmount
        });
    }

    if (bills.length === 0) throw new Error("Headers were found, but no valid billing data could be extracted.");
    return bills;
}

export async function uploadSheetToSupabase(file, operatorId, routeName, batchDate, replaceExisting = false) {
    const admin = await requireAdminProfile();

    // Parse Excel File
    const buffer = await file.arrayBuffer();
    const billsData = parseExcelToBills(buffer);

    // Conflict Check 1: Route consistency
    const { data: existingRouteBills } = await supabase.from('bills').select('route_id').eq('assigned_operator_id', operatorId).eq('active', true).limit(1);

    let targetRouteId = null;
    if (existingRouteBills && existingRouteBills.length > 0) {
        const { data: existingRoutes } = await supabase.from('routes').select('id, route_name').eq('assigned_operator_id', operatorId).eq('active', true);
        if (existingRoutes && existingRoutes.length > 0) {
            const currentRouteName = existingRoutes[0].route_name.toLowerCase().trim();
            if (currentRouteName !== routeName.toLowerCase().trim()) {
                throw new Error(`CONFLICT_ROUTE: Operator is currently assigned to route '${existingRoutes[0].route_name}'. Please clear the operator's data first.`);
            }
            targetRouteId = existingRoutes[0].id;
        }
    }

    // Get or Create Route
    if (!targetRouteId) {
        const { data: newRoute, error: routeErr } = await supabase.from('routes').insert({
            route_name: routeName,
            assigned_operator_id: operatorId,
            active: true
        }).select().single();
        if (routeErr) throw routeErr;
        targetRouteId = newRoute.id;
    }

    // Check Batch conflicts
    const { data: existingBatch } = await supabase.from('daily_batches')
        .select('*')
        .eq('batch_date', batchDate)
        .eq('route_id', targetRouteId)
        .eq('active', true).single();

    if (existingBatch) {
        if (!replaceExisting) {
            throw new Error(`Active batch already exists for ${routeName} on ${batchDate}.`);
        }
        await supabase.from('daily_batches').update({ active: false }).eq('id', existingBatch.id);
        await supabase.from('bills').update({ active: false }).eq('batch_id', existingBatch.id);
    }

    // Create new batch
    const batchCode = `${routeName.trim().toLowerCase().replace(/\s+/g, '_')}_${batchDate}_${generateUUID().slice(0, 6)}`;
    const { data: batch, error: batchErr } = await supabase.from('daily_batches').insert({
        batch_code: batchCode,
        batch_date: batchDate,
        route_id: targetRouteId,
        route_name: routeName,
        assigned_operator_id: operatorId,
        uploaded_by: admin.id,
        source_file_name: file.name,
        active: true
    }).select().single();
    if (batchErr) throw batchErr;

    // Conflict Check 2: Global Bill Stealing
    const billNumbers = billsData.map(b => b.bill_no);
    const { data: globalBills } = await supabase.from('bills').select('bill_no, assigned_operator_id').eq('active', true).in('bill_no', billNumbers);

    const stolenBills = (globalBills || []).filter(b => b.assigned_operator_id !== operatorId);
    if (stolenBills.length > 0) {
        throw new Error(`Bill stealing detected! Bills ${stolenBills.map(b => b.bill_no).join(', ')} are already assigned to another active operator. Upload rejected.`);
    }

    // Duplicate skipping
    const existingForOp = (globalBills || []).filter(b => b.assigned_operator_id === operatorId).map(b => b.bill_no);
    const existingSet = new Set(existingForOp);

    const billsToInsert = [];
    let skippedDuplicates = 0;

    for (const b of billsData) {
        if (existingSet.has(b.bill_no)) {
            skippedDuplicates++;
            continue;
        }
        billsToInsert.push({
            id: generateUUID(),
            batch_id: batch.id,
            batch_date: batchDate,
            bill_no: b.bill_no,
            bill_date: b.bill_date,
            retailer_name: b.retailer_name,
            original_amount: b.original_amount,
            route_id: targetRouteId,
            route_name: routeName,
            assigned_operator_id: operatorId,
            status: "pending",
            active: true
        });
    }

    if (billsToInsert.length === 0) {
        throw new Error("Cannot add same data again. All bills are already assigned to this operator.");
    }

    // Insert bills
    const { error: insertErr } = await supabase.from('bills').insert(billsToInsert);
    if (insertErr) throw insertErr;

    return {
        message: "Import complete",
        batch_id: batch.id,
        batch_code: batchCode,
        inserted_count: billsToInsert.length,
        skipped_duplicates: skippedDuplicates,
        total_bills_in_file: billsData.length,
        route_name: routeName,
        operator_id: operatorId
    };
}
