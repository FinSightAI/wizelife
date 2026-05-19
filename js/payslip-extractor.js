/**
 * PayslipExtractor — Israeli payslip OCR using Tesseract.js (heb+eng).
 *
 * Same engine as WizeMoney/js/image-import.js, but tuned for the Hebrew
 * payslip layout: gross, income tax, Bituach Leumi, health tax, pension
 * (employee + employer), keren hishtalmut, net pay.
 *
 * Usage:
 *   PayslipExtractor.pickAndExtract().then(data => {
 *     // data = { gross, income_tax, bituach_leumi, mas_briut,
 *     //          pension_employee, pension_employer, keren_hishtalmut,
 *     //          net, raw_text, confidence }
 *   });
 */
window.PayslipExtractor = (function () {
    const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

    // Hebrew + English labels per payslip line-item.
    // Each entry: [field, [hebrew or english labels…]]
    // Order matters — most-specific first.
    const FIELD_PATTERNS = [
        // Gross — many variants. Real Israeli payslips often have MULTIPLE
        // 'ברוטו' lines (למס, לביטוח לאומי, לפנסיה, לקרן השתלמות). For
        // headline "gross salary" we want the LARGEST number found — that's
        // the total gross before any deduction. extractFields() handles
        // max-over-matches when field name is 'gross'.
        ['gross',            [
            /סה[\"״]?כ\s*ברוטו/,                // סה"כ ברוטו / סה״כ ברוטו
            /משכורת\s*ברוטו/,
            /שכר\s*ברוטו/,
            /ברוטו\s*למס\s*הכנסה/,             // ברוטו למס הכנסה
            /ברוטו\s*למס/,                     // ברוטו למס (short)
            /ברוטו\s*לביטוח\s*לאומי/,           // ברוטו לביטוח לאומי
            /ברוטו\s*ב[\.\"]?ל[\.\"]?/,         // ברוטו ב.ל. / ברוטו בל
            /ברוטו\s*לפנסיה/,                  // ברוטו לפנסיה
            /ברוטו\s*לקרן\s*השתלמות/,           // ברוטו לקרן השתלמות
            /ברוטו\s*לחישוב/,                   // ברוטו לחישוב
            /סה[\"״]?כ\s*תשלומים/,             // סה"כ תשלומים
            /סך[־\-]?כל\s*ה?תשלומים/,          // סך-כל התשלומים
            /Gross\s*Pay/i,
            /Gross\s*Salary/i,
            /\bברוטו\b/,                       // last resort
        ]],
        ['net',              [
            /נטו\s*לתשלום/,
            /סה[\"״]?כ\s*נטו/,
            /שכר\s*נטו/,
            /שכר\s*103/,                // some payslips label net as "שכר 103"
            /Net\s*Pay/i,
            /Take\s*Home/i,
            /\bנטו\b/,                  // last resort
        ]],
        ['income_tax',       [/מס\s*הכנסה/, /Income\s*Tax/i, /\bTax\b/]],
        ['bituach_leumi',    [/ביטוח\s*לאומי/, /National\s*Insurance/i, /Bituach\s*Leumi/i]],
        ['mas_briut',        [/מס\s*בריאות/, /Health\s*Tax/i]],
        ['pension_employee', [
            /ניכוי\s*פנסיה/,
            /הפרשת\s*עובד.*פנסיה/,
            /פנסיוני\s*עובד/,
            /תגמולים\s*עובד/,
            /תגמולים\s*לקצבה/,
            /קצבה\s*שכיר/,
            /Pension\s*Employee/i,
        ]],
        ['pension_employer', [
            /הפרשת\s*מעביד.*פנסיה/,
            /הפרשת\s*מעסיק.*פנסיה/,
            /מעביד\s*פנסיה/,
            /פנסיה\s*מעסיק/,
            /תגמולים\s*מעביד/,
            /Pension\s*Employer/i,
            /Employer.*Pension/i,
        ]],
        ['keren_hishtalmut', [
            /קרן\s*השתלמות/,
            /השתלמות\s*עובד/,
            /\bהשתלמות\b/,              // last resort
            /Study\s*Fund/i,
            /Keren\s*Hishtalmut/i,
        ]],
        ['bituach_menahalim',[/ביטוח\s*מנהלים/, /Executive\s*Insurance/i, /Bituach\s*Menahalim/i]],
        ['gemel',            [/קופת\s*גמל/, /גמל\s*עובד/, /Provident\s*Fund/i, /Gemel/i]],
    ];

    // Parses numeric strings in common formats: 12,345.67 / 12.345,67 / 12345 / ₪12,345
    function parseNumber(s) {
        if (!s) return null;
        s = String(s).replace(/[₪\s]/g, '');
        // 12.345,67 → 12345.67
        if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
            return parseFloat(s.replace(/\./g, '').replace(',', '.'));
        }
        // 12,345.67 → 12345.67
        if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) {
            return parseFloat(s.replace(/,/g, ''));
        }
        // Plain: 12345 or 12345.67 or 12345,67
        s = s.replace(/,/g, '.');
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
    }

    // Extract the FIRST number that appears on the same line (or within next 60 chars)
    // following a label keyword. Hebrew payslips read RTL but OCR returns LTR text,
    // so check both BEFORE and AFTER the label.
    function findValueNearLabel(text, labelRx) {
        const lines = text.split('\n');
        for (const line of lines) {
            const m = line.match(labelRx);
            if (!m) continue;
            const idx = m.index;
            // Look in the SAME line, after the label
            const after = line.slice(idx + m[0].length);
            const afterNum = after.match(/-?[\d,.]+/);
            if (afterNum) {
                const n = parseNumber(afterNum[0]);
                if (n !== null && Math.abs(n) > 5) return n;
            }
            // Look BEFORE the label (Hebrew RTL: number often appears left of label)
            const before = line.slice(0, idx);
            const beforeNums = before.match(/-?[\d,.]+/g);
            if (beforeNums) {
                // Take the LAST number before the label
                for (let i = beforeNums.length - 1; i >= 0; i--) {
                    const n = parseNumber(beforeNums[i]);
                    if (n !== null && Math.abs(n) > 5) return n;
                }
            }
        }
        return null;
    }

    /**
     * Adjacent-line aware extractor — ported from WizeMoney's working
     * extractPayslip (finance dashboard/js/image-import.js). For each
     * field, walk through ALL lines; when a label matches, scan the
     * matching line + the line before + the line after for a number
     * in the valid range. This handles the common payslip layout where
     * the label is on one line and the number on the next.
     */
    function extractFields(text) {
        const result = { raw_text: text };
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        function findAmountNearAnyPattern(patterns, min, max, takeMax) {
            min = min || 0;
            max = max || Infinity;
            const collected = [];
            for (const pat of patterns) {
                for (let i = 0; i < lines.length; i++) {
                    if (!pat.test(lines[i])) continue;
                    const candidates = [lines[i]];
                    if (i + 1 < lines.length) candidates.push(lines[i + 1]);
                    if (i - 1 >= 0)            candidates.push(lines[i - 1]);
                    for (const cand of candidates) {
                        const nums = cand.match(/-?[\d][,\d]*\.?\d*/g);
                        if (!nums) continue;
                        for (const n of nums) {
                            const val = parseNumber(n);
                            if (val !== null && val >= min && val <= max) {
                                if (!takeMax) return val;        // first-match (default)
                                collected.push(val);             // keep collecting for max
                            }
                        }
                    }
                }
            }
            if (takeMax && collected.length) return Math.max(...collected);
            return null;
        }

        // Per-field min/max bounds — prevent matching unrelated tiny numbers
        // (e.g., "3" from a row count) when looking for a salary.
        const BOUNDS = {
            gross:              [3000, 200000],   // monthly gross in ILS
            net:                [2000, 200000],
            income_tax:         [0,    100000],
            bituach_leumi:      [0,    20000],
            mas_briut:          [0,    20000],
            pension_employee:   [50,   10000],
            pension_employer:   [50,   10000],
            keren_hishtalmut:   [0,    20000],
            bituach_menahalim:  [0,    20000],
            gemel:              [0,    20000],
        };

        let confidence = 0;
        for (const [field, patterns] of FIELD_PATTERNS) {
            const [min, max] = BOUNDS[field] || [0, Infinity];
            // For 'gross' + 'net' take the MAX over all matches — payslips
            // often have multiple "ברוטו" lines (למס/לב״ל/לפנסיה) and the
            // headline gross is the highest. Other fields use first-match.
            const takeMax = field === 'gross' || field === 'net';
            const v = findAmountNearAnyPattern(patterns, min, max, takeMax);
            if (v !== null) {
                result[field] = v;
                confidence++;
            }
        }
        result.confidence = Math.round((confidence / FIELD_PATTERNS.length) * 10);
        return result;
    }

    async function ensureTesseract() {
        if (window.Tesseract) return;
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = TESSERACT_CDN;
            s.onload = resolve;
            s.onerror = () => reject(new Error('Failed to load Tesseract.js'));
            document.head.appendChild(s);
        });
    }

    // pdf.js — same version + UMD form as WizeMoney/FinSight (proven working there).
    // v3 UMD works without dynamic import + has stable worker URL handling.
    const PDFJS_CDN_LIB    = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    const PDFJS_CDN_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    async function ensurePdfJs() {
        if (window.pdfjsLib) return;
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = PDFJS_CDN_LIB;
            s.onload = () => {
                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN_WORKER;
                    resolve();
                } else {
                    reject(new Error('pdfjsLib not on window after script load'));
                }
            };
            s.onerror = () => reject(new Error('Failed to load pdf.js from CDN — CSP block?'));
            document.head.appendChild(s);
        });
    }

    /**
     * Convert PDF → combined OCR text across all pages (Israeli payslips can
     * span 2 pages — first has identity, second has gross/net summary).
     * Mirrors finance dashboard/js/image-import.js processPayslipPDF logic
     * since that one is field-tested on real payslips.
     */
    async function pdfToText(file, onProgress) {
        await ensurePdfJs();
        const buf = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
        const totalPages = pdf.numPages;
        let combined = '';
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 }); // 2x for OCR quality
            const canvas = document.createElement('canvas');
            canvas.width  = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            // White background — transparent PDFs read poorly in Tesseract.
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport }).promise;
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const { data } = await window.Tesseract.recognize(blob, 'heb+eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text' && typeof onProgress === 'function') {
                        // Map per-page 0-100 into overall progress across totalPages.
                        const pageBase = ((pageNum - 1) / totalPages) * 100;
                        const pageSlice = (1 / totalPages) * 100;
                        onProgress(Math.round(pageBase + m.progress * pageSlice));
                    }
                },
            });
            combined += data.text + '\n';
        }
        return combined;
    }

    async function recognize(file, onProgress) {
        await ensureTesseract();
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
        if (isPdf) {
            return await pdfToText(file, onProgress);
        }
        // Plain image — direct Tesseract.
        const { data } = await window.Tesseract.recognize(file, 'heb+eng', {
            logger: (m) => {
                if (m.status === 'recognizing text' && typeof onProgress === 'function') {
                    onProgress(Math.round(m.progress * 100));
                }
            },
        });
        return data.text;
    }

    /**
     * Open file picker → run OCR → return parsed payslip data.
     * Caller can pass onProgress(percent) for UI feedback.
     */
    async function pickAndExtract(onProgress) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,application/pdf';
            input.onchange = async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) { reject(new Error('No file')); return; }
                try {
                    const text = await recognize(file, onProgress);
                    if (!text || text.trim().length < 10) {
                        reject(new Error('Could not read text from image. Try a clearer photo.'));
                        return;
                    }
                    resolve(extractFields(text));
                } catch (err) {
                    reject(err);
                }
            };
            input.click();
        });
    }

    return { pickAndExtract, extractFields, recognize };
})();
