const { getPrismaClient } = require('../prismaClient');
const log = require('../logger');
const { logAudit } = require('./audit.service');
const { supabaseAdmin } = require('./supabase.service');

const prisma = getPrismaClient();

/**
 * Enterprise Email Template Generator (Linear, Stripe & Apple standard)
 * 600px Responsive Table layout, inline CSS, universal client support (Gmail, Outlook, Apple Mail)
 */
function generateTemplateHtml(type) {
    let icon = '⚡';
    let iconBg = 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)';
    let iconShadow = 'rgba(37,99,235,0.45)';
    let accentColor = '#38bdf8';
    let btnGradient = 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)';
    let btnShadow = 'rgba(37,99,235,0.4)';
    let title = 'E-Posta Adresinizi Doğrulayın';
    let description = 'Kontrol platformuna hoş geldiniz! Hesabınızı güvenle aktifleştirmek ve tüm filo & operasyon yönetim araçlarına erişmek için lütfen aşağıdaki butona tıklayın.';
    let btnLabel = 'E-Postamı Doğrula';
    let otpLabel = 'Veya 6 Haneli Doğrulama Kodunuz';
    let showOtp = true;

    if (type === 'recovery') {
        icon = '🔑';
        iconBg = 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)';
        iconShadow = 'rgba(225,29,72,0.45)';
        accentColor = '#fb7185';
        btnGradient = 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)';
        btnShadow = 'rgba(225,29,72,0.4)';
        title = 'Şifre Sıfırlama Talebi';
        description = 'Hesabınız için bir şifre sıfırlama talebi aldık. Yeni bir şifre belirlemek için aşağıdaki güvenli butona tıklayabilir veya güvenlik kodunu kullanabilirsiniz.';
        btnLabel = 'Şifremi Sıfırla';
        otpLabel = 'Tek Kullanımlık Güvenlik Kodunuz';
    } else if (type === 'magic_link') {
        icon = '✨';
        iconBg = 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)';
        iconShadow = 'rgba(139,92,246,0.45)';
        accentColor = '#c084fc';
        btnGradient = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
        btnShadow = 'rgba(139,92,246,0.4)';
        title = 'Tek Tıkla Giriş Bağlantısı';
        description = 'Aşağıdaki bağlantıya tıklayarak Kontrol platformuna şifre girmeden anında ve güvenle giriş yapabilirsiniz.';
        btnLabel = 'Hemen Oturum Aç';
        showOtp = false;
    } else if (type === 'invite') {
        icon = '👥';
        iconBg = 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)';
        iconShadow = 'rgba(16,185,129,0.45)';
        accentColor = '#34d399';
        btnGradient = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btnShadow = 'rgba(16,185,129,0.4)';
        title = 'Ekibe Katılmaya Davet Edildiniz';
        description = 'Şirketiniz tarafından Kontrol filo ve operasyon yönetim sistemine davet edildiniz. Hesabınızı oluşturmak için daveti onaylayın.';
        btnLabel = 'Daveti Kabul Et & Başla';
        showOtp = false;
    } else if (type === 'change_email') {
        icon = '🔄';
        iconBg = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        iconShadow = 'rgba(245,158,11,0.45)';
        accentColor = '#fbbf24';
        btnGradient = 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)';
        btnShadow = 'rgba(245,158,11,0.4)';
        title = 'E-Posta Değişikliğini Onaylayın';
        description = 'Hesabınızın kayıtlı e-posta adresini değiştirmek için bir talepte bulunuldu. Yeni adresinizi onaylamak için lütfen butona tıklayın.';
        btnLabel = 'Değişikliği Onayla';
        otpLabel = 'Doğrulama Onay Kodu';
    }

    return `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #080c14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #94a3b8; }
    table { border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { padding: 0; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #080c14; padding: 44px 16px; }
    .main-table { width: 100%; max-width: 560px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0,0,0,0.8); }
    .top-glow-bar { height: 4px; width: 100%; background: linear-gradient(90deg, #2563eb 0%, #38bdf8 50%, #6366f1 100%); }
    .header-td { padding: 36px 32px 24px; text-align: center; border-bottom: 1px solid #1e293b; background: linear-gradient(180deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.2) 100%); }
    .badge-icon { display: inline-block; width: 54px; height: 54px; line-height: 54px; border-radius: 16px; background: ${iconBg}; text-align: center; font-size: 26px; box-shadow: 0 8px 24px ${iconShadow}; }
    .brand-title { margin-top: 14px; font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #ffffff; }
    .brand-title span { color: #38bdf8; }
    .brand-sub { font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .body-td { padding: 36px 32px; text-align: center; }
    h1 { margin: 0 0 14px; font-size: 21px; font-weight: 800; color: #f8fafc; line-height: 1.35; letter-spacing: -0.3px; }
    p.lead-text { margin: 0 0 28px; font-size: 14.5px; line-height: 1.65; color: #94a3b8; }
    .btn-wrap { margin: 28px 0; }
    .cta-btn { display: inline-block; padding: 15px 36px; background: ${btnGradient}; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14.5px; letter-spacing: 0.3px; box-shadow: 0 8px 22px ${btnShadow}; }
    .otp-card { margin: 26px 0 14px; background: #080c14; border: 1px dashed #334155; border-radius: 14px; padding: 18px; text-align: center; }
    .otp-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
    .otp-digits { font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace; font-size: 30px; font-weight: 800; letter-spacing: 8px; color: ${accentColor}; }
    .security-notice { margin-top: 28px; padding: 14px 18px; background: #080c14; border-radius: 10px; text-align: left; font-size: 11.5px; line-height: 1.6; color: #64748b; border-left: 3px solid ${accentColor}; }
    .footer-td { padding: 24px 32px; text-align: center; font-size: 11.5px; line-height: 1.6; color: #475569; border-top: 1px solid #1e293b; background: #090e17; }
    .footer-links a { color: #60a5fa; text-decoration: none; margin: 0 8px; font-weight: 600; }
    @media screen and (max-width: 600px) {
      .main-table { width: 100% !important; border-radius: 12px !important; }
      .body-td, .header-td, .footer-td { padding: 24px 18px !important; }
      .cta-btn { width: 100% !important; box-sizing: border-box !important; padding: 14px 18px !important; }
      .otp-digits { font-size: 24px !important; letter-spacing: 5px !important; }
    }
  </style>
</head>
<body>
  <table class="wrapper" role="presentation">
    <tr>
      <td align="center">
        <table class="main-table" role="presentation">
          
          <!-- Top Accent Glow Bar -->
          <tr>
            <td>
              <div class="top-glow-bar"></div>
            </td>
          </tr>

          <!-- Header Branding -->
          <tr>
            <td class="header-td">
              <div class="badge-icon">${icon}</div>
              <div class="brand-title">KONTROL<span>.</span></div>
              <div class="brand-sub">Filo & Operasyon Yönetim Sistemi</div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td class="body-td">
              <h1>${title}</h1>
              <p class="lead-text">${description}</p>
              
              <!-- Call to Action Button -->
              <div class="btn-wrap">
                <a href="{{ .ConfirmationURL }}" class="cta-btn" target="_blank">${btnLabel}</a>
              </div>

              ${showOtp ? `
              <!-- Security OTP Code Box -->
              <div class="otp-card">
                <div class="otp-title">${otpLabel}</div>
                <div class="otp-digits">{{ .Token }}</div>
              </div>` : ''}

              <!-- Security Info Notice -->
              <div class="security-notice">
                🔒 <strong>Güvenlik Uyarısı:</strong> Bu işlem güvenlik denetim kaydı altında gerçekleştirilmiştir. Bu isteği siz yapmadıysanız lütfen bu e-postayı dikkate almayınız.
              </div>
            </td>
          </tr>

          <!-- Footer Legal & Links -->
          <tr>
            <td class="footer-td">
              <div style="margin-bottom: 10px;" class="footer-links">
                <a href="{{ .SiteURL }}" target="_blank">Kontrol Paneli</a> •
                <a href="{{ .SiteURL }}/privacy" target="_blank">Gizlilik & Güvenlik</a> •
                <a href="mailto:destek@kontrol-app.com">Destek Hattı</a>
              </div>
              <div>
                Bu e-posta <strong>{{ .Email }}</strong> adresine sistem tarafından otomatik olarak gönderilmiştir.<br>
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
        htmlContent: generateTemplateHtml('confirmation')
    },
    recovery: {
        type: 'recovery',
        name: 'Şifre Sıfırlama (Reset Password)',
        subject: '🔑 Kontrol App - Şifre Sıfırlama Talebi',
        senderName: '🔑 Kontrol Hesap Güvenliği',
        description: 'Şifresini unutan kullanıcılar için kurtarma bağlantısı ve OTP kodu gönderilir.',
        htmlContent: generateTemplateHtml('recovery')
    },
    magic_link: {
        type: 'magic_link',
        name: 'Sihirli Giriş Bağlantısı (Magic Link)',
        subject: '✨ Kontrol App - Tek Tıkla Giriş Bağlantınız',
        senderName: '✨ Kontrol Giriş Servisi',
        description: 'Kullanıcıların şifre girmeden tek tıkla doğrudan oturum açmalarını sağlar.',
        htmlContent: generateTemplateHtml('magic_link')
    },
    invite: {
        type: 'invite',
        name: 'Kullanıcı Daveti (Invite User)',
        subject: '👥 Kontrol App - Ekip Davetiyesi',
        senderName: '👥 Kontrol Ekip Yönetimi',
        description: 'Yeni bir personel veya şirket kullanıcısı davet edildiğinde gönderilir.',
        htmlContent: generateTemplateHtml('invite')
    },
    change_email: {
        type: 'change_email',
        name: 'E-Posta Değişikliği (Change Email)',
        subject: '🔄 Kontrol App - E-Posta Değişikliği Onayı',
        senderName: '🔄 Kontrol Hesap Yönetimi',
        description: 'Kullanıcı profilindeki e-posta adresini değiştirdiğinde onay için gönderilir.',
        htmlContent: generateTemplateHtml('change_email')
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
        const { type } = data || {};
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
                details: { type }
            });
        }

        const def = DEFAULT_TEMPLATES[type] || {
            type,
            name: type,
            subject: 'Kontrol Bildirimi',
            senderName: 'Kontrol Güvenlik Ekibi',
            description: ''
        };

        const defaultHtml = generateTemplateHtml(type);

        return {
            success: true,
            message: 'Şablon başarıyla varsayılana sıfırlandı',
            data: {
                ...def,
                htmlContent: defaultHtml,
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
        const mockToken = '849 201';
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
    getEmailTemplates,
    saveEmailTemplate,
    resetEmailTemplate,
    sendTestEmail
};
