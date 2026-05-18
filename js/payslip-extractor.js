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
        ['gross',            [/משכורת\s*ברוטו/, /שכר\s*ברוטו/, /סה"כ\s*ברוטו/, /Gross\s*Pay/i, /Gross\s*Salary/i]],
        ['net',              [/שכר\s*נטו/, /נטו\s*לתשלום/, /סה"כ\s*נטו/, /Net\s*Pay/i, /Take\s*Home/i]],
        ['income_tax',       [/מס\s*הכנסה/, /Income\s*Tax/i, /\bTax\b/]],
        ['bituach_leumi',    [/ביטוח\s*לאומי/, /National\s*Insurance/i, /Bituach\s*Leumi/i]],
        ['mas_briut',        [/מס\s*בריאות/, /Health\s*Tax/i]],
        ['pension_employee', [/ניכוי\s*פנסיה/, /הפרשת\s*עובד.*פנסיה/, /פנסיוני\s*עובד/, /Pension\s*Employee/i]],
        ['pension_employer', [/הפרשת\s*מעביד.*פנסיה/, /מעביד\s*פנסיה/, /Pension\s*Employer/i, /Employer.*Pension/i]],
        ['keren_hishtalmut', [/קרן\s*השתלמות/, /השתלמות\s*עובד/, /Study\s*Fund/i, /Keren\s*Hishtalmut/i]],
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

    function extractFields(text) {
        const result = { raw_text: text };
        let confidence = 0;
        for (const [field, patterns] of FIELD_PATTERNS) {
            for (const pat of patterns) {
                const v = findValueNearLabel(text, pat);
                if (v !== null) {
                    result[field] = v;
                    confidence++;
                    break;
                }
            }
        }
        // Confidence: 0-10 based on how many fields we got out of FIELD_PATTERNS
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

    async function recognize(file, onProgress) {
        await ensureTesseract();
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
