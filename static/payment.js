// Palmwine Merchants Payment Handler
const PaymentHandler = {
    async init() {
        console.log('Initializing payment handler...');

        // Check for required elements
        const requiredElements = ['clientName', 'phone', 'email', 'btn-pay-deposit', 'btn-pay-full'];
        for (const id of requiredElements) {
            if (!document.getElementById(id)) {
                console.error(`Required element #${id} not found`);
            }
        }

        // Check for Paystack public key
        const publicKey = document.querySelector('meta[name="paystack-public-key"]')?.content;
        if (!publicKey) {
            console.error('Paystack public key not found in meta tag');
            return;
        }

        // Try to set up Paystack
        let attempts = 0;
        const maxAttempts = 5;
        const retryDelay = 1000; // 1 second

        console.log('Setting up Paystack...');
        while (attempts < maxAttempts) {
            console.log(`Attempt ${attempts + 1} of ${maxAttempts}`);
            if (await this.setupPaystack()) {
                console.log('Paystack setup successful');
                break;
            }
            attempts++;
            if (attempts < maxAttempts) {
                console.log(`Retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                console.error('Failed to setup Paystack after max attempts');
            }
        }

        this.bindButtons();
        console.log('Payment handler initialization complete');
    },

    setupPaystack() {
        return new Promise((resolve) => {
            if (typeof PaystackPop !== 'undefined') {
                console.log('Paystack initialized successfully');
                resolve(true);
            } else {
                console.log('Paystack not loaded yet, will retry');
                resolve(false);
            }
        });
    },

    getAmounts() {
        try {
            const invTotalEl = document.getElementById('inv-total');
            const invDepositEl = document.getElementById('inv-deposit');
            
            // Remove currency symbol and commas, then parse
            const totalText = invTotalEl?.textContent || '0';
            const depositText = invDepositEl?.textContent || '0';
            
            const total = parseInt(totalText.replace(/[^0-9]/g, '')) || 0;
            const deposit = parseInt(depositText.replace(/[^0-9]/g, '')) || 0;
            
            console.log('Calculated amounts:', { deposit, total });
            return { deposit, total };
        } catch (error) {
            console.error('Error getting amounts:', error);
            return { deposit: 0, total: 0 };
        }
    },

    validateCustomerInfo() {
        const name = document.getElementById('clientName')?.value;
        const phone = document.getElementById('phone')?.value;
        const email = document.getElementById('email')?.value;
        
        if (!name || !phone) {
            alert('Please fill in your name and phone number first.');
            return false;
        }

        // Optional email validation
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Please enter a valid email address or leave it empty.');
            return false;
        }

        return true;
    },

    generateRef(type) {
        const date = new Date();
        const timestamp = date.toISOString().replace(/[\-:\.]/g, '').slice(0, 14);
        const random = Math.floor(1000 + Math.random() * 9000);
        return `PMF-${timestamp}-${type}-${random}`;
    },

    async startPayment(type) {
        console.log(`Initiating ${type} payment...`);
        
        // First validate customer info
        if (!this.validateCustomerInfo()) return;
        
        // Wait for Paystack to be ready
        const paystackReady = await this.setupPaystack();
        if (!paystackReady) {
            console.error('Paystack failed to initialize');
            alert('Payment system is not ready. Please refresh the page and try again.');
            return;
        }
        
        const amounts = this.getAmounts();
        const amount = type === 'deposit' ? amounts.deposit : amounts.total;
        
        if (!amount || amount <= 0) {
            alert('Invalid amount. Please make sure the quote is calculated correctly.');
            return;
        }

        const metadata = {
            quoteId: document.getElementById('inv-id')?.textContent || '',
            customerName: document.getElementById('clientName')?.value,
            phone: document.getElementById('phone')?.value,
            email: document.getElementById('email')?.value || 'customer@palmwinemerchants.com',
            paymentType: type
        };

        try {
            const key = document.querySelector('meta[name="paystack-public-key"]')?.content;
            if (!key) throw new Error('Paystack configuration missing');

            console.log('Starting payment with:', {
                amount,
                metadata,
                key: key ? 'configured' : 'missing'
            });

            const handler = PaystackPop.setup({
                key: key,
                email: metadata.email,
                amount: amount * 100, // Convert to kobo
                currency: 'NGN',
                ref: this.generateRef(type),
                metadata: metadata,
                callback: (response) => this.handleSuccess(response, amount, metadata),
                onClose: () => {
                    console.log('Payment window closed');
                }
            });

            handler.openIframe();
        } catch (error) {
            console.error('Payment error:', error);
            
            // More descriptive error messages based on the type of error
            let errorMessage = 'Could not start payment. ';
            
            if (error.message && error.message.includes('PaystackPop')) {
                errorMessage += 'The payment system is not ready. Please refresh the page and try again.';
            } else if (error.message && error.message.includes('configuration missing')) {
                errorMessage += 'Payment configuration is missing. Please contact support.';
            } else if (!navigator.onLine) {
                errorMessage += 'Please check your internet connection and try again.';
            } else {
                errorMessage += 'Please try again or contact support.';
            }
            
            alert(errorMessage);
        }
    },

    handleSuccess(response, amount, metadata) {
        if (!response || !response.reference) {
            alert('Payment error. Please try again or contact support.');
            return;
        }

        console.log('Payment successful:', response);
        
        // Save the booking with CSRF token
        fetch('/api/bookings/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                quote_id: metadata.quoteId,
                client_name: metadata.customerName,
                phone: metadata.phone,
                email: metadata.email,
                event_type: document.getElementById('eventType').value,
                event_date: document.getElementById('date').value,
                venue: document.getElementById('venue').value,
                guests: parseInt(document.getElementById('guests').value),
                package_type: document.querySelector('input[name="basePackage"]:checked').value,
                payment_amount: amount,
                payment_type: metadata.paymentType,
                payment_reference: response.reference,
                status: metadata.paymentType === 'full' ? 'confirmed' : 'pending'
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Booking saved:', data);
        })
        .catch(error => {
            console.error('Error saving booking:', error);
        });

        try {
            // Hide payment buttons
            const btnPayDeposit = document.getElementById('btn-pay-deposit');
            const btnPayFull = document.getElementById('btn-pay-full');
            if (btnPayDeposit) btnPayDeposit.style.display = 'none';
            if (btnPayFull) btnPayFull.style.display = 'none';

            // Show success section
            const statusSection = document.getElementById('payment-status-section');
            const successTitle = document.getElementById('payment-success-title');
            const successMessage = document.getElementById('payment-success-message');
            
            if (statusSection && successTitle && successMessage) {
                // Update success message based on payment type
                const isFullPayment = metadata.paymentType === 'full';
                successTitle.textContent = 'Payment Successful!';
                successMessage.textContent = isFullPayment ? 
                    'Full payment received and confirmed. Your booking is now complete!' :
                    'Deposit payment received and confirmed. Your booking date is now secured!';
                
                // Show the status section
                statusSection.style.display = 'block';
                statusSection.scrollIntoView({ behavior: 'smooth' });
                
                // Set up download button
                const downloadBtn = document.getElementById('btn-download-receipt');
                if (downloadBtn) {
                    downloadBtn.onclick = () => this.generateReceipt(amount, metadata, response.reference);
                }

                // Update WhatsApp button
                const waBtn = document.getElementById('btn-whatsapp-confirm');
                if (waBtn) {
                    const message = `Hello! I've just made a ${metadata.paymentType} payment of ₦${amount.toLocaleString()} for my event (Quote ID: ${metadata.quoteId}). Reference: ${response.reference}`;
                    waBtn.href = `https://wa.me/2348039490349?text=${encodeURIComponent(message)}`;
                }
            }

            // Generate receipt
            if (typeof generateReceipt === 'function') {
                generateReceipt(amount, metadata, response.reference);
            }

            // Update WhatsApp button
            const waBtn = document.getElementById('btn-pay-wa');
            if (waBtn) {
                const message = `Hello! I've just made a ${metadata.paymentType} payment of ₦${amount.toLocaleString()} for my event (Quote ID: ${metadata.quoteId}). Reference: ${response.reference}`;
                waBtn.href = `https://wa.me/2348039490349?text=${encodeURIComponent(message)}`;
            }

        } catch (error) {
            console.error('Error handling success:', error);
            alert('Payment was successful, but there was an error showing the confirmation. Your reference is: ' + response.reference);
        }
    },

    async generateReceipt(amount, metadata, reference) {
        // Get event details from the form
        const eventType = document.getElementById('eventType')?.value || '';
        const eventDate = document.getElementById('date')?.value || '';
        const venue = document.getElementById('venue')?.value || '';
        const guests = document.getElementById('guests')?.value || '';
        const packageType = document.querySelector('input[name="basePackage"]:checked')?.value || '';
        
        // Get logo URL
        const logoUrl = document.querySelector('.invoice-logo')?.src;
        
        // Create receipt HTML with more details and better styling
        const receipt = document.createElement('div');
        receipt.innerHTML = `
            <div id="receipt" style="padding: 40px; max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif; background: white;">
                <div style="text-align: center; margin-bottom: 30px;">
                    ${logoUrl ? `<img src="${logoUrl}" style="max-width: 200px; margin-bottom: 20px;" />` : ''}
                    <h2 style="color: #2c5530; margin: 10px 0; font-size: 24px;">Payment Receipt</h2>
                    <h3 style="color: #555; margin: 5px 0; font-size: 18px;">Palmwine Merchants & Flames</h3>
                    <p style="color: #777;">Lagos, Nigeria • +234 803 949 0349</p>
                </div>
                
                <div style="border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
                    <h3 style="color: #2c5530; font-size: 18px;">Transaction Details</h3>
                    <table style="width: 100%; margin: 10px 0;">
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Receipt No:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${reference}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Date:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${new Date().toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Quote ID:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${metadata.quoteId}</td>
                        </tr>
                    </table>
                </div>

                <div style="border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
                    <h3 style="color: #2c5530; font-size: 18px;">Customer Information</h3>
                    <table style="width: 100%; margin: 10px 0;">
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Customer:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${metadata.customerName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Phone:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${metadata.phone}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Email:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${metadata.email || 'N/A'}</td>
                        </tr>
                    </table>
                </div>

                <div style="border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
                    <h3 style="color: #2c5530; font-size: 18px;">Event Details</h3>
                    <table style="width: 100%; margin: 10px 0;">
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Event Type:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${eventType}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Event Date:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${eventDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Venue:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${venue}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Number of Guests:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${guests}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Package:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${packageType.charAt(0).toUpperCase() + packageType.slice(1)}</td>
                        </tr>
                    </table>
                </div>

                <div style="border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
                    <h3 style="color: #2c5530; font-size: 18px;">Payment Details</h3>
                    <table style="width: 100%; margin: 10px 0;">
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Amount Paid:</strong></td>
                            <td style="padding: 5px 0; color: #555;">₦${amount.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Payment Type:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${metadata.paymentType === 'full' ? 'Full Payment' : 'Deposit'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Payment Method:</strong></td>
                            <td style="padding: 5px 0; color: #555;">Paystack</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #555;"><strong>Transaction Ref:</strong></td>
                            <td style="padding: 5px 0; color: #555;">${reference}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #777; font-size: 14px;">
                        Thank you for choosing Palmwine Merchants & Flames!<br>
                        For any inquiries, contact us on WhatsApp: +234 803 949 0349<br>
                        Email: Palmwinemerchants@gmail.com
                    </p>
                </div>
            </div>
        `;

        // Add the receipt to the document body temporarily
        document.body.appendChild(receipt);
        
        // Wait for images to load
        const images = receipt.getElementsByTagName('img');
        const imagePromises = Array.from(images).map(img => {
            return new Promise((resolve, reject) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = resolve;
                    img.onerror = reject;
                }
            });
        });

        try {
            // Wait for all images to load
            await Promise.all(imagePromises);

            // If html2pdf is available, use it
            if (typeof html2pdf !== 'undefined') {
                const element = receipt.querySelector('#receipt');
                const opt = {
                    margin: [10, 10],
                    filename: `PalmwineMerchants_Receipt_${reference}.pdf`,
                    image: { type: 'jpeg', quality: 1 },
                    html2canvas: { 
                        scale: 2,
                        useCORS: true,
                        logging: true,
                        letterRendering: true
                    },
                    jsPDF: { 
                        unit: 'mm', 
                        format: 'a4', 
                        orientation: 'portrait',
                        compress: true
                    }
                };

                await html2pdf().from(element).set(opt).save();
                console.log('Receipt generated successfully');
            } else {
                // Fallback: open in new window for printing
                const win = window.open('', '_blank');
                win.document.write('<html><head><title>Payment Receipt</title></head><body>');
                win.document.write(receipt.innerHTML);
                win.document.write('</body></html>');
                win.document.close();
                win.print();
            }
        } catch (error) {
            console.error('Error generating receipt:', error);
            alert('Could not generate receipt. Please try again or contact support.');
        } finally {
            // Clean up: remove the receipt from document
            document.body.removeChild(receipt);
        }
    },

    bindButtons() {
        const btnDeposit = document.getElementById('btn-pay-deposit');
        const btnFull = document.getElementById('btn-pay-full');

        if (btnDeposit) {
            btnDeposit.addEventListener('click', () => this.startPayment('deposit'));
        }
        if (btnFull) {
            btnFull.addEventListener('click', () => this.startPayment('full'));
        }
    }
};

// CSRF token helper
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

// Initialize payment handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    PaymentHandler.init();
});
