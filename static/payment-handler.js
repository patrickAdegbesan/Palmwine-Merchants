// Global state
// Indicate that the centralized payment handler is active on this page
try { window.PMF_PAYMENT_HANDLER_ACTIVE = true; } catch (_) {}
let isProcessing = false;
let btnPaystackCard = null;

// Simple QR placeholder (top-level)
function pmfDrawQRPlaceholder(canvas, code) {
    if (!canvas) return;
    try {
        const ctx = canvas.getContext('2d');
        const W = canvas.width || 200;
        const H = canvas.height || 200;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect(8, 8, W - 16, H - 16);
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('QR Unavailable', W / 2, H / 2 - 8);
        ctx.font = '12px Arial';
        if (code) ctx.fillText(code, W / 2, H / 2 + 14);
    } catch (_) {}
}

// Simple toast helper
function pmfShowToast(message, type = 'success', context = 'modal') {
    try {
        let container = null;
        if (context === 'modal') {
            // Inline banner just under the QR code in verification modal
            const qrSection = document.querySelector('#verification-modal .qr-code-section');
            if (!qrSection) return;
            container = qrSection.querySelector('.pmf-toast-inline');
            if (!container) {
                container = document.createElement('div');
                container.className = 'pmf-toast-inline';
                container.style.margin = '18px auto 0 auto';
                container.style.maxWidth = '360px';
                container.style.textAlign = 'center';
                qrSection.insertBefore(container, qrSection.querySelector('.qr-instructions'));
            }
            container.innerHTML = '';
            const toast = document.createElement('div');
            toast.className = 'pmf-toast';
            toast.setAttribute('role', 'status');
            toast.style.display = 'inline-block';
            toast.style.width = '100%';
            toast.style.padding = '12px 14px';
            toast.style.borderRadius = '7px';
            toast.style.boxShadow = '0 2px 8px rgba(0,0,0,.07)';
            toast.style.color = type === 'error' ? '#7f1d1d' : '#065f46';
            toast.style.background = type === 'error' ? '#fee2e2' : '#d1fae5';
            toast.style.fontSize = '15px';
            toast.style.fontWeight = '600';
            toast.style.border = '1px solid ' + (type === 'error' ? '#fecaca' : '#10b981');
            toast.textContent = message || '';
            container.appendChild(toast);
            setTimeout(() => { try { container.innerHTML = ''; } catch(_) {} }, 3500);
        } else {
            // fallback: top-right toast
            let fallback = document.getElementById('pmf-toast-container');
            if (!fallback) {
                fallback = document.createElement('div');
                fallback.id = 'pmf-toast-container';
                fallback.style.position = 'fixed';
                fallback.style.top = '16px';
                fallback.style.right = '16px';
                fallback.style.zIndex = '99999';
                fallback.style.display = 'flex';
                fallback.style.flexDirection = 'column';
                fallback.style.gap = '8px';
                document.body.appendChild(fallback);
            }
            const toast = document.createElement('div');
            toast.className = 'pmf-toast';
            toast.setAttribute('role', 'status');
            toast.style.minWidth = '220px';
            toast.style.maxWidth = '340px';
            toast.style.padding = '12px 14px';
            toast.style.borderRadius = '8px';
            toast.style.boxShadow = '0 8px 24px rgba(0,0,0,.12)';
            toast.style.color = type === 'error' ? '#7f1d1d' : '#064e3b';
            toast.style.background = type === 'error' ? '#fee2e2' : '#d1fae5';
            toast.style.fontSize = '14px';
            toast.style.fontWeight = '600';
            toast.style.border = '1px solid ' + (type === 'error' ? '#fecaca' : '#a7f3d0');
            toast.textContent = message || '';
            fallback.appendChild(toast);
            setTimeout(() => { try { toast.remove(); } catch(_) {} }, 3500);
        }
    } catch(_) {}
}

// Enforce single ticket type selection in the ticket modal
function pmfEnforceSingleTypeGuard() {
    const container = document.getElementById('tm-ticket-list');
    if (!container) return;

    const updateState = () => {
        const rows = container.querySelectorAll('.tm-row');
        let premiumSum = 0;
        let regularSum = 0;
        rows.forEach(row => {
            const label = (row.querySelector('.tm-label')?.textContent || '').toLowerCase();
            const isPremium = label.includes('premium');
            const input = row.querySelector('input[data-price]');
            const qty = Math.max(0, parseInt(input?.value || '0', 10) || 0);
            if (isPremium) premiumSum += qty; else regularSum += qty;
        });

        const lockPremium = regularSum > 0; // if regular selected, lock premium
        const lockRegular = premiumSum > 0; // if premium selected, lock regular

        rows.forEach(row => {
            const label = (row.querySelector('.tm-label')?.textContent || '').toLowerCase();
            const isPremium = label.includes('premium');
            const input = row.querySelector('input[data-price]');
            if (!input) return;
            if (isPremium && lockPremium) {
                input.disabled = true;
                input.title = 'You can only buy one ticket type per order.';
            } else if (!isPremium && lockRegular) {
                input.disabled = true;
                input.title = 'You can only buy one ticket type per order.';
            } else {
                input.disabled = false;
                input.title = '';
            }
        });
    };

    // Delegate input/change events
    container.addEventListener('input', updateState);
    container.addEventListener('change', updateState);
    // Initial call
    updateState();
}

// Robust PDF downloader with polling and fallbacks
async function pmfDownloadTicketPDF({ ticketCode, ticketData, totalAmount, customerInfo, eventDetails, transactionRef }) {
    const urls = [
        `/api/download-ticket/${ticketCode}/`,
        `/api/download-ticket/${ticketCode}`
    ];
    // 1) Try GET with small polling window to allow DB write to complete
    for (let attempt = 0; attempt < 3; attempt++) {
        for (const urlTry of urls) {
            try {
                const response = await fetch(urlTry, { method: 'GET', headers: { 'X-CSRFToken': getCookie('csrftoken') || '' } });
                console.log('[Download PDF][GET]', urlTry, 'status', response.status);
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `PMF-Ticket-${ticketCode}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                    return true;
                }
            } catch (e) {
                console.warn('[Download PDF][GET] error', e);
            }
        }
        // wait 500ms then retry
        await new Promise(r => setTimeout(r, 500));
    }

    // 2) Fallback: POST generate-ticket-pdf with payload that backend expects
    try {
        const payload = {
            code: ticketCode,
            reference: transactionRef || ticketData?.ref || '',
            customerName: customerInfo?.name || ticketData?.customerName || '',
            email: customerInfo?.email || ticketData?.email || '',
            amount: Number.isFinite(totalAmount) ? totalAmount : parseFloat(customerInfo?.amount) || 0,
            quantity: ticketData?.quantity || 1,
            premiumTables: ticketData?.premiumTables || 0,
            regularTickets: ticketData?.regularTickets || 0,
            ticket_type: ticketData?.ticket_type || undefined,
            event: {
                name: eventDetails?.name || (ticketData?.event && ticketData.event.name) || 'Event',
                date: eventDetails?.date || (ticketData?.event && ticketData.event.date) || '',
                location: eventDetails?.location || (ticketData?.event && ticketData.event.location) || ''
            }
        };
        const genResp = await fetch('/api/generate-ticket-pdf/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') || '' },
            body: JSON.stringify(payload)
        });
        console.log('[Download PDF][POST generate] status', genResp.status);
        if (genResp.ok) {
            const blob = await genResp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `PMF-Ticket-${ticketCode}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            return true;
        }
    } catch (e) {
        console.warn('[Download PDF][POST generate] error', e);
    }

    // 3) Final fallback: open in new tab
    const a = document.createElement('a');
    a.href = urls[0];
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return false;
}

// Generate QR with retry (top-level)
async function pmfGenerateQRCodeWithRetry(canvas, text, retries = 5, delayMs = 150) {
    try {
        if (!canvas) return false;
        let attempts = 0;
        // If QRCode library isn't present, try to lazy-load it with fallbacks
        if (!(window.QRCode && (typeof window.QRCode.toCanvas === 'function' || typeof window.QRCode.toDataURL === 'function'))) {
            try {
                if (!window.__pmf_qr_loading) {
                    window.__pmf_qr_loading = true;
                    const sources = [
                        'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
                        'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js',
                        'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.3/qrcode.min.js'
                    ];
                    console.log('[QR] Injecting QRCode library from fallbacks...');
                    (function loadNext(i){
                        if (i >= sources.length) { console.warn('[QR] All QRCode CDN sources failed to inject'); return; }
                        const s = document.createElement('script');
                        s.src = sources[i]; s.async = true;
                        s.onload = () => console.log('[QR] Loaded', sources[i]);
                        s.onerror = () => { console.warn('[QR] Failed', sources[i]); loadNext(i+1); };
                        document.head.appendChild(s);
                    })(0);
                }
                // Give extra time when we just injected
                retries = Math.max(retries, 20);
                delayMs = Math.max(delayMs, 150);
            } catch (e) { console.warn('[QR] Failed to inject script tag', e); }
        }
        while (!(window.QRCode && (typeof window.QRCode.toCanvas === 'function' || typeof window.QRCode.toDataURL === 'function')) && attempts < retries) {
            await new Promise(r => setTimeout(r, delayMs));
            attempts++;
        }
        if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
            try { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); } catch(_) {}
            await window.QRCode.toCanvas(canvas, String(text || ''), { width: 200, height: 200 });
            console.log('[QR] Rendered via toCanvas');
            return true;
        }
        // Fallback: try toDataURL and draw it to canvas
        if (window.QRCode && typeof window.QRCode.toDataURL === 'function') {
            try {
                const url = await window.QRCode.toDataURL(String(text || ''), { width: 200, margin: 1 });
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve; img.onerror = reject; img.src = url;
                });
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                console.log('[QR] Rendered via toDataURL');
                return true;
            } catch (e) {
                console.warn('[QR] toDataURL fallback failed', e);
            }
        }
        console.warn('[QR] Library still unavailable after retries, attempting network fallback');
        // Network fallback: use public QR service and draw to canvas
        try {
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(String(text||''))}`;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            console.log('[QR] Rendered via network fallback');
            return true;
        } catch (netErr) {
            console.warn('[QR] Network fallback failed', netErr);
            pmfDrawQRPlaceholder(canvas, text);
            return false;
        }
    } catch (err) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, delayMs));
            return pmfGenerateQRCodeWithRetry(canvas, text, retries - 1, delayMs);
        }
        pmfDrawQRPlaceholder(canvas, text);
        return false;
    }
}

// Initialize payment system
function initializePaystack() {
    console.log('Checking Paystack initialization...');
    
    return new Promise((resolve, reject) => {
        function checkPaystack() {
            return window.PaystackPop && typeof window.PaystackPop.setup === 'function';
        }

// removed older in-function QR helpers (now top-level)

        if (checkPaystack()) {
            resolve(true);
            return;
        }

        let attempts = 0;
        const maxAttempts = 50;
        const interval = setInterval(() => {
            attempts++;
            if (checkPaystack()) {
                clearInterval(interval);
                resolve(true);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                reject(new Error('Timeout waiting for Paystack to load'));
            }
        }, 100);
    });
}

// Clean up payment state
function resetPaymentState() {
    console.log('Resetting payment state');
    isProcessing = false;
    if (btnPaystackCard) {
        btnPaystackCard.disabled = false;
        btnPaystackCard.style.opacity = '1';
    }
    const loading = document.querySelector('.loading-indicator');
    if (loading) loading.remove();
}

// Handle successful payment
async function handlePaymentSuccess(transaction, customerInfo, eventDetails) {
    console.log('Processing successful payment:', transaction.reference);

    try {
        // Show processing message
        const processingMsg = document.createElement('div');
        processingMsg.className = 'loading-indicator';
        processingMsg.innerHTML = '<div class="spinner"></div><div class="text">Generating your tickets...</div>';
        document.body.appendChild(processingMsg);

        // Calculate ticket quantities based on selected items (single ticket type per order)
        const totalAmount = parseFloat(customerInfo.amount);
        let ticketQuantity = 0;
        let premiumQty = 0;    // number of premium tickets
        let regularQty = 0;    // number of regular tickets
        let ticketType = 'Regular';
        try {
            const rows = document.querySelectorAll('#tm-ticket-list .tm-row');
            if (rows && rows.length) {
                rows.forEach(row => {
                    const label = (row.querySelector('.tm-label')?.textContent || '').toLowerCase();
                    const inp = row.querySelector('input[data-price]');
                    const qty = Math.max(0, parseInt(inp?.value || '0', 10) || 0);
                    if (!qty) return;
                    const isPremium = label.includes('premium');
                    if (isPremium) premiumQty += qty; else regularQty += qty;
                });
                // Enforce single type: choose whichever type has quantity
                if (premiumQty > 0 && regularQty > 0) {
                    // If both were selected somehow, prefer the one with non-zero last edited value; fallback to premium
                    // For safety, pick premium; UI layer will prevent mixing separately
                    regularQty = 0;
                }
                ticketQuantity = premiumQty > 0 ? premiumQty : regularQty;
                ticketType = premiumQty > 0 ? 'Premium' : 'Regular';
            }
        } catch (_) {}

        // Fallback if we cannot read selections (e.g., DOM differs): derive from amount/event price
        if (!ticketQuantity) {
            const eventPriceElement = document.querySelector('[data-event-price]');
            const eventPrice = eventPriceElement ? parseFloat(eventPriceElement.getAttribute('data-event-price')) : 5000;
            ticketQuantity = Math.max(1, Math.floor(totalAmount / (eventPrice || 1)));
        }

        // Generate ticket code
        const ticketCode = 'PMF-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

        // Prepare ticket data matching the backend API expectations
        const ticketData = {
            code: ticketCode,
            customerName: customerInfo.name,
            phone: customerInfo.phone,
            email: customerInfo.email,
            amount_paid: totalAmount,
            ref: transaction.reference,
            quantity: ticketQuantity,
            // Keep fields for backend compatibility
            premiumTables: premiumQty,   // premium count (not tables)
            regularTickets: regularQty,
            ticket_type: ticketType,
            event_id: eventDetails.id || eventDetails.name,
            event: {
                name: eventDetails.name,
                date: eventDetails.date,
                location: eventDetails.location || ''
            }
        };

        console.log('Ticket data:', ticketData);

        // Step 1: Save the ticket
        const storeResponse = await fetch('/api/store-ticket/', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') || ''
            },
            body: JSON.stringify(ticketData)
        });
        console.log('Store ticket response:', storeResponse.status);
        const storeResult = await storeResponse.json();
        
        // Add a small delay to ensure DB transaction is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        let emailResult = null;
        if (storeResult.success && storeResult.stored) {
            // Step 2: Send email only if ticket was stored successfully
            const emailResponse = await fetch('/api/send-ticket-email/', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken') || ''
                },
                body: JSON.stringify(ticketData)
            });
            console.log('Send email response:', emailResponse.status);
            emailResult = await emailResponse.json();
            
            // Toast results
            if (emailResult.success) {
                pmfShowToast('Ticket saved and email sent successfully', 'success', 'modal');
            } else {
                pmfShowToast('Ticket saved but email could not be sent', 'error', 'modal');
            }
        } else {
            pmfShowToast(storeResult.message || 'Could not save ticket', 'error', 'modal');
            console.error('Failed to store ticket:', storeResult);
        }
        
        const apiResults = [{
            status: 'fulfilled',
            value: storeResult
        }];
        if (emailResult) {
            apiResults.push({
                status: 'fulfilled',
                value: emailResult
            });
        }

        // Log API results
        console.log('API Results:', apiResults);

        // Toast on store result
        try {
            const storeResult = apiResults[0]?.value;
            if (storeResult && storeResult.success && storeResult.stored) {
                pmfShowToast('Tickets saved successfully', 'success', 'modal');
            } else if (storeResult && storeResult.success === false) {
                pmfShowToast(storeResult.message || 'Could not save tickets', 'error', 'modal');
            }
        } catch(_) {}

        // Update UI
        const ticketModal = document.getElementById('ticket-modal');
        const verificationModal = document.getElementById('verification-modal');

        if (ticketModal) {
            ticketModal.setAttribute('aria-hidden', 'true');
            ticketModal.classList.remove('show');
        }

        if (verificationModal) {
            console.log('Opening verification modal');
            
            // Update verification modal with ticket details
            const orderEventName = document.getElementById('order-event-name');
            const orderEventDate = document.getElementById('order-event-date');
            const orderTotalAmount = document.getElementById('order-total-amount');
            const orderTicketCount = document.getElementById('order-ticket-count');
            const orderReference = document.getElementById('order-reference');
            const verificationCodeText = document.getElementById('verification-code-text');
            
            if (orderEventName) orderEventName.textContent = eventDetails.name;
            if (orderEventDate) orderEventDate.textContent = eventDetails.date;
            if (orderTotalAmount) orderTotalAmount.textContent = `₦${totalAmount.toLocaleString()}`;
            if (orderTicketCount) orderTicketCount.textContent = `${ticketQuantity} ticket${ticketQuantity === 1 ? '' : 's'}`;
            if (orderReference) orderReference.textContent = transaction.reference;
            if (verificationCodeText) verificationCodeText.textContent = ticketCode;
            
            // Show verification modal first, then render QR to avoid hidden-canvas quirks
            verificationModal.setAttribute('aria-hidden', 'false');
            verificationModal.classList.add('show');

            // Render QR code into canvas
            try {
                const qrCanvas = document.getElementById('qr-canvas');
                if (qrCanvas) {
                    const ok = await pmfGenerateQRCodeWithRetry(qrCanvas, ticketCode, 15, 100);
                    if (!ok) {
                        // Draw a readable fallback if QR library isn't ready
                        pmfDrawQRPlaceholder(qrCanvas, ticketCode);
                    }
                } else {
                    console.warn('QR canvas element not found');
                }
            } catch (qrErr) {
                console.error('QR rendering error:', qrErr);
                try {
                    const canvasEl = document.getElementById('qr-canvas');
                    pmfDrawQRPlaceholder(canvasEl, ticketCode);
                    // As a last resort, display an <img> with a generated QR so the user sees something usable
                    if (canvasEl && canvasEl.parentElement && !canvasEl.parentElement.querySelector('img.qr-fallback-img')) {
                        const img = document.createElement('img');
                        img.className = 'qr-fallback-img';
                        img.alt = 'QR Code';
                        img.width = canvasEl.width || 200;
                        img.height = canvasEl.height || 200;
                        img.style.display = 'block';
                        img.style.margin = '0 auto';
                        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(String(ticketCode||''))}`;
                        canvasEl.parentElement.insertBefore(img, canvasEl.nextSibling);
                    }
                } catch (_) {}
            }

            // Remove the three action buttons per request
            const idsToRemove = ['btn-view-full-ticket','btn-download-ticket','btn-share-ticket'];
            idsToRemove.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    // Try to remove the surrounding card/container if present
                    const card = el.closest('.action-card') || el.closest('.card') || el.parentElement;
                    (card || el).remove();
                }
            });

            // Keep only the single consolidated download button if present
            const downloadQRBtn = document.getElementById('btn-download-qr');
            
            // If you later want to hide this too, uncomment:
            // if (downloadQRBtn) { (downloadQRBtn.closest('.action-card') || downloadQRBtn).remove(); }

            if (downloadQRBtn) {
                // Make this button download the full ticket PDF (customer info, ticket count, order summary)
                downloadQRBtn.onclick = async () => {
                    try {
                        const ok = await pmfDownloadTicketPDF({ ticketCode, ticketData, totalAmount, customerInfo, eventDetails, transactionRef: transaction.reference });
                        if (!ok) throw new Error('download failed');
                    } catch (error) {
                        console.error('Error downloading ticket (Download Ticket button):', error);
                        if (window.showError) {
                            showError('Could not download ticket. Please check your email for the ticket or contact support.', 'Download Error');
                        } else {
                            alert('Could not download ticket. Please check your email for the ticket or contact support.');
                        }
                    }
                };
            }
            document.body.style.overflow = 'hidden';
            
            console.log('Verification modal should now be visible');
        } else {
            console.error('Verification modal not found!');
            // Fallback: show notification or alert
            if (window.showSuccess) {
                showSuccess(`Payment successful!\n\nReference: ${transaction.reference}\nTicket code: ${ticketCode}`, 'Payment Complete');
            } else {
                alert(`Payment successful! Reference: ${transaction.reference}\nTicket code: ${ticketCode}`);
            }
        }

    } catch (error) {
        console.error('Error processing ticket:', error);
        if (window.showError) {
            showError(`Payment successful but there was an error generating your tickets.\n\nPlease contact support with your reference: ${transaction.reference}`, 'Ticket Generation Error');
        } else {
            alert('Payment successful but there was an error generating your tickets. Please contact support with your reference: ' + transaction.reference);
        }
    } finally {
        // Clean up
        const processingMsg = document.querySelector('.loading-indicator');
        if (processingMsg) processingMsg.remove();
    }
}

// CSRF token helper function
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Initialize payment handler
async function initializePaymentHandler() {
    console.log('Initializing payment handler');
    
    // Get payment button
    btnPaystackCard = document.getElementById('btn-paystack-card');
    if (!btnPaystackCard) {
        console.error('Payment button not found');
        return;
    }

    // Remove any existing handlers
    const newBtn = btnPaystackCard.cloneNode(true);
    btnPaystackCard.parentNode.replaceChild(newBtn, btnPaystackCard);
    btnPaystackCard = newBtn;

    // Add click handler
    btnPaystackCard.addEventListener('click', async function(e) {
        e.preventDefault();
        
        if (isProcessing) {
            console.log('Payment already in progress');
            return;
        }

        try {
            // Set processing state
            isProcessing = true;
            btnPaystackCard.disabled = true;
            btnPaystackCard.style.opacity = '0.7';

            // Validate input
            const name = document.getElementById('payerName')?.value?.trim();
            const email = document.getElementById('payEmail')?.value?.trim();
            const phone = document.getElementById('payPhone')?.value?.trim();
            const amount = parseInt(document.getElementById('amountPaid')?.value || '0');

            if (!name || !email || !phone) {
                throw new Error('Please fill in all required fields');
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (!amount || amount <= 0) {
                throw new Error('Please select at least one ticket');
            }

            // Initialize Paystack
            const paystackReady = await initializePaystack();
            if (!paystackReady) {
                throw new Error('Payment system is not ready. Please refresh the page.');
            }

            // Show loading indicator
            const loading = document.createElement('div');
            loading.className = 'loading-indicator';
            loading.innerHTML = '<div class="spinner"></div><div class="text">Processing payment...</div>';
            document.body.appendChild(loading);

            // Get Paystack key
            const key = document.querySelector('meta[name="paystack-public-key"]')?.content;
            if (!key) throw new Error('Payment configuration missing');

            // Generate reference
            const ref = 'PMF-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);

            // Get event details
            const eventDetails = {
                name: document.getElementById('tm-title')?.textContent || 'Event',
                date: document.getElementById('tm-event-meta')?.textContent || '',
                location: document.querySelector('[data-event-location]')?.getAttribute('data-event-location') || ''
            };

            // Get Paystack instance
            const paystack = window.PaystackPop;
            if (!paystack) {
                throw new Error('Payment system not ready. Please refresh the page.');
            }

            const paystackConfig = {
                key: key,
                email: email,
                amount: Math.round(parseFloat(amount) * 100),
                currency: 'NGN',
                ref: ref,
                metadata: {
                    custom_fields: [
                        { display_name: "Customer Name", variable_name: "customer_name", value: name },
                        { display_name: "Phone Number", variable_name: "phone", value: phone },
                        { display_name: "Event", variable_name: "event", value: `${eventDetails.name} • ${eventDetails.date}` }
                    ]
                }
            };

            // Add callbacks
            paystackConfig.callback = function(response) {
                resetPaymentState();
                handlePaymentSuccess(response, { name, email, phone, amount }, eventDetails);
            };

            paystackConfig.onClose = function() {
                console.log('Payment window closed');
                resetPaymentState();
            };

            // Initialize payment
            const handler = paystack.setup(paystackConfig);
            handler.openIframe();

        } catch (error) {
            console.error('Payment error:', error);
            if (window.showError) {
                showError(error.message || 'Could not process payment. Please try again.', 'Payment Error');
            } else {
                alert(error.message || 'Could not process payment. Please try again.');
            }
            resetPaymentState();
        }
    });

    // Global error handler
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        resetPaymentState();
    });
}

// Initialize when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePaymentHandler);
} else {
    initializePaymentHandler();
}
