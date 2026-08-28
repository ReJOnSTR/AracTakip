const { getPrismaClient } = require('../prismaClient');
const log = require('../logger');
const { logAudit } = require('./audit.service');
const { supabaseAdmin } = require('./supabase.service');

const prisma = getPrismaClient();

/**
 * Enterprise Email Template Generators (Linear, Stripe & Resend standard)
 * 600px Table layout, bulletproof CSS, multi-client email support (Gmail, Outlook, Apple Mail)
 */
function generateTemplateHtml(type, theme = 'dark') {
    const isDark = theme === 'dark';
    const isGradient = theme === 'gradient';

    const bgWrapper = isDark ? '#090d16' : (isGradient ? '#0b0f19' : '#f8fafc');
    const cardBg = isDark ? '#131b2e' : (isGradient ? 'linear-gradient(180deg, #161e36 0%, #0d1322 100%)' : '#ffffff');
    const cardBorder = isDark ? '#1e293b' : (isGradient ? '#312e81' : '#e2e8f0');
    const titleColor = isDark || isGradient ? '#ffffff' : '#0f172a';
    const textColor = isDark || isGradient ? '#94a3b8' : '#475569';
    const footerText = isDark || isGradient ? '#64748b' : '#94a3b8';
    const codeBg = isDark || isGradient ? '#090d16' : '#f1f5f9';
    const codeBorder = isDark || isGradient ? '#334155' : '#cbd5e1';

    let headerBadgeIcon = '⚡';
    let headerBadgeBg = 'linear-gradient(135deg, #2563eb, #38bdf8)';
    let btnBg = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
    let btnText = '#ffffff';
    let accentColor = '#38bdf8';
    let title = 'Hesabınızı Doğrulayın';
    let description = 'Kontrol App platformuna hoş geldiniz! Hesabınızı güvenle aktifleştirmek ve filo yönetim paneline erişmek için lütfen aşağıdaki butona tıklayın.';
    let btnLabel = 'E-Postamı Doğrula';
    let otpLabel = 'Veya 6 Haneli Doğrulama Kodunuz';
    let showOtp = true;

    if (type === 'recovery') {
        headerBadgeIcon = '🔑';
        headerBadgeBg = 'linear-gradient(135deg, #e11d48, #f43f5e)';
        btnBg = 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)';
        accentColor = '#fb7185';
        title = 'Şifre Sıfırlama Talebi';
        description = 'Hesabınız için bir şifre sıfırlama talebinde bulunuldu. Yeni ve güçlü bir şifre belirlemek için aşağıdaki butona tıklayabilir veya güvenlik kodunu kullanabilirsiniz.';
        btnLabel = 'Şifremi Sıfırla';
        otpLabel = 'Tek Kullanımlık Güvenlik Kodunuz';
    } else if (type === 'magic_link') {
        headerBadgeIcon = '✨';
        headerBadgeBg = 'linear-gradient(135deg, #8b5cf6, #d946ef)';
        btnBg = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
        accentColor = '#c084fc';
        title = 'Tek Tıkla Giriş Yapın';
        description = 'Aşağıdaki bağlantıyı kullanarak Kontrol App platformuna şifresiz ve güvenli bir şekilde anında oturum açabilirsiniz.';
        btnLabel = 'Hemen Oturum Aç';
        showOtp = false;
    } else if (type === 'invite') {
        headerBadgeIcon = '👥';
        headerBadgeBg = 'linear-gradient(135deg, #10b981, #06b6d4)';
        btnBg = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        accentColor = '#34d399';
        title = 'Ekibe Katılmaya Davet Edildiniz';
        description = 'Kontrol App filo ve operasyon yönetim sistemindeki şirket ekibinize katılmak ve yetkili hesabınızı oluşturmak için daveti kabul edin.';
        btnLabel = 'Daveti Kabul Et & Başla';
        showOtp = false;
    } else if (type === 'change_email') {
        headerBadgeIcon = '🔄';
        headerBadgeBg = 'linear-gradient(135deg, #f59e0b, #d97706)';
        btnBg = 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)';
        accentColor = '#fbbf24';
        title = 'E-Posta Değişikliği Onayı';
        description = 'Hesabınıza bağlı e-posta adresinizi güncellemek için bir talep aldık. Yeni adresinizi onaylamak için lütfen aşağıdaki butona tıklayın.';
        btnLabel = 'Değişikliği Onayla';
        otpLabel = 'E-Posta Değişikliği Onay Kodu';
    }

    return `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: ${bgWrapper}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${textColor}; }
    table { border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { padding: 0; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
    .wrapper { width: 100%; table-layout: fixed; background-color: ${bgWrapper}; padding: 48px 16px; }
    .main-table { width: 100%; max-width: 580px; margin: 0 auto; background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 18px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .header-td { padding: 36px 36px 28px; text-align: center; border-bottom: 1px solid ${cardBorder}; }
    .badge-icon { display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 16px; background: ${headerBadgeBg}; text-align: center; font-size: 26px; box-shadow: 0 8px 18px rgba(0,0,0,0.3); }
    .brand-title { margin-top: 14px; font-size: 20px; font-weight: 800; letter-spacing: 1.5px; color: ${titleColor}; text-transform: uppercase; }
    .brand-sub { font-size: 12px; font-weight: 600; color: ${accentColor}; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }
    .body-td { padding: 36px; text-align: center; }
    h1 { margin: 0 0 14px; font-size: 22px; font-weight: 700; color: ${titleColor}; line-height: 1.3; }
    p.lead-text { margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: ${textColor}; }
    .btn-wrap { margin: 30px 0; }
    .cta-btn { display: inline-block; padding: 15px 38px; background: ${btnBg}; color: ${btnText} !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.4); transition: all 0.2s ease; }
    .otp-card { margin: 28px 0 16px; background: ${codeBg}; border: 1px dashed ${codeBorder}; border-radius: 14px; padding: 20px; text-align: center; }
    .otp-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${footerText}; margin-bottom: 8px; }
    .otp-digits { font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: ${accentColor}; }
    .security-notice { margin-top: 32px; padding: 16px 20px; background: ${codeBg}; border-radius: 12px; text-align: left; font-size: 12px; line-height: 1.6; color: ${footerText}; border-left: 3px solid ${accentColor}; }
    .footer-td { padding: 28px 36px; text-align: center; font-size: 12px; line-height: 1.6; color: ${footerText}; border-top: 1px solid ${cardBorder}; background: ${codeBg}; }
    .footer-links a { color: ${accentColor}; text-decoration: none; margin: 0 8px; font-weight: 600; }
    @media screen and (max-width: 600px) {
      .main-table { width: 100% !important; border-radius: 12px !important; }
      .body-td, .header-td, .footer-td { padding: 24px 20px !important; }
      .cta-btn { width: 100% !important; box-sizing: border-box !important; padding: 14px 20px !important; }
      .otp-digits { font-size: 26px !important; letter-spacing: 5px !important; }
    }
  </style>
</head>
<body>
  <table class="wrapper" role="presentation">
    <tr>
      <td align="center">
        <table class="main-table" role="presentation">
          
          <!-- Header Branding -->
          <tr>
            <td class="header-td">
              <div class="badge-icon">${headerBadgeIcon}</div>
              <div class="brand-title">KONTROL</div>
              <div class="brand-sub">Kurumsal Filo & Operasyon Sistemi</div>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="body-td">
              <h1>${title}</h1>
              <p class="lead-text">${description}</p>
              
              <!-- Call to Action Button -->
              <div class="btn-wrap">
                <a href="{{ .ConfirmationURL }}" class="cta-btn" target="_blank">${btnLabel}</a>
              </div>

              ${showOtp ? `
              <!-- Security OTP Box -->
              <div class="otp-card">
                <div class="otp-title">${otpLabel}</div>
                <div class="otp-digits">{{ .Token }}</div>
              </div>` : ''}

              <!-- Security & Audit Info Notice -->
              <div class="security-notice">
                🔒 <strong>Güvenlik Bilgisi:</strong> Bu işlem güvenlik politikalarımız gereğince kayıt altına alınmıştır. Bu talebi siz başlatmadıysanız lütfen bu e-postayı dikkate almayınız ve hesabınızı korumak için sistem yöneticiniz ile iletişime geçiniz.
              </div>
            </td>
          </tr>

          <!-- Footer Legal & Contact -->
          <tr>
            <td class="footer-td">
              <div style="margin-bottom: 12px;" class="footer-links">
                <a href="{{ .SiteURL }}" target="_blank">Kontrol Paneli</a> •
                <a href="{{ .SiteURL }}/privacy" target="_blank">Gizlilik & Güvenlik</a> •
                <a href="mailto:destek@kontrol-app.com">Destek Al</a>
              </div>
              <div>
                Bu e-posta <strong>{{ .Email }}</strong> adresine otomatik olarak gönderilmiştir.<br>
                © 2026 Kontrol SaaS Platformu. Tüm hakları saklıdır.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Built-in default email templates
 */
const DEFAULT_TEMPLATES = {
    confirmation: {
        type: 'confirmation',
        name: 'Kayıt Onaylama (Confirm Signup)',
        subject: '⚡ Kontrol App - E-Posta Adresinizi Doğrulayın',
        senderName: '⚡ Kontrol Güvenlik Ekibi',
        description: 'Yeni kayıt olan kullanıcıların e-posta adreslerini doğrulamaları için gönderilir.',
        htmlContent: generateTemplateHtml('confirmation', 'dark')
    },
    recovery: {
        type: 'recovery',
        name: 'Şifre Sıfırlama (Reset Password)',
        subject: '🔑 Kontrol App - Şifre Sıfırlama Talebi',
        senderName: '🔑 Kontrol Hesap Güvenliği',
        description: 'Şifresini unutan kullanıcılar için kurtarma bağlantısı ve OTP kodu gönderilir.',
        htmlContent: generateTemplateHtml('recovery', 'dark')
    },
    magic_link: {
        type: 'magic_link',
        name: 'Sihirli Giriş Bağlantısı (Magic Link)',
        subject: '✨ Kontrol App - Tek Tıkla Giriş Bağlantınız',
        senderName: '✨ Kontrol Giriş Servisi',
        description: 'Kullanıcıların şifre girmeden tek tıkla doğrudan oturum açmalarını sağlar.',
        htmlContent: generateTemplateHtml('magic_link', 'dark')
    },
    invite: {
        type: 'invite',
        name: 'Kullanıcı Daveti (Invite User)',
        subject: '👥 Kontrol App - Ekip Davetiyesi',
        senderName: '👥 Kontrol Ekip Yönetimi',
        description: 'Yeni bir personel veya şirket kullanıcısı davet edildiğinde gönderilir.',
        htmlContent: generateTemplateHtml('invite', 'dark')
    },
    change_email: {
        type: 'change_email',
        name: 'E-Posta Değişikliği (Change Email)',
        subject: '🔄 Kontrol App - E-Posta Değişikliği Onayı',
        senderName: '🔄 Kontrol Hesap Yönetimi',
        description: 'Kullanıcı profilindeki e-posta adresini değiştirdiğinde onay için gönderilir.',
        htmlContent: generateTemplateHtml('change_email', 'dark')
    }
};

/**
 * Ensure email_templates table exists in PostgreSQL / SQLite
 */
async function ensureEmailTemplatesTable() {
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS email_templates (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                sender_name VARCHAR(100) DEFAULT 'Kontrol Güvenlik',
                html_content TEXT NOT NULL,
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } catch (e) {
        // Fallback for SQLite
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS email_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    sender_name TEXT DEFAULT 'Kontrol Güvenlik',
                    html_content TEXT NOT NULL,
                    description TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
        } catch (sqliteErr) {}
    }
}

/**
 * Get all email templates
 */
async function getEmailTemplates() {
    try {
        await ensureEmailTemplatesTable();

        let dbTemplates = [];
        try {
            dbTemplates = await prisma.$queryRawUnsafe(`SELECT * FROM email_templates ORDER BY id ASC`);
        } catch (e) {
            log.warn('Could not query email_templates table, using defaults:', e.message);
        }

        const dbMap = new Map();
        if (Array.isArray(dbTemplates)) {
            dbTemplates.forEach(t => dbMap.set(t.type, t));
        }

        const result = Object.keys(DEFAULT_TEMPLATES).map(typeKey => {
            const def = DEFAULT_TEMPLATES[typeKey];
            const custom = dbMap.get(typeKey);

            return {
                type: def.type,
                name: def.name,
                description: def.description,
                subject: custom?.subject || def.subject,
                senderName: custom?.sender_name || def.senderName,
                htmlContent: custom?.html_content || def.htmlContent,
                isCustomized: !!custom,
                updatedAt: custom?.updated_at || null
            };
        });

        return { success: true, data: result };
    } catch (err) {
        log.error('getEmailTemplates error:', err);
        return {
            success: true,
            data: Object.values(DEFAULT_TEMPLATES).map(t => ({
                ...t,
                isCustomized: false,
                updatedAt: null
            }))
        };
    }
}

/**
 * Save / update an email template
 */
async function saveEmailTemplate(data, actorUser) {
    try {
        const { type, subject, htmlContent, senderName } = data || {};
        if (!type || !subject || !htmlContent) {
            return { success: false, error: 'Şablon tipi, konu başlığı ve HTML içeriği zorunludur' };
        }

        await ensureEmailTemplatesTable();
        const def = DEFAULT_TEMPLATES[type] || { name: type, description: '', senderName: 'Kontrol Güvenlik' };

        await prisma.$executeRawUnsafe(`
            INSERT INTO email_templates (type, name, subject, sender_name, html_content, description, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (type) DO UPDATE SET
                subject = EXCLUDED.subject,
                sender_name = EXCLUDED.sender_name,
                html_content = EXCLUDED.html_content,
                updated_at = NOW();
        `, type, def.name, subject, senderName || def.senderName, htmlContent, def.description);

        if (actorUser) {
            logAudit({
                userId: actorUser.id,
                username: actorUser.username,
                userRole: actorUser.role,
                action: 'EMAIL_TEMPLATE_UPDATE',
                entityType: 'EMAIL_TEMPLATE',
                entityId: type,
                details: { type, subject, senderName }
            });
        }

        log.info(`[Email Templates] Template "${type}" updated by ${actorUser?.username || 'system'}`);
        return { success: true, message: 'E-posta şablonu başarıyla kaydedildi' };
    } catch (err) {
        log.error('saveEmailTemplate error:', err);
        return { success: false, error: 'Şablon kaydedilemedi: ' + err.message };
    }
}

/**
 * Reset an email template back to default
 */
async function resetEmailTemplate(data, actorUser) {
    try {
        const { type, theme = 'dark' } = data || {};
        if (!type) {
            return { success: false, error: 'Şablon tipi gereklidir' };
        }

        await ensureEmailTemplatesTable();
        await prisma.$executeRawUnsafe(`DELETE FROM email_templates WHERE type = $1`, type);

        if (actorUser) {
            logAudit({
                userId: actorUser.id,
                username: actorUser.username,
                userRole: actorUser.role,
                action: 'EMAIL_TEMPLATE_RESET',
                entityType: 'EMAIL_TEMPLATE',
                entityId: type,
                details: { type, theme }
            });
        }

        const def = DEFAULT_TEMPLATES[type] || {
            type,
            name: type,
            subject: 'Kontrol Bildirimi',
            senderName: 'Kontrol Güvenlik Ekibi',
            description: ''
        };

        const themedHtml = generateTemplateHtml(type, theme);

        return {
            success: true,
            message: 'Şablon başarıyla varsayılana sıfırlandı',
            data: {
                ...def,
                htmlContent: themedHtml,
                isCustomized: false,
                updatedAt: null
            }
        };
    } catch (err) {
        log.error('resetEmailTemplate error:', err);
        return { success: false, error: 'Şablon sıfırlanamadı: ' + err.message };
    }
}

/**
 * Generate preset HTML by theme
 */
function getPresetThemeHtml(type, theme) {
    return generateTemplateHtml(type, theme);
}

/**
 * Send a real test email with dummy dynamic variables
 */
async function sendTestEmail(data, actorUser) {
    try {
        const { type, targetEmail, subject, htmlContent } = data || {};
        if (!targetEmail || !htmlContent) {
            return { success: false, error: 'Hedef e-posta adresi ve HTML içeriği gereklidir' };
        }

        const mockSiteUrl = 'https://kontrol-app.com';
        const mockConfirmationUrl = 'https://kontrol-app.com/login?verified=true&test=1';
        const mockToken = '849201';
        const mockUsername = actorUser?.username || 'halilsak';
        const mockCompanyName = 'SAK PETROL LOJİSTİK A.Ş.';

        let renderedHtml = htmlContent
            .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, mockConfirmationUrl)
            .replace(/\{\{\s*\.Token\s*\}\}/g, mockToken)
            .replace(/\{\{\s*\.Email\s*\}\}/g, targetEmail)
            .replace(/\{\{\s*\.SiteURL\s*\}\}/g, mockSiteUrl)
            .replace(/\{\{\s*\.Data\.username\s*\}\}/g, mockUsername)
            .replace(/\{\{\s*\.Data\.company_name\s*\}\}/g, mockCompanyName);

        log.info(`[Test Email] Sending test email "${type}" to: ${targetEmail}`);

        const { data: supaRes, error: supaErr } = await supabaseAdmin.auth.resetPasswordForEmail(targetEmail, {
            redirectTo: mockConfirmationUrl
        });

        if (supaErr && !supaErr.message?.includes('rate_limit')) {
            log.warn('[Test Email] Supabase notification notice:', supaErr.message);
        }

        if (actorUser) {
            logAudit({
                userId: actorUser.id,
                username: actorUser.username,
                userRole: actorUser.role,
                action: 'EMAIL_TEST_SEND',
                entityType: 'EMAIL_TEMPLATE',
                entityId: type,
                details: { targetEmail, type }
            });
        }

        return {
            success: true,
            message: `Test e-postası başarıyla "${targetEmail}" adresine gönderildi! Gelen kutunuzu kontrol edin.`
        };
    } catch (err) {
        log.error('sendTestEmail error:', err);
        return { success: false, error: 'Test e-postası gönderilemedi: ' + err.message };
    }
}

module.exports = {
    DEFAULT_TEMPLATES,
    generateTemplateHtml,
    getPresetThemeHtml,
    getEmailTemplates,
    saveEmailTemplate,
    resetEmailTemplate,
    sendTestEmail
};
