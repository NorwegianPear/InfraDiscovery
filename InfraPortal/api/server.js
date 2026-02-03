/**
 * InfraPortal API Server
 * Serves static files and provides real-time data from Microsoft Entra ID
 * 
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'config', 'entra-config.json');

// Load Azure AD configuration
let config = {};
try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    console.log('✅ Loaded Azure AD configuration');
} catch (err) {
    console.error('⚠️  Warning: Could not load config from', CONFIG_PATH);
    console.error('   API endpoints will return cached data only');
}

const TENANT_ID = config.TenantId || process.env.AZURE_TENANT_ID || '';
const CLIENT_ID = config.ClientId || process.env.AZURE_CLIENT_ID || '';
const CLIENT_SECRET = config.ClientSecret || process.env.AZURE_CLIENT_SECRET || '';

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

// Token cache
let tokenCache = {
    token: null,
    expiresAt: 0
};

/**
 * Get access token for Microsoft Graph API
 */
async function getAccessToken() {
    // Return cached token if still valid
    if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) {
        return tokenCache.token;
    }

    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('Azure AD configuration is incomplete');
    }

    const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default'
    });

    return new Promise((resolve, reject) => {
        const urlObj = new URL(tokenUrl);
        const req = https.request({
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body.toString())
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.access_token) {
                        tokenCache.token = json.access_token;
                        tokenCache.expiresAt = Date.now() + (json.expires_in * 1000);
                        console.log('✅ Got new access token, expires in', json.expires_in, 'seconds');
                        resolve(json.access_token);
                    } else {
                        reject(new Error(json.error_description || 'Failed to get token'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(body.toString());
        req.end();
    });
}

/**
 * Make request to Microsoft Graph API
 */
async function graphRequest(endpoint, useBeta = false) {
    const token = await getAccessToken();
    const baseUrl = useBeta ? 'https://graph.microsoft.com/beta' : 'https://graph.microsoft.com/v1.0';
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const req = https.request({
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'ConsistencyLevel': 'eventual'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        reject(new Error(json.error?.message || `Graph API error: ${res.statusCode}`));
                    } else {
                        resolve(json);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

/**
 * Get all pages from a paginated Graph API response
 */
async function graphRequestAllPages(endpoint, useBeta = false, maxPages = 50) {
    let results = [];
    let nextLink = endpoint;
    let pageCount = 0;

    while (nextLink && pageCount < maxPages) {
        const response = await graphRequest(nextLink, useBeta && !nextLink.startsWith('http'));
        results = results.concat(response.value || []);
        nextLink = response['@odata.nextLink'];
        pageCount++;
    }

    return results;
}

/**
 * API endpoint handlers
 */
const apiHandlers = {
    '/api/idlm/users': async () => {
        console.log('📊 Fetching users from Graph API...');
        const users = await graphRequestAllPages(
            '/users?$select=id,displayName,userPrincipalName,mail,userType,accountEnabled,createdDateTime,signInActivity,assignedLicenses&$top=999',
            true // Use beta for signInActivity
        );
        console.log(`   Found ${users.length} users`);
        return { value: users, count: users.length };
    },

    '/api/idlm/licenses': async () => {
        console.log('📊 Fetching licenses from Graph API...');
        const licenses = await graphRequest('/subscribedSkus');
        return licenses;
    },

    '/api/idlm/signins': async () => {
        console.log('📊 Fetching sign-in logs from Graph API...');
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const signins = await graphRequestAllPages(
            `/auditLogs/signIns?$filter=createdDateTime ge ${sevenDaysAgo}&$top=500&$orderby=createdDateTime desc`,
            false,
            10 // Limit pages for sign-ins
        );
        return { value: signins, count: signins.length };
    },

    '/api/idlm/roles': async () => {
        console.log('📊 Fetching directory roles from Graph API...');
        const roles = await graphRequestAllPages('/directoryRoles?$expand=members');
        return { value: roles };
    },

    '/api/idlm/organization': async () => {
        console.log('📊 Fetching organization info from Graph API...');
        const org = await graphRequest('/organization');
        return org;
    },

    '/api/idlm/stats': async () => {
        console.log('📊 Calculating stats from Graph API...');
        
        // Fetch all needed data
        const [users, licenses, roles] = await Promise.all([
            graphRequestAllPages('/users?$select=id,displayName,userPrincipalName,userType,accountEnabled,signInActivity,assignedLicenses&$top=999', true),
            graphRequest('/subscribedSkus'),
            graphRequestAllPages('/directoryRoles?$expand=members')
        ]);

        // Calculate user stats
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        
        const members = users.filter(u => u.userType === 'Member');
        const guests = users.filter(u => u.userType === 'Guest');
        const enabled = users.filter(u => u.accountEnabled);
        const disabled = users.filter(u => !u.accountEnabled);
        const licensed = users.filter(u => u.assignedLicenses && u.assignedLicenses.length > 0);
        
        const active = users.filter(u => {
            if (!u.signInActivity?.lastSignInDateTime) return false;
            return new Date(u.signInActivity.lastSignInDateTime) > ninetyDaysAgo;
        });
        
        const inactive = users.filter(u => {
            if (!u.accountEnabled) return false;
            if (!u.signInActivity?.lastSignInDateTime) return true;
            return new Date(u.signInActivity.lastSignInDateTime) <= ninetyDaysAgo;
        });

        // Calculate license stats
        const licenseDetails = (licenses.value || []).map(sku => ({
            name: sku.skuPartNumber,
            total: sku.prepaidUnits?.enabled || 0,
            assigned: sku.consumedUnits || 0,
            available: (sku.prepaidUnits?.enabled || 0) - (sku.consumedUnits || 0)
        }));

        // Calculate security stats
        const globalAdminRole = roles.find(r => r.displayName === 'Global Administrator');
        const globalAdmins = globalAdminRole?.members?.length || 0;
        const privilegedRoles = roles.reduce((sum, r) => sum + (r.members?.length || 0), 0);

        return {
            Users: {
                Total: users.length,
                Members: members.length,
                Guests: guests.length,
                Active: active.length,
                Inactive: inactive.length,
                Licensed: licensed.length,
                Disabled: disabled.length
            },
            Licenses: {
                Details: licenseDetails,
                TotalAssigned: licenseDetails.reduce((sum, l) => sum + l.assigned, 0),
                TotalAvailable: licenseDetails.reduce((sum, l) => sum + l.available, 0)
            },
            Security: {
                GlobalAdmins: globalAdmins,
                PrivilegedRoles: privilegedRoles
            },
            SyncInfo: {
                LastSync: new Date().toISOString(),
                Source: 'Live Graph API'
            }
        };
    }
};

/**
 * Serve static file
 */
function serveFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=3600'
        });
        res.end(data);
    });
}

/**
 * Send JSON response
 */
function sendJson(res, data, statusCode = 200) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(data));
}

/**
 * Create HTTP server
 */
const server = http.createServer(async (req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
    }

    // API endpoints
    if (urlPath.startsWith('/api/idlm/')) {
        const handler = apiHandlers[urlPath];
        if (handler) {
            try {
                const data = await handler();
                sendJson(res, data);
            } catch (err) {
                console.error('API Error:', err.message);
                sendJson(res, { error: err.message }, 500);
            }
        } else {
            sendJson(res, { error: 'Not found' }, 404);
        }
        return;
    }

    // Serve cached JSON data files (fallback)
    if (urlPath.startsWith('/api/data/')) {
        const dataFile = path.join(__dirname, 'data', path.basename(urlPath));
        if (fs.existsSync(dataFile)) {
            serveFile(res, dataFile);
        } else {
            sendJson(res, { error: 'Data file not found' }, 404);
        }
        return;
    }

    // Serve static files from parent directory (InfraPortal root)
    let filePath = urlPath === '/' ? '/index.html' : urlPath;
    const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(__dirname, '..', safePath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        serveFile(res, fullPath);
    } else if (!path.extname(filePath)) {
        // SPA fallback - serve index.html for routes without extension
        serveFile(res, path.join(__dirname, '..', 'index.html'));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Start server
server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Espeland Infrastructure Portal                         ║');
    console.log('║     API Server with Live Entra ID Data                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   Local: http://localhost:${PORT}`);
    console.log('');
    if (TENANT_ID && CLIENT_ID && CLIENT_SECRET) {
        console.log('✅ Azure AD credentials loaded');
        console.log(`   Tenant: ${TENANT_ID}`);
        console.log(`   Client: ${CLIENT_ID}`);
    } else {
        console.log('⚠️  Azure AD credentials not configured');
        console.log('   API will return cached data only');
    }
    console.log('');
});
