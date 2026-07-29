// /functions/sign.ts - SEPARATED CONNECTION AND TRANSACTION FLOWS

export async function onRequest(context: any) {
    const { request } = context;
    const url = new URL(request.url);
    
    const requestId = url.searchParams.get('requestId');
    const transaction = url.searchParams.get('transaction');
    const message = url.searchParams.get('message');
    const appName = url.searchParams.get('appName');
    const appUrl = url.searchParams.get('appUrl');
    const callbackUrl = url.searchParams.get('callbackUrl');
    const callbackScheme = url.searchParams.get('callbackScheme');
    const chain = url.searchParams.get('chain') || url.searchParams.get('network') || url.searchParams.get('chainType') || undefined;
    const action = url.searchParams.get('action') || 'auto'; // 'connect', 'sign', 'auto'

    console.log('📩 DEEP LINK DETECTED!');
    console.log('   • REQUEST ID:', requestId);
    console.log('   • APP NAME:', appName);
    console.log('   • ACTION:', action);
    console.log('   • TRANSACTION PARAM:', transaction ? 'YES' : 'NO');
    console.log('   • MESSAGE PARAM:', message ? 'YES' : 'NO');

    // 🔥 Determine request type based on action and params
    let requestType: 'transaction' | 'message' | 'connection' = 'connection';
    
    // If action is explicitly 'connect', always show connection UI
    if (action === 'connect') {
        requestType = 'connection';
        console.log('📋 ACTION: connect -> showing connection UI');
    } 
    // If action is explicitly 'sign', show transaction UI
    else if (action === 'sign') {
        if (transaction) {
            requestType = 'transaction';
            console.log('📋 ACTION: sign with transaction -> showing transaction UI');
        } else if (message) {
            requestType = 'message';
            console.log('📋 ACTION: sign with message -> showing message UI');
        } else {
            requestType = 'connection';
            console.log('📋 ACTION: sign but no transaction/message -> showing connection UI');
        }
    } 
    // Auto-detect (legacy)
    else {
        // 🔥 For auto: Check if we have transaction or message
        if (transaction) {
            // Check if it's a connection request with transaction data (shouldn't happen)
            // But if it does, we need to check if the app is already connected
            // We'll let the approve page handle this based on localStorage
            requestType = 'transaction';
            console.log('📋 AUTO: transaction detected -> showing transaction UI');
        } else if (message) {
            requestType = 'message';
            console.log('📋 AUTO: message detected -> showing message UI');
        } else {
            requestType = 'connection';
            console.log('📋 AUTO: no transaction/message -> showing connection UI');
        }
    }

    console.log('📋 FINAL REQUEST TYPE:', requestType);

    // Create approval request object
    const approvalRequest = {
        id: requestId || `req_${Date.now()}`,
        source: 'deeplink',
        type: requestType,
        appName: appName || 'EXTERNAL APP',
        appUrl: appUrl || undefined,
        displayData: {
            title: requestType === 'transaction' ? 'TRANSACTION REQUEST' : 
                   requestType === 'message' ? 'MESSAGE REQUEST' : 'CONNECTION REQUEST',
            description: requestType === 'connection' 
                ? `${(appName || 'EXTERNAL APP').toUpperCase()} WANTS TO CONNECT TO YOUR WALLET`
                : `${(appName || 'EXTERNAL APP').toUpperCase()} WANTS TO SIGN A TRANSACTION`,
            details: {
                'APP': appName || 'UNKNOWN',
                ...(appUrl ? { 'URL': appUrl } : {}),
                'TYPE': requestType === 'transaction' ? 'TRANSACTION' : 
                        requestType === 'message' ? 'MESSAGE' : 'CONNECTION'
            }
        },
        createdAt: Date.now(),
        transaction: transaction || undefined,
        message: message || undefined,
        callbackUrl: callbackUrl || undefined,
        callbackScheme: callbackScheme || undefined,
        chain: chain || 'solana',
        // For connection requests, store if there's a pending transaction
        pendingTransaction: (transaction && requestType === 'connection') ? transaction : undefined,
        pendingMessage: (message && requestType === 'connection') ? message : undefined,
    };

    console.log('📦 APPROVAL REQUEST:', JSON.stringify(approvalRequest, null, 2));

    // 🔒 Store in localStorage
    try {
        const encrypted = btoa(encodeURIComponent(JSON.stringify(approvalRequest)));
        localStorage.setItem('active_approval_request_encrypted', encrypted);
        localStorage.setItem('active_approval_request_timestamp', Date.now().toString());
        
        if (callbackUrl || callbackScheme) {
            localStorage.setItem(`callback_${requestId}`, JSON.stringify({
                requestId,
                callbackUrl: callbackUrl || null,
                callbackScheme: callbackScheme || null,
                appName: appName,
                timestamp: Date.now()
            }));
        }
        console.log('✅ REQUEST STORED IN LOCALSTORAGE');
        console.log('📋 REQUEST TYPE STORED:', requestType);
    } catch (error) {
        console.error('❌ STORAGE ERROR:', error);
    }

    // Redirect to the approve page
    const redirectUrl = `/approve?requestId=${requestId}`;
    console.log('📡 REDIRECTING TO:', redirectUrl);
    
    return new Response(null, {
        status: 302,
        headers: {
            'Location': redirectUrl,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
    });
}
